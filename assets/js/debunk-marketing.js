/**
 * Décoder le marketing : ce que la boîte annonce, ce qui se passe vraiment, ce que vous pouvez faire.
 * Chaque carte a un schéma. Aucun chiffre ici n'est une mesure : ce sont des ordres de grandeur d'explication.
 */
(function () {
  "use strict";

  var debunks = [
    { terme: '120 Hz', marketing: 'Écran plus fluide, donc meilleur téléphone.',
      realite: 'À 120 Hz, l’écran change d’image deux fois plus souvent qu’à 60 Hz. Vous le voyez quand vous faites défiler une page ou que vous jouez. Devant une photo ou une vidéo à 24 images par seconde, il n’y a aucune différence.',
      impact: 'Utile si vous défilez beaucoup ou jouez. La batterie baisse un peu plus vite : regardez si l’écran peut redescendre à 60 Hz tout seul (LTPO).',
      vis: [['refresh', '60', '60 Hz'], ['refresh', '120', '120 Hz']] },
    { terme: '4 500 nits', marketing: 'Écran ultra lumineux, lisible en plein soleil.',
      realite: 'Le chiffre affiché est un pic : une petite zone blanche, pendant quelques secondes. Pour lire une page entière dehors, ce qui compte, c’est la luminosité que l’écran tient longtemps.',
      impact: 'Cherchez la luminosité « typique » ou « en plein soleil » dans un test. Sous 800 nits, on lit mal dehors ; autour de 1 500, c’est confortable.',
      vis: [['brightness', '600', 'écran faible'], ['brightness', '2500', 'écran très lumineux']] },
    { terme: '5 000 mAh', marketing: 'Grosse batterie, donc autonomie énorme.',
      realite: 'Les mAh indiquent la taille du réservoir, pas la consommation. Deux téléphones avec 5 000 mAh peuvent tenir une journée ou deux, selon l’écran et la puce qui vident le réservoir.',
      impact: 'Prenez les mAh comme un point de départ, puis cherchez un test d’autonomie (vidéo en continu, par exemple) fait dans les mêmes conditions pour les deux modèles.',
      vis: [['capacity', '5000', 'taille du réservoir']] },
    { terme: 'Charge 120 W', marketing: 'De 0 à 100 % en quelques minutes.',
      realite: 'La puissance maximale ne dure pas : le téléphone charge vite au début, puis ralentit pour protéger la batterie. Et dans beaucoup de boîtes en Europe, le chargeur n’est plus fourni.',
      impact: 'Regardez le temps de 0 à 50 % et de 0 à 100 % dans un test, et vérifiez si le chargeur est dans la boîte. Au-delà de 45 W, le gain au quotidien est souvent petit.',
      vis: [['x:chargecurve', '', 'la charge ralentit vers 80 %'], ['charge', '100', '100 W : temps indicatif']] },
    { terme: 'RAM 12 Go', marketing: 'Plus de mémoire, donc plus rapide.',
      realite: 'La RAM est la table de travail : elle garde vos applications ouvertes. Avec une table plus grande que ce que vous posez dessus, rien ne va plus vite. La vitesse vient surtout de la puce.',
      impact: '8 Go suffisent pour presque tout. Plus de RAM sert si vous gardez beaucoup d’applications ouvertes en même temps.',
      vis: [['x:ram', '8', '8 Go'], ['x:ram', '12', '12 Go']] },
    { terme: 'Processeur 8 cœurs', marketing: 'Huit cœurs, huit fois plus puissant.',
      realite: 'Le nombre de cœurs ne dit pas la vitesse : chaque cœur peut être lent ou rapide. Une puce d’entrée de gamme et une puce haut de gamme ont souvent toutes les deux huit cœurs.',
      impact: 'Ne comparez pas les cœurs. Comparez le nom exact de la puce (par exemple Snapdragon 7 Gen 3 contre Helio G85) dans un test.',
      vis: [['reference', 'basic', '8 cœurs, entrée de gamme'], ['reference', 'high', '8 cœurs, haut de gamme']] },
    { terme: 'Score AnTuTu', marketing: 'La puce la plus puissante du marché.',
      realite: 'Un score de benchmark se mesure sur quelques minutes, quand le téléphone est encore froid. Après 20 minutes de jeu, beaucoup de téléphones chauffent et ralentissent.',
      impact: 'Cherchez un test de « stabilité » : il montre si la performance reste la même après 20 à 30 minutes. C’est ce qui compte pour jouer ou filmer longtemps.',
      vis: [['reference', 'high', 'score au départ'], ['x:thermal', '', 'après chauffe']] },
    { terme: '200 mégapixels', marketing: 'Plus de pixels, donc photos magnifiques.',
      realite: 'Le capteur a une taille fixe. Y loger 200 millions de pixels, c’est découper la même surface en minuscules cases : chacune capte très peu de lumière, d’où plus de bruit et de flou, surtout le soir.',
      focus: 'Regardez le schéma : même capteur, mais beaucoup plus de cases. Chaque case reçoit moins de lumière.',
      impact: 'Entre 12 et 50 mégapixels avec un grand capteur, vos photos seront souvent meilleures qu’avec 200 mégapixels sur un petit capteur.',
      vis: [['x:cells', '12', 'capteur 12 MP'], ['x:cells', '200', 'même capteur, 200 MP']] },
    { terme: 'Zoom ×100', marketing: 'Photographiez la lune, lisez une enseigne très loin.',
      realite: 'Au-delà du zoom du vrai téléobjectif (×3 à ×5 en général), le téléphone agrandit l’image existante et invente les détails avec du logiciel. Plus on zoome, plus c’est flou ou artificiel.',
      impact: 'Regardez le grossissement du téléobjectif optique, pas le chiffre en gros sur la boîte. ×3 ou ×5 optique est plus utile que ×100 numérique.',
      vis: [['zoom', 'digital', 'zoom ×100 : image agrandie'], ['zoom', '5x', 'téléobjectif ×5']] },
    { terme: 'Photo boostée par l’IA', marketing: 'Des photos de pro grâce à l’intelligence artificielle.',
      realite: 'Le logiciel améliore vraiment les couleurs, le contraste et la nuit. Mais il ne remplace pas la lumière captée par le capteur, et il lisse parfois trop les visages et les détails fins.',
      impact: 'Comparez des photos de nuit et de visages dans un test, pas juste le nom de la fonction. Un grand capteur donne une meilleure base à l’IA.',
      vis: [['sensor', 'small', 'petit capteur + IA'], ['sensor', 'large', 'grand capteur']] },
    { terme: 'IP68', marketing: 'Étanche à tout, même sous l’eau.',
      realite: 'IP68 veut dire : protégé de la poussière et de l’immersion, mais dans les conditions d’un test choisies par le fabricant, en eau douce. L’eau salée, le chlore et la vapeur sont hors test.',
      impact: 'Tranquille sous la pluie, avec un verre renversé, ou une chute dans un évier. À éviter : mer, piscine, douche chaude. La garantie ne couvre souvent pas l’eau.',
      vis: [['protection', 'ip68', 'conditions du fabricant']] },
    { terme: 'Verre ultra résistant', marketing: 'Le verre le plus solide jamais fabriqué.',
      realite: 'Un verre « Victus » ou « Armor » résiste mieux aux chocs et aux rayures que le précédent. Il ne devient pas incassable : une chute sur un coin le fissure encore.',
      impact: 'Une coque et un verre de protection restent une bonne idée. Regardez aussi si l’écran est réparable à un prix raisonnable.',
      vis: [['x:glass', '', 'résiste mieux, pas incassable']] },
    { terme: '7 ans de mises à jour', marketing: 'Un téléphone qui reste à jour pendant 7 ans.',
      realite: 'C’est une promesse sur le logiciel, pas sur la batterie. La batterie s’use en 3 à 4 ans, et les mises à jour peuvent devenir plus lentes à arriver sur la fin.',
      impact: 'Vérifiez si la promesse couvre les mises à jour du système ET de sécurité, et si la batterie se change facilement et à bon prix.',
      vis: [['updates', '7', '7 ans'], ['repair', 'low', 'batterie difficile à changer']] },
    { terme: '5G', marketing: 'Un Internet beaucoup plus rapide partout.',
      realite: 'La 5G dépend de l’antenne près de chez vous et de la bande utilisée. En ville, la différence se voit sur de gros téléchargements. Pour les réseaux sociaux, la vidéo et la navigation, la 4G suffit encore.',
      impact: 'Une 5G sur un téléphone d’entrée de gamme ne rend pas l’appareil plus rapide. Vérifiez la couverture 5G de votre opérateur chez vous avant de payer plus pour ça.',
      vis: [['x:net', '', '4G contre 5G (schéma)']] }
  ];

  function visuals(d) {
    var A = window.AuditVisuals; if (!A || !d.vis) return '';
    return '<div class="hx-debunk-visual">' + d.vis.map(function (v) {
      var spec = v[0].indexOf('x:') === 0 ? [A.X && A.X[v[0].slice(2)], v[1]] : [v[0], v[1]];
      if (!spec[0]) return '';
      return '<figure>' + (A.render2 ? A.render2(spec) : A.render(v[0], v[1])) + '<figcaption>' + v[2] + '</figcaption></figure>';
    }).join('') + '</div>';
  }

  function initDebunkCards() {
    var container = document.querySelector('[data-debunk-container]');
    if (!container) return;
    container.innerHTML = debunks.map(function (d, i) {
      return '<div class="hx-debunk-card" style="--delay:' + (i * 0.05) + 's">' +
        '<div class="hx-debunk-header"><strong>' + d.terme + '</strong></div>' +
        visuals(d) + (d.focus ? '<p class="hx-debunk-focus">' + d.focus + '</p>' : '') +
        '<div class="hx-debunk-section"><span class="hx-debunk-label is-marketing">Ce qu’on vous dit</span><p>' + d.marketing + '</p></div>' +
        '<div class="hx-debunk-section"><span class="hx-debunk-label is-realite">Ce qui se passe vraiment</span><p>' + d.realite + '</p></div>' +
        '<div class="hx-debunk-section is-impact"><span class="hx-debunk-label">Ce que vous pouvez faire</span><p>' + d.impact + '</p></div>' +
        '<a class="hx-debunk-more" href="lexique.html">Comprendre ce mot dans le lexique →</a>' +
        '</div>';
    }).join('');
    window.dispatchEvent(new Event('debunk:ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDebunkCards);
  } else {
    requestAnimationFrame(initDebunkCards);
  }
  window.addEventListener('load', initDebunkCards);

  window.DebunkMarketing = { debunks: debunks };
})();
