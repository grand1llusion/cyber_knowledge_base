<!--
BEFORE PUBLISHING:
1. Replace [SITE URL] with your live S3 website URL from deploy.sh's output.
2. Replace [REPO/CODE LINK] with a link to your GitHub repo if you push this
   code there (e.g. under github.com/grand1llusion), or link the zip/gist you
   used — the requirement is just "a link to your app or repo."
3. Add a screenshot of the live site if the platform supports image uploads.
4. Read it over once in your own voice and adjust anything that doesn't
   sound like you — you know this material better than I do.
5. Confirm word count is 500+ before publishing (this draft is ~650).
6. Tag: #agents
-->

# Weekend Creative Agent Challenge: OT/ICS Threat Storyteller

**Tags:** #agents

## Vision and what it does

I spend my working life thinking about defensive cyber operations at the
strategic level, and outside of work I run a small OT/ICS (operational
technology / industrial control systems) homelab — a three-zone Purdue
Model network built to practice the kind of segmentation and detection work
that matters in real critical-infrastructure environments. One thing I've
noticed teaching and building awareness material in this space: a lot of
ICS security content is dry. Accurate, but dry. Nobody remembers a checklist
the way they remember a story.

So for this challenge I built the **OT/ICS Threat Storyteller** — an
always-on agent that, once a day with no human involvement, invents a short
creative story dramatizing a plausible industrial control system attack
scenario (a compromised HMI, a tampered safety instrumented system setpoint,
a ransomware pivot through a flat IT/OT network), illustrates it with a
generated image, and publishes both to a small public gallery site. Each
story ends with a "Defender's Takeaway" — three concrete, practical
mitigations tied to that specific scenario. It's a security-awareness tool
wearing a creative-writing costume: something someone might actually want
to read on purpose, that still teaches the same lessons a formal advisory
would.

The agent draws from a rotating bank of sixteen scenario seeds spanning
Purdue Model Levels 0 through 5 — field instrumentation, PLCs and RTUs,
HMIs, historians, the IT/OT DMZ, safety systems, even building automation
as a pivot point — so it works through real variety before anything
repeats.

## How I built it

I kept the architecture deliberately simple given the weekend timeline: one
Lambda function, triggered daily, doing all the work in a single
invocation. The interesting design decisions were less about infrastructure
and more about getting reliable structured output from a generative model
running completely unattended — with no human in the loop to notice or fix
a malformed response, the agent has to be its own quality gate. I addressed
that by having the model return a single strict JSON object (title, story,
defender's-takeaway lessons, and an image prompt derived from its own
story) with a defensive parser on the Lambda side that strips stray
markdown fencing and falls back to regex extraction if the model doesn't
return pure JSON.

The other real decision was scenario rotation: instead of letting the model
free-associate a theme every day (which drifts toward repetition fast), I
maintain a small shuffled queue in S3 that works through the entire
scenario bank before anything repeats, so the archive stays varied over
time instead of converging on the same two or three attack patterns.

## AWS services used and architecture

- **Amazon Bedrock (Amazon Nova Lite)** — generates the story, title, and
  defender's-takeaway lessons as structured JSON
- **Amazon Bedrock (Amazon Nova Canvas)** — generates a themed illustration
  from a scene description the story model writes for itself
- **AWS Lambda** — the whole agent's logic: pick a scenario, call both
  models, write results to S3, regenerate the gallery page
- **Amazon S3** — stores every day's story/image, plus hosts the public
  site itself via S3 static website hosting
- **Amazon EventBridge** — a daily scheduled rule that invokes the Lambda
  with zero manual triggering

Flow: EventBridge → Lambda → Bedrock (Nova Lite, then Nova Canvas) →
S3 (story JSON + image + regenerated `index.html`). No servers, no
containers, nothing running except the ~30 seconds a day the function is
actually executing.

## What I learned

Getting a generative model to be a *reliable* unattended component — not
just a good demo — took more care than the actual AWS wiring did. Prompting
for strict structured output, and writing a parser that degrades gracefully
instead of throwing the whole run away, mattered more than any
infrastructure choice I made. That's a lesson that transfers directly to
the agent work I do professionally: the interesting engineering in an
agentic system usually isn't the trigger or the compute, it's making sure
the thing keeps working when nobody's watching it run.

## Try it / see the code

- Live site: [[Amazon Bedrock Site]](http://otics-storyteller-209211309990.s3-website-us-east-1.amazonaws.com/)
- Code: [[REPO/CODE LINK]](https://github.com/grand1llusion/cyber_knowledge_base/tree/main/AWS%20Project)
