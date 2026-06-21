# Research Resource Index

## Index Contract

- Topic: Enpal Smart Energy Companion repo research for presentation slide
- Project folder: `/Users/qihao/Documents/enpal-web`
- Research mode: internet-backed + local repository inspection
- Article path: `/Users/qihao/Documents/enpal-web/article.md`
- Research notes path: `/Users/qihao/Documents/enpal-web/research_notes.md`
- Claim evidence ledger path: `/Users/qihao/Documents/enpal-web/claim_evidence_ledger.md`
- Last updated: 2026-06-21
- Owner: deep_researcher

## Source And Resource Index

| Resource ID | Type | Path / URL | Origin | Date / Version | What It Contains | Credibility / Limits | Deck Use Potential | Candidate Slide IDs | Prompt Grounding Use | Image Input Use | Evidence IDs | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| res001 | user file | `/Users/qihao/Documents/enpal-web/requirement.md` | user supplied / local repo | 2026-06-20 local mtime | Challenge brief, judging criteria, suggested scope, pain points about kWh, cost planning, and trust. | Primary source for challenge framing; partly user notes in Chinese. | Useful for problem and user pain. | slide01 | cite as evidence | no image input | C001, C002 | active | Establishes why the slide should focus on simple action + trust. |
| res002 | project coordination doc | `/Users/qihao/Documents/enpal-web/ENGINEERING_ALIGNMENT.md` | local repo | active development sprint, 2026-06-20 | Mission, product principles, team outputs, stack, accepted architecture/QA gates. | Primary repo source; may include sprint coordination state. | Useful for thesis and guardrails. | slide01 | cite as evidence | no image input | C001, C002, C003, C008 | active | Strongest source for “what should I do next / savings / trust” positioning. |
| res003 | plan | `/Users/qihao/Documents/enpal-web/docs/software-framework-plan.md` | local repo | baseline date 2026-06-20 | Sprint objective, current baseline, target architecture, services, data contracts, API routes, AI boundaries. | Primary source for research plan / implementation intent. | Useful for architecture lane. | slide01 | cite as evidence | no image input | C002, C003, C006 | active | Explicitly says deterministic backend calculates and AI explains. |
| res004 | data contract | `/Users/qihao/Documents/enpal-web/docs/data-contract.md` | local repo | current fixture contract v0.1.0 | Synthetic data contract, fixture meanings, EV demo invariants, route plan schema, trust principles. | Primary source for fixture meaning; all data is synthetic. | Useful for trust and metrics. | slide01 | cite as evidence | no image input | C004, C005, C007 | active | Contains the key invariant values for the EV demo. |
| res005 | QA review | `/Users/qihao/Documents/enpal-web/docs/qa-review.md` | local repo | 2026-06-20 | Demo readiness, verification performed, P1/P2 risks, guardrails. | Primary risk source; some line references may move as code changes. | Useful for caveat/presenter notes. | slide01 | cite as evidence | no image input | C009, C010 | active | Should not dominate slide; use as small footnote. |
| res006 | research/design doc | `/Users/qihao/Documents/enpal-web/enpal-smart-energy-companion-design.html` | local repo | 2026-06-20 local mtime | Product positioning, pain points, Decision Workbench, formulas, data source mapping, German constraints, backend architecture, AI principles, competitor reference. | Rich but partly Chinese and broad; local design artifact, not implementation proof by itself. | Useful for narrative background. | slide01 | background only | possible visual reference after designer review | C001, C008 | active | Do not copy Octopus brand/assets. |
| res007 | UI prototype | `/Users/qihao/Documents/enpal-web/prototype.html` | local repo | 2026-06-21 local mtime | Main static UI with Decision Workbench, trust, EV decision, retrieval, device translator, simulator, assistant modules. | Implementation source; visual use requires screenshot/design review. | Useful for UI visual or screenshot reference. | slide01 | cite as evidence | visual reference only | C001, C008 | active | If screenshot is used, designer must process through image tools per team rules. |
| res008 | fixture bundle | `/Users/qihao/Documents/enpal-web/data/*.json` | local repo | fixture schema v0.1.0 | Household, tariff, forecast, device state, EV recommendation, product catalog, routing plan. | Synthetic demo data only; not real customer/tariff/market data. | Useful for hero metrics. | slide01 | cite as evidence | no image input | C004, C005, C007 | active | Most important numeric evidence. |
| res009 | source code bundle | `/Users/qihao/Documents/enpal-web/src/` | local repo | app version 0.1.0 | Server, API handlers, calculations, routing, connectors, assistant, stores. | Primary implementation proof; no production auth/DB. | Useful for architecture proof. | slide01 | cite as evidence | no image input | C003, C006, C007 | active | Supports deterministic backend claim. |
| res010 | tests | `/Users/qihao/Documents/enpal-web/tests/`; `/Users/qihao/Documents/enpal-web/package.json` | local repo | test command run 2026-06-21 | Node assertion tests and scripts. | Happy-path-plus tests; QA says coverage gaps remain. | Useful as credibility note. | slide01 | cite as evidence | no image input | C009, C010 | active | `npm test` passed on 2026-06-21. |
| res011 | synthetic track dataset | `/Users/qihao/Documents/enpal-web/enpal-track-dataset/README.md` | local repo | 2025 synthetic dataset | 4 German households, year-long 15-min synthetic timeseries, contracts, tariffs, dynamic prices, bills, insight events. | Dataset is untracked and synthetic; not fully wired into current prototype. | Background for future expansion. | slide01 | background only | no image input | C002 | active | Mention only if slide needs expansion roadmap. |
| res012 | web page | `https://www.enpal.de/` | web research | retrieved 2026-06-21 | Enpal product ecosystem: solar, heat pump, wallbox, energy manager/tariff messaging, 5-in-1 package. | Official marketing source; not evidence of repo implementation. | Background category context. | slide01 | background only | visual reference only if permitted | C011 | active | Use sparingly; avoid unverified superlatives unless quoting source. |
| res013 | web page | `https://www.bundesnetzagentur.de/DE/Vportal/Energie/PreiseAbschlaege/Tarife-table.html` | web research | retrieved 2026-06-21; page includes 2025 price snapshot | German electricity price components, work price/base price framing, kWh unit. | Official context source; not this household’s tariff. | Supports need for transparent kWh and bill explanation. | slide01 | background only | no image input | C012 | active | Good context for why kWh and fixed fees confuse users. |
| res014 | web page | `https://octopus.energy/` | web research | retrieved 2026-06-21 | Smart tariffs, smart EV charging, solar/battery tariff propositions. | UK provider; repo says use Octopus only as IA/reference and do not copy brand/assets/copy. | Optional category reference. | slide01 | background only | no image input | C013 | active | Avoid direct brand visual reuse. |
| res015 | article | `/Users/qihao/Documents/enpal-web/article.md` | generated research artifact | 2026-06-21 | Canonical reasoning artifact for deck planning. | Synthesizes evidence; use source IDs for underlying claims. | Primary handoff artifact. | slide01 | read before prompt | no image input | C001-C013 | active | Created by deep_researcher. |
| res016 | notes | `/Users/qihao/Documents/enpal-web/research_notes.md` | generated research artifact | 2026-06-21 | Working notes, evidence extracts, local probes, risks, slide-relevant takeaways. | Internal support artifact. | Background for deck planner. | slide01 | background only | no image input | C001-C013 | active | Created by deep_researcher. |
| res017 | ledger | `/Users/qihao/Documents/enpal-web/claim_evidence_ledger.md` | generated research artifact | 2026-06-21 | Major claims mapped to evidence, confidence, risk, slide use. | Internal support artifact; concise claim controls. | Claim/evidence grounding for storyboard. | slide01 | cite as evidence | no image input | C001-C013 | active | Created by deep_researcher. |

## Deck-Relevant Claims

| Claim ID | Claim | Evidence Anchor | Suggested Slide Use | Confidence | Risk |
| --- | --- | --- | --- | --- | --- |
| claim001 | The repo should be presented as a trust-first decision companion that answers what to do next, what it saves, and why the number is trustworthy. | res001, res002, res006, res007, C001 | Main title/thesis | high | Positioning, not KPI. |
| claim002 | EV smart charging is the strongest implemented demo spine. | res002, res003, res008, C002 | Center story | high | Other use cases are less central. |
| claim003 | The demo’s hero metric is EUR 5.16 saved by smart charging versus charging now. | res004, res008, C004 | Hero metric | high | Default 24 kWh synthetic fixture only. |
| claim004 | The calculation is deterministic backend output, while AI is a grounded explanation layer. | res002, res003, res009, C003 | Trust/technical credibility | high | Current assistant is scripted; do not overclaim autonomous AI. |
| claim005 | The routing layer supports “use, store, sell, buy” as the deck’s visual metaphor. | res004, res009, C007 | Infographic middle/right panel | high | Routing data is synthetic and advice-only. |
| claim006 | The prototype is demoable with guardrails: tests pass, but arbitrary EV overrides/fallback/timestamps need hardening. | res005, res010, C009, C010 | Presenter caveat / small footnote | high | Do not overemphasize risks on a pitch slide. |
| claim007 | External context supports the product category: Enpal’s ecosystem and smart tariff market patterns make this a relevant problem. | res012, res013, res014, C011-C013 | Opening context if needed | medium | Web sources do not prove repo features. |

## Visual Or Data Opportunities

| Opportunity ID | Related Resource IDs | What Could Become A Slide Visual | Required Accuracy Constraint | Notes |
| --- | --- | --- | --- | --- |
| vis001 | res008, res009, res015 | Hero calculation card: EUR 8.40 now → EUR 3.24 smart → save EUR 5.16. | Must label as synthetic default 24 kWh demo fixture; preserve formula. | Strongest single-slide visual. |
| vis002 | res004, res009, res015 | Use/store/sell/buy routing board with kWh totals. | Use probe values only if designer wants broader workbench story; avoid implying production/live data. | Good visual metaphor. |
| vis003 | res002, res003, res009, res017 | Architecture strip: UI → API → deterministic engine → source quality/audit → assistant explanation. | Keep “AI explains; backend calculates.” | Supports technical credibility. |
| vis004 | res007 | UI screenshot/reference from `prototype.html`. | Must be inspected; any slide image must be generated/edited through approved image workflow. | Optional if user wants product screen evidence. |
| vis005 | res005, res010 | Demo readiness badge: tests pass + known guardrails. | Do not show as “production-ready”; say “demoable with guardrails.” | Better for presenter notes than hero. |

## Open Gaps

- Missing source or evidence: user has not specified exact target audience, slide count, or whether a UI screenshot is desired.
- Claims requiring user confirmation: whether final artifact should be a single slide, a mini deck, or a full presentation.
- Visual/data assets that would help deck production: user-approved brand/style direction; screenshot decision; whether to include Enpal logo/brand assets.
- Sensitive or restricted materials: all `data/` values are synthetic; do not present as real customer data. Avoid copying Octopus Energy brand/assets/copy.
