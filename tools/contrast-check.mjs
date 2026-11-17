#!/usr/bin/env node
// WCAG 2.1 AA contrast check for every token pair in assets/css/style.css (light and dark).
// Usage: node tools/contrast-check.mjs   (exit 1 on any failure)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'assets/css/style.css'), 'utf8');
const vars = (block) => Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));
const lightBlock = css.match(/^:root \{([^}]*)\}/m)[1];
const darkBlock = css.match(/prefers-color-scheme: dark\) \{\s*:root \{([^}]*)\}/)[1];
const light = vars(lightBlock);
const dark = { ...light, ...vars(darkBlock) };

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [foreground token, background token, min ratio, where used]
const T = 4.5, N = 3;
const pairs = [
  // body text on page + checker + surfaces
  ['ink', 'bg', T, 'body text'], ['ink', 'bg2', T, 'body text on checker'], ['ink', 'surface', T, 'card text'],
  ['muted', 'bg', T, '.lead/.small'], ['muted', 'bg2', T, 'muted on checker'], ['muted', 'surface', T, 'card/foot muted'],
  ['link', 'bg', T, 'links'], ['link', 'bg2', T, 'links on checker'], ['link', 'surface', T, 'links on cards'],
  ['ink', 'brand-soft', T, 'tags, inline disclaimer'], ['link', 'brand-soft', T, 'links in tags'],
  ['bg', 'ink', T, 'skip link'],
  // header + buttons
  ['brand-ink', 'brand', T, 'header, brand'], ['btn-ink', 'btn-bg', T, '.btn'], ['ink', 'surface', T, '.btn.ghost'],
  ['dot-ink', 'dot-bg', T, 'stepper dot'], ['dot-ink', 'dot-cur', T, 'stepper current'], ['dot-ink', 'dot-done', T, 'stepper done'],
  // panels
  ['stop-ink', 'stop-bg', T, 'stop panel / warn'], ['pro-ink', 'pro-bg', T, 'pro panel / rule'], ['pro-link', 'pro-bg', T, 'link in pro panel'],
  ['win-ink', 'win-bg', T, 'win panel + checked step'], ['chip-ink', 'yellow', T, 'odds, chip hover, :target'],
  // risk chips (dark ink on vivid fill)
  ...[1, 2, 3, 4, 5].map((i) => ['chip-ink', 'r' + i, T, `risk chip ${i}`]),
  // large/bold pixel-font headings use ink on bg/surface/panels (already covered at 4.5)
  // non-text UI
  ['edge', 'bg', N, 'checkbox/box + card border vs page'], ['edge', 'surface', N, 'borders vs surface'], ['edge', 'bg2', N, 'borders vs checker'],
  ['focus', 'bg', N, 'focus ring on page'], ['focus', 'bg2', N, 'focus ring on checker'], ['focus', 'surface', N, 'focus ring on cards'],
  ['focus-bright', 'win-bg', N, 'focus ring on checked step'], ['focus-bright', 'pro-bg', N, 'focus ring on pro panel'],
  ['focus-top', 'brand', N, 'focus ring in header'],
  ['dot-edge', 'brand', N, 'stepper dot border vs header'],
  ['dot-cur', 'brand', N, 'stepper current vs header'], ['dot-done', 'brand', N, 'stepper done vs header'],
  ['yellow', 'brand', N, 'header underline'],
  // meter: segments carry meaning (filled vs unfilled)
  ...[1, 2, 3, 4, 5].flatMap((i) => [['r' + i, 'meter-off', N, `meter ${i} vs unlit segment`], ['r' + i, 'meter-edge', N, `meter ${i} vs segment border`]]),
  ['meter-off', 'meter-edge', 1, 'unlit segment (same as border)'],
];
// meter edge/segment must be distinguishable from the surface it sits on
const modeExtra = {
  light: [['meter-edge', 'surface', N, 'meter border vs card'], ['meter-edge', 'bg', N, 'meter border vs page']],
  dark: [...[1, 2, 3, 4, 5].map((i) => ['r' + i, 'surface', N, `meter ${i} vs card`]), ...[1, 2, 3, 4, 5].map((i) => ['r' + i, 'bg', N, `meter ${i} vs page`]), ['stop-line', 'bg', N, 'stop border vs page'], ['pro-line', 'bg', N, 'pro border vs page']],
};

let fail = 0;
for (const [mode, tok] of [['light', light], ['dark', dark]]) {
  console.log(`\n== ${mode} ==`);
  for (const [f, b, min, use] of [...pairs, ...modeExtra[mode]]) {
    if (!tok[f] || !tok[b]) { console.log(`MISSING token ${f}/${b}`); fail++; continue; }
    const r = ratio(tok[f], tok[b]);
    const ok = r >= min;
    if (!ok) fail++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)} (min ${min})  ${f} ${tok[f]} on ${b} ${tok[b]}  [${use}]`);
  }
}
console.log(fail ? `\n${fail} pair(s) FAILED` : '\nAll pairs pass WCAG 2.1 AA');
process.exit(fail ? 1 : 0);
