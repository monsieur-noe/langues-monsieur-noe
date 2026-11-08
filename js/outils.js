// Petits outils partagés par les pages.

// Langues connues du site. Une langue sans chapitre au catalogue s'affiche « Bientôt ».
export const LANGUES = [
  { code: 'nl', nom: 'Nederlands', francais: 'Néerlandais', bulle: 'Hallo!', drapeau: 'drapeau-nl' },
  { code: 'en', nom: 'English', francais: 'Anglais', bulle: 'Hello!', drapeau: 'drapeau-gb' },
];

// Lit un paramètre de l'adresse (?langue=nl&annee=p3…). Valeur douteuse = absente.
export function parametre(nom) {
  const v = new URLSearchParams(location.search).get(nom) || '';
  return /^[a-z0-9-]+$/.test(v) ? v : '';
}

// Version muette (cahier 7.10) : « ?muet=1 » dans l'adresse. Rien n'est enregistré : c'est l'adresse qui porte le réglage.
export const muet = typeof location !== 'undefined' && new URLSearchParams(location.search).get('muet') === '1';

if (muet) {
  // Chaque lien du site garde « muet=1 », au moment du toucher (les liens sont souvent créés après le chargement).
  addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a || a.target || a.hasAttribute('data-avec-son')) return;
    const u = new URL(a.href);
    if (u.origin !== location.origin || u.searchParams.has('muet')) return;
    u.searchParams.set('muet', '1');
    a.href = u.href;
  }, true);
  // Bandeau en haut de la page, pour que l'enseignant voie quelle version est ouverte.
  const avecSon = new URL(location.href);
  avecSon.searchParams.delete('muet');
  // Une seule fois, même si une ancienne page gardée en mémoire charge ce fichier deux fois (deux numéros de version).
  if (!document.querySelector('.bandeau-muet')) document.querySelector('main')?.prepend(el('p', { class: 'bandeau-muet' }, 'Version sans son',
    el('a', { href: avecSon.href, 'data-avec-son': '' }, 'Remettre le son')));
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
