// Jeu « Le robot réparateur » (jeu 6, validé par l'enseignant le 2026-11-08) : un mot avec un trou sur un
// groupe de lettres difficile (ij, ui, sh, th…) ; l'enfant choisit la pièce qui manque parmi 3 boutons
// (4 en version difficile, avec deux trous). Chaque mot réussi répare un morceau de l'objet (robot et objet : choix du 2026-11-09). 6 mots par partie.
// Sans son (?muet=1) : l'indice et le mot à trous suffisent ; le mot entier n'est jamais montré avant la réponse.
import { el, icone, muet } from './outils.js?v=4a69adff';
import { cheminSon, fichiersPresents, lireCatalogue, lireChapitre, chargerTexte, cheminChapitre } from './donnees.js?v=4a69adff';
import { creerLecteur, arreter } from './audio.js?v=4a69adff';
import { visuel, chercherFichiers } from './cartes.js?v=4a69adff';
import { melanger, bilanEntraine, compteur, bravo, fete } from './exercices.js?v=4a69adff';
import { avatar } from './avatar.js?v=4a69adff';

export const MANCHES = 6;

// Groupes de lettres à cacher et leurs leurres, validés par l'enseignant le 2026-11-08.
export const GROUPES = {
  nl: { sch: ['sk', 'sh', 'ch'], ij: ['ei', 'y', 'ie'], ei: ['ij', 'ie', 'ee'], ui: ['ou', 'eu', 'oe'], oe: ['ou', 'uu', 'oo'],
    ie: ['ee', 'i', 'ei'], ee: ['e', 'ie', 'ei'], oo: ['o', 'oe', 'ou'], aa: ['a', 'ee', 'au'], uu: ['u', 'oe', 'ui'],
    eu: ['ui', 'oe', 'uu'], au: ['ou', 'aa', 'oe'], ou: ['au', 'oe', 'uu'], ng: ['nk', 'n', 'g'], nk: ['ng', 'k', 'nc'], ch: ['g', 'k', 'sch'] },
  en: { igh: ['i', 'y', 'ie'], sh: ['ch', 's', 'ss'], ch: ['sh', 'tch', 'k'], th: ['f', 't', 'd'], ph: ['f', 'ff', 'p'],
    ee: ['ea', 'ie', 'i'], ea: ['ee', 'e', 'ie'], oo: ['u', 'ou', 'o'], ai: ['ay', 'a', 'ei'], ay: ['ai', 'ey', 'a'],
    ck: ['k', 'c', 'kk'], wh: ['w', 'wr', 'h'] },
};
// Version difficile : le second trou, quand le mot n'a qu'un groupe difficile, est une lettre qu'on peut confondre.
const LETTRES = { a: ['e', 'o', 'u'], e: ['a', 'i', 'o'], i: ['e', 'y', 'a'], o: ['a', 'u', 'e'], u: ['o', 'a', 'e'], y: ['i', 'j', 'e'],
  b: ['p', 'd', 'v'], c: ['k', 's', 'g'], d: ['t', 'b', 'p'], f: ['v', 'ph', 'w'], g: ['k', 'h', 'j'], j: ['g', 'i', 'y'],
  k: ['c', 'g', 'q'], l: ['r', 'n', 'll'], m: ['n', 'w', 'mm'], n: ['m', 'u', 'nn'], p: ['b', 'd', 't'], r: ['l', 'w', 'rr'],
  s: ['z', 'c', 'ss'], t: ['d', 'p', 'tt'], v: ['f', 'w', 'b'], w: ['v', 'u', 'f'], x: ['ks', 's', 'z'], z: ['s', 'c', 'zz'] };

// L'article (de, het, the, to…) reste affiché et n'est jamais troué.
const ARTICLE = /^((?:de|het|the|to|an?)\s+)/i;
const garderCasse = (modele, x) => (modele[0] === modele[0].toUpperCase() && modele[0] !== modele[0].toLowerCase() ? x[0].toUpperCase() + x.slice(1) : x);
const nettoyer = (s) => s.toLowerCase().replace(/[.!?,]+$/, '').trim();

// Tous les trous possibles d'un mot : groupes difficiles (sans chevauchement, le plus long d'abord) et lettres simples.
// Un leurre qui donne un autre mot de la liste `connus` est écarté.
export function trousPossibles(texte, langue, connus = new Set()) {
  const debut = texte.match(ARTICLE)?.[1].length || 0;
  const bas = texte.toLowerCase();
  const groupes = Object.keys(GROUPES[langue] || {}).sort((a, b) => b.length - a.length);
  const valides = (pos, rep, leurres) => leurres.filter((l) => l !== rep && !connus.has(nettoyer(texte.slice(0, pos) + l + texte.slice(pos + rep.length))));
  const difficiles = [];
  const couverts = new Set();
  for (let i = debut; i < bas.length;) {
    const g = groupes.find((x) => bas.startsWith(x, i));
    if (!g) { i += 1; continue; }
    const reponse = texte.slice(i, i + g.length);
    difficiles.push({ pos: i, reponse, leurres: valides(i, reponse, GROUPES[langue][g].map((l) => garderCasse(reponse, l))) });
    for (let k = i; k < i + g.length; k++) couverts.add(k);
    i += g.length;
  }
  const simples = [];
  for (let i = debut; i < bas.length; i++) {
    if (couverts.has(i) || !LETTRES[bas[i]]) continue;
    const reponse = texte[i];
    simples.push({ pos: i, reponse, leurres: valides(i, reponse, LETTRES[bas[i]].map((l) => garderCasse(reponse, l))) });
  }
  return { difficiles, simples };
}

const lettres = (texte) => texte.replace(/[^\p{L}]/gu, '').length;

// Les trous d'une manche (dans l'ordre du mot), chacun avec ses choix mélangés, ou null si le mot ne convient pas.
export function trousDuMot(texte, langue, connus, difficile) {
  if (lettres(texte) < 4) return null;
  const n = difficile ? 3 : 2;
  const { difficiles, simples } = trousPossibles(texte, langue, connus);
  const assez = (t) => t.leurres.length >= n;
  const premiers = melanger(difficiles.filter(assez));
  if (!premiers.length) return null;
  let trous = [premiers[0]];
  if (difficile) {
    // Un autre groupe difficile de préférence, sinon une lettre ; jamais collé au premier trou.
    trous = null;
    for (const p of premiers) {
      const loin = (t) => t.pos + t.reponse.length < p.pos || p.pos + p.reponse.length < t.pos;
      const second = melanger(premiers.filter(loin))[0] || melanger(simples.filter((t) => assez(t) && loin(t)))[0];
      if (second) { trous = [p, second].sort((a, b) => a.pos - b.pos); break; }
    }
    if (!trous) return null;
  }
  return trous.map((t) => ({ pos: t.pos, reponse: t.reponse, choix: melanger([t.reponse, ...melanger(t.leurres).slice(0, n)]) }));
}

// Mots qui conviennent : un indice (sans son, il faut qu'il ne soit pas le mot lui-même) et au moins un trou possible.
export function motsUtilisables(mots, langue, difficile, connus = new Set(mots.map((m) => nettoyer(m.mot)))) {
  return mots.filter((m) => m.ind && !(muet && m.ind.type === 'francais' && nettoyer(m.ind.texte) === nettoyer(m.mot))
    && trousDuMot(m.mot, langue, connus, difficile));
}

// ---------- Emprunts aux autres chapitres de la même année (chapitre trop petit) ----------

// Le catalogue est lu une seule fois au chargement, pour savoir dans le menu si un emprunt est possible.
let catalogue = [];
if (typeof document !== 'undefined') {
  catalogue = await chargerTexte('contenu/catalogue.txt').then((t) => lireCatalogue(t).chapitres, () => []);
}
const ici = (contenu) => contenu.dossier.split('/').filter(Boolean).pop();
const voisins = (contenu) => catalogue.filter((c) => c.langue === contenu.langue && c.annee === contenu.annee && c.chapitre !== ici(contenu));

const empruntes = new Map();
function motsVoisins(contenu) {
  const cle = `${contenu.langue}/${contenu.annee}`;
  if (!empruntes.has(cle)) {
    empruntes.set(cle, Promise.all(voisins(contenu).map(async (c) => {
      const dossier = cheminChapitre(contenu.langue, contenu.annee, c.chapitre);
      const texte = await chargerTexte(`${dossier}chapitre.txt`).catch(() => '');
      if (!texte) return [];
      const d = lireChapitre(texte);
      // 12 mots au hasard parmi ceux qui peuvent avoir un trou : peu de fichiers à vérifier (Verjaardag a 120 mots).
      const mots = melanger(d.mots.filter((m) => trousDuMot(m.mot, contenu.langue, new Set(), false))).slice(0, 12);
      // Leurs indices : même règle que les cartes (dessin, couleur, chiffre ou français), images vérifiées.
      const { presents, indices } = await chercherFichiers({ ...d, mots, phrases: [], pistes: [], dictees: [], ordre: [] }, dossier);
      return mots.map((m, k) => ({ ...m, dossier, chapitre: d.titre, ind: indices[k], son: presents.has(cheminSon(m, dossier)) }));
    })).then((l) => l.flat()));
  }
  return empruntes.get(cle);
}

// ---------- Le robot (dessin original de Claude, validé par l'enseignant le 2026-11-08) ----------

const CORPS = `
  <rect x="68" y="150" width="64" height="16" rx="6" fill="#4f5a72"/>
  <rect x="44" y="96" width="112" height="64" rx="16" fill="#0f766e"/>
  <rect x="58" y="108" width="84" height="40" rx="8" fill="#e6f4f1"/>
  <rect x="88" y="84" width="24" height="16" rx="4" fill="#4f5a72"/>
  <rect x="50" y="22" width="100" height="66" rx="22" fill="#14b8a6"/>
  <rect x="38" y="44" width="14" height="24" rx="6" fill="#0f766e"/>
  <rect x="148" y="44" width="14" height="24" rx="6" fill="#0f766e"/>`;
const VISAGE = (content) => `
  <circle cx="80" cy="52" r="10" fill="#fff"/><circle cx="120" cy="52" r="10" fill="#fff"/>
  <circle cx="${content ? 80 : 82}" cy="${content ? 51 : 54}" r="5" fill="#13203b"/><circle cx="${content ? 120 : 118}" cy="${content ? 51 : 54}" r="5" fill="#13203b"/>
  ${content ? '<path d="M84 70 Q100 82 116 70" fill="none" stroke="#13203b" stroke-width="4" stroke-linecap="round"/>' : '<path d="M88 72 H112" fill="none" stroke="#13203b" stroke-width="4" stroke-linecap="round"/>'}`;
// Les pièces du robot (antenne, bras, jambes, cœur) : il est entier, c'est lui qui répare.
const PIECES = [
  '<rect x="96" y="6" width="8" height="18" rx="3" fill="#4f5a72"/><circle cx="100" cy="8" r="7" fill="#f59e0b"/>',
  '<rect x="18" y="102" width="26" height="14" rx="7" fill="#14b8a6"/><rect x="12" y="104" width="14" height="40" rx="7" fill="#14b8a6"/><circle cx="19" cy="148" r="9" fill="#4f5a72"/>',
  '<rect x="156" y="102" width="26" height="14" rx="7" fill="#14b8a6"/><rect x="174" y="104" width="14" height="40" rx="7" fill="#14b8a6"/><circle cx="181" cy="148" r="9" fill="#4f5a72"/>',
  '<rect x="70" y="166" width="18" height="44" rx="6" fill="#14b8a6"/><rect x="60" y="208" width="34" height="16" rx="8" fill="#4f5a72"/>',
  '<rect x="112" y="166" width="18" height="44" rx="6" fill="#14b8a6"/><rect x="106" y="208" width="34" height="16" rx="8" fill="#4f5a72"/>',
  '<path d="M100 140 l-14 -14 a8 8 0 0 1 14 -10 a8 8 0 0 1 14 10 z" fill="#e11d48"/>',
];

// Choix de l'enseignant du 2026-11-09 : le robot est son dessin (Gemini) ; l'objet réparé est `robot-objet.png` du chapitre,
// sinon un dessin déjà présent d'un mot du chapitre (pas un mot de la partie, si possible), sinon un objet de la
// collection au hasard. Tant que rien n'existe : le robot et un vélo provisoires de Claude.
export const COLLECTION = ['velo', 'fusee', 'horloge', 'radio', 'bateau', 'voiture'].map((nom) => `contenu/robot/objet-${nom}.png`);
const ROBOT = 'contenu/robot/robot.png';
export const objetDuChapitre = (dossier) => `${dossier}robot-objet.png`;
let dessinRobot = '';
async function choisirObjet(contenu, plan) {
  const ici = objetDuChapitre(contenu.dossier);
  const presents = await fichiersPresents([ROBOT, ici, ...COLLECTION]);
  dessinRobot = presents.has(ROBOT) ? ROBOT : '';
  const dessines = contenu.mots.filter((m) => m.ind?.type === 'image');
  const src = presents.has(ici) ? ici
    : (melanger(dessines.filter((m) => !plan.includes(m)))[0] || melanger(dessines)[0])?.ind.src
    || melanger(COLLECTION.filter((c) => presents.has(c)))[0] || '';
  if (!src) return { src, haut: 200 };
  // Hauteur pour une largeur de 300 : les dessins des mots sont carrés, ceux de la collection en 3:2.
  const img = new Image();
  img.src = src;
  await img.decode().catch(() => {});
  return { src, haut: img.naturalWidth && img.naturalHeight ? Math.round((300 * img.naturalHeight) / img.naturalWidth) : 300 };
}

function robot(content = false) {
  if (dessinRobot) return el('img', { class: 'robot', src: dessinRobot, alt: 'Le robot réparateur' });
  const d = el('div', { class: 'robot', role: 'img', 'aria-label': 'Le robot réparateur' });
  d.innerHTML = `<svg viewBox="0 0 200 240" aria-hidden="true">${CORPS}${VISAGE(content)}${PIECES.join('')}</svg>`;
  return d;
}

// Objet provisoire (300 × 200, comme les dessins attendus en 3:2) : un vélo.
const VELO = `<rect width="300" height="200" fill="#fff7ed"/>
  <circle cx="75" cy="135" r="45" fill="none" stroke="#13203b" stroke-width="8"/><circle cx="225" cy="135" r="45" fill="none" stroke="#13203b" stroke-width="8"/>
  <path d="M75 135 L130 70 L200 70 L225 135 M130 70 L150 135 L200 70 M150 135 L75 135" fill="none" stroke="#c2410c" stroke-width="9" stroke-linejoin="round"/>
  <path d="M120 55 H150 M200 70 L195 45 H220" fill="none" stroke="#13203b" stroke-width="8" stroke-linecap="round"/>`;
// L'objet en 6 morceaux (3 colonnes, 2 rangées) : `n` morceaux en place, les autres en pointillés.
// `nouveau` : le dernier posé apparaît doucement (coupé par le CSS si moins d'animations).
function objet({ src, haut }, n, nouveau = false) {
  const contenuSvg = src ? `<image href="${src}" width="300" height="${haut}" preserveAspectRatio="xMidYMid slice"/>` : VELO;
  const d = el('div', { class: 'objet-robot', role: 'img', 'aria-label': n === 6 ? "L'objet est tout réparé." : `Objet à réparer : ${n} morceau${n > 1 ? 'x' : ''} sur 6.` });
  const h = haut / 2; // hauteur d'un morceau (largeur 100)
  d.style.setProperty('--ratio', `100 / ${h}`);
  d.style.flexBasis = `min(13.5rem, ${((9 * 300) / haut).toFixed(2)}rem)`; // l'objet ne dépasse pas 9rem de haut
  d.innerHTML = Array.from({ length: 6 }, (_, k) => (k < n
    ? `<svg class="${nouveau && k === n - 1 ? 'objet-pose' : ''}" viewBox="${(k % 3) * 100} ${Math.floor(k / 3) * h} 100 ${h}" aria-hidden="true">${contenuSvg}</svg>`
    : '<span class="objet-manque"></span>')).join('');
  // Animation 5 (choix du 2026-11-09) : quelques étoiles jaillissent du morceau réparé (cachées si moins d'animations).
  if (nouveau) {
    const k = n - 1;
    const pluie = el('span', { class: 'etincelles-robot', 'aria-hidden': 'true' },
      ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]) => {
        const e = el('span', {}, icone('etoile'));
        e.style.setProperty('--dx', `${x * 1.6}rem`);
        e.style.setProperty('--dy', `${y * 1.4}rem`);
        return e;
      }));
    pluie.style.left = `${((k % 3) + 0.5) * (100 / 3)}%`;
    pluie.style.top = `${(Math.floor(k / 3) + 0.5) * 50}%`;
    d.append(pluie);
    setTimeout(() => pluie.remove(), 700);
  }
  return d;
}

if (typeof document !== 'undefined' && !document.querySelector('link[href*="jeu-robot.css"]')) {
  document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-robot.css?v=4a69adff' }));
}

// L'indice : le texte de remplacement donne le français, jamais le mot à trouver.
function indice(m, langue) {
  const v = visuel(m, m.ind, langue);
  if (v.tagName === 'IMG') { v.alt = m.francais || 'Dessin'; v.removeAttribute('lang'); v.loading = 'eager'; }
  if (v.classList.contains('carre')) { v.setAttribute('aria-label', m.francais || 'Couleur'); v.removeAttribute('lang'); }
  return v;
}

// ---------- Le jeu ----------

async function lancer(zone, contenu, difficile) {
  const { langue } = contenu;
  // Chapitre trop petit : des mots des autres chapitres de la même année complètent la partie (après ceux du chapitre).
  let tous = contenu.mots;
  if (motsUtilisables(tous, langue, difficile).length < MANCHES && !contenu.revision) {
    const ici = new Set(tous.map((m) => nettoyer(m.mot)));
    tous = [...tous, ...(await motsVoisins(contenu)).filter((m) => !ici.has(nettoyer(m.mot)))];
  }
  const connus = new Set(tous.map((m) => nettoyer(m.mot))); // un leurre ne forme aucun de ces mots
  const mots = motsUtilisables(tous, langue, difficile, connus);
  const plan = [...melanger(mots.filter((m) => contenu.mots.includes(m))), ...melanger(mots.filter((m) => !contenu.mots.includes(m)))].slice(0, MANCHES);
  const src = await choisirObjet(contenu, plan);
  let pieces = 0;
  let premierCoup = 0;

  function poser() {
    arreter();
    if (pieces === plan.length) {
      // Animation 6 : l'objet saute, le robot sautille, pluie d'étoiles du site.
      bilanEntraine(zone, () => lancer(zone, contenu, difficile), 'bravo',
        el('div', { class: 'scene-robot fin-robot' }, robot(true), objet(src, 6)), el('p', {}, "L'objet est tout réparé !"),
        el('p', {}, `Du premier coup : ${premierCoup} mot${premierCoup > 1 ? 's' : ''} sur ${plan.length}.`));
      return fete(zone);
    }
    const m = plan[pieces];
    const dossier = m.dossier || contenu.dossier;
    const trous = trousDuMot(m.mot, langue, connus, difficile);
    let etape = 0;
    let erreurs = 0;
    let sansFaute = true;

    const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('crayon'),
      trous.length > 1 || trous[0].reponse.length > 1 ? 'Choisis les lettres qui manquent.' : 'Choisis la lettre qui manque.');
    const lecteur = !muet && m.son ? creerLecteur(cheminSon(m, dossier), { nom: 'le mot' }) : '';
    // L'écran du robot : le mot, avec des cases vides à la place des trous.
    const cases = trous.map((t) => el('span', { class: 'trou-robot', 'aria-label': 'lettres à trouver' }, '?'));
    const morceaux = [];
    let pos = 0;
    trous.forEach((t, k) => { morceaux.push(m.mot.slice(pos, t.pos), cases[k]); pos = t.pos + t.reponse.length; });
    morceaux.push(m.mot.slice(pos));
    const ecran = el('p', { class: `ecran-robot arrivee-robot${m.mot.length > 12 ? ' long' : ''}`, lang: langue }, ...morceaux);
    const dessinRobotJeu = robot();
    const dessin = objet(src, pieces);
    const reponses = el('div', { class: `reponses robot-choix n${trous[0].choix.length}` });
    const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
    const av = avatar('neutre');
    av.hidden = true; // l'avatar n'apparaît qu'après une réponse
    const message = el('div', { class: 'message-ex' }, av, retour);
    const suite = el('button', { type: 'button', class: 'action', hidden: '' }, pieces + 1 === plan.length ? 'Terminer' : 'Suivant', icone('droite'));
    suite.addEventListener('click', () => { pieces += 1; poser(); });
    const dire = (ic, txt, pose) => { retour.replaceChildren(icone(ic), txt); av.pose(pose); };

    function boutons() {
      const t = trous[etape];
      cases.forEach((c, k) => c.classList.toggle('actif', k === etape));
      erreurs = 0;
      reponses.replaceChildren(...t.choix.map((x) => {
        const b = el('button', { type: 'button', class: 'reponse' }, el('span', { class: 'mot', lang: langue }, x));
        b.addEventListener('click', () => choisir(b, x === t.reponse));
        return b;
      }));
    }

    function choisir(b, juste) {
      b.disabled = true;
      b.classList.add(juste ? 'juste' : 'faux');
      b.prepend(el('span', { class: 'marque-ex' }, icone(juste ? 'coche' : 'croix')));
      if (!juste) {
        sansFaute = false;
        erreurs += 1;
        dire('bulle', 'Essaie encore !', 'encourage');
        // Après deux erreurs, la bonne réponse est entourée d'un cadre épais (fixe).
        if (erreurs >= 2) [...reponses.children].find((x) => x.textContent === trous[etape].reponse)?.classList.add('entouree-robot');
        return;
      }
      cases[etape].textContent = trous[etape].reponse;
      cases[etape].classList.add('rempli');
      cases[etape].removeAttribute('aria-label');
      etape += 1;
      if (etape < trous.length) {
        dire('coche', 'Bien ! Encore une case.', 'content');
        return boutons();
      }
      for (const x of reponses.children) x.disabled = true;
      cases.forEach((c) => c.classList.remove('actif'));
      if (sansFaute) premierCoup += 1;
      dessin.replaceWith(objet(src, pieces + 1, true));
      dessinRobotJeu.classList.add('travaille'); // animation 4 : le robot se penche vers l'objet
      dire('sourire', bravo(), 'content');
      if (lecteur) lecteur.jouer(); // juste après un toucher de l'enfant : permis
      suite.hidden = false;
      suite.focus();
    }

    boutons();
    zone.replaceChildren(el('div', { class: 'exercice jeu-robot' },
      el('div', { class: 'tete-ex' }, titre, compteur(pieces + 1, plan.length)),
      el('div', { class: 'scene-robot arrivee-robot' }, dessinRobotJeu, dessin),
      el('div', { class: 'indice-robot' }, indice(m, langue)),
      lecteur, ecran, reponses, message, suite));
    if (pieces > 0) titre.focus();
  }
  poser();
}

// Assez de mots dans le chapitre, ou d'autres chapitres de la même année où en emprunter.
const possible = (difficile) => (contenu) => {
  const n = motsUtilisables(contenu.mots, contenu.langue, difficile).length;
  return n >= MANCHES || (n > 0 && !contenu.revision && voisins(contenu).length > 0);
};

export default {
  id: 'robot',
  nom: 'Le robot réparateur',
  icone: 'crayon',
  possible: possible(false),
  lancer: (zone, contenu) => lancer(zone, contenu, false),
};

export const robotDifficile = {
  id: 'robot-difficile',
  nom: 'Le robot réparateur (difficile)',
  icone: 'crayon',
  possible: possible(true),
  lancer: (zone, contenu) => lancer(zone, contenu, true),
};
