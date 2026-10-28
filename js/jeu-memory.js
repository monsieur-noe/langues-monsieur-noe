// Jeu « Le memory qui parle » (cahier 7.9) : des cartes retournées ; chaque paire = une carte « son »
// (qui dit le mot quand on la retourne) et la carte de son indice (dessin, couleur, chiffre, ou le français).
// Deux cartes qui ne vont pas ensemble se retournent seules après environ une seconde. Pas de limite de coups.
import { el, icone } from './outils.js?v=143dccb9';
import { cheminSon } from './donnees.js?v=143dccb9';
import { creerLecteur, arreter } from './audio.js?v=143dccb9';
import { visuel } from './cartes.js?v=143dccb9';
import { melanger, bilanEntraine } from './exercices.js?v=143dccb9';
import { avatar } from './avatar.js?v=143dccb9';

const PAIRES = 6;
const PAUSE = 1000; // le temps de voir les deux cartes avant qu'elles se retournent (pas un chronomètre)
const avecSon = (contenu) => contenu.mots.filter((m) => m.son);

// Les cartes : pour chaque mot tiré (6 au plus), une carte « son » et une carte « indice », mélangées.
export function jeuMemory(mots, paires = PAIRES) {
  return melanger(melanger(mots).slice(0, paires).flatMap((mot) => [{ mot, son: true }, { mot, son: false }]));
}
export const vontEnsemble = (a, b) => a.mot === b.mot && a.son !== b.son;

function lancer(zone, contenu) {
  const { langue, dossier } = contenu;
  const cartes = jeuMemory(avecSon(contenu));
  const images = cartes.every((c) => c.mot.ind.type !== 'francais');
  let retournee = null; // la première carte du coup en cours
  let bloque = false; // pendant la pause, on ne retourne rien d'autre
  let trouvees = 0;

  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('haut-parleur'),
    images ? 'Trouve les paires : le son et l\'image.' : 'Trouve les paires : le son et le mot.');
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une paire trouvée
  const message = el('div', { class: 'message-ex' }, av, retour);

  const boutons = cartes.map((c) => {
    // Un son par carte « son », joué par le lecteur unique du site.
    const lecteur = c.son ? creerLecteur(cheminSon(c.mot, dossier), { nom: 'le mot' }) : null;
    const face = el('span', { class: 'face-memory' }, c.son ? icone('haut-parleur') : visuel(c.mot, c.mot.ind, langue));
    face.querySelector('img')?.setAttribute('loading', 'eager'); // face cachée : l'image doit être prête avant qu'on la retourne
    const b = el('button', { type: 'button', class: 'reponse carte-memory', 'aria-label': 'Carte cachée' },
      el('span', { class: 'dos-memory', 'aria-hidden': 'true' }, '?'), face);
    const montrer = (oui) => {
      b.classList.toggle('retournee', oui);
      if (!oui) b.classList.add('recachee'); // le « ? » revient avec le même retournement, à l'envers
      if (oui) b.removeAttribute('aria-label'); else b.setAttribute('aria-label', 'Carte cachée');
      if (oui && c.son) b.setAttribute('aria-label', 'Carte son');
    };
    b.addEventListener('click', () => {
      if (c.son && (b.classList.contains('trouvee') || b === retournee?.b)) return lecteur.jouer(); // réécouter
      if (bloque || b.classList.contains('retournee')) return;
      montrer(true);
      if (c.son) lecteur.jouer(); // après un toucher : permis sur iPhone
      if (!retournee) { retournee = { c, b, montrer }; return; }
      const premiere = retournee;
      retournee = null;
      if (vontEnsemble(premiere.c, c)) {
        for (const x of [premiere.b, b]) { x.classList.add('trouvee'); x.append(el('span', { class: 'marque-ex' }, icone('coche'))); }
        trouvees += 1;
        retour.replaceChildren(icone('sourire'), 'Bravo, une paire !');
        av.pose('content');
        if (trouvees === cartes.length / 2) {
          setTimeout(() => {
            arreter();
            bilanEntraine(zone, () => lancer(zone, contenu), 'bravo',
              el('p', {}, `Tu as trouvé les ${trouvees} paires !`));
          }, PAUSE);
        }
        return;
      }
      // Pas une paire : rien de négatif, les deux cartes se retournent seules.
      bloque = true;
      setTimeout(() => { premiere.montrer(false); montrer(false); bloque = false; }, PAUSE);
    });
    return b;
  });

  // 3 colonnes quand c'est possible (3 × 4 pour 12 cartes), sinon 4.
  const grille = el('div', { class: `reponses visuels memory ${cartes.length % 3 ? 'c4' : 'c3'}` }, ...boutons);
  zone.replaceChildren(el('div', { class: 'exercice' }, titre, grille, message));
}

export default {
  id: 'memory',
  nom: 'Le memory qui parle',
  icone: 'cartes',
  // Au moins 3 mots avec un son (3 paires).
  possible: (contenu) => avecSon(contenu).length >= 3,
  lancer,
};
