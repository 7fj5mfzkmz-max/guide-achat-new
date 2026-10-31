# Smartphone page redesign: audit and plan (Phase 1)

Status: **Phase 1 approved with adjustments (revision 2, see §9). Revision 3 adds §10, a proposed unified relevance score. It awaits approval, and Phase 2 does not start until it is approved.** Branch: `feat/smartphone-redesign`, an explicit, user-approved exception to the "work on `main`, no new branches" rule in `CLAUDE.md`. Nothing is pushed, merged or deployed without the user's approval. Scope: `smartphones.html` and its own assets. No other category, no translations, no scoring or data changes.

## 0. What exists today (facts)

| Area | Finding |
|---|---|
| Page | `smartphones.html`, 494 lines, **19 stylesheets and 50 scripts**. These include `projecteurs.css` (the page uses its `pj-*` classes) and `category-kit/pc-portables.js`. |
| Size | Measured with Playwright: **14,118 px tall at 390 px wide (≈17 screens)** and 10,630 px on desktop. The first recommendation (podium) starts **≈1,500 px down** on mobile. 18–20 tap targets are under 32 px tall. |
| Sections | Classement → Mesures → Usages → Comprendre (8 cards) → Sur mesure (3 tabs: profil / critères / modèle) → Preuves → FAQ → Sources. This is the Projector page's skeleton almost one for one (podium, measure bars, usage tabs, "huit notions"). |
| Scoring engine A | `assets/js/smartphones-notes.js` (pure, tested): bench notes 0–9 from **rank within each test**, plus coverage, provisional status, critical criteria and price caps. Profiles: etudiant, pro, gamer, budget, polyvalent. Data: `data/smartphones-tests.json` → `banc.modeles` (26 models, 21 with measurements, 11 with a price). |
| Scoring engine B | `assets/js/smartphones-trouver.js` `build(need)`: "Mon profil" chips. It mixes "vu en test" (tester's order, no score) with catalogue sheets ranked by `scores`/`profil_scores`, in price tiers. |
| Scoring engine C | `assets/js/smartphones-scoring.js` (585 lines) + `smartphone-quiz.js`: "Mes critères", 6 criteria families matched against `compatibilite` (closeness, ▲/▼ deltas). |
| Catalogue | `data/smartphones.json`: 106 products, **74 eligible** (`ready_for_recommendation`, no `exclu_reco`, specs verified). Coverage across the 74: price 74, update years 70, sensor format 70, but **`points_faibles` only 18**. |
| **Dataset overlap (measured)** | Of the 26 bench models, 16 link to a catalogue sheet and only **7 link to an *eligible* sheet**. Of the 74 eligible sheets, only **16 carry editorial `scores`** (performance, autonomie, photo, prix, gaming, taille) and 15 carry `profil_scores`. The other 58 have raw specs (`compatibilite`) only. So the three engines do not rank the same phones, which is the root of weakness 2. |
| Analyzer | `phone-analyzer/*` (shared with `analyseur.html`), mounted in `#analyse-modele` inside the third tab. Results link back to `smartphones.html#choisir-profil`. |
| Visual demos | Animated sensor "photon rain" SVG (inline, about 110 animated rects); static scale bars for nits and mAh; chip-name decoder; mock Amazon product-sheet walkthrough (`amazon-guide.js`). |
| Tests touching the page | `smartphones:notes-test`, `smartphones:tests-test`, `smartphones:trouver-test`, `smartphones:quiz-test`, `student:test`, `ui-flow-test.js`, `page-dependencies-test.js`. |
| Inbound anchors | `#tests-2026` (17 links), `#audit` (8), `#choisir-profil` (5), `#analyse-modele`, `#analyser-modele`, `#purchase-audit`, `#nos-choix`, `#catalogue-…`. |

## 1. Five most important weaknesses

1. **The advice arrives too late and as a leaderboard.** On mobile the visitor scrolls about 1,500 px before seeing a phone. What they find is then a "polyvalence" podium of bench ranks, not an answer to their own priority.
2. **Three engines produce three lists that disagree.** "Usages" tabs (engine A, 26 bench models), "Mon profil" chips (engine B, a test/catalogue mix) and "Mes critères" (engine C, 74 sheets) use different profile sets and different populations. The visitor can't tell which list is "the" recommendation.
3. **Cards don't explain trade-offs.** Cards show a score and "points d'appui". None says *when another phone would be better*. Limitations are rare because only 18 of 74 sheets have `points_faibles`.
4. **A borrowed identity and a heavy page.** The page uses Projector components and stylesheet (`pj-*`), takes 17 mobile screens, loads 19 CSS and 50 JS files, and nests tabs inside a section. The visual density is close to what made the Laptops page fail.
5. **The analyzer is buried.** It sits in the third tab of section 05. There is no persistent entry point, and its result does not connect to the recommendations shown at the top.

Smaller issues: `role="table"` misused on bullet lists; two `aria-pressed` button groups acting as tabs while a real `tablist` sits nearby; tap targets under 32 px; decorative animation with no reduced-data fallback beyond `fx-lite`.

## 2. Design concept: "Le Conseiller : priorités d'abord"

**The page behaves like a buying advisor's desk, not a test bench.** The visitor states what matters most (and optionally what comes next). The page answers in sentences, with three explicit choices and their trade-offs. Proof stays one tap away, never in the way.

Signature elements:
- **Priority pair.** One primary priority and an optional secondary one ("Autonomie d'abord, puis photo"). Asking for two priorities is what makes a trade-off explicit: "To get the best battery within budget, you give up telephoto zoom."
- **Advice cards built from a verdict.** Each card follows the same order: verdict sentence → *Pourquoi* (2 measured or verified facts) → *Limite* (1 honest weakness) → *Prenez plutôt… si…* (a named alternative). Scores are secondary.
- **Coverage fingerprint.** A small 6-segment strip per phone: solid = measured in a test, outlined = from the verified sheet, hatched = unknown. This turns the existing rule ("an unknown is not a defect, it reduces coverage") into something you can see. No other category has it.
- **Visual language.** Calm and editorial. Sentence-case headings, neutral paper and graphite surfaces, one advisor accent (deep teal) and a muted amber reserved for limitations. Monospace only for measured values. The shared header keeps the brand. Everything is scoped under a new body class, and dark mode uses tokens.

Rationale: it answers the "too close to Projectors" verdict structurally (no podium, no leaderboard at the top). It keeps density low, the main lesson from Laptops. And it is the honest way to present thin data: it says what is known, what isn't, and what to buy instead.

## 3. Proposed page architecture

1. **Hero + priority bar** (first screen). One promise line, then 6 priority chips: Équilibré (default) · Autonomie · Photo · Jeu · Petit prix · Usage pro. A "…puis" control adds a secondary priority. Étudiant remains a preset (existing `student-recommendations.js` / `#student-journey`).
2. **Nos conseils.** Three picks: *Le choix sûr*, *Le meilleur rapport qualité-prix*, *L'alternative si…*. **Mobile (390 × 844): only the first pick is fully visible above the fold**, with its verdict, price and limitation. The other two appear as a visible peek (a partly visible second card plus two labelled tabs or a horizontal "2 autres choix" strip), so they are clearly discoverable without being forced into the first screen. Desktop shows all three side by side. Each card has the verdict structure from §2, a link to Idealo and a "Comparer" toggle.
3. **Persistent analyzer entry.** An inline band under the cards ("Un modèle en tête ? Collez son lien"), plus a compact sticky action bar on mobile. It opens the existing analyzer in place.
4. **Affiner** (criteria exploration). A progressive drawer: budget ceiling → OS → screen size first; "Plus de critères" reveals the 6 existing families (engine C). Every change re-ranks the three cards and updates a "Ce que vous sacrifiez" line.
5. **Comprendre les écarts** (2–3 demonstrations, §5). These replace the 8 "notions" cards and the photon-rain SVG.
6. **Les preuves** (collapsed by default). The full bench table with its sort control, the measure charts, the video list, the limits and the chip/nits/mAh guides. This keeps `#tests-2026`, `#sp-ranking`, `#sp-chart`, etc.
7. **FAQ + sources** (shortened; product-sheet walkthrough moved next to the analyzer).

## 4. How recommendations, criteria and the analyzer work together

- **One recommendation layer, existing engines untouched.** A new pure module (`smartphones-conseil.js`) maps a priority pair to existing profile keys and picks the three cards using fixed, documented rules. It **never recomputes, rescales or edits a score**, and it does not blend scores from different engines into one number (a bench rank and an editorial score are different scales).
- **Dataset reconciliation: by evidence level, not by averaging.** The candidate pool is the 74 eligible sheets, the only population where every phone has comparable specs. Each phone is joined to its bench model through the existing `tests[].modele` link (7 phones today). For a given priority, a phone carries the strongest evidence it has, and the card says which one:
  1. **Mesuré en test**: a bench rank for the criterion (engine A output, shown as "n° 2 sur 7, protocole Techmo", never as hours compared across protocols).
  2. **Noté sur fiche**: an editorial `scores` / `profil_scores` value (16 / 15 phones), shown on its own 0–10 scale and labelled as such.
  3. **Fiche technique seule**: raw verified specs (mAh, sensor format, nits, IP, update years) for the other 58, shown as facts, ordered by the existing criteria matching (engine C), with no score.
  Selection rule: a pick is the best phone *within the highest evidence level available for that priority*; a lower-evidence phone can be the "alternative" but is always labelled. When the best pick has only sheet-level evidence, the card says so ("pas de mesure en test pour ce critère"). This keeps the top, profile and criteria views consistent because they all read the same pool through the same rule. The Phase 2 test asserts that every number shown equals the output of its source engine, and that the three views return the same pick for the same inputs.
- **Limits and alternatives are rule-based, not invented.** A limitation is the lowest known criterion for the active priority (or a `points_faibles` entry when one exists). The alternative is the best phone that beats the pick on the criterion the pick sacrificed. Wording is templated from data, and nothing is shown without a source.
- **Criteria refine, they don't restart.** The "Affiner" state is passed to engine C's matching. Its ranking filters and reorders the candidate pool, and the three cards stay the output surface. The ▲/▼ deltas move into each card's detail.
- **The analyzer keeps working as it does, and gets a bridge.** Phase 2 only adds the entry point (a prominent "J'ai déjà un modèle en tête" band and mobile sticky action) that opens the existing analyzer in place, with the same form, IDs and behaviour. The analyzer's result stays the analyzer's own output. A small "Comparer à mes conseils" link below the result jumps to the picks for the active priority; the old `#choisir-profil` anchor is kept as an alias. Showing the analyzed phone as a fourth card in the comparison is Phase 3.
- **Shared state.** The priority is saved to the existing `guide-profile` localStorage key and `guide:profile` event where a mapping exists, so the student journey and other pages keep working.

## 5. Proposed visual demonstrations

Choices are based on purchasing relevance and on data actually present.

1. **Capacité ≠ autonomie** (bench data: 4 flagships + 5 mid-range with both mAh and measured hours). A slope chart shows mAh on the left and measured screen-on hours on the right, one line per phone, with a toggle between the two protocols that **never mixes them**. Lesson: efficiency beats the size of the battery.
2. **Le coût par année de suivi** (catalogue: 74 prices, 70 with update years). A timeline from 2026 to the announced end of updates for the three current picks (or any phones the visitor chooses), labelled with € per supported year. Lesson: a cheaper phone can cost more per year. The figure is clearly marked as an *announced* policy.
3. **Capteurs à l'échelle** (70 sheets and 37 sourced sensor formats). Two chosen phones' main sensors are drawn at true relative area from their 1/x″ format, with the area ratio stated. **Accuracy rules:** the demo shows *physical sensor size only*, never image quality. It must never be worded or colored as "better / worse", and it carries a fixed limitation note: "Un capteur plus grand capte plus de lumière, mais la qualité d'image dépend aussi de l'objectif, de la stabilisation, du traitement logiciel et de la taille des pixels. Aucune vidéo du banc ne chiffre la photo." The optical format (1/x″) is a nominal label, not a measured diagonal, so the ratio is stated as approximate ("≈ 2×"). No simulated photos and no photon-rain animation implying a result. This replaces the existing `sensor-demo`, whose captions ("→ nuit plus propre") overstate the claim; that replacement is Phase 3.

Demo-wide rules: each demo states its data source, its protocol or "announced, not measured" status, and what it does not show. Demo 2 (cost per supported year) uses *announced* update policy only and says that real support and price vary. All three are inline SVG and keyboard-operable. They keep a static result under `prefers-reduced-motion` and `fx-lite`, and they add no dependency.

## 6. Files likely to change

| Change | Files |
|---|---|
| New | `assets/js/smartphones-conseil.js` (pure selection and explanation, Node-testable), `assets/js/smartphones-demos.js`, `assets/css/smartphones-conseil.css`, `scripts/smartphones-conseil-test.js` |
| Rewritten | `smartphones.html` (`<main>` section, CSS/JS link list) |
| Adapted (render targets, no logic change) | `assets/js/smartphones-banc.js` (podium and usages removed; table and charts move into Preuves), `assets/js/smartphones-trouver.js` (tabs → drawer, hash aliasing kept), possibly `assets/js/smartphone-quiz.js` (mount point only) |
| Tests | `scripts/smartphones-trouver-ui-test.js`, `scripts/smartphone-quiz-ui-test.js`, `scripts/ui-flow-test.js` (anchors), `package.json` (new test script) |
| Docs | `docs/SMARTPHONES-METHODE.md` (one section on the recommendation layer) |
| **Not touched** | `smartphones-notes.js`, scoring in `smartphones-scoring.js`, `data/*.json`, `phone-analyzer/*`, shared CSS (`design-system`, `category-page`, `projecteurs`), other category pages, `assets/i18n/*`, `tools/i18n/*` |

Stylesheets to drop from this page once unused: `projecteurs.css`, `smartphones-calm.css`, `smartphones-flow.css`, `sp-illustrations.css`, plus scripts such as `category-kit/pc-portables.js` (pending a dependency check).

## 7. Technical risks and protections

| Risk | Protection |
|---|---|
| Scoring drift | Engines A, B and C stay unchanged. `smartphones-conseil-test.js` asserts that every displayed score equals the engine output and that no card shows an unsourced claim. Existing `notes-test` and `tests-test` must pass unchanged. |
| Broken deep links (`#tests-2026`, `#audit`, `#choisir-profil`, `#analyser-modele`…) | Keep these IDs on the new elements, or alias them in the hash handler. A test loads each anchor and checks the target is visible. |
| Analyzer regressions (shared with `analyseur.html`) | No edits in `phone-analyzer/*`. Keep `#phone-analyzer-form`, `#phone-product-url`, `#phone-analyzer-result` and `data-analyzer-category`. Run `analyzer:ui-test` and `ui-flow-test`. |
| UI tests bound to old IDs | Update `trouver` and `quiz` UI tests deliberately, assertion by assertion, keeping their intent (profile → results, criteria → results, analyzer reachable). |
| Translations | New French text appears untranslated in EN/ES until the DeepL pass (per `CLAUDE.md`). Flag it at hand-off; touch no i18n files. |
| Shared state (`guide-profile`, `guide:profile`, student journey) | Keep the key, the event and the mapping; `student:test` must pass. |
| Mobile and accessibility | Playwright checks at 360, 390, 768 and 1280 px: no horizontal scroll, first card above the fold at 390 px, tap targets ≥ 44 px, one real `tablist` or none, focus order, reduced motion. |
| Production / `main` | Work lives on `feat/smartphone-redesign` (approved exception to `CLAUDE.md`). No push, merge or deploy without explicit approval; `main` is never modified. The preview-page idea is dropped: the branch provides the isolation. |
| Contradictory recommendations | Single pool and single selection rule (see §4). A test asserts the same pick for the same inputs from the top block, the profile presets and the criteria drawer. |
| Thin data presented as certainty | Evidence-level label on every card; "pas de mesure en test" stated explicitly; no score shown for spec-only phones. |

## 8. Implementation plan (next three phases)

**Phase 2: recommendation core and first screen** (on `feat/smartphone-redesign`)
- `smartphones-conseil.js`: priority → profile mapping, evidence-level pool and three-pick selection (§4), limit and alternative rules, source labels, with Node tests.
- In `smartphones.html`: new hero, priority bar, advice cards (first card fully visible on mobile, the others peeking), coverage strip, persistent analyzer entry (existing analyzer untouched, same IDs), and the new scoped stylesheet with light and dark tokens. The existing lower sections (usages, mesures, comprendre, sur mesure, preuves, FAQ) stay in place and working; reorganising them is Phase 3/4. Old podium/usage blocks may be hidden only if their tests still pass.
- Out of scope: criteria drawer, analyzed-model fourth card, the three demos, Preuves reorganisation, any translation file.
- Exit criteria: first recommendation visible at 390 × 844 with the next ones discoverable, no horizontal scroll at 360–1280 px, all existing smartphone tests green, displayed numbers identical to the source engines.

**Phase 3: exploration, analyzer bridge and demonstrations**
- "Affiner" drawer wired to engine C, with the "Ce que vous sacrifiez" line; the analyzed model shown as a fourth card.
- The three demonstrations (`smartphones-demos.js`); Preuves section reusing the `smartphones-banc.js` table and charts.
- Exit criteria: keyboard and screen-reader pass, reduced-motion pass, demo data tests.

**Phase 4: swap, cleanup and regression sweep**
- Finish moving the page to its final structure, add anchor aliases, drop unused CSS and JS links, update the UI tests and `SMARTPHONES-METHODE.md`.
- Full `npm test` + `npm run test:ui`, the mobile and accessibility matrix, and a page-weight comparison before and after.
- Hand-off note listing the new French strings for the DeepL pass. Push only once you approve.

## 9. Revision 2 and Phase 2 hand-off brief

**Approved adjustments (applied above):** (1) mobile shows one full recommendation with the others discoverable, not three cards above the fold (§3); (2) one recommendation layer that unifies the views, with the dataset reconciliation explained (§4); (3) the sensor demo shows physical size only and never implies image quality (§5); (4) the analyzer keeps its behaviour, with an intuitive bridge (§4); (5) full creative freedom on the design language (§2).

**Rules for the Phase 2 session** (written for a fresh context):
- Work only on branch `feat/smartphone-redesign`. **Do not push, merge, deploy or touch `main`** without explicit approval. Commit locally with the attribution lines the session gives.
- Smartphones only. No edits to other categories, `assets/i18n/*`, `tools/i18n/*` (write French only, per `CLAUDE.md`), `data/*.json`, `phone-analyzer/*`, `smartphones-notes.js`, or scoring logic in `smartphones-scoring.js`.
- Keep these IDs and anchors working: `#classement`, `#tests-2026`, `#audit`, `#choisir-profil`, `#analyser-modele`, `#analyse-modele`, `#purchase-audit`, `#phone-analyzer-form`, `#phone-product-url`, `#phone-analyzer-result`, `#scoring-results`, `#sp-podium`, `#sp-ranking`, `#sp-chart`, `#sp-prof-top`.
- Key facts already established: engine A = `assets/js/smartphones-notes.js` (bench ranks); engine B = `smartphones-trouver.js` `build()`; engine C = `smartphones-scoring.js` + `smartphone-quiz.js`; eligibility = `ready_for_recommendation && !exclu_reco && fiche_statut !== 'specs_a_verifier' && compatibilite` (74 sheets); bench→sheet link = `produit.tests[].modele` (7 eligible phones).
- Tests to run at the end: `npm run smartphones:notes-test`, `smartphones:tests-test`, `smartphones:trouver-test`, `smartphones:quiz-test`, `student:test`, `analyzer:ui-test`, `pages:test`, plus the new `scripts/smartphones-conseil-test.js`, and a Playwright check at 360/390/768/1280 px (no horizontal scroll, first pick above the fold at 390 × 844). Report results concisely, then stop and wait for approval.

## 10. Unified recommendation score: investigation (revision 3, awaiting approval)

Question: can the existing data give each eligible phone (the 74 sheets) a comparable, profile-dependent **relevance score R out of 100**, with a separate **confidence C**? **Answer: yes, if R is built from verified sheet specs that every phone has. Bench measurements can only make a small, bounded correction inside their own test, and editorial scores are left out.** Everything below was computed on the repository data with `tools/smartphones/pertinence-prototype.js`, a read-only script that no page or engine loads. No engine and no data file was changed.

### 10.1 Audit findings (new facts only; §0 still holds)

| Source | What it really is | Comparable across the 74? |
|---|---|---|
| Bench ranks (`banc.modeles[].mesures`, engine A) | Independent measurements, but **only a rank inside one protocol** of 5 or 7 phones from one segment. Four flagship-autonomy entries were Chinese variants, and one mid-range test was sponsored. | **No.** Being last of 7 flagships ≠ being last of the market. Within-test only. |
| Engine A notes 0–9 | Rank mapped to 9…4, then averaged with stepped mAh, IP and price scales. This already mixes rank-based and absolute scales. | No (26 bench models, mostly provisional) |
| Editorial `scores` / `profil_scores` (engine B) | 16 sheets have `scores`. **11 of them come from the `Integral` workbook, which `catalogue_meta` labels "sans source"**, and 5 from older catalogue text. Correction to §0: 15 sheets carry the `profil_scores` key, but **only 5 are non-empty**. | **No.** Unsourced, and they cover 16 of 74 |
| `phone-analyzer/references.js` (validated evidence registry) | Planned registry of sourced test scores. **86 phones, 0 evidence entries.** | Empty today |
| Sheet specs (`compatibilite`, engine C) | Manufacturer specs, checked on ≥ 2 sources for 45 sheets (`sources_web`). The others come from a workbook or video sheet (13) or from unsourced files (16). `performance.niveau` and `capteur.niveau` are the guide's own classification of the chip and sensor, not measurements. | **Yes:** battery 74, chip level 74, screen 74, price 74, update years 70, sensor + tele 69, IP 56 |

**Model identifiers.** The only bench→sheet link is `produit.tests[].modele`. Only **5 eligible sheets have a measurement linked through it** (OnePlus 16, OPPO Find X10 Pro Max, iPhone 18 Pro Max, Galaxy A57, POCO F9 Ultra). Vivo V80 and POCO F9 Pro are linked but have no measurement. Exact name matching finds **6 more measured bench models with an eligible sheet but no link**: `samsung-galaxy-s26-ultra`→`galaxy-s26-ultra`, `samsung-galaxy-s26`→`galaxy-s26`, `oneplus-15`, `honor-magic-8-pro`, `apple-iphone-17-pro-max`→`iphone-17-pro-max` and `google-pixel-10-pro-xl`→`pixel-10-pro-xl`. Another **6 measured models have a sheet that is not eligible yet** (`teste_video`, not `ready_for_recommendation`): Vivo V80 Lite, HONOR X9d, HONOR 600 Pro, POCO X8, iPhone 17 and Vivo X500 Pro Max.

**Engine defects found (reported only, not fixed, per the brief):** engine C `repairScore()` reads `durete.reparabilite`, but the data field is `reparabilite_estimee`, so the repair criterion never matches (0 of 74). Engine C `rangScore()` gives the test bonus whenever `p.tests` is truthy, and an empty array `[]` is truthy too. Only 6 of 69 sheets have `teleobjectif.zoom`, so the "×5" choice is almost never satisfied.

**Specs are not measurements, shown with our own data.** In the TechNick mid-range drain test, the POCO X8 (8,340 mAh) finishes 4th, behind the HONOR 600 Pro (7,000 mAh). In the Techmo flagship test, the Vivo X500 Pro Max (8,000 mAh) finishes behind the OPPO Find X10 Pro Max (7,150 mAh). This is why capacity and measured endurance stay two separate terms.

### 10.2 What can be normalised

- **Across the 74 (fixed anchors, never pool percentiles, so scores don't move when the catalogue changes):** capacity, chip level, sensor level + telephoto, price, announced update years, IP, refresh rate + panel type.
- **Only within one test:** autonomy, speed and GPU ranks. These never become hours or a cross-test value.
- **Not at all:** photo quality (no video scores it), editorial scores (no source), and peak nits (manufacturer peak values aren't measured the same way; nits are left out of R).

### 10.3 Formulas

For phone *p* and dimension *d*, the **spec value** *s_d* ∈ [0, 1] (clamped):

| d | Field and anchor | Nature (label on the card) |
|---|---|---|
| batterie | (mAh − 4 000) / 3 500 | capacité annoncée |
| performance | (chip `niveau` − 1) / 9 | classe de puce (classification du guide) |
| photo | 0,75 · (sensor `niveau` − 1) / 9 + 0,25 · tele (none 0, present 0,6, ≥ ×5 1) | matériel photo, never image quality |
| prix | ln(1 600 / price) / ln 16 (100 € → 1, 1 600 € → 0) | prix relevé (date) |
| suivi | (update years − 2) / 5 | politique annoncée |
| robustesse | IP69 1 · IP68 0,85 · IP67 0,7 · IP54–65 0,4 · `sans_ip` 0 | certification annoncée |
| écran | 0,6 · (Hz − 60) / 60 + 0,4 · [not LCD] | fiche |

**Measured adjustment** (bench only, centred and bounded): for each test *t* mapped to *d* (autonomie→batterie; vitesse, puissance→performance; nothing →photo), with *u_t* = 1 − (rang − 1)/(sur − 1):
`a_d = mean_t β_t · (u_t − ½)`, where β = 0,15, halved for a Chinese-variant or sponsored test. The adjustment is at most ±7.5 points on the dimension. Inside each test its mean is zero, so **being tested neither helps nor hurts on average**. It only says how a phone did against the peers in the same protocol.

**Missing data:** `x_d = clamp(s_d + a_d)` when *s_d* is known. When it is unknown, *x_d* takes the **median of that dimension within the same price tier** (haut, milieu, entrée, bas). That value is used for ordering only: it is never displayed and never labelled as a fact.

**Profile weights.** The Équilibré base is batterie 20 · performance 15 · photo 15 · prix 20 · suivi 15 · robustesse 5 · écran 10. The primary priority multiplies its dimensions by 3, the optional secondary one by 2, and the weights are then rescaled to sum to 100:

| Priority (maps to) | batt. | perf. | photo | prix | suivi | rob. | écran |
|---|---|---|---|---|---|---|---|
| Équilibré | 20 | 15 | 15 | 20 | 15 | 5 | 10 |
| Autonomie (batterie) | **42.9** | 10.7 | 10.7 | 14.3 | 10.7 | 3.6 | 7.1 |
| Photo (photo) | 15.4 | 11.5 | **34.6** | 15.4 | 11.5 | 3.8 | 7.7 |
| Jeu (performance, écran) | 13.3 | **30** | 10 | 13.3 | 10 | 3.3 | **20** |
| Petit prix (prix; ceiling **250 €**, same as engine B) | 14.3 | 10.7 | 10.7 | **42.9** | 10.7 | 3.6 | 7.1 |
| Usage pro (performance, suivi) | 12.5 | **28.1** | 9.4 | 12.5 | **28.1** | 3.1 | 6.3 |

**Relevance:** `R = Σ w_d · x_d` (0–100). **Range:** R_min and R_max are computed with every unknown set to 0 and to 1. The unknown share is `U = R_max − R_min`, the profile weight that is not documented.

**Confidence (separate; never enters R):** `C = Σ w_d · q_d`. Here *q* is 0 when unknown. For a sheet spec, *q* follows provenance: `sources_web` 0.6; `classeur_2026` or `test_video` 0.5; `fichier_integral` or `caracteristiques_catalogue` 0.35. A dated price counts 1. A within-test measurement adds +0.4 (+0.25 if the test is weak), capped at 1. **Photo can never go above the spec level.** C ≥ 75 is *élevée*, 50–74 *moyenne*, < 50 *faible*.

**Ordering and incomplete evidence.** Phones are sorted by R; on equal R, higher C comes first, then the lower price. **"Le choix sûr" and "Le meilleur rapport qualité-prix" require U ≤ 15.** Phones with more unknown weight stay in the full list at their own R, labelled "estimation partielle : entre R_min et R_max". They can fill only the "alternative" slot, and only with that label. A missing value is never scored as poor. It also can't win a top slot on assumptions.

### 10.4 Worked examples (real data, current links, no extra matching)

Top 6, shown as R [range] · C:

| # | **Autonomie d'abord** | **Photo d'abord** | **Petit prix** (≤ 250 €) |
|---|---|---|---|
| 1 | POCO F9 Ultra 949 € · 81 [63–88] · 49 ⚠ not gated (U = 25) | OPPO Find X10 Pro Max 1 229 € · 76 · 62 | POCO C85 129 € · 57 · **44 faible** |
| 2 | **OnePlus 16** 889 € · 79 · 68 (autonomie 1/7) | POCO F9 Ultra · 73 [38–88] · 37 ⚠ (U = 50) | Redmi Note 13 159 € · 56 · **77 élevée** |
| 3 | OnePlus 15 689 € · 78 · 66 | OPPO Find X9 749 € · 71 · 66 | Galaxy A23 5G 144 € · 55 [54–58] · 75 |
| 4 | OPPO Find X10 Pro Max · 77 · 68 (3/7) | Xiaomi 16 Ultra 1 389 € · 68 [65–68] · 64 | Redmi Note 15 5G 219 € · 55 · 63 |
| 5 | OPPO Find X9 · 75 · 66 | OnePlus 16 · 68 · 62 | POCO C71 89 € · 54 · 77 |
| 6 | Nubia Red Magic 10 Pro 650 € · 69 [66–69] · 64 | Google Pixel 11 Pro 1 199 € · 67 · 58 | POCO X6 229 € · 54 · 77 |

What changes between profiles, and why:
- **"Le choix sûr": OnePlus 16 for Autonomie, then OPPO Find X10 Pro Max for Photo.** POCO F9 Ultra ranks 1st and 2nd but is not gated, because its sheet has no sensor, update or IP data.
- **OPPO Find X10 Pro Max, Photo:** 15.4 × 0.91 (7,150 mAh plus a weak +0.013 adjustment for 3rd of 7 in the Chinese-variant test) + 11.5 × 1 + 34.6 × 0.90 (1″ sensor plus telephoto) + 15.4 × 0.10 (1,229 €) + 11.5 × 0.6 (5 years) + 3.8 × 0.85 + 7.7 × 1 = **76**. Under Autonomie the same phone drops to 4th (77), behind phones with more mAh.
- **Galaxy S26 Ultra:** 20th for Autonomie (52) and 12th for Photo (64). If the proposed S26 Ultra link is confirmed, its three measurements (autonomie 7/7, vitesse 1/7, GPU 4/5) move **R from 52 to 49 but C from 66 to 87**. More evidence raises confidence; it doesn't inflate relevance.
- **Petit prix:** POCO C85 has the highest relevance but *low* confidence (unsourced catalogue sheet). Redmi Note 13 is 1 point lower with *high* confidence. The card shows both numbers, and C is never folded into R.
- **For comparison, the legacy engines' picks:** engine B "photographe" puts the iPhone 17 Pro first (editorial 9/10 from catalogue text). Engine A "polyvalent" ranks only 26 bench models, all provisional. Agreement with engine B where they overlap (16 sheets) is Spearman 0.88 for Photo and 0.81 for Jeu. So the new score keeps the broad editorial order without relying on unsourced data.

### 10.5 Coverage limitations

- **Measured evidence is thin:** 5 of 74 phones today. For the battery and performance dimensions it moves R by at most about ±3 points, so for now its value is mostly in C. Only 1 of 74 phones reaches *élevée* under Équilibré; 53 are *moyenne* and 20 *faible*. That is the honest state of the evidence.
- **Saturation:** 13 phones sit at chip level 10, and 2 at or above 7,500 mAh (the anchor is reached). Among flagships, performance is separated only by the bench adjustment, and only for tested phones.
- **Flagships dominate every profile except Petit prix** because the spec dimensions rise together with price. The price weight alone doesn't change that; the 250 € ceiling does. This is a property of spec-only data, not a bug to tune away.
- **Not gated under Équilibré (U > 15):** honor-9-lite, tecno-phantom-x3-pro, poco-f9-ultra and poco-f9-pro. 18 sheets have no IP data (low weight).
- **Photo stays "matériel" for every phone:** no image-quality evidence exists.

### 10.6 Would more data or matching help? (ranked by gain for cost)

1. **Confirm the 6 exact-name links** (≈ 1 h, manual check of variants such as S26 vs S26+). This takes measured eligible phones from 5 to 11, adds 9 measurements, and raises C for Galaxy S26 Ultra, OnePlus 15, Honor Magic 8 Pro, etc. Links would live in a new file (`data/smartphones-liens-banc.json`, needs approval), not in the existing JSON.
2. **Fill sensor, updates and IP for POCO F9 Ultra and F9 Pro** (≈ 1 h; the bench sheet already has sources). This removes 2 of the 4 non-gated phones, including the phone ranked 1st for Autonomie.
3. **Verify the 6 measured `teste_video` sheets** so they can become eligible (≈ 4 h). Measured phones would rise to 17, mostly mid-range, where the autonomy test gives real separation.
4. **Telephoto zoom factor** (63 sheets missing, ≈ 3 h). This separates ×3 and ×5 telephotos in Photo.
5. **Populating `references.js`** with sourced measured scores is the only way to get beyond within-test evidence (open-ended). Without it, photo and cross-segment autonomy cannot be measured.

### 10.7 Validation tests (before R replaces any existing output)

- **Invariance:** golden snapshots of engine A `estimate()` for 26 models, engine B `build()` for 6 needs and engine C for fixed states, taken before Phase 2 and asserted equal afterwards.
- **Missing ≠ poor (property tests):** R ∈ [R_min, R_max]. Removing a field moves *x_d* to the tier's neutral value only, makes C strictly lower and switches the label to "inconnu". No displayed value comes from imputation.
- **Separation:** changing only provenance or measurement status changes C, and changes R by at most the bounded adjustment. Changing a spec never changes the measured term, and vice versa. No spec field can produce a "mesuré" label.
- **Centring:** in each bench test the mean adjustment is 0 (± 1e-9).
- **Monotonicity:** more mAh, a higher chip level, more update years or a lower price never lowers R in any profile.
- **Gate:** no phone with U > 15 in pick 1 or 2. Every Petit prix pick is ≤ 250 €.
- **Weight sensitivity** (±20 % per dimension, 14 runs). The prototype already gives: Autonomie, #1 stable 14/14 with top-3 overlap 1.00; Photo, 14/14 and 0.83; Petit prix, 10/14 and 0.88. Threshold: #1 stable ≥ 10/14 and overlap ≥ 0.8.
- **Face validity, reviewed by you:** the top 10 for each of the 6 priorities, with known traps such as the S26 Ultra kept out of the Autonomie top 10.
- **One pool, one rule:** the same pick from the top block, the presets and the criteria drawer (§4).

### 10.8 Rollout and cost

- **Shadow first (requirement 9):** a new pure module `assets/js/smartphones-pertinence.js` (≈ 200 lines, Node-testable) plus `scripts/smartphones-pertinence-test.js` (≈ 250 lines). The existing engines and their displays stay exactly as they are. R and C are computed but shown only behind `?pertinence=1` until you validate them against the tests and the review above. `smartphones-conseil.js` (§4, §8) then reads R and C instead of mixing evidence levels by hand.
- **Estimate:** module and tests ≈ 1 day; review of the six top-10 lists ≈ 1 h; data items 1–2 ≈ 2 h (needs approval to add the links file and edit two sheets). Item 3 is a separate data task.
- **Change to Phase 2:** the "evidence-level pool" in §4 becomes "R + C with gating (§10.3)". The UI deliverables are unchanged.

**Decisions needed:** (a) approve the formulas and weights (or adjust them); (b) leave editorial `scores` out of R; (c) adopt the 250 € Petit prix ceiling; (d) allow the links file and the two data fixes (§10.6, items 1–2).
