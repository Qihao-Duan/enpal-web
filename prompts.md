# Prompts

## Prompt Contract

- Topic: Enpal Smart Energy Companion repo presentation slide
- Deck storyboard: `/Users/qihao/Documents/enpal-web/deck_storyboard.md`
- Slides visual plan: `/Users/qihao/Documents/enpal-web/slides_visual_plan.md`
- Deck source index: `/Users/qihao/Documents/enpal-web/deck-source-index.md`
- Last updated: 2026-06-21
- Owner: infographic_powerpoint_designer
- Style pack: `neo-tech`
- Image tool: `generate_image`
- Generation config: omit for `generate_image`

## slide01-generate-image-prompt

```text
Use case: infographic-diagram / product pitch slide
Asset type: one full-slide image for a PowerPoint deck
Canvas hard constraint: 16:9 horizontal widescreen slide image; no square or vertical output.
Language: English only.

Create a polished single-slide product/technical infographic for a hackathon judge audience. It must present a trust-first household energy decision companion for the local Enpal Smart Energy Companion repo. The story is: a homeowner asks whether to charge the EV now; deterministic backend calculations compare charge-now vs smart plan; AI explains the result; source-quality and audit trail make the number trustworthy.

STYLE PACK — neo-tech:
- Deep blue-gray base with restrained cyan/teal/violet accents.
- Clean glassmorphism cards with thin glowing borders, subtle network nodes, low-density data-grid texture.
- Meeting-room readable, premium energy-tech/startup feel.
- Use emphasis color only for key metrics and decision path.
- No random multicolor neon, no noisy cyberpunk clutter.

LAYOUT:
- Top-left large title.
- Use a three-zone composition:
  1) Left thesis card: small homeowner question and product framing.
  2) Center hero comparison: the largest area, with two big cards connected by a smart-routing arrow: “Charge now” vs “Smart plan”, ending in a large savings badge.
  3) Right trust receipt: compact vertical stack showing backend calculation, source-quality + audit trail, AI explanation, and four routing nodes: use, store, sell, buy.
- Put the boundary note in a small readable footer strip.
- Keep generous margins and whitespace; all text must be sharp and large enough to read in a presentation.

MUST APPEAR TEXT — render exactly these text strings and do not add any other words:
1. Enpal Smart Energy Companion: one trusted action from messy home energy data
2. Should I charge the EV now?
3. 24 kWh EV need
4. Charge now: EUR 8.40
5. Smart plan: EUR 3.24
6. Save EUR 5.16 / 61.4%
7. AI explains. Backend calculates.
8. Source-quality + audit trail
9. use · store · sell · buy
10. Synthetic demo data · Advice-only control

VISUAL SCENE:
- Scene ID: ai-control-room-clean / data decision briefing.
- Far background: abstract clean AI operations room, blurred dashboards with no readable text, a soft home-energy network silhouette (solar roof, battery, EV charger, grid line) as icon-like shapes only.
- Midground: subtle flow lines from solar/grid/battery/EV icons into the center comparison cards.
- Foreground: large glass KPI cards and a trust receipt panel, with thin route arrows and node connectors.
- Use simple icons only, no logos: home, solar panel, battery, EV plug, calculator, checklist, shield, assistant/chat bubble.

TEXT FIDELITY AND NEGATIVE CONSTRAINTS:
- Render every required text string exactly, preserving capitalization, punctuation, spaces, “EUR”, “kWh”, and “61.4%”.
- Do not invent any extra words, labels, axis text, app UI text, brand names, watermarks, logos, QR codes, URLs, fake code, or random characters.
- No Enpal logo unless explicitly provided; no Octopus branding, mascot, fonts, color identity, copy, or assets.
- Do not imply real customer telemetry, real tariff, live device control, autopilot, or production readiness.
- Keep the slide image clean and readable; no tiny text, no blurred letters, no text over busy backgrounds.
```
