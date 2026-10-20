// Jeu « Les phrases en désordre » (cahier 7.9) : les mots d'une phrase sont mélangés sur de gros boutons ;
// l'enfant les touche un par un pour les ranger sur une ligne (toucher un mot de la ligne le renvoie en bas).
// Phrase complète : son enregistrement à écouter pour vérifier ; si l'ordre n'est pas bon, on réessaie.
import { el, icone } from './outils.js';
import { creerLecteur, arreter } from './audio.js';
import { melanger, bilanEntraine } from './exercices.js';
import { avatar } from './avatar.js';

const MAX_MOTS = 5;
const MAX_PHRASES = 6;
const MIN_PHRASES = 4;

export const motsDe = (phrase) => phrase.trim().split(/\s+/);

// Phrases jouables : avec leur son, sans « ... » (phrase à compléter), de 3 à 5 mots.
export function phrasesUtilisables(phrases) {
  return phrases.filter((p) => p.son && !/\.\.\.|…/.test(p.phrase) && motsDe(p.phrase).length >= 3 && motsDe(p.phrase).length <= MAX_MOTS);
}

// Les mots dans le désordre, jamais dans l'ordre de la phrase (sinon il n'y aurait rien à faire).
export function desordre(mots) {
  if (new Set(mots).size < 2) return [...mots];
  let m;
  do m = melanger(mots); while (m.join(' ') === mots.join(' '));
  return m;
}

function question(p, contenu, rang, total, fin) {
  const { langue, dossier } = contenu;
  const mots = motsDe(p.phrase);
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('crayon'), 'Touche les mots dans le bon ordre.');
  const ligne = el('div', { class: 'ligne-phrase', lang: langue, 'aria-label': 'Ta phrase' });
  const reserve = el('div', { class: 'reserve-phrase', lang: langue });
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une phrase complète
  const message = el('div', { class: 'message-ex' }, av, retour);
  const ecoute = el('div', { class: 'pile', hidden: '' });
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === total ? 'Terminer' : 'Suivant', icone('droite'));
  suite.addEventListener('click', fin);
  let lecteur = null;

  // Chaque bouton garde sa place d'origine en bas, pour y revenir quand on le retire de la ligne.
  const boutons = desordre(mots).map((mot) => {
    const b = el('button', { type: 'button', class: 'reponse mot-phrase' }, mot);
    const place = el('span', { class: 'place-phrase' }, b);
    b.addEventListener('click', () => {
      if (!suite.hidden) return;
      if (b.parentNode === place) ligne.append(b); else place.append(b);
      verifier();
    });
    reserve.append(place);
    return b;
  });

  function verifier() {
    retour.replaceChildren();
    av.hidden = true;
    if (ligne.children.length < mots.length) { ecoute.hidden = true; return; }
    // Phrase complète : on compare le texte des mots (deux mots identiques sont interchangeables).
    const juste = [...ligne.children].map((b) => b.textContent).join(' ') === mots.join(' ');
    lecteur ||= creerLecteur(`${dossier}audio/${p.id}.m4a`, { nom: 'la phrase' });
    ecoute.replaceChildren(el('p', {}, icone('haut-parleur'), ' Écoute pour vérifier :'), lecteur);
    ecoute.hidden = false;
    if (juste) {
      ligne.classList.add('juste');
      for (const b of boutons) b.disabled = true;
      retour.replaceChildren(icone('sourire'), 'Bravo !');
      av.pose('content');
      if (p.francais) ecoute.append(el('p', { class: 'fr', lang: 'fr' }, p.francais));
      lecteur.jouer(); // après un toucher : permis sur iPhone
      suite.hidden = false;
      suite.focus();
    } else {
      retour.replaceChildren(icone('tourner'), 'Essaie encore !');
      av.pose('encourage');
    }
  }

  const zone = el('div', { class: 'exercice' },
    el('div', { class: 'tete-ex' }, titre, el('p', { class: 'compteur' }, `${rang} / ${total}`)),
    ligne, reserve, message, ecoute, suite);
  zone.titre = titre;
  return zone;
}

function lancer(zone, contenu) {
  const plan = melanger(phrasesUtilisables(contenu.phrases)).slice(0, MAX_PHRASES);
  let i = 0;
  function suivante() {
    arreter();
    if (i === plan.length) {
      return bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, `Tu as remis ${plan.length} phrases en ordre !`));
    }
    i += 1;
    const q = question(plan[i - 1], contenu, i, plan.length, suivante);
    zone.replaceChildren(q);
    if (i > 1) q.titre.focus();
  }
  suivante();
}

export default {
  id: 'phrases',
  nom: 'Les phrases en désordre',
  icone: 'crayon',
  // Au moins 4 phrases utilisables (avec leur son, sans « ... », de 3 à 5 mots).
  possible: (contenu) => phrasesUtilisables(contenu.phrases).length >= MIN_PHRASES,
  lancer,
};
