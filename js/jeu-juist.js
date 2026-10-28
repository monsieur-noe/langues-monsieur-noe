// Jeu « Juist of fout ? » (cahier 7.9) : une image, un mot entendu ; l'enfant dit s'ils vont ensemble.
// Un seul essai par question (deux boutons), puis le bon mot est montré et joué. 8 questions.
import { el, icone } from './outils.js?v=e93b1733';
import { cheminSon } from './donnees.js?v=e93b1733';
import { creerLecteur, arreter } from './audio.js?v=e93b1733';
import { visuel } from './cartes.js?v=e93b1733';
import { melanger, tirer, bilanEntraine, compteur, bravo } from './exercices.js?v=e93b1733';
import { avatar } from './avatar.js?v=e93b1733';

const NOMBRE = 8;
const avecImageEtSon = (contenu) => contenu.mots.filter((m) => m.ind.type !== 'francais' && m.son);

// `nombre` questions : chaque image une fois avant toute répétition ; le mot entendu est le bon
// une fois sur deux exactement, sinon un autre mot du chapitre.
export function planJuist(pool, nombre) {
  const bons = melanger(Array.from({ length: nombre }, (_, k) => k < nombre / 2));
  return tirer(pool, nombre).map((image, k) => ({
    image,
    entendu: bons[k] ? image : melanger(pool.filter((x) => x !== image))[0],
  }));
}

function question(q, ctx, rang, fin) {
  const { langue, dossier } = ctx;
  const ecoute = creerLecteur(cheminSon(q.entendu, dossier), { nom: 'le mot à écouter' });
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('haut-parleur'), 'Écoute le mot. Est-ce bien cette image ?');
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const message = el('div', { class: 'message-ex' }, retour);
  const solution = el('div', { class: 'pile', hidden: '' });
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === NOMBRE ? 'Terminer' : 'Suivant', icone('droite'));
  const vaEnsemble = q.entendu === q.image;
  const boutons = [[true, 'pouce', 'Oui, ça va !'], [false, 'hesite', 'Non, pas ça']].map(([oui, ic, texte]) => {
    // Fermés jusqu'à la première écoute : on répond à ce qu'on a entendu, pas au hasard.
    const b = el('button', { type: 'button', class: 'reponse', disabled: '' }, icone(ic), el('span', {}, texte));
    b.juste = oui === vaEnsemble;
    return b;
  });
  ecoute.addEventListener('click', () => { if (suite.hidden) for (const b of boutons) b.disabled = false; });

  for (const b of boutons) {
    b.addEventListener('click', () => {
      for (const x of boutons) x.disabled = true;
      b.classList.add(b.juste ? 'juste' : 'faux');
      b.prepend(el('span', { class: 'marque-ex' }, icone(b.juste ? 'coche' : 'croix')));
      retour.replaceChildren(icone(b.juste ? 'sourire' : 'bulle'), b.juste ? bravo() : 'Pas grave, continue !');
      message.prepend(avatar(b.juste ? 'content' : 'encourage'));
      // Le bon mot de l'image, écrit et joué (après un toucher : permis sur iPhone).
      const son = creerLecteur(cheminSon(q.image, dossier), { nom: q.image.mot });
      solution.replaceChildren(el('p', {}, 'Sur l\'image : ', el('span', { class: 'mot', lang: langue }, q.image.mot)), son);
      solution.hidden = false;
      son.jouer();
      suite.hidden = false;
      suite.focus();
      suite.addEventListener('click', () => fin(b.juste));
    });
  }

  const zone = el('div', { class: 'exercice' },
    el('div', { class: 'tete-ex' }, titre, compteur(rang, NOMBRE)),
    el('div', { class: 'enonce' }, el('div', { class: 'pile' }, visuel(q.image, q.image.ind, langue), ecoute)),
    el('div', { class: 'reponses n2 juist' }, ...boutons),
    message, solution, suite);
  zone.titre = titre;
  return zone;
}

function lancer(zone, contenu) {
  const plan = planJuist(avecImageEtSon(contenu), NOMBRE);
  let bonnes = 0;
  let i = 0;
  function suivante(juste) {
    arreter();
    if (i > 0 && juste) bonnes += 1;
    if (i === plan.length) {
      // Avatar qui applaudit dès 75 % de bonnes réponses, sinon celui qui réfléchit (décision du 2026-10-20).
      return bilanEntraine(zone, () => lancer(zone, contenu), bonnes >= NOMBRE * 0.75 ? 'bravo' : 'reflechit',
        el('p', {}, `Tu as trouvé ${bonnes} bonne${bonnes > 1 ? 's' : ''} réponse${bonnes > 1 ? 's' : ''} sur ${NOMBRE}.`));
    }
    i += 1;
    const q = question(plan[i - 1], contenu, i, suivante);
    zone.replaceChildren(q);
    if (i > 1) q.titre.focus();
  }
  suivante(false);
}

export default {
  id: 'juist-of-fout',
  nom: 'Juist of fout ?',
  lang: 'nl',
  icone: 'pouce',
  // Au moins 4 mots avec un indice visuel (dessin, couleur, chiffre) et un son.
  possible: (contenu) => avecImageEtSon(contenu).length >= 4,
  lancer,
};
