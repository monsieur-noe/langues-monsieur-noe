// Jeu « Le jeu de l'oie de Monsieur Noé » (cahier 7.9) : un chemin de 12 cases en zigzag et un pion.
// À chaque tour, une question de « Je m'entraîne » (même moteur, js/exercices.js). Bonne réponse, même
// à la seconde chance : le pion avance d'une case. Il ne recule jamais. Pas de dé. Arrivée : petite fête.
// Version difficile (demandée le 2026-10-20) : un seul essai par question, comme « Je vérifie » ;
// une erreur fait reculer le pion d'une case (jamais avant le départ).
import { el, icone } from './outils.js?v=143dccb9';
import { arreter } from './audio.js?v=143dccb9';
import { disponibles, planMelange, planDeHet, question, bilanEntraine } from './exercices.js?v=143dccb9';

const CASES = 12;
const COLONNES = 4;

// Questions du jeu : le mélange de « Je m'entraîne », avec « De ou het ? » comme une variante de plus.
export function planOie(dispo, nombre) {
  const melange = planMelange(dispo, nombre);
  const deHet = planDeHet(dispo, nombre);
  if (!melange.length || !deHet.length) return melange.length ? melange : deHet;
  const variantes = new Set(melange.map((q) => q.variante)).size + 1;
  return melange.map((q, k) => (Math.random() < 1 / variantes ? deHet[k] : q));
}

// Place de la case k (0 à 11) sur le plateau : rangées de 4, une sur deux de droite à gauche (zigzag).
export function placeCase(k) {
  const rang = Math.floor(k / COLONNES);
  const col = k % COLONNES;
  return { rang: rang + 1, col: rang % 2 ? COLONNES - col : col + 1 };
}

const dispoDe = (contenu) => disponibles(contenu.mots, contenu.phrases, contenu.n);

// De combien de cases bouge le pion après une question : il avance si c'est juste ;
// sinon il reste (normal) ou recule d'une case (difficile).
export const pas = (juste, difficile) => (juste ? 1 : difficile ? -1 : 0);

function lancer(zone, contenu, difficile) {
  const ctx = { ...contenu, dispo: dispoDe(contenu) };
  let plan = [];
  let pos = 0;

  const cases = Array.from({ length: CASES }, (_, k) => {
    const contenuCase = k === 0 ? icone('lecture') : k === CASES - 1 ? icone('etoile') : String(k + 1);
    const c = el('li', { class: `case-oie${k === CASES - 1 ? ' arrivee' : ''}` }, contenuCase);
    const { rang, col } = placeCase(k);
    c.style.gridRow = rang; // propriétés CSS posées par le script : permises par la politique de sécurité
    c.style.gridColumn = col;
    return c;
  });
  const pion = el('span', { class: 'pion' }, icone('pion'));
  const position = el('p', { class: 'compteur', 'aria-live': 'polite' });
  const questionZone = el('div', { class: 'zone-exercice' });

  function poser(anime) {
    const avant = pion.isConnected ? pion.getBoundingClientRect() : null;
    cases[pos].append(pion);
    position.textContent = `Case ${pos + 1} / ${CASES}`;
    if (!anime || !avant || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // Le pion glisse de son ancienne case vers la nouvelle en faisant un petit bond (en avant comme en arrière).
    const apres = pion.getBoundingClientRect();
    const dx = avant.left - apres.left;
    const dy = avant.top - apres.top;
    pion.animate([
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: `translate(${dx / 2}px, ${dy / 2 - 18}px)` },
      { transform: 'translate(0, 0)' },
    ], { duration: 450, easing: 'ease-in-out' });
  }

  function tour(_premierCoup, juste) {
    arreter();
    const nouvelle = Math.max(0, pos + (juste === undefined ? 0 : pas(juste, difficile)));
    if (nouvelle !== pos) {
      pos = nouvelle;
      zone.scrollIntoView({ block: 'start' }); // le plateau revient à l'écran pour voir le pion bouger
      poser(true);
    }
    if (pos === CASES - 1) {
      cases[pos].classList.add('fete');
      return bilanEntraine(questionZone, () => lancer(zone, contenu, difficile), 'bravo', el('p', {}, 'Ton pion est arrivé !'));
    }
    if (!plan.length) plan = planOie(ctx.dispo, 20);
    const q = question(plan.shift(), ctx, difficile, 1, 0, tour); // total 0 : ni compteur ni « Terminer »
    questionZone.replaceChildren(q);
    if (juste !== undefined) q.titre.focus({ preventScroll: true });
  }

  zone.replaceChildren(
    el('div', { class: 'tete-oie' }, el('p', { class: 'consigne-oie' }, icone('pion'),
      difficile ? 'Bonne réponse : tu avances. Erreur : tu recules.' : 'Réponds bien pour avancer ton pion.'), position),
    el('ol', { class: 'plateau', 'aria-label': `Chemin de ${CASES} cases` }, ...cases),
    questionZone);
  poser(false);
  tour();
}

// Au moins un type de question de « Je m'entraîne » possible dans ce chapitre.
const possible = (contenu) => planOie(dispoDe(contenu), 1).length > 0;

export default {
  id: 'oie',
  nom: 'Le jeu de l\'oie de Monsieur Noé',
  icone: 'pion',
  possible,
  lancer: (zone, contenu) => lancer(zone, contenu, false),
};

export const oieDifficile = {
  id: 'oie-difficile',
  nom: 'Le jeu de l\'oie (difficile) de Monsieur Noé',
  icone: 'pion',
  possible,
  lancer: (zone, contenu) => lancer(zone, contenu, true),
};
