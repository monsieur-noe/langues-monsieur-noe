// Jeu « Le panier du marché » (jeu 5 du document de l'enseignant, 2026-11-08) : une liste de courses de 2 à 4 mots,
// un étal de 9 dessins ; l'enfant touche les dessins de la liste pour remplir son panier, dans n'importe quel ordre.
// Avec son : la liste part au toucher du bouton « Écoute » (jamais seule, cahier 9), mots joués à la suite par un seul lecteur.
// Sans son (cahier 7.10) : la liste est écrite en gras et reste visible ; « Cacher la liste » rend le jeu plus difficile.
import { el, icone, muet } from './outils.js?v=16a7b2c4';
import { cheminSon } from './donnees.js?v=16a7b2c4';
import { creerLecteur, arreter } from './audio.js?v=16a7b2c4';
import { visuel } from './cartes.js?v=16a7b2c4';
import { melanger, bilanEntraine, compteur, bravo } from './exercices.js?v=16a7b2c4';
import { avatar } from './avatar.js?v=16a7b2c4';
import { motsDuLoto } from './jeu-loto.js?v=16a7b2c4';

export const MANCHES = [2, 2, 3, 3, 4, 4];
const ETAL = 9;

// 6 manches : chaque liste et son étal de 9 dessins. Un mot ne revient dans les listes qu'une fois tous les autres passés
// (avec moins de 18 mots, quelques-uns reviennent : jamais deux fois dans la même liste).
export function planPanier(pool) {
  let file = [];
  return MANCHES.map((n) => {
    const liste = [];
    while (liste.length < n) {
      if (!file.length) file = melanger(pool);
      const k = file.findIndex((m) => !liste.includes(m));
      liste.push(...file.splice(k, 1));
    }
    const autres = melanger(pool.filter((m) => !liste.includes(m))).slice(0, ETAL - n);
    return { liste, etal: melanger([...liste, ...autres]) };
  });
}

// Dessins utilisables : comme le loto (dessin, couleur ou chiffre, pas de traduction ; un son, sauf sans son ; indices tous différents).
const dessinsDuPanier = (contenu) => motsDuLoto(contenu.mots);

// L'indice sans le mot écrit : le texte de remplacement donne le français, jamais la réponse.
function indice(m, langue) {
  const v = visuel(m, m.ind, langue);
  if (v.tagName === 'IMG') { v.alt = m.francais || 'Dessin'; v.removeAttribute('lang'); v.loading = 'eager'; }
  if (v.classList.contains('carre')) { v.setAttribute('aria-label', m.francais || 'Couleur'); v.removeAttribute('lang'); }
  return v;
}

const NS = 'http://www.w3.org/2000/svg';
function dessin(viewBox, classe, contenu) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', viewBox);
  s.setAttribute('class', classe);
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = contenu;
  return s;
}

// Auvent rayé de l'étal (dessin de Claude, à valider) : bandes rouges et blanches, bord festonné.
const AUVENT = (() => {
  let s = '<rect x="0" y="0" width="320" height="26" fill="#b91c1c"/>';
  for (let k = 0; k < 8; k++) {
    const x = k * 40;
    s += `<rect x="${x + 20}" y="0" width="20" height="26" fill="#fff"/>`;
    s += `<path d="M${x} 26 a10 10 0 0 0 20 0z" fill="#b91c1c"/><path d="M${x + 20} 26 a10 10 0 0 0 20 0z" fill="#fff"/>`;
  }
  return s + '<path d="M0 26 H320" stroke="#7f1d1d" stroke-width="2"/>';
})();

// Panier en osier (dessin de Claude, à valider) : anse, corps évasé, tressage.
const PANIER = `
  <path d="M60 46 C60 -6 260 -6 260 46" fill="none" stroke="#92400e" stroke-width="10" stroke-linecap="round"/>
  <path d="M20 44 H300 L276 128 H44 Z" fill="#d97706" stroke="#92400e" stroke-width="4" stroke-linejoin="round"/>
  <path d="M26 66 H294 M33 90 H287 M39 112 H281" stroke="#92400e" stroke-width="3" opacity=".55"/>
  <path d="M80 44 L86 128 M140 44 L142 128 M200 44 L198 128 M260 44 L254 128" stroke="#92400e" stroke-width="3" opacity=".4"/>
  <rect x="14" y="36" width="292" height="14" rx="7" fill="#b45309" stroke="#92400e" stroke-width="4"/>`;

function ajouterPictogramme() {
  const sprite = document.querySelector('svg.sprite');
  if (!sprite || sprite.querySelector('#panier')) return;
  const s = document.createElementNS(NS, 'symbol');
  s.setAttribute('id', 'panier');
  s.setAttribute('viewBox', '0 0 24 24');
  s.innerHTML = '<path d="M7 10a5 5 0 0 1 10 0"/><path d="M3 10h18l-2 10H5z"/><path d="M9 13v4M15 13v4"/>';
  sprite.append(s);
}
if (typeof document !== 'undefined') {
  ajouterPictogramme();
  if (!document.querySelector('link[href*="jeu-panier.css"]')) {
    document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-panier.css?v=16a7b2c4' }));
  }
}

const doux = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

// Le dessin glisse de l'étal vers sa place dans le panier (0,5 s), puis s'y pose.
function glisser(depart, arrivee, poser) {
  const a = depart.getBoundingClientRect();
  const b = arrivee.getBoundingClientRect();
  if (!doux() || !a.width || !b.width) return poser();
  const copie = depart.cloneNode(true);
  copie.classList.add('panier-vol');
  Object.assign(copie.style, { left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px` });
  document.body.append(copie);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const k = b.width / a.width;
  // Une seule pose, même si l'animation ne finit jamais (onglet caché : le navigateur la met en pause).
  const fin = () => { if (copie.isConnected) { copie.remove(); poser(); } };
  copie.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${k})` }],
    { duration: 500, easing: 'cubic-bezier(.2, .8, .2, 1)' }).finished.then(fin, fin);
  setTimeout(fin, 650);
}

function lancer(zone, contenu) {
  const { langue, dossier } = contenu;
  const plan = planPanier(dessinsDuPanier(contenu));
  let cachee = false; // « Cacher la liste » (sans son) : gardé d'une manche à l'autre, pas au-delà de la partie
  let i = 0;

  function manche(ecouterTout) {
    const { liste, etal } = plan[i];
    const trouves = new Set();
    let erreurs = 0;
    const rang = i + 1;

    const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone(muet ? 'oeil' : 'haut-parleur'), 'Remplis le panier avec la liste.');
    const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
    const av = avatar('neutre');
    av.hidden = true; // l'avatar n'apparaît qu'après une réponse
    const message = el('div', { class: 'message-ex' }, av, retour);
    const dire = (ic, txt, pose) => { retour.replaceChildren(icone(ic), txt); av.pose(pose); av.hidden = false; };
    const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === MANCHES.length ? 'Terminer' : 'Panier suivant', icone('droite'));

    // La liste écrite : toujours visible sans son ; avec son, montrée seulement quand le panier est plein.
    const lignes = liste.map((m) => el('li', { lang: langue }, m.mot));
    const ecrite = el('ul', { class: 'liste-panier', hidden: (!muet || cachee) && '' }, ...lignes);
    const haut = el('div', { class: 'ecoute-loto tete-panier' });
    let lecteur;
    if (muet) {
      const cacher = el('button', { type: 'button', class: 'action secondaire cacher-liste', 'aria-pressed': String(cachee) });
      const majCacher = () => cacher.replaceChildren(icone('oeil'), cachee ? 'Montrer la liste' : 'Cacher la liste');
      cacher.addEventListener('click', () => {
        cachee = !cachee;
        ecrite.hidden = cachee;
        cacher.setAttribute('aria-pressed', String(cachee));
        majCacher();
      });
      majCacher();
      haut.append(ecrite, cacher);
    } else {
      lecteur = creerLecteur(liste.map((m) => cheminSon(m, dossier)), { nom: 'la liste', avecBarre: false });
      // L'étal s'ouvre à la première écoute : on touche ce qu'on a entendu, pas au hasard.
      lecteur.addEventListener('click', () => { if (suite.hidden) ouvrir(true); });
      haut.append(el('div', { class: 'bouton-liste' }, lecteur, el('span', {}, 'Écoute la liste')), ecrite);
    }

    const places = liste.map(() => el('span', { class: 'place-panier' }));
    const panier = el('div', { class: 'panier' }, dessin('0 0 320 132', 'panier-dessin', PANIER), el('div', { class: `places-panier n${liste.length}` }, ...places));
    // Animation relancée à chaque dessin reçu (la classe est retirée puis remise).
    const secouer = (classe) => { panier.classList.remove(classe); void panier.offsetWidth; panier.classList.add(classe); };
    const cases = etal.map((m, k) => {
      const b = el('button', { type: 'button', class: 'reponse case-panier', disabled: !muet && '' }, indice(m, langue), el('span', { class: 'etiquette', 'aria-hidden': 'true' }));
      b.style.setProperty('--k', k); // arrivée de l'étal : les dessins l'un après l'autre (CSS)
      b.addEventListener('click', () => toucher(m, b));
      return b;
    });
    const ouvrir = (oui) => cases.forEach((b) => { b.disabled = !oui || b.classList.contains('pris') || b.classList.contains('faux'); });

    function toucher(m, b) {
      if (!liste.includes(m)) {
        b.classList.add('faux');
        b.disabled = true;
        b.append(el('span', { class: 'marque-ex' }, icone('croix')));
        erreurs += 1;
        // Après deux erreurs, les dessins encore à trouver reçoivent un cadre épais (fixe).
        if (erreurs >= 2) cases.forEach((c, k) => { if (liste.includes(etal[k]) && !trouves.has(etal[k])) c.classList.add('aide'); });
        return dire('tourner', 'Essaie encore !', 'reflechit');
      }
      trouves.add(m);
      b.classList.remove('aide');
      b.classList.add('pris');
      b.disabled = true;
      const place = places[trouves.size - 1];
      lignes[liste.indexOf(m)].classList.add('trouve');
      lignes[liste.indexOf(m)].prepend(el('span', { class: 'coche-liste' }, icone('coche')));
      glisser(b.firstChild, place, () => {
        place.replaceChildren(indice(m, langue), el('span', { class: 'marque-ex' }, icone('coche')));
        place.classList.add('pleine');
        secouer(places.every((p) => p.classList.contains('pleine')) ? 'plein' : 'recoit');
      });
      const fini = trouves.size === liste.length;
      if (!fini) {
        dire('sourire', bravo(), 'content');
        // Le mot dit après la bonne réponse (après un toucher : permis sur iPhone ; lecteur unique, un son à la fois).
        if (!muet) creerLecteur(cheminSon(m, dossier), { nom: m.mot }).jouer();
        return;
      }
      ouvrir(false);
      dire('etoile', 'Ton panier est plein !', 'content');
      if (!muet) lecteur.jouer(); // la liste redite en entier
      ecrite.hidden = false;
      suite.hidden = false;
      suite.focus({ preventScroll: true });
    }

    suite.addEventListener('click', () => {
      i += 1;
      if (i < plan.length) return manche(true);
      arreter();
      bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, `Tu as rempli ${MANCHES.length} paniers !`));
    });

    zone.replaceChildren(el('div', { class: 'exercice jeu-panier' },
      el('div', { class: 'tete-ex' }, titre, compteur(rang, MANCHES.length)),
      haut,
      el('div', { class: 'etal' }, dessin('0 0 320 36', 'auvent', AUVENT), el('div', { class: 'reponses visuels etal-grille' }, ...cases)),
      panier,
      message, suite));
    if (rang > 1) titre.focus({ preventScroll: true });
    // « Panier suivant » est un toucher : la nouvelle liste peut partir tout de suite (cahier 9).
    if (ecouterTout && !muet) { ouvrir(true); lecteur.jouer(); }
  }
  manche(false);
}

export default {
  id: 'panier',
  nom: 'Le panier du marché',
  icone: 'panier',
  // 9 dessins différents (dessin, couleur ou chiffre) avec leur son ; les traductions françaises ne vont pas sur l'étal.
  possible: (contenu) => dessinsDuPanier(contenu).length >= ETAL,
  lancer,
};
