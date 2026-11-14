// « Hoe laat is het? » (v1.77, demande de l'enseignant du 2026-11-14) : l'horloge à aiguilles dessinée par le site
// et ses trois exercices de « Je m'entraîne » (section [heures] du chapitre) : lire l'horloge, écouter et choisir
// l'horloge, placer les aiguilles. Les sons sont collés : het-is + morceau des minutes + heure (+ uur-pile).
import { el, icone, muet } from './outils.js?v=59fdf551';
import { creerLecteur } from './audio.js?v=59fdf551';
import { cheminSon } from './donnees.js?v=59fdf551';
import { avatar } from './avatar.js?v=59fdf551';
import { melanger, bilanEntraine, serieARepasser, compteur, bravo } from './exercices.js?v=59fdf551';

// ---------- Logique (testée dans tests/horloge.test.js) ----------

// Minutes -> morceau dit, et +1 quand l'heure dite est la suivante (8 h 20 = tien voor half negen).
export const MINUTES = [[0, 'uur-pile', 0], [5, 'vijf-over', 0], [10, 'tien-over', 0], [15, 'kwart-over', 0],
  [20, 'tien-voor-half', 1], [25, 'vijf-voor-half', 1], [30, 'half', 1], [35, 'vijf-over-half', 1],
  [40, 'tien-over-half', 1], [45, 'kwart-voor', 1], [50, 'tien-voor', 1], [55, 'vijf-voor', 1]];
const FACILES = [0, 15, 30, 45]; // pile, kwart over, half, kwart voor : les premières questions
const NOMBRE = 10;
const decaler = (h, k) => ((((h - 1 + k) % 12) + 12) % 12) + 1; // après 12 vient 1
const cle = (t) => (t.h % 12) * 60 + t.m;
const ligne = (m) => MINUTES.find((x) => x[0] === m);

// Les minutes utilisables : celles dont le morceau est écrit (et a son son, si `sons` est donné).
// Il faut aussi « het-is » et les 12 heures ; sinon, rien.
export function minutesPossibles(textes, sons = null) {
  const a = (id) => textes.has(id) && (!sons || sons.has(id));
  if (!a('het-is') || ![...Array(12)].every((_, k) => a(String(k + 1)))) return [];
  return MINUTES.filter(([, morceau]) => a(morceau)).map(([m]) => m);
}

// « Het is tien voor half negen. » ; l'heure pile : « Het is acht uur. »
export function ecrire({ h, m }, textes) {
  const [, morceau, plus] = ligne(m);
  const heure = textes.get(String(decaler(h, plus)));
  return m === 0 ? `${textes.get('het-is')} ${heure} ${textes.get('uur-pile')}.` : `${textes.get('het-is')} ${textes.get(morceau)} ${heure}.`;
}

// Les sons à coller, dans l'ordre.
export function idsSons({ h, m }) {
  const [, morceau, plus] = ligne(m);
  return m === 0 ? ['het-is', String(h), 'uur-pile'] : ['het-is', morceau, String(decaler(h, plus))];
}

// Les heures d'une série : d'abord les faciles (pile, kwart, half), puis toutes ; jamais deux fois la même.
export function planHeures(minutes, nombre = NOMBRE, hasard = Math.random) {
  const faciles = minutes.filter((m) => FACILES.includes(m));
  const vues = new Set();
  const plan = [];
  for (let k = 0; plan.length < nombre && k < 1000; k++) {
    const parmi = plan.length < Math.min(4, nombre) && faciles.length ? faciles : minutes;
    const t = { h: 1 + Math.floor(hasard() * 12), m: parmi[Math.floor(hasard() * parmi.length)] };
    if (!vues.has(cle(t))) { vues.add(cle(t)); plan.push(t); }
  }
  return plan;
}

// Deux fausses heures qui piègent (demande de l'enseignant) :
// - « half » : une heure d'écart. Pour lire l'horloge de 8 h 30, « half acht » (l'heure que montre la petite aiguille) ;
//   pour écouter « half negen », l'horloge de 9 h 30.
// - « over » et « voor » échangés (kwart over acht / kwart voor acht) ; l'heure pile et « half » s'échangent entre eux.
// Puis, s'il en manque, des heures au hasard.
export function fausses(t, mode, minutes, hasard = Math.random) {
  const [, morceau, plus] = ligne(t.m);
  const dite = decaler(t.h, plus);
  const echange = { 'uur-pile': 'half', half: 'uur-pile' }[morceau] || (/over/.test(morceau) ? morceau.replace('over', 'voor') : morceau.replace('voor', 'over'));
  const autre = MINUTES.find((x) => x[1] === echange);
  const pieges = [
    { h: decaler(t.h, plus && mode === 'lire' ? -1 : 1), m: t.m },
    autre && minutes.includes(autre[0]) ? { h: decaler(dite, -autre[2]), m: autre[0] } : null,
  ];
  const sortie = [];
  const vues = new Set([cle(t)]);
  const ajouter = (x) => { if (x && sortie.length < 2 && !vues.has(cle(x))) { vues.add(cle(x)); sortie.push(x); } };
  pieges.forEach(ajouter);
  for (let k = 0; sortie.length < 2 && k < 1000; k++) ajouter({ h: 1 + Math.floor(hasard() * 12), m: minutes[Math.floor(hasard() * minutes.length)] });
  return sortie;
}

// ---------- Dessin ----------

// Horloge à aiguilles : grands chiffres ; petite aiguille courte et épaisse, grande aiguille longue et fine
// (différentes par la forme, lisibles en noir et blanc). `t` en minutes depuis 12 h (0 à 719).
const NS = 'http://www.w3.org/2000/svg';
const svg = (nom, attributs = {}) => {
  const e = document.createElementNS(NS, nom);
  for (const [k, v] of Object.entries(attributs)) e.setAttribute(k, v);
  return e;
};
export function dessinHorloge(t, nom = 'une horloge') {
  const d = svg('svg', { viewBox: '-110 -110 220 220', class: 'horloge', role: 'img', 'aria-label': nom });
  d.append(svg('circle', { r: 104, class: 'cadran' }));
  for (let k = 0; k < 60; k++) {
    const a = (k * Math.PI) / 30;
    const r1 = k % 5 ? 93 : 86;
    d.append(svg('line', { x1: Math.sin(a) * r1, y1: -Math.cos(a) * r1, x2: Math.sin(a) * 98, y2: -Math.cos(a) * 98, class: k % 5 ? 'trait' : 'trait gros' }));
  }
  for (let k = 1; k <= 12; k++) {
    const a = (k * Math.PI) / 6;
    const n = svg('text', { x: Math.sin(a) * 70, y: -Math.cos(a) * 70 + 1, class: 'chiffre' });
    n.textContent = k;
    d.append(n);
  }
  const petite = svg('line', { x1: 0, y1: 10, x2: 0, y2: -46, class: 'petite' });
  const grande = svg('line', { x1: 0, y1: 14, x2: 0, y2: -84, class: 'grande' });
  d.append(petite, grande, svg('circle', { r: 8, class: 'axe' }));
  d.regler = (x) => {
    const v = ((x % 720) + 720) % 720;
    petite.setAttribute('transform', `rotate(${v / 2})`);
    grande.setAttribute('transform', `rotate(${(v % 60) * 6})`);
  };
  d.regler(t);
  return d;
}
const minutesDe = (t) => cle(t);

// ---------- Exercices ----------

export const MODES = {
  lire: ['Lis l\'horloge', 'oeil', 'Lis l\'horloge et choisis la bonne phrase.'],
  ecoute: ['Écoute et choisis', 'haut-parleur', 'Écoute et choisis la bonne horloge.'],
  aiguilles: ['Place les aiguilles', 'horloge', 'Place les aiguilles sur l\'horloge.'],
};

// Ce que permet le chapitre : `textes` (id -> texte de [heures]), `sons` (ids dont le son existe).
export function preparerHeures(heures, presents, dossier) {
  const textes = new Map(heures.map((x) => [x.id, x.texte]));
  const sons = new Set(heures.filter((x) => presents.has(cheminSon(x, dossier))).map((x) => x.id));
  const minutes = minutesPossibles(textes);
  const minutesSon = muet ? [] : minutesPossibles(textes, sons);
  const modes = minutes.length ? ['lire', minutesSon.length && 'ecoute', 'aiguilles'].filter(Boolean) : [];
  return { textes, sons, minutes, minutesSon, modes };
}

// Choix du jeu de l'horloge (dans l'adresse : heure=lire, ecoute ou aiguilles).
export function choixMode(modes, actif) {
  const lien = (valeur) => {
    const params = new URLSearchParams(location.search);
    params.set('heure', valeur);
    const [nom, ic] = MODES[valeur];
    return el('a', { class: 'seg', href: `?${params}`, 'aria-current': valeur === actif && 'page' }, icone(ic), nom);
  };
  return el('nav', { class: `segments sens n${modes.length}`, 'aria-label': 'Choix du jeu de l\'horloge' }, ...modes.map(lien));
}

// Le son collé d'une heure (null s'il manque un morceau, ou dans la version sans son).
function sonHeure(t, h, nom) {
  const ids = idsSons(t);
  if (muet || !ids.every((id) => h.sons.has(id))) return null;
  return creerLecteur(ids.map((id) => cheminSon({ id }, h.dossier)), { nom, avecBarre: false });
}

const marquer = (b, juste) => { b.classList.add(juste ? 'juste' : 'faux'); b.prepend(el('span', { class: 'marque-ex' }, icone(juste ? 'coche' : 'croix'))); };

// Squelette commun : consigne, compteur, message avec l'avatar (seulement après une réponse), « Suivant ».
function cadre(mode, rang, total, fin) {
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone(MODES[mode][1]), MODES[mode][2]);
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true;
  const message = el('div', { class: 'message-ex' }, av, retour);
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === total ? 'Terminer' : 'Suivant', icone('droite'));
  const etat = { premierCoup: true };
  suite.addEventListener('click', () => fin(etat.premierCoup));
  const dire = (ic, texte, pose) => { retour.replaceChildren(icone(ic), texte); av.pose(pose); av.hidden = false; };
  const finir = (lecteur) => {
    lecteur?.jouer(); // après un toucher : permis sur iPhone
    if (!etat.premierCoup) suite.firstChild.textContent = 'Suivant'; // elle repassera : pas encore « Terminer »
    suite.hidden = false;
    suite.focus();
  };
  const tete = el('div', { class: 'tete-ex' }, titre, compteur(rang, total));
  return { titre, tete, message, suite, etat, dire, finir };
}

// Lis l'horloge (3 phrases) ou Écoute et choisis (3 horloges) : même règle que les exercices (seconde chance).
function questionChoix(q, h, rang, total, fin) {
  const c = cadre(q.mode, rang, total, fin);
  const ecoute = q.mode === 'ecoute';
  const texte = ecrire(q.t, h.textes);
  const lecteur = sonHeure(q.t, h, ecoute ? 'l\'heure à écouter' : texte);
  const ecrit = el('p', { class: 'phrase', lang: 'nl', hidden: '' }, texte); // écrite après la réponse (écoute)
  const boutons = melanger([q.t, ...q.faux]).map((x) => {
    const b = el('button', { type: 'button', class: 'reponse' }, ecoute ? dessinHorloge(minutesDe(x)) : el('span', { class: 'mot', lang: 'nl' }, ecrire(x, h.textes)));
    b.juste = x === q.t;
    return b;
  });
  let essais = 0;
  const terminer = () => {
    for (const b of boutons) b.disabled = true;
    ecrit.hidden = false;
    if (!ecoute && lecteur) c.message.after(lecteur);
    c.finir(lecteur);
  };
  for (const b of boutons) {
    b.addEventListener('click', () => {
      marquer(b, b.juste);
      b.disabled = true;
      if (b.juste) { c.dire('sourire', bravo(), 'content'); return terminer(); }
      essais += 1;
      c.etat.premierCoup = false;
      if (essais < 2) { boutons.find((x) => !x.disabled)?.focus(); return c.dire('tourner', 'Essaie encore !', 'reflechit'); }
      const bonne = boutons.find((x) => x.juste);
      marquer(bonne, true);
      bonne.classList.add('montree');
      c.dire('bulle', 'Voici la bonne réponse.', 'explique');
      terminer();
    });
  }
  const enonce = ecoute ? el('div', { class: 'pile' }, lecteur || '', ecrit) : dessinHorloge(minutesDe(q.t), 'l\'horloge à lire');
  const zone = el('div', { class: 'exercice ex-horloge' }, c.tete, el('div', { class: 'enonce' }, enonce),
    el('div', { class: `reponses n3${ecoute ? ' visuels horloges' : ''}` }, ...boutons), c.message, c.suite);
  zone.titre = c.titre;
  zone.suite = c.suite;
  return zone;
}

// Place les aiguilles : sans glisser (exclu, cahier §3), quatre grands boutons ; la petite aiguille suit
// la grande comme sur une vraie horloge. Départ à midi (à 6 h si la réponse est midi).
function questionAiguilles(q, h, rang, total, fin) {
  const c = cadre('aiguilles', rang, total, fin);
  const texte = ecrire(q.t, h.textes);
  const lecteur = sonHeure(q.t, h, texte);
  const cible = minutesDe(q.t);
  let t = cible === 0 ? 360 : 0;
  const horloge = dessinHorloge(t, 'l\'horloge à régler');
  const bouton = (ic, nom, pas) => {
    const b = el('button', { type: 'button', class: 'reponse bouton-aiguille', 'aria-label': nom }, icone(ic));
    b.addEventListener('click', () => { t = (t + pas + 720) % 720; horloge.regler(t); });
    return b;
  };
  const reglages = [
    ['Grande aiguille', bouton('gauche', 'Grande aiguille : recule de 5 minutes', -5), bouton('droite', 'Grande aiguille : avance de 5 minutes', 5)],
    ['Petite aiguille', bouton('gauche', 'Petite aiguille : recule d\'une heure', -60), bouton('droite', 'Petite aiguille : avance d\'une heure', 60)],
  ];
  const valider = el('button', { type: 'button', class: 'action' }, icone('coche'), 'C\'est l\'heure !');
  const tous = [...reglages.flatMap(([, a, b]) => [a, b]), valider];
  let essais = 0;
  valider.addEventListener('click', () => {
    if (t === cible) {
      c.dire('sourire', bravo(), 'content');
    } else {
      essais += 1;
      c.etat.premierCoup = false;
      if (essais < 2) return c.dire('tourner', 'Essaie encore !', 'reflechit');
      t = cible;
      horloge.regler(t);
      c.dire('bulle', 'Voici la bonne réponse.', 'explique');
    }
    for (const b of tous) b.disabled = true;
    valider.hidden = true;
    c.finir(null);
  });
  const zone = el('div', { class: 'exercice ex-horloge' }, c.tete,
    el('div', { class: 'enonce pile' }, el('p', { class: 'phrase', lang: 'nl' }, texte), lecteur || '', horloge),
    el('div', { class: 'reglages' }, ...reglages.map(([nom, a, b]) => el('div', { class: 'reglage' }, a, el('span', {}, nom), b))),
    valider, c.message, c.suite);
  zone.titre = c.titre;
  zone.suite = c.suite;
  return zone;
}

// 10 heures, les ratées repassent (comme les autres exercices), puis le bilan de « Je m'entraîne ».
export function lancerHeures(zone, h, mode) {
  const minutes = mode === 'ecoute' ? h.minutesSon : h.minutes;
  const plan = planHeures(minutes).map((t) => ({ mode, t, faux: fausses(t, mode, minutes) }));
  serieARepasser(zone, plan,
    (q, rang, total, fin) => (mode === 'aiguilles' ? questionAiguilles : questionChoix)(q, h, rang, total, fin),
    () => bilanEntraine(zone, () => lancerHeures(zone, h, mode)));
}
