(function(root){
'use strict';
function num(v,re){var m=String(v==null?'':v).match(re);return m?Number(String(m[1]).replace(',','.')):null;}
function level(v){return v==='good'?'good':v==='warn'?'warn':v==='bad'?'bad':'neutral';}
function verdict(profile,key,value,ctx){
 ctx=ctx||{};var v=String(value==null?'':value),out={level:'neutral',label:'À interpréter',why:''};
 function set(l,label,why){out={level:level(l),label:label,why:why};}
 if(ctx.pc){verdictPc(profile,key,v,set);return out;}
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
/* Verdicts « PC portables » : un même barème pour tous les modèles, lu selon le
   profil. Chaque caractéristique reçoit une note 0-9 (celle du score global,
   phone-analyzer/spec-score.js) ; le verdict compare cette note au niveau
   RÉELLEMENT utile pour le profil : bon = marge confortable, moyen = suffisant
   sans marge, faible = en dessous du besoin. Une valeur illisible ne donne
   aucun verdict (jamais un défaut). */
var NEED={ /* niveau minimal utile (0-9) par profil et par caractéristique */
 etudiant:{processeur:3.5,ram:4,stockage:3,ecran:4,gpu:0,os:5,longevite:4},
 professionnel:{processeur:5,ram:5.5,stockage:4.5,ecran:5,gpu:0,os:6,longevite:5},
 gamer:{processeur:6,ram:7,stockage:6.5,ecran:5.5,gpu:6.5,os:6.5,longevite:5},
 createur:{processeur:6,ram:7,stockage:6.5,ecran:6.5,gpu:4,os:6.5,longevite:5}
};
var PROFILE_NAME={etudiant:'étudiant',professionnel:'professionnel',gamer:'joueur',createur:'créateur'};
function scorer(){
 var S=root.PhoneAnalyzerSpecScore;
 if(!S&&typeof require==='function'){try{S=require('./spec-score.js');}catch(e){S=null;}}
 return S;
}
function lvl(score,need){return score>=need+1.5?'good':score>=need?'warn':'bad';}
function verdictPc(profile,key,v,set){
 var S=scorer();if(!S||!S.helpers)return;
 var H=S.helpers,need=(NEED[profile]||NEED.etudiant),who=PROFILE_NAME[profile]||'étudiant',sc=null,n;
 if(key==='ram'){sc=H.pcRamScore(v);if(sc==null)return;n=num(v,/(\d+(?:[.,]\d+)?)\s*(?:go|gb)/i);
  var l=lvl(sc,need.ram);
  set(l,l==='good'?'Confortable pour ce profil':l==='warn'?'Juste suffisante, sans marge':'Insuffisante pour ce profil',
   n+' Go : '+(n<=8?'la mémoire est souvent soudée et ne pourra pas être augmentée ; dès que les onglets et logiciels s\'accumulent, la machine ralentit.':n<16?'correct aujourd\'hui, mais la marge se réduit avec les années.':'confortable et durable.')+' Profil '+who+' : il faut au moins '+(need.ram>=7?'16':need.ram>=5.5?'16':'8')+' Go pour être serein.');return;}
 if(key==='stockage'){sc=H.pcStorageScore(v);if(sc==null)return;
  var l2=lvl(sc,need.stockage),emmc=/emmc|ufs/i.test(v);
  set(l2,l2==='good'?'Espace confortable':l2==='warn'?'Correct, à surveiller':'Trop juste',
   (emmc?'Le stockage eMMC est plus lent qu\'un SSD et non remplaçable. ':'')+'Windows, les applications et les mises à jour occupent vite 60 à 100 Go ; 256 Go sont le minimum confortable, 512 Go évitent de gérer l\'espace.');return;}
 if(key==='processeur'){sc=H.pcCpuScore(v);if(sc==null)return;
  var l3=lvl(sc,need.processeur);
  set(l3,l3==='good'?'Puissance confortable':l3==='warn'?'Suffisant pour l\'essentiel':'Trop limité pour ce profil',
   sc<=4?'Processeur d\'entrée de gamme : correct pour naviguer et écrire, mais il peine avec plusieurs applications, la visio chargée ou le montage.':sc<=6?'Processeur milieu de gamme : fluide pour la bureautique et le multitâche courant.':'Processeur puissant : garde la machine réactive plusieurs années.');return;}
 if(key==='gpu'){var rtx=num(v,/rtx\s*(\d{4})/i),sg=H.pcGpuScore?H.pcGpuScore(v):null;
  if(profile==='gamer'||profile==='createur'){if(sg==null)return;var l4=lvl(sg,need.gpu);
   set(l4,l4==='good'?'Carte adaptée':l4==='warn'?'Correcte, sans marge':(sg<=4?'Pas de carte dédiée':'Carte limitée'),sg<=4?'Sans carte graphique dédiée, seuls les jeux légers tournent bien et le montage lourd sera lent.':'Le nom de la carte ne dit pas tout : la puissance électrique (TGP) et le refroidissement changent les performances réelles.');return;}
  set(sg!=null&&sg<=4?'good':'neutral',sg!=null&&sg<=4?'Suffisant pour votre usage':'Carte dédiée (consommation à considérer)',sg!=null&&sg<=4?'Pour écrire, naviguer et suivre des cours, le GPU intégré suffit largement.':'Une carte dédiée consomme plus : autonomie et poids en pâtissent si vous n\'en avez pas l\'usage.');return;}
 if(key==='ecran'){sc=H.pcEcranScore({ecran:v});
  if(sc==null){return;}
  var l5=lvl(sc,need.ecran);
  set(l5,l5==='good'?'Écran de bonne qualité':l5==='warn'?'Écran correct':'Écran d\'entrée de gamme',
   sc<=4.5?'Définition ou dalle basique : textes moins fins, couleurs et angles de vue limités. Acceptable pour un budget serré, fatigant sur de longues journées.':sc<=6.5?'Bon compromis : lisible et net pour le travail et les vidéos.':'Écran soigné : contraste et finesse apportent un vrai confort.');return;}
 if(key==='os'){sc=H.pcOsScore(v);if(sc==null)return;
  var chrome=/chrome\s*os/i.test(v);
  var l6=chrome?(profile==='etudiant'?'warn':'bad'):lvl(sc,need.os);
  set(l6,chrome?'Système limité (ChromeOS)':l6==='bad'?'Système à installer ou limité':'Système complet',
   chrome?'ChromeOS fait tourner le web et les applications Android/Google, mais pas les logiciels Windows ou Mac (suite Office complète, jeux PC, logiciels de montage ou de CAO) : à réserver à un usage simple, en ligne.':l6==='bad'?'Sans système fourni, il faut acheter et installer une licence ; certains logiciels ne fonctionnent pas sous Linux.':'Compatible avec la quasi-totalité des logiciels courants.');return;}
 if(key==='poids'){n=num(v,/(\d(?:[.,]\d{1,2})?)\s*kg/i);if(n==null)return;
  if(profile==='etudiant'||profile==='professionnel'){set(n<=1.5?'good':n<=2.2?'warn':'bad',n<=1.5?'Facile à transporter toute la journée':n<=2.2?'Transportable, un peu lourd':'Peu adapté au transport quotidien','1,5 kg ou moins se transportent sans y penser ; au-delà de 2,2 kg, le transport quotidien se ressent.');}
  else{set(n<=2.5?'good':'neutral',n<=2.5?'Poids raisonnable pour sa catégorie':'Machine orientée bureau de jeu','Les PC de jeu dépassent souvent 2,5 kg : c\'est un choix d\'usage, pas un défaut.');}
  return;}
 if(key==='batterie'){n=num(v,/(\d{2,3})\s*wh/i);if(n==null)return;
  set(n>=80?'good':n>=50?'warn':'bad',n>=80?'Grande batterie':n>=50?'Batterie standard':'Petite batterie','La capacité (Wh) est un indicateur : l\'autonomie réelle dépend du processeur, de l\'écran et des tests.');return;}
}
var api={verdict:verdict};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PhoneSpecInsights=api;
})(typeof window!=='undefined'?window:globalThis);
