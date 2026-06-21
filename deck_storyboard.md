# Deck Storyboard

## Storyboard Contract

- Topic: Enpal Smart Energy Companion repo presentation slide
- Audience: hackathon judges / product + technical stakeholders
- Article path: `/Users/qihao/Documents/enpal-web/article.md`
- Research resource index: `/Users/qihao/Documents/enpal-web/research-resource-index.md`
- Claim evidence ledger: `/Users/qihao/Documents/enpal-web/claim_evidence_ledger.md`
- Deck goal: Create one approval-ready presentation slide that explains the repo's product value, concrete EV smart-charging proof point, and trust-first implementation boundary.
- Slide count target: 1 slide. If the user wants more pacing, this can expand into a 3-slide mini deck later, but the recommended current output is a single pitch slide.
- Aspect ratio: 16:9 horizontal widescreen
- Language: English
- User slide-plan approval status: Approved by user on 2026-06-21
- User feedback / requested changes: User approved with “approve” on 2026-06-21

## User Approval Question

Please review this storyboard and approve or revise it before slide-image generation starts. Key choices to confirm:

1. Keep this as a **single-slide pitch**?
2. Keep the assumed audience as **hackathon judges / product + technical stakeholders**?
3. Use a clean infographic remake by default, with the local UI (`prototype.html`) as optional reference only, rather than placing a raw screenshot on the slide?

## Slide Flow

| Slide ID | Narrative Role | Core Message | Must-Appear Text | Must-Use Evidence / Claim IDs | Input Resource Candidates (Text / File / Image IDs) | Visual Job | Transition From Previous | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| slide01 | opening + evidence + trust proof | The repo is not just an energy dashboard: it is a trust-first household energy decision companion that turns messy PV, battery, EV, tariff, and contract data into one calculated action the homeowner can verify. | **Title:** “Enpal Smart Energy Companion: one trusted action from messy home energy data”<br><br>**Hero proof:** “24 kWh EV need” · “Charge now: EUR 8.40” · “Smart plan: EUR 3.24” · “Save EUR 5.16 / 61.4%”<br><br>**Trust proof:** “AI explains. Backend calculates.” · “Source-quality + audit trail”<br><br>**Boundary note:** “Synthetic demo data · Advice-only control”<br><br>**Strapline:** “Every kWh gets routed to use, store, sell, or buy.” | C001, C002, C003, C004, C005, C006, C007, C009, C010; resource-index claims claim001-claim006 | Text/source grounding: res001, res002, res003, res004, res005, res008, res009, res010, res015, res017.<br><br>Optional visual reference only: res007 (`prototype.html`) if the final visual plan decides a UI-derived cue is useful. Any screenshot or source-image adaptation must go through the approved image workflow before becoming a slide image. | Show a clear decision journey: homeowner question → calculated EV charging comparison → trust receipt. The visual should make the money proof instantly legible while also showing the repo's credibility boundary: deterministic API/calculation layer, source-quality/audit metadata, and AI explanation on top. | N/A — single-slide storyboard. | Crowding risk because this is one slide. The visual plan must protect the exact numbers and disclaimer. Do not imply real customer telemetry, real tariff prices, production-ready control, live autopilot, or arbitrary EV recalculation safety. Avoid copying Octopus branding/assets/copy. |

## Deck Arc

- Opening hook: A homeowner asks, “Should I charge the EV now?” inside a complex home energy system.
- Core tension: PV, battery, EV, heat pump, grid, tariff windows, and contract terms create too much data for a simple decision.
- Main evidence sequence: The default demo fixture turns a 24 kWh EV need into a now-vs-smart comparison: EUR 8.40 now versus EUR 3.24 smart, saving EUR 5.16 / 61.4%.
- Turning point: The saving is not an AI guess; it is recomputed by deterministic backend modules and paired with source-quality/audit information.
- Practical implication: The repo can be pitched as a trustworthy decision companion: AI explains the recommendation, while backend logic calculates money, kWh, schedule, and savings.
- Closing takeaway: Every kWh gets routed to use, store, sell, or buy — transparently and with an advice-only safety boundary.

## Handoff To Visual Plan

- Style implications: Should feel like a premium, trust-first product/technical infographic, not a generic dashboard collage. Use clear hierarchy, high number legibility, and an audit/receipt metaphor. Avoid any Octopus-style brand, mascot, copy, font, or color imitation.
- Per-slide resource/input implications: Exact hero values must be grounded in res004/res008 and claim C004-C005. Trust wording must be grounded in res002/res003/res009 and C003/C006-C007. Risk/disclaimer wording must be grounded in res005/res010 and C009-C010.
- Slides requiring generated diagrams: slide01 needs a generated decision-flow / routing visual that communicates “question → calculation → trust receipt” and “use/store/sell/buy.”
- Slides requiring source-based image edits: None required by the storyboard. Optional: if visual planning uses a `prototype.html` screenshot or UI cue, it must be processed through `generate_image` or `edit_image` before it becomes a slide image.
- Slides with high text-fidelity risk: slide01, because currency values, percentage, and the strapline must remain exact.
- Slides needing split or simplification: If the user wants a less dense presentation, split into 3 slides: (1) problem and thesis, (2) EV savings proof, (3) trust architecture and guardrails. For the current requested “presentation slide,” keep one slide.
