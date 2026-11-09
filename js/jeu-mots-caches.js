// Jeu « Les mots cachés » (document de l'enseignant, jeu 13) : une petite grille de lettres cache 3 mots
// (4 sur grand écran), de gauche à droite ou de haut en bas. Au-dessus, leurs indices (dessin, couleur, chiffre
// ou français), jamais le mot écrit. On touche la première puis la dernière lettre d'un mot. 3 grilles par partie.
// Version sans son (?muet=1) : mêmes indices, sans haut-parleur. Rien n'est enregistré.
import { el, icone, muet } from './outils.js?v=38e1124f';
import { cheminSon } from './donnees.js?v=38e1124f';
import { creerLecteur, arreter } from './audio.js?v=38e1124f';
import { melanger, bilanEntraine, bravo, compteur, fete } from './exercices.js?v=38e1124f';
import { avatar } from './avatar.js?v=38e1124f';

const GRILLES = 3; // grilles par partie
// Téléphone : 5 × 5, 3 mots de 3 à 5 lettres. Grand écran (tablette, ordinateur) : 6 × 6, 4 mots jusqu'à 6 lettres.
export const FORMATS = { petit: { taille: 5, nb: 3, max: 5 }, grand: { taille: 6, nb: 4, max: 6 } };
// Lettres de remplissage : l'alphabet de la langue (en néerlandais, sans q, x, y, rares dans ses mots).
const ALPHABETS = { nl: 'abcdefghijklmnoprstuvwz', en: 'abcdefghijklmnopqrstuvwxyz' };

const sansAccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Le mot caché : sans article (« de fiets » → « fiets »), en minuscules (décision de l'enseignant du 2026-11-08).
export const motCache = (mot) => mot.replace(/^(de|het|the|a|an)\s+/i, '').toLowerCase();
const cleIndice = (ind) => `${ind.type}:${ind.src || ind.fond || ind.texte}`;

// Mots admis : lettres simples seulement (ni accent, ni espace, ni apostrophe, ni trait d'union), de 3 à `max` lettres,
// chacun une fois. Un indice « français » identique au mot (« bus ») donnerait la réponse : mot écarté.
export function motsAdmis(mots, max = 5) {
  const vus = new Set();
  return mots.filter((m) => {
    const w = motCache(m.mot);
    if (!/^[a-z]+$/.test(w) || w.length < 3 || w.length > max || vus.has(w)) return false;
    if (m.ind.type === 'francais' && sansAccent(m.ind.texte).replace(/^(le|la|les|l')\s*/, '') === w) return false;
    vus.add(w);
    return true;
  });
}

// Les mots d'une grille : d'abord ceux pas encore sortis dans la partie, jamais deux fois le même indice,
// et jamais un mot contenu dans un autre (« short » dans « shorts » : deux réponses au même endroit).
export function choisirMots(pool, nb, sortis = new Set()) {
  const ordre = [...melanger(pool.filter((m) => !sortis.has(m))), ...melanger(pool.filter((m) => sortis.has(m)))];
  const choisis = [];
  for (const m of ordre) {
    if (choisis.length === nb) break;
    const w = motCache(m.mot);
    if (choisis.some((c) => cleIndice(c.ind) === cleIndice(m.ind) || motCache(c.mot).includes(w) || w.includes(motCache(c.mot)))) continue;
    choisis.push(m);
  }
  return choisis;
}

// Toutes les lignes et colonnes de la grille, lues dans le sens du jeu (gauche → droite, haut → bas).
const lignesDe = (g) => [...g, ...g[0].map((_, c) => g.map((r) => r[c]))].map((l) => l.join(''));
const occurrences = (lignes, w) => lignes.reduce((n, l) => { let k = 0; for (let i = l.indexOf(w); i >= 0; i = l.indexOf(w, i + 1)) k++; return n + k; }, 0);

// Fabrique une grille : renvoie { lettres (tableau de lignes), places: [{ r, c, dr, dc, long }] } ou null.
// Les mots se croisent seulement sur une même lettre. Chaque mot caché apparaît une seule fois, et aucun autre mot
// du chapitre (`lexique`) n'apparaît par hasard, sauf s'il est contenu dans un mot caché.
export function fabriquerGrille(mots, taille, langue, lexique = [], hasard = Math.random) {
  const alphabet = ALPHABETS[langue] || ALPHABETS.en;
  const tire = (n) => Math.floor(hasard() * n);
  const interdits = lexique.filter((w) => !mots.some((m) => m.includes(w)));
  for (let essai = 0; essai < 300; essai++) {
    const g = Array.from({ length: taille }, () => Array(taille).fill(''));
    const places = [];
    let ok = true;
    for (const w of mots) {
      let place = null;
      for (let t = 0; t < 60 && !place; t++) {
        const [dr, dc] = tire(2) ? [0, 1] : [1, 0];
        const r = tire(taille - dr * (w.length - 1));
        const c = tire(taille - dc * (w.length - 1));
        if ([...w].every((x, i) => [x, ''].includes(g[r + dr * i][c + dc * i]))) place = { r, c, dr, dc, long: w.length };
      }
      if (!place) { ok = false; break; }
      [...w].forEach((x, i) => { g[place.r + place.dr * i][place.c + place.dc * i] = x; });
      places.push(place);
    }
    if (!ok) continue;
    for (const ligne of g) ligne.forEach((x, k) => { if (!x) ligne[k] = alphabet[tire(alphabet.length)]; });
    const lignes = lignesDe(g);
    if (mots.every((w) => occurrences(lignes, w) === 1) && interdits.every((w) => occurrences(lignes, w) === 0)) {
      return { lettres: g, places };
    }
  }
  return null;
}

// L'indice d'un mot, sans jamais l'écrire (le texte de remplacement est le français, pas la réponse).
function vueIndice(m) {
  const { ind } = m;
  const fr = m.francais || '';
  if (ind.type === 'image') return el('img', { class: 'image', src: ind.src, alt: fr, loading: 'lazy' });
  if (ind.type === 'couleur') {
    const c = el('span', { class: 'carre', role: 'img', 'aria-label': fr || 'Couleur' });
    c.style.setProperty('--fond', ind.fond);
    return c;
  }
  if (ind.type === 'texte') return el('span', { class: ind.texte.length <= 3 ? 'tuile court' : 'tuile' }, ind.texte);
  return el('span', { class: 'francais' }, ind.texte);
}

const grandEcran = () => typeof matchMedia !== 'undefined' && matchMedia('(min-width: 37.5rem)').matches;

function lancer(zone, contenu, rang = 1, sortis = new Set()) {
  arreter();
  const { langue, dossier } = contenu;
  const lexiqueDe = (max) => motsAdmis(contenu.mots, max);
  let format = grandEcran() ? FORMATS.grand : FORMATS.petit;
  let pool = lexiqueDe(format.max);
  if (pool.length < 6) { format = FORMATS.petit; pool = lexiqueDe(format.max); } // trop peu de mots longs : grille de téléphone
  let choisis = choisirMots(pool, format.nb, sortis);
  let grille = null;
  // Rare : une grille impossible à remplir proprement ; on retire d'autres mots, puis un mot de moins.
  for (let k = 0; k < 6 && !grille; k++) {
    if (k) choisis = choisirMots(pool, k < 4 ? format.nb : Math.max(2, format.nb - 1), sortis);
    grille = fabriquerGrille(choisis.map((m) => motCache(m.mot)), format.taille, langue, pool.map((m) => motCache(m.mot)));
  }
  choisis.forEach((m) => sortis.add(m));
  const { taille } = format;
  const trouves = new Set();
  let premiere = null; // case touchée en premier : [ligne, colonne]
  let erreurs = 0;

  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('mots-caches'), 'Touche la première et la dernière lettre.');
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une réponse
  const message = el('div', { class: 'message-ex' }, av, retour);
  const suite = el('div', { class: 'suite-loto', hidden: '' });
  const dire = (ic, txt, pose) => { retour.replaceChildren(icone(ic), txt); av.pose(pose); av.hidden = false; };

  // Indices : un par mot, avec un petit haut-parleur (seulement si le son existe et hors version sans son).
  const lecteurs = choisis.map((m, k) => (m.son && !muet ? creerLecteur(cheminSon(m, dossier), { nom: `le mot ${k + 1}`, avecBarre: false, lent: false }) : null));
  const indices = choisis.map((m, k) => el('li', { class: 'mc-indice' }, vueIndice(m), lecteurs[k] || ''));

  const plateau = el('div', { class: `mc-grille mc-${taille} mc-neuve`, role: 'group', 'aria-label': 'Grille de lettres' });
  const cases = grille.lettres.map((ligne, r) => ligne.map((x, c) => {
    const b = el('button', { type: 'button', class: 'mc-case', lang: langue, 'aria-label': `${x}, ligne ${r + 1}, colonne ${c + 1}` }, x);
    b.style.gridRow = r + 1;
    b.style.gridColumn = c + 1;
    b.style.setProperty('--r', r); // arrivée rangée après rangée, vague de fin colonne après colonne (CSS)
    b.style.setProperty('--c', c);
    b.addEventListener('click', () => toucher(r, c));
    plateau.append(b);
    return b;
  }));

  const effacerCroix = () => plateau.querySelectorAll('.mc-case.faux').forEach((b) => { b.classList.remove('faux'); b.querySelector('.marque-ex')?.remove(); });
  const extremites = (p) => [[p.r, p.c], [p.r + p.dr * (p.long - 1), p.c + p.dc * (p.long - 1)]];
  const meme = (a, b) => a[0] === b[0] && a[1] === b[1];

  // Mot trouvé : un cadre continu autour de ses lettres, avec une coche ; son indice s'estompe.
  function entourer(k) {
    const p = grille.places[k];
    const cadre = el('span', { class: `mc-trouve mc-couleur-${k}`, 'aria-hidden': 'true' }, el('span', { class: 'marque-ex' }, icone('coche')));
    cadre.style.gridRow = `${p.r + 1} / span ${p.dr ? p.long : 1}`;
    cadre.style.gridColumn = `${p.c + 1} / span ${p.dc ? p.long : 1}`;
    plateau.append(cadre);
    for (let i = 0; i < p.long; i++) {
      const b = cases[p.r + p.dr * i][p.c + p.dc * i];
      b.style.setProperty('--i', i); // les lettres sautillent l'une après l'autre (CSS)
      b.classList.add('dans-mot');
    }
    indices[k].classList.add('trouve');
    indices[k].append(el('span', { class: 'marque-ex mc-coche' }, icone('coche')));
  }

  function toucher(r, c) {
    effacerCroix();
    plateau.classList.remove('mc-neuve'); // sinon l'arrivée des lettres rejouerait quand une case perd sa classe
    plateau.querySelector('.mc-aide')?.classList.remove('mc-aide');
    const b = cases[r][c];
    if (!premiere) {
      premiere = [r, c];
      b.classList.add('choisie');
      return;
    }
    const debut = premiere;
    premiere = null;
    cases[debut[0]][debut[1]].classList.remove('choisie');
    if (meme(debut, [r, c])) return; // le même toucher deux fois : la sélection s'annule, sans rien dire
    // L'ordre des deux touchers n'est pas exigé : un enfant qui commence par la fin a quand même trouvé le mot.
    const k = grille.places.findIndex((p, i) => {
      const [a, z] = extremites(p);
      return !trouves.has(i) && ((meme(a, debut) && meme(z, [r, c])) || (meme(z, debut) && meme(a, [r, c])));
    });
    if (k >= 0) {
      trouves.add(k);
      erreurs = 0;
      entourer(k);
      lecteurs[k]?.jouer(); // le mot prononcé (après un toucher de l'enfant)
      if (trouves.size === choisis.length) return finGrille();
      return dire('sourire', bravo(), 'content');
    }
    b.classList.add('faux');
    b.append(el('span', { class: 'marque-ex' }, icone('croix')));
    erreurs += 1;
    dire('tourner', 'Essaie encore !', 'reflechit');
    // Après deux essais : la première lettre d'un mot à trouver reçoit un cadre épais (fixe, jamais clignotant).
    if (erreurs >= 2) {
      const p = grille.places.find((_, i) => !trouves.has(i));
      cases[p.r][p.c].classList.add('mc-aide');
    }
  }

  function finGrille() {
    cases.flat().forEach((b) => { b.disabled = true; });
    plateau.classList.add('mc-fin'); // petite vague sur toute la grille
    if (rang === GRILLES) {
      dire('etoile', bravo(), 'bravo');
      const voir = el('button', { type: 'button', class: 'action' }, 'Continuer', icone('droite'));
      voir.addEventListener('click', () => { arreter(); bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, 'Tu as trouvé tous les mots cachés !')); fete(zone); });
      suite.replaceChildren(voir);
    } else {
      dire('etoile', 'Grille terminée, bravo !', 'bravo');
      const suivante = el('button', { type: 'button', class: 'action' }, 'Grille suivante', icone('droite'));
      suivante.addEventListener('click', () => lancer(zone, contenu, rang + 1, sortis));
      suite.replaceChildren(suivante);
    }
    suite.hidden = false;
    suite.querySelector('button').focus({ preventScroll: true });
  }

  zone.replaceChildren(el('div', { class: 'exercice mots-caches' },
    el('div', { class: 'tete-ex' }, titre, compteur(rang, GRILLES)),
    el('ul', { class: 'mc-indices', 'aria-label': 'Les mots à trouver' }, ...indices),
    plateau, message, suite));
  if (rang > 1) titre.focus({ preventScroll: true });
}

// Pictogramme du menu (ajouté au jeu d'icônes de la page) et styles du jeu, une seule fois.
if (typeof document !== 'undefined') {
  const sprite = document.querySelector('svg.sprite');
  if (sprite && !sprite.querySelector('#mots-caches')) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
    s.setAttribute('id', 'mots-caches');
    s.setAttribute('viewBox', '0 0 24 24');
    // Une grille de 2 × 2 cases et une loupe posée dessus (dessin original).
    s.innerHTML = '<rect x="2.5" y="2.5" width="13" height="13" rx="2"/><path d="M9 2.5v13M2.5 9h13"/><circle cx="16" cy="16" r="4"/><path d="M19 19l3 3"/>';
    sprite.append(s);
  }
  if (!document.querySelector('link[href*="jeu-mots-caches.css"]')) {
    document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-mots-caches.css?v=38e1124f' }));
  }
}

export default {
  id: 'mots-caches',
  nom: 'Les mots cachés',
  icone: 'mots-caches',
  // Au moins 6 mots de 3 à 5 lettres (pour 2 grilles différentes sur téléphone).
  possible: (contenu) => motsAdmis(contenu.mots, FORMATS.petit.max).length >= 6,
  lancer: (zone, contenu) => lancer(zone, contenu),
};
