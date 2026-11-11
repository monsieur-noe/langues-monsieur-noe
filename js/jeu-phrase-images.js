// Jeu « La phrase en images » (jeu 9, demandé par l'enseignant le 2026-11-08) : une phrase écrite (et entendue) ;
// parmi 6 images, l'enfant touche dans l'ordre celles des mots de la phrase. 5 phrases par partie.
// Mots reconnus : ceux du chapitre qui ont un indice visuel (dessin, couleur, chiffre), plus les couleurs et les chiffres
// des autres chapitres de la même langue et de la même année (jamais leurs dessins : « groot » d'Het uiterlijk
// n'est pas le « groot » d'une trousse). Formes accordées ou pluriels : contenu/<langue>/alias.txt.
import { el, icone, muet, parametre } from './outils.js?v=16a7b2c4';
import { cheminSon, lireCatalogue, lireChapitre, chargerTexte, cheminChapitre } from './donnees.js?v=16a7b2c4';
import { creerLecteur, arreter } from './audio.js?v=16a7b2c4';
import { visuel, indice } from './cartes.js?v=16a7b2c4';
import { melanger, bilanEntraine, compteur, bravo, fete } from './exercices.js?v=16a7b2c4';
import { avatar } from './avatar.js?v=16a7b2c4';

const PAR_PARTIE = 5;
const MIN_PHRASES = 3;
const IMAGES = 6;
const ARTICLES = { nl: ['de', 'het'], en: ['the', 'a', 'an', 'to'] }; // « to » : « to swim » (verbes de P5)

// Mots d'un texte : minuscules, sans ponctuation (l'apostrophe reste : « baker's »).
export const decouper = (texte) => texte.toLowerCase().replace(/’/g, "'").split(/[^\p{L}\p{N}']+/u).filter(Boolean);

// Forme d'un mot de la liste, sans son article : « de fiets » -> « fiets ».
export function forme(mot, langue) {
  const t = decouper(mot);
  return (t.length > 1 && (ARTICLES[langue] || []).includes(t[0]) ? t.slice(1) : t).join(' ');
}

// alias.txt : « forme | mot, mot » par ligne ; les lignes incomplètes sont ignorées.
export function lireAlias(texte) {
  const alias = new Map();
  for (const ligne of texte.split(/\r?\n/)) {
    if (!ligne.trim() || ligne.trim().startsWith('#') || !ligne.includes('|')) continue;
    const [f, cibles] = ligne.split('|');
    const mots = cibles.split(',').map((x) => decouper(x).join(' ')).filter(Boolean);
    if (decouper(f).length && mots.length) alias.set(decouper(f).join(' '), mots);
  }
  return alias;
}

const cle = (m) => `${m.ind.type}:${m.ind.src || m.ind.fond || m.ind.texte}`;

// Les mots illustrés de la phrase, dans l'ordre. `dico` : forme -> mot (ceux du chapitre d'abord).
// En néerlandais, « een » est presque toujours l'article « un » : jamais le chiffre 1.
export function motsDeLaPhrase(phrase, dico, alias, langue) {
  const t = decouper(phrase);
  const trouves = [];
  for (let i = 0; i < t.length;) {
    let pris = 0;
    let mots = [];
    for (let n = Math.min(4, t.length - i); n > 0 && !pris; n--) {
      const f = t.slice(i, i + n).join(' ');
      if (alias.has(f)) mots = alias.get(f).map((x) => dico.get(x)).filter(Boolean);
      else if (dico.has(f) && !(langue === 'nl' && f === 'een')) mots = [dico.get(f)];
      if (mots.length) pris = n;
    }
    trouves.push(...mots);
    i += pris || 1;
  }
  // Un même dessin une seule fois (il ne peut aller qu'à une seule place).
  return trouves.filter((m, k) => trouves.findIndex((x) => cle(x) === cle(m)) === k);
}

export function dictionnaire(mots, empruntes, langue) {
  const dico = new Map();
  for (const m of [...mots.filter((x) => x.ind.type !== 'francais'), ...empruntes]) {
    const f = forme(m.mot, langue);
    if (f && !dico.has(f)) dico.set(f, m);
  }
  return dico;
}

// Phrases jouables : complètes (sans « ... »), avec leur son (sauf version sans son), et 2 à 4 mots illustrés.
export function phrasesJouables(contenu, extra = { empruntes: [], alias: new Map() }) {
  const dico = dictionnaire(contenu.mots, extra.empruntes, contenu.langue);
  return contenu.phrases
    .filter((p) => (p.son || muet) && !/\.\.\.|…/.test(p.phrase))
    .map((p) => ({ p, cibles: motsDeLaPhrase(p.phrase, dico, extra.alias, contenu.langue) }))
    .filter((x) => x.cibles.length >= 2 && x.cibles.length <= 4)
    .map((x) => ({ ...x, dico }));
}

// 6 images : les cibles, pour chacune un leurre du même genre (une couleur pour une couleur…), puis d'autres mots.
export function images(cibles, dico) {
  const pris = new Set(cibles.map(cle));
  const reste = melanger([...new Set(dico.values())]).filter((m) => !pris.has(cle(m)));
  const choix = [...cibles];
  const prendre = (m) => { if (m && choix.length < IMAGES && !pris.has(cle(m))) { pris.add(cle(m)); choix.push(m); } };
  for (const c of cibles) prendre(reste.find((m) => m.ind.type === c.ind.type && !pris.has(cle(m))));
  for (const m of [...reste.filter((x) => !x.emprunt), ...reste]) prendre(m); // d'abord des mots du chapitre
  return melanger(choix);
}

// Couleurs et chiffres des autres chapitres de la même année, et alias de la langue : lus une fois, avant le menu
// (« possible » doit répondre tout de suite). Hors page de chapitre (tests), rien.
async function chargerExtra() {
  const langue = parametre('langue');
  const annee = parametre('annee');
  const ici = parametre('chapitre');
  const extra = { empruntes: [], alias: new Map() };
  if (!langue || !annee || !ici) return extra;
  const lire = (chemin) => chargerTexte(chemin).catch(() => '');
  const [catalogue, alias] = await Promise.all([lire('contenu/catalogue.txt'), lire(`contenu/${langue}/alias.txt`)]);
  extra.alias = lireAlias(alias);
  const autres = lireCatalogue(catalogue).chapitres.filter((c) => c.langue === langue && c.annee === annee && c.chapitre !== ici);
  const textes = await Promise.all(autres.map((c) => lire(`${cheminChapitre(langue, annee, c.chapitre)}chapitre.txt`)));
  textes.forEach((texte, k) => {
    const dossier = cheminChapitre(langue, annee, autres[k].chapitre);
    for (const m of texte ? lireChapitre(texte).mots : []) {
      if (/^(couleur|texte):/.test(m.image)) extra.empruntes.push({ ...m, dossier, emprunt: true, ind: indice(m, dossier, new Set()) });
    }
  });
  return extra;
}
const extra = typeof location !== 'undefined' ? await chargerExtra().catch(() => ({ empruntes: [], alias: new Map() })) : { empruntes: [], alias: new Map() };

let styleCharge = false;
function chargerStyle() {
  if (styleCharge) return;
  styleCharge = true;
  document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-phrase-images.css?v=16a7b2c4' }));
}

// L'image touchée glisse de la grille jusqu'à sa case (0,4 s), puis la case rebondit. Le jeu reste jouable pendant le vol.
function voler(bouton, place, image) {
  place.append(image);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !image.animate) return;
  const de = bouton.getBoundingClientRect();
  const a = image.getBoundingClientRect();
  if (!a.width) return;
  const depart = `translate(${de.left + de.width / 2 - a.left - a.width / 2}px, ${de.top + de.height / 2 - a.top - a.height / 2}px) scale(${de.width / a.width})`;
  image.animate([{ transform: depart }, { transform: 'none' }], { duration: 400, easing: 'cubic-bezier(.2, .8, .2, 1)' })
    .finished.then(() => place.classList.add('rebond-pi'), () => {});
}

function manche(item, contenu, rang, total, fin) {
  const { p, cibles, dico } = item;
  const { langue, dossier } = contenu;
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('ordre'), 'Touche les images dans l\'ordre.');
  const lecteur = p.son && !muet ? creerLecteur(cheminSon(p, dossier), { nom: 'la phrase' }) : '';
  const cases = cibles.map((_, k) => el('li', { class: 'place-pi' }, el('span', { class: 'num-pi', 'aria-hidden': 'true' }, String(k + 1))));
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une réponse
  const message = el('div', { class: 'message-ex' }, av, retour);
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === total ? 'Terminer' : 'Suivant', icone('droite'));
  suite.addEventListener('click', () => fin());
  let etape = 0;
  let erreurs = 0;
  const dire = (ic, txt, pose) => { retour.replaceChildren(icone(ic), txt); av.pose(pose); };

  const boutons = images(cibles, dico).map((m) => {
    const b = el('button', { type: 'button', class: 'reponse' }, visuel(m, m.ind, langue));
    b.mot = m;
    b.addEventListener('click', () => toucher(b));
    return b;
  });
  // Une croix ne dure que le temps d'une étape : l'image touchée trop tôt peut être la suivante.
  const effacerCroix = () => boutons.forEach((b) => {
    if (!b.classList.contains('faux')) return;
    b.classList.remove('faux');
    b.querySelector('.marque-ex')?.remove();
    b.disabled = false;
  });

  function toucher(b) {
    if (b.mot !== cibles[etape]) {
      b.classList.add('faux');
      b.disabled = true;
      b.append(el('span', { class: 'marque-ex' }, icone('croix')));
      erreurs += 1;
      // Après deux erreurs, la bonne image reçoit un cadre épais (fixe).
      if (erreurs >= 2) boutons.find((x) => x.mot === cibles[etape]).classList.add('montree-pi');
      return dire('tourner', 'Essaie encore !', 'reflechit');
    }
    effacerCroix();
    b.classList.remove('montree-pi');
    b.classList.add('juste');
    b.disabled = true;
    b.append(el('span', { class: 'marque-ex' }, icone('coche')));
    voler(b, cases[etape], visuel(b.mot, b.mot.ind, langue));
    cases[etape].classList.add('remplie');
    etape += 1;
    erreurs = 0;
    if (etape < cibles.length) return dire('sourire', bravo(), 'content');
    // Phrase complète : redite en entier (juste après le toucher de l'enfant), avec sa traduction.
    for (const x of boutons) x.disabled = true;
    dire('etoile', bravo(), 'bravo');
    cases.forEach((c, k) => { c.style.animationDelay = `${0.4 + k * 0.12}s`; c.classList.add('fini-pi'); }); // une case après l'autre, après le vol
    if (lecteur) lecteur.jouer();
    if (p.francais) message.append(el('p', { class: 'fr' }, p.francais));
    suite.hidden = false;
    suite.focus();
  }

  const zone = el('div', { class: 'exercice phrase-images' },
    el('div', { class: 'tete-ex' }, titre, compteur(rang, total)),
    el('div', { class: 'enonce' }, el('div', { class: 'pile' }, lecteur, el('p', { class: 'phrase-pi', lang: langue }, p.phrase))),
    el('ol', { class: 'ligne-pi', 'aria-label': 'Tes images, dans l\'ordre' }, ...cases),
    el('div', { class: 'reponses visuels images-pi' }, ...boutons),
    message, suite);
  zone.titre = titre;
  return zone;
}

function lancer(zone, contenu) {
  chargerStyle();
  const plan = melanger(phrasesJouables(contenu, extra)).slice(0, PAR_PARTIE);
  let i = 0;
  function suivante() {
    arreter();
    if (i === plan.length) {
      bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, `Tu as compris ${plan.length} phrases !`));
      return fete(zone.querySelector('.bilan')); // pluie d'étoiles du site (rien si moins d'animations)
    }
    i += 1;
    const q = manche(plan[i - 1], contenu, i, plan.length, suivante);
    zone.replaceChildren(q);
    if (i > 1) q.titre.focus();
  }
  suivante();
}

export default {
  id: 'phrase-images',
  nom: 'La phrase en images',
  icone: 'image',
  // Au moins 3 phrases avec 2 à 4 mots illustrés (avec leur son, sauf version sans son).
  possible: (contenu) => phrasesJouables(contenu, extra).length >= MIN_PHRASES,
  lancer,
};
