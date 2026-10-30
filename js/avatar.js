// Avatar de l'enseignant (cahier 7.8) : facultatif. Sans dessin dans contenu/avatar/, rien ne s'affiche.
// Pour changer une pose, l'enseignant remplace le fichier du même nom : aucun code à toucher.
import { el } from './outils.js?v=22778f70';
import { fichiersPresents } from './donnees.js?v=22778f70';

const DOSSIER = 'contenu/avatar/';
export const POSES = ['neutre', 'content', 'bravo', 'encourage', 'reflechit', 'explique', 'pointe', 'bonjour', 'attaque', 'aie'];
// Poses du combat de boss : sans leur dessin, une pose proche avant « neutre ».
const PROCHE = { attaque: 'pointe', aie: 'reflechit' };

// Pour chaque pose, le fichier qui existe : le SVG passe avant le PNG.
export function choisirDessins(presents, dossier = DOSSIER) {
  const dessins = {};
  for (const p of POSES) {
    const f = [`${dossier}${p}.svg`, `${dossier}${p}.png`].find((c) => presents.has(c));
    if (f) dessins[p] = f;
  }
  return dessins;
}

// Pose manquante : la pose proche s'il y en a une, sinon « neutre » ; « neutre » manquante aussi : rien.
export const cheminPose = (dessins, pose) => dessins[pose] || dessins[PROCHE[pose]] || dessins.neutre || '';

let dessins = {};
let recherche = null;
// Cherche une seule fois par page quels dessins existent (sans les télécharger) : d'abord les SVG,
// puis le PNG des seules poses sans SVG (10 demandes au lieu de 20 quand tout est en SVG).
export function chargerAvatar() {
  recherche ||= fichiersPresents(POSES.map((p) => `${DOSSIER}${p}.svg`))
    .then(async (svg) => {
      const png = await fichiersPresents(POSES.filter((p) => !svg.has(`${DOSSIER}${p}.svg`)).map((p) => `${DOSSIER}${p}.png`));
      dessins = choisirDessins(new Set([...svg, ...png]));
    });
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
