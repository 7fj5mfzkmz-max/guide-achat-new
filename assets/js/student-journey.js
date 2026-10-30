(function (root) {
  'use strict';
  var E = root.StudentRecommendations, KEY = 'guide-achat-student-v1';
  var priorityLabels = { less: 'Dépenser moins', battery: 'Tenir longtemps sans recharge', years: 'Garder le téléphone plusieurs années', games: 'Jouer', pictures: 'Réussir ses photos' };
  var usageLabels = { daily: 'Quotidien et cours', games: 'Jeux', photo: 'Photo / vidéo' };
  var compromiseLabels = { night: 'Photo de nuit moins performante', games: 'Jeux moins exigeants', weight: 'Téléphone plus lourd', charge: 'Recharge moins rapide' };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v) { return Number(v).toLocaleString('fr-FR', { maximumFractionDigits: 1 }); }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.version === 1) return { answers: E.sanitize(s.answers), step: Math.max(0, Math.min(4, Number(s.step) || 0)) }; } catch (_) {}
    return { answers: E.sanitize({}), step: 0 };
  }
  function checked(on) { return on ? ' checked' : ''; }
  function input(name, label, value, attrs) { return '<label>' + label + '<input name="' + name + '" type="number" min="1" step="any" value="' + esc(value || '') + '" ' + (attrs || '') + '></label>'; }
  function mount(el, products, tests) {
    var state = load(), all = false;
    root.StudentEvidenceContext = { tests: tests };
    root.dispatchEvent(new CustomEvent('guide:audit-change', { detail: { state: root.GuideAuditState || {} } }));
    function save() { try { localStorage.setItem(KEY, JSON.stringify({ version: 1, answers: state.answers, step: state.step })); } catch (_) {} }
    function summary() {
      var a = state.answers;
      return '<details class="student-summary"' + (state.step===4?' open':'') + '><summary>Vos critères actifs · Étudiant (modifier)</summary><p>Budget maximal : ' + (a.budget ? n(a.budget) + ' €' : 'à préciser') + ' · ' + usageLabels[a.usage] + '. Priorités : ' + (a.priorities.map(function (k) { return priorityLabels[k]; }).join(', ') || 'base proposée, modifiable') + '.</p><p>Compromis acceptés : ' + (a.compromises.map(function (k) { return compromiseLabels[k]; }).join(', ') || 'aucun') + '.</p><p>Indispensables : ' + (Object.keys(a.strict).filter(function (k) { return a.strict[k]; }).map(function (k) { return E.STRICT[k] + (typeof a.strict[k] === 'number' ? ' : ' + a.strict[k] : ''); }).join(' ; ') || 'le budget uniquement') + '.</p><div class="student-actions">' + ['Budget', 'Usage', 'Priorités', 'Compromis et exigences'].map(function (label, i) { return '<button type="button" data-student-step="' + i + '">Modifier : ' + label + '</button>'; }).join('') + '<button type="button" data-student-reset>Réinitialiser mes réponses</button></div></details>';
    }
    function reading(row) {
      var f = row.facts;
      return '<p>' + (f.price === null ? 'Prix inconnu.' : 'Prix indicatif : ' + n(f.price) + ' € ; à confirmer chez le marchand.') + '</p>';
    }
    function alternatives(row, candidates) {
      var cheaper = candidates.filter(function (x) { return x.p.id !== row.p.id && x.facts.price !== null && x.facts.price < row.facts.price; }).sort(function (a, b) { return b.facts.price - a.facts.price; })[0];
      var dearer = candidates.filter(function (x) { return x.p.id !== row.p.id && x.facts.price !== null && x.facts.price > row.facts.price; }).sort(function (a, b) { return a.facts.price - b.facts.price; })[0];
      return [cheaper, dearer].filter(Boolean).map(function (alt) {
        var changes = [];
        row.contributions.forEach(function (c, i) {
          var other = alt.contributions[i];
          if (c.note === null || other.note === null || c.key === 'cost') return;
          if (c.key === 'runtime' && row.facts.protocol !== alt.facts.protocol) return;
          var fields = {runtime:['runtime',60,' h mesurées, même protocole'],support:['support',1,' ans restants'],storage:['storage',1,' Go']};
          var cfg=fields[c.key];
          if(cfg){
            if(row.facts[cfg[0]]===alt.facts[cfg[0]])return;
            changes.push(c.label+' : '+n(row.facts[cfg[0]]/cfg[1])+' → '+n(alt.facts[cfg[0]]/cfg[1])+cfg[2]);
          }else if(c.note!==other.note){
            changes.push(c.label+' : '+n(c.note)+' → '+n(other.note)+'/10 (barème documenté)');
          }
        });
        return changes.length ? '<p>Alternative ' + (alt.facts.price < row.facts.price ? 'moins chère' : 'plus chère') + ' : ' + esc(alt.p.nom) + ' (' + n(alt.facts.price) + ' €). ' + esc(changes.slice(0, 2).join(' ; ')) + '. Comparaison des seuls critères documentés ; un avantage au-delà de votre cible de stockage ne rapporte pas de points supplémentaires.</p>' : '';
      }).join('');
    }
    function card(row, candidates) {
      var contributions = row.contributions, known = contributions.filter(function (c) { return c.points !== null; }).sort(function (a, b) { return b.points - a.points; });
      var worst = contributions.filter(function (c) { return c.note !== null; }).sort(function (a, b) { return a.note - b.note; })[0];
      var title = row.complete ? n(row.score) + '/100' : n(row.documentedPoints) + ' points documentés ; total inconnu';
      return '<article class="student-result" data-model-id="' + esc(row.p.id) + '"><h4>' + esc(row.p.nom) + '</h4>' + reading(row) + '<p><strong>Adéquation à vos besoins : ' + title + '</strong><br>Couverture : ' + n(row.coverage) + ' %.' + (!row.complete ? ' Fourchette théorique : ' + n(row.documentedPoints) + ' à ' + n(row.upperBound) + '/100. Ce score partiel n’est pas équivalent à un score complet.' : '') + '</p>' +
        '<p><strong class="sr-k">Pourquoi il correspond :</strong> ' + (known.length ? esc(known.slice(0, 2).map(function (c) { return c.label + ' (' + n(c.points) + ' points)'; }).join(' ; ')) : 'aucun critère noté avec les données actuelles') + '. ' + (row.status === 'eligible' ? 'Aucune incompatibilité connue avec les indispensables renseignés.' : '') + '</p>' +
        '<p><strong class="sr-k">Principal compromis documenté :</strong> ' + (worst ? esc(worst.label) + ' (' + n(worst.note) + '/10 selon notre barème expérimental).' : 'impossible à déterminer.') + '</p><p><strong class="sr-k">Informations à vérifier :</strong> ' + esc(row.unknownStrict.concat(row.unknown).join(', ') || 'aucune lacune sur les critères notés ; prix et conditions réelles restent à confirmer') + '.</p>' +
        (row.facts.runtimeSource ? '<p>Autonomie : ' + n(row.facts.runtime / 60) + ' h dans ce protocole uniquement. Source : ' + esc(row.facts.runtimeSource) + '. ' + esc(row.facts.protocol) + '. Les protocoles différents ne prédisent pas une même durée d’usage.</p>' : '') +
        '<details><summary>Détail des points et limites</summary><table><caption>Poids expérimentaux, après vos choix</caption><thead><tr><th>Critère</th><th>Poids</th><th>Note</th><th>Points</th></tr></thead><tbody>' + contributions.map(function (c) { return '<tr><th scope="row">' + esc(c.label) + '</th><td>' + n(c.weight) + '</td><td>' + (c.note === null ? 'Inconnue' : n(c.note) + '/10') + '</td><td>' + (c.points === null ? 'Non calculés' : n(c.points)) + '</td></tr>'; }).join('') + '</tbody></table><p>Autonomie : mesure réelle uniquement. Support : durée restante datée. Jeu : mesure soutenue sourcée ; photo : évaluation sourcée. Une absence de donnée ne vaut ni zéro ni une note moyenne. Les barèmes sont des hypothèses à tester, pas une qualité absolue.</p></details>' + alternatives(row, candidates) + '<a href="https://www.idealo.fr/prechcat.html?q=' + encodeURIComponent(row.p.nom) + '" target="_blank" rel="noopener noreferrer">Vérifier le prix de ' + esc(row.p.nom) + '</a></article>';
    }
    function results() {
      var result = E.select(products, state.answers, { tests: tests }), eligible = result.eligible;
      if (result.needsBudget) return '<p>Indiquez un budget maximal pour obtenir une sélection.</p>';
      var html = '<h3 tabindex="-1" id="student-results-title">Votre sélection Étudiant</h3><p>Indispensables d’abord, puis adéquation à vos besoins. Les fiches complètes sont séparées des comparaisons partielles ; parmi ces dernières, la couverture passe avant les points. À couverture égale, les points départagent, puis les bonus documentés de poids et de recharge.</p>';
      if (!eligible.length) {
        var reasons = {};
        result.excluded.forEach(function (r) { r.blocked.forEach(function (x) { reasons[x] = (reasons[x] || 0) + 1; }); });
        html += '<p role="status">Aucun modèle confirmé ne correspond. Contraintes bloquantes connues : ' + esc(Object.keys(reasons).map(function (k) { return k + ' (' + reasons[k] + ' modèles)'; }).join(' ; ') || 'informations indispensables manquantes') + '. Modifiez votre budget ou une exigence ci-dessus. Le budget ne sera pas dépassé automatiquement.</p>';
      }
      var shown = all ? eligible : eligible.slice(0, 3);
      var complete = shown.filter(function (r) { return r.complete; }), partial = shown.filter(function (r) { return !r.complete; });
      if (complete.length) html += '<h4>Scores complets</h4>' + complete.map(function (r) { return card(r, eligible); }).join('');
      if (partial.length) html += '<h4>Comparaisons partielles · données manquantes</h4>' + partial.map(function (r) { return card(r, eligible); }).join('');
      if (eligible.length > 3) html += '<button type="button" data-student-all>' + (all ? 'Réduire la sélection' : 'Voir tous les modèles correspondants (' + eligible.length + ')') + '</button>';
      if (result.verify.length) html += '<details id="student-verify"><summary>À vérifier : ' + result.verify.length + ' modèles avec un indispensable inconnu</summary>' + result.verify.map(function (r) { return card(r, []); }).join('') + '</details>';
      return html + '<p><button type="button" data-student-quiz>Reprendre ces réponses dans Mes critères</button></p><p id="student-import-status" role="status"></p>';
    }
    function render(focus) {
      var a = state.answers, step = state.step;
      var body = '<p>Étape ' + Math.min(step + 1, 4) + ' sur 4. Aucune préférence pour la photo, le poids ou la recharge n’est présumée.</p>';
      if (step === 0) body += '<h3 id="student-step-title" tabindex="-1">Votre budget maximal</h3>' + input('budget', 'Budget maximal en euros', a.budget, 'required') + '<p>Ce plafond est strict. Préférer dépenser moins est une priorité distincte, proposée ensuite. Les prix du catalogue sont indicatifs.</p>';
      if (step === 1) body += '<fieldset><legend id="student-step-title" tabindex="-1">Votre usage principal</legend>' + Object.keys(usageLabels).map(function (k) { return '<label><input type="radio" name="usage" value="' + k + '"' + checked(k === a.usage) + '>' + usageLabels[k] + '</label>'; }).join('') + '</fieldset><p>Quotidien : potentiel de fluidité. Jeux : performance soutenue mesurée, sans compter une seconde fois la puissance théorique. Photo : qualité testée, pas nombre de mégapixels. Ce choix est un souhait ; utilisez les exigences strictes si vous refusez un compromis.</p>';
      if (step === 2) body += '<fieldset><legend id="student-step-title" tabindex="-1">Vos priorités · deux maximum</legend>' + Object.keys(priorityLabels).map(function (k) { return '<label><input type="checkbox" name="priority" value="' + k + '"' + checked(a.priorities.indexOf(k) >= 0) + '>' + priorityLabels[k] + '</label>'; }).join('') + '</fieldset><p id="student-priority-status" role="status">Chaque priorité multiplie son poids par 1,5 ; le total est ramené à 100.</p><p>Base proposée et modifiable : coût 30, autonomie réelle 25, support restant 20, fluidité quotidienne 15, stockage 10. Une priorité ne constitue pas une exigence stricte.</p><label>Stockage souhaité (préférence, pas minimum obligatoire)<select name="storageTarget">' + [128, 256, 512].map(function (n) { return '<option value="' + n + '"' + (a.storageTarget === n ? ' selected' : '') + '>' + n + ' Go</option>'; }).join('') + '</select></label>';
      if (step === 3) body += '<fieldset><legend id="student-step-title" tabindex="-1">Compromis acceptables · facultatifs</legend>' + Object.keys(compromiseLabels).map(function (k) { return '<label><input type="checkbox" name="compromise" value="' + k + '"' + checked(a.compromises.indexOf(k) >= 0) + '>' + compromiseLabels[k] + '</label>'; }).join('') + '</fieldset><p>Photo de nuit ou jeux moins exigeants : poids photo ou jeu réduit de 25 % s’il est actif. Plus lourd ou recharge lente : le bonus secondaire correspondant ne départage plus. Aucun compromis ne supprime un indispensable.</p><details><summary>Ajouter des exigences indispensables (facultatif)</summary><p>Une incompatibilité connue exclut le téléphone. Une information inconnue le place dans « À vérifier ».</p>' + input('minStorage', 'Stockage minimal en Go', a.strict.minStorage) + input('minRuntime', 'Autonomie mesurée minimale en heures', a.strict.minRuntime) + input('minSupport', 'Support restant minimal en années', a.strict.minSupport) + input('maxWeight', 'Poids maximal en grammes', a.strict.maxWeight) + input('minCharge', 'Recharge minimale en watts', a.strict.minCharge) + '<label><input type="checkbox" name="night"' + checked(a.strict.night) + '>Photo de nuit testée satisfaisante indispensable</label><label><input type="checkbox" name="sustained"' + checked(a.strict.sustained) + '>Jeu soutenu testé au moins à 7/10 indispensable</label></details>';
      el.innerHTML = summary() + (step < 4 ? '<form id="student-form">' + body + '<div class="student-actions">' + (step > 0 ? '<button type="button" data-student-back>Retour</button>' : '') + '<button type="submit">' + (step === 3 ? 'Voir ma sélection' : 'Continuer') + '</button></div></form>' : results());
      if (focus) { var title = el.querySelector('#student-step-title, #student-results-title'); if (title) title.focus({ preventScroll: true }); }
    }
    function capture() {
      var form = el.querySelector('form'); if (!form) return;
      var data = new FormData(form), a = state.answers;
      if (state.step === 0) a.budget = Number(data.get('budget')) || null;
      if (state.step === 1) a.usage = data.get('usage') || a.usage;
      if (state.step === 2) { a.priorities = data.getAll('priority').slice(0, 2); a.storageTarget = Number(data.get('storageTarget')); }
      if (state.step === 3) { a.compromises = data.getAll('compromise'); Object.keys(E.STRICT).forEach(function (k) { a.strict[k] = ['night', 'sustained'].indexOf(k) >= 0 ? data.has(k) : Number(data.get(k)) || null; }); }
      state.answers = E.sanitize(a); save();
    }
    el.addEventListener('change', function (event) {
      if (event.target.name === 'priority' && el.querySelectorAll('[name="priority"]:checked').length > 2) { event.target.checked = false; el.querySelector('#student-priority-status').textContent = 'Deux priorités maximum. Décochez une priorité pour en choisir une autre.'; }
      capture();
    });
    el.addEventListener('submit', function (event) { event.preventDefault(); if (!event.target.checkValidity()) return; capture(); state.step = Math.min(4, state.step + 1); all = false; save(); render(true); });
    el.addEventListener('click', function (event) {
      var b = event.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-student-reset')) { state = { answers: E.sanitize({}), step: 0 }; all = false; try { localStorage.removeItem(KEY); } catch (_) {} root.dispatchEvent(new CustomEvent('guide:student-reset')); render(true); }
      if (b.hasAttribute('data-student-step')) { capture(); state.step = Number(b.dataset.studentStep); save(); render(true); }
      if (b.hasAttribute('data-student-back')) { capture(); state.step--; save(); render(true); }
      if (b.hasAttribute('data-student-all')) { all = !all; render(false); el.querySelector('[data-student-all]').focus({ preventScroll: true }); }
      if (b.hasAttribute('data-student-quiz')) {
        root.dispatchEvent(new CustomEvent('guide:student-criteria', { detail: { answers: state.answers } }));
        document.getElementById('tab-criteres').click();
        document.getElementById('tab-criteres').focus();
      }
    });
    render(false);
    return { activate: function (active) { el.hidden = !active; } };
  }
  root.StudentJourney = { mount: mount, KEY: KEY };
})(window);
