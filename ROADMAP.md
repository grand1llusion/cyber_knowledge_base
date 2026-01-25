```mermaid
gantt
    title Cyber Certification Operation: 2026
    dateFormat  YYYY-MM-DD
    axisFormat  %b %Y
    
    section Academic (UMGC)
    Data Analytics (DATA 320)     :active, school1, 2026-01-15, 2026-05-15
    Cyber Integration Seminar     :school2, after school1, 90d

    section Defensive Skills
    Network+ / Refresh            :done, des1, 2025-12-01, 2026-01-10
    LAN-Sentinel Project (Python) :active, dev1, 2026-01-20, 2026-02-20
    Security+ (Sy0-701) Prep      :crit, sec1, 2026-02-01, 2026-03-15
    Security+ Exam Window         :milestone, crit, 2026-03-20, 0d

    section Offensive Skills
    TryHackMe (Jr Pen Tester)     :off1, 2026-04-01, 2026-05-15
    eJPT Certification Exam       :crit, milestone, 2026-06-01, 0d

    section Buffer / Leave
    Planned Leave / Block Leave   :crit, leave1, 2026-07-01, 14d
