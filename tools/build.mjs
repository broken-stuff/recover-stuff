#!/usr/bin/env node
// Recover Stuff static build. Node 22, no dependencies.
// Usage: node tools/build.mjs [--data=<dir>] [--out=<dir>]
//   --data  folder holding catalog.json and results/*.json (default: ./data)
//   --out   where guide/, sitemap.xml, robots.txt, data/guide.json go (default: repo root)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3);
const DATA = resolve(arg('data') || process.env.RS_DATA || join(ROOT, 'data'));
const OUT = resolve(arg('out') || process.env.RS_OUT || ROOT);
const SITE = 'https://broken-stuff.github.io/recover-stuff/';
const SITE_NAME = 'Recover Stuff';

const errors = [];
const err = (m) => errors.push(m);
const readJSON = (p) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch (e) { err(`Cannot read/parse ${p}: ${e.message}`); return null; }
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;

// ---------- load ----------
const catalog = readJSON(join(DATA, 'catalog.json'));
if (!catalog) { console.error(errors.join('\n')); process.exit(1); }
const resultsDir = join(DATA, 'results');
const results = {};
if (!existsSync(resultsDir)) err(`Missing folder ${resultsDir}`);
else for (const f of readdirSync(resultsDir).filter((f) => f.endsWith('.json')).sort()) {
  const j = readJSON(join(resultsDir, f));
  if (j) results[f.replace(/\.json$/, '')] = j;
}

// ---------- validate ----------
const devIds = new Set((catalog.devices || []).map((d) => d.id));
const symMap = Object.fromEntries((catalog.symptoms || []).map((s) => [s.id, s]));
const tools = catalog.tools || {};
const resources = catalog.resources || {};
for (const d of catalog.devices || []) for (const k of ['id', 'name', 'icon', 'blurb']) if (!isStr(d[k])) err(`catalog device ${d.id}: missing ${k}`);
for (const s of catalog.symptoms || []) {
  for (const k of ['id', 'name', 'icon', 'blurb']) if (!isStr(s[k])) err(`catalog symptom ${s.id}: missing ${k}`);
  if (!Array.isArray(s.devices) || !s.devices.length) err(`catalog symptom ${s.id}: missing devices`);
  else for (const d of s.devices) if (!devIds.has(d)) err(`catalog symptom ${s.id}: unknown device ${d}`);
}
for (const [id, t] of Object.entries(tools)) {
  for (const k of ['name', 'url', 'docsUrl', 'desc', 'cost']) if (!isStr(t[k])) err(`catalog tool ${id}: missing ${k}`);
  if (!Array.isArray(t.os) || !t.os.length) err(`catalog tool ${id}: missing os`);
}
for (const [id, r] of Object.entries(resources)) for (const k of ['name', 'url', 'desc', 'type']) if (!isStr(r[k])) err(`catalog resource ${id}: missing ${k}`);

const ODDS = ['High', 'Medium', 'Low', 'Varies'];
for (const [dev, syms] of Object.entries(results)) {
  if (!devIds.has(dev)) { err(`results/${dev}.json: unknown device`); continue; }
  for (const [sym, r] of Object.entries(syms)) {
    const w = `${dev}/${sym}`;
    if (!symMap[sym]) { err(`${w}: unknown symptom`); continue; }
    if (!symMap[sym].devices.includes(dev)) err(`${w}: symptom does not apply to device`);
    for (const k of ['title', 'metaDescription', 'summary', 'riskNote', 'callPro']) if (!isStr(r[k])) err(`${w}: missing ${k}`);
    if (!Number.isInteger(r.risk) || r.risk < 1 || r.risk > 5) err(`${w}: risk must be 1-5`);
    if (!ODDS.includes(r.successOdds)) err(`${w}: bad successOdds`);
    if (!Array.isArray(r.stopFirst) || !r.stopFirst.length || !r.stopFirst.every(isStr)) err(`${w}: stopFirst invalid`);
    if (!Array.isArray(r.steps) || !r.steps.length || !r.steps.every((s) => s && isStr(s.title) && isStr(s.detail))) err(`${w}: steps invalid`);
    if (!Array.isArray(r.faq) || !r.faq.length || !r.faq.every((f) => f && isStr(f.q) && isStr(f.a))) err(`${w}: faq invalid`);
    if (!Array.isArray(r.tools)) err(`${w}: tools must be array`);
    else for (const t of r.tools) if (!tools[t]) err(`${w}: unknown tool id "${t}"`);
    if (!Array.isArray(r.resources)) err(`${w}: resources must be array`);
    else for (const t of r.resources) if (!resources[t]) err(`${w}: unknown resource id "${t}"`);
  }
}
if (!Object.keys(results).length) err('No result files found');
if (errors.length) {
  console.error(`Build failed with ${errors.length} problem(s):\n - ` + errors.join('\n - '));
  process.exit(1);
}

// ---------- merged guide.json ----------
const devices = catalog.devices.filter((d) => results[d.id] && Object.keys(results[d.id]).length);
const guide = { site: SITE, devices, symptoms: catalog.symptoms, tools, resources, results };
const write = (rel, content) => {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
};
write('data/guide.json', JSON.stringify(guide));

// ---------- HTML helpers ----------
const RISK = {
  1: 'Safe to DIY', 2: 'Low risk', 3: 'Take care', 4: 'High risk', 5: 'Pro territory',
};
const DISCLAIMER = 'Educational DIY guide, no warranty. DIY recovery can cause permanent data loss. If the data is valuable, consider a professional first.';
const dev = (id) => catalog.devices.find((d) => d.id === id);

function layout({ title, desc, path, rel, body, ld = [], step = 0, extraHead = '' }) {
  const canonical = SITE + path;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#4b3a8c">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<link rel="icon" href="${rel}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;800;900&family=Press+Start+2P&display=swap">
<link rel="stylesheet" href="${rel}assets/css/style.css">
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('\n')}
${extraHead}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap top-inner">
    <a class="brand" href="${rel}"><span aria-hidden="true">🛟</span> Recover Stuff</a>
    ${stepper(step, rel)}
  </div>
</header>
<main id="main" class="wrap" tabindex="-1">
${body}
</main>
<footer class="foot">
  <div class="wrap"><p class="disclaimer"><strong>Heads up:</strong> ${esc(DISCLAIMER)}</p>
  <p class="small">Recover Stuff is an independent project. Tool and resource links go to their own sites.</p>
  <p class="small credit">© 2026 Orchestrated by <a href="https://www.linkedin.com/in/timothygiberson" rel="noopener" target="_blank">Giberson</a></p></div>
</footer>
<script src="${rel}assets/js/app.js" defer></script>
</body>
</html>
`;
}

function stepper(active, rel, links = {}) {
  const names = ['Pick your device', 'What happened?', 'Your mission'];
  return `<ol class="stepper" aria-label="Progress">${names.map((n, i) => {
    const num = i + 1;
    const cls = num === active ? 'is-current' : num < active ? 'is-done' : '';
    const inner = `<span class="dot" aria-hidden="true">${num}</span><span class="lbl">${n}</span>`;
    const href = links[num];
    return `<li class="${cls}"${num === active ? ' aria-current="step"' : ''}>${href ? `<a href="${href}">${inner}</a>` : inner}</li>`;
  }).join('')}</ol>`;
}

function riskMeter(n) {
  const segs = [1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? `on r${i}` : ''}"></i>`).join('');
  return `<div class="risk r${n}" role="img" aria-label="Risk level ${n} of 5: ${RISK[n]}"><div class="meter" aria-hidden="true">${segs}</div><span class="chip">${n}/5 · ${RISK[n]}</span></div>`;
}

function toolCard(id) {
  const t = tools[id];
  return `<article class="card tool"><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p>
<ul class="meta"><li>${esc(t.os.join(' · '))}</li><li>${esc(t.cost)}</li></ul>
<p class="links"><a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">Website</a><a href="${esc(t.docsUrl)}" target="_blank" rel="noopener noreferrer">Docs</a></p></article>`;
}
function resCard(id) {
  const r = resources[id];
  return `<article class="card res"><span class="tag">${esc(r.type)}</span><h3><a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a></h3><p>${esc(r.desc)}</p></article>`;
}

function resultBody(d, s, r, rel) {
  const dv = dev(d), sy = symMap[s];
  const key = `${d}/${s}`;
  return `<article class="mission" data-key="${key}">
<nav class="crumbs" aria-label="Breadcrumb"><a href="${rel}">Home</a> <span aria-hidden="true">›</span> <a href="${rel}guide/${d}/">${esc(dv.name)}</a> <span aria-hidden="true">›</span> <span>${esc(sy.name)}</span></nav>
<p class="eyebrow">${dv.icon} ${esc(dv.name)} · ${sy.icon} ${esc(sy.name)}</p>
<h1 tabindex="-1">${esc(r.title)}</h1>
<p class="lead">${esc(r.summary)}</p>
<div class="badges">${riskMeter(r.risk)}<span class="odds o-${r.successOdds.toLowerCase()}">Success odds: <strong>${esc(r.successOdds)}</strong></span></div>
<p class="risknote">${esc(r.riskNote)}</p>
<section class="stop" aria-labelledby="stop-h"><h2 id="stop-h"><span aria-hidden="true">✋</span> Stop! Don't do this first</h2><ul>${r.stopFirst.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
<section aria-labelledby="steps-h"><h2 id="steps-h">Your steps</h2>
<div class="progress"><div class="bar" role="progressbar" aria-label="Steps completed" aria-valuemin="0" aria-valuemax="${r.steps.length}" aria-valuenow="0"><span style="width:0%"></span></div><span class="count" aria-live="polite">0 of ${r.steps.length} done</span></div>
<ol class="steps">${r.steps.map((st, i) => `<li><label><input type="checkbox" data-i="${i}"><span class="box" aria-hidden="true"></span><span class="txt"><strong>${esc(st.title)}</strong><span>${esc(st.detail)}</span></span></label></li>`).join('')}</ol>
<div class="win" hidden role="status"><strong>Mission complete! 🎉</strong> Check your recovered files open properly, then back them up in two places.</div>
</section>
${r.tools.length ? `<section aria-labelledby="tools-h"><h2 id="tools-h">Tools you'll use</h2><div class="grid">${r.tools.map(toolCard).join('')}</div></section>` : ''}
${r.resources.length ? `<section aria-labelledby="res-h"><h2 id="res-h">Learn from the experts</h2><div class="grid">${r.resources.map(resCard).join('')}</div></section>` : ''}
<section class="pro" aria-labelledby="pro-h"><h2 id="pro-h"><span aria-hidden="true">🧑‍🔧</span> When to call a pro</h2><p>${esc(r.callPro)}</p></section>
<section aria-labelledby="faq-h"><h2 id="faq-h">Questions people ask</h2><div class="faq">${r.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div></section>
<p class="disclaimer inline"><strong>Before you start:</strong> ${esc(DISCLAIMER)}</p>
<p class="actions"><a class="btn" href="${rel}guide/${d}/">← Other problems with this device</a> <a class="btn ghost" href="${rel}?d=${d}&amp;s=${s}">Open in the interactive guide</a> <a class="btn ghost" href="${rel}">Start over</a></p>
</article>`;
}

// ---------- pages ----------
const urls = [{ loc: SITE, pri: '1.0' }];
const crumbLD = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })),
});

rmSync(join(OUT, 'guide'), { recursive: true, force: true });
let pageCount = 0;
for (const dv of devices) {
  const syms = Object.keys(results[dv.id]).sort((a, b) => catalog.symptoms.findIndex((x) => x.id === a) - catalog.symptoms.findIndex((x) => x.id === b));
  // hub
  {
    const path = `guide/${dv.id}/`;
    const title = `${dv.name} data recovery: what went wrong? | ${SITE_NAME}`;
    const desc = `Pick what happened to your ${dv.name.toLowerCase()} and get a step-by-step DIY recovery plan with a risk rating, free tools and expert resources.`;
    const body = `<nav class="crumbs" aria-label="Breadcrumb"><a href="../../">Home</a> <span aria-hidden="true">›</span> <span>${esc(dv.name)}</span></nav>
<p class="eyebrow">${dv.icon} ${esc(dv.name)}</p>
<h1 tabindex="-1">${esc(dv.name)} data recovery: what happened?</h1>
<p class="lead">${esc(dv.blurb)} Choose the problem that sounds most like yours.</p>
<div class="cards">${syms.map((s) => `<a class="pick" href="${s}/"><span class="ico" aria-hidden="true">${symMap[s].icon}</span><span class="t">${esc(symMap[s].name)}</span><span class="b">${esc(symMap[s].blurb)}</span>${riskMeter(results[dv.id][s].risk)}</a>`).join('')}</div>
<p class="actions"><a class="btn ghost" href="../../?d=${dv.id}">Open in the interactive guide</a> <a class="btn ghost" href="../../">Pick a different device</a></p>
<p class="disclaimer inline">${esc(DISCLAIMER)}</p>`;
    write(path + 'index.html', layout({
      title, desc, path, rel: '../../', body, step: 2,
      ld: [crumbLD([['Home', SITE], [dv.name, SITE + path]])],
    }).replace('<meta property="og:type" content="article">', '<meta property="og:type" content="website">'));
    urls.push({ loc: SITE + path, pri: '0.8' });
    pageCount++;
  }
  for (const s of syms) {
    const r = results[dv.id][s];
    const path = `guide/${dv.id}/${s}/`;
    const url = SITE + path;
    const ld = [
      crumbLD([['Home', SITE], [dv.name, `${SITE}guide/${dv.id}/`], [symMap[s].name, url]]),
      {
        '@context': 'https://schema.org', '@type': 'HowTo', name: r.title, description: r.summary, url,
        tool: r.tools.map((t) => ({ '@type': 'HowToTool', name: tools[t].name })),
        step: r.steps.map((st, i) => ({ '@type': 'HowToStep', position: i + 1, name: st.title, text: st.detail, url: `${url}#steps-h` })),
      },
      {
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: r.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ];
    write(path + 'index.html', layout({
      title: `${r.title} | ${SITE_NAME}`, desc: r.metaDescription, path, rel: '../../../',
      body: resultBody(dv.id, s, r, '../../../'), step: 3, ld,
    }));
    urls.push({ loc: url, pri: '0.7' });
    pageCount++;
  }
}

// ---------- sitemap / robots ----------
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.pri}</priority></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`);

console.log(`Built ${pageCount} pages (${urls.length} URLs) from ${DATA} -> ${OUT}`);
