/* Certification registry. Public exam metadata only — no question content.
   To add a cert: append an entry. Decks attach by their `cert` field matching `id` (or any value in `codes`). */
window.REGISTRY = {
  certs: [
    { id:'pt0-003', vendor:'CompTIA', name:'PenTest+', code:'PT0-003', codes:['pt0-003','pentest+','pt0-002'], status:'active',
      exam:{questions:90, minutes:165, pass:'750 / 900'},
      range:'pt0-003',
      domains:[
        {name:'Engagement Management', weight:13, aliases:['Planning and Scoping','Reporting and Communication']},
        {name:'Reconnaissance and Enumeration', weight:21, aliases:['Information Gathering and Vulnerability Scanning']},
        {name:'Vulnerability Discovery and Analysis', weight:17, aliases:['Tools and Code Analysis']},
        {name:'Attacks and Exploits', weight:35, aliases:[]},
        {name:'Post-exploitation and Lateral Movement', weight:14, aliases:[]}
      ],
      note:'Bank was tagged with PT0-002 domain names; they are mapped to the nearest PT0-003 domain for mastery.' },
    { id:'cs0-004', vendor:'CompTIA', name:'CySA+', code:'CS0-004', codes:['cs0-004','cs0-003','cs0-002','cysa+'], status:'active',
      exam:{questions:85, minutes:165, pass:'750 / 900'},
      domains:[
        {name:'Security Operations', weight:34, aliases:['Security Operations and Monitoring','Software and Systems Security']},
        {name:'Vulnerability Management', weight:26, aliases:['Threat and Vulnerability Management']},
        {name:'Incident Response and Management', weight:24, aliases:['Incident Response','Incident Response Management']},
        {name:'Reporting and Communication', weight:16, aliases:['Compliance and Assessment']}
      ],
      note:'Practice bank is from CS0-002, used to test the study method. Items are tagged to CS0-004 domains.' },
    { id:'cas-005', vendor:'CompTIA', name:'SecurityX', code:'CAS-005', codes:['cas-005','securityx','casp+'], status:'planned',
      exam:{questions:90, minutes:165, pass:'Pass / fail'},
      domains:[
        {name:'Governance, Risk, and Compliance', weight:20},{name:'Security Architecture', weight:27},
        {name:'Security Engineering', weight:31},{name:'Security Operations', weight:22}] },
    { id:'sot-001', vendor:'CompTIA', name:'SecOT+', code:'SOT-001', codes:['sot-001','secot+'], status:'planned', exam:null, domains:[], note:'Objectives are in draft (v1.2).' },
    { id:'ccsk-v5', vendor:'CSA', name:'CCSK', code:'v5', codes:['ccsk','ccsk-v5'], status:'planned', exam:null, domains:[] },
    { id:'a-csm', vendor:'Scrum Alliance', name:'Advanced Certified ScrumMaster', code:'A-CSM', codes:['a-csm','acsm'], status:'planned', exam:null, domains:[] },
    { id:'fortinet-nse', vendor:'Fortinet', name:'NSE / FCP', code:'NSE', codes:['nse','fortinet','nse4'], status:'planned', exam:null, domains:[] }
  ]
};
