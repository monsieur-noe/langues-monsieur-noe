// Jeu « Qui est-ce ? » (cahier 7.9, demande du 2026-10-28) : l'enfant écoute et lit une description,
// puis touche la bonne personne parmi les dessins. Chaque personne une fois, dans le désordre.
// « Essaie encore ! » et une seconde chance, puis la bonne personne est montrée.
import { el, icone } from './outils.js?v=491f0158';
import { cheminSon } from './donnees.js?v=491f0158';
import { creerLecteur, arreter } from './audio.js?v=491f0158';
import { melanger, propositions, bilanEntraine, compteur, bravo } from './exercices.js?v=491f0158';
import { avatar } from './avatar.js?v=491f0158';

const CHOIX = 4; // 4 personnes à l'écran, même en P3 (demande de l'enseignant)

function question(d, ctx, rang, total, fin) {
  const { langue, dossier, descriptions } = ctx;
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('loupe'), 'Écoute et choisis la bonne personne.');
  const texte = el('p', { class: 'description', lang: langue }, ...d.phrases.flatMap((p, k) => (k ? [el('br'), p] : [p])));
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const message = el('div', { class: 'message-ex' }, retour);
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === total ? 'Terminer' : 'Suivant', icone('droite'));
  // Le texte de remplacement ne décrit pas le dessin : il donnerait la réponse.
  const boutons = propositions(d, descriptions, Math.min(CHOIX, descriptions.length)).map((x, k) => {
    const b = el('button', { type: 'button', class: 'reponse' }, el('img', { class: 'image', src: x.src, alt: `Personne ${k + 1}` }));
    b.juste = x === d;
    return b;
  });
  const marquer = (b) => { b.classList.add(b.juste ? 'juste' : 'faux'); b.prepend(el('span', { class: 'marque-ex' }, icone(b.juste ? 'coche' : 'croix'))); };
  let essais = 0;
  for (const b of boutons) {
    b.addEventListener('click', () => {
      essais += 1;
      marquer(b);
      b.disabled = true;
      if (!b.juste && essais < 2) {
        retour.replaceChildren(icone('bulle'), 'Essaie encore !');
        return;
      }
      for (const x of boutons) x.disabled = true;
      const bonne = boutons.find((x) => x.juste);
      if (!b.juste) { marquer(bonne); bonne.classList.add('montree'); }
      retour.replaceChildren(icone(b.juste ? 'sourire' : 'bulle'), b.juste ? bravo() : 'Voici la bonne personne.');
      message.prepend(avatar(b.juste ? 'content' : 'encourage'));
      if (d.francais) message.append(el('p', { class: 'fr' }, d.francais));
      suite.hidden = false;
      suite.focus();
      suite.addEventListener('click', () => fin());
    });
  }
  const zone = el('div', { class: 'exercice' },
    el('div', { class: 'tete-ex' }, titre, compteur(rang, total)),
    el('div', { class: 'enonce' }, el('div', { class: 'pile' },
      d.son ? creerLecteur(cheminSon(d, dossier), { nom: 'la description' }) : '', texte)),
    el('div', { class: `reponses visuels qui n${boutons.length}` }, ...boutons),
    message, suite);
  zone.titre = titre;
  return zone;
}

function lancer(zone, contenu) {
  const plan = melanger(contenu.descriptions);
  let i = 0;
  function suivante() {
    arreter();
    if (i === plan.length) {
      return bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, `Tu as trouvé les ${plan.length} personnes !`));
    }
    i += 1;
    const q = question(plan[i - 1], contenu, i, plan.length, suivante);
    zone.replaceChildren(q);
    if (i > 1) q.titre.focus();
  }
  suivante();
}

export default {
  id: 'qui-est-ce',
  nom: 'Qui est-ce ?',
  icone: 'loupe',
  // Au moins 3 personnes avec leur dessin (section [descriptions] du chapitre).
  possible: (contenu) => contenu.descriptions.length >= 3,
  lancer,
};
