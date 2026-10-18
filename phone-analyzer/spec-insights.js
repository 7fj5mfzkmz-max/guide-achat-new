(function(root){
'use strict';
function num(v,re){var m=String(v==null?'':v).match(re);return m?Number(String(m[1]).replace(',','.')):null;}
function level(v){return v==='good'?'good':v==='warn'?'warn':v==='bad'?'bad':'neutral';}
function verdict(profile,key,value,ctx){
 ctx=ctx||{};var v=String(value==null?'':value),out={level:'neutral',label:'À interpréter',why:''};
 function set(l,label,why){out={level:level(l),label:label,why:why};}
 if(ctx.pc)return verdictPc(profile,key,v,set,out);
 if(key==='ram'){var n=num(v,/(\d+(?:[.,]\d+)?)\s*(?:go|gb)/i);if(n==null)return out;
  if(profile==='gamer'&&!ctx.apple){set(n>=12?'good':n>=8?'warn':'bad',n>=12?'Très confortable pour jouer':n>=8?'Correct, mais limite pour les jeux récents':'Insuffisant pour jouer confortablement','Pour les jeux lourds, 12 Go offrent plus de marge ; 8 Go restent corrects pour beaucoup de jeux.');}
  else if(profile==='professionnel'){set(n>=8?'good':n>=6?'warn':'bad',n>=8?'Confortable pour applications et fichiers lourds':'Correct pour un usage professionnel courant','8 Go permettent de garder plusieurs applications ouvertes ; les grands fichiers, plans et tableurs demandent aussi une puce efficace.');}
  else if(profile==='photographe'){set(n>=12?'good':n>=8?'warn':'bad',n>=12?'Très confortable pour la photo et le montage':'Correct pour photographier','La RAM aide à garder applications et photos ouvertes ; elle ne remplace pas la qualité du capteur.');}
  else{set(n>=8?'good':n>=6?'warn':'bad',n>=8?'Confortable pour le multitâche':'Suffisant pour un usage simple','Pour les usages courants, 6 à 8 Go suffisent généralement.');}
  return out;}
 if(key==='stockage'){var st=num(v,/(\d+(?:[.,]\d+)?)\s*(?:go|gb|to|tb)/i);if(st==null)return out;var gb=st*(/to|tb/i.test(v)?1024:1);
  if(profile==='photographe'){set(gb>=256?'good':gb>=128?'warn':'bad',gb>=256?'Espace confortable pour photos et vidéos':gb>=128?'Correct, à surveiller avec beaucoup de vidéos':'Limité pour beaucoup de photos/vidéos','Les photos et vidéos 4K occupent vite de la place.');}
  else if(profile==='professionnel'){set(gb>=256?'good':gb>=128?'warn':'bad',gb>=256?'Espace confortable pour documents et fichiers':'Correct pour documents courants','Les plans, PDF, photos de chantier et fichiers bureautiques occupent rapidement de l’espace.');}
  else{set(gb>=256?'good':gb>=128?'warn':'bad',gb>=256?'Espace confortable':'Correct pour un usage courant','128 Go conviennent à un usage simple ; 256 Go évitent de gérer l’espace.');}
  return out;}
 if(key==='batterie'){var b=num(v,/(\d{3,5})\s*mah/i);if(b==null)return out;
  if(profile==='gamer'){set(b>=5500?'good':b>=5000?'warn':'bad',b>=5500?'Grande batterie, favorable aux longues sessions':b>=5000?'Batterie standard':'Batterie limitée pour le jeu intensif','En jeu, l’autonomie baisse vite : capacité, efficacité et chauffe comptent.');}
  else if(profile==='professionnel'){set(b>=5000?'good':b>=4500?'warn':'bad',b>=5000?'Favorable pour une journée d’appels et de déplacements':'Autonomie à vérifier en usage réel','Pour les appels, la navigation et la visio, une batterie de 5 000 mAh ou plus aide ; l’autonomie réelle dépend surtout des tests.');}
  else{set(b>=5000?'good':b>=4500?'warn':'bad',b>=5000?'Autonomie potentiellement confortable':'Autonomie à vérifier en usage réel','La capacité est un indicateur, pas une mesure.');}
  return out;}
 if(key==='charge'){var w=num(v,/(\d{2,3})\s*w\b/i);if(w==null)return out;
  set(w>=67?'good':w>=33?'warn':'bad',w>=67?'Recharge rapide':w>=33?'Recharge correcte':'Recharge lente','Une recharge rapide aide surtout en déplacement ; le chargeur fourni compte aussi.');return out;}
 if(key==='refresh'){var hz=num(v,/(\d{2,3})\s*hz/i);if(hz==null)return out;
  if(profile==='gamer'){set(hz>=120?'good':hz>=90?'warn':'bad',hz>=120?'Écran fluide pour les jeux':hz>=90?'Fluidité correcte':'60 Hz limite la fluidité','Un écran 120 Hz rend les déplacements plus fluides ; il ne garantit pas un framerate stable.');}
  else{set(hz>=120?'good':hz>=90?'warn':'bad',hz>=120?'Affichage fluide au quotidien':'Affichage standard','120 Hz rend le défilement plus fluide.');}
  return out;}
 if(key==='ecran'){var oled=/oled|amoled|ltpo/i.test(v),bright=num(v,/(\d{3,4})\s*(?:nits|cd\/m)/i);
  if(profile==='professionnel'){set(oled&&bright>=1500?'good':oled?'warn':'bad',oled&&bright>=1500?'Lisible dehors et confortable':'Écran à considérer selon l’usage','Pour travailler dehors, la luminosité réelle compte autant que la technologie.');}
  else{set(oled?'good':'neutral',oled?'Bel affichage':'Écran standard','La technologie influence contraste et confort.');}
  return out;}
 if(key==='photo'){var tele=/telephoto|periscope|téléobjectif/i.test(v),ois=/ois|stabilisation optique/i.test(v);
  if(profile==='photographe'){set(tele&&ois?'good':(ois||tele)?'warn':'bad',tele&&ois?'Configuration photo intéressante':(ois||tele)?'Photo correcte, avec des limites':'Photo basique','Capteur, OIS et téléobjectif comptent plus que les mégapixels.');}
  else{set(ois?'good':'neutral',ois?'Stabilisation optique présente':'Photo à évaluer selon vos besoins','L’OIS aide en basse lumière et en vidéo.');}
  return out;}
 if(key==='processeur'){var high=/snapdragon\s*8|dimensity\s*9|a1[7-9]|a2\d|tensor\s*g[4-5]/i.test(v),mid=/snapdragon\s*7|dimensity\s*[678]|exynos\s*1|tensor\s*g[23]|a1[0-6]/i.test(v);
  if(profile==='gamer'){set(high?'good':mid?'warn':'bad',high?'Puce adaptée aux jeux exigeants':mid?'Correct pour les jeux courants':'Peu adapté aux jeux exigeants','La puissance brute ne garantit pas des FPS stables sans refroidissement.');}
  else if(profile==='professionnel'){set(high?'good':mid?'warn':'bad',high?'Réactif pour fichiers et multitâche':'Correct pour la bureautique','Pour les plans, tableurs lourds et visioconférences, une puce récente évite les ralentissements.');}
  else{set(high?'good':mid?'warn':'bad',high?'Très réactif':'Correct pour l’usage courant','Une puce récente rend les applications plus fluides.');}
  return out;}
 if(key==='etancheite'){var ip=num(v,/ip\s*(\d{2})/i);
  if(ip==null)return out;
  if(profile==='professionnel'){set(ip>=68?'good':ip>=67?'warn':'bad',ip>=68?'Intéressant pour les environnements exigeants':'Protection limitée','IP68 aide contre poussière et projections, mais ne garantit pas une immersion prolongée.');}
  else{set(ip>=68?'good':ip>=67?'warn':'bad',ip>=68?'Bonne résistance aux projections':'Résistance limitée','IP68 protège mieux que IP67, sans garantie d’immersion prolongée.');}
  return out;}
 return out;
}
/* Verdicts « PC portables » : seuils et vocabulaire propres aux ordinateurs
   portables (RAM 16/32 Go, GPU dédié ou intégré, poids, Wh). Un GPU intégré
   n'est pas un défaut absolu : le verdict dépend du profil demandé. */
function verdictPc(profile,key,v,set,out){
 var n;
 if(key==='ram'){n=num(v,/(\d+(?:[.,]\d+)?)\s*(?:go|gb)/i);if(n==null)return out;
  if(profile==='gamer'){set(n>=32?'good':n>=16?'warn':'bad',n>=32?'Confortable pour les jeux récents':n>=16?'16 Go justes pour les jeux lourds':'Insuffisant pour jouer confortablement','16 Go font tourner la plupart des jeux ; 32 Go gardent de la marge pour les jeux récents et le multitâche.');}
  else if(profile==='createur'){set(n>=32?'good':n>=16?'warn':'bad',n>=32?'Confortable pour le montage':'16 Go limite pour les gros projets','Le montage et les maquettes profitent de 32 Go ; 16 Go restent corrects pour des projets moyens.');}
  else{set(n>=16?'good':n>=8?'warn':'bad',n>=16?'Confortable pour le multitâche':n>=8?'Correct pour un usage courant':'Juste pour un usage confortable','16 Go sont devenus le standard confortable ; 8 Go demandent des compromis dès qu\'on multiplie les onglets.');}
  return out;}
 if(key==='gpu'){var rtx=num(v,/rtx\s*(\d{4})/i),igpu=/intégré|iris|uhd|adreno|radeon intégr|graphics intégr|arc intégré/i.test(v);
  if(profile==='gamer'){var g=rtx!=null?((rtx%1000)>=70?9:(rtx%1000)>=60?7.5:6):(igpu?3:5);
   set(g>=7.5?'good':g>=5?'warn':'bad',rtx!=null&&(rtx%1000>=70)?'Carte haut de gamme, idéale en jeu':igpu?'Pas de carte dédiée':'Carte d\'entrée de gamme gaming',igpu?'Sans carte dédiée, seuls les jeux légers tournent bien ; le niveau de détail reste bas.':'Le nom de la carte ne dit pas tout : les watts (TGP) et le refroidissement changent les FPS réels.');return out;}
  if(profile==='createur'){set(igpu?'warn':'good',igpu?'Correct pour la retouche légère':'Carte dédiée, utile en montage',igpu?'Un GPU intégré suffit pour la photo ; le montage 4K profitera d\'une carte dédiée.':'L\'accélération matérielle accélère le rendu et l\'export.');return out;}
  set(igpu?'good':'neutral',igpu?'Suffisant pour la bureautique et les cours':'Carte dédiée (consommation à considérer)',igpu?'Pour écrire, naviguer et visio, le GPU intégré suffit largement.':'Une carte dédiée consomme plus : autonomie et poids en pâtissent si vous n\'en avez pas l\'usage.');return out;}
 if(key==='poids'){n=num(v,/(\d(?:[.,]\d{1,2})?)\s*kg/i);if(n==null)return out;
  if(profile==='etudiant'||profile==='professionnel'){set(n<=1.5?'good':n<=2.2?'warn':'bad',n<=1.5?'Facile à transporter toute la journée':n<=2.2?'Transportable, un peu lourd':'Peu adapté au transport quotidien','1,5 kg ou moins se transportent sans y penser ; au-delà de 2,2 kg, le transport quotidien se ressent.');}
  else{set(n<=2.5?'good':'neutral',n<=2.5?'Poids raisonnable pour sa catégorie':'Machine orientée bureau de jeu','Les PC de jeu dépassent souvent 2,5 kg : c\'est un choix d\'usage, pas un défaut.');}
  return out;}
 if(key==='batterie'){n=num(v,/(\d{2,3})\s*wh/i);if(n==null)return out;
  set(n>=80?'good':n>=60?'warn':'bad',n>=80?'Grande batterie':'Batterie standard','La capacité (Wh) est un indicateur : l\'autonomie réelle dépend de la puce, de l\'écran et des tests.');return out;}
 if(key==='ecran'){var oled=/oled/i.test(v),hz=num(v,/(\d{2,3})\s*hz/i);
  if(profile==='gamer'||profile==='createur'){set(hz>=120?'good':oled?'warn':'neutral',hz>=120?'Écran fluide'+(oled?', de qualité':''):oled?'Belle image, mais 60 Hz':'Écran standard','120 Hz rendent le jeu et le défilement plus fluides ; l\'OLED ajoute contraste et couleurs.');return out;}
  set(oled||hz>=120?'good':'neutral',oled?'Écran de qualité':'Écran correct','La technologie et la fluidité comptent plus que la diagonale.');return out;}
 if(key==='processeur'){var strong=/apple m\d|ryzen ai|core ultra|ryzen [79]|i[79]-\d/i.test(v);
  set(strong?'good':'neutral',strong?'Processeur récent et véloce':'Processeur à évaluer selon l\'usage','Un processeur récent garde la machine fluide plusieurs années ; le modèle exact détermine le niveau.');return out;}
 return out;
}
var api={verdict:verdict};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhoneSpecInsights=api;
})(typeof window!=='undefined'?window:globalThis);
