# Data contract (all agents must follow)

## IDs
devices: hdd, ssd, usb, sd, external
symptoms: deleted, formatted, not-detected, clicking, no-power, liquid-fire, corrupted, encrypted
"clicking" applies ONLY to hdd and external. All other device×symptom pairs apply.

tool ids: testdisk, photorec, ddrescue, ddrescueview, hddsuperclone, smartmontools, crystaldiskinfo, f3, h2testw
resource ids: ncfi, fbi-rcfl, brett-shavers, dfir-training, nist-cftt, sleuthkit-autopsy, hddguru-forum, cgsecurity-forum

## data/catalog.json
{
  "devices":  [{ "id","name","icon"(single emoji),"blurb"(<=90 chars) }],
  "symptoms": [{ "id","name","icon","blurb"(<=90 chars),"devices":[device ids] }],
  "tools":    { "<id>": { "name","url","docsUrl","desc"(<=140 chars),"os":["Windows","macOS","Linux"],"cost":"Free"|"Free (open source)"|"Paid" } },
  "resources":{ "<id>": { "name","url","desc"(<=140 chars),"type":"Training"|"Reference"|"Community"|"Expert"|"Lab" } }
}

## data/results/<device>.json  — object keyed by symptom id
{
  "<symptom>": {
    "title": "plain-language H1, <=60 chars",
    "metaDescription": "<=155 chars, for SEO",
    "summary": "2-3 sentences, plain language, what is likely going on",
    "risk": 1-5,                 // 1 = safe DIY, 5 = DIY likely makes it worse
    "riskNote": "one sentence why",
    "successOdds": "High"|"Medium"|"Low"|"Varies",
    "stopFirst": ["immediate do-NOT actions, 2-4 items"],
    "steps": [{ "title": "short", "detail": "1-3 sentences, plain language" }],   // 4-8 steps, imaging before recovery where relevant
    "tools": ["tool ids from list only"],
    "resources": ["resource ids from list only"],
    "callPro": "one sentence: when to stop and go to a professional",
    "faq": [{ "q": "...", "a": "1-2 sentences" }]   // 2-3 items, for schema.org FAQ
  }
}
Tone: 8th-grade reading level, no jargon without a quick explanation, factual, no hype.
