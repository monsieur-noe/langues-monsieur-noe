// Jeu « Le loto des sons » (cahier 7.9) : une grille d'images ; on écoute un mot, on touche son image,
// elle reçoit un jeton. La première ligne complète donne « Bingo ! » ; on peut continuer jusqu'à la grille pleine.
import { el, icone } from './outils.js?v=c01d7235';
import { cheminSon } from './donnees.js?v=c01d7235';
import { creerLecteur, arreter } from './audio.js?v=c01d7235';
import { visuel } from './cartes.js?v=c01d7235';
import { melanger, bilanEntraine, bravo } from './exercices.js?v=c01d7235';
import { avatar } from './avatar.js?v=c01d7235';

// Mots utilisables dans la grille : avec un indice visuel et un son, et jamais deux fois le même indice
// (deux « texte:10 » ou deux fois la même couleur rendraient deux cases identiques : on n'en garde qu'une).
export function motsDuLoto(mots) {
  const parIndice = new Map();
  for (const m of melanger(mots)) {
    if (m.ind.type === 'francais' || !m.son) continue;
    const cle = `${m.ind.type}:${m.ind.src || m.ind.fond || m.ind.texte}`;
    if (!parIndice.has(cle)) parIndice.set(cle, m);
  }
  return [...parIndice.values()];
}

// 3 × 3 dès 9 mots, sinon 2 × 3 (au moins 6 mots) ; toujours 3 colonnes.
export const tailleLoto = (nb) => (nb >= 9 ? 9 : nb >= 6 ? 6 : 0);

// Lignes gagnantes (positions dans la grille, lue de gauche à droite puis de haut en bas) :
// les rangées et les colonnes ; les diagonales seulement dans la grille carrée 3 × 3.
export function lignesLoto(taille) {
  const rangs = taille / 3;
  const lignes = [];
  for (let r = 0; r < rangs; r++) lignes.push([0, 1, 2].map((c) => r * 3 + c));
  for (let c = 0; c < 3; c++) lignes.push(Array.from({ length: rangs }, (_, r) => r * 3 + c));
  if (taille === 9) lignes.push([0, 4, 8], [2, 4, 6]);
  return lignes;
}

// Une ligne dont toutes les cases ont un jeton, ou rien.
export const ligneComplete = (lignes, jetons) => lignes.find((l) => l.every((k) => jetons.has(k)));

function lancer(zone, contenu) {
  const { langue, dossier } = contenu;
  const pool = motsDuLoto(contenu.mots);
  const grille = pool.slice(0, tailleLoto(pool.length)); // déjà mélangés
  const appels = melanger(grille.map((_, k) => k)); // ordre des mots appelés : chacun une fois
  const lignes = lignesLoto(grille.length);
  const jetons = new Set();
  let bingo = false;
  let appel = -1;
  let essais = 0;
  let lecteur;

  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('haut-parleur'), 'Écoute et touche la bonne image.');
  const ecoute = el('div', { class: 'ecoute-loto' });
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une réponse
  const message = el('div', { class: 'message-ex' }, av, retour);
  const suite = el('div', { class: 'suite-loto', hidden: '' });
  const cases = grille.map((m, k) => {
    const b = el('button', { type: 'button', class: 'reponse case-loto', disabled: '' }, visuel(m, m.ind, langue));
    b.addEventListener('click', () => toucher(k));
    return b;
  });
  const ouvrir = (oui) => cases.forEach((b, k) => { b.disabled = !oui || jetons.has(k); });
  const dire = (ic, txt, pose) => { retour.replaceChildren(icone(ic), txt); av.pose(pose); };

  function poserJeton(k) {
    jetons.add(k);
    cases[k].classList.remove('faux');
    cases[k].classList.add('juste');
    cases[k].append(el('span', { class: 'jeton' }, icone('coche')));
  }

  const effacerCroix = () => cases.forEach((b) => { b.classList.remove('faux'); b.querySelector('.marque-ex')?.remove(); });

  function appelSuivant() {
    effacerCroix();
    appel += 1;
    essais = 0;
    if (appel === appels.length) {
      arreter();
      return bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, 'Ta grille est pleine !'));
    }
    const mot = grille[appels[appel]];
    lecteur = creerLecteur(cheminSon(mot, dossier), { nom: 'le mot à écouter' });
    // Les cases s'ouvrent à la première écoute : on touche ce qu'on a entendu, pas au hasard.
    lecteur.addEventListener('click', () => { if (suite.hidden) ouvrir(true); });
    ecoute.replaceChildren(lecteur);
    ouvrir(false);
  }

  function apresJeton() {
    const ligne = !bingo && ligneComplete(lignes, jetons);
    if (!ligne) return appelSuivant();
    bingo = true;
    effacerCroix();
    retour.classList.add('bingo');
    ligne.forEach((k, i) => { cases[k].classList.add('gagnante'); cases[k].style.animationDelay = `${i * 0.15}s`; }); // l'une après l'autre
    dire('etoile', 'Bingo !', 'bravo');
    ouvrir(false);
    const continuer = el('button', { type: 'button', class: 'action' }, 'Continuer', icone('droite'));
    const nouvelle = el('button', { type: 'button', class: 'action secondaire' }, icone('tourner'), 'Nouvelle grille');
    continuer.addEventListener('click', () => { suite.hidden = true; retour.classList.remove('bingo'); appelSuivant(); });
    nouvelle.addEventListener('click', () => lancer(zone, contenu));
    suite.replaceChildren(continuer, nouvelle);
    suite.hidden = false;
    continuer.focus();
  }

  function toucher(k) {
    const bon = appels[appel];
    if (k === bon) {
      poserJeton(k);
      dire('sourire', bravo(), 'content');
      lecteur.jouer(); // le mot redit après la bonne réponse (après un toucher : permis sur iPhone)
      return apresJeton();
    }
    cases[k].classList.add('faux');
    cases[k].disabled = true;
    cases[k].append(el('span', { class: 'marque-ex' }, icone('croix')));
    essais += 1;
    if (essais < 2) return dire('tourner', 'Essaie encore !', 'reflechit');
    // Après deux essais, la bonne image reçoit son jeton et le mot est redit.
    poserJeton(bon);
    dire('bulle', 'Voici la bonne image.', 'explique');
    lecteur.jouer();
    apresJeton();
  }

  zone.replaceChildren(el('div', { class: 'exercice' },
    titre, ecoute,
    el('div', { class: 'reponses visuels loto' }, ...cases),
    message, suite));
  appelSuivant();
}

export default {
  id: 'loto',
  nom: 'Le loto des sons',
  icone: 'grille',
  // Au moins 6 mots avec un indice visuel (dessin, couleur, chiffre) et un son.
  possible: (contenu) => tailleLoto(motsDuLoto(contenu.mots).length) > 0,
  lancer,
};
