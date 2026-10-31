# Smartphone page redesign: audit and plan (Phase 1)

Status: **Phase 1 approved with adjustments (revision 2, see §9). Revision 4 reworks §10 (unified relevance score R and separate confidence C) after the conditional approval. Revision 5 adds §11, the evidence architecture for a database that keeps growing; it supersedes the "R is spec-only" wording of §10, which describes today's evidence, not a permanent rule. Neither the formula nor the architecture is final, and Phase 2 does not start until they are approved.** Branch: `feat/smartphone-redesign`, an explicit, user-approved exception to the "work on `main`, no new branches" rule in `CLAUDE.md`. Nothing is pushed, merged or deployed without the user's approval. Scope: `smartphones.html` and its own assets. No other category, no translations, no scoring or data changes.

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

## 10. Unified recommendation score (revision 4: conditional approval applied, awaiting final approval)

Goal: give each of the 74 eligible phones a comparable, profile-dependent **relevance R out of 100**, with a separate **confidence C**. Nothing here touches a production engine: `smartphones-notes.js`, `smartphones-trouver.js`, `smartphones-scoring.js`, `smartphone-quiz.js`, `phone-analyzer/*` and `smartphones.html` are identical to the Phase 1 commit. The prototype is `tools/smartphones/pertinence-prototype.js`; every number below is regenerated by `tools/smartphones/pertinence-validation.js` into **`docs/SMARTPHONES-PERTINENCE-VALIDATION.md`** (full tables, deterministic, checked by `npm run smartphones:pertinence-test`, 24 checks).

### 10.1 Decisions applied

| Decision | Done |
|---|---|
| Unverified editorial scores stay out of R | Yes. Today R reads sheet specs only because no measurement protocol in the repository is admissible and calibrated yet; §11 defines how measurements enter R as evidence arrives. |
| "Petit prix" ceiling 250 €, adjustable | Yes: the default cap of the *Rapport qualité-prix* priority; every priority accepts a user budget. |
| Bench→catalogue mapping file | `data/smartphones-liens-banc.json`: 22 of 26 bench models linked, 4 refused. Measured eligible phones go from **5 to 11**. |
| Targeted POCO F9 corrections | Done from pages I actually read (see 10.2). |

### 10.2 Data work (verified only)

- **Mapping.** A link needs an identical normalised name, a single sheet bearing that name, and agreement (±10 %) on any spec both sides give. Verification caught a trap: my first normaliser merged "Galaxy S26" with "Galaxy S26+". Refused near-misses: *Pixel 11 Pro XL* (the sheet is the non-XL), *OPPO Find X9 Pro* (the sheet is the X9), *Xiaomi 18 Pro Max* and *Vivo X300 Ultra* (no sheet). Six links rest on the name alone and say so (`identite: "nom"`). One conflict is left open: iPhone 18 Pro Max, 5,391 mAh in the test file against 4,600 mAh on the sheet.
- **POCO F9 Pro and Ultra.** Written: IP68, 200 MP main camera with OIS, Android 16, **4 major OS updates** (each value backed by at least two sources I read: for the Pro, 9to5google, NewMobile, MobileDokan, PinoyTechnoGuide, LMT and digit.in; for the Ultra, 9to5google, digit.in and MobileDokan; video 10 counts as the second source for the 4 updates). **Left empty on purpose:** sensor format (no page I could read states it; search snippets saying 1/1.56″ are unverified), telephoto zoom factor (video only), and digit.in's "6 years of updates" (one outlet, repeated on its Pro and Ultra pages; not independently confirmed). The video said 100 MP; seven pages say 200 MP, so the sheet is corrected, the tester's quote in `smartphones-tests.json` is left as quoted, and the conflict is recorded in `spec_provenance.complement_web`. The values also live in the pipeline's own extension points (`smartphones-corrections.json`, `classer-suivi.js` `OFFICIELLES`, `integrer-tests.js`), so a rerun of `classer-puces.js` reproduces them. Effect: the unknown share of the Ultra's usage-quotidien score falls from 35 to 4 points.
- Not fixable here: the official POCO pages answered 403, so the sensor format needs a primary source.

### 10.3 Model

**Spec values** (fixed anchors, never percentiles of the catalogue; photo is hardware, never image quality): battery (mAh − 4 000)/3 500 · chip class (level − 1)/9 · photo 0.75·sensor + 0.25·telephoto · updates (years − 2)/5 · IP (69 = 1, 68 = 0.85, 67 = 0.7, 54–65 = 0.4, none = 0) · screen 0.6·(Hz − 60)/60 + 0.4·[not LCD] · price ln(1 700/p)/ln(1 700/80).

**Weights.** Base (usage quotidien): battery 20, chip 15, photo 15, updates 15, IP 5, screen 10, price 20. Primary priority ×3, optional secondary ×2, rescaled to 100. Priorities: Autonomie, Photo, Jeu (chip and screen), Rapport qualité-prix (price), Usage quotidien.

**R = Σ w·x** over those seven values. **Budget** acts in two ways on every priority: a strict cap, and a **premium test** for recommendation: a phone is recommended only if, against every recommendable phone at least 20 % cheaper, it gains at least **κ = 8 points of fit** (R without the price term) per doubling of price. κ is an editorial parameter; on this catalogue fit rises 12–19 points per doubling, so κ = 8 asks for half the market's usual return.

**Missing data.** An unknown criterion takes the median of its price segment, **for ordering only**; it is never shown as a fact. The output is an interval [Rmin, Rmax] from the segment's 10th–90th percentiles. A phone is *recommendable* only if the interval is ≤ 12 points wide, **C ≥ 50** and it passes the premium test. Others stay in the list, labelled "estimation partielle".

**C (confidence)** = Σ w·q, with q = 0 for unknown, 1 for a dated price, 0.6 for a field confirmed on two web pages, 0.35–0.6 by sheet provenance otherwise, and a bench measurement adds 0.4 (0.25 for a weak protocol, 0.1 for a discarded one). **R never reads C or the provenance, C never reads a spec value.**

**M (measurements)** are shown as separate lines "rank n of N, protocol X" and never merged with the sheet values or across protocols. (This is the state with today's evidence; §11 generalises it.)

### 10.4 What the validation showed

| Your requirement | Result |
|---|---|
| **Price sensitivity** across budgets | Share of phones above 800 € among the top 3, averaged over the five priorities: at 1 000 € **53 % → 13 %**, with no cap **60 % → 20 %** once the premium test is on; 0 % at 700 € and below. Premium test strength κ = 4 / 8 / 12 gives 53 / 20 / 7 % with no cap. The first choice moves with the budget in every priority (for example Autonomie: Redmi Note 13, then iQOO Z9 Turbo, Vivo V80, OnePlus 15, OnePlus 16). **Rejected:** pricing relative to the budget, because the same phone's R then rises with the user's wealth (POCO C85: 37 at 250 €, 42 with no cap). |
| **Median imputation** | Leave-one-out on 55 fully documented phones: segment median has bias 0.0 and average error 2.2 points, interval contains the true R 85 % of the time, **no false promotion into the top 5**. Counting 0 biases R by −7.9; ignoring the criterion doubles the error and shifts ranks most. **But the median does not preserve rank:** 38 % of cases move 3 places or more, because R values are packed. Hence: imputation orders, the interval is shown, and the gate decides who can be recommended. |
| **±7.5-point measurement adjustment** | **Not appropriate as a fixed bonus. With today's evidence R is spec-only; §11 turns that into a data-driven state instead of a rule.** Capacity already explains the measured ranks (Spearman 0.90 and 0.89), so a centred bonus double-counts. A residual adjustment moves R by 2.3 points at most (4.5 with β 0.30) and changes no top 5 in 20 priority × budget combinations. Only 1 protocol (speed) is free of reservations: the flagship autonomy test used Chinese variants, the mid-range one is sponsored, the GPU one overclocks one phone. With 5–7 phones per protocol nothing can be calibrated. Measurements raise C and stay visible in M. |
| **Stability** | Weights ±20 %: first choice unchanged in 14/14 runs in 12 of 15 priority × budget cells, 13/14 in two (Usage quotidien at 400 € and with no cap), 8/14 for Rapport qualité-prix at 400 €. Prices ±10 %: first choice unchanged 30–100 % of the time (lowest: Rapport qualité-prix at 400 € 30 %, Autonomie with no cap 57 %), top-3 overlap 0.68–0.97. **The first rank is not robust; the top group is.** |
| **Confidence behaviour** | R–C correlation 0.06–0.12 (−0.20 for Rapport qualité-prix, where cheap phones are less documented): the two ideas are independent. 1 phone reaches "élevée", 56 "moyenne", 17 "faible". |

### 10.5 Recommendations that are still questionable (details in the validation report §6)

1. **Tight budgets give weak absolute scores** (best at 250 €: R 42–46). R is absolute on purpose, so the interface must say "best at this budget, limited for this priority".
2. **iPhones are under-ranked for Autonomie**: R reads announced mAh, the iPhone 18 Pro Max ranks 33rd of 74 while the Techmo test puts it 5th of 7 flagships. Efficiency only enters through measurements, and the only protocol covering it is discarded.
3. **Photo picks lean on sensor grades from the workbook without a press source** (6 recommended models, including OPPO Find X10 Pro Max).
4. **Rapport qualité-prix at 400 € recommends the POCO C85** (129 €, 2 years of updates, LCD) and is the least stable cell. A support floor for this priority should be decided.
5. **A measurement can lift an unsourced sheet over C = 50** (iPhone 17 Pro Max, C 54). The rule currently lets it.
6. **The first rank is not a verdict** (prices ±10 % reorder the top): show a group of equivalents.
7. Open data conflict (iPhone 18 Pro Max mAh), POCO sensor format unknown, 15 of 16 unsourced sheets can never be recommended until sourced.

### 10.6 Cost and rollout

- **Done:** prototype (185 lines), validation harness, 24 checks, mapping file, POCO corrections.
- **To do for production:** port the prototype into `assets/js/smartphones-pertinence.js` (pure, ≈ 250 lines) and wire `smartphones-conseil.js` to it: **≈ 1 day**, shadow mode behind `?pertinence=1` until you approve the lists. Sourcing the 16 unsourced sheets (≈ 6–8 h) and the Photo sensor grades (≈ 3 h) is separate data work.
- Existing outputs are preserved: no engine file, display or i18n file changed; failures in `verifications:test`, `classeur-complet:test` and `smartphones:quiz-test` predate this work (same failures before and after).
- **Phase 2 impact:** the evidence-level pool of §4 becomes "R + C + U with the gate of 10.3" fed by the evidence layer of §11; cards show R with budget context, the interval, C and the evidence basis of each criterion.

### 10.7 Decisions needed before Phase 2

1. ~~Approve R from sheet specs only~~ Superseded by §11.10: R is spec-only *today* as a consequence of the evidence available, not as a design rule.
2. Approve **absolute price + cap + premium test (κ = 8)** instead of price relative to the budget.
3. Approve the gate **U ≤ 12, C ≥ 50**, and decide whether a measurement may lift an unsourced sheet over 50.
4. Decide a **support floor** for Rapport qualité-prix (for example 3 years).
5. Accept that the interface shows **groups of equivalents**, not a single winner.

## 11. Evidence architecture: an advisor that improves as evidence is imported (revision 5, awaiting approval)

Requirement: the database keeps growing through imports of review videos and independent tests (specs, measurements, observations, conclusions, sources). Scores must move when evidence arrives, in either direction, without model-specific rules or manual ranking edits, and without rebuilding ingestion.

**Principle.** *Nothing derived is stored.* R, C and U are recomputed at load from a ledger of **observations**. An import adds observations; the same code produces new scores. Corrections happen at the evidence level (an observation is flagged or rejected with a reason), never on a score. The existing ingestion (`construire-tests.js`, `integrer-tests.js`, `classer-*`, `appliquer-corrections.js`) is untouched; thin read-only adapters turn what it already produces into observations.

### 11.1 Three concepts, three outputs

| Concept | Question it answers | Computed from | Shown as |
|---|---|---|---|
| **Relevance R** | How well does the phone fit the user's priorities? | Best available estimate per criterion (declared spec, refined by compatible measurements), weighted by the user's priorities | 0–100 |
| **Confidence C** | How strongly does evidence support what we state? | Evidence quality per criterion: source class, protocol, variant match, recency, independence, consistency. **Not the number of sources.** | Low / medium / high, with the evidence behind each criterion |
| **Uncertainty U** | What is unknown or contradictory? | Unknown criteria (segment interval), disagreement between compatible observations, spec contradicted by a measurement | Interval [Rmin, Rmax] plus an explicit list of conflicts |

Today's C is, by construction, *coverage × quality* (support = Σ w·q). Display them separately, but **keep the recommendation gate on the product (support ≥ 50) plus U ≤ 12**: gating on quality alone would admit 12 extra low-coverage cases out of 1,255 phone × priority × budget combinations (for example Honor 9 Lite at 50 % coverage).

### 11.2 What the prototype keeps and what becomes extensible

| Part of the prototype | Verdict |
|---|---|
| Spec anchors (battery, chip, photo hardware, updates, IP, screen, price) | **Keep** as the *prior* for each criterion. Becomes one entry per criterion in a registry. |
| Priorities, weights, absolute price, budget cap, premium test (κ = 8) | **Keep unchanged.** They act on estimates, not on evidence, so new evidence never touches them. |
| Segment-median estimate, interval, gate U ≤ 12 and support ≥ 50 | **Keep** for criteria with no evidence at all; extend the interval with conflict width. |
| Separation of R, C, M | **Keep**, add U as the third concept. |
| `liens` mapping file and its tests | **Keep**; becomes the product-identity resolver for every future import. |
| Leave-one-out and stability harness | **Keep**, add evidence-arrival replays (11.8). |
| `TESTS` table hard-coded in the prototype (which protocol is discarded and why) | **Replace** by a protocol registry (data). This is the only model-adjacent rule in the code. |
| Fixed credits +0.4 / +0.25 / +0.1 for a measurement | **Replace** by evidence strength (11.5). |
| `uAttendu`, which special-cases battery | **Replace** by a per-criterion spec predictor in the criteria registry. |
| Provenance per sheet and one special field list (`complement_web`) | **Generalise** to per-observation provenance. |
| `ajuste` modes (centred, residual) | **Replace** by one estimator (11.5), inactive until a protocol class is calibrated. |

### 11.3 Observation record and what the repository already provides

One atomic claim per record:

```
{ id, produit, kind: declared | measured | scored | qualitative, critere,
  valeur: { nombre, unite } or { rang, sur } or { texte },
  source: { id, editeur, classe, url, date, sponsorise },
  protocole: id,                 // -> protocol registry
  variante: { region, config },  // device actually tested
  statut: valide | a_verifier | rejete (+ motif) }
```

`kind` is structural: *declared* specs are capped at strength 0.6 and can never exceed a comparable *measured* observation; *qualitative* observations never enter R.

| Existing artifact | Becomes | Count today |
|---|---|---|
| Sheet `compatibilite` + `spec_provenance` (+ `complement_web`) | declared | 74 sheets |
| `smartphones-tests.json` `banc.modeles[].mesures`, `autonomie`, `vitesse`, `benchmarks` | measured | 26 lines, 4 protocols (14 with a duration, 12 rank-only) |
| `smartphones-tests.json` verdicts, `choix_par_profil`, `gamme`, `photo`, `tendances`, `limites` | qualitative | 6 blocks |
| `phone-references.json` (`PhoneReferences`, used by the analyzer and the student journey) | scored (reviewer `score_10`) or measured when `kind: measured` | 86 phones, **0 evidence entries**. Its own `confidence` is count-based, so it is *not* reused. |

**What an import must supply that the repository does not capture now** (audit): a **date** (0 of 13 videos have one), **structured variant and sponsorship flags** (0; two prose caveats among eight `limites` lines), a **protocol id with conditions** (the protocol is free text for 7 of 7 ranking blocks), and a **numeric value with unit** (12 of 26 lines are rank-only). Defaults when missing are conservative, never optimistic: undated ×0.8, unknown variant ×0.8, undeclared protocol → qualitative only (shown, never scored). An import is therefore never blocked, only weighted by how well it is documented.

### 11.4 Three small registries (data, not code)

- **Criteria** (7 entries today: the dimensions of 10.3): spec predictor, unit, direction, and for each measurable family whether a measured value has an **absolute anchor** (for example measured nits, minutes) or is **relative** (rank inside a cohort).
- **Source classes** (initial editorial values, to review): declared spec ≤ 0.6 (the three provenance classes already in the prototype: 0.6, 0.5, 0.35); independent test with documented protocol 0.8; video test with described protocol 0.7; rank-only video 0.5; qualitative 0.3. Sponsored ×0.8.
- **Protocols** (4 entries today, filled from the existing prose, nothing invented): criterion, `compatibilite` id (observations are comparable only inside one id), reference variant, sponsored flag, conditions (for example 500 nits), tolerance for agreement. Flagship autonomy (Techmo): Chinese variants; mid-range autonomy (TechNick): sponsored by vivo; GPU (TechNick): one phone overclocked; speed (PhoneBuff): no reservation.

### 11.5 Estimation rules

1. **Comparability.** Two observations are compared only if they share a criterion, a protocol `compatibilite` id and a variant. Never across ids; a different id is never converted to a common scale, it is a separate line.
2. **Strength of one observation** `s = r(source class) × k(protocol) × k(variant) × k(recency)`, with k = 1 when documented and matching, 0.5 for ordinal-only (rank), 0.8 when unknown, 0 for a variant that differs from the sheet's (kept visible, excluded from R).
3. **Independence.** Observations sharing a publisher and testbed form one **group** and count once (their best strength).
4. **Support per criterion** `S = s₁ + 0.3·(1 − s₁)·m/2`, with s₁ the strongest group and m ≤ 2 the number of *independent, consistent* groups at least half as strong. Ten same-publisher reviews = one group. Ten mediocre independent sources (s = 0.5) give 0.65; two reliable ones (s = 0.7, 0.7) give 0.745. Corroboration is bounded, so count cannot buy rank.
5. **Estimate** `x = x_spec + λ·(x_obs − x_spec)` with λ = S_measured × a, where a is the protocol class's **activation factor**: 1 for an absolute anchor; for a relative class a = 0 until the class has at least 8 phones with a spec predictor, no variant contamination, and either two independent publishers or one lab-grade source, then a ramps with cohort size and with the consistency between spec and measurement. `x_obs` is the anchored value (absolute) or `x_spec + (rank percentile − rank percentile predicted by the spec)` (relative). The prior is the declared spec, so evidence can raise or lower a phone symmetrically; when no compatible measurement exists, x is the spec value, then the segment median.
6. **Conflicts are kept.** Two compatible observations that disagree beyond the protocol tolerance, or a measurement that contradicts the spec by more than 0.25, are both retained. The estimate follows the stronger group, the interval widens to cover both, and the conflict is **exposed** when it moves R by 3 points or more for the active priority.
7. **Qualitative evidence** never changes R. It supplies explanation text and a "dissent" flag when two independent reviewers contradict the numeric estimate, which widens U.

**Consequence today.** No relative class meets the activation rule (the largest has 7 phones, three have variant or sponsorship reservations), so **R is identical to the validated prototype**; C is recomputed from S and re-validated. The first import that completes a class changes R automatically, and the change report (11.7) shows who moved.

### 11.6 Explanation contract

Each recommendation carries, per criterion: the **basis** (`fiche`, `mesure`, `avis`), the winning observation ids, the value with its unit and protocol ("7 h 20 d'écran, protocole X, n° 3 sur 7, source Y, mois/année"), and any conflict. Text comes from templates keyed by basis, never from per-model prose. The card states the **compromise** (lowest-scoring criterion among those weighted by the user's priorities, and any criterion known only from specifications), and whether the conclusion rests on specifications, independent measurements or reviews.

### 11.7 Minimal implementation strategy (no ingestion rebuild)

| Step | Content | Size |
|---|---|---|
| 1 | Three registries as JSON, filled from existing prose (7 criteria, 7 source classes, 4 protocols) | ≈ 100 lines of data |
| 2 | Adapters: sheets, `smartphones-tests.json`, `phone-references.json` → observations, via the `liens` file | ≈ 120 lines |
| 3 | Evidence aggregation (groups, support, conflicts, estimator) replacing `mesures()` and the `ajuste` modes | ≈ 150 lines |
| 4 | **Regression guarantee:** with today's data the new code reproduces the validated R to 1e-9 | test |
| 5 | **Change report:** after any import, lists phones whose R, C or U moved, by how much and from which observations, for review before publishing | ≈ 60 lines |
| 6 | Import contract: one page listing the fields in 11.3 that an import should emit | doc |

Not built: ingestion, NLP of qualitative text, any UI. New importers may keep writing `smartphones-tests.json`; when convenient they can emit observation records directly into one append-only file. Estimated cost on top of the production port of §10.6: **about one more day** (total ≈ 2 days), still behind `?pertinence=1`.

### 11.8 Validation additions

Property tests, run on every change: (a) ten same-publisher observations never exceed one in support; ten mediocre independent sources never exceed two reliable ones; (b) a measurement can raise **and** lower R relative to the spec; (c) incompatible protocol ids are never merged; (d) a variant mismatch appears in M and changes neither R nor C; (e) a conflict keeps both observations and widens U; (f) a *declared* spec never exceeds 0.6 or outranks a comparable measurement; (g) qualitative observations change no R; (h) a new phone with only a sheet is scored by the same code, with no model-specific branch (grep-level test). Plus **evidence-arrival replays**: re-run the budget, stability and leave-one-out harness after each import, and compare with the previous snapshot.

### 11.9 Limits to accept

- A relative class cannot be calibrated below about 8 phones, so early imports will mostly raise C and fill M, not move R. This is intentional.
- Independence is judged by publisher and testbed, which cannot detect two channels reusing the same footage.
- Source-class and recency values are editorial and live in the registry so they can be revised by data; they are not calibrated.
- Qualitative reviews stay out of R. Their value is explanation and early warning, not ranking.
- Undated videos (all 13 today) are down-weighted until imports carry dates.

### 11.10 Decisions needed

1. Approve the **observation ledger computed at load, with nothing derived stored**, and the three-concept split R / C / U.
2. Approve **three registries** (criteria, source classes, protocols), with conservative defaults for anything an import leaves undeclared.
3. Approve the **activation rule** for relative protocols (≥ 8 phones, no contamination, independent or lab-grade source) and the bounded-corroboration formula.
4. Approve the **change report** as the review step after each import, in place of any manual ranking adjustment.
5. Keep the support gate (≥ 50) and U ≤ 12; decide the support floor for Rapport qualité-prix and whether a measurement may lift an unsourced sheet (open items of 10.7).
