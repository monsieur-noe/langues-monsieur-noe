// Remettre des cases dans l'ordre : moteur commun au jeu « Les phrases en désordre » (Je joue)
// et à « Mots en ordre » (Je m'entraîne, section [ordre] de chapitre.txt).
// Les cases sont mélangées sur de gros boutons ; un toucher les range sur la ligne, un toucher sur la ligne
// les renvoie en bas. Ligne complète : bon ordre = bravo et suite ; sinon on réessaie, sans limite.
import { el, icone } from './outils.js?v=c16b4cc5';
import { creerLecteur, arreter } from './audio.js?v=c16b4cc5';
import { melanger, bilanEntraine, compteur, bravo } from './exercices.js?v=c16b4cc5';
import { avatar } from './avatar.js?v=c16b4cc5';

// Les cases dans le désordre, jamais dans le bon ordre (sinon il n'y aurait rien à faire).
export function desordre(cases) {
  if (new Set(cases).size < 2) return [...cases];
  let m;
  do m = melanger(cases); while (m.join(' ') === cases.join(' '));
  return m;
}

// Le mot glisse de son ancienne place à la nouvelle (0,25 s). Animation lancée en JavaScript :
// la règle CSS « moins de mouvement » ne la coupe pas, d'où le test ici.
function glisser(b, avant) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !b.animate) return;
  const apres = b.getBoundingClientRect();
  b.animate([{ transform: `translate(${avant.left - apres.left}px, ${avant.top - apres.top}px)` }, { transform: 'none' }],
    { duration: 250, easing: 'ease-out' });
}

// Une manche. `item` : { cases, audio (chemin du son à écouter pour vérifier, ou rien), francais,
// intrus (cases en trop, facultatif), image (dessin du mot recherché, facultatif) }.
function manche(item, langue, rang, total, fin) {
  const { cases, intrus = [], image } = item;
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('crayon'),
    intrus.length ? 'Remets les mots en ordre. Attention à l\'intrus !' : 'Touche les mots dans le bon ordre.');
  // Chaque intrus est glissé à une place au hasard parmi les cases mélangées.
  const tuiles = desordre(cases);
  for (const x of intrus) tuiles.splice(Math.floor(Math.random() * (tuiles.length + 1)), 0, x);
  const ligne = el('div', { class: 'ligne-phrase', lang: langue, 'aria-label': 'Ta phrase' });
  const reserve = el('div', { class: 'reserve-phrase', lang: langue });
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une ligne complète
  const message = el('div', { class: 'message-ex' }, av, retour);
  const ecoute = el('div', { class: 'pile', hidden: '' });
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === total ? 'Terminer' : 'Suivant', icone('droite'));
  suite.addEventListener('click', fin);
  let lecteur = null;

  // Chaque bouton garde sa place d'origine en bas, pour y revenir quand on le retire de la ligne.
  const boutons = tuiles.map((texte) => {
    const b = el('button', { type: 'button', class: 'reponse mot-phrase' }, texte);
    const place = el('span', { class: 'place-phrase' }, b);
    b.addEventListener('click', () => {
      if (!suite.hidden) return;
      const avant = b.getBoundingClientRect();
      if (b.parentNode === place) ligne.append(b); else place.append(b);
      glisser(b, avant);
      verifier();
    });
    reserve.append(place);
    return b;
  });

  function verifier() {
    retour.replaceChildren();
    av.hidden = true;
    if (ligne.children.length < cases.length) { ecoute.hidden = true; return; }
    // Ligne complète : on compare le texte des cases (deux cases identiques sont interchangeables).
    const juste = [...ligne.children].map((b) => b.textContent).join(' ') === cases.join(' ');
    if (item.audio) {
      lecteur ||= creerLecteur(item.audio, { nom: 'la phrase' });
      ecoute.replaceChildren(el('p', {}, icone('haut-parleur'), ' Écoute pour vérifier :'), lecteur);
      ecoute.hidden = false;
    }
    if (juste) {
      ligne.classList.add('juste');
      for (const b of boutons) b.disabled = true;
      retour.replaceChildren(icone('sourire'), bravo());
      av.pose('content');
      if (item.francais) { ecoute.append(el('p', { class: 'fr', lang: 'fr' }, item.francais)); ecoute.hidden = false; }
      lecteur?.jouer(); // après un toucher : permis sur iPhone
      suite.hidden = false;
      suite.focus();
    } else {
      retour.replaceChildren(icone('tourner'), 'Essaie encore !');
      av.pose('encourage');
    }
  }

  const zone = el('div', { class: 'exercice' },
    el('div', { class: 'tete-ex' }, titre, compteur(rang, total)),
    image ? el('div', { class: 'enonce' }, image) : '', ligne, reserve, message, ecoute, suite);
  zone.titre = titre;
  return zone;
}

// Enchaîne les manches, puis le bilan (`relancer` pour « Recommencer », `fin` : lignes de plus sous le titre).
export function serieOrdre(zone, items, langue, relancer, ...fin) {
  let i = 0;
  function suivante() {
    arreter();
    if (i === items.length) return bilanEntraine(zone, relancer, 'bravo', ...fin);
    i += 1;
    const q = manche(items[i - 1], langue, i, items.length, suivante);
    zone.replaceChildren(q);
    if (i > 1) q.titre.focus();
  }
  suivante();
}
