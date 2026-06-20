# QA Review - Demo Readiness

Date: 2026-06-20

Scope reviewed: `docs/`, `prototype.html`, `src/`, `tests/`, and `data/` fixtures.

## Verification Performed

- `npm test` passed: `tests/energy-calculations.test.js`.
- Fixture consistency probe passed for the scripted 24 kWh path: 24 forecast hours, 6.0 kWh solar surplus, 43.9 kWh PV forecast total, 24.0 kWh scheduled energy, 3.24 EUR smart cost, and 4 source-quality records.
- Local server smoke test required elevated localhost permission after sandbox `EPERM`; then `GET /api/health`, `GET /api/demo-state`, `POST /api/recommendations/ev-charging`, `POST /api/products/lookup`, `POST /api/contracts/parse`, and `POST /api/assistant/ask` responded.

## Top Risks

### P1 - EV recalculation can produce trusted-looking impossible schedules

The default 24 kWh demo path is internally consistent, but the backend accepts arbitrary `required_energy_kwh` overrides from the prototype input. `calculateEvRecommendation()` prices the full requested low-price grid energy, while `buildLowPriceSchedule()` only schedules energy that fits into the low-price hours and wallbox max power. Any unscheduled remainder is not surfaced as `fallback_grid_energy_kwh`, and `deadline_met` remains hardcoded `true`.

Evidence:

- `src/lib/energy-calculations.js:218` computes all non-solar energy as `lowPriceGridEnergyKwh`.
- `src/lib/energy-calculations.js:220` prices that full amount at the low-price rate.
- `src/lib/energy-calculations.js:225` and `src/lib/energy-calculations.js:226` build schedules separately, without checking whether the schedule sum still equals `required_energy_kwh`.
- `src/lib/energy-calculations.js:233` to `src/lib/energy-calculations.js:239` hardcode the same positive decision and `deadline_met: true` for all override values.
- Runtime probe: `required_energy_kwh=80` returned `total_energy_kwh=80`, `low_price_grid_energy_kwh=74`, `cash_cost_eur=13.32`, and `deadline_met=true`, but the returned schedule only contained 39 kWh total energy. `required_energy_kwh=1` still returned the full 6 kWh solar schedule.

Demo impact: if someone changes the EV energy request during the demo, the UI can claim savings and deadline success for energy that is not actually scheduled.

Recommended before demo: either lock the demo input to 24 kWh, or add feasibility logic that caps solar/grid allocations to the request, reports unscheduled energy as fallback/shortfall, and sets `deadline_met=false` when the returned schedule cannot supply the request.

### P1 - Source-quality metadata becomes stale for overrides

For recalculated EV requests, `source_quality` still reports the fixture EV need of 24 kWh even when the API response is calculated for another requested amount.

Evidence:

- `src/lib/energy-calculations.js:57` to `src/lib/energy-calculations.js:62` always read `fixtures.deviceState.ev.required_energy_kwh`.
- `src/lib/energy-calculations.js:227` calls `makeCalculationMetadata(fixtures)` without override context.
- Runtime smoke test for `required_energy_kwh=80` returned `ev_request.required_energy_kwh=80`, while `source_quality` still reported `ev_need` value `24`.

Demo impact: the "Why trust this" view can contradict the visible recalculated number. This is a calculation-trust risk, not just a display issue.

Recommended before demo: include override values in calculation metadata, or label overrides as `user_supplied_request` with the requested kWh and confidence/source status.

### P1 - Backend schedule output diverges from canonical fixture and docs

The fixture and data contract describe the smart grid schedule as 18 kWh over `22:00-01:00` in three 6 kWh slots. The backend optimizer instead greedily fills the wallbox max power, so the default 24 kWh path can finish the low-price grid allocation by `00:00`.

Evidence:

- `docs/data-contract.md:113` says the low-price window offers 18.0 kWh in the planned schedule.
- `data/ev-charging-recommendation.json:73` to `data/ev-charging-recommendation.json:93` encode three 6 kWh grid slots ending at `01:00`.
- `src/lib/energy-calculations.js:187` to `src/lib/energy-calculations.js:202` allocate up to wallbox max power per hour.
- `src/lib/assistant.js:62` to `src/lib/assistant.js:75` derive the assistant's low-price window from the generated schedule; the runtime assistant response reported `22:00-00:00`, not `22:00-01:00`.

Demo impact: the presenter may show one timeline in docs/fixtures and another in API-backed UI/assistant output.

Recommended before demo: choose one canonical schedule shape and align fixture, backend, tests, and assistant copy. If the backend should optimize aggressively, update the fixture narrative; if the demo narrative should stay 6/6/6, cap the hourly EV schedule for the demo plan.

### P1 - Mixed timestamp formats make raw schedules hard to trust

Generated schedule entries keep `start` in local `+02:00` time but convert `end` to UTC `Z`. This is technically parseable, but it makes raw API records look like they end before they start unless the reader mentally normalizes timezones.

Evidence:

- `src/lib/energy-calculations.js:163` to `src/lib/energy-calculations.js:168` and `src/lib/energy-calculations.js:193` to `src/lib/energy-calculations.js:197` build `end` with `toISOString()`.
- Runtime smoke test returned entries like `start: 2026-06-20T22:00:00+02:00` and `end: 2026-06-20T21:00:00Z`.

Demo impact: if the API payload or backend console is shown, schedule times can appear confusing or wrong.

Recommended before demo: preserve the fixture timezone offset in generated `end` values, or return explicit `display_start`, `display_end`, and `timezone` fields.

### P1 - API fallback behavior is graceful but can mask failures

The prototype intentionally falls back to inline values when the API is unavailable, and the assistant falls back to local scripted answers. This is good for resilience, but risky for demo trust because the top decision remains confident even when the backend is not live.

Evidence:

- `prototype.html:5935` to `prototype.html:5985` keeps inline Berlin demo values when `/api/demo-state` fails.
- `prototype.html:5865` to `prototype.html:5903` falls back to local assistant answers on assistant API failure.
- `prototype.html:4910` to `prototype.html:4918`, `prototype.html:4985` to `prototype.html:4987`, and `prototype.html:5033` to `prototype.html:5035` show file-mode fallback messages for connector/product/contract flows.

Demo impact: a backend failure can look like a successful product demo unless the presenter notices the small fallback label.

Recommended before demo: make fallback state prominent near the primary recommendation, and disable/relabel recalculation and connector actions when the backend is unavailable.

### P1 - Accessibility state semantics are incomplete

The UI uses real buttons, labels, `aria-live`, and a reduced-motion media query, which is a solid base. The main gap is interactive state exposure: custom tab/segmented controls use visual `.active` classes without `role`, `aria-selected`, or `aria-controls`, and the companion drawer does not trap focus.

Evidence:

- `prototype.html:4132` to `prototype.html:4164` declares `role="tablist"` containers, but the generated buttons are plain buttons.
- `prototype.html:6141` to `prototype.html:6162` update only CSS classes for segmented controls.
- `prototype.html:5251` to `prototype.html:5270` generates device "tabs" with visual active state only.
- `prototype.html:3655` declares a dialog and `prototype.html:4564` to `prototype.html:4574` moves focus, but there is no focus trap, inert background, or opener-specific focus return.

Demo impact: keyboard and screen-reader users may not understand which period, timeline mode, or device is selected; focus can escape the open drawer.

Recommended before demo: add `role="tab"`/`aria-selected` or use `aria-pressed` for segmented controls, add selected state to device buttons, and trap focus while the drawer is open.

### P2 - Responsiveness is styled but not verified

The stylesheet includes multiple responsive breakpoints and mobile drawer sizing, but there are no automated screenshot, viewport, or overflow checks. The page is a dense single-file prototype with hidden advanced panels, a fixed drawer, horizontal timeline content, and many dynamically generated values.

Evidence:

- Responsive breakpoints exist at `prototype.html:2338`, `prototype.html:2377`, `prototype.html:2453`, `prototype.html:3391`, and `prototype.html:3407`.
- The drawer uses fixed positioning and viewport height limits at `prototype.html:3231` to `prototype.html:3248` and `prototype.html:3400` to `prototype.html:3403`.
- No UI test package or screenshot script exists in `package.json`; `npm test` only runs the Node assertion file.

Demo impact: mobile or narrow-window demos could reveal overflow, hidden controls, or clipped drawer content that the current tests cannot catch.

Recommended before demo: manually verify at 390px, 768px, and desktop widths, or add a small Playwright smoke that checks no horizontal body overflow and captures the primary board plus drawer.

### P2 - Test coverage is too narrow for the demo's trust claims

The current test file is useful, but it mostly locks the happy path. It does not exercise API request/response behavior, invalid JSON paths, server static serving, fallback UI, accessibility semantics, responsive layouts, or schedule feasibility under overrides.

Evidence:

- `package.json` runs only `node tests/energy-calculations.test.js`.
- `tests/energy-calculations.test.js:27` to `tests/energy-calculations.test.js:47` validate the default 24 kWh calculation and metadata.
- `tests/energy-calculations.test.js:61` to `tests/energy-calculations.test.js:68` only cover one invalid negative override and one 12 kWh override; they do not assert schedule sum, source-quality override values, fallback energy, or deadline feasibility.

Recommended additions:

- Schedule invariant tests: `sum(schedule.energy_kwh) === total_energy_kwh` or explicit shortfall/fallback is present.
- Override tests for small, default, large, and infeasible kWh requests.
- Metadata tests asserting `source_quality` reflects user-supplied overrides.
- API smoke tests for `/api/demo-state`, `/api/recommendations/ev-charging`, invalid JSON, and missing routes.
- UI checks for API unavailable state, keyboard navigation, selected-state ARIA, and drawer focus behavior.

### P2 - Docs need executable acceptance criteria

`docs/data-contract.md` documents strong principles: final contract prices beat public market prices, AI explains backend calculations, every money figure needs provenance, and forecasts must be labeled. The missing piece is an executable checklist that turns those principles into pass/fail demo gates.

Evidence:

- `docs/data-contract.md:19` to `docs/data-contract.md:24` define trust principles.
- `docs/data-contract.md:176` to `docs/data-contract.md:199` list API endpoints and metadata expectations.
- No current doc defines schedule feasibility, override metadata, fallback visibility, accessibility, or responsive acceptance gates.

Recommended before demo: add demo acceptance checks to the data contract or test plan after the calculation issues above are fixed.

## Demo Readiness Summary

The scripted 24 kWh EV charging story is demoable if the presenter keeps the flow on the default path and clearly states that data is synthetic, advice-only, and connector-ready rather than live-connected.

Do not treat the recalculation input as demo-safe yet. The highest-risk live interaction is changing the EV energy request, because the backend can show stale source-quality values, over-optimistic costs, and schedules that do not supply the requested energy.

Recommended demo guardrails:

- Start the local server with `npm start`; avoid file-mode if the demo claims API-backed calculations.
- Keep the EV request at 24 kWh unless schedule feasibility is fixed.
- Avoid showing raw API schedule timestamps until local/UTC formatting is aligned.
- Call out "synthetic demo data" and "advice only" when presenting trust and connector panels.
- Run `npm test` and smoke `GET /api/health` shortly before the demo.
