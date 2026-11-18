// Héros de l'élève (cahier §7.12, v1.92, décidé par l'enseignant le 2026-11-18) : pièces dessinées par Claude
// d'après les modèles Gemini de l'enseignant (originaux/images monstres jpg/heros-*.jpg, expressions, coiffures) :
// contour noir, traits fins à l'intérieur, ombre sur un côté, grands yeux à reflets, mèches pointues.
// Un héros = un numéro par pièce ; une seule forme par pièce, couleurs et ombres calculées ici. Aucun import.
const K = '#1b1b1f';

const c = (nom, v) => ({ nom, v });
export const PIECES = [
  { cle: 'peau', nom: 'Peau', choix: [c('très claire', '#F9DEC9'), c('claire', '#F2C7A5'), c('dorée', '#DDA67E'),
    c('mate', '#BC7C52'), c('brune', '#8E5636'), c('très foncée', '#5E3A24')] },
  { cle: 'yeux', nom: 'Yeux', choix: [c('ronds', 'ronds'), c('rieurs', 'rieurs'), c('grands', 'grands'), c('avec des cils', 'cils')] },
  { cle: 'visage', nom: 'Visage', choix: [c('simple', ''), c('taches de rousseur', 't'), c('joues roses', 'j'), c('taches et joues roses', 'tj')] },
  { cle: 'coiffure', nom: 'Coiffure', choix: ['courts', 'hérissés', 'carré', 'longs', 'queue de cheval', 'couettes',
    'tresses', 'chignon', 'bouclés', 'afro', 'rasés'].map((n) => c(n, n)) },
  { cle: 'cheveux', nom: 'Couleur des cheveux', choix: [c('noirs', '#2a2624'), c('bruns', '#6b4423'), c('châtains', '#9a6a3c'),
    c('blonds', '#F2CE5C'), c('roux', '#D2622E'), c('bleus', '#4A90D9'), c('roses', '#E87BB0'), c('verts', '#4CB572'), c('violets', '#8A6AD1')] },
  // « Sur la tête » et les lunettes de soleil : retirés le 2026-11-18, ils reviendront avec les récompenses
  // (dessins gardés plus bas : TETE, LUNETTES.soleil).
  { cle: 'lunettes', nom: 'Lunettes', choix: [c('aucune', ''), c('rondes', 'rondes'), c('carrées', 'carrees')] },
  // Haut et bas séparés, chacun sa couleur (choix de l'enseignant le 2026-11-18). Robe et combinaison sont des hauts :
  // sous la robe, le bas choisi se voit (legging, jean…) ; la combinaison remplace le bas, de la couleur du haut.
  { cle: 'haut', nom: 'Haut', choix: [c('t-shirt', 'tshirt'), c('maillot de sport', 'maillot'), c('pull rayé', 'pull'),
    c('sweat à capuche', 'sweat'), c('chemise à carreaux', 'carreaux'), c('débardeur', 'debardeur'), c('polo', 'polo'),
    c('veste en jean', 'veste'), c('gilet', 'gilet'), c('chemise à fleurs', 'fleurs'), c('robe', 'robe'), c('combinaison', 'combinaison')] },
  { cle: 'couleur', nom: 'Couleur du haut', choix: [c('bleu', '#2F7FD8'), c('rouge', '#E2403F'), c('vert', '#3AA556'), c('jaune', '#F2B12E'),
    c('rose', '#EC4FA8'), c('violet', '#7F66D6'), c('turquoise', '#2BB5A8'), c('orange', '#F27B2A'), c('gris', '#6B6B70'), c('blanc', '#F4F1EA')] },
  { cle: 'motif', nom: 'Dessin', choix: [c('rien', ''), c('étoile', 'etoile'), c('cœur', 'coeur'), c('éclair', 'eclair'),
    c('ballon', 'ballon'), c('note de musique', 'note'), c('arc-en-ciel', 'arcenciel'), c('fusée', 'fusee'), c('dinosaure', 'dino'),
    c('chat', 'chat'), c('soleil', 'soleil'), c('ballon de basket', 'basket')] },
  { cle: 'bas', nom: 'Bas', choix: [c('jean', 'jean'), c('jogging', 'jogging'), c('short', 'short'), c('pantalon à poches', 'cargo'),
    c('jupe', 'jupe'), c('legging', 'legging'), c('salopette', 'salopette'), c('salopette short', 'salopetteShort')] },
  { cle: 'couleurBas', nom: 'Couleur du bas', choix: [c('bleu jean', '#4A74B0'), c('bleu nuit', '#2B3A67'), c('noir', '#34343A'),
    c('gris', '#8A8A90'), c('beige', '#C9AE85'), c('rouge', '#C83A36'), c('vert', '#3E8E50'), c('rose', '#E06AA8')] },
  { cle: 'chaussures', nom: 'Chaussures', choix: [c('baskets', 'baskets'), c('bottines', 'bottines'), c('bottes de pluie', 'bottes'),
    c('sandales', 'sandales'), c('baskets montantes', 'montantes')] },
  { cle: 'couleurChaussures', nom: 'Couleur des chaussures', choix: [c('rouge', '#D93A35'), c('bleu nuit', '#2B3A67'), c('blanc', '#F4F1EA'),
    c('bleu', '#2F7FD8'), c('jaune', '#F2B12E'), c('rose', '#EC4FA8')] },
  { cle: 'marche', nom: 'Je me déplace', choix: [c('à pied', 'pied'), c('en fauteuil roulant', 'fauteuil')] },
];

// « Au hasard » (demande de l'enseignant le 2026-11-18) : un héros au hasard parmi les pièces existantes, mais
// sans accessoire (lunettes, chapeau, dessin) ni fauteuil roulant : c'est l'élève qui les ajoute.
const SANS_HASARD = ['lunettes', 'motif', 'marche'];
export const auHasard = (alea = Math.random) =>
  Object.fromEntries(PIECES.map((p) => [p.cle, SANS_HASARD.includes(p.cle) ? 0 : Math.floor(alea() * p.choix.length)]));

// Mémoire du héros (cahier §2 et §7.12) : un numéro par pièce, gardé sur l'appareil, jamais envoyé.
const CLE = 'heros';
// Seuls les numéros valides sont gardés (la mémoire du navigateur peut être abîmée) ; sinon le premier choix.
export const normaliser = (h) => Object.fromEntries(PIECES.map((p) => {
  const n = h && h[p.cle];
  return [p.cle, Number.isInteger(n) && n >= 0 && n < p.choix.length ? n : 0];
}));
export function garderHeros(h) {
  try { localStorage.setItem(CLE, JSON.stringify(h)); } catch { /* refusé : le héros ne vit que pendant la visite */ }
}
// Premier passage (ou mémoire refusée ou abîmée) : un héros au hasard, gardé si possible.
export function lireHeros() {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) return normaliser(JSON.parse(brut));
  } catch { /* mémoire refusée ou abîmée */ }
  const h = auHasard();
  garderHeros(h);
  return h;
}

// Le héros de l'élève dans l'arène du combat (cahier §7.12), à la place de l'avatar de l'enseignant :
// même classe « avatar » (mêmes tailles, mêmes mouvements) et même `.pose()`. Les poses de l'avatar deviennent
// trois expressions ; le reste (bond, recul, saut) est fait par les mouvements du combat.
const EXPRESSION = { attaque: 'attaque', aie: 'aie' };
export function herosCombat() {
  const h = lireHeros();
  const boite = document.createElement('span');
  boite.className = 'avatar heros-combat';
  boite.setAttribute('aria-hidden', 'true');
  boite.pose = (pose) => {
    const e = EXPRESSION[pose] || 'content';
    if (boite.dataset.expression === e) return;
    boite.dataset.expression = e;
    boite.innerHTML = dessinerHeros(h, e); // dessin du site, aucune donnée venue de l'extérieur
  };
  boite.pose('neutre');
  return boite;
}

// Teinte plus foncée (ombre) ou plus claire (rayures, reflets) d'une couleur « #rrggbb ».
const teinte = (h, f) => '#' + [1, 3, 5].map((i) => {
  const v = parseInt(h.slice(i, i + 2), 16);
  return Math.round(f < 1 ? v * f : v + (255 - v) * (f - 1)).toString(16).padStart(2, '0');
}).join('');
const ombre = (h) => teinte(h, 0.8);

// Le même dessin, et son reflet de l'autre côté (le héros est vu de face).
const miroir = (s) => s + `<g transform="matrix(-1 0 0 1 300 0)">${s}</g>`;
// Une forme pleine, son ombre, puis son contour par-dessus (l'ombre ne mange pas le trait).
const forme = (d, fond, dedans = '') => `<path d="${d}" fill="${fond}" stroke="none"/>${dedans}<path d="${d}" fill="none"/>`;
// Un « tube » (bras, jambe, tresse) : trait noir épais, puis la couleur par-dessus.
const tube = (d, coul, l) => `<path d="${d}" fill="none" stroke-width="${l + 12}"/><path d="${d}" fill="none" stroke="${coul}" stroke-width="${l}"/>`;
const fin = (d, coul = K, l = 3) => `<path d="${d}" fill="none" stroke="${coul}" stroke-width="${l}"/>`;

// Boucles (bouclés, afro) : des ronds sur une ellipse, de l'angle a0 à a1 (degrés, 0 = à droite, sens horaire).
const boucles = (cx, cy, rx, ry, a0, a1, n, r, coul) => Array.from({ length: n }, (_, i) => {
  const a = ((a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI) / 180;
  return `<circle cx="${Math.round(cx + rx * Math.cos(a))}" cy="${Math.round(cy + ry * Math.sin(a))}" r="${r}" fill="${coul}"/>`;
}).join('');

// Cheveux derrière la tête, puis devant (mèches pointues des modèles Gemini). `h` couleur, `o` son ombre.
const MECHES = 'L212 98 L204 106 L198 80 L184 94 L174 66 L160 86 L150 62 L138 86 L124 66 L116 92 L102 78 L94 104 L88 96Z';
const LISSE = (h) => forme('M80 112 C74 52 108 26 150 26 C192 26 226 52 220 112 Q210 76 176 66 Q150 80 116 72 Q90 82 80 112Z', h)
  + fin('M120 36 Q108 50 104 66 M178 34 Q194 46 200 64', teinte(h, 0.62));
const RAIE = (h) => forme('M80 114 C74 54 108 26 150 28 C192 26 226 54 220 114 Q214 70 156 52 L150 66 L144 52 Q86 70 80 114Z', h)
  + fin('M128 40 Q110 56 100 80 M172 40 Q190 56 200 80', teinte(h, 0.62));
const ARRIERE = {
  'carré': (h) => forme('M74 104 C68 38 110 20 150 20 C190 20 232 38 226 104 L230 196 L216 202 L208 194 L196 200 L104 200 L92 194 L84 202 L70 196Z', h),
  longs: (h) => forme('M72 104 C64 38 110 18 150 18 C190 18 236 38 228 104 L238 232 L224 246 L216 232 L206 254 L196 204 L104 204 L94 254 L84 232 L76 246 L62 232Z', h)
    + fin('M78 150 Q80 200 72 226 M222 150 Q220 200 228 226', teinte(h, 0.62)),
  'queue de cheval': (h) => forme('M186 36 C252 24 270 108 256 172 C250 204 236 222 220 232 L226 200 L212 210 C226 158 224 100 194 70Z', h)
    + fin('M214 60 Q244 100 236 170', teinte(h, 0.62)),
  couettes: (h) => miroir(forme('M92 120 C70 126 62 160 60 208 L72 198 L78 212 L86 194 C86 168 94 150 104 142Z', h)
    + `<rect x="82" y="120" width="18" height="14" rx="5" fill="#F2B12E" transform="rotate(-30 91 127)"/>`),
  tresses: (h) => miroir([142, 166, 190, 214, 238].map((y, i) => `<ellipse cx="${88 - i * 2}" cy="${y}" rx="13" ry="15" fill="${h}"/>`).join('')
    + `<rect x="73" y="252" width="20" height="10" rx="4" fill="#F2B12E"/><path d="M76 262 L72 280 L82 270 L88 282 L90 262Z" fill="${h}"/>`),
  chignon: (h) => `<circle cx="150" cy="26" r="26" fill="${h}"/>` + fin('M134 18 Q150 6 166 20 M136 32 Q152 22 164 34', teinte(h, 0.62)),
  'bouclés': (h) => boucles(150, 116, 80, 90, 160, 380, 15, 24, h) + `<circle cx="74" cy="178" r="22" fill="${h}"/><circle cx="226" cy="178" r="22" fill="${h}"/>`
    + `<ellipse cx="150" cy="116" rx="80" ry="90" fill="${h}" stroke="none"/>`,
  afro: (h) => boucles(150, 108, 98, 80, 0, 340, 18, 24, h) + `<ellipse cx="150" cy="108" rx="98" ry="80" fill="${h}" stroke="none"/>`
    + fin('M92 60 q8 -8 14 0 M190 54 q8 -8 14 0 M220 110 q8 -8 14 0 M68 120 q8 -8 14 0 M150 26 q8 -8 14 0', teinte(h, 0.62)),
};
const AVANT = {
  courts: (h) => forme(`M80 112 C72 60 100 22 150 24 C200 22 230 56 222 112 ${MECHES}`, h)
    + `<path d="M146 28 Q150 8 170 6 Q158 16 162 30Z" fill="${h}"/>` + fin('M120 40 L110 64 M172 36 L184 60 M198 52 L206 76 M140 44 L134 64', teinte(h, 0.62)),
  'hérissés': (h) => forme(`M80 112 L70 72 L94 80 L86 38 L112 54 L114 12 L136 40 L150 2 L166 38 L188 12 L190 52 L214 36 L208 78 L230 72 L222 112 ${MECHES}`, h)
    + fin('M112 40 L118 66 M150 20 L150 50 M186 34 L180 64', teinte(h, 0.62)),
  'carré': (h) => forme('M80 112 C74 56 106 26 150 26 C194 26 226 56 220 112 L210 92 L202 100 L196 80 L180 90 L172 74 L158 86 L150 72 L140 86 L126 74 L118 90 L102 80 L96 100 L88 92Z', h)
    + fin('M126 40 L116 66 M174 40 L184 66', teinte(h, 0.62)),
  longs: (h) => forme('M80 116 C74 54 108 24 150 24 C196 24 228 56 220 116 Q212 82 186 70 Q164 100 120 86 Q96 88 80 116Z', h)
    + fin('M130 38 Q160 46 184 70 M108 50 Q98 70 92 92', teinte(h, 0.62)),
  'queue de cheval': LISSE, couettes: RAIE, tresses: RAIE, chignon: LISSE,
  'bouclés': (h) => [100, 124, 150, 176, 200].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 54 : 64}" r="18" fill="${h}"/>`).join(''),
  afro: (h) => forme('M86 100 Q92 46 150 42 Q208 46 214 100 Q190 72 150 70 Q110 72 86 100Z', h),
  'rasés': (h) => `<path d="M86 102 C86 50 116 34 150 34 C184 34 214 50 214 102 Q200 72 150 68 Q100 72 86 102Z" fill="${h}" opacity=".6" stroke-width="4"/>`,
};

// Yeux et sourcils (sourcils de la couleur des cheveux) selon l'expression : content, attaque, aie.
function yeux(forme, expression, sourcil) {
  const s = (d) => `<path d="${d}" fill="${sourcil}" stroke-width="3"/>`;
  if (expression === 'aie') return miroir(s('M108 106 Q124 96 140 90 Q128 100 110 110Z') + fin('M110 112 L134 121 L112 130', K, 5));
  const sourcils = miroir(s(expression === 'attaque' ? 'M106 90 Q126 94 142 108 Q124 102 108 98Z' : 'M108 98 Q124 86 142 96 Q126 92 110 102Z'));
  if (forme === 'rieurs') return sourcils + miroir(fin('M112 124 Q126 108 140 124', K, 5));
  const g = forme === 'grands' ? 1.18 : 1;
  const oeil = (x, dx) => `<ellipse cx="${x}" cy="120" rx="${15 * g}" ry="${17 * g}" fill="#fff" stroke-width="4"/>`
    + `<circle cx="${x + dx}" cy="123" r="${10 * g}" fill="${K}" stroke="none"/>`
    + `<circle cx="${x + dx - 4}" cy="118" r="${3.8 * g}" fill="#fff" stroke="none"/><circle cx="${x + dx + 4}" cy="128" r="1.8" fill="#fff" stroke="none"/>`;
  const cils = forme === 'cils' || forme === 'grands'
    ? miroir(fin(`M${112 - 3 * g} ${108 - 4 * g} L104 100 M${110 - 2 * g} ${114 - 2 * g} L102 110`, K, 3.5)) : '';
  return sourcils + oeil(126, 1) + oeil(174, -1) + cils;
}

const BOUCHE = {
  content: fin('M126 154 Q150 172 174 154', K, 4) + fin('M144 174 Q150 177 156 174', K, 2.5),
  attaque: fin('M130 160 Q152 166 172 152', K, 4) + fin('M170 148 Q175 153 172 158', K, 3) + fin('M144 174 Q150 177 156 174', K, 2.5),
  aie: `<ellipse cx="150" cy="160" rx="7" ry="9" fill="#7a2230" stroke-width="3.5"/>` + fin('M144 176 Q150 179 156 176', K, 2.5),
};

const joues = (v) => (v.includes('j') ? miroir(`<ellipse cx="108" cy="142" rx="15" ry="9" fill="#F08A8A" opacity=".45" stroke="none"/>`) : '')
  + (v.includes('t') ? miroir([[100, 138], [108, 144], [116, 139], [104, 148], [114, 149]].map(([x, y]) =>
    `<circle cx="${x}" cy="${y}" r="2.2" fill="#a0583a" stroke="none"/>`).join('')) : '');

const LUNETTES = {
  rondes: `<circle cx="126" cy="120" r="23" fill="none" stroke-width="4.5"/><circle cx="174" cy="120" r="23" fill="none" stroke-width="4.5"/>`
    + fin('M148 120 H152 M103 116 L86 112 M197 116 L214 112', K, 4.5),
  carrees: miroir(`<rect x="103" y="102" width="46" height="38" rx="9" fill="none" stroke-width="4.5"/>` + fin('M103 116 L86 112', K, 4.5)),
  soleil: miroir(`<rect x="103" y="104" width="46" height="34" rx="12" fill="${K}" stroke-width="4.5"/>`
    + fin('M110 112 L120 112', '#fff', 3) + fin('M103 116 L86 112', K, 4.5)),
};

const TETE = {
  casquette: forme('M82 94 C82 44 116 28 150 28 C184 28 218 44 218 94 Q150 80 82 94Z', '#E2403F', '<path d="M176 36 Q206 50 214 90 Q200 86 190 86 Q190 58 176 36Z" fill="#B42F2E"/>')
    + forme('M84 94 Q150 78 216 94 Q222 106 210 108 Q150 96 90 108 Q78 106 84 94Z', '#B42F2E') + '<circle cx="150" cy="30" r="5" fill="#B42F2E"/>',
  bonnet: forme('M80 98 C78 32 120 16 150 16 C180 16 222 32 220 98Z', '#5B4BC4')
    + forme('M76 84 Q150 72 224 84 L224 104 Q150 94 76 104Z', '#7F6EE0') + fin('M100 82 V100 M125 78 V96 M150 77 V95 M175 78 V96 M200 82 V100', '#4a3caa', 3)
    + '<circle cx="150" cy="14" r="16" fill="#F4F1EA"/>',
  bandeau: forme('M80 92 Q150 50 220 92 L222 70 Q150 30 78 72Z', '#F27B2A', fin('M84 86 Q150 48 218 86', '#d0601a', 5)),
  noeud: '<path d="M196 50 L224 34 Q230 50 224 68Z M196 50 L170 34 Q164 50 170 68Z" fill="#EC4FA8"/><circle cx="196" cy="50" r="9" fill="#C23A88"/>',
  fleurs: [200, 222, 244, 266, 288, 310, 332].map((a, i) => {
    const r = (a * Math.PI) / 180, x = Math.round(150 + 72 * Math.cos(r)), y = Math.round(100 + 66 * Math.sin(r));
    return `<circle cx="${x}" cy="${y}" r="12" fill="${['#F7A8C8', '#FFD966', '#F4F1EA'][i % 3]}" stroke-width="3.5"/><circle cx="${x}" cy="${y}" r="4" fill="#F27B2A" stroke="none"/>`;
  }).join(''),
};

const MOTIF = {
  etoile: `<path d="M0 -20 L6 -7 L20 -6 L9 3 L12 17 L0 9 L-12 17 L-9 3 L-20 -6 L-6 -7Z" fill="#FFD54A"/>`,
  coeur: `<path d="M0 15 C-28 -4 -12 -24 0 -10 C12 -24 28 -4 0 15Z" fill="#F7A8C8"/>`,
  eclair: `<path d="M5 -22 L-11 3 H0 L-5 22 L11 -4 H0Z" fill="#FFD54A"/>`,
  ballon: `<circle r="17" fill="#fff"/><path d="M0 -6 L6 -2 L4 5 L-4 5 L-6 -2Z" fill="${K}" stroke="none"/>`,
  note: `<ellipse cx="-6" cy="12" rx="9" ry="7" fill="${K}" stroke="none"/><path d="M2 12 V-18 Q14 -12 14 -2" fill="none" stroke-width="6"/>`,
  arcenciel: [['#E2403F', 19], ['#F2B12E', 13], ['#2F7FD8', 7]].map(([coul, r]) =>
    `<path d="M${-r} 9 A${r} ${r} 0 0 1 ${r} 9" fill="none" stroke="${K}" stroke-width="10"/><path d="M${-r} 9 A${r} ${r} 0 0 1 ${r} 9" fill="none" stroke="${coul}" stroke-width="5"/>`).join(''),
  fusee: `<path d="M-8 6 L-15 16 L-6 14Z M8 6 L15 16 L6 14Z" fill="#E2403F" stroke-width="3"/><path d="M-4 15 L0 24 L4 15Z" fill="#F27B2A" stroke-width="2.5"/>`
    + `<path d="M0 -22 Q11 -8 8 14 L-8 14 Q-11 -8 0 -22Z" fill="#fff" stroke-width="3.5"/><circle cy="-4" r="4.5" fill="#2F7FD8" stroke-width="3"/>`,
  dino: `<path d="M-20 12 Q-18 -2 -6 -2 Q-2 -16 9 -15 Q19 -14 18 -6 Q17 -2 10 -3 Q14 5 10 12 L5 12 L5 6 L-5 6 L-5 12 L-10 12 Q-14 8 -20 12Z" fill="#4CB572" stroke-width="3"/>`
    + `<circle cx="11" cy="-10" r="1.8" fill="${K}" stroke="none"/>`,
  chat: `<path d="M-13 -6 L-12 -20 L-3 -12 L3 -12 L12 -20 L13 -6 Q14 12 0 13 Q-14 12 -13 -6Z" fill="#F2B12E" stroke-width="3"/>`
    + `<circle cx="-5" cy="-1" r="2" fill="${K}" stroke="none"/><circle cx="5" cy="-1" r="2" fill="${K}" stroke="none"/><path d="M-3 5 Q0 8 3 5" fill="none" stroke-width="2"/>`,
  soleil: `<path d="M0 -21 V-14 M0 14 V21 M-21 0 H-14 M14 0 H21 M-15 -15 L-10 -10 M10 10 L15 15 M-15 15 L-10 10 M10 -10 L15 -15" stroke="#F2B12E" stroke-width="4"/>`
    + `<circle r="10" fill="#FFD54A" stroke-width="3"/>`,
  basket: `<circle r="16" fill="#F27B2A" stroke-width="3"/><path d="M0 -16 V16 M-16 0 H16 M-11 -12 Q-4 0 -11 12 M11 -12 Q4 0 11 12" fill="none" stroke-width="2.5"/>`,
};

// Corps, d'après la stature des modèles Gemini : épaules marquées, buste court, jambes longues,
// bras fins un peu pliés au coude, mains avec doigts.
// Haut d'un seul tenant (manches courtes comprises : pas de couture visible à l'épaule).
const COURTES = 'M120 192 Q150 186 180 192 Q210 192 216 216 L224 236 Q208 243 196 240 L196 282 Q150 292 104 282 L104 240 Q92 243 76 236 L84 216 Q90 192 120 192Z';
const BUSTE = 'M120 192 Q150 186 180 192 Q208 192 212 220 L198 282 Q150 292 102 282 L88 220 Q92 192 120 192Z'; // manches longues : les bras sont dessous
const ROBE = 'M120 192 Q150 186 180 192 Q210 192 216 216 L224 236 Q208 243 198 240 L218 318 Q150 332 82 318 L102 240 Q92 243 76 236 L84 216 Q90 192 120 192Z';
const EPAULES = 'M120 192 Q150 186 180 192 Q208 192 212 220 Q204 232 192 232 L108 232 Q96 232 88 220 Q92 192 120 192Z'; // sous le débardeur
const DEBARDEUR = 'M128 191 Q150 210 172 191 Q186 196 192 214 Q196 230 196 240 L196 282 Q150 292 104 282 L104 240 Q104 230 108 214 Q114 196 128 191Z';
const OMBRE_BUSTE = (t) => `<path d="M180 196 Q196 200 200 214 L196 280 Q188 284 182 285 Q190 240 180 196Z" fill="${ombre(t)}" stroke="none"/>`;
const BANDE = 'M102 268 Q150 278 198 268 L198 284 Q150 294 102 284Z'; // bas du pull, du sweat et du gilet
const COL = 'M132 193 Q141 200 150 199 Q159 200 168 193 L162 212 L150 201 L138 212Z'; // col de chemise et de polo
const DENIM = '#5B84C4';
const LONGUES = ['pull', 'sweat', 'carreaux', 'veste', 'gilet', 'combinaison'];
// Formes des hauts, partagées par tous les héros d'une page (ids identiques, géométrie identique).
const DEFS = `<defs><clipPath id="hb-courtes"><path d="${COURTES}"/></clipPath><clipPath id="hb-buste"><path d="${BUSTE}"/></clipPath></defs>`;
const pointilles = (d, coul) => fin(d, coul, 2.5).replace('/>', ' stroke-dasharray="7 6"/>');
const boutons = (ys, coul = '#fff') => ys.map((y) => `<circle cx="150" cy="${y}" r="2.8" fill="${coul}" stroke-width="2"/>`).join('');

const carreaux = (t, clip) => `<g clip-path="url(#${clip})" stroke="none" fill="${teinte(t, 0.62)}" opacity=".6">`
  + [96, 114, 132, 150, 168, 186, 204].map((x) => `<rect x="${x}" y="186" width="7" height="110"/>`).join('')
  + [204, 222, 240, 258, 276].map((y) => `<rect x="70" y="${y}" width="160" height="7"/>`).join('') + '</g>';
const fleurettes = (clip) => `<g clip-path="url(#${clip})" stroke="none">`
  + [[114, 214], [150, 228], [186, 214], [124, 254], [176, 256], [94, 230], [206, 230], [150, 272]].map(([x, y]) =>
    [0, 72, 144, 216, 288].map((a) => {
      const r = (a * Math.PI) / 180;
      return `<circle cx="${Math.round(x + 6 * Math.cos(r))}" cy="${Math.round(y + 6 * Math.sin(r))}" r="4" fill="#fff"/>`;
    }).join('') + `<circle cx="${x}" cy="${y}" r="3" fill="#F2B12E"/>`).join('') + '</g>';

// Bras fins, un peu écartés du corps, coude léger, main à mi-cuisse. Bras et main sont une seule forme :
// tous les contours d'abord, puis toutes les couleurs par-dessus (aucun trait au poignet).
const BRAS = 'M98 216 Q87 232 87 256 Q86 276 88 294';
const MAIN = 'M86 274 Q80 288 86 298 Q92 306 100 302 Q106 296 104 286 Q104 276 98 272Z';
const bras = (p, manche, longue) => miroir(
  `<path d="${BRAS}" fill="none" stroke-width="${(longue ? 14 : 11) + 10}"/>`
  + `<g transform="translate(-8 22)"><path d="${MAIN}" fill="${p}"/></g>`
  + `<path d="${BRAS}" fill="none" stroke="${longue ? manche : p}" stroke-width="${longue ? 14 : 11}"/>`
  + `<g transform="translate(-8 22)"><path d="${MAIN}" fill="${p}" stroke="none"/>`
  + (longue ? `<path d="M86 272 Q96 278 104 272" fill="none" stroke="${ombre(manche)}" stroke-width="4"/>` : '')
  + fin('M92 296 L93 302 M97 294 L99 300 M103 280 Q109 284 106 291', K, 2.5) + '</g>');

// Le haut (après les bras, qui passent dessous) ; `t` sa couleur, `p` la peau.
function dessinerHaut(haut, t, p) {
  if (haut === 'robe') return forme(ROBE, t, `<path d="M180 196 Q196 200 200 214 L216 316 Q206 320 198 322 Q200 256 180 196Z" fill="${ombre(t)}" stroke="none"/>`)
    + pointilles('M90 310 Q150 324 210 310', ombre(t)) + miroir(pointilles('M86 230 Q95 237 104 236', ombre(t)));
  if (haut === 'debardeur') return `<path d="${EPAULES}" fill="${p}" stroke="none"/>` + fin('M88 220 Q92 192 120 192 M180 192 Q208 192 212 220', K, 5)
    + forme(DEBARDEUR, t, OMBRE_BUSTE(t)) + pointilles('M108 274 Q150 284 192 274', ombre(t));
  const longue = LONGUES.includes(haut);
  const fond = haut === 'veste' ? DENIM : t;
  const clip = longue ? 'hb-buste' : 'hb-courtes';
  const motif = haut === 'carreaux' ? carreaux(t, clip) : haut === 'fleurs' ? fleurettes(clip) : '';
  let s = forme(longue ? BUSTE : COURTES, fond, motif + OMBRE_BUSTE(fond));
  if (!longue) s += miroir(pointilles('M86 230 Q95 237 104 236', ombre(fond)));
  if (haut === 'tshirt' || haut === 'maillot' || haut === 'polo' || haut === 'fleurs') s += pointilles('M108 274 Q150 284 192 274', ombre(t));
  if (haut === 'maillot') s += miroir(fin('M80 232 Q93 239 106 238', '#fff', 4));
  if (haut === 'pull') s += [222, 242, 260].map((y) => `<path d="M100 ${y} H200" stroke="${teinte(t, 1.45)}" stroke-width="9"/>`).join('')
    + `<path d="${BUSTE}" fill="none"/>`;
  if (haut === 'pull' || haut === 'sweat' || haut === 'gilet') s += forme(BANDE, ombre(t));
  if (haut === 'sweat') s += forme('M126 236 H174 L182 264 H118Z', teinte(t, 0.9))
    + forme('M118 198 Q150 176 182 198 Q178 212 150 214 Q122 212 118 198Z', ombre(t));
  if (haut === 'veste') s += forme('M134 194 Q150 204 166 194 L168 285 Q150 290 132 285Z', t, `<path d="M156 200 L166 196 L168 285 L160 286Z" fill="${ombre(t)}" stroke="none"/>`)
    + miroir(forme('M108 220 H128 V238 Q118 242 108 238Z', teinte(DENIM, 0.85)) + pointilles('M118 198 Q112 240 110 278', teinte(DENIM, 1.4)));
  if (haut === 'gilet') s += forme('M134 194 Q150 200 166 194 L150 240Z', '#F4F1EA') + fin('M150 240 V270', K, 3) + boutons([248, 260], teinte(t, 1.5));
  if (haut === 'combinaison') s += fin('M150 204 V284', ombre(t), 3.5) + forme('M162 216 H184 V236 Q173 240 162 236Z', ombre(t));
  return s;
}
// Détails qui passent sur le cou : capuche, cordons, cols, encolure.
function detailsCol(haut, t) {
  if (haut === 'sweat') return fin('M143 204 L141 230 M157 204 L159 230', ombre(t), 3.5);
  if (haut === 'maillot') return fin('M137 198 L150 212 L163 198', '#fff', 5);
  if (haut === 'polo') return forme(COL, teinte(t, 0.88)) + fin('M150 204 V226', ombre(t), 3) + boutons([212, 222]);
  if (haut === 'carreaux' || haut === 'fleurs') return forme(COL, haut === 'fleurs' ? teinte(t, 0.88) : '#F4F1EA') + fin('M150 204 V282', ombre(t), 3) + boutons([220, 240, 260]);
  if (haut === 'robe' || haut === 'tshirt' || haut === 'debardeur') return fin('M134 198 Q150 208 166 198', ombre(t), 3);
  return '';
}

// Jambes (une seule forme, comme un pantalon) ; `yb` = bas des jambes (plus haut en fauteuil).
const JAMBES = (yb) => `M108 278 Q150 288 192 278 L190 ${yb} L160 ${yb} L153 304 Q150 300 147 304 L140 ${yb} L110 ${yb}Z`;
const NUES = ['short', 'jupe', 'salopetteShort'];
const SHORT = 'M106 278 Q150 288 194 278 L196 314 L156 316 L150 302 L144 316 L104 314Z';
function jambesDe(bas, cb, p, yb) {
  if (NUES.includes(bas)) return forme(JAMBES(yb), p);
  let s = forme(JAMBES(yb), cb, fin(`M122 300 Q119 ${yb - 40} 123 ${yb - 14} M178 300 Q181 ${yb - 50} 179 ${yb - 24}`, ombre(cb), 2.5));
  if (bas === 'jean' || bas === 'cargo' || bas === 'salopette') s += miroir(`<rect x="109" y="${yb - 12}" width="32" height="12" rx="4" fill="${ombre(cb)}"/>`);
  if (bas === 'jogging') s += miroir(fin(`M113 292 L112 ${yb - 10}`, '#fff', 4) + `<rect x="110" y="${yb - 9}" width="30" height="9" rx="4" fill="${ombre(cb)}"/>`);
  if (bas === 'legging') s += miroir(fin(`M119 300 Q116 ${yb - 30} 119 ${yb - 6}`, teinte(cb, 1.35), 3));
  return s;
}
// Ce qui passe par-dessus les chaussures montantes : short, jupe, poches.
function dessusBas(bas, cb) {
  if (bas === 'short' || bas === 'salopetteShort') return forme(SHORT, cb, `<path d="M180 282 L194 279 L196 314 L184 315Z" fill="${ombre(cb)}" stroke="none"/>`);
  if (bas === 'jupe') return forme('M104 276 Q150 286 196 276 L210 326 Q150 338 90 326Z', cb, `<path d="M180 282 L196 280 L210 326 Q200 330 192 330Z" fill="${ombre(cb)}" stroke="none"/>`)
    + fin('M126 290 L120 330 M150 292 L150 334 M174 290 L180 330', ombre(cb), 2.5);
  if (bas === 'cargo') return miroir(forme('M107 316 H124 V340 Q116 344 107 340Z', ombre(cb)) + fin('M107 324 H124', K, 2.5));
  return '';
}
// Salopette : la bavette et les bretelles passent sur le haut.
const bavette = (cb) => forme('M122 222 H178 V286 H122Z', cb, `<path d="M166 224 H176 V284 H168Z" fill="${ombre(cb)}" stroke="none"/>`)
  + miroir(`<rect x="119" y="194" width="12" height="32" rx="6" fill="${cb}"/><circle cx="125" cy="226" r="4.5" fill="#F2B12E"/>`)
  + forme('M136 240 H164 V256 Q150 260 136 256Z', teinte(cb, 0.88));

// Chaussures (dessinées pour la jambe gauche, puis en miroir), réduites à la largeur des jambes.
const SEMELLE = (coul = '#fff') => forme('M96 390 Q122 398 150 390 L150 398 Q122 406 96 400Z', coul);
const reflet = (coul) => `<path d="M128 372 Q144 374 146 388 L134 390 Q136 380 128 372Z" fill="${ombre(coul)}" stroke="none"/>`;
const CHAUSSURES = {
  baskets: (c) => forme('M98 392 Q96 370 122 368 Q146 368 148 388 L148 394 Q122 400 98 396Z', c, reflet(c)) + SEMELLE()
    + fin('M114 374 L130 378 M116 381 L132 384', K, 2.5),
  montantes: (c) => forme('M106 340 H140 L142 372 Q148 376 148 388 L148 394 Q122 400 98 396 Q96 372 106 366Z', c, reflet(c))
    + `<circle cx="131" cy="352" r="6" fill="#fff" stroke-width="3"/>` + SEMELLE() + fin('M112 350 L124 348 M112 358 L124 356 M114 370 L130 374', K, 2.5),
  bottines: (c) => forme('M106 346 H140 L142 372 Q150 378 150 390 L150 396 Q122 402 98 398 Q96 374 106 368Z', c, reflet(c))
    + SEMELLE(teinte(c, 0.55)) + fin('M112 352 L134 360 M134 352 L112 360 M112 364 L134 372 M134 364 L112 372', teinte(c, 1.5), 2.5),
  bottes: (c) => forme('M104 318 H142 L144 374 Q150 380 150 390 L150 396 Q122 402 98 398 Q96 380 104 372Z', c,
    `<path d="M132 320 H142 L144 374 Q140 376 136 376Z" fill="${ombre(c)}" stroke="none"/>`) + SEMELLE(teinte(c, 0.55))
    + fin('M112 328 L112 362', teinte(c, 1.5), 4),
  sandales: (c, p) => forme('M100 390 Q98 372 122 370 Q146 370 146 388 L146 392 Q122 396 100 392Z', p)
    + fin('M112 386 L113 391 M122 387 L123 392 M132 386 L133 391', K, 2) + tube('M104 378 Q122 368 142 378', c, 6) + SEMELLE(c),
};
const chaussures = (forme_, c, p, yb) => miroir(`<g transform="translate(2 ${yb - 374}) translate(122 386) scale(.84) translate(-122 -386)">`
  + CHAUSSURES[forme_](c, p) + '</g>');

// Le héros en entier, dans un cadre de 300 × 420 ; `expression` : content, attaque ou aie (cahier §7.12).
export function dessinerHeros(h, expression = 'content') {
  const v = Object.fromEntries(PIECES.map((p) => [p.cle, (p.choix[h[p.cle]] || p.choix[0]).v]));
  const { peau: p, coiffure, cheveux: ch, haut, couleur: t } = v;
  const combi = haut === 'combinaison';
  const bas = combi ? 'jean' : v.bas;
  const cb = combi ? t : v.couleurBas;
  const fauteuil = v.marche === 'fauteuil';
  const yb = fauteuil ? 356 : 374;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" aria-hidden="true" focusable="false">${DEFS}`
    + `<ellipse cx="150" cy="406" rx="88" ry="10" fill="#000" opacity=".12"/>`
    + `<g stroke="${K}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">`;
  if (fauteuil) s += miroir(`<rect x="56" y="262" width="28" height="134" rx="14" fill="#5F5E5A"/><circle cx="70" cy="330" r="8" fill="#B4B2A9"/>`);
  s += (ARRIERE[coiffure] || (() => ''))(ch);
  s += jambesDe(bas, cb, p, yb) + chaussures(v.chaussures, v.couleurChaussures, p, yb) + dessusBas(bas, cb);
  if (fauteuil) s += `<rect x="92" y="282" width="116" height="22" rx="8" fill="#888780"/><rect x="100" y="386" width="100" height="10" rx="5" fill="#888780"/>`;
  s += bras(p, haut === 'veste' ? DENIM : t, LONGUES.includes(haut)) + dessinerHaut(haut, t, p);
  const salopette = !combi && (bas === 'salopette' || bas === 'salopetteShort') && haut !== 'robe';
  if (salopette) s += bavette(cb);
  s += forme('M139 178 L139 198 Q150 204 161 198 L161 178Z', p, `<path d="M139 182 Q150 194 161 182 L161 190 Q150 198 139 190Z" fill="${ombre(p)}" stroke="none"/>`);
  s += detailsCol(haut, t);
  if (v.motif) {
    const [y, k] = salopette ? [264, 0.8] : haut === 'veste' ? [246, 0.7] : haut === 'gilet' ? [252, 0.6] : [240, 1];
    s += `<g transform="translate(150 ${y}) scale(${k})" stroke-width="4">${MOTIF[v.motif]}</g>`;
  }
  // Tête : oreilles, visage et son ombre, joues, yeux, nez, bouche, cheveux, lunettes, chapeau.
  s += miroir(forme('M90 98 C70 92 64 120 72 132 C78 142 90 140 92 132Z', p) + fin('M80 108 C74 118 78 128 86 130', K, 3));
  s += forme('M84 104 C84 54 116 36 150 36 C184 36 216 54 216 104 C216 140 206 162 186 174 C172 182 162 184 150 184 C138 184 128 182 114 174 C94 162 84 140 84 104Z', p,
    `<path d="M188 56 C206 80 210 130 190 160 C178 174 164 180 150 182 C176 182 214 160 216 104 C216 80 204 64 188 56Z" fill="${ombre(p)}" stroke="none"/>`);
  s += joues(v.visage) + yeux(v.yeux, expression, coiffure === 'rasés' ? teinte(p, 0.45) : ch)
    + fin('M146 130 C138 138 142 148 152 147 C158 146 160 141 156 138', K, 3) + BOUCHE[expression];
  s += (AVANT[coiffure] || (() => ''))(ch);
  if (v.lunettes) s += LUNETTES[v.lunettes];
  if (v.tete) s += TETE[v.tete];
  return s + '</g></svg>';
}
