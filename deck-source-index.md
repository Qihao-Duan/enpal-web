# Deck Source Index

## Index Contract

- Topic: Enpal Smart Energy Companion repo presentation slide
- Project folder: `/Users/qihao/Documents/enpal-web`
- Research resource index: `/Users/qihao/Documents/enpal-web/research-resource-index.md`
- Deck storyboard: `/Users/qihao/Documents/enpal-web/deck_storyboard.md`
- Slides visual plan: `/Users/qihao/Documents/enpal-web/slides_visual_plan.md`
- Slide generation log: `/Users/qihao/Documents/enpal-web/slide-generation-log.md`
- Last updated: 2026-06-21
- Owner: infographic_powerpoint_designer

## Upstream And Visual Sources

| Asset ID | Type | Path / URL | Origin | What It Shows / Contains | Related Slides | Prompt Grounding Use | Image Input Use | Use Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| src001 | article / research file | `/Users/qihao/Documents/enpal-web/article.md` | research package | Canonical repo thesis, proof point, architecture, trust boundary, and slide recommendation. | slide01 | read before prompt | no image input | source | Primary narrative grounding. |
| src002 | research resource index | `/Users/qihao/Documents/enpal-web/research-resource-index.md` | research package | Resource IDs, claim summaries, visual opportunities, open gaps. | slide01 | read before prompt / cite as evidence | no image input | source | Maps slide claims to res IDs. |
| src003 | claim ledger | `/Users/qihao/Documents/enpal-web/claim_evidence_ledger.md` | research package | Claim IDs, evidence anchors, confidence, risks. | slide01 | read before prompt / cite as evidence | no image input | source | Controls claim wording and forbidden claims. |
| src004 | approved storyboard | `/Users/qihao/Documents/enpal-web/deck_storyboard.md` | user-approved deck plan | Single-slide story, must-appear text, evidence anchors, and risk notes. | slide01 | read before prompt | no image input | source | User approved on 2026-06-21. |
| src005 | visual plan | `/Users/qihao/Documents/enpal-web/slides_visual_plan.md` | infographic_powerpoint_designer | Style pack, layout, scene, and image strategy. | slide01 | prompt planning | no image input | source | Current production plan. |
| src006 | prompt stack | `/Users/qihao/Documents/enpal-web/prompts.md` | infographic_powerpoint_designer | Final `generate_image` prompt for candidate slide. | slide01 | prompt reference | no image input | source | Used for generation attempt 1. |
| src007 | local UI prototype | `/Users/qihao/Documents/enpal-web/prototype.html` | local repo / research package res007 | Decision Workbench UI headings and narrative proof. | slide01 | background only | visual reference only, not used as image input | source | Not used as direct image input to avoid screenshot clutter. |
| src008 | generated slide candidate | `/Users/qihao/Documents/enpal-web/slides/slide01_candidate_v2.png` | generate_image | First produced candidate full-slide infographic image. | slide01 | not applicable | not applicable | superseded | Visually strong but had text-fidelity defects; superseded by edited candidate v3. |
| src009 | edited slide candidate | `/Users/qihao/Documents/enpal-web/slides/slide01_candidate_v3.png` | edit_image | Self-checked and reviewer-passed full-slide infographic image. | slide01 | not applicable | not applicable | reviewed | Passed deck reviewer review; used for final PPTX assembly. |
| src010 | final slide image copy | `/Users/qihao/Documents/enpal-web/slides/slide01.png` | copied from reviewed edit_image output | Canonical final slide image copy of `slide01_candidate_v3.png`; no image modification. | slide01 | not applicable | not applicable | reviewed | Convenience final filename. |
| src011 | final deck | `/Users/qihao/Documents/enpal-web/deck_images_only.pptx` | artifact-tool PowerPoint assembly | Images-only PPTX containing reviewed slide image as a full-slide image. | slide01 | not applicable | not applicable | final | Assembled after reviewer PASS. |

## Slide Input Strategy

| Slide ID | Required Resource IDs | Prompt-Grounding Resources To Read | Image Input Mode | Input Image Paths | Prompt / Edit Strategy | No-Image-Input Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| slide01 | res001, res002, res003, res004, res005, res008, res009, res010, res015, res017; C001-C007, C009-C010 | `article.md`; `research-resource-index.md`; `claim_evidence_ledger.md`; `deck_storyboard.md`; `slides_visual_plan.md` | generate_image prompt only | None | Generate a clean neo-tech infographic with exact required text, large EV comparison cards, trust receipt, and route/use/store/sell/buy motif. | A raw UI screenshot is not necessary for the approved story and would increase density. The slide is a synthesis of repo evidence rather than a product screenshot. |

## Generated / Edited Slide Images

| Slide ID | Output Path | Tool | Prompt-Grounding Resource IDs | Image Input Asset IDs | Prompt Ref | Input Strategy Ref | Self-Check Decision | Review Status | Final Deck Use | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| slide01 | `/Users/qihao/Documents/enpal-web/slides/slide01_candidate_v2.png` | generate_image | res001, res002, res003, res004, res005, res008, res009, res010, res015, res017 | none | `prompts.md#slide01-generate-image-prompt` | `deck-source-index.md#slide-input-strategy` | needs edit | not reviewed | superseded | Extra “smart-routing” label and routing phrase issue; superseded by v3. |
| slide01 | `/Users/qihao/Documents/enpal-web/slides/slide01_candidate_v3.png` | edit_image | res001, res002, res003, res004, res005, res008, res009, res010, res015, res017 | src008 | `slide-generation-log.md#slide-slide01-2` | `deck-source-index.md#slide-input-strategy` | candidate passed self-check | passed internal review | reviewed final | Reviewer PASS; used in final deck assembly. |

## Missing Or Requested Assets

| Need ID | Related Slides | Needed Source | Why Needed | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| need001 | slide01 | User-approved brand logo or screenshot, if desired later. | Optional only; not needed for the approved clean infographic version. | no longer needed for candidate v1 | If user later requests a branded or UI-grounded version, route through image-tool edit/generate workflow. |
