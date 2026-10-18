// Rubrique « Je découvre » : les cartes des mots (une à la fois), puis les phrases et les pistes à écouter.
// Une carte a deux faces : le « mot » néerlandais (avec son haut-parleur) et son « indice »
// (image, carré de couleur, texte en grand, ou à défaut le français). Cahier 7.3.
import { el, icone } from './outils.js';
import { couleurIndice, fichiersPresents } from './donnees.js';
import { creerLecteur, arreter } from './audio.js';

export function cheminImage(mot, dossier) {
  return `${dossier}images/${mot.image || `${mot.id}.png`}`;
}

// Ce qui représente le mot. `images` = chemins d'images qui existent vraiment.
export function indice(mot, dossier, images) {
  const texte = mot.image.startsWith('texte:') ? mot.image.slice(6).trim() : '';
  if (texte) return { type: 'texte', texte };
  if (mot.image.startsWith('couleur:')) return { type: 'couleur', fond: couleurIndice(mot.image) };
  if (images.has(cheminImage(mot, dossier))) return { type: 'image', src: cheminImage(mot, dossier) };
  // Image prévue mais pas encore déposée, et français laissé vide : le mot plutôt qu'une face blanche.
  return { type: 'francais', texte: mot.francais || mot.mot };
}

function carre(fond, nom, langue) {
  const c = el('span', { class: 'carre', role: 'img', 'aria-label': nom, lang: langue });
  c.style.setProperty('--fond', fond); // propriété CSS, autorisée par la politique de sécurité (pas d'attribut style)
  return c;
}

// Face « mot » : le mot néerlandais et son bouton d'écoute, rien d'autre (ni couleur, ni image).
function faceMot(mot, langue, son) {
  return el('div', { class: 'face' }, el('span', { class: 'mot', lang: langue }, mot.mot), son);
}

// Ce qui représente le mot (image, carré de couleur, texte en grand ou français) ; servi aussi aux exercices.
// `langue` : le texte de remplacement est le mot étranger, lu avec le bon accent.
export function visuel(mot, ind, langue) {
  if (ind.type === 'image') return el('img', { class: 'image', src: ind.src, alt: mot.mot, lang: langue });
  if (ind.type === 'couleur') return carre(ind.fond, mot.mot, langue);
  if (ind.type === 'texte') return el('span', { class: ind.texte.length <= 3 ? 'tuile court' : 'tuile' }, ind.texte);
  return el('span', { class: 'francais' }, ind.texte);
}

// Face « indice » : seulement ce qui représente le mot, jamais le mot lui-même.
function faceIndice(mot, ind, langue) {
  return el('div', { class: 'face' }, visuel(mot, ind, langue));
}

function cartes(mots, indices, dossier, langue, sons, indiceDabord) {
  let index = 0;
  const zone = el('div', { class: 'zone-carte' });
  const compteur = el('p', { class: 'compteur', 'aria-live': 'polite' });
  const prec = el('button', { type: 'button', class: 'defile', 'aria-label': 'Carte précédente' }, icone('gauche'));
  const suiv = el('button', { type: 'button', class: 'defile', 'aria-label': 'Carte suivante' }, icone('droite'));

  function montrer(i) {
    const focusCarte = zone.contains(document.activeElement);
    index = Math.min(Math.max(i, 0), mots.length - 1);
    const mot = mots[index];
    const chemin = `${dossier}audio/${mot.id}.m4a`;
    // Sur les cartes, le bouton d'écoute seul : un mot dure une seconde, une barre n'y servirait pas.
    const recto = faceMot(mot, langue, sons.has(chemin) ? creerLecteur(chemin, { nom: mot.mot, avecBarre: false }) : '');
    const verso = faceIndice(mot, indices[index], langue);
    const [avant, arriere] = indiceDabord ? [verso, recto] : [recto, verso];
    avant.classList.add('avant');
    arriere.classList.add('arriere');
    // Seule la face visible se lit et se touche (lecteurs d'écran, clavier).
    const cacher = (face, oui) => { face.inert = oui; face.setAttribute('aria-hidden', oui); };
    cacher(arriere, true);
    const tourner = el('button', { type: 'button', class: 'coin', 'aria-label': 'Retourner la carte', 'aria-pressed': 'false' }, icone('tourner'));
    const carte = el('div', { class: 'carte' }, avant, arriere, tourner);
    // Toucher n'importe où sur la carte la retourne ; le lecteur audio, lui, joue le son.
    carte.addEventListener('click', (e) => {
      if (e.target.closest('.lecteur-audio')) return;
      const retournee = carte.classList.toggle('retournee');
      tourner.setAttribute('aria-pressed', retournee);
      cacher(avant, retournee);
      cacher(arriere, !retournee);
    });
    arreter(); // le son de la carte précédente s'arrête avec elle
    zone.replaceChildren(carte);
    compteur.textContent = `${index + 1} / ${mots.length}`;
    prec.disabled = index === 0;
    suiv.disabled = index === mots.length - 1;
    // Au clavier, le focus ne doit pas se perdre (carte remplacée, ou flèche désactivée au bout de la liste).
    if (focusCarte) tourner.focus();
    if (prec.disabled && document.activeElement === prec) suiv.focus();
    if (suiv.disabled && document.activeElement === suiv) prec.focus();
  }

  prec.addEventListener('click', () => montrer(index - 1));
  suiv.addEventListener('click', () => montrer(index + 1));
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.matches('input')) return; // les flèches de la barre audio servent à la barre
    if (e.key === 'ArrowLeft') montrer(index - 1);
    if (e.key === 'ArrowRight') montrer(index + 1);
  });
  montrer(0);
  return el('div', { class: 'cartes' }, zone, el('div', { class: 'navigation' }, prec, compteur, suiv));
}

// Les deux sens de révision, gardés dans l'adresse (?sens=indice), comme les rubriques.
function choixSens(indiceDabord, avecVisuel) {
  const lien = (sens, nom, ic) => {
    const params = new URLSearchParams(location.search);
    if (sens) params.set('sens', sens); else params.delete('sens');
    return el('a', { class: 'seg', href: `?${params}`, 'aria-current': (sens === 'indice') === indiceDabord && 'page' }, icone(ic), nom);
  };
  return el('nav', { class: 'segments sens', 'aria-label': 'Sens des cartes' },
    lien('', 'Néerlandais d\'abord', 'bulle'),
    lien('indice', avecVisuel ? 'Image d\'abord' : 'Français d\'abord', avecVisuel ? 'image' : 'oeil'));
}

function traduction(texte, quoi) {
  return el('details', { class: 'traduction' },
    el('summary', {}, icone('oeil'), quoi),
    el('p', {}, texte));
}

function phrases(liste, dossier, langue, sons) {
  return el('section', { class: 'bloc' },
    el('h2', {}, 'Les phrases'),
    el('ul', { class: 'phrases' }, ...liste.map((p) => {
      const chemin = `${dossier}audio/${p.id}.m4a`;
      return el('li', {},
        el('div', { class: 'ligne' },
          el('p', { lang: langue }, p.phrase),
          sons.has(chemin) ? creerLecteur(chemin, { nom: p.phrase }) : ''),
        traduction(p.francais, 'Voir en français'));
    })));
}

// Piste entière (exemple : « Savoir se présenter ») : le lecteur large, avec « ⟲ 5 s ».
function piste(p, dossier, langue, sons) {
  const chemin = `${dossier}audio/${p.id}.m4a`;
  const enfants = [el('h3', {}, p.titre)];
  if (sons.has(chemin)) enfants.push(creerLecteur(chemin, { nom: p.titre, large: true }));
  if (p.texte) {
    enfants.push(el('details', { class: 'traduction' },
      el('summary', {}, icone('oeil'), 'Voir le texte'),
      el('p', { lang: langue }, p.texte),
      p.francais ? el('p', { class: 'fr' }, p.francais) : ''));
  }
  return el('div', { class: 'piste' }, ...enfants);
}

// Cherche quels audios et images du chapitre existent (plus d'autres chemins), et l'indice de chaque mot.
export async function chercherFichiers(donnees, dossier, autres = []) {
  const { mots, phrases, pistes, dictees } = donnees;
  const audios = [...mots, ...phrases, ...pistes, ...dictees].map((x) => `${dossier}audio/${x.id}.m4a`);
  // Les images ne sont cherchées que pour les mots sans « texte: » ni « couleur: ».
  const images = mots.filter((m) => !/^(texte|couleur):/.test(m.image)).map((m) => cheminImage(m, dossier));
  const presents = await fichiersPresents([...audios, ...images, ...autres]);
  return { presents, indices: mots.map((m) => indice(m, dossier, presents)) };
}

export async function afficherDecouvre(conteneur, donnees, dossier, langue, indiceDabord) {
  const { mots, phrases: liste, pistes } = donnees;
  const { presents, indices } = await chercherFichiers(donnees, dossier);

  const parties = [];
  if (mots.length) {
    parties.push(choixSens(indiceDabord, indices.some((i) => i.type !== 'francais')));
    parties.push(cartes(mots, indices, dossier, langue, presents, indiceDabord));
  }
  if (liste.length) parties.push(phrases(liste, dossier, langue, presents));
  // Une piste sans son ni texte n'a rien à montrer.
  const aEcouter = pistes.filter((p) => presents.has(`${dossier}audio/${p.id}.m4a`) || p.texte);
  if (aEcouter.length) parties.push(el('section', { class: 'bloc' }, el('h2', {}, 'À écouter'), ...aEcouter.map((p) => piste(p, dossier, langue, presents))));
  conteneur.replaceChildren(...parties);
}
