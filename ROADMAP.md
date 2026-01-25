```mermaid
gantt
    title Cyber Certification Operation: 2026
    dateFormat  YYYY-MM-DD
    axisFormat  %b %Y
    
    section Academic
    UMGC-DATA 320     :active, school1, 2026-01-07, 2026-03-03
    UMGC-DATA 330     :active, school1, 2026-01-07, 2026-03-03
    UMGC-DATA 335     :active, school1, 2026-03-11, 2026-05-05
    AU-SECR 6606    :active, school2, 2026-05-18, 2026-07-14
    
    section Certs
    SecurityX Prep      :crit, sec1, 2026-02-01, 2026-03-15
    SecurityX Exam Window         :milestone, crit, 2026-03-20, 0d

    section Other
    TryHackMe (Jr Pen Tester)     :off1, 2026-04-01, 2026-05-15
    eJPT Certification Exam       :crit, milestone, 2026-06-01, 0d

    section Leave
    Planned Leave / Block Leave   :crit, leave1, 2026-07-01, 14d
