(function (root) {
  'use strict';
  /* Couche « conseil » : transforme le classement du moteur de pertinence (smartphones-pertinence.js) en trois choix expliqués
     et en pistes provisoires. Elle ne recalcule ni ne modifie aucune note et ne mélange pas les échelles de moteurs différents.
     Règles fixes, documentées dans docs/SMARTPHONES-METHODE.md ; les phrases sortent de gabarits, jamais de texte par modèle.
       - le choix sûr    : meilleur R parmi les modèles CONFIRMÉS ; à égalité (± équivalents_points) la meilleure confiance, puis le prix ;
       - le meilleur rapport qualité-prix : même moteur avec le prix renforcé (priorité « prix » + priorité de l'utilisateur en secondaire),
         plancher de 3 ans de mises à jour sauf choix explicite « prix d'achat le plus bas » ;
       - l'alternative   : le meilleur modèle confirmé qui fait nettement mieux sur le critère sacrifié par le choix sûr ;
       - les provisoires : modèles neuf ou incomplètement documentés, toujours signalés comme tels, jamais dans les trois cartes. */
  var PROFIL = { jeu: 'gamer', photo: 'photographe' };               // priorité → clé « guide-profile » existante
  var PRIORITE_DE = { gamer: 'jeu', photographe: 'photo', etudiant: 'equilibre', professionnel: 'equilibre' };
  var MOTIFS = {
    incertitude: 'trop de caractéristiques inconnues pour une estimation fiable',
    soutien: 'sources de la fiche insuffisantes',
    provenance: 'une caractéristique importante pour votre priorité n’est pas sourcée',
    suivi_inconnu: 'durée de mises à jour non annoncée',
    suivi_court: 'moins de 3 ans de mises à jour (annoncés, ou restants si la date de sortie est connue)',
    suivi_termine: 'le suivi annoncé depuis sa sortie est épuisé d’après sa date de sortie',
    photo_non_etayee: 'matériel photo limité et aucun test photo indépendant relevé',
    prime_non_justifiee: 'un modèle moins cher et fiable fait presque aussi bien',
    donnees_insuffisantes: 'trop peu de données'
  };
  function arrondi(x) { return Math.round(x); }
  function eur(n) { return Number(n).toLocaleString('fr-FR') + ' €'; }
  function titreCritere(reg, d) { return reg.criteres[d].titre.toLowerCase(); }

  function creer(moteur) {
    var reg = moteur.registres, REC = reg.regles.recommandation, parId = {};
    moteur.pool.forEach(function (p) { parId[p.id] = p; });

    /* critères qui comptent pour la priorité choisie : au moins 10 % du poids */
    function pertinents(poids) { return moteur.ALL.filter(function (d) { return poids[d] >= 10; }); }

    function carte(role, a, ctx) {
      var p = parId[a.id], det = moteur.detail(a.id), ev = moteur.evidence(a.i), poids = a.poids, lignes = moteur.lignesMesure(a.id);
      var dimsPriorite = reg.priorites[ctx.principal].dims || [];
      var contrib = moteur.DIMS.concat(ctx.principal === 'prix' ? ['prix'] : []).filter(function (d) { return ev[d].x != null; }).map(function (d) { return { d: d, v: poids[d] * ev[d].x, prioritaire: dimsPriorite.indexOf(d) >= 0 }; }).sort(function (x, y) { return Number(y.prioritaire) - Number(x.prioritaire) || y.v - x.v; });
      var pourquoi = contrib.slice(0, 2).map(function (c) {
        return { critere: c.d, titre: reg.criteres[c.d].titre, texte: det[c.d].texte, base: det[c.d].base, source: det[c.d].libelleClasse };
      });
      var pert = pertinents(poids).filter(function (d) { return ev[d].x != null && !((role === 'valeur' || role === 'economique') && d === 'prix'); }).sort(function (x, y) { return ev[x].x - ev[y].x || poids[y] - poids[x]; });
      var faible = pert[0] || null;
      var limite = faible ? { critere: faible, titre: reg.criteres[faible].titre, texte: det[faible].limite || det[faible].texte, x: ev[faible].x } : null;
      var empreinte = moteur.DIMS.map(function (d) {
        var mesure = ev[d].mesures.some(function (l) { return l.force > 0; });
        return { critere: d, titre: reg.criteres[d].titre, etat: ev[d].x == null ? 'inconnu' : (mesure ? 'mesure' : 'fiche') };
      });
      var nb = { mesure: 0, fiche: 0, inconnu: 0 }; empreinte.forEach(function (e) { nb[e.etat]++; });
      var preuve = nb.mesure ? 'Fiche et mesures disponibles ; leur portée est précisée dans les sources.' : 'Caractéristiques de la fiche seulement ; aucun test ne confirme ce point.';
      var criteres = moteur.ALL.map(function (d) {
        var x = det[d];
        return { critere: d, titre: x.titre, connu: x.connu, texte: x.texte, base: x.base, source: x.libelleClasse, soutien: Math.round(x.soutien * 100), poids: Math.round(poids[d]), conflits: x.conflits };
      });
      var motifs = (a.motifs || []).filter(function (m) { return MOTIFS[m]; }).map(function (m) {
        if (m === 'provenance') return MOTIFS[m] + ' (' + a.critiquesFaibles.map(function (d) { return titreCritere(reg, d); }).join(', ') + ')';
        return MOTIFS[m];
      });
      var c = {
        role: role, id: a.id, nom: a.nom, marque: p.marque, prix: a.prix, idealo: p.idealo_url || null, statut: a.statut,
        R: arrondi(a.R), Rmin: arrondi(a.Rmin), Rmax: arrondi(a.Rmax), U: arrondi(a.U), C: arrondi(a.C), confiance: moteur.niveauC(a.C),
        pourquoi: pourquoi, limite: limite, empreinte: empreinte, preuve: preuve, criteres: criteres, mesures: lignes, avis: moteur.avis(a.id), motifs: motifs,
        conflits: moteur.ALL.reduce(function (n, d) { return n.concat(ev[d].conflits); }, []), annee: p.annee_sortie || null, suiviRestant: a.suiviRestant, suiviAnnonce: a.suiviAnnonce, suiviEtat: a.suiviEtat
      };
      c.verdict = verdict(role, c, ctx);
      return c;
    }

    function ecart(c, ctx) {
      if (!ctx.ref) return '';
      var dp = ctx.ref.prix - c.prix, dr = arrondi(ctx.ref.R) - c.R;
      return ' C’est ' + (dp > 0 ? eur(dp) + ' de moins' : eur(-dp) + ' de plus') + ' que le choix sûr, pour ' + (dr > 0 ? dr + ' point' + (dr > 1 ? 's' : '') + ' de pertinence en moins' : dr < 0 ? (-dr) + ' point' + (dr < -1 ? 's' : '') + ' de plus' : 'la même pertinence') + '.';
    }
    function verdict(role, c, ctx) {
      var pr = reg.priorites[ctx.principal].titre.toLowerCase(), sec = ctx.secondaire && ctx.secondaire !== 'equilibre' ? ' puis ' + reg.priorites[ctx.secondaire].titre.toLowerCase() : '';
      var cap = ctx.budgetUtilisateur ? ' jusqu’à ' + eur(ctx.budgetUtilisateur) : '';
      if (role === 'sur') return 'La meilleure pertinence pour « ' + pr + sec + ' »' + cap + ' parmi les modèles confirmés.';
      if (role === 'valeur') return 'Le meilleur rapport entre vos priorités et son prix' + (ctx.plancher ? ', avec au moins ' + ctx.plancher + ' ans de mises à jour annoncés' : '') + '.' + ecart(c, ctx);
      if (role === 'economique') return 'La piste pour dépenser moins' + (ctx.plancher ? ', avec au moins ' + ctx.plancher + ' ans de mises à jour annoncés' : '') + '.' + ecart(c, ctx);
      if (role === 'alternative') return 'À préférer si « ' + ctx.compromis + ' » compte plus pour vous.' + ecart(c, ctx);
      return 'Prometteur, mais pas assez documenté pour être recommandé : ' + (c.motifs[0] || 'preuves incomplètes') + '.';
    }

    /* Requête : { priorite, secondaire, budget, prixImmediat } → trois cartes confirmées au plus, pistes provisoires, notes.
       Toutes les cartes affichent la note sous LA priorité de l'utilisateur ; les autres classements ne servent qu'à choisir. */
    function conseiller(req) {
      req = req || {};
      if (moteur.pool.length && moteur.pool.every(function (p) { return p.import_mashup; })) {
        var priority = reg.priorites[req.priorite] ? req.priorite : 'equilibre', budget = req.budget || reg.priorites[priority].budget || REC.prix_reference;
        var profile = { equilibre: 'etudiant', autonomie: 'etudiant', photo: 'photographe', jeu: 'gamer', prix: 'etudiant' }[priority];
        var selected = moteur.pool.filter(function (p) { return p.prix_indicatif != null && p.prix_indicatif <= budget; }).map(function (p) {
          var fit = (p.compatibilites_profils || {})[profile];
          var criterion = {autonomie:'autonomie',prix:'prix'}[priority], value = criterion && p.criteres_usage ? p.criteres_usage[criterion] : null;
          return { p: p, fit: fit, value: value == null ? (fit ? fit.score : 0) : value };
        }).filter(function (x) { return x.fit; }).sort(function (a,b) { return b.value-a.value || a.p.prix_indicatif-b.p.prix_indicatif; });
        var cards = selected.slice(0,4).map(function (x,i) {
          var a = moteur.score(moteur.idx[x.p.id], priority); a.statut = 'provisoire'; a.motifs = []; a.critiquesFaibles = [];
          var c = carte(i === 0 ? 'sur' : 'equivalent', a, { principal: priority, budgetUtilisateur: budget });
          c.R = Math.round(x.value*10); c.Rmin = c.Rmax = c.R; c.motifs = ['compatibilité estimée sur les caractéristiques disponibles ; les performances réelles ne sont pas garanties'];
          return c;
        });
        return { requete: {priorite:priority,secondaire:null,budget:budget,budgetUtilisateur:budget}, cartes:cards, provisoires:[], equivalents:[], notes:cards.length ? [] : ['Aucun modèle à prix renseigné dans ce budget.'], total:{confirmes:0,provisoires:selected.length,ecartes:0}, plancher:0 };
      }
      var principal = reg.priorites[req.priorite] ? req.priorite : 'equilibre', secondaire = req.secondaire && reg.priorites[req.secondaire] && req.secondaire !== principal ? req.secondaire : null;
      var opts = { secondaire: secondaire, budget: req.budget || null, prixImmediat: !!req.prixImmediat };
      var R = moteur.classer(principal, opts), conf = R.liste.filter(function (a) { return a.statut === 'confirmee'; }), parId = {};
      R.liste.forEach(function (a) { parId[a.id] = a; });
      var ctx = { principal: principal, secondaire: secondaire, budgetUtilisateur: req.budget || (reg.priorites[principal].budget ? reg.priorites[principal].budget : null), plancher: R.plancher };
      var out = { requete: { priorite: principal, secondaire: secondaire, budget: R.budget, budgetUtilisateur: req.budget || null, prixImmediat: !!req.prixImmediat }, plancher: R.plancher, cartes: [], provisoires: [], equivalents: [], notes: [], total: { confirmes: conf.length, provisoires: 0, ecartes: 0 } };
      R.liste.forEach(function (a) { if (a.statut === 'provisoire') out.total.provisoires++; else if (a.statut === 'ecartee') out.total.ecartes++; });
      var prises = {};
      if (conf.length) {
        var tete = conf[0], groupe = conf.filter(function (a) { return a.R >= tete.R - REC.equivalents_points; });
        var sur = groupe.slice().sort(function (a, b) { return b.C - a.C || a.prix - b.prix || b.R - a.R; })[0];
        var cs = carte('sur', sur, ctx); out.cartes.push(cs); prises[sur.id] = 1;
        out.equivalents = groupe.filter(function (a) { return a.id !== sur.id; }).map(function (a) { return { id: a.id, nom: a.nom, prix: a.prix, R: arrondi(a.R) }; });
        if (sur.R < 55) out.notes.push('Meilleur choix à ce budget, mais limité pour cette priorité : la pertinence reste modeste (' + arrondi(sur.R) + '/100).');
        /* meilleur rapport qualité-prix : même moteur, prix renforcé, même plafond ; plancher de suivi sauf « prix d'achat le plus bas » */
        var vOpts = { secondaire: principal !== 'prix' && principal !== 'equilibre' ? principal : (secondaire && secondaire !== 'prix' ? secondaire : null), budget: R.budget, prixImmediat: !!req.prixImmediat };
        var V = moteur.classer('prix', vOpts), vc = V.liste.filter(function (a) { return a.statut === 'confirmee'; });
        if (vc.length && vc[0].id === sur.id) cs.aussiValeur = true;
        var cand = vc.filter(function (a) { return a.id !== sur.id && a.prix < sur.prix && parId[a.id]; })[0];
        if (cand) {
          var vr = vc[0].id === cand.id ? 'valeur' : 'economique', row = parId[cand.id];
          var cv = carte(vr, Object.assign(row, { statut: 'confirmee' }), Object.assign({}, ctx, { plancher: V.plancher, ref: sur }));
          out.cartes.push(cv); prises[cand.id] = 1;
        }
        /* alternative : meilleur modèle confirmé qui fait nettement mieux sur ce que le choix sûr sacrifie */
        var faible = cs.limite && cs.limite.critere;
        if (faible && faible !== 'prix') {
          var evS = moteur.evidence(sur.i), seuil = 0.15;
          var alt = conf.filter(function (a) { return !prises[a.id] && a.R >= sur.R - 12 && moteur.evidence(a.i)[faible].x != null && moteur.evidence(a.i)[faible].x >= evS[faible].x + seuil; })[0];
          if (alt) { out.cartes.push(carte('alternative', alt, Object.assign({}, ctx, { compromis: titreCritere(reg, faible), ref: sur }))); prises[alt.id] = 1; }
        }
        if (faible && faible !== 'prix' && !out.cartes.some(function (c) { return c.role === 'alternative'; })) out.notes.push('Aucun modèle confirmé ne fait nettement mieux sur « ' + (faible === 'prix' ? 'prix' : titreCritere(reg, faible)) + ' » dans ce budget.');
      } else out.notes.push('Aucun modèle n’est confirmé pour ces critères dans ce budget : élargissez le budget ou changez de priorité.');
      var borne = conf.length ? conf[0].R : -1;
      R.liste.filter(function (a) { return a.statut === 'provisoire' && !prises[a.id] && (!conf.length || a.Rmax >= borne); }).slice(0, 2).forEach(function (a) { out.provisoires.push(carte('provisoire', a, ctx)); });
      return out;
    }
    return { conseiller: conseiller, carte: carte };
  }

  var api = { creer: creer, PROFIL: PROFIL, PRIORITE_DE: PRIORITE_DE, MOTIFS: MOTIFS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SmartphonesConseil = api;
})(typeof window !== 'undefined' ? window : globalThis);
