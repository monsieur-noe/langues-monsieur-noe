// Jeu « Le memory des paires » (v1.65, grammaire) : les lignes de [paires] (« he | is »), deux cartes écrites par paire.
// Deux cartes vont ensemble si elles forment une paire du fichier, par leur texte : « is » va avec he, she et it.
// Même allure que « Le memory qui parle » ; sans son, il est pareil dans la version muette.
import { el, icone } from './outils.js?v=16a7b2c4';
import { melanger, bilanEntraine } from './exercices.js?v=16a7b2c4';
import { avatar } from './avatar.js?v=16a7b2c4';

const PAIRES = 6;
const PAUSE = 1000; // le temps de voir les deux cartes avant qu'elles se retournent (pas un chronomètre)

export function cartesPaires(paires, n = PAIRES) {
  return melanger(melanger(paires).slice(0, n).flatMap((p) => [{ texte: p.a, cote: 'a' }, { texte: p.b, cote: 'b' }]));
}
export const vontEnsemblePaires = (paires, x, y) => x.cote !== y.cote
  && paires.some((p) => p.a === (x.cote === 'a' ? x : y).texte && p.b === (x.cote === 'a' ? y : x).texte);

function lancer(zone, contenu) {
  const { langue, paires } = contenu;
  const cartes = cartesPaires(paires);
  let retournee = null;
  let bloque = false;
  let trouvees = 0;
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('cartes'), 'Trouve les paires qui vont ensemble.');
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une paire trouvée
  const message = el('div', { class: 'message-ex' }, av, retour);

  const boutons = cartes.map((c) => {
    const b = el('button', { type: 'button', class: 'reponse carte-memory', 'aria-label': 'Carte cachée' },
      el('span', { class: 'dos-memory', 'aria-hidden': 'true' }, '?'),
      el('span', { class: 'face-memory' }, el('span', { class: 'mot', lang: langue }, c.texte)));
    const montrer = (oui) => {
      b.classList.toggle('retournee', oui);
      if (!oui) { b.classList.add('recachee'); b.setAttribute('aria-label', 'Carte cachée'); } else b.removeAttribute('aria-label');
    };
    b.addEventListener('click', () => {
      if (bloque || b.classList.contains('retournee')) return;
      montrer(true);
      if (!retournee) { retournee = { c, b, montrer }; return; }
      const premiere = retournee;
      retournee = null;
      if (vontEnsemblePaires(paires, premiere.c, c)) {
        for (const x of [premiere.b, b]) { x.classList.add('trouvee'); x.append(el('span', { class: 'marque-ex' }, icone('coche'))); }
        trouvees += 1;
        retour.replaceChildren(icone('sourire'), 'Bravo, une paire !');
        av.hidden = false;
        av.pose('content');
        if (trouvees === cartes.length / 2) {
          setTimeout(() => bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, `Tu as trouvé les ${trouvees} paires !`)), PAUSE);
        }
        return;
      }
      // Pas une paire : rien de négatif, les deux cartes se retournent seules.
      bloque = true;
      setTimeout(() => { premiere.montrer(false); montrer(false); bloque = false; }, PAUSE);
    });
    return b;
  });
  const grille = el('div', { class: `reponses visuels memory ${cartes.length % 3 ? 'c4' : 'c3'}` }, ...boutons);
  zone.replaceChildren(el('div', { class: 'exercice' }, titre, grille, message));
}

export default {
  id: 'paires',
  nom: 'Le memory des paires',
  icone: 'cartes',
  possible: (contenu) => contenu.paires.length >= 3,
  lancer,
};
