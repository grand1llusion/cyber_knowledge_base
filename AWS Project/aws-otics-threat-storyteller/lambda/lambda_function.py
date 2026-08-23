"""
OT/ICS Threat Storyteller — an always-on creative agent.

Once a day (via EventBridge), this Lambda:
  1. Picks an OT/ICS attack scenario seed from a rotating bank (scenarios.py)
  2. Asks Amazon Nova Lite (Bedrock) to turn it into a short creative story
     with a "Defender's Takeaway" section grounded in real mitigations
  3. Asks Amazon Nova Canvas (Bedrock) to illustrate a scene from that story
  4. Publishes both to an S3 bucket, and regenerates a static gallery page
     (index.html) so the whole archive is browsable at the bucket's website
     endpoint with zero manual effort.

No human has to open anything for this to keep producing new work — that's
the "always-on agent" requirement for the challenge.
"""

import base64
import html
import json
import os
import random
import re
from datetime import datetime, timezone

import boto3
from botocore.config import Config

from scenarios import SCENARIOS

# ---- Configuration (overridable via Lambda environment variables) --------

BUCKET_NAME = os.environ["BUCKET_NAME"]
TEXT_MODEL_ID = os.environ.get("TEXT_MODEL_ID", "amazon.nova-lite-v1:0")
IMAGE_MODEL_ID = os.environ.get("IMAGE_MODEL_ID", "amazon.nova-canvas-v1:0")
BEDROCK_REGION = os.environ.get("BEDROCK_REGION", os.environ.get("AWS_REGION", "us-east-1"))
SITE_TITLE = os.environ.get("SITE_TITLE", "OT/ICS Threat Storyteller")

STATE_KEY = "state/history.json"
INDEX_JSON_KEY = "index.json"
INDEX_HTML_KEY = "index.html"

boto_cfg = Config(retries={"max_attempts": 3, "mode": "standard"})
bedrock = boto3.client("bedrock-runtime", region_name=BEDROCK_REGION, config=boto_cfg)
s3 = boto3.client("s3")


# ---- Small S3-backed state helpers ----------------------------------------

def load_json(key, default):
    try:
        obj = s3.get_object(Bucket=BUCKET_NAME, Key=key)
        return json.loads(obj["Body"].read())
    except s3.exceptions.NoSuchKey:
        return default
    except s3.exceptions.ClientError:
        return default


def put_json(key, data):
    # Public read is granted via the bucket policy set up at deploy time,
    # not per-object ACLs (simpler, and works with Block Public Access
    # settings that disable ACLs by default on new buckets).
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=json.dumps(data, indent=2).encode("utf-8"),
        ContentType="application/json",
    )


def put_text(key, text, content_type):
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=text.encode("utf-8"),
        ContentType=content_type,
    )


def put_bytes(key, data, content_type):
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=key,
        Body=data,
        ContentType=content_type,
    )


# ---- Scenario rotation ------------------------------------------------------

def pick_scenario(state):
    """Work through the whole scenario bank before any repeat."""
    known_ids = {s["id"] for s in SCENARIOS}
    # Drop any stale ids (e.g. scenarios.py was edited since this queue was
    # saved) so a mismatch can't crash an otherwise-healthy daily run.
    queue = [qid for qid in (state.get("queue") or []) if qid in known_ids]
    if not queue:
        queue = list(known_ids)
        random.shuffle(queue)

    next_id = queue.pop(0)
    state["queue"] = queue
    return next(s for s in SCENARIOS if s["id"] == next_id)


# ---- Bedrock calls -----------------------------------------------------------

STORY_SYSTEM_PROMPT = """You are a creative writer and OT/ICS (operational \
technology / industrial control systems) security awareness specialist. You \
write short, atmospheric fiction grounded in real Purdue-Model industrial \
network realities (PLCs, HMIs, historians, SIS, RTUs, DMZs) that reads like \
a compact techno-thriller vignette, not a dry incident report. \
Always respond with ONLY a single valid JSON object, no markdown fences, no \
commentary, with exactly these fields:
{
  "title": "a short evocative story title",
  "story": "a 450-650 word short story, second or third person, with a real \
sense of place and stakes, that plausibly depicts the scenario",
  "lessons": ["3 short, concrete, practical defensive takeaways tied to the \
specific scenario"],
  "image_prompt": "a single vivid sentence describing one visual scene from \
the story, written for a text-to-image model, no text/words in the image, \
industrial/moody/cinematic style"
}"""


def generate_story(scenario):
    user_prompt = (
        f"Scenario seed ({scenario['level']}): {scenario['seed']}\n\n"
        "Write the story now, following the required JSON format exactly."
    )
    response = bedrock.converse(
        modelId=TEXT_MODEL_ID,
        system=[{"text": STORY_SYSTEM_PROMPT}],
        messages=[{"role": "user", "content": [{"text": user_prompt}]}],
        inferenceConfig={"maxTokens": 1400, "temperature": 0.85, "topP": 0.9},
    )
    raw = response["output"]["message"]["content"][0]["text"]
    return parse_story_json(raw)


def parse_story_json(raw):
    """Nova is instructed to return pure JSON, but be defensive about it."""
    text = raw.strip()
    # Strip accidental markdown code fences if the model adds them anyway.
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            raise
        data = json.loads(match.group(0))

    required = {"title", "story", "lessons", "image_prompt"}
    missing = required - data.keys()
    if missing:
        raise ValueError(f"Model response missing fields: {missing}")
    return data


def generate_image(image_prompt):
    body = {
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {
            "text": image_prompt[:1000],
            "negativeText": "text, watermark, words, letters, logo, blurry",
        },
        "imageGenerationConfig": {
            "numberOfImages": 1,
            "quality": "standard",
            "height": 1024,
            "width": 1024,
            "cfgScale": 8.0,
            "seed": random.randint(0, 2147483646),
        },
    }
    response = bedrock.invoke_model(
        modelId=IMAGE_MODEL_ID,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    payload = json.loads(response["body"].read())
    image_b64 = payload["images"][0]
    return base64.b64decode(image_b64)


# ---- Gallery page rendering ---------------------------------------------------

def render_index_html(index):
    entries_html = []
    for entry in index["entries"]:
        # Story/title/lessons are model-generated text landing on a public
        # page — escape before embedding so stray angle brackets or & in the
        # generated prose can't break markup (or worse) on an unattended site.
        title = html.escape(entry["title"])
        story = html.escape(entry["story"])
        level = html.escape(entry["level"])
        lessons_html = "".join(f"<li>{html.escape(l)}</li>" for l in entry["lessons"])

        image_tag = ""
        if entry.get("image_key"):
            image_key = html.escape(entry["image_key"], quote=True)
            image_tag = f'<img src="{image_key}" alt="{title}" loading="lazy">'

        entries_html.append(f"""
        <article class="entry">
          <h2>{title}</h2>
          <p class="meta">{entry['date']} &middot; {level}</p>
          {image_tag}
          <p class="story">{story}</p>
          <h3>Defender's Takeaway</h3>
          <ul>{lessons_html}</ul>
        </article>
        """)

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{SITE_TITLE}</title>
<style>
  :root {{ color-scheme: dark; }}
  body {{
    background: #0b0f14; color: #d7e1e8; font-family: Georgia, 'Times New Roman', serif;
    max-width: 760px; margin: 0 auto; padding: 2.5rem 1.25rem 5rem;
    line-height: 1.6;
  }}
  h1 {{ font-size: 1.9rem; border-bottom: 1px solid #24313d; padding-bottom: 0.75rem; }}
  .subtitle {{ color: #7f93a3; font-family: -apple-system, sans-serif; font-size: 0.95rem; margin-top: -0.5rem;}}
  .entry {{ margin: 3rem 0; padding-bottom: 2.5rem; border-bottom: 1px solid #1c262f; }}
  .entry h2 {{ margin-bottom: 0.15rem; color: #f2c14e; }}
  .meta {{ font-family: -apple-system, sans-serif; color: #7f93a3; font-size: 0.85rem; margin-top: 0; }}
  .entry img {{ width: 100%; border-radius: 6px; margin: 1rem 0; }}
  .story {{ white-space: pre-line; }}
  h3 {{ font-family: -apple-system, sans-serif; font-size: 0.95rem; color: #7f93a3; text-transform: uppercase; letter-spacing: 0.05em; }}
  footer {{ font-family: -apple-system, sans-serif; color: #4d5f6e; font-size: 0.8rem; text-align: center; margin-top: 4rem; }}
</style>
</head>
<body>
  <h1>{SITE_TITLE}</h1>
  <p class="subtitle">A new OT/ICS security vignette, generated on its own, every day.</p>
  {''.join(entries_html)}
  <footer>Generated autonomously by an AWS Lambda + Amazon Bedrock (Nova) agent. No human opens this to make it run.</footer>
</body>
</html>"""


# ---- Handler -----------------------------------------------------------------

def handler(event, context):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    state = load_json(STATE_KEY, {"queue": []})
    scenario = pick_scenario(state)

    story_data = generate_story(scenario)

    # Image generation is best-effort: Bedrock's available image models can
    # change (a model gets marked Legacy, a new account lacks access to a
    # given provider, etc). Rather than let that take down the whole daily
    # run, fall back to a text-only entry if it fails for any reason.
    image_key = None
    try:
        image_bytes = generate_image(story_data["image_prompt"])
        image_key = f"stories/{today}/image.png"
        put_bytes(image_key, image_bytes, "image/png")
    except Exception as exc:  # noqa: BLE001 - deliberately broad, see comment above
        print(f"Image generation failed, publishing text-only: {exc}")
        image_key = None

    story_key = f"stories/{today}/story.json"
    put_json(story_key, {
        "date": today,
        "scenario_id": scenario["id"],
        "level": scenario["level"],
        "image_key": image_key,
        **story_data,
    })

    index = load_json(INDEX_JSON_KEY, {"entries": []})
    index["entries"].insert(0, {
        "date": today,
        "title": story_data["title"],
        "level": scenario["level"],
        "story": story_data["story"],
        "lessons": story_data["lessons"],
        "image_key": image_key,
    })
    put_json(INDEX_JSON_KEY, index)
    put_text(INDEX_HTML_KEY, render_index_html(index), "text/html")

    put_json(STATE_KEY, state)

    print(f"Published '{story_data['title']}' ({scenario['id']}) for {today}")
    return {
        "statusCode": 200,
        "body": json.dumps({"date": today, "title": story_data["title"], "scenario": scenario["id"]}),
    }
