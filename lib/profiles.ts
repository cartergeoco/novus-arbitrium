export type CountryProfile = { principle: string; priority: string; dossier: string };

const profiles: Record<string, CountryProfile> = {
  "ZWE": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "ZMB": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "YEM": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: republic, presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "VNM": {
    "principle": "One-party state",
    "priority": "Economic development",
    "dossier": "Government: republic, one-party state. Governing outlook: One-party state. Main public priority: Economic development."
  },
  "VEN": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system, federal republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "VAT": {
    "principle": "Papal sovereignty",
    "priority": "Religious diplomacy",
    "dossier": "Government: constitutional monarchy, theocracy, papacy. Governing outlook: Papal sovereignty. Main public priority: Religious diplomacy."
  },
  "VUT": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "UZB": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "URY": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: republic, presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "FSM": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: federal republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "MHL": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "MNP": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Northern Mariana Islands is a dependent territory administered by the United States, not a sovereign state."
  },
  "VIR": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "United States Virgin Islands is a dependent territory administered by the United States, not a sovereign state."
  },
  "GUM": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Guam is a dependent territory administered by the United States, not a sovereign state."
  },
  "ASM": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "American Samoa is a dependent territory administered by the United States, not a sovereign state."
  },
  "PRI": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Puerto Rico is a dependent territory administered by the United States, not a sovereign state."
  },
  "USA": {
    "principle": "Presidential republic",
    "priority": "Alliance leadership",
    "dossier": "Government: constitutional republic. Governing outlook: Presidential republic. Main public priority: Alliance leadership."
  },
  "SGS": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "South Georgia and the Islands is a dependent territory administered by the United Kingdom, not a sovereign state."
  },
  "IOT": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "British Indian Ocean Territory is a dependent territory administered by the United Kingdom, not a sovereign state."
  },
  "SHN": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Saint Helena is a dependent territory administered by the United Kingdom, not a sovereign state."
  },
  "PCN": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Pitcairn Islands is a dependent territory administered by the United Kingdom, not a sovereign state."
  },
  "AIA": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "FLK": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Falkland Islands is a dependent territory administered by the United Kingdom, not a sovereign state."
  },
  "CYM": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: British Overseas Territories. Governing outlook: Republic. Main public priority: Economic development."
  },
  "BMU": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy, British Overseas Territories. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "VGB": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "British Virgin Islands is a dependent territory administered by the United Kingdom, not a sovereign state."
  },
  "TCA": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Turks and Caicos Islands is a dependent territory administered by the United Kingdom, not a sovereign state."
  },
  "MSR": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Montserrat is a dependent territory administered by the United Kingdom, not a sovereign state."
  },
  "JEY": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy, parliamentary democracy, parliamentary monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "GGY": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Guernsey is a dependent territory administered by the United Kingdom, not a sovereign state."
  },
  "IMN": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Isle of Man is a dependent territory administered by the United Kingdom, not a sovereign state."
  },
  "GBR": {
    "principle": "Constitutional monarchy",
    "priority": "Alliance security",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Alliance security."
  },
  "ARE": {
    "principle": "Absolute monarchy",
    "priority": "Economic diversification",
    "dossier": "Government: federal monarchy, constitutional monarchy, absolute monarchy. Governing outlook: Absolute monarchy. Main public priority: Economic diversification."
  },
  "UKR": {
    "principle": "Semi-presidential republic",
    "priority": "Territorial defense",
    "dossier": "Government: semi-presidential system. Governing outlook: Semi-presidential republic. Main public priority: Territorial defense."
  },
  "UGA": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "TKM": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: republic, presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "TUR": {
    "principle": "Presidential republic",
    "priority": "Regional security",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Regional security."
  },
  "TUN": {
    "principle": "Semi-presidential republic",
    "priority": "Economic development",
    "dossier": "Government: semi-presidential system, presidential system, parliamentary republic. Governing outlook: Semi-presidential republic. Main public priority: Economic development."
  },
  "TTO": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "TON": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "TGO": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "TLS": {
    "principle": "Semi-presidential republic",
    "priority": "Economic development",
    "dossier": "Government: republic, semi-presidential system. Governing outlook: Semi-presidential republic. Main public priority: Economic development."
  },
  "THA": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy, parliamentary monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "TZA": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "TJK": {
    "principle": "Presidential republic",
    "priority": "Collective security",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Collective security."
  },
  "TWN": {
    "principle": "Semi-presidential republic",
    "priority": "Cross-strait security",
    "dossier": "Government: democracy, semi-presidential system, constitutional republic. Governing outlook: Semi-presidential republic. Main public priority: Cross-strait security."
  },
  "SYR": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: provisional government. Governing outlook: Republic. Main public priority: Economic development."
  },
  "CHE": {
    "principle": "Directorial republic",
    "priority": "Armed neutrality",
    "dossier": "Government: federal republic, directorial system. Governing outlook: Directorial republic. Main public priority: Armed neutrality."
  },
  "SWE": {
    "principle": "Constitutional monarchy",
    "priority": "Collective defense",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Collective defense."
  },
  "SWZ": {
    "principle": "Absolute monarchy",
    "priority": "Economic development",
    "dossier": "Government: absolute monarchy. Governing outlook: Absolute monarchy. Main public priority: Economic development."
  },
  "SUR": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "SDS": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "SDN": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: federal republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "LKA": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "ESP": {
    "principle": "Constitutional monarchy",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary monarchy. Governing outlook: Constitutional monarchy. Main public priority: Collective defense."
  },
  "KOR": {
    "principle": "Presidential republic",
    "priority": "Deter the North",
    "dossier": "Government: republic, presidential system. Governing outlook: Presidential republic. Main public priority: Deter the North."
  },
  "ZAF": {
    "principle": "Parliamentary republic",
    "priority": "Regional stability",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Regional stability."
  },
  "SOM": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: federal republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "SOL": {
    "principle": "De facto republic",
    "priority": "Secure recognition",
    "dossier": "Somaliland is a de facto self-governing republic that is not widely recognized."
  },
  "SLB": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary democracy. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "SVK": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "SVN": {
    "principle": "Republic",
    "priority": "Collective defense",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Collective defense."
  },
  "SGP": {
    "principle": "Parliamentary republic",
    "priority": "Trade and security",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Trade and security."
  },
  "SLE": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "SYC": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "SRB": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "SEN": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "SAU": {
    "principle": "Absolute monarchy",
    "priority": "Energy security",
    "dossier": "Government: monarchy, absolute monarchy, islamic theocracy. Governing outlook: Absolute monarchy. Main public priority: Energy security."
  },
  "STP": {
    "principle": "Semi-presidential republic",
    "priority": "Economic development",
    "dossier": "Government: semi-presidential republic. Governing outlook: Semi-presidential republic. Main public priority: Economic development."
  },
  "SMR": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: diarchy, parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "WSM": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "VCT": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "LCA": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "KNA": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy, federal monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "RWA": {
    "principle": "Semi-presidential republic",
    "priority": "Economic development",
    "dossier": "Government: semi-presidential system. Governing outlook: Semi-presidential republic. Main public priority: Economic development."
  },
  "RUS": {
    "principle": "Presidential republic",
    "priority": "Strategic security",
    "dossier": "Government: super-presidential republic. Governing outlook: Presidential republic. Main public priority: Strategic security."
  },
  "ROU": {
    "principle": "Semi-presidential republic",
    "priority": "Collective defense",
    "dossier": "Government: semi-presidential system. Governing outlook: Semi-presidential republic. Main public priority: Collective defense."
  },
  "QAT": {
    "principle": "Constitutional monarchy",
    "priority": "Energy diplomacy",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Energy diplomacy."
  },
  "PRT": {
    "principle": "Republic",
    "priority": "Collective defense",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Collective defense."
  },
  "POL": {
    "principle": "Semi-presidential republic",
    "priority": "Collective defense",
    "dossier": "Government: semi-presidential system, parliamentary system. Governing outlook: Semi-presidential republic. Main public priority: Collective defense."
  },
  "PHL": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "PER": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "PRY": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "PNG": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary democracy. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "PAN": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "PLW": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "PAK": {
    "principle": "Parliamentary republic",
    "priority": "National defense",
    "dossier": "Government: federal republic, parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: National defense."
  },
  "OMN": {
    "principle": "Absolute monarchy",
    "priority": "Energy and security",
    "dossier": "Government: absolute monarchy. Governing outlook: Absolute monarchy. Main public priority: Energy and security."
  },
  "NOR": {
    "principle": "Constitutional monarchy",
    "priority": "Collective defense",
    "dossier": "Government: constitutional monarchy, parliamentary system. Governing outlook: Constitutional monarchy. Main public priority: Collective defense."
  },
  "PRK": {
    "principle": "Hereditary party rule",
    "priority": "Regime security",
    "dossier": "Government: republic, one-party state, Juche. Governing outlook: Hereditary party rule. Main public priority: Regime security."
  },
  "NGA": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: federal republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "NER": {
    "principle": "Military transition",
    "priority": "Economic development",
    "dossier": "Government: military transitional government. Governing outlook: Military transition. Main public priority: Economic development."
  },
  "NIC": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "NZL": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: parliamentary monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "NIU": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Niue is a dependent territory administered by New Zealand, not a sovereign state."
  },
  "COK": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Cook Islands is a dependent territory administered by New Zealand, not a sovereign state."
  },
  "NLD": {
    "principle": "Constitutional monarchy",
    "priority": "Collective defense",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Collective defense."
  },
  "ABW": {
    "principle": "Monarchy",
    "priority": "Economic development",
    "dossier": "Government: monarchy. Governing outlook: Monarchy. Main public priority: Economic development."
  },
  "CUW": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary democracy. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "NPL": {
    "principle": "One-party state",
    "priority": "Economic development",
    "dossier": "Government: people's republic, federal republic. Governing outlook: One-party state. Main public priority: Economic development."
  },
  "NRU": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "NAM": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "MOZ": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "MAR": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "SAH": {
    "principle": "Disputed territory",
    "priority": "Self-determination",
    "dossier": "Western Sahara is a disputed territory claimed by Morocco, with the Polisario Front seeking independence."
  },
  "MNE": {
    "principle": "Republic",
    "priority": "Collective defense",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Collective defense."
  },
  "MNG": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary system. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "MDA": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "MCO": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy, hereditary monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "MEX": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system, federal republic, constitutional republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "MUS": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "MRT": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "MLT": {
    "principle": "Parliamentary republic",
    "priority": "Preserve neutrality",
    "dossier": "Government: parliamentary democracy. Governing outlook: Parliamentary republic. Main public priority: Preserve neutrality."
  },
  "MLI": {
    "principle": "Military transition",
    "priority": "Economic development",
    "dossier": "Government: military transitional government. Governing outlook: Military transition. Main public priority: Economic development."
  },
  "MDV": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "MYS": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy, elective monarchy, federal monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "MWI": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "MDG": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "MKD": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "LUX": {
    "principle": "Constitutional monarchy",
    "priority": "Collective defense",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Collective defense."
  },
  "LTU": {
    "principle": "Semi-presidential republic",
    "priority": "Collective defense",
    "dossier": "Government: semi-presidential system, parliamentary republic. Governing outlook: Semi-presidential republic. Main public priority: Collective defense."
  },
  "LIE": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "LBY": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "LBR": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: republic, presidential system, constitutional republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "LSO": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "LBN": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "LVA": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: republic, parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "LAO": {
    "principle": "One-party state",
    "priority": "Economic development",
    "dossier": "Government: people's republic, communist dictatorship. Governing outlook: One-party state. Main public priority: Economic development."
  },
  "KGZ": {
    "principle": "Parliamentary republic",
    "priority": "Collective security",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective security."
  },
  "KWT": {
    "principle": "Constitutional monarchy",
    "priority": "Energy and security",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Energy and security."
  },
  "KOS": {
    "principle": "Parliamentary republic",
    "priority": "Secure recognition",
    "dossier": "Kosovo is a parliamentary republic whose independence is recognized by many countries and rejected by Serbia and others."
  },
  "KIR": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "KEN": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "KAZ": {
    "principle": "Presidential republic",
    "priority": "Collective security",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Collective security."
  },
  "JOR": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "JPN": {
    "principle": "Constitutional monarchy",
    "priority": "Economic security",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic security."
  },
  "JAM": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary democracy. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "ITA": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "ISR": {
    "principle": "Parliamentary republic",
    "priority": "National defense",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: National defense."
  },
  "PSX": {
    "principle": "Limited self-rule",
    "priority": "Pursue statehood",
    "dossier": "Palestine has limited self-government and is recognized as a state by many countries, while its final status remains unresolved."
  },
  "IRL": {
    "principle": "Republic",
    "priority": "Preserve neutrality",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Preserve neutrality."
  },
  "IRQ": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: federal republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "IRN": {
    "principle": "Islamic republic",
    "priority": "Regional influence",
    "dossier": "Government: presidential system, Islamic Republic, islamic theocracy. Governing outlook: Islamic republic. Main public priority: Regional influence."
  },
  "IDN": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: republic, presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "IND": {
    "principle": "Presidential republic",
    "priority": "Regional security",
    "dossier": "Government: republic, federal republic, constitutional republic. Governing outlook: Presidential republic. Main public priority: Regional security."
  },
  "ISL": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "HUN": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "HND": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "HTI": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: transitional presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "GUY": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "GNB": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "GIN": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "GTM": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "GRD": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary democracy. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "GRC": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "GHA": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: democracy. Governing outlook: Republic. Main public priority: Economic development."
  },
  "DEU": {
    "principle": "Parliamentary republic",
    "priority": "European stability",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: European stability."
  },
  "GEO": {
    "principle": "Semi-presidential republic",
    "priority": "Territorial integrity",
    "dossier": "Government: semi-presidential system, presidential system, parliamentary republic. Governing outlook: Semi-presidential republic. Main public priority: Territorial integrity."
  },
  "GMB": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "GAB": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "FRA": {
    "principle": "Semi-presidential republic",
    "priority": "European leadership",
    "dossier": "Government: semi-presidential system. Governing outlook: Semi-presidential republic. Main public priority: European leadership."
  },
  "SPM": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: overseas collectivity of France. Governing outlook: Republic. Main public priority: Economic development."
  },
  "WLF": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "MAF": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Saint Martin is a dependent territory administered by France, not a sovereign state."
  },
  "BLM": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Saint Barthelemy is a dependent territory administered by France, not a sovereign state."
  },
  "PYF": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "French Polynesia is a dependent territory administered by France, not a sovereign state."
  },
  "NCL": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "New Caledonia is a dependent territory administered by France, not a sovereign state."
  },
  "ATF": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "French Southern and Antarctic Lands is a dependent territory administered by France, not a sovereign state."
  },
  "ALD": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Aland is a dependent territory administered by Finland, not a sovereign state."
  },
  "FIN": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "FJI": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "ETH": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: federal republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "EST": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "ERI": {
    "principle": "One-party state",
    "priority": "Economic development",
    "dossier": "Government: one-party presidential state. Governing outlook: One-party state. Main public priority: Economic development."
  },
  "GNQ": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "SLV": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: republic, presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "EGY": {
    "principle": "Republic",
    "priority": "Regional stability",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Regional stability."
  },
  "ECU": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: republic, presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "DOM": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "DMA": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary democracy. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "DJI": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "GRL": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: parliamentary monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "FRO": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Faroe Islands is a dependent territory administered by Denmark, not a sovereign state."
  },
  "DNK": {
    "principle": "Constitutional monarchy",
    "priority": "Collective defense",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Collective defense."
  },
  "CZE": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "CYN": {
    "principle": "Breakaway republic",
    "priority": "Secure recognition",
    "dossier": "The Turkish Republic of Northern Cyprus is a de facto state recognized only by Turkey."
  },
  "CYP": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: republic, presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "CUB": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "HRV": {
    "principle": "Republic",
    "priority": "Collective defense",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Collective defense."
  },
  "CIV": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "CRI": {
    "principle": "Presidential republic",
    "priority": "Unarmed neutrality",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Unarmed neutrality."
  },
  "COD": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "COG": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "COM": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: federal republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "COL": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "CHN": {
    "principle": "One-party state",
    "priority": "National development",
    "dossier": "Government: people's republic. Governing outlook: One-party state. Main public priority: National development."
  },
  "MAC": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Macao S.A.R is a dependent territory administered by China, not a sovereign state."
  },
  "HKG": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Hong Kong S.A.R. is a dependent territory administered by China, not a sovereign state."
  },
  "CHL": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "TCD": {
    "principle": "Military transition",
    "priority": "Economic development",
    "dossier": "Government: military transitional government. Governing outlook: Military transition. Main public priority: Economic development."
  },
  "CAF": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "CPV": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "CAN": {
    "principle": "Constitutional monarchy",
    "priority": "Collective defense",
    "dossier": "Government: constitutional monarchy, parliamentary system. Governing outlook: Constitutional monarchy. Main public priority: Collective defense."
  },
  "CMR": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "KHM": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "MMR": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "BDI": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "BFA": {
    "principle": "Military transition",
    "priority": "Economic development",
    "dossier": "Government: republic, military junta. Governing outlook: Military transition. Main public priority: Economic development."
  },
  "BGR": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "BRN": {
    "principle": "Absolute monarchy",
    "priority": "Economic development",
    "dossier": "Government: absolute monarchy, Islamic state. Governing outlook: Absolute monarchy. Main public priority: Economic development."
  },
  "BRA": {
    "principle": "Presidential republic",
    "priority": "Regional leadership",
    "dossier": "Government: presidential system, federal republic. Governing outlook: Presidential republic. Main public priority: Regional leadership."
  },
  "BWA": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "BIH": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: federal parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "BOL": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: republic, parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "BTN": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "BEN": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: republic. Governing outlook: Republic. Main public priority: Economic development."
  },
  "BLZ": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy, parliamentary monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "BEL": {
    "principle": "Constitutional monarchy",
    "priority": "Collective defense",
    "dossier": "Government: federal parliamentary constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Collective defense."
  },
  "BLR": {
    "principle": "Presidential republic",
    "priority": "Collective security",
    "dossier": "Government: republic, presidential system. Governing outlook: Presidential republic. Main public priority: Collective security."
  },
  "BRB": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "BGD": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: Westminster system, parliamentary republic. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "BHR": {
    "principle": "Constitutional monarchy",
    "priority": "Energy and security",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Energy and security."
  },
  "BHS": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "AZE": {
    "principle": "Semi-presidential republic",
    "priority": "Territorial control",
    "dossier": "Government: republic, semi-presidential system. Governing outlook: Semi-presidential republic. Main public priority: Territorial control."
  },
  "AUT": {
    "principle": "Semi-presidential republic",
    "priority": "Preserve neutrality",
    "dossier": "Government: republic, semi-presidential system, federal parliamentary republic. Governing outlook: Semi-presidential republic. Main public priority: Preserve neutrality."
  },
  "AUS": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "IOA": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Indian Ocean Territories is a dependent territory administered by Australia, not a sovereign state."
  },
  "HMD": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Heard Island and McDonald Islands is a dependent territory administered by Australia, not a sovereign state."
  },
  "NFK": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Norfolk Island is a dependent territory administered by Australia, not a sovereign state."
  },
  "ATC": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Ashmore and Cartier Islands is a dependent territory administered by Australia, not a sovereign state."
  },
  "ARM": {
    "principle": "Parliamentary republic",
    "priority": "National security",
    "dossier": "Government: republic, parliamentary system. Governing outlook: Parliamentary republic. Main public priority: National security."
  },
  "ARG": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: federal republic. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "ATG": {
    "principle": "Constitutional monarchy",
    "priority": "Economic development",
    "dossier": "Government: constitutional monarchy. Governing outlook: Constitutional monarchy. Main public priority: Economic development."
  },
  "AGO": {
    "principle": "Presidential republic",
    "priority": "Economic development",
    "dossier": "Government: republic, presidential system. Governing outlook: Presidential republic. Main public priority: Economic development."
  },
  "AND": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary coprincipality. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  },
  "DZA": {
    "principle": "One-party state",
    "priority": "Economic development",
    "dossier": "Government: semi-presidential system, people's republic. Governing outlook: One-party state. Main public priority: Economic development."
  },
  "ALB": {
    "principle": "Parliamentary republic",
    "priority": "Collective defense",
    "dossier": "Government: parliamentary system. Governing outlook: Parliamentary republic. Main public priority: Collective defense."
  },
  "AFG": {
    "principle": "Republic",
    "priority": "Economic development",
    "dossier": "Government: Emirate, islamic theocracy. Governing outlook: Republic. Main public priority: Economic development."
  },
  "KAS": {
    "principle": "Disputed territory",
    "priority": "Border control",
    "dossier": "Siachen Glacier is a disputed high-altitude area between India and Pakistan, not a sovereign state."
  },
  "SXM": {
    "principle": "Dependent territory",
    "priority": "Local administration",
    "dossier": "Sint Maarten is a dependent territory administered by the Netherlands, not a sovereign state."
  },
  "TUV": {
    "principle": "Parliamentary republic",
    "priority": "Economic development",
    "dossier": "Government: parliamentary democracy. Governing outlook: Parliamentary republic. Main public priority: Economic development."
  }
};

export function countryProfile(id: string): CountryProfile {
  return profiles[id] || { principle: "Self-determination", priority: "Secure recognition", dossier: "A new polity without an established government record." };
}
