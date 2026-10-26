// Petits outils partagés par les pages.

// Langues connues du site. Une langue sans chapitre au catalogue s'affiche « Bientôt ».
export const LANGUES = [
  { code: 'nl', nom: 'Nederlands', bulle: 'Hallo!', drapeau: 'drapeau-nl' },
  { code: 'en', nom: 'English', bulle: 'Hello!', drapeau: 'drapeau-gb' },
];

// Lit un paramètre de l'adresse (?langue=nl&annee=p3…). Valeur douteuse = absente.
export function parametre(nom) {
  const v = new URLSearchParams(location.search).get(nom) || '';
  return /^[a-z0-9-]+$/.test(v) ? v : '';
}

// Couleur d'un chapitre (ou d'une année), d'après son rang dans la liste (classes du CSS).
export function couleur(rang) {
  return `couleur-${rang % 5}`;
}

// Crée un élément HTML : el('a', { href: 'x', class: 'y' }, 'texte', autreElement).
export function el(balise, attributs = {}, ...enfants) {
  const e = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(attributs)) {
    if (valeur !== undefined && valeur !== null && valeur !== false) e.setAttribute(cle, valeur);
  }
  e.append(...enfants);
  return e;
}

// Pictogramme pris dans le jeu d'icônes (<svg> caché) de la page.
export function icone(nom) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'ic');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `#${nom}`);
  svg.append(use);
  return svg;
}

// Encadré d'erreurs pour l'enseignant : fichier, ligne et correction.
export function encadreErreurs(erreurs, intro) {
  return el('div', { class: 'erreurs', role: 'alert' },
    el('p', {}, el('strong', {}, intro)),
    el('ul', {}, ...erreurs.map((e) => el('li', {},
      e.ligne ? `${e.fichier}, ligne ${e.ligne} : ${e.message}` : e.message))));
}
