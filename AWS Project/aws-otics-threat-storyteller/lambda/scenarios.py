"""
Scenario bank for the OT/ICS Threat Storyteller agent.

Each entry is a seed the model expands into a short creative narrative.
Grounded loosely in the Purdue Enterprise Reference Architecture (Level 0-5)
so the output stays technically plausible and useful as awareness content,
not just generic techno-thriller flavor text.
"""

SCENARIOS = [
    {
        "id": "rogue-plc-firmware",
        "level": "Level 1 (Basic Control)",
        "seed": "A contractor's laptop, plugged into a water treatment plant's "
                "engineering workstation for a routine maintenance visit, silently "
                "pushes a modified firmware image to a chlorine dosing PLC.",
    },
    {
        "id": "hmi-compromise-substation",
        "level": "Level 2 (Supervisory Control)",
        "seed": "An attacker pivots from a phished vendor VPN account into a power "
                "substation's HMI, and starts quietly nudging breaker status displays "
                "out of sync with reality.",
    },
    {
        "id": "historian-exfil-dmz",
        "level": "Level 3.5 (IT/OT DMZ)",
        "seed": "A misconfigured historian server, meant to only relay sanitized "
                "production metrics to the business network, becomes the bridge an "
                "intruder uses to slip out of the OT environment undetected.",
    },
    {
        "id": "sis-setpoint-tamper",
        "level": "Level 1 (Safety Instrumented System)",
        "seed": "Deep in a refinery's safety instrumented system, a single altered "
                "setpoint waits patiently for the one process excursion it was "
                "designed to prevent.",
    },
    {
        "id": "usb-air-gap-jump",
        "level": "Level 1-2 (Air-Gapped Cell)",
        "seed": "A USB drive, forgotten in a break room and picked up out of "
                "curiosity, carries a payload built for exactly one air-gapped "
                "engineering workstation on a factory floor.",
    },
    {
        "id": "modbus-mitm",
        "level": "Level 2 (Field Network)",
        "seed": "On an unencrypted Modbus TCP segment of a bottling line, someone has "
                "been sitting quietly in the middle of the conversation between a PLC "
                "and its sensors for three weeks.",
    },
    {
        "id": "insider-pid-drift",
        "level": "Level 1 (Process Control)",
        "seed": "A disgruntled control systems engineer makes a series of small, "
                "defensible-looking tuning changes to a PID loop, each one shaving "
                "a little more life off a piece of equipment no one is watching "
                "closely enough.",
    },
    {
        "id": "ransomware-dmz-pivot",
        "level": "Level 4-5 to Level 3 (Enterprise to OT)",
        "seed": "Ransomware that started in a shared corporate file server finds a "
                "forgotten flat network path into the plant historian, and the "
                "clock starts on whether segmentation holds.",
    },
    {
        "id": "gps-spoof-relay",
        "level": "Level 1 (Protection Relays)",
        "seed": "A cheap GPS spoofer on a rooftop half a mile from a grid substation "
                "starts feeding bad timing data to protection relays that were never "
                "built to question the signal.",
    },
    {
        "id": "vendor-remote-access",
        "level": "Level 3 (Remote Support)",
        "seed": "A predictive-maintenance vendor's always-on remote access "
                "connection, trusted for years without a second thought, is the "
                "one door in the plant nobody remembers is unlocked.",
    },
    {
        "id": "engineering-workstation-supplychain",
        "level": "Level 2 (Engineering Workstation)",
        "seed": "A trusted software update for SCADA configuration tools arrives "
                "right on schedule from the vendor's official channel, carrying one "
                "extra thing nobody asked for.",
    },
    {
        "id": "wireless-sensor-spoof",
        "level": "Level 0-1 (Field Instrumentation)",
        "seed": "A wireless pressure sensor on an aging pipeline segment starts "
                "reporting numbers that are just believable enough not to trigger "
                "an alarm, and just wrong enough to matter.",
    },
    {
        "id": "default-creds-hmi",
        "level": "Level 2 (Legacy HMI)",
        "seed": "A decade-old HMI, still running on factory-default credentials "
                "because replacing it would mean a shutdown nobody wants to "
                "schedule, is discovered sitting exposed on the internet.",
    },
    {
        "id": "building-automation-pivot",
        "level": "Level 2 (Building Automation)",
        "seed": "The building's HVAC and badge-access controller, connected to the "
                "same network as far more sensitive OT systems for the sake of "
                "convenience, becomes the quiet way in.",
    },
    {
        "id": "firmware-downgrade-attack",
        "level": "Level 1 (RTU/PLC)",
        "seed": "An attacker forces a remote terminal unit to roll back to an old, "
                "vulnerable firmware version during a routine maintenance window, "
                "undoing a patch that took the utility six months to schedule.",
    },
    {
        "id": "shared-jump-host",
        "level": "Level 3 (Jump Host)",
        "seed": "A jump host meant to be the single, tightly monitored doorway "
                "between IT and OT has quietly accumulated a dozen forgotten local "
                "accounts over the years.",
    },
]
