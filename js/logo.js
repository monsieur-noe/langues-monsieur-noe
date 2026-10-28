// Logo du site (facultatif) : contenu/logo.svg ou contenu/logo.png.
// S'il existe, il devient l'icône de l'onglet et remplace la petite bulle à côté du nom du site.
// Sans fichier, rien ne change. Pour changer de logo, l'enseignant remplace le fichier du même nom.
import { fichiersPresents } from './donnees.js?v=e93b1733';

// Chemins calculés depuis ce fichier, pour marcher aussi depuis pages/ et controle/.
const candidats = ['logo.svg', 'logo.png'].map((f) => new URL(`../contenu/${f}`, import.meta.url).href);
const presents = await fichiersPresents(candidats);
const logo = candidats.find((c) => presents.has(c)); // le SVG passe avant le PNG

if (logo) {
  const icone = document.createElement('link');
  icone.rel = 'icon';
  icone.href = logo;
  document.head.append(icone);
  for (const place of document.querySelectorAll('.logo')) {
    const img = document.createElement('img');
    img.src = logo;
    img.alt = ''; // décoratif : le nom du site est écrit juste à côté
    place.replaceChildren(img);
    place.classList.add('dessin');
  }
}
