# Markdown & GitHub Syntax Guide

## 1. Text Styling
**Bold Text**: Use double asterisks `**text**`
*Italic Text*: Use single asterisks `*text*`
~~Strikethrough~~: Use double tildes `~~text~~`
`Inline Code`: Use backticks `` `text` `` (Great for file paths or commands like `git init`)

## 2. Headers
# H1 - Main Title (Use once per page)
## H2 - Major Section
### H3 - Subsection
#### H4 - Minor Section

## 3. Lists & Checklists
**Bullet Points:**
* Item 1
* Item 2
  * Indented Item (Tab to indent)

**Numbered Lists:**
1. Step One
2. Step Two

**Task Lists (Great for Tracking Progress):**
- [x] Create GitHub Repo
- [ ] Finish Python Script
- [ ] Pass Security+ Exam

## 4. Code Blocks (Critical for Cyber)
Always specify the language (python, bash, sql) after the first three backticks for color highlighting.

**Python Example:**
```python
def scan_network(ip):
    print(f"Scanning {ip}...")
```
Bash/Terminal Example:
Bash
sudo nmap -sS -p- 192.168.1.1

## 5. Links & ImagesLink Text -> [Google](https://google.com)![Alt Text](Image https://www.google.com/search?q=URL) -> ![Network Diagram](/images/net-diag.png)

## 6. Tables
### Advanced Table: Vulnerability Scan Report
Notice the colons (`:`) in the second line. They control alignment.

| Service Name | Port / Protocol | Severity | CVSS Score | Status |
| :--- | :---: | :---: | ---: | :--- |
| **HTTP** | `80/tcp` | **HIGH** | 9.8 | 🔴 Open |
| SSH | `22/tcp` | LOW | 2.1 | 🟢 Secure |
| *Telnet* | `23/tcp` | CRITICAL | 10.0 | 🔴 **Fix Now** |
| FTP | `21/tcp` | Moderate | 5.3 | 🟡 Mitigated |

**Alignment Key:**
* `:---` = Left Align (Default)
* `:---:` = Center Align (Good for status/short text)
* `---:` = Right Align (Good for numbers/money)

## 7. Blockquotes"Security is a process, not a product."- Bruce Schneier

## 8. Advanced: Mermaid Diagrams (Charts as Code)
Gantt Chart (Project Timeline):
Code snippet
gantt
    title Cyber Certification Roadmap
    dateFormat YYYY-MM-DD
    section Q1
    Python Project :active, 2026-01-25, 30d
    Security+ Prep :2026-02-01, 45d

Sequence Diagram (Network Traffic):
Code snippet
sequenceDiagram
    Client->>Server: SYN
    Server->>Client: SYN-ACK
    Client->>Server: ACK

### Pro Tip for You
Since you are studying **Data Analytics**, you will likely use the **Table** feature often to display sample datasets in your notes without needing screenshots.

**To preview your changes:**
When editing a file on GitHub.com or in VS Code, there is a **"Preview"** tab (usually an icon that looks like a magnifying glass or an open book) that lets you see what the code looks like rendered before you commit it.

**Next Step:**
Would you like to try creating that **Python Auto-Scheduler** we discussed to automa
