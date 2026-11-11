// Jeu « Les terriers » (jeu 7 du document de l'enseignant, accepté le 2026-11-08) : neuf terriers, chacun avec
// un petit animal qui tient la carte d'un nom (sans son article). L'enfant touche tous les noms qui prennent
// l'article demandé (« de » ou « het », une manche sur deux). 5 manches de 3 ou 4 cibles.
// Néerlandais seulement (décision de l'enseignant du 2026-11-08) ; seulement dans les chapitres qui ont
// au moins un nom en « de » et un en « het » ; les autres noms de l'année complètent la grille.
// Version sans son (cahier 7.10) : les mots sont déjà écrits, seul le son au toucher disparaît.
import { el, icone, muet } from './outils.js?v=16a7b2c4';
import { cheminSon, chargerTexte, lireCatalogue, lireChapitre, cheminChapitre } from './donnees.js?v=16a7b2c4';
import { creerLecteur, arreter } from './audio.js?v=16a7b2c4';
import { chercherFichiers } from './cartes.js?v=16a7b2c4';
import { melanger, article, sansArticle, bilanEntraine, compteur, bravo, fete } from './exercices.js?v=16a7b2c4';
import { avatar } from './avatar.js?v=16a7b2c4';

export const MANCHES = 5;
export const TERRIERS = 9;

// Noms utilisables : avec « de » ou « het », et d'un seul mot (« het Verenigd Koninkrijk » ne tient pas sur une carte).
export const nomsTerriers = (mots) => mots.filter((m) => article(m.mot) && !/\s/.test(sansArticle(m.mot)));
const compter = (noms, art) => noms.filter((m) => article(m.mot) === art).length;

// Le jeu n'apparaît que dans un chapitre néerlandais qui a lui-même au moins un nom en « de » et un en « het ».
export function terriersPossible(contenu) {
  if (contenu.langue !== 'nl') return false;
  const noms = nomsTerriers(contenu.mots);
  return compter(noms, 'het') >= 1 && compter(noms, 'de') >= 1;
}

// Assez de noms pour jouer (avec les emprunts) : 9 en tout, dont au moins 3 de chaque article.
export const assezDeNoms = (noms) => noms.length >= TERRIERS && compter(noms, 'het') >= 3 && compter(noms, 'de') >= 3;

// Plan des 5 manches. `propres` : noms du chapitre ; `empruntes` : noms des autres chapitres de l'année.
// Les manches alternent « het » et « de » (première au hasard). Les mots les moins vus passent d'abord,
// ceux du chapitre avant les emprunts : un mot ne revient que s'il n'y en a plus d'autres (l'année n'a que 9 noms en het).
export function planTerriers(propres, empruntes, hasard = Math.random) {
  const tous = [...propres.map((m) => ({ m, chez: 0 })), ...empruntes.map((m) => ({ m, chez: 1 }))];
  const vus = new Map(tous.map((x) => [x.m, 0]));
  const prendre = (art, n, deja) => {
    const liste = melanger(tous.filter((x) => article(x.m.mot) === art && !deja.has(x.m)))
      .sort((a, b) => vus.get(a.m) - vus.get(b.m) || a.chez - b.chez)
      .slice(0, n).map((x) => x.m);
    for (const m of liste) { vus.set(m, vus.get(m) + 1); deja.add(m); }
    return liste;
  };
  const debut = hasard() < 0.5 ? 'het' : 'de';
  return Array.from({ length: MANCHES }, (_, k) => {
    const art = k % 2 === 0 ? debut : (debut === 'het' ? 'de' : 'het');
    const autre = art === 'het' ? 'de' : 'het';
    // 3 ou 4 cibles ; plus seulement si l'autre article n'a pas assez de noms pour remplir les 9 terriers.
    const noms = tous.map((x) => x.m);
    const nbCibles = Math.min(Math.max(hasard() < 0.5 ? 3 : 4, TERRIERS - compter(noms, autre)), compter(noms, art));
    const deja = new Set();
    const cibles = prendre(art, nbCibles, deja);
    const autres = prendre(autre, TERRIERS - cibles.length, deja);
    return { article: art, cibles, terriers: melanger([...cibles, ...autres]) };
  });
}

// Noms des autres chapitres de la même année et de la même langue (sauf les révisions, qui les reprennent déjà).
// Chaque nom garde son dossier (images et sons) ; un mot déjà dans le chapitre n'est pas repris.
async function emprunts(contenu) {
  if (contenu.revision) return [];
  const ici = contenu.dossier.split('/').filter(Boolean).pop();
  const vus = new Set(contenu.mots.map((m) => m.mot.toLowerCase()));
  let catalogue;
  try { catalogue = lireCatalogue(await chargerTexte('contenu/catalogue.txt')).chapitres; } catch { return []; }
  const autres = catalogue.filter((c) => c.langue === contenu.langue && c.annee === contenu.annee && !c.revision && c.chapitre !== ici);
  const lus = await Promise.all(autres.map(async (c) => {
    const dossier = cheminChapitre(c.langue, c.annee, c.chapitre);
    try {
      return nomsTerriers(lireChapitre(await chargerTexte(`${dossier}chapitre.txt`)).mots).map((m) => ({ ...m, dossier }));
    } catch { return []; } // un chapitre illisible : les autres servent quand même
  }));
  const noms = lus.flat().filter((m) => !vus.has(m.mot.toLowerCase()) && vus.add(m.mot.toLowerCase()));
  // Images et sons des noms empruntés (chacun dans son dossier ; version muette : aucun son).
  const { presents, indices } = await chercherFichiers({ mots: noms, phrases: [], pistes: [], dictees: [] }, '');
  return noms.map((m, k) => ({ ...m, ind: indices[k], son: presents.has(cheminSon(m, '')) }));
}

// Points de coupure possibles (trait d'union « discret », U+00AD) entre syllabes, pour qu'un nom long passe sur
// deux lignes sur un petit téléphone sans réduire le texte sous 20 px. Règle simple : entre deux voyelles,
// on coupe avant la dernière consonne (boe-ken-tas, pen-nen-zak, vlieg-tuig), mais avant « st » ou « sch » (plak-stift, kap-stok).
// Jamais une seule lettre seule en bout de ligne ; le navigateur ne coupe que si le mot ne tient pas.
const VOYELLE = /[aeiouyàâäéèêëïîôöüû]/i;
export function coupures(mot) {
  const groupes = mot.match(/[aeiouyàâäéèêëïîôöüû]+|[^aeiouyàâäéèêëïîôöüû]+/gi) || [mot];
  let sortie = '';
  let lettres = 0;
  groupes.forEach((g, k) => {
    const entre = k > 0 && k < groupes.length - 1 && !VOYELLE.test(g) && /^[a-z]+$/i.test(g);
    if (!entre) { sortie += g; lettres += g.length; return; }
    let coupe = g.length - 1;
    const fin = g.toLowerCase();
    if (g.length >= 3 && fin.endsWith('sch')) coupe = g.length - 3;
    else if (g.length >= 3 && fin.endsWith('st')) coupe = g.length - 2;
    const avant = lettres + coupe;
    const ok = avant >= 2 && mot.length - avant >= 2;
    sortie += ok ? `${g.slice(0, coupe)}­${g.slice(coupe)}` : g;
    lettres += g.length;
  });
  return sortie;
}

// ---------- Dessins (créations de Claude, validées par l'enseignant le 2026-11-08) ----------
const NS = 'http://www.w3.org/2000/svg';
const ANIMAUX = {
  lapin: '<ellipse cx="38" cy="22" rx="8" ry="22" fill="#d9cbb8" stroke="#5b4632" stroke-width="2.5" transform="rotate(-12 38 30)"/><ellipse cx="38" cy="24" rx="3.5" ry="15" fill="#f4b6c2" transform="rotate(-12 38 30)"/><ellipse cx="62" cy="22" rx="8" ry="22" fill="#d9cbb8" stroke="#5b4632" stroke-width="2.5" transform="rotate(14 62 30)"/><ellipse cx="62" cy="24" rx="3.5" ry="15" fill="#f4b6c2" transform="rotate(14 62 30)"/><ellipse cx="50" cy="58" rx="27" ry="24" fill="#e8dccb" stroke="#5b4632" stroke-width="2.5"/><circle cx="40" cy="54" r="3.6" fill="#13203b"/><circle cx="60" cy="54" r="3.6" fill="#13203b"/><circle cx="41.2" cy="52.8" r="1.1" fill="#fff"/><circle cx="61.2" cy="52.8" r="1.1" fill="#fff"/><path d="M46 62 L54 62 L50 66 Z" fill="#e48aa0"/><path d="M50 66 Q46 70 43 68 M50 66 Q54 70 57 68" fill="none" stroke="#5b4632" stroke-width="2" stroke-linecap="round"/><circle cx="32" cy="63" r="4" fill="#f4b6c2" opacity=".7"/><circle cx="68" cy="63" r="4" fill="#f4b6c2" opacity=".7"/>',
  herisson: '<path d="M18 74 L14 52 L22 50 L20 34 L30 36 L32 20 L41 28 L48 12 L54 26 L63 16 L66 32 L76 28 L76 42 L86 44 L80 56 L88 62 L82 74 Z" fill="#8a5a33" stroke="#4a2f1a" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="50" cy="58" rx="24" ry="20" fill="#f0d9b5" stroke="#4a2f1a" stroke-width="2.5"/><circle cx="41" cy="53" r="3.4" fill="#13203b"/><circle cx="59" cy="53" r="3.4" fill="#13203b"/><circle cx="42.1" cy="51.9" r="1" fill="#fff"/><circle cx="60.1" cy="51.9" r="1" fill="#fff"/><ellipse cx="50" cy="63" rx="4.5" ry="3.4" fill="#13203b"/><path d="M44 69 Q50 73 56 69" fill="none" stroke="#4a2f1a" stroke-width="2" stroke-linecap="round"/><circle cx="33" cy="62" r="3.6" fill="#f2a98f" opacity=".7"/><circle cx="67" cy="62" r="3.6" fill="#f2a98f" opacity=".7"/>',
  souris: '<circle cx="28" cy="30" r="15" fill="#b9c0cc" stroke="#3d4555" stroke-width="2.5"/><circle cx="28" cy="30" r="8.5" fill="#f4b6c2"/><circle cx="72" cy="30" r="15" fill="#b9c0cc" stroke="#3d4555" stroke-width="2.5"/><circle cx="72" cy="30" r="8.5" fill="#f4b6c2"/><ellipse cx="50" cy="56" rx="25" ry="23" fill="#ccd2dc" stroke="#3d4555" stroke-width="2.5"/><circle cx="41" cy="52" r="3.6" fill="#13203b"/><circle cx="59" cy="52" r="3.6" fill="#13203b"/><circle cx="42.2" cy="50.8" r="1.1" fill="#fff"/><circle cx="60.2" cy="50.8" r="1.1" fill="#fff"/><circle cx="50" cy="62" r="3.6" fill="#e48aa0"/><path d="M44 62 L30 59 M44 64 L30 66 M56 62 L70 59 M56 64 L70 66" stroke="#3d4555" stroke-width="1.6" stroke-linecap="round"/><path d="M45 69 Q50 72 55 69" fill="none" stroke="#3d4555" stroke-width="2" stroke-linecap="round"/>',
};
const BUTTE = '<ellipse cx="50" cy="20" rx="50" ry="16" fill="#b7895a"/><ellipse cx="50" cy="12" rx="40" ry="6" fill="#4a3220"/>';

function dessin(classe, viewBox, contenuSvg, etire = false) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('class', classe);
  s.setAttribute('viewBox', viewBox);
  s.setAttribute('aria-hidden', 'true');
  if (etire) s.setAttribute('preserveAspectRatio', 'none');
  s.innerHTML = contenuSvg;
  return s;
}

function ajouterPictogramme() {
  const sprite = document.querySelector('svg.sprite');
  if (!sprite || sprite.querySelector('#terrier')) return;
  const s = document.createElementNS(NS, 'symbol');
  s.setAttribute('id', 'terrier');
  s.setAttribute('viewBox', '0 0 24 24');
  // Une tête de lapin qui sort d'un terrier.
  s.innerHTML = '<path d="M2.5 20.5h19"/><path d="M5 20.5a7 4.5 0 0 1 14 0"/><circle cx="12" cy="13" r="3.5"/><path d="M10.5 9.8 9.5 3.5M13.5 9.8l1-6.3"/>';
  sprite.append(s);
}
if (typeof document !== 'undefined') {
  ajouterPictogramme();
  if (!document.querySelector('link[href*="jeu-terriers.css"]')) {
    document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-terriers.css?v=16a7b2c4' }));
  }
}

// ---------- Une manche ----------
function manche(m, ctx, rang, fin) {
  const { dossier } = ctx;
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('terrier'),
    el('span', {}, 'Touche tous les mots avec « ', el('b', { lang: 'nl' }, m.article), ' ».'));
  const reste = el('p', { class: 'reste-terriers', 'aria-live': 'polite' });
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const message = el('div', { class: 'message-ex' }, retour);
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === MANCHES ? 'Terminer' : 'Suivant', icone('droite'));
  const noms = Object.keys(ANIMAUX);
  let trouves = 0;
  let erreurs = 0;
  const majReste = () => {
    const n = m.cibles.length - trouves;
    reste.textContent = n ? `Encore ${n} mot${n > 1 ? 's' : ''} à trouver.` : '';
  };
  majReste();

  const terriers = m.terriers.map((mot, k) => {
    const cible = m.cibles.includes(mot);
    const lecteur = mot.son && !muet ? creerLecteur(cheminSon(mot, dossier), { nom: mot.mot }) : null;
    // Image du mot (si elle existe), sans texte de remplacement : le mot est écrit juste dessous (et son article ne doit pas s'entendre).
    const image = mot.ind?.type === 'image' ? el('img', { class: 'image-terrier', src: mot.ind.src, alt: '', loading: 'lazy' }) : '';
    const nomEcrit = el('span', { class: 'mot-terrier', lang: 'nl' }, coupures(sansArticle(mot.mot)));
    const carte = el('span', { class: 'carte-terrier' }, image, nomEcrit);
    const b = el('button', { type: 'button', class: `terrier ${noms[k % noms.length]}` },
      el('span', { class: 'corps-terrier' }, dessin('animal-terrier', '0 0 100 74', ANIMAUX[noms[k % noms.length]]), carte),
      dessin('butte-terrier', '0 0 100 20', BUTTE, true));
    b.style.setProperty('--rang', k); // décalage des animations (sortie des terriers, articles), propriété CSS permise par la politique de sécurité
    b.cible = cible;
    b.carte = carte;
    b.mot = mot;
    b.addEventListener('click', () => {
      lecteur?.jouer(); // le mot est dit à chaque toucher (après un toucher : permis sur iPhone)
      if (b.classList.contains('juste') || b.classList.contains('faux') || !suite.hidden) return;
      b.classList.add(cible ? 'juste' : 'faux');
      b.append(el('span', { class: 'marque-ex' }, icone(cible ? 'coche' : 'croix')));
      message.querySelector('.avatar')?.remove();
      if (cible) {
        trouves += 1;
        // Trois petites étoiles qui s'envolent au-dessus de l'animal (cachées par le CSS si moins d'animations).
        const etoiles = el('span', { class: 'etoiles-terrier', 'aria-hidden': 'true' }, icone('etoile'), icone('etoile'), icone('etoile'));
        b.append(etoiles);
        setTimeout(() => etoiles.remove(), 700);
        retour.replaceChildren(icone('sourire'), bravo());
        message.prepend(avatar('content'));
      } else {
        erreurs += 1;
        retour.replaceChildren(icone('bulle'), 'Essaie encore !');
        message.prepend(avatar('encourage'));
        // Après deux erreurs, les cibles qui restent sont entourées d'un cadre épais (fixe).
        if (erreurs >= 2) for (const t of terriers) if (t.cible && !t.classList.contains('juste')) t.classList.add('montre-terrier');
      }
      majReste();
      if (trouves === m.cibles.length) finManche();
    });
    return b;
  });

  // Fin de manche : chaque carte montre son article ; les cibles gardent leur coche.
  function finManche() {
    for (const t of terriers) {
      t.carte.querySelector('.mot-terrier').prepend(el('span', { class: 'article-terrier' }, article(t.mot.mot)), ' ');
      t.classList.add('fini');
    }
    retour.replaceChildren(icone('sourire'), 'Tu les as tous trouvés !');
    message.querySelector('.avatar')?.remove();
    message.prepend(avatar('bravo'));
    reste.textContent = 'Voici les mots avec leur article.';
    suite.hidden = false;
    suite.focus({ preventScroll: true });
  }
  suite.addEventListener('click', () => fin());

  const zone = el('div', { class: 'exercice terriers-jeu' },
    el('div', { class: 'tete-ex' }, titre, compteur(rang, MANCHES)),
    reste,
    el('div', { class: 'grille-terriers' }, ...terriers),
    message, suite);
  zone.titre = titre;
  return zone;
}

async function lancer(zone, contenu) {
  const propres = nomsTerriers(contenu.mots);
  const empruntes = await emprunts(contenu);
  if (!assezDeNoms([...propres, ...empruntes])) {
    // Cas qui n'existe pas aujourd'hui (l'année n'aurait pas 3 noms de chaque article) : rien de négatif pour l'enfant.
    zone.replaceChildren(el('p', { class: 'bientot-ici' }, icone('puzzle'), 'Ce jeu arrive bientôt ici.'));
    return;
  }
  const plan = planTerriers(propres, empruntes);
  let i = 0;
  function suivante() {
    arreter();
    if (i === plan.length) {
      bilanEntraine(zone, () => lancer(zone, contenu), 'bravo',
        el('p', {}, `Tu as fini les ${MANCHES} manches des terriers !`));
      return fete(zone.querySelector('.bilan')); // pluie d'étoiles du site (rien si moins d'animations)
    }
    i += 1;
    const q = manche(plan[i - 1], contenu, i, suivante);
    if (i > 1) q.classList.add('nouvelle-manche');
    zone.replaceChildren(q);
    if (i > 1) q.titre.focus();
  }
  suivante();
}

export default {
  id: 'terriers',
  nom: 'Les terriers',
  icone: 'terrier',
  possible: terriersPossible,
  lancer,
};
