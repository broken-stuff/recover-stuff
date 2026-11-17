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

---
# v2 additions (beginner-friendly update)

Audience: someone who has never opened a terminal, never booted from USB, and doesn't know what "image", "partition" or "file system" mean. Every step must say WHAT to do, WHERE to click/type, and WHY, in plain words. Define any technical term the first time it appears on a card (short parenthetical), or link the matching how-to page.

REMOVED: counterfeit / fake-capacity content, tools f3 and h2testw. Do not mention them.

## Steps (in data/results/<device>.json) — extended
"steps": [{
  "title": "short action, plain words",
  "detail": "1-3 sentences: what this step does and why it matters",
  "how": ["2-7 concrete beginner sub-steps: exact clicks, menus, keys or commands. Name the OS when it differs (Windows: … / Mac: …)."],
  "learn": ["optional how-to ids from the list below"]
}]
"how" is required on every step (it can be 1 item for trivial steps like "stop using the drive").

## How-to pages: data/howto/<id>.json   → published at guide/how-to/<id>/
ids: live-usb, image-drive, use-testdisk, use-photorec, check-health, find-a-pro, glossary
{
  "id", "title" (<=60), "metaDescription" (<=155), "intro" (2-3 sentences),
  "timeNeeded": "e.g. 20-40 minutes", "youNeed": ["items"],
  "sections": [{ "heading", "body" (optional 1-3 sentences), "steps": ["optional ordered beginner steps"], "warning": "optional one sentence" }],
  "faq": [{ "q", "a" }]   // 0-4
}
glossary.json instead uses: { "id":"glossary","title","metaDescription","intro","terms":[{"term","def" (1-2 plain sentences)}] }
