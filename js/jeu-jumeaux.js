// Jeu « Les jumeaux » (cahier 7.9, demandé le 2026-11-08) : la carte A montre 4 dessins, la carte B 4 mots
// (haut-parleurs, ou mots écrits dans la version sans son). Un seul mot de B va avec un dessin de A : l'enfant touche ce dessin.
// 8 manches, un jumeau différent à chaque fois. Version difficile : 6 + 6. Rien n'est enregistré.
import { el, icone, muet } from './outils.js?v=8e00c834';
import { cheminSon } from './donnees.js?v=8e00c834';
import { creerLecteur, arreter } from './audio.js?v=8e00c834';
import { visuel } from './cartes.js?v=8e00c834';
import { melanger, sansArticle, bilanEntraine, compteur, bravo, fete } from './exercices.js?v=8e00c834';
import { avatar } from './avatar.js?v=8e00c834';

const MANCHES = 8;
const utilisables = (contenu) => contenu.mots.filter((m) => m.son || muet); // version muette : le mot est écrit

// ---------- Mots qui ne doivent pas se trouver dans la même manche (validé par l'enseignant le 2026-11-08) ----------

// Deux façons de dire la même chose (Het weer), un pays et sa langue (P5), deux mots trop proches.
const PAIRES = [
  ['zon', 'het is zonnig'], ['wolken', 'het is bewolkt'], ['regen', 'het regent'], ['sneeuw', 'het sneeuwt'],
  ['wind', 'het is winderig'], ['mist', 'het is mistig'],
  ['frankrijk', 'frans'], ['spanje', 'spaans'], ['duitsland', 'duits'], ['china', 'chinees'], ['verenigd koninkrijk', 'engels'],
  ['france', 'french'], ['netherlands', 'dutch'], ['spain', 'spanish'], ['germany', 'german'], ['china', 'chinese'], ['united kingdom', 'english'],
  ['bus', 'coach'],
].map((p) => p.join('|'));

// « Het is warm. » -> « het is warm » ; « the Netherlands » -> « netherlands ».
const simple = (m) => (/[.!?]$/.test(m.mot) ? m.mot : sansArticle(m.mot)).toLowerCase().replace(/^the\s+/, '').replace(/[.!?]/g, '').trim(); // une phrase garde son « Het »
const cleIndice = (m) => `${m.ind.type}:${m.ind.src || m.ind.fond || m.ind.texte}`;
const contient = (a, b) => ` ${a.replace(/-/g, ' ')} `.includes(` ${b.replace(/-/g, ' ')} `); // mot entier : « bruin » dans « bruin haar »

// Deux mots qu'on pourrait confondre : même dessin, couleur, chiffre ou français (« een » et « één » : « 1 »),
// l'un contenu dans l'autre (« warm », « Het is warm. »), ou une paire de la liste.
export function seConfondent(a, b) {
  const [x, y] = [simple(a), simple(b)];
  return cleIndice(a) === cleIndice(b) || contient(x, y) || contient(y, x)
    || PAIRES.includes(`${x}|${y}`) || PAIRES.includes(`${y}|${x}`);
}

// Le jumeau d'abord, puis des mots qui ne se confondent avec aucun autre, jusqu'à `taille` mots (ou moins s'il en manque).
function choisir(jumeau, pool, taille) {
  const choisis = [jumeau];
  for (const m of melanger(pool)) {
    if (choisis.length === taille) break;
    if (!choisis.some((c) => c === m || seConfondent(c, m))) choisis.push(m);
  }
  return choisis;
}

// Assez de mots sans confusion pour une manche ? (calcul sans hasard : le menu ne change pas d'une visite à l'autre)
function assez(pool, taille) {
  const garde = [];
  for (const m of pool) if (!garde.some((c) => seConfondent(c, m))) garde.push(m);
  return garde.length >= taille && pool.length >= MANCHES;
}

// `manches` manches de `cote` dessins sur A et `cote` mots sur B : 1 jumeau (jamais deux fois le même), cote - 1 mots seulement sur A, cote - 1 seulement sur B.
export function planJumeaux(pool, cote, manches = MANCHES) {
  const taille = 2 * cote - 1;
  const plan = [];
  for (const jumeau of melanger(pool)) {
    if (plan.length === manches) break;
    const mots = choisir(jumeau, pool, taille);
    if (mots.length < taille) continue; // ce jumeau se confond avec trop de mots : on en prend un autre
    const [, ...autres] = mots;
    plan.push({
      jumeau,
      a: melanger([jumeau, ...autres.slice(0, cote - 1)]),
      b: melanger([jumeau, ...autres.slice(cote - 1)]),
    });
  }
  return plan;
}

// ---------- Dessins du jeu (originaux, faits par Claude) ----------

const NS = 'http://www.w3.org/2000/svg';
function svg(attrs, ...enfants) {
  const s = document.createElementNS(NS, attrs.balise || 'svg');
  for (const [k, v] of Object.entries(attrs)) if (k !== 'balise') s.setAttribute(k, v);
  s.append(...enfants);
  return s;
}

// Une forme et sa couleur par mot de la carte B, pour s'en souvenir (pas de chiffres : ils se confondraient avec ceux du chapitre).
const FORMES = [
  ['rond', '#2563eb', { balise: 'circle', cx: 12, cy: 12, r: 9 }],
  ['triangle', '#c2410c', { balise: 'path', d: 'M12 3 21.5 20h-19z' }],
  ['carré', '#15803d', { balise: 'rect', x: 3.5, y: 3.5, width: 17, height: 17, rx: 2 }],
  ['étoile', '#b45309', { balise: 'path', d: 'm12 2.5 2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z' }],
  ['losange', '#be185d', { balise: 'path', d: 'M12 2.5 21.5 12 12 21.5 2.5 12z' }],
  ['cœur', '#4338ca', { balise: 'path', d: 'M12 20.5S3 15 3 8.8A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 9 2.2C21 15 12 20.5 12 20.5z' }],
];
const forme = (k) => svg({ class: 'forme-jumeaux', viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg({ ...FORMES[k][2], fill: FORMES[k][1] }));

// Pictogramme du menu (deux cartes reliées), ajouté au jeu d'icônes de la page.
function ajouterPictogramme() {
  const sprite = document.querySelector('svg.sprite');
  if (!sprite || sprite.querySelector('#jumeaux')) return;
  sprite.append(svg({ balise: 'symbol', id: 'jumeaux', viewBox: '0 0 24 24' },
    svg({ balise: 'rect', x: 2.5, y: 5, width: 8, height: 14, rx: 2 }),
    svg({ balise: 'rect', x: 13.5, y: 5, width: 8, height: 14, rx: 2 }),
    svg({ balise: 'circle', cx: 6.5, cy: 12, r: 1.8 }),
    svg({ balise: 'circle', cx: 17.5, cy: 12, r: 1.8 }),
    svg({ balise: 'path', d: 'M8.3 12h7.4' })));
}
if (typeof document !== 'undefined') {
  ajouterPictogramme();
  if (!document.querySelector('link[href*="jeu-jumeaux.css"]')) {
    document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-jumeaux.css?v=8e00c834' }));
  }
}

// ---------- Une manche ----------

function manche(q, ctx, rang, total, fin) {
  const { langue, dossier } = ctx;
  let erreurs = 0;
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('jumeaux'), 'Trouve le dessin qui a son jumeau.');
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une réponse
  const message = el('div', { class: 'message-ex' }, av, retour);
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === total ? 'Terminer' : 'Suivant', icone('droite'));
  suite.addEventListener('click', fin);
  const dire = (ic, txt, pose) => { retour.replaceChildren(icone(ic), txt); av.pose(pose); av.hidden = false; };

  // Carte B : un haut-parleur par mot (avec sa forme), ou le mot écrit.
  const motsB = q.b.map((m, k) => {
    const lecteur = muet ? null : creerLecteur(cheminSon(m, dossier), { nom: `le mot ${FORMES[k][0]}`, avecBarre: false, lent: false });
    const bloc = el('div', { class: 'mot-jumeaux' }, muet ? el('span', { class: 'mot', lang: langue }, m.mot) : forme(k), lecteur || '');
    bloc.lecteur = lecteur;
    return bloc;
  });
  const bJumeau = motsB[q.b.indexOf(q.jumeau)];

  // Carte A : les dessins à toucher.
  const dessins = q.a.map((m, k) => {
    const b = el('button', { type: 'button', class: 'reponse dessin-jumeaux' }, visuel(m, m.ind, langue));
    b.style.setProperty('--rang', k); // les dessins arrivent l'un après l'autre (CSS)
    b.addEventListener('click', () => toucher(b, m === q.jumeau));
    return b;
  });
  const bon = dessins[q.a.indexOf(q.jumeau)];

  function toucher(b, juste) {
    if (juste) {
      for (const d of dessins) { d.disabled = true; d.classList.remove('indique'); }
      b.classList.add('juste');
      b.append(el('span', { class: 'marque-ex' }, icone('coche')));
      bJumeau.classList.add('juste');
      bJumeau.append(el('span', { class: 'marque-ex' }, icone('coche')));
      dire('sourire', bravo(), 'content');
      relier(b, bJumeau);
      bJumeau.lecteur?.jouer(); // le jumeau prononcé, juste après le toucher (permis sur iPhone)
      suite.hidden = false;
      suite.focus();
      return;
    }
    b.disabled = true;
    b.classList.add('faux');
    b.append(el('span', { class: 'marque-ex' }, icone('croix')));
    erreurs += 1;
    if (erreurs >= 2) bon.classList.add('indique'); // cadre épais et fixe sur la bonne réponse
    dire('tourner', 'Essaie encore !', 'reflechit');
  }

  const cartes = el('div', { class: 'cartes-jumeaux' },
      el('section', { class: 'carte-jumeaux', 'aria-label': 'Carte des dessins' }, el('div', { class: 'grille-jumeaux' }, ...dessins)),
      el('section', { class: muet ? 'carte-jumeaux b' : 'carte-jumeaux b sons', 'aria-label': muet ? 'Carte des mots' : 'Carte des sons' }, el('div', { class: 'grille-jumeaux' }, ...motsB)));

  // Un trait de la couleur du chapitre relie le dessin à son jumeau, puis s'efface (rien si moins d'animations).
  function relier(a, b) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const o = cartes.getBoundingClientRect();
    const centre = (x) => { const r = x.getBoundingClientRect(); return [r.left + r.width / 2 - o.left, r.top + r.height / 2 - o.top]; };
    const [[x1, y1], [x2, y2]] = [centre(a), centre(b)];
    const trait = svg({ class: 'lien-jumeaux', 'aria-hidden': 'true' }, svg({ balise: 'line', x1, y1, x2, y2 }));
    cartes.append(trait);
    setTimeout(() => trait.remove(), 600); // fin du fondu (0,5 s)
  }

  const zone = el('div', { class: `exercice jumeaux c${q.a.length}` },
    el('div', { class: 'tete-ex' }, titre, compteur(rang, total)),
    cartes, message, suite);
  zone.titre = titre;
  return zone;
}

function lanceur(cote) {
  return function lancer(zone, contenu) {
    const plan = planJumeaux(utilisables(contenu), cote);
    let i = 0;
    function suivante() {
      arreter();
      if (i === plan.length) {
        bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, `Tu as trouvé les ${plan.length} jumeaux !`));
        return fete(zone.querySelector('.bilan')); // pluie d'étoiles du site (rien si moins d'animations)
      }
      i += 1;
      const q = manche(plan[i - 1], contenu, i, plan.length, suivante);
      zone.replaceChildren(q);
      if (i > 1) q.titre.focus();
    }
    suivante();
  };
}

export default {
  id: 'jumeaux',
  nom: 'Les jumeaux',
  icone: 'jumeaux',
  // 7 mots qui ne se confondent pas (4 + 4, dont le jumeau), et 8 mots en tout pour 8 jumeaux différents.
  possible: (contenu) => assez(utilisables(contenu), 7),
  lancer: lanceur(4),
};

export const jumeauxDifficile = {
  id: 'jumeaux-difficile',
  nom: 'Les jumeaux (difficile)',
  icone: 'jumeaux',
  possible: (contenu) => assez(utilisables(contenu), 11), // 6 + 6
  lancer: lanceur(6),
};
