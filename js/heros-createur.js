// Accueil (cahier §7.12) : « Mon héros », replié comme les flammes. Ouvert : le héros en grand, et une ligne par pièce
// avec deux flèches (rien à glisser, rien à taper). Chaque changement est gardé aussitôt sur l'appareil.
import { el, icone } from './outils.js?v=52c38935';
import { PIECES, auHasard, dessinerHeros, lireHeros, garderHeros } from './heros.js?v=52c38935';

export function encadreHeros() {
  let h = lireHeros();
  const petit = el('span', { class: 'heros-petit', 'aria-hidden': 'true' });
  const grand = el('div', { class: 'heros-grand', 'aria-hidden': 'true' });
  const annonce = el('p', { class: 'cache-oeil', 'aria-live': 'polite' });
  const valeurs = {};
  const montrer = () => {
    const dessin = dessinerHeros(h); // dessin du site, aucune donnée venue de l'extérieur
    petit.innerHTML = dessin;
    grand.innerHTML = dessin;
    for (const p of PIECES) valeurs[p.cle].textContent = p.choix[h[p.cle]].nom;
  };
  const changer = (nouveau, message) => {
    h = nouveau;
    garderHeros(h);
    montrer();
    annonce.textContent = message;
  };
  const lignes = PIECES.map((p) => {
    valeurs[p.cle] = el('span', { class: 'valeur-heros' });
    const fleche = (pas, nom, sens) => {
      const b = el('button', { type: 'button', class: 'defile', 'aria-label': `${p.nom} : ${sens}` }, icone(nom));
      b.addEventListener('click', () => {
        const n = (h[p.cle] + pas + p.choix.length) % p.choix.length;
        changer({ ...h, [p.cle]: n }, `${p.nom} : ${p.choix[n].nom}`);
      });
      return b;
    };
    return el('li', {}, fleche(-1, 'gauche', 'choix précédent'),
      el('span', { class: 'piece-heros' }, el('span', { class: 'nom-piece' }, p.nom), valeurs[p.cle]),
      fleche(1, 'droite', 'choix suivant'));
  });
  const hasard = el('button', { type: 'button', class: 'action' }, icone('tourner'), 'Au hasard');
  hasard.addEventListener('click', () => changer(auHasard(), 'Un nouveau héros !'));
  const fini = el('button', { type: 'button', class: 'action' }, icone('etoile'), 'C\'est mon héros !');
  const boite = el('details', { class: 'heros-accueil' },
    el('summary', { class: 'titre-heros' }, petit, el('span', {}, 'Mon héros'),
      el('span', { class: 'ouvrir-flammes', 'aria-hidden': 'true' }, icone('droite'))),
    grand, el('ul', { class: 'pieces-heros' }, ...lignes), el('p', { class: 'boutons-heros' }, hasard, fini), annonce);
  fini.addEventListener('click', () => {
    boite.open = false;
    boite.scrollIntoView({ block: 'nearest' });
  });
  montrer();
  return boite;
}
