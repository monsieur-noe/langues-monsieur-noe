// Jeu « Le mot en pièces » (cahier 7.9) : un indice (dessin, couleur, chiffre ou français) et le son du mot ;
// les lettres du mot, mélangées, sont de gros boutons à toucher dans le bon ordre. Au-delà de 8 lettres,
// des morceaux de mot remplacent les lettres. Version difficile : 2 lettres (ou morceaux) en trop.
// Version sans son (?muet=1) : l'indice seul, jamais le mot écrit (c'est la réponse), pas de haut-parleur.
import { el, icone, muet } from './outils.js?v=8e00c834';
import { cheminSon } from './donnees.js?v=8e00c834';
import { creerLecteur, arreter } from './audio.js?v=8e00c834';
import { visuel } from './cartes.js?v=8e00c834';
import { melanger, bilanEntraine, compteur, bravo, fete } from './exercices.js?v=8e00c834';
import { desordre } from './ordre.js?v=8e00c834';
import { avatar } from './avatar.js?v=8e00c834';

const MANCHES = 6;
const LONG = 8; // au-delà, des morceaux au lieu des lettres
const ARTICLE = /^(de|het|the|to|a|an)\s+/i; // écrit d'avance devant les cases

// ---------- Découpage des mots longs (validé par l'enseignant le 2026-11-08) ----------

// Groupes de lettres qui se prononcent ensemble : jamais coupés.
const GROUPES = ['sch', 'igh', 'tch', 'ch', 'sh', 'th', 'ph', 'ck', 'ng', 'wh', 'gh', 'qu', 'ij', 'ui', 'oe', 'ou', 'au', 'ei', 'eu', 'ie', 'aa', 'ee', 'oo', 'uu', 'ea', 'ai', 'ay', 'oa', 'ow', 'ue', 'ey', 'oy'];
// Débuts de syllabe possibles (consonnes qui restent ensemble au début du morceau suivant).
const ATTAQUES = new Set(['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr', 'kl', 'kr', 'pl', 'pr', 'tr', 'vl', 'vr', 'wr', 'sl', 'sm', 'sn', 'sp', 'st', 'sw', 'sk', 'zw', 'tw']);
// Découpages corrigés à la main (la règle se trompe sur ces mots) : en ajouter ici au besoin.
const EXCEPTIONS = { duitsland: 'Duits|land', nineteenth: 'nine|teenth', motorcycle: 'mo|tor|cy|cle', cauliflower: 'cau|li|flow|er' };
// Nombres néerlandais de 21 à 99 : coupés selon leurs parties (« vijf · en · twin · tig »), choix de l'enseignant.
const NOMBRE_NL = /^(een|twee|drie|vier|vijf|zes|zeven|acht|negen)(en|ën)(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)$/i;
const VOYELLE = /^[aeiouyëéèêïöü]/i;

function unites(mot) {
  const u = [];
  const bas = mot.toLowerCase();
  for (let i = 0; i < mot.length;) {
    const g = GROUPES.find((x) => bas.startsWith(x, i)) || mot[i];
    u.push(mot.slice(i, i + g.length));
    i += g.length;
  }
  return u;
}

// Syllabes : une consonne seule entre deux voyelles va avec la suivante ; deux consonnes se séparent ;
// trois ou plus : les deux dernières restent ensemble si elles peuvent commencer une syllabe (« plak · stift »).
function syllabes(mot) {
  const u = unites(mot);
  const noyaux = u.map((_, k) => k).filter((k) => VOYELLE.test(u[k]) && !(k === 0 && /^y/i.test(u[k])));
  const coupes = noyaux.slice(1).map((b, n) => {
    const consonnes = b - noyaux[n] - 1;
    if (consonnes <= 1) return noyaux[n] + 1;
    return consonnes >= 3 && ATTAQUES.has(u.slice(b - 2, b).join('').toLowerCase()) ? b - 2 : b - 1;
  });
  const s = [0, ...coupes, u.length].slice(1).map((fin, k, t) => u.slice(k ? t[k - 1] : 0, fin).join(''));
  // Une lettre seule est collée au morceau voisin.
  for (let k = 0; k < s.length; k++) {
    if (s[k].length > 1 || s.length === 1) continue;
    if (k < s.length - 1) s[k + 1] = s[k] + s[k + 1]; else s[k - 1] += s[k];
    s.splice(k--, 1);
  }
  return s;
}

export function morceaux(mot) {
  const exception = EXCEPTIONS[mot.toLowerCase()];
  if (exception) return exception.split('|');
  const n = mot.match(NOMBRE_NL);
  if (n) return [...syllabes(n[1]), n[2], ...syllabes(n[3])];
  return syllabes(mot);
}

// Les pièces à toucher : les lettres, ou des morceaux pour un mot long.
export const pieces = (mot) => (Array.from(mot).length > LONG ? morceaux(mot) : Array.from(mot));

// ---------- Mots utilisables ----------

const sansArticle = (texte) => texte.replace(ARTICLE, '').trim();

// Un mot sert s'il est d'un seul mot (après l'article), sans trait d'union ni apostrophe, avec un indice
// qui ne donne pas la réponse : un français qui manque (le mot lui-même) ou qui contient le mot (« le dessert ») ne va pas.
export function motsUtilisables(mots) {
  return mots.filter((m) => {
    const corps = sansArticle(m.mot);
    if (!corps || /[\s'’.\-!?,]/.test(corps) || new Set(pieces(corps)).size < 2) return false;
    if (m.ind.type !== 'francais') return true;
    return Boolean(m.francais) && !sansArticle(m.ind.texte).toLowerCase().includes(corps.toLowerCase());
  }).map((m) => {
    const corps = sansArticle(m.mot);
    return { m, article: m.mot.slice(0, m.mot.length - corps.length).trim(), corps, pieces: pieces(corps) };
  });
}

const ALPHABET = 'abcdefghijklmnoprstuvwz';

// Version difficile : 2 pièces en trop, absentes du mot. Lettres : prises dans l'alphabet ;
// morceaux : pris dans les autres mots de la partie (sinon, deux lettres).
export function intrus(item, autres) {
  const dans = new Set(item.pieces.map((p) => p.toLowerCase()));
  const long = item.pieces.some((p) => p.length > 1);
  const choix = long ? autres.flatMap((a) => morceaux(a.corps)).filter((p) => p.length > 1) : Array.from(ALPHABET);
  const ok = [...new Set(choix.filter((p) => !dans.has(p.toLowerCase())))];
  if (long && ok.length < 2) return intrus({ pieces: Array.from(item.corps) }, []);
  return melanger(ok).slice(0, 2);
}

// ---------- Le jeu ----------

// Pictogramme du menu (rangée de lettres, la dernière cochée), ajouté au jeu d'icônes de la page.
function ajouterPictogramme() {
  const sprite = document.querySelector('svg.sprite');
  if (!sprite || sprite.querySelector('#mot-en-pieces')) return;
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'symbol');
  s.setAttribute('id', 'mot-en-pieces');
  s.setAttribute('viewBox', '0 0 24 24');
  for (const [x, y] of [[2.5, 9], [9.5, 5.5], [16.5, 9]]) {
    const r = document.createElementNS(ns, 'rect');
    for (const [k, v] of Object.entries({ x, y, width: 5.5, height: 6.5, rx: 1.3 })) r.setAttribute(k, v);
    s.append(r);
  }
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', 'M4 20h16');
  s.append(p);
  sprite.append(s);
}
if (typeof document !== 'undefined') {
  ajouterPictogramme();
  if (!document.querySelector('link[href*="jeu-mot-en-pieces.css"]')) {
    document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-mot-en-pieces.css?v=8e00c834' }));
  }
}

// L'indice sans le mot écrit : le texte de remplacement donne le français, jamais la réponse.
function indice(m, langue) {
  const v = visuel(m, m.ind, langue);
  if (v.tagName === 'IMG') { v.alt = m.francais || 'Dessin'; v.removeAttribute('lang'); v.loading = 'eager'; }
  if (v.classList.contains('carre')) { v.setAttribute('aria-label', m.francais || 'Couleur'); v.removeAttribute('lang'); }
  return v;
}

// La pièce juste vole de son bouton jusqu'à sa case (0,25 s). En JavaScript : la règle CSS « moins de mouvement » ne la coupe pas.
function voler(c, depart) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !c.animate) return;
  const arrivee = c.getBoundingClientRect();
  c.animate([{ transform: `translate(${depart.left - arrivee.left}px, ${depart.top - arrivee.top}px)` }, { transform: 'none' }],
    { duration: 250, easing: 'ease-out' });
}

// Mot réussi : chaque lettre fait un petit saut, de gauche à droite (environ 0,5 s en tout, CSS).
function vague(mot) {
  const lettres = Array.from(mot);
  return lettres.map((x, k) => {
    const s = el('span', { class: 'vague-mep' }, x);
    s.style.setProperty('--d', `${Math.round((k * 250) / lettres.length)}ms`);
    return s;
  });
}

function manche(zone, item, autres, difficile, contenu, rang, total, fin) {
  const { m, article, corps } = item;
  const { langue, dossier } = contenu;
  const long = item.pieces.some((p) => p.length > 1);
  const lecteur = m.son && !muet ? creerLecteur(cheminSon(m, dossier), { nom: 'le mot' }) : null;
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('mot-en-pieces'),
    long ? 'Touche les morceaux dans le bon ordre.' : 'Touche les lettres dans le bon ordre.');
  const cases = item.pieces.map((p) => el('span', { class: `case-mep${p.length > 1 ? ' morceau' : ''}` }));
  cases.forEach((c, k) => c.style.setProperty('--i', k)); // arrivée l'une après l'autre (CSS)
  const ligne = el('div', { class: 'ligne-mep', lang: langue, 'aria-label': 'Ton mot' },
    article ? el('span', { class: 'article-mep' }, article) : '', el('span', { class: 'cases-mep' }, ...cases));
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une réponse
  const message = el('div', { class: 'message-ex' }, av, retour);
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === total ? 'Terminer' : 'Suivant', icone('droite'));
  suite.addEventListener('click', fin);

  let place = 0;
  let erreurs = 0; // sur la pièce attendue
  const tuiles = desordre(item.pieces);
  if (difficile) for (const x of intrus(item, autres)) tuiles.splice(Math.floor(Math.random() * (tuiles.length + 1)), 0, x);
  const effacerCroix = () => boutons.forEach((b) => { b.classList.remove('faux'); b.querySelector('.marque-ex')?.remove(); });
  const boutons = tuiles.map((texte) => {
    const b = el('button', { type: 'button', class: `reponse tuile-mep${texte.length > 1 ? ' morceau' : ''}`, lang: langue }, texte);
    b.addEventListener('click', () => toucher(b, texte));
    b.style.setProperty('--i', tuiles.indexOf(texte) + cases.length);
    return b;
  });

  function toucher(b, texte) {
    if (texte === item.pieces[place]) {
      effacerCroix();
      boutons.forEach((x) => x.classList.remove('indique'));
      const depart = b.getBoundingClientRect();
      b.hidden = true;
      cases[place].textContent = texte;
      voler(cases[place], depart);
      cases[place].classList.add('remplie');
      cases[place].append(el('span', { class: 'coche-mep' }, icone('coche')));
      place += 1;
      erreurs = 0;
      if (place < item.pieces.length) return retour.replaceChildren();
      // Mot terminé : il s'affiche en entier et il est prononcé (après un toucher : permis sur iPhone).
      ligne.classList.add('juste');
      ligne.replaceChildren(el('span', { class: 'mot-mep' }, article ? `${article} ` : '', ...vague(corps)), el('span', { class: 'marque-ex' }, icone('coche')));
      boutons.forEach((x) => { x.disabled = true; });
      retour.replaceChildren(icone('sourire'), bravo());
      av.pose('content');
      lecteur?.jouer();
      suite.hidden = false;
      return suite.focus();
    }
    if (b.classList.contains('faux')) return;
    b.classList.add('faux');
    b.append(el('span', { class: 'marque-ex' }, icone('croix')));
    retour.replaceChildren(icone('tourner'), 'Essaie encore !');
    av.pose('encourage');
    erreurs += 1;
    // Après deux erreurs sur la même pièce, la bonne est entourée d'un cadre épais (fixe).
    if (erreurs >= 2) boutons.find((x) => !x.hidden && x.textContent === item.pieces[place])?.classList.add('indique');
  }

  zone.replaceChildren(el('div', { class: 'exercice mot-en-pieces' },
    titre, compteur(rang, total),
    el('div', { class: 'enonce' }, el('div', { class: 'pile' }, indice(m, langue), lecteur || '')),
    ligne,
    el('div', { class: `reserve-mep${long ? ' morceaux' : ''}` }, ...boutons),
    message, suite));
  titre.focus({ preventScroll: true });
}

function partie(zone, contenu, difficile) {
  const pool = motsUtilisables(contenu.mots);
  const plan = melanger(pool).slice(0, MANCHES);
  let rang = 0;
  const suivant = () => {
    rang += 1;
    if (rang > plan.length) {
      arreter();
      bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, `Tu as reconstruit ${plan.length} mots !`));
      zone.classList.add('zone-mep'); // la pluie d'étoiles reste dans la zone du jeu
      return fete(zone);
    }
    manche(zone, plan[rang - 1], pool.filter((x) => x !== plan[rang - 1]), difficile, contenu, rang, plan.length, suivant);
  };
  suivant();
}

// Début : deux boutons, la partie normale ou la version difficile (2 lettres en trop).
function lancer(zone, contenu) {
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('mot-en-pieces'), 'Touche les lettres dans le bon ordre.');
  const facile = el('button', { type: 'button', class: 'action' }, icone('lecture'), 'Jouer');
  const difficile = el('button', { type: 'button', class: 'action secondaire' }, icone('etoile'), 'Version difficile');
  facile.addEventListener('click', () => partie(zone, contenu, false));
  difficile.addEventListener('click', () => partie(zone, contenu, true));
  zone.replaceChildren(el('div', { class: 'exercice mot-en-pieces' }, titre,
    el('div', { class: 'debut-mep' }, facile, difficile,
      el('p', { class: 'aide-mep' }, 'Difficile : 2 lettres en trop !'))));
}

export default {
  id: 'mot-en-pieces',
  nom: 'Le mot en pièces',
  icone: 'mot-en-pieces',
  // Au moins 6 mots utilisables (un seul mot, avec un indice qui ne donne pas la réponse).
  possible: (contenu) => motsUtilisables(contenu.mots).length >= MANCHES,
  lancer,
};
