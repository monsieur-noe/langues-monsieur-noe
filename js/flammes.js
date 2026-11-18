// Flammes de régularité (v1.88, demande de l'enseignant du 2026-11-18) : terminer « Je vérifie » ou un jeu allume
// la flamme du jour. Samedi et dimanche peuvent en allumer une, mais ne cassent jamais la série. Un jour de semaine
// manqué se rattrape jusqu'au jour de semaine suivant compris, en finissant deux chapitres différents le même jour.
// Seule mémoire du site (cahier §2 et §10) : gardée sur l'appareil, jamais envoyée. Navigateur qui refuse : rien ne s'affiche.
import { el, icone, parametre } from './outils.js?v=3ee29c47';
import { fete } from './exercices.js?v=3ee29c47'; // pluie d'étoiles des paliers

const CLE = 'flammes';
const JOURS = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];

// Paliers (v1.89, choisis par l'enseignant le 2026-11-18) : la flamme change de couleur (classe CSS `p<n>`),
// une fête le jour où on l'atteint, un objectif à l'accueil. Après 365 jours, la flamme du soleil reste.
export const PALIERS = [
  { n: 1, fete: '', but: '' },
  { n: 3, fete: 'Ta flamme grandit !', but: 'une flamme plus grande' },
  { n: 5, fete: 'Une semaine d\'école !', but: 'la flamme rouge' },
  { n: 10, fete: 'La flamme bleue !', but: 'la flamme bleue' },
  { n: 20, fete: 'La flamme magique !', but: 'la flamme magique' },
  { n: 30, fete: 'La flamme d\'or !', but: 'la flamme d\'or' },
  { n: 50, fete: 'La flamme de jade !', but: 'la flamme de jade' },
  { n: 100, fete: 'La flamme légendaire !', but: 'la flamme légendaire' },
  { n: 200, fete: 'La flamme arc-en-ciel !', but: 'la flamme arc-en-ciel' },
  { n: 300, fete: 'La flamme étoilée !', but: 'la flamme étoilée' },
  { n: 365, fete: 'Un an de flammes !', but: 'la flamme du soleil' },
];
export const palier = (n) => PALIERS.findLast((p) => p.n <= Math.max(n, 1));
export const prochain = (n) => PALIERS.find((p) => p.n > n);
// Palier atteint en passant de `avant` à `apres` jours (un rattrapage peut en gagner deux d'un coup).
export const franchi = (avant, apres) => PALIERS.findLast((p) => p.n > 1 && p.n > avant && p.n <= apres) || null;

// Dates « 2026-11-18 » à l'heure locale : elles se comparent comme du texte.
export const jour = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const date = (j) => { const [a, m, d] = j.split('-').map(Number); return new Date(a, m - 1, d); };
const decaler = (j, n) => { const d = date(j); d.setDate(d.getDate() + n); return jour(d); };
const enSemaine = (j) => date(j).getDay() % 6 !== 0; // dimanche 0, samedi 6
function prochainJourDeSemaine(j) {
  let s = decaler(j, 1);
  while (!enSemaine(s)) s = decaler(s, 1);
  return s;
}

// Série vue le jour `auj` : flammes depuis la dernière cassure, jour manqué encore rattrapable, plus ancienne flamme comptée.
// Aujourd'hui pas encore allumé n'est pas un manque : la journée n'est pas finie.
export function serie(jours, auj) {
  const allumes = new Set(jours);
  const plusAncien = jours.reduce((a, b) => (a < b ? a : b), auj);
  let n = 0, avant = 0, aSauver = null, debut = auj;
  for (let j = allumes.has(auj) ? auj : decaler(auj, -1); j >= plusAncien; j = decaler(j, -1)) {
    if (allumes.has(j)) { n++; debut = j; if (aSauver) avant++; }
    else if (enSemaine(j)) {
      if (aSauver || auj > prochainJourDeSemaine(j)) break; // deuxième manque, ou rattrapage trop tard
      aSauver = j;
    }
  }
  return { n, aSauver: avant ? aSauver : null, debut }; // rien à sauver s'il n'y avait pas de flamme avant le manque
}

// Un chapitre terminé aujourd'hui : nouvel état, et ce qui vient de se passer (flamme allumée, série sauvée).
export function noter(etat, auj, chapitre) {
  const avant = serie(etat.jours, auj);
  const chapitres = etat.date === auj ? [...new Set([...etat.chapitres, chapitre])] : [chapitre];
  const jours = new Set(etat.jours);
  const allumee = !jours.has(auj);
  jours.add(auj);
  const sauvee = !!avant.aSauver && chapitres.length >= 2;
  if (sauvee) jours.add(avant.aSauver);
  const apres = serie([...jours], auj);
  // Seule la série en cours est gardée : les jours d'avant une cassure ne servent plus. Le record, lui, reste (v1.89).
  const record = Math.max(etat.record || 0, apres.n);
  return { etat: { jours: [...jours].filter((j) => j >= apres.debut).sort(), date: auj, chapitres, record }, allumee, sauvee, avant: avant.n, apres: apres.n };
}

// Lecture prudente : le carnet du navigateur peut être bloqué, vide ou abîmé.
function lire() {
  try {
    const e = JSON.parse(localStorage.getItem(CLE));
    const ok = (j) => typeof j === 'string' && /^\d{4}-\d\d-\d\d$/.test(j);
    if (e && Array.isArray(e.jours)) {
      return { jours: e.jours.filter(ok), date: ok(e.date) ? e.date : '', chapitres: Array.isArray(e.chapitres) ? e.chapitres.filter((c) => typeof c === 'string') : [],
        record: Number.isInteger(e.record) && e.record > 0 ? e.record : 0 };
    }
    return { jours: [], date: '', chapitres: [], record: 0 };
  } catch {
    return null;
  }
}
function ecrire(e) {
  try { localStorage.setItem(CLE, JSON.stringify(e)); return true; } catch { return false; }
}

const jours = (n) => (n > 1 ? `${n} jours de suite` : `${n} jour`);

function flamme(classe = '') {
  const f = icone('flamme');
  f.setAttribute('class', `ic flamme ${classe}`);
  return f;
}

// Les 7 jours de la semaine en cours (lundi à dimanche) : allumé, à sauver, aujourd'hui.
function semaine(etat, auj, aSauver) {
  const lundi = decaler(auj, -((date(auj).getDay() + 6) % 7));
  return el('ol', { class: 'semaine-flammes', 'aria-hidden': 'true' }, ...JOURS.map((nom, k) => {
    const j = decaler(lundi, k);
    const etatJour = etat.jours.includes(j) ? 'allume' : j === aSauver ? 'a-sauver' : '';
    return el('li', { class: [etatJour, j === auj ? 'aujourdhui' : '', k > 4 ? 'week-end' : ''].join(' ').trim() },
      flamme(), el('span', {}, nom));
  }));
}

// Rattrapage expliqué à l'enfant (v1.90) : quel jour, comment, jusqu'à quand, où il en est ; « Comment faire ? » se déplie.
const NOMS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const nomDu = (j) => NOMS[date(j).getDay()];
function sauvetage(aSauver, auj, faits) {
  const limite = prochainJourDeSemaine(aSauver);
  const nom = nomDu(aSauver);
  return el('div', { class: 'sauvetage' },
    el('p', {}, `${nom[0].toUpperCase()}${nom.slice(1)}, ta flamme s'est reposée.`),
    el('p', { class: 'progres' }, 'Sauve ta série : finis 2 chapitres différents.'),
    el('p', { class: 'consigne-flammes' }, el('span', {}, limite === auj ? 'Aujourd\'hui seulement' : `Jusqu'à ${nomDu(limite)}`),
      el('span', { class: 'progres' }, `${Math.min(faits, 2)} chapitre sur 2`)),
    el('details', { class: 'comment-faire' },
      el('summary', {}, 'Comment faire ?'),
      el('ol', {}, el('li', {}, 'Choisis un chapitre.'), el('li', {}, 'Finis un jeu ou « Je vérifie ».'),
        el('li', {}, 'Recommence dans un autre chapitre.'))));
}

// Accueil : la série, la semaine et ce qu'il faut faire aujourd'hui. Rien si le navigateur refuse de garder les flammes.
export function encadreFlammes(auj = jour()) {
  const etat = lire();
  if (!etat) return null;
  const { n, aSauver } = serie(etat.jours, auj);
  const faits = etat.date === auj ? etat.chapitres.length : 0;
  const titre = n ? jours(n) : etat.jours.length ? 'Rallume ta flamme !' : 'Allume ta première flamme !';
  const consigne = etat.jours.includes(auj) ? 'Ta flamme du jour brille !' : 'Finis un jeu ou « Je vérifie ».';
  const suivant = n && !aSauver && prochain(n); // pendant un rattrapage, on ne parle que du rattrapage
  const reste = suivant && suivant.n - n;
  // Replié (v1.91, demande de l'enseignant : trop long) : seul le nombre de jours se voit ; le reste au toucher.
  return el('details', { class: `flammes p${palier(n).n}` },
    el('summary', { class: 'titre-flammes' }, flamme(n ? '' : 'eteinte'), el('span', {}, titre),
      el('span', { class: 'ouvrir-flammes', 'aria-hidden': 'true' }, icone('droite'))),
    semaine(etat, auj, aSauver),
    aSauver ? sauvetage(aSauver, auj, faits) : el('p', { class: 'consigne-flammes' }, consigne),
    suivant ? el('p', { class: 'objectif-flammes' }, `Encore ${reste} jour${reste > 1 ? 's' : ''} pour ${suivant.but} !`) : '',
    etat.record > n ? el('p', { class: 'record-flammes' }, icone('etoile'), `Ton record : ${etat.record} jours`) : '');
}

// Fin de « Je vérifie » ou d'un jeu : la flamme du jour s'allume (animation) ; encadré à placer dans le bilan.
export function allumerFlamme(auj = jour()) {
  const etat = lire();
  const chapitre = [parametre('langue'), parametre('annee'), parametre('chapitre')].join('/');
  if (!etat || !parametre('chapitre')) return '';
  const { etat: neuf, allumee, sauvee, avant, apres: n } = noter(etat, auj, chapitre);
  if (!ecrire(neuf)) return '';
  const { aSauver } = serie(neuf.jours, auj);
  const atteint = franchi(avant, n); // palier du jour : son nom en titre, et la pluie d'étoiles
  const titre = atteint ? atteint.fete : sauvee ? 'Ta série est sauvée !' : allumee ? 'Ta flamme du jour brille !' : 'Ta flamme brille déjà aujourd\'hui.';
  // Rattrapage en cours : un bouton ramène à la liste des chapitres de l'année, pour en choisir un autre (v1.90).
  const autre = el('a', { class: 'action secondaire', href: `index.html?langue=${parametre('langue')}&annee=${parametre('annee')}` },
    'Choisir un autre chapitre', icone('droite'));
  const encore = aSauver ? el('p', { class: 'progres' }, 'Encore 1 autre chapitre pour sauver ta série !') : '';
  // « Nouveau record ! » seulement quand on dépasse le record d'une série d'avant (sinon, ce serait tous les jours).
  const record = n > (etat.record || 0) && (etat.record || 0) > avant && !atteint ? el('p', { class: 'progres' }, 'Nouveau record !') : '';
  const encadre = el('div', { class: `flamme-bilan p${palier(n).n}${allumee || sauvee ? ' fete-flamme' : ''}`, role: 'status' },
    el('span', { class: 'foyer', 'aria-hidden': 'true' }, flamme(), ...[1, 2, 3, 4, 5].map(() => el('i', { class: 'etincelle' }))),
    el('div', {}, el('p', { class: 'titre-flammes' }, titre), el('p', {}, jours(n)), record, encore), aSauver ? autre : '');
  if (atteint) {
    // La pluie tombe dans le bilan (encadré pas encore à l'écran : on attend qu'il y soit). Un an : deux pluies.
    setTimeout(() => {
      const zone = encadre.closest('.bilan') || encadre;
      fete(zone);
      if (atteint.n === 365) setTimeout(() => fete(zone), 900);
    }, 1200);
  }
  return encadre;
}
