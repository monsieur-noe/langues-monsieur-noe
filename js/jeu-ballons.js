// Jeu « La chasse aux mots » (d'abord « Les ballons de mots ») (document de l'enseignant, jeu 2) : des ballons immobiles portent chacun un mot écrit.
// On entend un mot (version sans son : on voit son indice) et on touche le ballon qui le porte.
// Les autres ballons portent des mots qui lui ressemblent (même début, même longueur, une ou deux lettres de différence),
// pris dans le chapitre, puis dans les autres chapitres de la même année et de la même langue.
// Le son ne part jamais seul : au toucher de « Écoute » (1re manche), puis de « Suivant » (décision de l'enseignant du 2026-11-08).
// Version difficile : 9 ballons, mots encore plus proches. Rien n'est enregistré.
import { el, icone, muet } from './outils.js?v=16a7b2c4';
import { cheminSon, lireCatalogue, lireChapitre, chargerTexte, cheminChapitre } from './donnees.js?v=16a7b2c4';
import { creerLecteur, arreter } from './audio.js?v=16a7b2c4';
import { visuel } from './cartes.js?v=16a7b2c4';
import { melanger, bilanEntraine, compteur, bravo } from './exercices.js?v=16a7b2c4';
import { avatar } from './avatar.js?v=16a7b2c4';

const MANCHES = 8;

// ---------- Choix des mots (sans affichage : testé dans tests/ballons.test.js) ----------

// Forme comparée : minuscules, sans article (de, het, the, a, an), sans ponctuation finale.
export const forme = (mot) => mot.toLowerCase().replace(/^(de|het|the|an?)\s+/, '').replace(/[.!?,]+$/, '').trim();

// Nombre de lettres à changer, ajouter ou enlever pour passer d'un mot à l'autre.
export function distance(a, b) {
  let prec = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const ligne = [i];
    for (let j = 1; j <= b.length; j++) ligne[j] = Math.min(prec[j] + 1, ligne[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prec = ligne;
  }
  return prec[b.length];
}

// Ressemblance (plus petit = plus proche) : au plus 2 lettres de différence, ou même première lettre et longueur proche (± 1).
export function ecart(cible, autre) {
  const a = forme(cible.mot);
  const b = forme(autre.mot);
  const d = distance(a, b);
  const proche = d <= 2 || (a[0] === b[0] && Math.abs(a.length - b.length) <= 1);
  return d + (proche ? 0 : 10) + (a[0] === b[0] ? -0.5 : 0) + (autre.ailleurs ? 0.5 : 0); // le chapitre d'abord
}

// Deux mots qui se confondraient : même écriture, ou (sans son) même indice.
function confondus(cible, autre) {
  if (forme(cible.mot) === forme(autre.mot)) return true;
  if (!muet) return false;
  if (/^(texte|couleur):/.test(cible.image || '') && cible.image === autre.image) return true;
  return Boolean(cible.francais) && cible.francais.toLowerCase() === (autre.francais || '').toLowerCase();
}

// `nb` leurres pour `cible`, parmi `pool`. Un peu de hasard pour changer d'une partie à l'autre (moins en difficile).
export function leurres(cible, pool, nb, difficile, hasard = Math.random) {
  const vus = new Set();
  return pool
    .filter((m) => !confondus(cible, m))
    .map((m) => ({ m, cle: ecart(cible, m) + hasard() * (difficile ? 0.6 : 2.5) }))
    .sort((x, y) => x.cle - y.cle)
    .filter(({ m }) => !vus.has(forme(m.mot)) && vus.add(forme(m.mot)))
    .slice(0, nb)
    .map(({ m }) => m);
}

// Mots qui peuvent être le mot à trouver : avec leur son (sans son : avec un indice qui ne montre pas le mot lui-même).
export const cibles = (mots) => mots.filter((m) => (muet ? m.ind && !(m.ind.type === 'francais' && forme(m.ind.texte) === forme(m.mot)) : m.son));

// ---------- Décors (dessinés par Claude, validés par l'enseignant le 2026-11-08) ----------

// Couleurs pâles (le mot reste lisible dessus) et leur contour.
const TEINTES = [['#fbd5d9', '#d9485f'], ['#cfe3fa', '#3b82c4'], ['#d6efc4', '#4e8a2a'], ['#fbe7b0', '#c58a12'], ['#e3dafb', '#7357c9'], ['#fcd9c0', '#d0692a']];

// Chaque décor : dessin (viewBox 120 × 120) et `etiquette` quand le mot a besoin d'un fond blanc (cible, étoile).
const DECORS = {
  ballon: { dessin: (f, t) => `<path d="M60 100 C55 108 66 112 58 120" stroke="#8a8780" stroke-width="2" fill="none"/>
    <ellipse cx="60" cy="52" rx="50" ry="48" fill="${f}" stroke="${t}" stroke-width="3"/>
    <path d="M54 99 L66 99 L60 106 Z" fill="${t}"/>
    <path d="M24 34 Q30 18 46 12" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>` },
  bulle: { dessin: (f, t) => `<circle cx="60" cy="60" r="56" fill="${f}" stroke="${t}" stroke-width="3"/>
    <path d="M22 40 Q30 18 52 12" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="108" cy="12" r="6" fill="#fff" stroke="${t}" stroke-width="2"/>` },
  cible: { etiquette: true, dessin: (f, t) => `<circle cx="60" cy="60" r="57" fill="${f}" stroke="${t}" stroke-width="3"/>
    <circle cx="60" cy="60" r="41" fill="#fff" stroke="${t}" stroke-width="3"/>
    <circle cx="60" cy="60" r="25" fill="${f}" stroke="${t}" stroke-width="3"/>
    <g class="bal-fleche"><path d="M64 56 L116 6" stroke="#5b4636" stroke-width="4" stroke-linecap="round"/>
    <path d="M60 60 L72 54 L66 48 Z" fill="#5b4636"/><path d="M108 4 L118 2 L116 12 L110 18 L104 10 Z" fill="${t}"/></g>` },
  fruit: { dessin: (f, t) => `<path d="M60 24 Q62 10 70 4" stroke="#6b4a1e" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M64 16 Q84 0 98 12 Q82 26 64 16 Z" fill="#9cc95f" stroke="#4e8a2a" stroke-width="2"/>
    <path d="M60 26 C18 10 0 58 12 90 C24 120 50 122 60 114 C70 122 96 120 108 90 C120 58 102 10 60 26 Z" fill="${f}" stroke="${t}" stroke-width="3"/>` },
  etoile: { etiquette: true, dessin: (f, t) => `<path d="M60 4 L76 42 L117 46 L86 73 L95 114 L60 93 L25 114 L34 73 L3 46 L44 42 Z" fill="${f}" stroke="${t}" stroke-width="3" stroke-linejoin="round"/>` },
};

const NS = 'http://www.w3.org/2000/svg';
function dessin(decor, rang) {
  const [f, t] = TEINTES[rang % TEINTES.length];
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'decor-ballon');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = DECORS[decor].dessin(f, t); // dessin fixe, aucun texte venu du contenu
  return svg;
}

// Pictogramme du menu (ajouté au jeu d'icônes de la page) et styles du jeu, une seule fois.
if (typeof document !== 'undefined') {
  const sprite = document.querySelector('svg.sprite');
  if (sprite && !sprite.querySelector('#ballon')) {
    const s = document.createElementNS(NS, 'symbol');
    s.setAttribute('id', 'ballon');
    s.setAttribute('viewBox', '0 0 24 24');
    s.innerHTML = '<ellipse cx="12" cy="9.5" rx="6.5" ry="7"/><path d="M11 17h2l-1 1.5z"/><path d="M12 18.5c-1 1.5 1 2 0 3.5"/>';
    sprite.append(s);
  }
  if (!document.querySelector('link[href*="jeu-ballons.css"]')) {
    document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-ballons.css?v=16a7b2c4' }));
  }
}

// ---------- Mots des autres chapitres de la même année (leurres) ----------

const empruntes = new Map(); // une seule lecture par page et par année
function motsDeLAnnee(contenu) {
  const { langue, annee, dossier } = contenu;
  const cle = `${langue}/${annee}`;
  if (!empruntes.has(cle)) {
    empruntes.set(cle, (async () => {
      const lire = (chemin) => chargerTexte(chemin).catch(() => '');
      const ici = dossier.split('/').filter(Boolean).pop();
      const autres = lireCatalogue(await lire('contenu/catalogue.txt')).chapitres
        .filter((c) => c.langue === langue && c.annee === annee && c.chapitre !== ici);
      const textes = await Promise.all(autres.map((c) => lire(`${cheminChapitre(langue, annee, c.chapitre)}chapitre.txt`)));
      return textes.flatMap((t) => (t ? lireChapitre(t).mots : [])).map((m) => ({ ...m, ailleurs: true }));
    })());
  }
  return empruntes.get(cle);
}

// ---------- Le jeu ----------

async function lancer(zone, contenu, difficile) {
  const { langue, dossier } = contenu;
  const nbBallons = difficile ? 9 : 6;
  // Chapitre de révision : il contient déjà tous les mots de l'année.
  const ailleurs = contenu.revision ? [] : await motsDeLAnnee(contenu);
  const pool = [...contenu.mots, ...ailleurs];
  const plan = melanger(cibles(contenu.mots)).slice(0, MANCHES);
  const decor = melanger(Object.keys(DECORS))[0]; // un décor au hasard à chaque partie
  let manche = 0;
  let premierCoup = 0;

  function poser(declencheSon) {
    arreter();
    if (manche === plan.length) {
      bilanEntraine(zone, () => lancer(zone, contenu, difficile), 'bravo',
        el('p', {}, `Tu as trouvé les ${plan.length} mots !`),
        el('p', {}, `Du premier coup : ${premierCoup} sur ${plan.length}.`));
      // Fête de fin : 6 ballons montent une seule fois, puis le calque disparaît (rien à toucher).
      const envol = el('div', { class: 'envol-ballons', 'aria-hidden': 'true' }, ...TEINTES.map((_, k) => dessin('ballon', k)));
      envol.lastChild.addEventListener('animationend', () => envol.remove());
      zone.append(envol);
      return;
    }
    const cible = plan[manche];
    manche += 1;
    const mots = melanger([cible, ...leurres(cible, pool, nbBallons - 1, difficile)]);
    let erreurs = 0;

    const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone(muet ? 'oeil' : 'haut-parleur'),
      muet ? 'Touche le mot qui va avec l\'indice.' : 'Touche le mot entendu.');
    // Sans son : l'indice (dessin, couleur, chiffre ou français), jamais le mot écrit.
    const lecteur = muet ? null : creerLecteur(cheminSon(cible, dossier), { nom: 'le mot à écouter' });
    const enonce = el('div', { class: 'enonce' }, muet ? visuel(cible, cible.ind, langue) : lecteur);
    const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
    const av = avatar('neutre');
    av.hidden = true; // l'avatar n'apparaît qu'après une réponse
    const message = el('div', { class: 'message-ex' }, av, retour);
    const suite = el('button', { type: 'button', class: 'action', hidden: '' }, manche === plan.length ? 'Terminer' : 'Suivant', icone('droite'));
    const dire = (ic, txt, pose) => { retour.replaceChildren(icone(ic), txt); av.pose(pose); };

    const ballons = mots.map((m, k) => {
      const etiquette = el('span', { class: 'mot-ballon', lang: langue }, m.mot);
      if (m.mot.length > 9) etiquette.classList.add('long');
      const b = el('button', { type: 'button', class: `ballon bal-${decor}${DECORS[decor].etiquette ? ' bal-etiquette' : ''}` }, dessin(decor, k), etiquette);
      b.addEventListener('click', () => toucher(b, m));
      return b;
    });
    const ouvrir = (oui) => ballons.forEach((b) => { if (!b.classList.contains('faux')) b.disabled = !oui; });

    function toucher(b, m) {
      if (m === cible) {
        if (!erreurs) premierCoup += 1;
        ballons.forEach((x) => { x.disabled = true; });
        b.classList.remove('entoure');
        b.classList.add('juste');
        // Le ballon éclate en 6 morceaux de sa couleur (sauf la cible, où la flèche se plante).
        if (decor !== 'cible') {
          const eclats = el('span', { class: 'eclats', 'aria-hidden': 'true' }, ...Array.from({ length: 6 }, () => el('i')));
          eclats.style.color = TEINTES[mots.indexOf(m) % TEINTES.length][1];
          b.prepend(eclats);
        }
        b.append(el('span', { class: 'marque-ex' }, icone('coche')));
        dire('sourire', bravo(), 'content');
        lecteur?.jouer(); // le mot redit (juste après un toucher : permis)
        suite.hidden = false;
        suite.focus({ preventScroll: true });
        return;
      }
      erreurs += 1;
      b.disabled = true;
      b.classList.add('faux');
      b.append(el('span', { class: 'marque-ex' }, icone('croix')));
      if (erreurs < 2) return dire('tourner', 'Essaie encore !', 'reflechit');
      // Après deux erreurs, le bon ballon est entouré d'un cadre épais (fixe) ; l'enfant le touche lui-même.
      ballons[mots.indexOf(cible)].classList.add('entoure');
      dire('tourner', 'Essaie encore ! Regarde le mot entouré.', 'explique');
    }

    // « Suivant » : la manche suivante, et son mot entendu tout de suite (le son part de ce toucher).
    suite.addEventListener('click', () => poser(true));

    const ex = el('div', { class: 'exercice jeu-ballons' },
      el('div', { class: 'tete-ex' }, titre, compteur(manche, plan.length)),
      enonce,
      // Un mot long dans la manche : sur téléphone, les 9 ballons passent sur 2 colonnes (sinon le mot déborde).
      el('div', { class: `ballons n${nbBallons}${mots.some((m) => m.mot.length > 10) ? ' larges' : ''}` }, ...ballons),
      message, suite);
    zone.replaceChildren(ex);
    if (muet || declencheSon) {
      ouvrir(true);
      lecteur?.jouer();
    } else {
      // 1re manche : les ballons s'ouvrent à la première écoute (on touche ce qu'on a entendu, pas au hasard).
      ouvrir(false);
      lecteur.addEventListener('click', () => { if (suite.hidden) ouvrir(true); });
    }
    if (manche > 1) titre.focus({ preventScroll: true });
  }
  poser(false);
}

const possible = (contenu) => cibles(contenu.mots).length >= 4;

export default {
  id: 'ballons',
  nom: 'La chasse aux mots',
  icone: 'ballon',
  possible,
  lancer: (zone, contenu) => lancer(zone, contenu, false),
};

export const ballonsDifficile = {
  id: 'ballons-difficile',
  nom: 'La chasse aux mots (difficile)',
  icone: 'ballon',
  possible,
  lancer: (zone, contenu) => lancer(zone, contenu, true),
};
