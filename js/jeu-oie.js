// Jeu « Le jeu de l'oie de Monsieur Noé » (cahier 7.9) : un chemin de 12 cases en zigzag et un pion.
// À chaque tour, une question de « Je m'entraîne » (même moteur, js/exercices.js). Bonne réponse, même
// à la seconde chance : le pion avance d'une case. Il ne recule jamais. Pas de dé. Arrivée : petite fête.
// Version difficile (demandée le 2026-10-20) : un seul essai par question, comme « Je vérifie » ;
// une erreur fait reculer le pion d'une case (jamais avant le départ).
// Version expert (demandée le 2026-11-09) : un seul essai, une erreur renvoie à la première case ;
// cases spéciales : question surprise (3 et 9), pont (5 : on saute à la 7), tempête (8 : 2 bonnes réponses de suite).
import { el, icone } from './outils.js?v=4a69adff';
import { arreter } from './audio.js?v=4a69adff';
import { disponibles, planMelange, planDeHet, question, bilanEntraine } from './exercices.js?v=4a69adff';

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

const dispoDe = (contenu) => disponibles(contenu.mots, contenu.phrases, contenu.n, contenu.annee === 'grammaire');

// De combien de cases bouge le pion après une question : il avance si c'est juste ;
// sinon il reste (normal) ou recule d'une case (difficile).
export const pas = (juste, difficile) => (juste ? 1 : difficile ? -1 : 0);

// Cases spéciales de la version expert (numéro de case moins un) : [pictogramme, texte montré quand le pion y est].
export const SPECIALES = {
  2: ['surprise', 'Question surprise !'],
  4: ['pont', 'Pont : une bonne réponse, tu sautes une case !'],
  7: ['tempete', 'Tempête : 2 bonnes réponses de suite pour partir.'],
  8: ['surprise', 'Question surprise !'],
};

// Version expert : erreur, retour au départ ; pont, deux cases d'un coup ; tempête, il faut une bonne réponse de plus.
// `tempete` : bonnes réponses déjà données sur la case tempête.
export function deplacer(pos, juste, tempete = 0) {
  const special = SPECIALES[pos]?.[0];
  if (!juste) return { pos: 0, tempete: 0 };
  if (special === 'tempete' && tempete < 1) return { pos, tempete: 1 };
  return { pos: pos + (special === 'pont' ? 2 : 1), tempete: 0 };
}

// Question surprise : toujours une « Écoute » ou un « De ou het ? » (les plus difficiles), si le chapitre en a.
function surprise(dispo) {
  const variantes = ['ecoute', 'de-het'].filter((v) => dispo[v].length);
  if (!variantes.length) return null;
  const variante = variantes[Math.floor(Math.random() * variantes.length)];
  return { variante, cible: dispo[variante][Math.floor(Math.random() * dispo[variante].length)] };
}

function lancer(zone, contenu, difficile, expert = false) {
  const ctx = { ...contenu, dispo: dispoDe(contenu) };
  let plan = [];
  let pos = 0;
  let tempete = 0;

  const cases = Array.from({ length: CASES }, (_, k) => {
    const contenuCase = k === 0 ? icone('lecture') : k === CASES - 1 ? icone('etoile') : String(k + 1);
    const special = expert && SPECIALES[k];
    const c = el('li', { class: `case-oie${k === CASES - 1 ? ' arrivee' : ''}${special ? ` ${special[0]}` : ''}` }, contenuCase, special ? icone(special[0]) : '');
    const { rang, col } = placeCase(k);
    c.style.gridRow = rang; // propriétés CSS posées par le script : permises par la politique de sécurité
    c.style.gridColumn = col;
    return c;
  });
  const pion = el('span', { class: 'pion' }, icone('pion'));
  const position = el('p', { class: 'compteur', 'aria-live': 'polite' });
  const message = el('p', { class: 'case-speciale', 'aria-live': 'polite' }); // ce que fait la case spéciale (expert)
  const questionZone = el('div', { class: 'zone-exercice' });

  function poser(anime) {
    const avant = pion.isConnected ? pion.getBoundingClientRect() : null;
    cases[pos].append(pion);
    position.textContent = `Case ${pos + 1} / ${CASES}`;
    const special = expert && SPECIALES[pos];
    message.replaceChildren(...(special ? [icone(special[0]), tempete ? 'Tempête : encore une bonne réponse !' : special[1]] : []));
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
    let nouvelle = Math.max(0, pos + (juste === undefined ? 0 : pas(juste, difficile)));
    if (expert && juste !== undefined) {
      const avant = tempete;
      ({ pos: nouvelle, tempete } = deplacer(pos, juste, tempete));
      if (nouvelle === pos && tempete !== avant) poser(false); // tempête : le message change, le pion reste
    }
    if (nouvelle !== pos) {
      pos = nouvelle;
      zone.scrollIntoView({ block: 'start' }); // le plateau revient à l'écran pour voir le pion bouger
      poser(true);
    }
    if (pos === CASES - 1) {
      cases[pos].classList.add('fete');
      return bilanEntraine(questionZone, () => lancer(zone, contenu, difficile, expert), 'bravo', el('p', {}, 'Ton pion est arrivé !'));
    }
    if (!plan.length) plan = planOie(ctx.dispo, 20);
    const q = question((expert && SPECIALES[pos]?.[0] === 'surprise' && surprise(ctx.dispo)) || plan.shift(), ctx, difficile, 1, 0, tour); // total 0 : ni compteur ni « Terminer »
    questionZone.replaceChildren(q);
    if (juste !== undefined) q.titre.focus({ preventScroll: true });
  }

  zone.replaceChildren(
    el('div', { class: 'tete-oie' }, el('p', { class: 'consigne-oie' }, icone('pion'),
      expert ? 'Bonne réponse : tu avances. Erreur : retour au départ !'
        : difficile ? 'Bonne réponse : tu avances. Erreur : tu recules.' : 'Réponds bien pour avancer ton pion.'), position),
    el('ol', { class: 'plateau', 'aria-label': `Chemin de ${CASES} cases` }, ...cases),
    message,
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

export const oieExpert = {
  id: 'oie-expert',
  nom: 'Le jeu de l\'oie (expert) de Monsieur Noé',
  icone: 'pion',
  possible,
  lancer: (zone, contenu) => lancer(zone, contenu, true, true),
};
