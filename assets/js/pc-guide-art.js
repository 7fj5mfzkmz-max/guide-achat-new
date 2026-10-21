/* Illustrations riches et animées des composants PC (SVG inline, animations CSS, aucune lib). */
(function(){
function g(n,f){var s='';for(var i=0;i<n;i++)s+=f(i);var o=new String(s);o.join=function(){return s};return o}
var D='<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>'+
'<linearGradient id="pg-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3f4f6"/><stop offset=".5" stop-color="#9ca3af"/><stop offset="1" stop-color="#e5e7eb"/></linearGradient>'+
'<linearGradient id="pg-die" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#020617"/></linearGradient>'+
'<linearGradient id="pg-core" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#99f6e4"/><stop offset="1" stop-color="#0d9488"/></linearGradient>'+
'<linearGradient id="pg-gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fde68a"/><stop offset=".5" stop-color="#d97706"/><stop offset="1" stop-color="#fde68a"/></linearGradient>'+
'<linearGradient id="pg-pcb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f766e"/><stop offset="1" stop-color="#064e3b"/></linearGradient>'+
'<linearGradient id="pg-card" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#0b1020"/></linearGradient>'+
'<linearGradient id="pg-chip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#374151"/><stop offset="1" stop-color="#030712"/></linearGradient>'+
'<linearGradient id="pg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1230"/><stop offset=".6" stop-color="#312e81"/><stop offset="1" stop-color="#be185d"/></linearGradient>'+
'<linearGradient id="pg-batt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86efac"/><stop offset="1" stop-color="#16a34a"/></linearGradient>'+
'<linearGradient id="pg-rgb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f43f5e"/><stop offset=".33" stop-color="#facc15"/><stop offset=".66" stop-color="#22d3ee"/><stop offset="1" stop-color="#a855f7"/></linearGradient>'+
'<linearGradient id="pg-shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'+
'<radialGradient id="pg-glow"><stop offset="0" stop-color="#5eead4" stop-opacity=".5"/><stop offset="1" stop-color="#5eead4" stop-opacity="0"/></radialGradient>'+
'<radialGradient id="pg-warm"><stop offset="0" stop-color="#fbbf24" stop-opacity=".55"/><stop offset="1" stop-color="#fbbf24" stop-opacity="0"/></radialGradient>'+
'<clipPath id="pg-clip"><rect x="64" y="38" width="272" height="158" rx="6"/></clipPath></defs></svg>';
function open(t){return '<svg viewBox="0 0 400 260" role="img" aria-label="'+t+'">'}
var A={};
/* CPU : puce, 9 cœurs qui chauffent à tour de rôle, signaux sur les pistes, anneau d’horloge */
A.cpu=open('Processeur : neuf cœurs qui s’activent à tour de rôle, signaux circulant sur les pistes')+
'<ellipse class="pg-pulse" cx="200" cy="130" rx="180" ry="115" fill="url(#pg-glow)"/>'+
'<circle class="pg-spin pg-vb" cx="200" cy="130" r="120" fill="none" stroke="#5eead4" stroke-width="2" stroke-dasharray="3 12" opacity=".8"/>'+
g(8,function(i){var x=142+i*16.5;return '<path class="pg-flow" d="M'+x+' 56V14M'+x+' 204v42" stroke="#5eead4" stroke-width="2.5" fill="none" stroke-dasharray="6 12" style="animation-delay:-'+i*.25+'s"/>'}).join('')+
g(8,function(i){var y=70+i*16.5;return '<path class="pg-flow" d="M124 '+y+'H70M276 '+y+'h54" stroke="#5eead4" stroke-width="2.5" fill="none" stroke-dasharray="6 12" style="animation-delay:-'+i*.3+'s"/>'}).join('')+
'<rect x="116" y="52" width="168" height="156" rx="16" fill="url(#pg-metal)" stroke="#64748b"/>'+
g(8,function(i){var x=140+i*16.5,y=70+i*16.5;return '<rect class="pg-pulse" style="animation-delay:-'+i*.2+'s" x="'+x+'" y="52" width="8" height="8" fill="url(#pg-gold)"/><rect class="pg-pulse" style="animation-delay:-'+i*.2+'s" x="'+x+'" y="200" width="8" height="8" fill="url(#pg-gold)"/><rect class="pg-pulse" style="animation-delay:-'+i*.2+'s" x="116" y="'+y+'" width="8" height="8" fill="url(#pg-gold)"/><rect class="pg-pulse" style="animation-delay:-'+i*.2+'s" x="276" y="'+y+'" width="8" height="8" fill="url(#pg-gold)"/>'}).join('')+
'<rect x="132" y="68" width="136" height="124" rx="8" fill="#1e293b"/><rect x="146" y="82" width="108" height="96" rx="6" fill="url(#pg-die)" stroke="#5eead4"/>'+
g(9,function(i){return '<rect class="pg-core" style="animation-delay:-'+(i*.45)+'s" x="'+(154+(i%3)*32)+'" y="'+(90+Math.floor(i/3)*28)+'" width="28" height="24" rx="4" fill="url(#pg-core)"/>'}).join('')+'</svg>';
/* Écran : verre, ciel dégradé, étoiles qui scintillent, fenêtres allumées, reflet qui balaie */
A.ecran=open('Écran : image nocturne, étoiles qui scintillent et reflet qui balaie la dalle')+
'<ellipse class="pg-pulse" cx="200" cy="120" rx="190" ry="110" fill="url(#pg-glow)"/>'+
'<rect x="50" y="24" width="300" height="186" rx="18" fill="#0f172a" stroke="#64748b" stroke-width="2"/><rect x="64" y="38" width="272" height="158" rx="6" fill="url(#pg-sky)"/>'+
g(9,function(i){return '<circle class="pg-twinkle" style="animation-delay:-'+(i*.55)+'s" cx="'+(80+i*29)+'" cy="'+(52+(i*37)%44)+'" r="1.6" fill="#fff"/>'}).join('')+
'<circle class="pg-pulse" cx="282" cy="82" r="30" fill="url(#pg-warm)"/><circle cx="282" cy="82" r="15" fill="#fef3c7"/><circle cx="276" cy="78" r="3" fill="#fde68a"/>'+
'<path d="M64 196V150h26v-24h30v34h24v-44h34v38h28v-30h30v46h24v-20h26v50z" fill="#0b1020"/>'+
g(14,function(i){return '<rect class="pg-blink" style="animation-delay:-'+(i*.7)+'s" x="'+(74+(i%7)*36)+'" y="'+(150+Math.floor(i/7)*18)+'" width="6" height="8" fill="#fcd34d"/>'}).join('')+
'<g clip-path="url(#pg-clip)"><rect class="pg-shine" x="-90" y="30" width="90" height="180" fill="url(#pg-shine)" transform="skewX(-18)"/></g>'+
'<rect x="64" y="186" width="272" height="10" fill="url(#pg-rgb)" class="pg-hue" opacity=".9" clip-path="url(#pg-clip)"/><path d="M26 214h348l-16 20H42z" fill="url(#pg-metal)"/><rect x="170" y="214" width="60" height="6" rx="3" fill="#64748b"/></svg>';
/* GPU : carte, deux ventilateurs (7 pales), caloducs, bande RVB, flux d’air et mesure d’images/s */
function blades(cx,cy,r){return g(7,function(i){return '<path d="M'+cx+' '+(cy-6)+'Q'+(cx+16)+' '+(cy-r*.7)+' '+(cx+5)+' '+(cy-r)+'Q'+(cx-10)+' '+(cy-r*.6)+' '+cx+' '+(cy-6)+'z" fill="#cbd5e1" stroke="#64748b" transform="rotate('+(i*51.43)+' '+cx+' '+cy+')"/>'}).join('')}
A.gpu=open('Carte graphique : deux ventilateurs en rotation, flux d’air et images par seconde')+
'<rect x="14" y="84" width="20" height="104" rx="3" fill="url(#pg-metal)"/><rect x="30" y="78" width="340" height="112" rx="14" fill="url(#pg-card)" stroke="#94a3b8" stroke-width="2"/>'+
'<path d="M50 96c60-14 120 12 200 0s90-8 100 2M50 108c70-12 130 10 200 0s80-6 100 2" stroke="#f59e0b" stroke-width="4" fill="none" opacity=".8"/>'+
[120,262].map(function(cx){return '<circle cx="'+cx+'" cy="134" r="46" fill="#020617" stroke="#64748b" stroke-width="2"/><g class="pg-spin pg-vb" style="transform-origin:'+cx+'px 134px">'+blades(cx,134,40)+'</g><circle class="pg-pulse" cx="'+cx+'" cy="134" r="9" fill="#5eead4"/>'}).join('')+
'<rect class="pg-hue" x="30" y="178" width="340" height="9" rx="4" fill="url(#pg-rgb)"/><rect x="90" y="190" width="150" height="12" fill="url(#pg-gold)"/>'+g(15,function(i){return '<path d="M'+(94+i*10)+' 192v10" stroke="#78350f"/>'}).join('')+
g(6,function(i){return '<circle class="pg-rise" style="animation-delay:-'+(i*.5)+'s" cx="'+(80+i*48)+'" cy="74" r="3" fill="#5eead4"/>'}).join('')+
g(5,function(i){return '<rect class="pg-bar" style="animation-delay:-'+(i*.4)+'s" x="'+(300+i*13)+'" y="26" width="8" height="40" rx="2" fill="url(#pg-core)"/>'}).join('')+'</svg>';
/* RAM : barrette, 8 puces, paquets de données qui montent vers des fenêtres d’applications */
A.ram=open('Mémoire vive : puces actives et données alimentant des fenêtres d’applications')+
g(3,function(i){var x=60+i*106;return '<g class="pg-float" style="animation-delay:-'+i*.9+'s"><rect x="'+x+'" y="18" width="92" height="56" rx="8" fill="#0f172a" stroke="#5eead4" stroke-width="2"/><rect x="'+x+'" y="18" width="92" height="12" rx="6" fill="#134e4a"/><circle cx="'+(x+10)+'" cy="24" r="2.5" fill="#f87171"/><circle cx="'+(x+19)+'" cy="24" r="2.5" fill="#fbbf24"/><rect class="pg-pulse" style="animation-delay:-'+i*.6+'s" x="'+(x+10)+'" y="40" width="'+(50+i*8)+'" height="6" rx="3" fill="#5eead4"/><rect x="'+(x+10)+'" y="52" width="'+(36+i*10)+'" height="6" rx="3" fill="#64748b"/></g>'}).join('')+
g(8,function(i){return '<circle class="pg-rise2" style="animation-delay:-'+(i*.45)+'s" cx="'+(70+i*37)+'" cy="132" r="3.5" fill="#fde68a"/>'}).join('')+
'<rect x="36" y="126" width="328" height="86" rx="8" fill="url(#pg-pcb)" stroke="#022c22" stroke-width="2"/>'+
g(8,function(i){var x=50+i*38;return '<rect x="'+x+'" y="138" width="30" height="46" rx="3" fill="url(#pg-chip)"/>'+g(3,function(j){return '<rect class="pg-core" style="animation-delay:-'+((i+j)*.3)+'s" x="'+(x+5)+'" y="'+(144+j*12)+'" width="20" height="7" rx="1.5" fill="#5eead4"/>'}).join('')}).join('')+
g(22,function(i){return '<rect class="pg-pulse" style="animation-delay:-'+(i*.12)+'s" x="'+(44+i*14.2)+'" y="212" width="9" height="14" fill="url(#pg-gold)"/>'}).join('')+'</svg>';
/* Stockage : SSD M.2, puces NAND, blocs de données qui tombent, jauge de remplissage */
A.sto=open('Stockage : un SSD qui reçoit des blocs de données et se remplit')+
g(5,function(i){var c=['#f472b6','#a78bfa','#fb923c','#38bdf8','#4ade80'][i];return '<rect class="pg-drop" style="animation-delay:-'+(i*.7)+'s" x="'+(100+i*46)+'" y="10" width="28" height="28" rx="6" fill="'+c+'"/>'}).join('')+
'<rect x="46" y="96" width="14" height="76" fill="url(#pg-gold)"/>'+g(7,function(i){return '<path d="M46 '+(102+i*10)+'h14" stroke="#78350f" stroke-width="2"/>'}).join('')+
'<rect x="58" y="86" width="296" height="96" rx="8" fill="url(#pg-pcb)" stroke="#022c22" stroke-width="2"/>'+
[76,170].map(function(x){return '<rect x="'+x+'" y="98" width="78" height="72" rx="5" fill="url(#pg-chip)" stroke="#475569"/>'+g(3,function(j){return '<rect class="pg-core" style="animation-delay:-'+((x/50+j)*.4)+'s" x="'+(x+10)+'" y="'+(108+j*18)+'" width="58" height="10" rx="2" fill="#5eead4"/>'}).join('')}).join('')+
'<rect x="268" y="112" width="44" height="44" rx="5" fill="url(#pg-chip)" stroke="#94a3b8"/><circle cx="290" cy="134" r="8" fill="#5eead4" class="pg-pulse"/><circle cx="336" cy="134" r="7" fill="#0b1020" stroke="#e5e7eb" stroke-width="2"/>'+
'<rect x="70" y="204" width="260" height="16" rx="8" fill="#0b1020" stroke="#64748b" stroke-width="2"/><rect class="pg-fillbar" x="73" y="207" width="254" height="10" rx="5" fill="url(#pg-core)"/></svg>';
/* Batterie : cellules qui se chargent à tour de rôle, éclair, câble parcouru d’étincelles */
A.bat=open('Batterie : cellules qui se chargent une à une et énergie circulant dans le câble')+
'<ellipse class="pg-pulse" cx="200" cy="130" rx="170" ry="90" fill="url(#pg-glow)"/>'+
'<path class="pg-flow" d="M8 130h58" stroke="#fde68a" stroke-width="5" stroke-dasharray="8 10" fill="none"/><rect x="62" y="118" width="12" height="24" rx="3" fill="url(#pg-metal)"/>'+
'<rect x="74" y="66" width="236" height="128" rx="20" fill="url(#pg-card)" stroke="#cbd5e1" stroke-width="3"/><rect x="310" y="106" width="20" height="48" rx="5" fill="url(#pg-metal)"/>'+
g(5,function(i){return '<rect class="pg-cell" style="animation-delay:'+(i*.55)+'s" x="'+(90+i*43)+'" y="82" width="36" height="96" rx="8" fill="url(#pg-batt)"/>'}).join('')+
'<path class="pg-pulse" d="M212 84 170 136h30l-10 42 46-58h-30z" fill="#fff" stroke="#16a34a" stroke-width="3" stroke-linejoin="round"/>'+
g(5,function(i){return '<circle class="pg-rise" style="animation-delay:-'+(i*.6)+'s" cx="'+(100+i*50)+'" cy="62" r="3" fill="#86efac"/>'}).join('')+'</svg>';
/* Poids : balance à fléau oscillant (amorti), plateaux qui restent horizontaux, portable contre masses */
A.poids=open('Poids : une balance oscille, portable d’un côté, masses de l’autre')+
'<ellipse cx="200" cy="232" rx="110" ry="10" fill="#000" opacity=".25"/><path d="M200 74v140M150 224l50-18 50 18z" stroke="#94a3b8" stroke-width="6" fill="#64748b" stroke-linejoin="round"/>'+
'<g class="pg-beam pg-vb" style="transform-origin:200px 74px"><path d="M64 74h272" stroke="url(#pg-gold)" stroke-width="8" stroke-linecap="round"/>'+
'<g class="pg-pan pg-vb" style="transform-origin:64px 74px"><path d="M64 74 34 140M64 74l30 66" stroke="#cbd5e1" stroke-width="2"/><path d="M24 140h80q0 20-40 20t-40-20z" fill="url(#pg-metal)" stroke="#64748b"/><rect x="38" y="104" width="52" height="34" rx="4" fill="#0f172a" stroke="#5eead4" stroke-width="2"/><rect x="42" y="108" width="44" height="26" rx="2" fill="url(#pg-sky)"/><path d="M32 138h64l-5-6H37z" fill="#94a3b8"/></g>'+
'<g class="pg-pan pg-vb" style="transform-origin:336px 74px"><path d="M336 74l-30 66M336 74l30 66" stroke="#cbd5e1" stroke-width="2"/><path d="M296 140h80q0 20-40 20t-40-20z" fill="url(#pg-metal)" stroke="#64748b"/>'+g(3,function(i){return '<rect x="'+(308+i*18)+'" y="'+(120-i*4)+'" width="16" height="20" rx="3" fill="#f59e0b" stroke="#78350f"/>'}).join('')+'</g></g>'+
'<circle cx="200" cy="74" r="11" fill="url(#pg-gold)" stroke="#78350f" stroke-width="2"/>'+g(4,function(i){return '<circle class="pg-rise2" style="animation-delay:-'+(i*.9)+'s" cx="'+(110+i*60)+'" cy="200" r="2.5" fill="#cbd5e1"/>'}).join('')+'</svg>';
window.PCART=A;
if(document.body){document.body.insertAdjacentHTML('afterbegin',D)}else{document.addEventListener('DOMContentLoaded',function(){document.body.insertAdjacentHTML('afterbegin',D)})}
})();
