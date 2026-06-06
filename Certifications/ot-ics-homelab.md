# OT/ICS Cybersecurity Home Lab — Setup Guide

A hands-on [IT/OT](https://www.cisa.gov/topics/industrial-control-systems) lab environment simulating a real industrial network using the [Purdue Model](https://www.sans.org/blog/understanding-the-purdue-model-of-ics-security/) architecture. Designed for studying [SecOT+](https://www.comptia.org/certifications/secot), [GICSP](https://www.giac.org/certifications/global-industrial-cyber-security-professional-gicsp/), and [ISA/IEC 62443](https://www.isa.org/certification/certificate-programs/isa-iec-62443-cybersecurity-certificate-program) certifications.

---

## Architecture overview

```
Internet
    │
    ▼
┌─────────────────────────────┐
│   pfSense / OPNsense        │  ← Firewall / zone controller
│   WAN: NAT (VMnet8)         │
│   LAN: 192.168.20.1         │
│   OPT1: 192.168.30.1        │
└──────┬───────────┬──────────┘
       │           │
       ▼           ▼
┌──────────┐  ┌──────────────────────────┐
│ IT Zone  │  │   Industrial DMZ         │
│ VMnet8   │  │   VMnet2 · /24           │
│ NAT      │  │   192.168.20.0/24        │
│          │  │   Ubuntu (OPC-UA bridge) │
│ Kali     │  └────────────┬─────────────┘
│ Wazuh    │               │
│ Win 10   │               ▼
└──────────┘  ┌──────────────────────────┐
              │   OT Zone (air-gapped)   │
              │   VMnet3 · no internet   │
              │   192.168.30.0/24        │
              │   OpenPLC  · .30.10      │
              │   ScadaBR  · .30.20      │
              └──────────────────────────┘
```

**Zone summary**

| Zone | VMnet | Subnet | Internet | Purpose |
|------|-------|--------|----------|---------|
| IT / Corporate | VMnet8 (NAT) | 192.168.80.0/24 | ✅ | Attacker sim, SIEM, workstation |
| Industrial DMZ | VMnet2 (host-only) | 192.168.20.0/24 | ❌ | IT/OT data handshake point |
| OT / Process | VMnet3 (host-only) | 192.168.30.0/24 | ❌ | PLC, HMI, SCADA — air-gapped |

---

## Prerequisites

- **Hypervisor:** VMware Workstation Pro (recommended) or VirtualBox
- **Host RAM:** 16 GB minimum (12 GB allocated to VMs at peak)
- **Host storage:** 100 GB free on SSD preferred
- **OS:** Windows 10/11 host

### ISOs / appliances to download first

| Software | Type | Link | Zone |
|----------|------|------|------|
| pfSense CE | ISO | [netgate.com](https://www.netgate.com/pfsense-plus-software/how-to-buy#pfsense-ce) (free account required) or [OPNsense](https://opnsense.org/download/) | Firewall |
| Ubuntu Server 22.04 LTS | ISO | [ubuntu.com/download/server](https://ubuntu.com/download/server) | DMZ + OT |
| Kali Linux | VMware OVA | [kali.org/get-kali/#kali-virtual-machines](https://www.kali.org/get-kali/#kali-virtual-machines) | IT |
| Wazuh | OVA | [documentation.wazuh.com](https://documentation.wazuh.com/current/deployment-options/virtual-machine/virtual-machine.html) | IT |
| OpenPLC Editor | Windows installer | [autonomylogic.com](https://autonomylogic.com/) | Host machine |
| Wireshark | Windows installer | [wireshark.org](https://www.wireshark.org/download.html) | Host machine |

> **OPNsense note:** If pfSense CE requires account creation, OPNsense is a drop-in alternative — same FreeBSD base, identical firewall rule logic, identical interface assignment process.

---

## Step 1 — Configure VMware virtual networks

**Quick version:** Open VMware → Edit → Virtual Network Editor → Add VMnet2 (host-only, 192.168.20.0/24, no DHCP) and VMnet3 (host-only, 192.168.30.0/24, no DHCP). VMnet8 (NAT) already exists.

<details>
<summary>📖 Detailed walkthrough</summary>

1. Open VMware Workstation. Click **Edit** in the menu bar → **Virtual Network Editor**.
2. Click **Change Settings** (bottom right) to run as administrator — required to add new networks.
3. You will see VMnet0 (bridged), VMnet1 (host-only), and VMnet8 (NAT) already listed. Leave these alone.
4. Click **Add Network** → select **VMnet2** → click OK.
   - Set type to **Host-only**
   - Uncheck **Use local DHCP service** — you will assign static IPs manually
   - Set subnet IP to `192.168.20.0`, subnet mask `255.255.255.0`
5. Click **Add Network** → select **VMnet3** → click OK.
   - Same settings: Host-only, no DHCP, subnet `192.168.30.0`, mask `255.255.255.0`
6. Click **Apply** and close.

**Why no DHCP?** Real industrial networks use static IPs. Dynamic addresses make asset tracking harder and are inconsistent with how real [OT environments](https://www.cisa.gov/sites/default/files/2023-10/23_1003_cisaknowledgebase_ot_cybersecurity.pdf) are managed. You want your OpenPLC at `.30.10` every single time — always.

**Why three VMnets?** Each VMnet is an isolated Layer 2 broadcast domain. VMs on VMnet3 cannot talk to VMs on VMnet2 unless pfSense explicitly permits it — which is exactly the isolation model of a real industrial DMZ. See [NIST SP 800-82](https://csrc.nist.gov/pubs/sp/800/82/r3/final) §6.2 for the formal guidance.

</details>

---

## Step 2 — Install pfSense (firewall VM)

**Quick version:** New VM → pfSense ISO → 1 CPU / 1 GB RAM → three NICs: VMnet8 (WAN), VMnet2 (LAN/DMZ), VMnet3 (OPT1/OT). Complete install, confirm interface assignments, reboot.

<details>
<summary>📖 Detailed walkthrough</summary>

### Create the VM

1. In VMware: **File → New Virtual Machine → Typical**.
2. Select the pfSense ISO as the installer disk image.
3. Guest OS: **Other → FreeBSD 64-bit**.
4. Name it `pfSense-Firewall`.
5. Disk: **20 GB**, store as single file.
6. Click **Customize Hardware**:
   - RAM: **1024 MB**
   - CPU: **1 core**
   - **Network Adapter 1** → VMnet8 (NAT) — this is your WAN
   - Click **Add → Network Adapter** → VMnet2 — this is your LAN (DMZ)
   - Click **Add → Network Adapter** → VMnet3 — this is OPT1 (OT zone)
7. Click Finish and power on the VM.

### Install pfSense

1. Boot from ISO. At the boot menu, press **Enter** to accept defaults.
2. Select **Install pfSense**.
3. Keymap: **Continue with default keymap**.
4. Partitioning: **Auto (UFS)** → confirm you want to destroy the virtual disk (`da0`) — this is safe, it is only the VM's virtual hard drive.
5. Install completes → select **No** when asked to open a shell → **Reboot**.
6. Remove the ISO from the VM's CD drive before it boots back up (VMware → VM → Settings → CD/DVD → disconnect).

### Assign interfaces

After reboot pfSense drops to a console menu. You will be asked to assign interfaces:

1. **Should VLANs be set up?** → `n`
2. **WAN interface:** type `em0` → Enter
3. **LAN interface:** type `em1` → Enter
4. **Optional interface 1:** type `em2` → Enter
5. **Proceed?** → `y`

pfSense will apply settings and show a summary screen:
```
WAN  → em0  → (DHCP IP from VMnet8 NAT)
LAN  → em1  → 192.168.20.1
OPT1 → em2  → (unassigned — set via web UI next)
```

### Set LAN IP via console

From the pfSense main menu → **Option 2 (Set interface IP address)** → select LAN (em1):
- IPv4: `192.168.20.1`
- Subnet: `24`
- IPv6: skip (Enter)
- DHCP server on LAN: `n`
- Revert to HTTP: `y` (easier for lab access)

pfSense web UI is now reachable at `http://192.168.20.1` from any VM on VMnet2. Default credentials: `admin` / `pfsense` — **change these immediately after first login.**

</details>

---

## Step 3 — Install Ubuntu Server VMs (OT zone)

**Quick version:** Create two Ubuntu Server VMs on VMnet3. Assign static IPs `192.168.30.10` (OpenPLC) and `192.168.30.20` (ScadaBR) via Netplan after install. 2 CPU / 2 GB RAM each.

<details>
<summary>📖 Detailed walkthrough</summary>

### VM creation (repeat for both)

1. **File → New Virtual Machine → Typical**
2. Select Ubuntu Server 22.04 ISO
3. Guest OS: **Linux → Ubuntu 64-bit**
4. Names: `OT-OpenPLC` and `OT-ScadaBR`
5. Disk: **25 GB** each
6. Customize Hardware:
   - RAM: **2048 MB**
   - CPU: **2 cores**
   - Network Adapter: **VMnet3**

### Ubuntu install (same process for both)

1. Language: **English**
2. Keyboard: your layout
3. Network: leave as-is during install (DHCP is fine temporarily)
4. Storage: **Use entire disk** → confirm
5. Create a user account and password — remember these
6. **Install OpenSSH server: Yes** — you will SSH into these VMs rather than using the console
7. Install completes → reboot → log in

### Assign static IPs via Netplan

Ubuntu Server 22.04 uses [Netplan](https://netplan.io/) for network config.

```bash
sudo nano /etc/netplan/00-installer-config.yaml
```

For the OpenPLC VM (`192.168.30.10`):

```yaml
network:
  version: 2
  ethernets:
    ens33:
      dhcp4: no
      addresses:
        - 192.168.30.10/24
      gateway4: 192.168.30.1
      nameservers:
        addresses: [8.8.8.8]
```

For the ScadaBR VM (`192.168.30.20`), use `192.168.30.20/24` instead.

Apply:
```bash
sudo netplan apply
```

Verify:
```bash
ip a
ping 192.168.30.1
```

> **Interface name note:** The interface may be named `ens33`, `ens32`, or `eth0` depending on VMware. Run `ip a` first to confirm the name and replace `ens33` in the config if needed.

</details>

---

## Step 4 — Configure pfSense firewall rules

**Quick version:** Log into `http://192.168.20.1`. Set OPT1 IP to `192.168.30.1/24`. Create rules: OT zone has NO outbound internet. DMZ can reach OT only on port 502 (Modbus). IT zone blocked from OT entirely by default.

<details>
<summary>📖 Detailed walkthrough</summary>

### Set OPT1 (OT zone) IP

1. Log into pfSense web UI at `http://192.168.20.1` from a DMZ VM (or temporarily from your host if bridged)
2. **Interfaces → OPT1 → Enable → IPv4 Configuration Type: Static**
3. IPv4 address: `192.168.30.1` / `24`
4. Save → Apply changes

### Firewall rules to create

Navigate to **Firewall → Rules** for each interface:

**OT zone (OPT1) — outbound rules**
- Block ALL outbound from OT to WAN (internet). OT devices should never initiate internet connections.

**DMZ (LAN) → OT**
- Allow TCP from `192.168.20.0/24` to `192.168.30.0/24` on port `502` (Modbus TCP)
- Allow TCP from `192.168.20.0/24` to `192.168.30.0/24` on port `20000` (DNP3, optional)
- Block everything else DMZ → OT

**IT zone (VMnet8) → OT**
- Block ALL by default. You will temporarily open this during attack simulation exercises and then close it.

### Verify isolation

From your Kali VM (IT zone), ping the OpenPLC VM:
```bash
ping 192.168.30.10
```
This should **fail**. If it succeeds, your firewall rules need adjustment. Zone isolation is the foundation of this lab — nothing else matters if the OT zone is reachable from IT by default.

**Why [Modbus TCP](https://www.modbus.org/docs/Modbus_Application_Protocol_V1_1b3.pdf) port 502?** Modbus is the most widely deployed industrial protocol in the world, running on ~46,000+ internet-exposed ICS devices globally (per [Dragos 2024 Year in Review](https://www.dragos.com/year-in-review/)). OpenPLC uses it by default to communicate with SCADA/HMI software. Allowing only port 502 from the DMZ to OT mirrors a real DMZ policy: data flows, commands don't.

</details>

---

## Step 5 — Install OpenPLC Runtime

**Quick version:** SSH into `192.168.30.10`. Clone repo, run `./install.sh linux`. Web UI on port 8080. Load a sample ladder logic program. OpenPLC listens on Modbus TCP port 502.

<details>
<summary>📖 Detailed walkthrough</summary>

```bash
# SSH in from host or DMZ VM
ssh user@192.168.30.10

# Install dependencies and clone
sudo apt update && sudo apt install -y git
git clone https://github.com/thiagoralves/OpenPLC_v3
cd OpenPLC_v3
sudo ./install.sh linux
```

Install takes ~10 minutes. When complete:

```bash
sudo ./start_openplc.sh
```

OpenPLC web UI is at `http://192.168.30.10:8080`
- Default login: `openplc` / `openplc` — change this
- Navigate to **Programs → Upload Program** and load one of the included examples (a pump/tank simulation works well)
- Navigate to **Slave Devices** — verify Modbus TCP server is running on port 502

### OpenPLC Editor (on your Windows host)

Download and install from [autonomylogic.com](https://autonomylogic.com/). This is where you write [ladder logic](https://www.plcacademy.com/ladder-logic-tutorial/) programs (the programming language used in real PLCs) and upload them to your OpenPLC Runtime VM. A simple program: coil turns ON when a tank level register drops below a setpoint — simulating a pump auto-start.

</details>

---

## Step 6 — Install ScadaBR (HMI/SCADA)

**Quick version:** SSH into `192.168.30.20`. Install Java 11, download ScadaBR, run installer. Web UI on port 8080. Add a Modbus data source pointing to `192.168.30.10:502`. Build a dashboard showing your simulated process.

<details>
<summary>📖 Detailed walkthrough</summary>

```bash
ssh user@192.168.30.20

# Install Java
sudo apt update
sudo apt install -y openjdk-11-jdk wget

# Download ScadaBR (check scadabr.com.br for latest version)
wget https://github.com/ScadaBR/ScadaBR/releases/latest/download/ScadaBR-installer.jar
sudo java -jar ScadaBR-installer.jar
```

Follow the installer GUI (or use default paths if running headless). Start ScadaBR:
```bash
cd /opt/scadabr/bin
sudo ./startup.sh
```

Web UI at `http://192.168.30.20:8080`

### Connect ScadaBR to OpenPLC

1. **Data Sources → Add → Modbus IP**
2. Host: `192.168.30.10`, port: `502`
3. Add data points for the registers your OpenPLC program uses (e.g. coil 0 = pump state, holding register 0 = tank level)
4. Build a graphical view: tank image, pump icon, live value displays, alarm thresholds

When ScadaBR's dashboard shows your tank level changing and your pump toggling, your simulated process is alive. This is your baseline — the normal operating state you'll learn to detect deviations from.

</details>

---

## Step 7 — Deploy Wazuh SIEM (IT zone)

**Quick version:** Import Wazuh OVA into VMware, set network to VMnet8 (IT zone), static IP `192.168.80.10`. Install Wazuh agent on all other VMs. Create detection rule for Modbus Function Code 16 (write registers).

<details>
<summary>📖 Detailed walkthrough</summary>

### Import OVA

1. VMware → **File → Open** → select the Wazuh `.ova` file
2. Once imported, edit VM settings: Network Adapter → **VMnet8**
3. Power on. Wazuh boots to a login screen.
   - Default credentials: `wazuh-user` / `wazuh` (check [Wazuh docs](https://documentation.wazuh.com/current/deployment-options/virtual-machine/virtual-machine.html) for current defaults)
4. Set static IP:
```bash
sudo nmcli con mod "Wired connection 1" ipv4.addresses 192.168.80.10/24
sudo nmcli con mod "Wired connection 1" ipv4.gateway 192.168.80.1
sudo nmcli con mod "Wired connection 1" ipv4.method manual
sudo nmcli con up "Wired connection 1"
```

### Install Wazuh agents on other VMs

On each Ubuntu VM (OpenPLC, ScadaBR, DMZ):
```bash
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | sudo apt-key add -
echo "deb https://packages.wazuh.com/4.x/apt/ stable main" | sudo tee /etc/apt/sources.list.d/wazuh.list
sudo apt update && sudo apt install -y wazuh-agent
sudo sed -i 's/MANAGER_IP/192.168.80.10/' /var/ossec/etc/ossec.conf
sudo systemctl enable wazuh-agent --now
```

### Create a Modbus FC16 detection rule

[Modbus Function Code 16](https://www.modbus.org/docs/Modbus_Application_Protocol_V1_1b3.pdf) (write multiple registers) is the command attackers use to push rogue values to a PLC — overwrite a setpoint, open a valve, trip a breaker. Add this custom rule in Wazuh:

```xml
<!-- /var/ossec/etc/rules/local_rules.xml -->
<group name="ot,modbus,">
  <rule id="100001" level="12">
    <decoded_as>json</decoded_as>
    <field name="modbus.function_code">^16$</field>
    <description>Modbus FC16 write detected — possible rogue register write to PLC</description>
    <mitre>
      <id>T0855</id>
    </mitre>
  </rule>
</group>
```

> **MITRE ATT&CK for ICS:** [T0855](https://attack.mitre.org/techniques/T0855/) is "Unauthorized Command Message" — exactly what a rogue Modbus write represents. Getting comfortable mapping real events to ATT&CK for ICS TTP IDs is a core skill for SecOT+ and GICSP.

</details>

---

## Step 8 — Deploy Kali Linux (attack VM, IT zone)

**Quick version:** Extract Kali VMware OVA, open in VMware, set network to VMnet8. Install `python3-pymodbus`. This is your adversary simulation machine.

<details>
<summary>📖 Detailed walkthrough</summary>

1. Extract the downloaded Kali `.7z` file (use [7-Zip](https://www.7-zip.org/))
2. VMware → **File → Open** → select the `.vmx` file inside the extracted folder
3. Edit VM settings: Network Adapter → **VMnet8**
4. Power on. Kali default credentials: `kali` / `kali`

### Install OT attack tools

```bash
sudo apt update
sudo apt install -y python3-pip nmap
pip3 install pymodbus
```

### Verify tools

```bash
# Scan for open Modbus ports (only run against your own lab)
nmap -p 502 192.168.30.0/24

# Quick Modbus read test (once pfSense rules allow it)
python3 -c "
from pymodbus.client import ModbusTcpClient
c = ModbusTcpClient('192.168.30.10', port=502)
c.connect()
result = c.read_holding_registers(0, 5)
print(result.registers)
c.close()
"
```

</details>

---

## Practice scenarios

Run these in order. Each maps directly to SecOT+ and GICSP exam domains.

### Scenario 1 — Baseline and asset inventory
> **Exam domain:** OT risk assessment, asset management

Capture 5 minutes of Modbus traffic between OpenPLC and ScadaBR using Wireshark on your DMZ VM. Import the `.pcap` into [GrassMarlin](https://github.com/nsacyber/GRASSMARLIN) (free CISA/NSA tool). GrassMarlin auto-generates your asset topology — every device, every connection, every protocol. This is what defenders do when inheriting an unknown OT environment.

Verify zone isolation: ping from Kali → OpenPLC. Should fail. Document the pfSense rule that blocks it.

---

### Scenario 2 — Rogue Modbus write (simulated attack)
> **Exam domain:** ICS threat landscape, [MITRE ATT&CK for ICS T0855](https://attack.mitre.org/techniques/T0855/)

Temporarily open a pfSense rule allowing Kali (IT zone) to reach OpenPLC port 502. From Kali:

```python
from pymodbus.client import ModbusTcpClient

client = ModbusTcpClient('192.168.30.10', port=502)
client.connect()

# Write 0 to holding register 0 — simulates zeroing a pump setpoint
client.write_registers(0, [0])
client.close()
print("Rogue write sent")
```

Observe: ScadaBR alarm fires. Wazuh FC16 alert triggers. Close the pfSense rule. Document what firewall policy would have prevented lateral movement at the IT→DMZ boundary.

---

### Scenario 3 — Lateral movement through DMZ
> **Exam domain:** Incident detection, network segmentation, [BAUXITE threat group TTPs](https://www.dragos.com/threat/bauxite/)

SSH into the DMZ VM (simulating phishing-based initial access to an internet-facing system). From the DMZ, attempt the Modbus write to OpenPLC. Does it succeed? Does Wazuh detect it differently than Scenario 2? Write the detection rule that catches the pivot, not just the final write.

---

### Scenario 4 — Full IR exercise
> **Exam domain:** OT incident response, [NIST SP 800-82](https://csrc.nist.gov/pubs/sp/800/82/r3/final) §7

Run Scenario 2 without watching. Then act as defender:

1. Find the Wazuh alert
2. Identify the source IP
3. Block it in pfSense
4. Verify OT zone integrity (ScadaBR process still running correctly)
5. Restore normal connectivity
6. Write a one-page IR report: timeline, IOCs, containment action, lessons learned

Time yourself. Real ICS IR teams operate under [NERC CIP-008](https://www.nerc.com/pa/Stand/Pages/CIPStandards.aspx) mandatory reporting timelines.

---

## Key concepts and further reading

| Concept | Resource |
|---------|----------|
| Purdue Model / ICS architecture | [SANS ICS poster](https://www.sans.org/security-resources/posters/industrial-control-system-poster/55/download) |
| NIST SP 800-82 Rev 3 | [csrc.nist.gov](https://csrc.nist.gov/pubs/sp/800/82/r3/final) |
| MITRE ATT&CK for ICS | [attack.mitre.org/matrices/ics](https://attack.mitre.org/matrices/ics/) |
| Modbus protocol spec | [modbus.org](https://www.modbus.org/docs/Modbus_Application_Protocol_V1_1b3.pdf) |
| ICS-CERT advisories (CISA) | [cisa.gov/ics-advisories](https://www.cisa.gov/ics-advisories) |
| Dragos Year in Review | [dragos.com/year-in-review](https://www.dragos.com/year-in-review/) |
| ISA/IEC 62443 standard | [isa.org](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards) |
| Free CISA ICS training | [cisa.gov/ics-training](https://www.cisa.gov/ics-training-available-through-cisa) |
| GrassMarlin (asset mapping) | [github.com/nsacyber/GRASSMARLIN](https://github.com/nsacyber/GRASSMARLIN) |

---

## VM resource allocation summary

| VM | Zone | VMnet | RAM | CPU | Notes |
|----|------|-------|-----|-----|-------|
| pfSense | Firewall | VMnet8/2/3 | 1 GB | 1 | 3 NICs required |
| Ubuntu (OpenPLC) | OT | VMnet3 | 2 GB | 2 | Static: .30.10 |
| Ubuntu (ScadaBR) | OT | VMnet3 | 2 GB | 2 | Static: .30.20 |
| Ubuntu (DMZ) | DMZ | VMnet2 | 2 GB | 1 | Static: .20.10 |
| Wazuh (OVA) | IT | VMnet8 | 4 GB | 2 | Static: .80.10 |
| Kali Linux (OVA) | IT | VMnet8 | 4 GB | 2 | Attack VM |
| Windows 10 (optional) | IT | VMnet8 | 4 GB | 2 | Analyst workstation |

**Peak concurrent RAM:** ~13 GB (all VMs running). A 16 GB host is the practical minimum; 32 GB is comfortable.

---

*Built for SecOT+, GICSP, and ISA/IEC 62443 exam preparation. All attack scenarios are intended for use only within this isolated lab environment.*
