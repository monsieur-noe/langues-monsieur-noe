// Avatar de l'enseignant (cahier 7.8) : facultatif. Sans dessin dans contenu/avatar/, rien ne s'affiche.
// Pour changer une pose, l'enseignant remplace le fichier du même nom : aucun code à toucher.
import { el } from './outils.js';
import { fichiersPresents } from './donnees.js';

const DOSSIER = 'contenu/avatar/';
export const POSES = ['neutre', 'content', 'bravo', 'encourage', 'reflechit', 'explique', 'pointe', 'bonjour'];

// Pour chaque pose, le fichier qui existe : le SVG passe avant le PNG.
export function choisirDessins(presents, dossier = DOSSIER) {
  const dessins = {};
  for (const p of POSES) {
    const f = [`${dossier}${p}.svg`, `${dossier}${p}.png`].find((c) => presents.has(c));
    if (f) dessins[p] = f;
  }
  return dessins;
}

// Pose manquante : « neutre » ; « neutre » manquante aussi : rien.
export const cheminPose = (dessins, pose) => dessins[pose] || dessins.neutre || '';

let dessins = {};
let recherche = null;
// Cherche une seule fois par page quels dessins existent (sans les télécharger).
export function chargerAvatar() {
  recherche ||= fichiersPresents(POSES.flatMap((p) => [`${DOSSIER}${p}.svg`, `${DOSSIER}${p}.png`]))
    .then((presents) => { dessins = choisirDessins(presents); });
  return recherche;
}

// Un avatar décoratif (alt vide, masqué aux lecteurs d'écran). Pour rester seul à l'écran,
// on change sa pose (`.pose('content')`) au lieu d'en créer un second.
// `exacte` : pas de remplacement par « neutre » (accueil : un personnage qui ne salue pas n'y a pas sa place).
export function avatar(pose, exacte = false) {
  const img = el('img', { class: 'avatar', alt: '', 'aria-hidden': 'true', hidden: '' });
  img.pose = (p) => {
    const src = exacte ? dessins[p] || '' : cheminPose(dessins, p);
    img.hidden = !src;
    if (!src || img.getAttribute('src') === src) return;
    img.src = src;
    // Relance le fondu de 200 ms (coupé par le CSS si l'appareil demande moins d'animations).
    img.classList.remove('fondu');
    void img.offsetWidth;
    img.classList.add('fondu');
  };
  img.pose(pose);
  return img;
}
