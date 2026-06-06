<div align="center">

# 🛡️ Cyber Knowledge Base

**A curated reference library for cybersecurity certification study, hands-on lab work, and operational threat intelligence.**

*Maintained by an active-duty U.S. Army Cyber Officer | TS/SCI | CompTIA SecOT+ · GICSP · CASP+ · ISA/IEC 62443*

---

[![OT/ICS](https://img.shields.io/badge/OT%2FICS-SecOT%2B%20%7C%20GICSP-red?style=flat-square)](./ot-ics/)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)]()
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](./LICENSE)

</div>

---

## About this repository

This repository serves as a living reference for cybersecurity professionals studying for certifications, building home lab environments, and tracking the current threat landscape. Content is written to be useful at two levels — experienced practitioners can scan and move on, while beginners can expand sections for full walkthroughs.

Each section covers:
- Certification roadmaps and exam resources
- Hands-on lab setup guides
- Key frameworks, standards, and authoritative references
- Recent threat intelligence and real-world incidents

---

## Contents

### 🔴 OT / ICS Security
> *Operational Technology and Industrial Control Systems*

The most complete section in this repo. Covers the full spectrum from home lab setup to real-world threat actor tracking.

| Resource | Description |
|----------|-------------|
| [📖 Full setup guide](./ot-ics/OT_Homelab_Setup.md) | Step-by-step IT/OT home lab using VMware Workstation — pfSense, OpenPLC, ScadaBR, Wazuh, Kali |
| [🖥 RAM calculator](https://grand1llusion.github.io/cyber-knowledge-base/ot-ics/ram-calculator.html) | Interactive tool — adjust for your host specs, get per-VM RAM recommendations |
| [🎯 Certification roadmap](#ot-ics-certifications) | SecOT+, GICSP, ISA/IEC 62443 pathway |
| [⚡ Threat intel & incidents](#ot-ics-threat-intel) | Recent OT/ICS attacks, feeds, and research sources |

---

### 🔵 Coming soon

| Section | Target certs |
|---------|-------------|
| Cloud & enterprise security | CASP+ (CAS-005) |
| Network defense | CySA+, GCIA |
| DoD / federal compliance | DCWF, DoD 8570/8140 |
| Data engineering & analytics | *(in progress)* |

> Have a resource suggestion? Open an [issue](../../issues) or submit a pull request.

---

## OT/ICS certifications

| Cert | Body | Level | Notes |
|------|------|-------|-------|
| [CompTIA SecOT+](https://www.comptia.org/certifications/secot) | CompTIA | Intermediate | Beta open — pass by Jun 26 2026 for free cert. Full launch Dec 2026. |
| [GICSP](https://www.giac.org/certifications/global-industrial-cyber-security-professional-gicsp/) | SANS/GIAC | Intermediate | Gold standard for ICS/OT. Prep via SANS ICS410. 4-yr renewal. |
| [ISA/IEC 62443](https://www.isa.org/certification/certificate-programs/isa-iec-62443-cybersecurity-certificate-program) | ISA | Intermediate–Expert | 4-cert program. Only globally recognized ICS consensus standard. |
| [GRID](https://www.giac.org/certifications/response-industrial-defense-grid/) | SANS/GIAC | Advanced | Energy sector focus. Incident response for OT environments. |

---

## OT/ICS threat intel

### Authoritative standards & frameworks

| Resource | Description |
|----------|-------------|
| [NIST SP 800-82 Rev 3](https://csrc.nist.gov/pubs/sp/800/82/r3/final) | Guide to OT security — the US federal reference standard for ICS/SCADA |
| [MITRE ATT&CK for ICS](https://attack.mitre.org/matrices/ics/) | Adversary TTPs specific to industrial control systems |
| [NERC CIP Standards](https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx) | Critical infrastructure protection for bulk electric systems |
| [ISA/IEC 62443 Series](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards) | Global ICS security standard — covers design, risk assessment, maintenance |

### Live feeds & research

| Source | Type | Link |
|--------|------|------|
| CISA ICS-CERT Advisories | Vulnerability disclosures | [cisa.gov/ics-advisories](https://www.cisa.gov/ics-advisories) |
| Dragos Year in Review | Annual OT threat report | [dragos.com/year-in-review](https://www.dragos.com/year-in-review/) |
| Claroty Team82 | Protocol-level vulnerability research | [claroty.com/team82](https://claroty.com/team82/) |
| Industrial Cyber | Daily OT/ICS news | [industrialcyber.co](https://industrialcyber.co/) |
| Nozomi Networks Blog | ICS threat intelligence | [nozominetworks.com/blog](https://www.nozominetworks.com/blog/) |
| Cyber Defense Review | DoD/Army cyber journal | [cyberdefensereview.army.mil](https://cyberdefensereview.army.mil/) |

### Notable incidents (2023–present)

| Incident | Year | Sector | Key takeaway |
|----------|------|--------|-------------|
| FrostyGoop / Lviv heating attack | 2024 | Energy | First malware to use Modbus TCP directly against OT hardware |
| BAUXITE campaign | 2023–24 | Multi-sector | Iran-linked; exploited internet-exposed OT across US, EU, AU |
| Poland DER wiper attack | 2025 | Renewable energy | First coordinated attack on distributed energy resources |
| US water system intrusions | 2023–24 | Water/wastewater | Default credentials on internet-exposed ICS — trivially exploited |
| Salt Typhoon telecom | 2024 | Telecommunications | PRC pre-positioning in critical infrastructure for future disruption |

---

## Free training resources

| Resource | Provider | Cost |
|----------|----------|------|
| [ICS Security Courses (301, 302, 401)](https://www.cisa.gov/ics-training-available-through-cisa) | CISA | Free |
| [ICS410 — SCADA Security Essentials](https://www.sans.org/cyber-security-courses/ics-scada-cyber-security-essentials/) | SANS | Paid (check employer TA) |
| [GrassMarlin — passive ICS asset mapper](https://github.com/nsacyber/GRASSMARLIN) | NSA/CISA | Free |
| [OpenPLC Runtime](https://autonomylogic.com/) | Autonomy Logic | Free |
| [S4 Conference recordings](https://s4events.com/) | Dale Peterson | Free archive |

---

## Home lab quick reference

**Full setup guide:** [OT_Homelab_Setup.md](./ot-ics/OT_Homelab_Setup.md)

```
Internet
    │
    ▼
┌─────────────────────┐
│   pfSense firewall  │  WAN / LAN / OPT1
└──────┬──────────────┘
       │
  ┌────┴──────────────────────────────────┐
  │                                       │
  ▼                                       ▼
┌─────────────────┐         ┌─────────────────────────┐
│   IT zone       │         │   Industrial DMZ         │
│   VMnet8 NAT    │         │   VMnet2 · 192.168.20.x  │
│   Kali · Wazuh  │         └──────────────┬───────────┘
└─────────────────┘                        │
                                           ▼
                             ┌─────────────────────────┐
                             │   OT zone (air-gapped)  │
                             │   VMnet3 · 192.168.30.x  │
                             │   OpenPLC · ScadaBR      │
                             └─────────────────────────┘
```

| VM | Zone | RAM | IP |
|----|------|-----|----|
| pfSense | Firewall | 1 GB | gateway |
| OpenPLC | OT | 2 GB | 192.168.30.10 |
| ScadaBR | OT | 2 GB | 192.168.30.20 |
| DMZ Ubuntu | DMZ | 2 GB | 192.168.20.10 |
| Wazuh SIEM | IT | 4 GB | 192.168.80.10 |
| Kali Linux | IT | 4 GB | 192.168.80.20 |

> 🖥 **[Open the interactive RAM calculator](https://grand1llusion.github.io/cyber-knowledge-base/ot-ics/ram-calculator.html)** — adjusts all VM allocations based on your host specs.

---

<div align="center">

*Content is updated as certifications are studied and lab scenarios are developed.*
*All attack scenarios documented here are intended for isolated lab environments only.*

</div>
