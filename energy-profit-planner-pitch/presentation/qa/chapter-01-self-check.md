# Chapter 01 Self-Check — factory-waste

Garden checklist status: PASS.

- Step count: 6 visual steps.
- Narration source: `src/chapters/01-factory-waste/narrations.ts`.
- Narration count: 6, matching the highest chapter step threshold `step >= 5` plus one.
- Source fidelity: covers article §2 and script beats 1-6: factory rooftop, noon surplus, low-value grid export, later higher-price demand, problem reframe, kWh routing question.
- Visual density: background illustration + meter bars + export route + later load nodes + buyback route + final decision question.
- Motion/demonstration: meter fill, flow-line draw, staged load reveal, reframe overlay, full-screen decision transition.
- Token compliance: no hardcoded hex/rgb/hsl or named color matches in chapter files; font families use theme tokens.
- Assets: uses generated project-local image `/assets/factory-solar-surplus.png`.
- Visual QA: screenshots captured at `qa/step-01.png` through `qa/step-06.png`.
- Type/build checks: `npx tsc --noEmit` passed; `npm run build` passed.
- Audio prep: `npm run extract-narrations` generated `audio-segments.json`.

Notes:
- First chapter intentionally stops at the Garden hard checkpoint for user approval before implementing chapters 02-04.
- Remaining generated images are already stored in `public/assets` for later chapters.
