(function (root) {
  "use strict";
  /* Profil « PC portables ». status "shell" : la catégorie n'est pas encore publique.
     Passez à "active" dans ce fichier quand le catalogue pc-portables.json est branché. */
  var profile = {
    id: "pc-portables",
    status: "active",
    label: "PC portables",
    itemNoun: "PC portable",
    makers: {
      apple: { names: ["apple"], families: ["macbook"] },
      asus: { names: ["asus"], families: ["zenbook", "vivobook", "rog", "tuf", "proart"] },
      lenovo: { names: ["lenovo"], families: ["thinkpad", "ideapad", "legion", "yoga", "loq", "chromebook"] },
      hp: { names: ["hp"], families: ["pavilion", "omen", "envy", "spectre", "omnibook", "victus"] },
      dell: { names: ["dell"], families: ["xps", "inspiron", "latitude"] },
      acer: { names: ["acer"], families: ["aspire", "swift", "nitro", "predator", "chromebook"] },
      msi: { names: ["msi"], families: ["katana", "stealth", "cyborg"] },
      microsoft: { names: ["microsoft"], families: ["surface"] },
      samsung: { names: ["samsung"], families: ["galaxy"] },
      thomson: { names: ["thomson"], families: ["neo"] },
      framework: { names: ["framework"], families: [] },
      lg: { names: ["lg"], families: ["gram"] },
      honor: { names: ["honor"], families: ["magicbook"] }
    },
    variantWords: ["pro", "max", "plus", "ultra", "air", "neo", "slim", "duo", "scar", "strix", "oled", "edge", "flip"],
    noiseWords: ("noir noire blanc blanche bleu bleue vert verte rouge rose gris grise argent or violet jaune orange black white blue green red pink gray grey silver gold " +
      "neuf reconditionne occasion garantie ans de du des le la les un une et avec pour en version francaise edition " +
      "pc portable ordinateur laptop notebook windows azerty clavier pouces pouce inch go gb to tb ssd ram").split(" "),
    softPatterns: [],
    modelCode: /\b([a-z]{1,3}\d{3,5}(?:-\d{2,3})?)([a-z]{0,4})\b/,
    aliasMerges: [[/\bmac\s+book\b/g, "macbook"]],
    bareNumberNoise: /^(?:8|16|24|32|36|48|64|128|256|512|1024|2048)$/,
    comboPattern: /\b\d{1,2}\s?(?:go|gb)?\s*[+\/]\s*\d{2,4}\s?(?:go|gb|to|tb)?\b/g,
    unitWords: "go|gb|to|tb|mo|mb|mah|hz|mp|w|wh|kg|g|mm|cm|po|pouces?|inch|nits?",
    productWord: /\b(?:pc portable|ordinateur portable|laptop|notebook|macbook|zenbook|ideapad|thinkpad|vivobook|chromebook|omnibook)\b/i,
    specLabels: {
      processeur: "Processeur",
      ram: "Mémoire",
      stockage: "Stockage",
      ecran: "Écran",
      gpu: "Carte graphique",
      poids: "Poids",
      autonomie: "Autonomie",
      os: "Système"
    },
    coreSpecs: ["processeur", "ram", "stockage", "ecran", "gpu"],
    textSpecRules: [
      { key: "processeur", patterns: [/\b(?:Intel\s+Core\s+(?:Ultra\s+)?(?:[A-Za-z]*\d[\w-]*)|AMD\s+Ryzen(?:\s+AI)?\s+\d[\w -]{0,16}|Apple\s+(?:M\d|A\d{2})(?:\s+(?:Pro|Max|Ultra))?|Snapdragon\s+X[\w -]{0,24}|MediaTek\s+Kompanio[\w -]{0,16})/i] },
      { key: "ram", patterns: [/\b(\d{1,2})\s*(?:Go|GB)\s*(?:de\s+)?(?:RAM|DDR\d|LPDDR\d|unifi[ée]s?|m[ée]moire)/i, /\b(?:RAM|m[ée]moire(?:\s+vive)?)\s*(?:de\s*)?(\d{1,2})\s*(?:Go|GB)/i] },
      { key: "stockage", patterns: [/\bSSD\s*(?:de\s*)?(\d{1,4})\s*(?:Go|GB|To|TB)/i, /\bNVMe\s*(?:de\s*)?(\d{1,4})\s*(?:Go|GB|To|TB)/i, /\b(\d{1,4})\s*(?:Go|GB|To|TB)\s*(?:SSD|NVMe|UFS|eMMC)/i] },
      { key: "ecran", patterns: [/\b(\d{2}(?:[.,]\d)?)\s*(?:pouces|po|"|″|inch)/i] },
      { key: "gpu", patterns: [/\b(?:GeForce\s+RTX\s+\d{4}(?:\s+Ti)?|Radeon\s+RX\s+\d{4}\s*M|Intel\s+Arc\s+[\w\d]+|Apple\s+M\d(?:\s+(?:Pro|Max))?)\b/i] },
      { key: "poids", patterns: [/\b(\d(?:[.,]\d{1,2})?)\s*kg\b/i] },
      { key: "autonomie", patterns: [/\b(\d{1,2}(?:[.,]\d)?)\s*h(?:eures?)?\b/i] },
      { key: "os", patterns: [/\b(?:Windows\s+11|macOS|ChromeOS|Chrome\s*OS)\b/i] }
    ],
    referenceRules: [
      { key: "processeur", name: /processor model|mod[eè]le du processeur|processor family/i, accept: { minLen: 3 } },
      { key: "ram", name: /internal memory|m[eé]moire interne|installed RAM|m[eé]moire vive/i, accept: { re: /\d\s*(?:GB|Go)\b/i, maxGb: 128 } },
      { key: "stockage", name: /total storage|ssd capacity|capacit[eé].*SSD|storage capacity/i, accept: { re: /\d\s*(?:GB|Go|TB|To)\b/i } },
      { key: "ecran", name: /display diagonal|diagonale/i, accept: { re: /\d/ } },
      { key: "gpu", name: /discrete (?:graphics|gpu)|carte graphique d[eé]di[eé]e|graphics card/i, accept: { minLen: 3 } },
      { key: "poids", name: /^weight$|poids/i, accept: { re: /\d/ } },
      { key: "os", name: /operating system|syst[eè]me d.exploitation/i, accept: { re: /Windows|macOS|Chrome/i } }
    ],
    ramFallbackName: null,
    ramMaxGb: 128
  };
  if (typeof module !== "undefined" && module.exports) module.exports = profile;
  else if (root.GuideCategoryKit) root.GuideCategoryKit.register(profile);
})(typeof window !== "undefined" ? window : globalThis);
