// Rubrique « Je comprends » (v1.65, chapitres de grammaire) : l'explication de la section [explication],
// avant « Je découvre ». Titres, petits textes, tableaux, exemples à écouter et astuces.
import { el, icone } from './outils.js?v=16a7b2c4';
import { fichiersPresents, cheminSon } from './donnees.js?v=16a7b2c4';
import { creerLecteur } from './audio.js?v=16a7b2c4';

// Mots mis en couleur (ligne « en_couleur: am, is, are ») : une couleur par mot de la liste ;
// « -ing » colore tout mot qui finit ainsi ; « open/close/run » : plusieurs mots d'une même couleur.
// Le gras s'ajoute à la couleur (jamais la couleur seule).
export function colorer(texte, liste) {
  if (!liste.length) return [texte];
  return texte.split(/([\p{L}']+)/u).map((bout) => {
    const m = bout.toLowerCase();
    const k = liste.findIndex((g) => g.split('/').some((x) => (x.startsWith('-') ? m.length > x.length && m.endsWith(x.slice(1)) : m === x)));
    return k < 0 ? bout : el('strong', { class: `en-couleur c${k % 4}` }, bout);
  });
}

export async function afficherComprends(zone, donnees, dossier, langue) {
  const lignes = donnees.explication;
  const sons = lignes.filter((l) => l.type === 'exemple' && l.colonnes[2]).map((l) => cheminSon({ id: l.colonnes[2] }, dossier));
  const presents = await fichiersPresents(sons);
  const c = (t) => colorer(t, donnees.en_couleur);
  const parties = [];
  for (let i = 0; i < lignes.length; i++) {
    const { type, colonnes: [a, b, son] } = lignes[i];
    if (type === 'titre') parties.push(el('h2', { class: 'titre-comprends' }, icone('ampoule'), a));
    else if (type === 'texte') parties.push(el('p', { class: 'texte-comprends' }, ...c(a)));
    else if (type === 'astuce') parties.push(el('aside', { class: 'astuce' }, el('p', {}, el('strong', {}, icone('etoile'), 'Astuce'), ' ', ...c(a))));
    else if (type === 'exemple') {
      const chemin = son && cheminSon({ id: son }, dossier);
      parties.push(el('div', { class: 'exemple' },
        el('p', { class: 'phrase', lang: langue }, ...c(a)),
        el('p', { class: 'fr' }, b),
        chemin && presents.has(chemin) ? creerLecteur(chemin, { nom: a }) : ''));
    } else {
      // Lignes « tableau » qui se suivent : un seul tableau, la première ligne en en-tête.
      const rangs = [];
      while (i < lignes.length && lignes[i].type === 'tableau') rangs.push(lignes[i++].colonnes);
      i -= 1;
      const [tete, ...corps] = rangs;
      // « image:love.svg » : un dessin du dossier images/ du chapitre (smileys), décoratif : la case voisine dit la même chose.
      const cellule = (x) => el('td', {}, ...(x.startsWith('image:')
        ? [el('img', { class: 'dessin-tableau', src: `${dossier}images/${x.slice(6).trim()}`, alt: '' })] : c(x)));
      parties.push(el('div', { class: 'tableau-comprends' }, el('table', {},
        el('thead', {}, el('tr', {}, ...tete.map((x) => el('th', { scope: 'col' }, x)))),
        el('tbody', {}, ...corps.map((r) => el('tr', {}, ...r.map(cellule)))))));
    }
  }
  zone.replaceChildren(el('div', { class: 'comprends' }, ...parties));
}
