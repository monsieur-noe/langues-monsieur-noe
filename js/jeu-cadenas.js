// Jeu « Le cadenas à images » (cahier 7.9) : on écoute 3 mots (version sans son : on les lit), puis on règle
// les 3 roues du cadenas sur leurs images, dans l'ordre, et on touche « Ouvrir ». 5 cadenas par partie.
// Rien ne sonne seul : les 3 mots partent au toucher de « Écouter » (un seul lecteur, les sons à la suite).
import { el, icone, muet } from './outils.js?v=4a69adff';
import { cheminSon } from './donnees.js?v=4a69adff';
import { creerLecteur, arreter } from './audio.js?v=4a69adff';
import { visuel } from './cartes.js?v=4a69adff';
import { melanger, bilanEntraine, bravo, fete } from './exercices.js?v=4a69adff';
import { avatar } from './avatar.js?v=4a69adff';
import { motsDuLoto } from './jeu-loto.js?v=4a69adff'; // mêmes mots que le loto : indice visuel, son, indices tous différents

const NOMBRE = 5; // cadenas par partie
const TAILLE = 6; // images par roue : les 3 mots du code et 3 leurres

// `nombre` codes de 3 mots différents ; un mot ne revient qu'après que tous les autres ont servi.
// Chaque roue : les 3 mots du code et 3 leurres, dans un ordre fixe ; elle ne commence jamais sur la bonne image.
export function planCadenas(pool, nombre = NOMBRE, hasard = Math.random) {
  const paquet = [];
  return Array.from({ length: nombre }, () => {
    const code = [];
    while (code.length < 3) {
      if (!paquet.some((m) => !code.includes(m))) paquet.push(...melanger(pool));
      code.push(paquet.splice(paquet.findIndex((m) => !code.includes(m)), 1)[0]);
    }
    const roues = code.map(() => melanger([...code, ...melanger(pool.filter((m) => !code.includes(m))).slice(0, TAILLE - 3)]));
    const depart = roues.map((r, i) => (r.indexOf(code[i]) + 1 + Math.floor(hasard() * (TAILLE - 1))) % TAILLE);
    return { code, roues, depart };
  });
}

// Pictogrammes du jeu, ajoutés une fois au jeu d'icônes de la page : le cadenas (menu) et la flèche vers le haut.
const NS = 'http://www.w3.org/2000/svg';
function svg(balise, attributs) {
  const e = document.createElementNS(NS, balise);
  for (const [k, v] of Object.entries(attributs)) e.setAttribute(k, v);
  return e;
}
function ajouterPictogrammes() {
  const sprite = document.querySelector('svg.sprite');
  if (!sprite || sprite.querySelector('#cadenas')) return;
  const cadenas = svg('symbol', { id: 'cadenas', viewBox: '0 0 24 24' });
  cadenas.append(svg('path', { d: 'M7.5 10.5V7.5a4.5 4.5 0 0 1 9 0v3' }), svg('rect', { x: 4.5, y: 10.5, width: 15, height: 10.5, rx: 2.5 }), svg('path', { d: 'M12 14.5v2.5' }));
  const haut = svg('symbol', { id: 'haut', viewBox: '0 0 24 24' });
  haut.append(svg('path', { d: 'M6 15l6-6 6 6' }));
  const ouvert = svg('symbol', { id: 'cadenas-ouvert', viewBox: '0 0 24 24' });
  ouvert.append(svg('path', { d: 'M7.5 10.5V5.5a4.5 4.5 0 0 1 9 0' }), svg('rect', { x: 4.5, y: 10.5, width: 15, height: 10.5, rx: 2.5 }), svg('path', { d: 'M12 14.5v2.5' }));
  sprite.append(cadenas, haut, ouvert);
}

// Dessins de l'enseignant (Gemini, 2026-11-09), allégés par Claude : 400 × 400, JPG ; originaux hors du dépôt (cadenas-originaux/).
const DOSSIER = 'contenu/cadenas/';
const SURPRISES = [['couronne', 'Une couronne'], ['medaille', 'Une médaille'], ['trophee', 'Un trophée'],
  ['pieces', 'Des pièces d\'or'], ['pierre', 'Une pierre précieuse'], ['cle-magique', 'Une clé magique']];

// Les 5 cadenas reliés par une chaîne au coffre : ceux déjà ouverts, celui en cours, puis le coffre.
function chaine(ouverts) {
  const maillons = Array.from({ length: NOMBRE }, (_, k) => el('li', { class: k < ouverts ? 'ouvert' : k === ouverts ? 'actuel' : '' },
    icone(k < ouverts ? 'cadenas-ouvert' : 'cadenas'), k < ouverts ? el('span', { class: 'marque-ex' }, icone('coche')) : ''));
  const coffre = el('li', { class: 'coffre-chaine' }, el('img', { src: `${DOSSIER}coffre-ferme.jpg`, alt: '' }));
  return el('ol', { class: 'chaine', 'aria-label': ouverts < NOMBRE ? `Cadenas ${ouverts + 1} sur ${NOMBRE}` : 'Tous les cadenas sont ouverts' }, ...maillons, coffre);
}
if (typeof document !== 'undefined') {
  ajouterPictogrammes();
  if (!document.querySelector('link[href*="jeu-cadenas.css"]')) {
    document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-cadenas.css?v=4a69adff' }));
  }
}

// L'image d'une roue : le texte de remplacement donne le français, jamais le mot à trouver.
function image(m, langue) {
  const v = visuel(m, m.ind, langue);
  if (v.tagName === 'IMG') { v.alt = m.francais || 'Dessin'; v.removeAttribute('lang'); v.loading = 'eager'; }
  if (v.classList.contains('carre')) { v.setAttribute('aria-label', m.francais || 'Couleur'); v.removeAttribute('lang'); }
  return v;
}

// L'anse du cadenas (dessin de Claude, validé par l'enseignant le 2026-11-08) : elle se soulève à l'ouverture.
function anse() {
  const s = svg('svg', { class: 'anse', viewBox: '0 0 160 80', 'aria-hidden': 'true' });
  s.append(svg('path', { class: 'anse-metal', d: 'M40 84V60a40 40 0 0 1 80 0v24' }), svg('path', { class: 'anse-reflet', d: 'M36 82V60a40 40 0 0 1 40-40' }));
  return s;
}

let motsCaches = false; // version sans son : « Cacher les mots », gardé le temps de la partie (rien n'est enregistré)

function cadenas(c, ctx, rang, fin) {
  const { langue, dossier } = ctx;
  let essais = 0;
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone(muet ? 'oeil' : 'cle'), muet ? 'Lis les 3 mots. Ouvre le cadenas.' : 'Ouvre le cadenas avec les 3 mots.');
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une réponse
  const message = el('div', { class: 'message-ex' }, av, retour);
  const ouvrir = el('button', { type: 'button', class: 'action', disabled: !muet && '' }, icone('cle'), 'Ouvrir');
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === NOMBRE ? 'Terminer' : 'Suivant', icone('droite'));
  const dire = (ic, txt, pose) => { retour.replaceChildren(icone(ic), txt); av.pose(pose); };

  // Les 3 mots : un seul lecteur qui les dit à la suite (version muette : écrits, dans l'ordre).
  let ecoute;
  let lecteur = { jouer: () => {} };
  if (muet) {
    const mots = el('ol', { class: 'code-muet', lang: langue, hidden: motsCaches && '' }, ...c.code.map((m) => el('li', {}, m.mot)));
    const cacher = el('button', { type: 'button', class: 'action secondaire cacher-mots' });
    const maj = () => { mots.hidden = motsCaches; cacher.replaceChildren(icone('oeil'), motsCaches ? 'Montrer les mots' : 'Cacher les mots'); };
    cacher.addEventListener('click', () => { motsCaches = !motsCaches; maj(); });
    maj();
    ecoute = el('div', { class: 'ecoute-cadenas' }, mots, cacher);
  } else {
    lecteur = creerLecteur(c.code.map((m) => cheminSon(m, dossier)), { nom: 'les 3 mots' });
    ecoute = el('div', { class: 'ecoute-cadenas ecoute-loto' }, lecteur);
  }

  const roues = c.roues.map((images, i) => {
    let pos = c.depart[i];
    const fenetre = el('div', { class: 'fenetre', 'aria-live': 'polite' });
    const marque = el('span', { class: 'marque-ex', hidden: '' });
    const fleche = (sens, nom) => {
      const b = el('button', { type: 'button', class: `fleche-roue ${nom}`, disabled: !muet && '', 'aria-label': `Roue ${i + 1} : image ${nom === 'monter' ? 'précédente' : 'suivante'}` }, icone('haut'));
      b.addEventListener('click', () => { pos = (pos + sens + TAILLE) % TAILLE; montrer(sens); });
      return b;
    };
    const boutons = [fleche(-1, 'monter'), fleche(1, 'descendre')];
    const roue = el('div', { class: 'roue', role: 'group', 'aria-label': `Roue ${i + 1}` }, boutons[0], fenetre, boutons[1], marque);
    // `sens` : la nouvelle image glisse depuis le haut (-1) ou le bas (1), comme une vraie roue (CSS).
    function montrer(sens = 0) {
      roue.classList.remove('faux');
      fenetre.dataset.sens = sens;
      marque.hidden = true;
      // Après deux essais, la bonne image a un cadre épais quand elle passe dans la fenêtre (jamais clignotant).
      fenetre.classList.toggle('aide', essais >= 2 && images[pos] === c.code[i]);
      fenetre.replaceChildren(image(images[pos], langue));
    }
    montrer();
    roue.ouvrir = (oui) => { if (!roue.classList.contains('juste')) for (const b of boutons) b.disabled = !oui; };
    roue.juste = () => images[pos] === c.code[i];
    roue.marquer = (bon) => {
      void roue.offsetWidth; // la classe vient d'être retirée par montrer() : le petit « non » rejoue à chaque essai
      roue.classList.add(bon ? 'juste' : 'faux');
      marque.replaceChildren(icone(bon ? 'coche' : 'croix'));
      marque.hidden = false;
      if (!bon) return;
      for (const b of boutons) b.disabled = true; // une roue juste se verrouille
      fenetre.classList.remove('aide');
    };
    roue.montrer = montrer;
    return roue;
  });

  // Les roues et « Ouvrir » s'ouvrent à la première écoute : on règle ce qu'on a entendu, pas au hasard.
  if (!muet) lecteur.addEventListener('click', () => { if (suite.hidden) { for (const r of roues) r.ouvrir(true); ouvrir.disabled = false; } });

  const boite = el('div', { class: 'cadenas' }, anse(), el('div', { class: 'corps' }, ...roues));

  ouvrir.addEventListener('click', () => {
    const aVerifier = roues.filter((r) => !r.classList.contains('juste'));
    for (const r of aVerifier) if (r.juste()) r.marquer(true);
    if (aVerifier.every((r) => r.juste())) {
      boite.classList.add('ouvert');
      ouvrir.hidden = true;
      dire('sourire', bravo(), 'content');
      lecteur.jouer(); // les 3 mots redits, juste après le toucher sur « Ouvrir »
      suite.hidden = false;
      suite.focus();
      return;
    }
    essais += 1;
    // La croix reste jusqu'au prochain changement de la roue (montrer() d'abord : cadre d'aide au 2e essai).
    for (const r of aVerifier) if (!r.juste()) { r.montrer(); r.marquer(false); }
    dire('tourner', 'Essaie encore !', 'reflechit');
  });
  suite.addEventListener('click', fin);

  const zone = el('div', { class: 'exercice jeu-cadenas' },
    chaine(rang - 1), titre,
    ecoute, boite, ouvrir, message, suite);
  zone.titre = titre;
  return zone;
}

// Le coffre (demande de l'enseignant du 2026-11-09) : fermé, puis ouvert au toucher ; dedans, un objet au hasard
// et « Ton trésor de mots » (les mots de la partie, à réécouter). Rien n'est gardé : la partie suivante repart d'un coffre fermé.
function coffre(zone, contenu, mots) {
  const { langue, dossier } = contenu;
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('etoile'), 'Tous les cadenas sont ouverts !');
  const ouvrir = el('button', { type: 'button', class: 'action' }, icone('cle'), 'Ouvre le coffre !');
  zone.replaceChildren(el('div', { class: 'exercice jeu-cadenas' }, chaine(NOMBRE), titre,
    el('img', { class: 'coffre-grand', src: `${DOSSIER}coffre-ferme.jpg`, alt: 'Le coffre fermé' }), ouvrir));
  titre.focus();
  ouvrir.addEventListener('click', () => {
    const [nom, texte] = SURPRISES[Math.floor(Math.random() * SURPRISES.length)];
    // Les mots arrivent l'un après l'autre, en 0,5 s pour tous (CSS : --rang).
    const tresor = mots.map((m) => el('li', {}, image(m, langue), el('span', { class: 'mot', lang: langue }, m.mot),
      m.son ? creerLecteur(cheminSon(m, dossier), { nom: m.mot, avecBarre: false, lent: false }) : ''));
    tresor.forEach((li, k) => li.style.setProperty('--rang', Math.min(k, 12)));
    bilanEntraine(zone, () => lancer(zone, contenu), 'bravo',
      el('p', {}, 'Tu as ouvert le coffre !'),
      el('div', { class: 'coffre-ouvert' },
        el('img', { class: 'surprise', src: `${DOSSIER}${nom}.jpg`, alt: texte }),
        el('img', { class: 'coffre-grand', src: `${DOSSIER}coffre-ouvert.jpg`, alt: 'Le coffre ouvert' })),
      el('h3', {}, 'Ton trésor de mots'),
      el('ul', { class: 'tresor-mots' }, ...tresor));
    fete(zone.querySelector('.bilan'));
  });
}

function lancer(zone, contenu) {
  const plan = planCadenas(motsDuLoto(contenu.mots));
  motsCaches = false;
  let i = 0;
  function suivant() {
    arreter();
    if (i === plan.length) return coffre(zone, contenu, [...new Set(plan.flatMap((c) => c.code))]);
    i += 1;
    const c = cadenas(plan[i - 1], contenu, i, suivant);
    zone.replaceChildren(c);
    if (i > 1) c.titre.focus();
  }
  suivant();
}

export default {
  id: 'cadenas',
  nom: 'Le cadenas à images',
  icone: 'cadenas',
  // Au moins 6 mots avec un indice visuel (dessin, couleur, chiffre) et un son (version muette : le mot écrit).
  possible: (contenu) => motsDuLoto(contenu.mots).length >= TAILLE,
  lancer,
};
