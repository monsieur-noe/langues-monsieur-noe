// Jeu « Les phrases en désordre » (cahier 7.9) : les mots d'une phrase sont mélangés sur de gros boutons ;
// l'enfant les touche un par un pour les ranger sur une ligne (toucher un mot de la ligne le renvoie en bas).
// Phrase complète : son enregistrement à écouter pour vérifier ; si l'ordre n'est pas bon, on réessaie.
import { el } from './outils.js';
import { melanger } from './exercices.js';
import { serieOrdre } from './ordre.js';

const MAX_MOTS = 5;
const MAX_PHRASES = 6;
const MIN_PHRASES = 4;

export const motsDe = (phrase) => phrase.trim().split(/\s+/);

// Phrases jouables : avec leur son, sans « ... » (phrase à compléter), de 3 à 5 mots.
export function phrasesUtilisables(phrases) {
  return phrases.filter((p) => p.son && !/\.\.\.|…/.test(p.phrase) && motsDe(p.phrase).length >= 3 && motsDe(p.phrase).length <= MAX_MOTS);
}

function lancer(zone, contenu) {
  const plan = melanger(phrasesUtilisables(contenu.phrases)).slice(0, MAX_PHRASES);
  const items = plan.map((p) => ({ cases: motsDe(p.phrase), audio: `${contenu.dossier}audio/${p.id}.m4a`, francais: p.francais }));
  serieOrdre(zone, items, contenu.langue, () => lancer(zone, contenu), el('p', {}, `Tu as remis ${plan.length} phrases en ordre !`));
}

export default {
  id: 'phrases',
  nom: 'Les phrases en désordre',
  icone: 'crayon',
  // Au moins 4 phrases utilisables (avec leur son, sans « ... », de 3 à 5 mots).
  possible: (contenu) => phrasesUtilisables(contenu.phrases).length >= MIN_PHRASES,
  lancer,
};
