// Jeu « Le sentier des phrases » (jeu 10, accepté par l'enseignant le 2026-11-08 ; vue « comme si l'on marchait »
// demandée le 2026-11-09) : 3 ou 4 fourches mènent à un coffre. À chaque fourche, une phrase (entendue, ou lue dans
// la version sans son) et deux panneaux en français, à gauche et à droite : la bonne traduction et celle d'une autre phrase.
// Bon panneau : coche, « Suivant » à la place de l'autre panneau ; au toucher de « Suivant », on avance vers la
// fourche suivante (l'image ne change qu'à ce moment, demande du 2026-11-09). Mauvais panneau : on arrive devant un tronc qui barre le chemin
// (« Ce chemin est bloqué ! Essaie l'autre. »), où le chemin se sépare à nouveau : on choisit l'autre panneau.
// Phrases : celles du chapitre (traduites, sans « ... », avec leur son) ; s'il en a moins de 4, on complète avec
// celles des chapitres déjà vus (même langue, même année, plus haut dans la liste : décision de l'enseignant).
// Images : contenu/sentier/<vue>.jpg (Gemini, enseignant) si elles existent, sinon formes simples dessinées ici.
import { el, icone, muet, parametre } from './outils.js?v=4a69adff';
import { cheminSon, lireCatalogue, lireChapitre, chargerTexte, cheminChapitre, fichiersPresents } from './donnees.js?v=4a69adff';
import { creerLecteur, arreter } from './audio.js?v=4a69adff';
import { melanger, compteur, bravo } from './exercices.js?v=4a69adff';
import { avatar } from './avatar.js?v=4a69adff';

const MAX_FOURCHES = 4;
const MIN_FOURCHES = 3;
const DECOR = 'contenu/sentier/';

// ---------- Choix des phrases et des panneaux (testé dans tests/sentier.test.js) ----------

// Phrase jouable : une traduction, pas de « ... » (phrase à compléter), et son son (sauf version sans son).
export const jouable = (p, sansSon = muet) => Boolean(p.francais) && !/\.\.\.|…/.test(p.phrase + p.francais) && (p.son || sansSon);

// Mots « porteurs de sens » d'une traduction : sans accents ni petits mots, coupés à 5 lettres (« petite » = « petit »).
export function racines(texte) {
  return new Set(texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .split(/[^a-z]+/).filter((m) => m.length > 3).map((m) => m.slice(0, 5)));
}
// Part des mots partagés (0 : rien en commun, 1 : l'un contient tous les mots de l'autre).
export function ressemblance(a, b) {
  const ra = racines(a);
  const rb = racines(b);
  if (!ra.size || !rb.size) return 0;
  return [...ra].filter((m) => rb.has(m)).length / Math.min(ra.size, rb.size);
}

// Panneau piège : la traduction d'une autre phrase, au sens clairement différent (peu de mots en commun)
// et de longueur proche ; jamais deux fois le même dans une partie (`dejaPris`), si on peut l'éviter.
export function leurre(bonne, toutes, dejaPris = new Set(), hasard = Math.random) {
  const autres = [...new Set(toutes)].filter((t) => t.trim().toLowerCase() !== bonne.trim().toLowerCase());
  const proche = (t) => Math.min(t.length, bonne.length) / Math.max(t.length, bonne.length) >= 0.6;
  const different = (t) => ressemblance(t, bonne) < 0.5;
  const essais = [
    (t) => different(t) && proche(t) && !dejaPris.has(t),
    (t) => different(t) && !dejaPris.has(t),
    (t) => different(t),
  ];
  for (const ok of essais) {
    const c = autres.filter(ok);
    if (c.length) return c[Math.floor(hasard() * c.length)];
  }
  // Dernier recours : la moins ressemblante.
  return autres.sort((x, y) => ressemblance(x, bonne) - ressemblance(y, bonne))[0] || '';
}

// Mots du chapitre ([mots]) mis en forme de « phrase » d'une fourche (demande de l'enseignant du 2026-11-09).
export const enMots = (mots) => mots.map((m) => ({ ...m, phrase: m.mot, estMot: true }));

// Les fourches d'une partie (3 ou 4) : 2 phrases au plus (celles du chapitre d'abord, puis les empruntées),
// complétées par des mots du chapitre, puis par d'autres phrases s'il manque des mots ; dans le désordre.
// Le piège d'une phrase est une autre phrase, celui d'un mot un autre mot (longueur proche).
export function planSentier(propres, empruntees, mots = [], hasard = Math.random) {
  const bon = (l) => l.filter((p) => jouable(p));
  const toutes = [...melanger(bon(propres)), ...melanger(bon(empruntees))];
  const phrases = toutes.length >= 2 ? toutes : []; // une phrase seule n'aurait pas d'autre phrase pour piège
  const lesMots = melanger(bon(mots));
  const deux = phrases.slice(0, 2);
  const cibles = melanger([...deux, ...lesMots, ...phrases.slice(2)].slice(0, MAX_FOURCHES));
  const traductionsPhrases = phrases.map((p) => p.francais);
  const traductionsMots = lesMots.map((m) => m.francais);
  const pris = new Set();
  // Côté du bon panneau : autant à gauche qu'à droite (2 et 2 ; à 3 fourches, le dernier au hasard), dans le désordre.
  const cotes = melanger(cibles.length === 3 ? [true, false, hasard() < 0.5] : [true, false, true, false].slice(0, cibles.length));
  return cibles.map((p, k) => {
    const memes = p.estMot ? traductionsMots : traductionsPhrases;
    // Une seule phrase (ou un seul mot) : le piège vient de l'autre sorte.
    const piege = leurre(p.francais, memes.length > 1 ? memes : [...traductionsPhrases, ...traductionsMots], pris, hasard);
    pris.add(piege);
    const aGauche = cotes[k];
    return { phrase: p, panneaux: aGauche ? [p.francais, piege] : [piege, p.francais], bon: aGauche ? 0 : 1 };
  });
}

// Phrases des chapitres déjà vus (plus haut dans le catalogue, même langue, même année), lues une fois avant le menu
// (« possible » doit répondre tout de suite), et seulement si le chapitre a moins de 4 phrases jouables. Hors page (tests) : rien.
async function chargerEmprunts() {
  const langue = parametre('langue');
  const annee = parametre('annee');
  const ici = parametre('chapitre');
  if (!langue || !annee || !ici) return [];
  const lire = (chemin) => chargerTexte(chemin).catch(() => '');
  const [catalogue, texteIci] = await Promise.all([lire('contenu/catalogue.txt'), lire(`${cheminChapitre(langue, annee, ici)}chapitre.txt`)]);
  if (!texteIci || lireChapitre(texteIci).phrases.filter((p) => jouable(p, true)).length >= MAX_FOURCHES) return [];
  const chapitres = lireCatalogue(catalogue).chapitres.filter((c) => c.langue === langue && c.annee === annee);
  const rang = chapitres.find((c) => c.chapitre === ici)?.ordre;
  const avant = chapitres.filter((c) => c.chapitre !== ici && rang !== undefined && c.ordre < rang);
  const textes = await Promise.all(avant.map((c) => lire(`${cheminChapitre(langue, annee, c.chapitre)}chapitre.txt`)));
  const phrases = textes.flatMap((t, k) => (t ? lireChapitre(t).phrases : [])
    .map((p) => ({ ...p, dossier: cheminChapitre(langue, annee, avant[k].chapitre) })))
    .filter((p) => jouable(p, true));
  // Le son de chaque phrase empruntée : on demande seulement s'il existe (version sans son : inutile).
  const presents = muet ? new Set() : await fichiersPresents(phrases.map((p) => cheminSon(p)));
  return phrases.map((p) => ({ ...p, son: presents.has(cheminSon(p)) }));
}
const emprunts = typeof location !== 'undefined' ? await chargerEmprunts().catch(() => []) : [];

const nombrePossible = (contenu) => planSentier(contenu.phrases, emprunts, enMots(contenu.mots)).length;

// ---------- Dessins ----------

const NS = 'http://www.w3.org/2000/svg';
function svg(nom, attributs = {}, ...enfants) {
  const n = document.createElementNS(NS, nom);
  for (const [k, v] of Object.entries(attributs)) n.setAttribute(k, v);
  n.append(...enfants);
  return n;
}

// Pictogramme du menu (un poteau avec deux panneaux), ajouté au jeu d'icônes de la page.
function ajouterPictogramme() {
  const sprite = document.querySelector('svg.sprite');
  if (!sprite || sprite.querySelector('#sentier')) return;
  sprite.append(svg('symbol', { id: 'sentier', viewBox: '0 0 24 24' },
    svg('path', { d: 'M12 3v18M8 21h8' }),
    svg('path', { d: 'M12 5h6.5l2.5 2.5-2.5 2.5H12' }),
    svg('path', { d: 'M12 12H5.5L3 14.5 5.5 17H12' })));
}

// Coffre simple (centré en 0, 0) ; `ouvert` : couvercle levé et pièces d'or.
function coffre(ouvert) {
  return svg('g', {},
    ouvert ? svg('g', {}, ...[[-10, -14], [0, -18], [10, -14]].map(([cx, cy]) => svg('circle', { cx, cy, r: 6, fill: '#facc15', stroke: '#b45309', 'stroke-width': 1.5 }))) : '',
    svg('rect', { x: -20, y: -10, width: 40, height: 24, rx: 3, fill: '#b45309', stroke: '#78350f', 'stroke-width': 2 }),
    svg('rect', { x: -20, y: -3, width: 40, height: 5, fill: '#facc15' }),
    svg('path', { d: 'M-20 -10 Q0 -26 20 -10 Z', fill: '#d97706', stroke: '#78350f', 'stroke-width': 2, transform: ouvert ? 'rotate(-35 -20 -10) translate(0 -3)' : '' }),
    svg('rect', { x: -4, y: -6, width: 8, height: 10, rx: 1.5, fill: '#fde68a', stroke: '#78350f', 'stroke-width': 1.5 }));
}

// Formes provisoires (repère 300 × 200), en attendant les images de l'enseignant : ciel, prairie, chemin vu de face.
const TERRE = '#e2c99c';
const FORMES = {
  fourche: () => [svg('path', { d: 'M95 200 L140 120 L40 92 L58 86 L150 108 L242 86 L260 92 L160 120 L205 200 Z', fill: TERRE })],
  obstacle: () => [
    svg('path', { d: 'M95 200 L140 120 L60 104 L72 98 L143 108 L143 80 L157 80 L157 108 L228 98 L240 104 L160 120 L205 200 Z', fill: TERRE }),
    svg('rect', { x: 112, y: 70, width: 76, height: 16, rx: 8, fill: '#92400e', stroke: '#78350f', 'stroke-width': 2 }),
    svg('circle', { cx: 184, cy: 78, r: 6, fill: '#d6a46a', stroke: '#78350f', 'stroke-width': 2 })],
  coffre: (ouvert = false) => [
    svg('path', { d: 'M95 200 L140 120 L160 120 L205 200 Z', fill: TERRE }),
    svg('ellipse', { cx: 150, cy: 112, rx: 70, ry: 18, fill: '#bfe3a6' }),
    svg('g', { transform: 'translate(150 104) scale(1.6)' }, coffre(ouvert))],
};
FORMES['coffre-ouvert'] = () => FORMES.coffre(true);

function dessinProvisoire(vue) {
  return svg('svg', { viewBox: '0 0 300 200', class: 'sentier-image' },
    svg('rect', { width: 300, height: 200, fill: '#cfe8fb' }),
    svg('rect', { y: 82, width: 300, height: 118, fill: '#cdebb5' }),
    ...[[22, 76, 18], [58, 80, 12], [262, 74, 20], [236, 80, 11]].map(([cx, cy, r]) => svg('circle', { cx, cy, r, fill: '#86c46b' })),
    ...FORMES[vue]());
}

// Paysages : jusqu'à 4 (fourche.jpg, fourche-2.jpg…). Chaque fourche en tire un au hasard, jamais le même deux fois
// de suite ; le tronc (obstacle-2.jpg…) suit le paysage de la fourche, sinon obstacle.jpg. Un coffre (coffre-2.jpg et
// coffre-ouvert-2.jpg…) tiré au hasard par partie, parmi ceux qui ont leurs deux images.
const SUFFIXES = ['', '-2', '-3', '-4'];
const VUES = ['fourche', 'obstacle', 'coffre', 'coffre-ouvert'].flatMap((v) => SUFFIXES.map((s) => v + s));
const moinsAnimer = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const auHasard = (liste) => liste[Math.floor(Math.random() * liste.length)];

// La vue du chemin. `marcher(cote, vue)` : on avance vers la gauche (-1) ou la droite (1), et la vue suivante
// arrive (0,7 s en tout ; changement direct si l'appareil demande moins d'animations).
function chemin(images) {
  const boite = el('div', { class: 'sentier-vue', 'aria-hidden': 'true' });
  const paysages = SUFFIXES.filter((s) => images[`fourche${s}`]);
  const coffres = SUFFIXES.filter((s) => images[`coffre${s}`] && images[`coffre-ouvert${s}`]);
  const coffreChoisi = coffres.length ? auHasard(coffres) : '';
  let paysage = '';
  const creer = (demandee) => {
    let vue = demandee;
    if (vue === 'fourche' && paysages.length) {
      paysage = auHasard(paysages.length > 1 ? paysages.filter((s) => s !== paysage) : paysages);
      vue += paysage;
    } else if (vue === 'obstacle' && images[`obstacle${paysage}`]) vue += paysage;
    else if (vue.startsWith('coffre')) vue += coffreChoisi;
    // Coffre fermé : l'image du coffre ouvert se charge déjà, pour s'ouvrir sans attendre.
    if (vue === `coffre${coffreChoisi}` && images[`coffre-ouvert${coffreChoisi}`]) new Image().src = images[`coffre-ouvert${coffreChoisi}`];
    return images[vue] ? el('img', { class: 'sentier-image', src: images[vue], alt: '' }) : dessinProvisoire(demandee);
  };
  const montrer = (vue) => {
    const n = creer(vue);
    boite.replaceChildren(n);
    return n;
  };
  montrer('fourche');
  return {
    boite,
    async marcher(cote, vue) {
      const avant = boite.firstChild;
      if (moinsAnimer() || !avant.animate) { montrer(vue); return; }
      const apres = creer(vue); // l'image suivante se charge pendant qu'on avance
      // On avance en grossissant vers le côté choisi ; le paysage monte et descend deux fois, comme des pas.
      const pas = (k, haut) => ({ transform: `translate(${-cote * 5.5 * k}%, ${haut ? -1.5 : 0}%) scale(${1 + 0.15 * k})`, opacity: 1 - 0.25 * k });
      await avant.animate([pas(0, false), pas(1, true), pas(2, false), pas(3, true), pas(4, false)],
        { duration: 450, easing: 'ease-in' }).finished.catch(() => {});
      boite.replaceChildren(apres);
      // Devant l'obstacle, on s'arrête net : la vue recule d'un petit pas (0,35 s) ; sinon la vue arrive doucement.
      await apres.animate(vue === 'obstacle'
        ? [{ transform: 'scale(1.12)', opacity: 0 }, { transform: 'scale(.97)', opacity: 1, offset: 0.6 }, { transform: 'none', opacity: 1 }]
        : [{ transform: 'scale(.92)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: vue === 'obstacle' ? 350 : 250, easing: 'ease-out' }).finished.catch(() => {});
    },
    // Le coffre s'ouvre : fondu doux vers l'image du coffre ouvert, et une dizaine d'étoiles dorées montent du coffre.
    ouvrir() {
      const n = montrer('coffre-ouvert');
      if (moinsAnimer() || !n.animate) return;
      n.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 600, easing: 'ease-out' });
      for (let k = 0; k < 10; k += 1) {
        const e = el('span', { class: 'sentier-etoile' });
        boite.append(e);
        const x = (Math.random() - 0.5) * 140; // dérive à gauche ou à droite (en pixels)
        e.animate([{ transform: 'translate(-50%, 0) scale(.4)', opacity: 0 }, { opacity: 1, offset: 0.25 },
          { transform: `translate(calc(-50% + ${x}px), -${70 + Math.random() * 50}px) scale(1) rotate(${x}deg)`, opacity: 0 }],
        { duration: 1000, delay: 250 + k * 60, easing: 'ease-out', fill: 'backwards' }).finished.then(() => e.remove(), () => e.remove());
      }
    },
  };
}

// ---------- Le jeu ----------

function fourche(f, ctx, rang, total, vue, fin) {
  const { langue } = ctx;
  const p = f.phrase;
  const quoi = p.estMot ? 'le mot' : 'la phrase';
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone(muet ? 'oeil' : 'haut-parleur'),
    `${muet ? 'Lis' : 'Écoute'} ${quoi}, suis le bon chemin.`);
  // Avec le son : la phrase écrite reste cachée sous « Voir la phrase » (on comprend d'abord à l'oreille).
  const texte = el('p', { class: 'sentier-phrase', lang: langue }, p.phrase);
  const voir = el('details', { class: 'traduction' }, el('summary', {}, icone('oeil'), `Voir ${quoi}`), texte);
  const enonce = muet ? texte : el('div', { class: 'pile' }, creerLecteur(cheminSon(p, ctx.dossier), { nom: quoi }), voir);
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const message = el('div', { class: 'message-ex' }, retour);
  let prof = null; // un seul avatar, qui change de pose (cahier 7.8)
  const poser = (pose) => { if (prof) prof.pose(pose); else message.prepend(prof = avatar(pose)); };
  const suite = el('button', { type: 'button', class: 'action' }, rang === total ? 'Ouvrir le coffre' : 'Suivant', icone('droite'));
  const boutons = f.panneaux.map((t, k) => {
    const b = el('button', { type: 'button', class: `reponse panneau ${k ? 'droite' : 'gauche'}` },
      k ? '' : icone('gauche'), el('span', {}, t), k ? icone('droite') : '');
    b.juste = k === f.bon;
    b.cote = k ? 1 : -1;
    return b;
  });
  for (const b of boutons) {
    b.addEventListener('click', () => {
      b.disabled = true;
      b.classList.add(b.juste ? 'juste' : 'faux');
      b.prepend(el('span', { class: 'marque-ex' }, icone(b.juste ? 'coche' : 'croix')));
      if (!b.juste) {
        // On arrive devant le tronc ; le chemin s'y sépare à nouveau : l'autre panneau reste à toucher.
        vue.marcher(b.cote, 'obstacle');
        retour.replaceChildren(icone('bulle'), 'Ce chemin est bloqué ! Essaie l\'autre.');
        poser('reflechit');
        return;
      }
      for (const x of boutons) x.disabled = true;
      retour.replaceChildren(icone('sourire'), bravo());
      poser('content');
      cote = b.cote; // l'image ne change qu'au toucher de « Suivant » (demande du 2026-11-09)
      // « Suivant » prend la place de l'autre panneau, sous le doigt : sur téléphone, rien ne défile (choix A, 2026-11-09).
      boutons.find((x) => x !== b).remove();
      b.after(suite);
      if (!muet) {
        // La phrase écrite s'affiche dans le message (plus au-dessus de l'image, qui aurait été décalée).
        message.append(el('p', { class: 'fr sentier-phrase', lang: langue }, p.phrase));
        const son = creerLecteur(cheminSon(p, ctx.dossier), { nom: quoi });
        son.hidden = true;
        retour.after(son);
        son.jouer(); // juste après le toucher de l'enfant : permis (cahier 9)
      }
      suite.focus({ preventScroll: true }); // la page ne bouge pas (demande du 2026-11-09)
    });
  }
  let cote = 0;
  // « Suivant » : on marche du côté choisi jusqu'à la fourche suivante (ou au coffre), puis elle s'affiche.
  suite.addEventListener('click', async () => {
    suite.disabled = true;
    arreter();
    await vue.marcher(cote, rang === total ? 'coffre' : 'fourche');
    fin();
  });
  const zone = el('div', { class: 'exercice sentier' },
    el('div', { class: 'tete-ex' }, titre, compteur(rang, total)),
    el('div', { class: 'enonce' }, enonce),
    vue.boite,
    el('div', { class: 'reponses n2 panneaux' }, ...boutons),
    message);
  zone.titre = titre;
  return zone;
}

let styleCharge = false;
async function lancer(zone, contenu) {
  if (!styleCharge) {
    document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-sentier.css?v=4a69adff' }));
    styleCharge = true;
  }
  const plan = planSentier(contenu.phrases, emprunts, enMots(contenu.mots));
  const fichiers = VUES.map((v) => `${DECOR}${v}.jpg`);
  const presents = await fichiersPresents(fichiers);
  const vue = chemin(Object.fromEntries(VUES.map((v, k) => [v, presents.has(fichiers[k]) && fichiers[k]])));
  let i = 0;
  function suivante() {
    arreter();
    if (i === plan.length) return arrivee();
    i += 1;
    const q = fourche(plan[i - 1], contenu, i, plan.length, vue, suivante);
    zone.replaceChildren(q);
    if (i > 1) q.titre.focus({ preventScroll: true });
  }
  // Arrivée : le coffre s'ouvre doucement.
  function arrivee() {
    const titre = el('h2', { tabindex: '-1' }, icone('sourire'), 'C\'est fini, bravo !');
    const encore = el('button', { type: 'button', class: 'action' }, icone('tourner'), 'Recommencer');
    encore.addEventListener('click', () => lancer(zone, contenu));
    zone.replaceChildren(el('div', { class: 'bilan sentier' },
      el('div', { class: 'tete-bilan' }, avatar('bravo'), titre), vue.boite, el('p', {}, 'Le coffre est ouvert !'), encore));
    vue.ouvrir();
    titre.focus({ preventScroll: true });
  }
  suivante();
}

export default {
  id: 'sentier',
  nom: 'Le sentier des phrases',
  icone: 'sentier',
  // Au moins 3 phrases jouables (traduites, sans « ... », avec leur son), chapitres déjà vus compris.
  possible: (contenu) => {
    if (typeof document !== 'undefined') ajouterPictogramme();
    return nombrePossible(contenu) >= MIN_FOURCHES;
  },
  lancer,
};
