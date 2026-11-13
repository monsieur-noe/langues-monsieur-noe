// Jeu « Le dessin disparu » (document de l'enseignant, jeu 11 ; le jeu de Kim) : 5 dessins avec leur mot écrit ;
// on touche un dessin pour entendre son mot. Après « Je suis prêt ! », les mots s'effacent et un dessin disparaît
// en fondu (une demi-seconde, une seule fois) : l'enfant choisit le mot qui manque parmi 3 (P3) ou 4 mots.
// Leurres : les mots des autres dessins de la manche. Essais sans limite ; après deux erreurs, la bonne réponse est entourée.
// Version sans son (?muet=1) : les mots restent écrits, aucun haut-parleur.
import { el, icone, muet } from './outils.js?v=4a69adff';
import { cheminSon } from './donnees.js?v=4a69adff';
import { creerLecteur, arreter } from './audio.js?v=4a69adff';
import { visuel } from './cartes.js?v=4a69adff';
import { melanger, propositions, bilanEntraine, compteur, bravo, fete } from './exercices.js?v=4a69adff';
import { avatar } from './avatar.js?v=4a69adff';

const DESSINS = 5;
const MANCHES = 6;

// Mots avec un dessin, un carré de couleur ou un chiffre, sans deux fois le même (deux cases identiques).
export function motsDessines(mots) {
  const vus = new Set();
  return mots.filter((m) => {
    const cle = m.ind.type === 'francais' ? '' : `${m.ind.type}:${m.ind.src || m.ind.fond || m.ind.texte}`;
    if (!cle || vus.has(cle)) return false;
    vus.add(cle);
    return true;
  });
}

// Les manches : un mot qui disparaît (jamais deux fois le même) et les autres dessins, à des places tirées au hasard.
export function planDessins(mots, manches = MANCHES, dessins = DESSINS) {
  return melanger(mots).slice(0, manches).map((cache) => {
    const montres = melanger([cache, ...melanger(mots.filter((m) => m !== cache)).slice(0, dessins - 1)]);
    return { cache, montres };
  });
}

const NS = 'http://www.w3.org/2000/svg';
const svg = (balise, attributs = {}, ...enfants) => {
  const n = document.createElementNS(NS, balise);
  for (const [k, v] of Object.entries(attributs)) n.setAttribute(k, v);
  n.append(...enfants);
  return n;
};
// Pictogramme du menu (trois cadres, celui du milieu en pointillés), ajouté au jeu d'icônes de la page.
function ajouterPictogramme() {
  const sprite = document.querySelector('svg.sprite');
  if (!sprite || sprite.querySelector('#dessin-disparu')) return;
  sprite.append(svg('symbol', { id: 'dessin-disparu', viewBox: '0 0 24 24' },
    svg('rect', { x: 1.5, y: 7, width: 6, height: 10, rx: 1.5 }),
    svg('rect', { x: 9, y: 7, width: 6, height: 10, rx: 1.5, 'stroke-dasharray': '2 1.6' }),
    svg('rect', { x: 16.5, y: 7, width: 6, height: 10, rx: 1.5 })));
}
if (typeof document !== 'undefined') {
  ajouterPictogramme();
  if (!document.querySelector('link[href*="jeu-dessin-disparu.css"]')) {
    document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-dessin-disparu.css?v=4a69adff' }));
  }
}

// Relance une animation CSS (classe retirée puis remise), même si elle a déjà joué.
const rejouer = (n, classe) => { n.classList.remove(classe); void n.offsetWidth; n.classList.add(classe); };

function manche({ cache, montres }, ctx, rang, total, fin) {
  const { langue, dossier, n } = ctx;
  const lecteurs = new Map(montres.map((m) => [m, m.son && !muet ? creerLecteur(cheminSon(m, dossier), { nom: m.mot, avecBarre: false, lent: false }) : null]));
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('oeil'), 'Observe bien, puis touche « Je suis prêt ! ».');
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une réponse
  const message = el('div', { class: 'message-ex' }, av, retour);
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === total ? 'Terminer' : 'Suivant', icone('droite'));
  suite.addEventListener('click', () => fin());

  // Phase 1 : chaque case est un bouton qui dit son mot (avec son) ; sans son, rien à toucher.
  const cases = montres.map((m) => {
    const contenu = [el('span', { class: 'dessin-dd' }, visuel(m, m.ind, langue), el('span', { class: 'vide-dd', 'aria-hidden': 'true' }, '?')),
      el('span', { class: 'mot mot-dd', lang: langue }, m.mot)];
    contenu[0].querySelector('img')?.setAttribute('loading', 'eager'); // toutes les images prêtes avant le « Je suis prêt »
    const c = lecteurs.get(m) ? el('button', { type: 'button', class: 'case-dd' }, ...contenu) : el('div', { class: 'case-dd' }, ...contenu);
    if (lecteurs.get(m)) c.addEventListener('click', () => { rejouer(c, 'bond-dd'); lecteurs.get(m).jouer(); });
    return c;
  });
  const grille = el('div', { class: 'grille-dd' }, ...cases);
  const pret = el('button', { type: 'button', class: 'action' }, icone('coche'), 'Je suis prêt !');
  const choix = el('div', { class: 'reponses choix-dd', hidden: '' });
  const zone = el('div', { class: 'exercice dessin-disparu' },
    el('div', { class: 'tete-ex' }, titre, compteur(rang, total)), grille, pret, choix, message, suite);

  pret.addEventListener('click', () => {
    arreter();
    pret.remove();
    titre.replaceChildren(icone('loupe'), 'Quel mot manquait ?');
    // Phase 2 : les mots s'effacent, les dessins restent à leur place (plus rien à toucher), un seul disparaît en fondu.
    grille.classList.add('sans-arrivee'); // les cases de la phase 2 ne refont pas leur entrée
    cases.forEach((c, k) => {
      const fixe = el('div', { class: 'case-dd phase2' }, ...c.childNodes);
      if (montres[k] === cache) {
        fixe.classList.add('disparu');
        fixe.querySelector('.dessin-dd > :first-child')?.setAttribute('aria-hidden', 'true');
      }
      c.replaceWith(fixe);
      cases[k] = fixe;
    });
    let erreurs = 0;
    const lignes = [];
    const boutons = propositions(cache, montres, n).map((m) => {
      const b = el('button', { type: 'button', class: 'reponse' }, el('span', { class: 'mot', lang: langue }, m.mot));
      b.juste = m === cache;
      const lecteur = lecteurs.get(m);
      lignes.push(el('div', { class: 'ligne-dd' }, b, lecteur || ''));
      b.addEventListener('click', () => {
        b.disabled = true;
        b.prepend(el('span', { class: 'marque-ex' }, icone(b.juste ? 'coche' : 'croix')));
        if (!b.juste) {
          rejouer(b, 'faux');
          erreurs += 1;
          retour.replaceChildren(icone('tourner'), 'Essaie encore !');
          av.pose('reflechit');
          if (erreurs >= 2) boutons.find((x) => x.juste).classList.add('entoure-dd'); // cadre épais, fixe
          return;
        }
        b.classList.add('juste');
        boutons.forEach((x) => { x.disabled = true; });
        cases[montres.indexOf(cache)].classList.replace('disparu', 'revenu');
        cases.forEach((c) => c.classList.remove('phase2')); // les mots reviennent sous les dessins
        lecteur?.jouer(); // après un toucher : permis sur iPhone
        retour.replaceChildren(icone('sourire'), bravo());
        av.pose('content');
        suite.hidden = false;
        suite.focus();
      });
      return b;
    });
    choix.replaceChildren(...lignes);
    choix.hidden = false;
    titre.focus({ preventScroll: true });
    zone.scrollIntoView({ block: 'start' }); // téléphone : les dessins et les mots à choisir tiennent ensemble à l'écran
  });
  zone.titre = titre;
  return zone;
}

function lancer(zone, contenu) {
  const plan = planDessins(motsDessines(contenu.mots));
  let i = 0;
  function suivante() {
    arreter();
    if (i === plan.length) {
      bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, `Tu as retrouvé les ${plan.length} mots !`));
      return fete(zone.querySelector('.bilan')); // pluie d'étoiles du site (rien si l'appareil demande moins d'animations)
    }
    i += 1;
    const q = manche(plan[i - 1], contenu, i, plan.length, suivante);
    zone.replaceChildren(q);
    if (i > 1) q.titre.focus();
  }
  suivante();
}

export default {
  id: 'dessin-disparu',
  nom: 'Le dessin disparu',
  icone: 'dessin-disparu',
  // Au moins 5 mots avec un dessin, une couleur ou un chiffre (les 5 cases de la manche).
  possible: (contenu) => motsDessines(contenu.mots).length >= DESSINS,
  lancer,
};
