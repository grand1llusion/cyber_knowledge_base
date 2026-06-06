<div align="center">

# 🔴 OT / ICS Security

**Operational Technology · Industrial Control Systems · SCADA**

*Study resources, lab guides, certification roadmaps, and threat intelligence for OT/ICS cybersecurity.*

</div>

---

## 📁 Files in this section

| File | Description |
|------|-------------|
| [ot-ics-homelab.md](./ot-ics-homelab.md) | Full IT/OT home lab setup guide — VMware, pfSense, OpenPLC, ScadaBR, Wazuh, Kali |
| [ram-calculator.html](https://grand1llusion.github.io/cyber_knowledge_base/ot-ics/ram-calculator.html) | Interactive RAM calculator — adjusts VM allocations to your host specs |

---

## 🎯 Certification roadmap

| Cert | Body | Level | Status | Link |
|------|------|-------|--------|------|
| CompTIA SecOT+ | CompTIA | Intermediate | Beta open — free if passed by Jun 26 2026 | [comptia.org](https://www.comptia.org/certifications/secot) |
| GICSP | SANS/GIAC | Intermediate | Industry gold standard — prep via ICS410 | [giac.org](https://www.giac.org/certifications/global-industrial-cyber-security-professional-gicsp/) |
| ISA/IEC 62443 | ISA | Intermediate–Expert | 4-cert program, globally recognized | [isa.org](https://www.isa.org/certification/certificate-programs/isa-iec-62443-cybersecurity-certificate-program) |
| GRID | SANS/GIAC | Advanced | Energy sector IR focus | [giac.org](https://www.giac.org/certifications/response-industrial-defense-grid/) |

**Recommended order:** SecOT+ → GICSP → ISA/IEC 62443 Fundamentals → ISA/IEC 62443 (full program)

---

## 📐 Key frameworks and standards

| Resource | Description | Link |
|----------|-------------|------|
| NIST SP 800-82 Rev 3 | US federal guide to OT/ICS security — the authoritative reference | [csrc.nist.gov](https://csrc.nist.gov/pubs/sp/800/82/r3/final) |
| MITRE ATT&CK for ICS | Adversary TTPs specific to industrial control systems | [attack.mitre.org/ics](https://attack.mitre.org/matrices/ics/) |
| NERC CIP Standards | Critical infrastructure protection for bulk electric systems | [nerc.com](https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx) |
| ISA/IEC 62443 Series | Global ICS security standard — design, risk, maintenance | [isa.org](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards) |
| Purdue Model overview | SANS explanation of the ICS network architecture model | [sans.org](https://www.sans.org/blog/understanding-the-purdue-model-of-ics-security/) |

---

## 📡 Threat intelligence feeds

| Source | Type | Link |
|--------|------|------|
| CISA ICS-CERT Advisories | Official US vulnerability disclosures — 241 in 2024 alone | [cisa.gov](https://www.cisa.gov/ics-advisories) |
| Dragos Year in Review | Best annual OT threat landscape report — tracks APT groups | [dragos.com](https://www.dragos.com/year-in-review/) |
| Claroty Team82 | Protocol-level vulnerability research | [claroty.com](https://claroty.com/team82/) |
| Industrial Cyber | Daily OT/ICS news outlet | [industrialcyber.co](https://industrialcyber.co/) |
| Nozomi Networks Blog | ICS threat intelligence and research | [nozominetworks.com](https://www.nozominetworks.com/blog/) |
| Cyber Defense Review | DoD/Army cyber journal — relevant to military OT context | [cyberdefensereview.army.mil](https://cyberdefensereview.army.mil/) |

---

## ⚡ Notable OT/ICS incidents (2023–present)

| Incident | Year | Sector | Key takeaway |
|----------|------|--------|-------------|
| FrostyGoop / Lviv heating attack | 2024 | Energy | First malware using Modbus TCP directly against OT hardware — 600+ buildings lost heat |
| BAUXITE campaign | 2023–24 | Multi-sector | Iran-linked; exploited internet-exposed OT across US, EU, AU via default credentials |
| Poland DER wiper attack | 2025 | Renewable energy | First coordinated attack on distributed energy resources — ~30 wind/solar farms |
| US water system intrusions | 2023–24 | Water/wastewater | Default credentials on internet-exposed ICS — trivially exploited by Iran and pro-Russia actors |
| Salt Typhoon telecom | 2024 | Telecommunications | PRC pre-positioning in critical infrastructure assessed as preparation for future disruption |

> **Key stat:** Internet-exposed ICS devices rose 13% in 2024 — from ~160,000 to 180,000+. Wipers have overtaken ransomware as the primary weapon for state actors targeting OT.

---

## 🎓 Free training resources

| Resource | Provider | Link |
|----------|----------|------|
| ICS security courses (301, 302, 401) | CISA | [cisa.gov](https://www.cisa.gov/ics-training-available-through-cisa) |
| ICS410 — SCADA security essentials | SANS (paid — check employer TA) | [sans.org](https://www.sans.org/cyber-security-courses/ics-scada-cyber-security-essentials/) |
| GrassMarlin — passive ICS asset mapper | NSA/CISA (free) | [github.com/nsacyber/GRASSMARLIN](https://github.com/nsacyber/GRASSMARLIN) |
| OpenPLC runtime and editor | Autonomy Logic (free) | [autonomylogic.com](https://autonomylogic.com/) |
| S4 Conference session recordings | Dale Peterson (free archive) | [s4events.com](https://s4events.com/) |
| INL cybersecurity for energy delivery | Idaho National Lab (free) | [inl.gov](https://inl.gov/critical-infrastructure/) |

---

## 🖥 Home lab — quick reference

Full walkthrough: **[ot-ics-homelab.md](./ot-ics-homelab.md)**

```
Internet
    │
    ▼
┌─────────────────────────┐
│      pfSense            │  Firewall — controls all inter-zone traffic
│  WAN / LAN / OPT1       │
└────┬──────────┬──────────┘
     │          │
     ▼          ▼
┌──────────┐  ┌──────────────────────┐
│ IT zone  │  │   Industrial DMZ     │
│ VMnet8   │  │   VMnet2             │
│ NAT      │  │   192.168.20.0/24    │
│          │  └──────────┬───────────┘
│ Kali     │             │
│ Wazuh    │             ▼
└──────────┘  ┌──────────────────────┐
              │   OT zone            │
              │   VMnet3 — no internet
              │   192.168.30.0/24    │
              │   OpenPLC · ScadaBR  │
              └──────────────────────┘
```

| VM | Zone | RAM | IP |
|----|------|-----|----|
| pfSense | Firewall | 1 GB | gateway |
| OpenPLC | OT | 2 GB | 192.168.30.10 |
| ScadaBR | OT | 2 GB | 192.168.30.20 |
| DMZ Ubuntu | DMZ | 2 GB | 192.168.20.10 |
| Wazuh SIEM | IT | 4 GB | 192.168.80.10 |
| Kali Linux | IT | 4 GB | 192.168.80.20 |

> 🖥 **[Open the interactive RAM calculator](https://grand1llusion.github.io/cyber_knowledge_base/ot-ics/ram-calculator.html)** — adjusts all VM allocations based on your host specs.

---

<div align="center">

*All attack scenarios documented here are intended for use in isolated lab environments only.*

[← Back to main page](../README.md)

</div>
