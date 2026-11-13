// Jeu « Chacun sa boîte » (document de l'enseignant, jeu 4) : le seul jeu qui mélange les chapitres d'une même année.
// Niveau 1 (3 manches) : 4 cartes, 3 d'un chapitre et 1 d'un autre ; on touche l'intrus.
// Niveau 2 (3 manches) : 8 cartes de 2 ou 3 chapitres ; on touche toutes celles du chapitre écrit en haut.
// Chaque carte montre l'indice et le mot écrit ; au toucher, le mot est dit (version sans son : rien n'est dit).
// Rien n'est enregistré.
import { el, icone, muet, parametre } from './outils.js?v=4a69adff';
import { cheminSon, lireCatalogue, lireChapitre, chargerTexte, cheminChapitre, fichiersPresents } from './donnees.js?v=4a69adff';
import { creerLecteur, arreter } from './audio.js?v=4a69adff';
import { visuel, indice, cheminImage } from './cartes.js?v=4a69adff';
import { melanger, bilanEntraine, compteur, bravo, fete } from './exercices.js?v=4a69adff';
import { avatar } from './avatar.js?v=4a69adff';

// Décisions de l'enseignant (2026-11-08).
// shortcut: listes écrites ici faute de pouvoir toucher contenu/ ; à déplacer dans catalogue.txt si l'enseignant veut les modifier lui-même.
// Chapitres sans ce jeu : leurs seuls mots sont les nombres de 0 à 10, déjà dans Verjaardag / Birthday.
export const SANS_JEU = ['nl/p3/zich-voorstellen', 'en/p3/introduce-yourself'];
// Chapitres à ne jamais mélanger (mots communs ou trop proches).
export const PAS_ENSEMBLE = [
  ['nl/p3/zich-voorstellen', 'nl/p3/verjaardag'], ['nl/p3/kleuren', 'nl/p3/uiterlijk'],
  ['en/p3/introduce-yourself', 'en/p3/birthday'], ['en/p3/colours-en', 'en/p3/appearance-en'],
];

const MANCHES = 3; // par niveau

// ---------- Choix des cartes (sans affichage : testé dans tests/boites.test.js) ----------

// Un « groupe » = un chapitre : { cle: 'nl/p3/kleuren', titre, dossier, mots }.
export const compatibles = (a, b) => a.cle !== b.cle && !PAS_ENSEMBLE.some(([x, y]) => (x === a.cle && y === b.cle) || (x === b.cle && y === a.cle));
// Forme comparée : un mot du thème n'est jamais un intrus (« bus » dans deux chapitres, par exemple).
const forme = (m) => m.mot.toLowerCase().replace(/^(de|het|the|an?)\s+/, '').trim();

// `nb` mots au hasard, ceux pas encore vus dans la partie d'abord (petits chapitres : on finit par répéter).
function prendre(mots, nb, vus) {
  const m = melanger(mots);
  return [...m.filter((x) => !vus.has(x)), ...m.filter((x) => vus.has(x))].slice(0, nb);
}

// Une manche : les cartes mélangées, chacune { mot, bon } (bon = la carte à toucher).
// Niveau 1 : 3 du thème + 1 intrus (bon). Niveau 2 : 3 ou 4 du thème (bons) + le reste d'1 ou 2 autres chapitres.
export function manche(niveau, theme, autres, vus = new Set()) {
  const dejaLa = new Set(theme.mots.map(forme));
  const ailleurs = melanger(autres.filter((g) => compatibles(theme, g)))
    .map((g) => ({ ...g, mots: g.mots.filter((m) => !dejaLa.has(forme(m))) }))
    .filter((g) => g.mots.length);
  if (niveau === 1) {
    return melanger([
      ...prendre(theme.mots, 3, vus).map((mot) => ({ mot, bon: false })),
      ...prendre(ailleurs[0].mots, 1, vus).map((mot) => ({ mot, bon: true })),
    ]);
  }
  const nbTheme = Math.min(theme.mots.length, 3 + Math.floor(Math.random() * 2));
  const reste = 8 - nbTheme;
  const deux = ailleurs.length > 1 && ailleurs[0].mots.length + ailleurs[1].mots.length >= reste ? ailleurs.slice(0, 2) : ailleurs.slice(0, 1);
  const parts = deux.length === 2 ? [Math.ceil(reste / 2), Math.floor(reste / 2)] : [reste];
  const intrus = deux.flatMap((g, k) => prendre(g.mots, parts[k], vus));
  // Un groupe trop petit pour sa part : on complète avec l'autre.
  if (intrus.length < reste && deux.length === 2) intrus.push(...prendre(deux[0].mots.filter((m) => !intrus.includes(m)), reste - intrus.length, vus));
  return melanger([
    ...prendre(theme.mots, nbTheme, vus).map((mot) => ({ mot, bon: true })),
    ...intrus.map((mot) => ({ mot, bon: false })),
  ]);
}

// Assez de mots pour jouer avec ce thème ? (niveau 1 : 3 + 1 ; niveau 2 : 4 + 4 ailleurs)
export function jouable(theme, groupes) {
  const ailleurs = groupes.filter((g) => compatibles(theme, g));
  return theme.mots.length >= 4 && ailleurs.reduce((n, g) => n + g.mots.length, 0) >= 4;
}

// ---------- Les chapitres de l'année ----------

// Le catalogue est lu dès l'ouverture de la page : « possible » doit répondre tout de suite. Hors navigateur (tests), rien.
const ici = typeof location !== 'undefined' ? { langue: parametre('langue'), annee: parametre('annee'), chapitre: parametre('chapitre') } : null;
const catalogue = ici?.chapitre
  ? await chargerTexte('contenu/catalogue.txt').then((t) => lireCatalogue(t).chapitres, () => [])
  : [];
const cleDe = (c) => `${c.langue}/${c.annee}/${c.chapitre}`;
// Les chapitres de l'année qui jouent (ni révision, ni exclus).
const annee = catalogue.filter((c) => c.langue === ici.langue && c.annee === ici.annee && !c.revision && !SANS_JEU.includes(cleDe(c)));
const cleIci = ici && `${ici.langue}/${ici.annee}/${ici.chapitre}`;

// Chapitre de révision : ses mots gardent leur chapitre d'origine (dossier et titre) ; on les regroupe.
function groupesRevision(contenu) {
  const groupes = new Map();
  for (const m of contenu.mots) {
    const cle = (m.dossier || '').replace(/^contenu\/|\/$/g, '');
    if (!cle || SANS_JEU.includes(cle)) continue;
    if (!groupes.has(cle)) groupes.set(cle, { cle, titre: m.chapitre, dossier: m.dossier, mots: [] });
    groupes.get(cle).mots.push(m);
  }
  return [...groupes.values()];
}

// Un chapitre de l'année, lu à la demande : ses mots avec leur indice et leur son, comme dans contenuJeux.
async function chargerGroupe(c) {
  const dossier = cheminChapitre(c.langue, c.annee, c.chapitre);
  const d = lireChapitre(await chargerTexte(`${dossier}chapitre.txt`));
  // Seulement les images (des centaines de sons à vérifier ralentiraient le téléphone) : un son absent ne joue simplement pas.
  const images = await fichiersPresents(d.mots.filter((m) => !/^(texte|couleur):/.test(m.image)).map((m) => cheminImage(m, dossier)));
  return { cle: cleDe(c), titre: c.titre, dossier, mots: d.mots.map((m) => ({ ...m, dossier, ind: indice(m, dossier, images), son: true })) };
}

function possible(contenu) {
  if (contenu.revision) return groupesRevision(contenu).some((g, _, tous) => jouable(g, tous));
  const moi = annee.find((c) => cleDe(c) === cleIci);
  if (!moi || contenu.mots.length < 4) return false;
  return annee.some((c) => compatibles({ cle: cleIci }, { cle: cleDe(c) }));
}

// Petite image à côté du titre (niveau 2) : images/icone.svg ou .png du chapitre, sinon le dessin d'un de ses mots.
async function chercherIcones(groupes) {
  const chemins = groupes.flatMap((g) => [`${g.dossier}images/icone.svg`, `${g.dossier}images/icone.png`]);
  const presents = await fichiersPresents(chemins);
  for (const g of groupes) {
    const src = [`${g.dossier}images/icone.svg`, `${g.dossier}images/icone.png`].find((c) => presents.has(c));
    const dessin = g.mots.find((m) => m.ind.type === 'image' || m.ind.type === 'couleur');
    g.icone = src ? { type: 'image', src } : dessin?.ind;
  }
}

// ---------- Le jeu ----------

if (typeof document !== 'undefined') {
  document.querySelector('svg.sprite')?.insertAdjacentHTML('beforeend',
    '<symbol id="boite" viewBox="0 0 24 24"><path d="M3.5 9 12 5.5 20.5 9v9L12 21.5 3.5 18z"/><path d="M3.5 9 12 12.5 20.5 9M12 12.5v9"/></symbol>');
  if (!document.querySelector('link[href*="jeu-boites.css"]')) {
    document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-boites.css?v=4a69adff' }));
  }
}

async function lancer(zone, contenu) {
  const { langue } = contenu;
  let groupes;
  zone.replaceChildren(el('p', { class: 'bientot-ici' }, icone('boite'), 'Je prépare les boîtes…'));
  try {
    groupes = contenu.revision ? groupesRevision(contenu)
      : [{ cle: cleIci, titre: annee.find((c) => cleDe(c) === cleIci).titre, dossier: contenu.dossier, mots: contenu.mots },
        ...await Promise.all(annee.filter((c) => compatibles({ cle: cleIci }, { cle: cleDe(c) })).map(chargerGroupe))];
  } catch {
    zone.replaceChildren(el('p', { class: 'bientot-ici' }, icone('tourner'), 'Recharge la page pour jouer.'));
    return;
  }
  await chercherIcones(groupes);
  zone.classList.add('zone-boites'); // repère de la pluie d'étoiles de fin
  const themes = contenu.revision ? groupes.filter((g) => jouable(g, groupes)) : [groupes[0]];
  const vus = new Set();
  let rang = 0; // 0 à 5 : 3 manches de niveau 1, puis 3 de niveau 2
  let lecteur = null;

  function poser() {
    if (rang === 2 * MANCHES) {
      arreter();
      bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, 'Tu as rangé tous les mots !'));
      fete(zone); // pluie d'étoiles du site (rien si moins d'animations)
      return;
    }
    const niveau = rang < MANCHES ? 1 : 2;
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const cartes = manche(niveau, theme, groupes, vus);
    cartes.forEach((c) => vus.add(c.mot));
    let aTrouver = cartes.filter((c) => c.bon).length;
    let erreurs = 0;

    const titre = niveau === 1
      ? el('h2', { class: 'consigne', tabindex: '-1' }, icone('boite'), 'Touche celui qui est différent.')
      // La petite image du chapitre (icone.svg, ou le dessin d'un de ses mots) se met à côté de son titre.
      : el('h2', { class: 'consigne', tabindex: '-1' }, theme.icone ? el('span', { class: 'icone-theme', 'aria-hidden': 'true' }, visuel({ mot: '' }, theme.icone, langue)) : icone('boite'),
        el('span', {}, 'Touche tout ce qui va avec « ', el('span', { lang: langue }, theme.titre), ' ».'));
    const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
    const av = avatar('neutre');
    av.hidden = true; // l'avatar n'apparaît qu'après une réponse
    const suite = el('div', { class: 'suite-boites' });
    const dire = (ic, txt, pose) => { retour.replaceChildren(icone(ic), txt); av.pose(pose); };

    const boutons = [];
    cartes.forEach((c) => {
      const b = el('button', { type: 'button', class: 'reponse carte-boite' },
        visuel(c.mot, c.mot.ind, langue), el('span', { class: 'mot-boite', lang: langue }, c.mot.mot));
      b.style.setProperty('--i', boutons.length); // les cartes arrivent l'une après l'autre (CSS)
      b.addEventListener('click', () => toucher(c, b));
      boutons.push(b);
    });

    function toucher(c, b) {
      // Le mot est dit à chaque toucher (juste après le geste de l'enfant : permis sur iPhone). Un seul son à la fois.
      if (!muet && c.mot.son) {
        lecteur = creerLecteur(cheminSon(c.mot, contenu.dossier), { nom: c.mot.mot });
        lecteur.jouer();
      }
      boutons.forEach((x) => { x.classList.remove('faux'); if (!x.classList.contains('juste')) x.querySelector('.marque-ex')?.remove(); });
      if (!c.bon) {
        void b.offsetWidth; // la même carte touchée deux fois : le balancement repart
        b.classList.add('faux');
        b.append(el('span', { class: 'marque-ex' }, icone('croix')));
        erreurs += 1;
        // Après deux erreurs, une bonne carte reçoit un cadre épais (fixe).
        if (erreurs >= 2) boutons.find((x, k) => cartes[k].bon && !x.classList.contains('juste'))?.classList.add('aide');
        return dire('tourner', 'Essaie encore !', 'reflechit');
      }
      b.classList.remove('aide');
      b.classList.add('juste');
      b.disabled = true;
      b.append(el('span', { class: 'marque-ex' }, icone('coche')));
      erreurs = 0;
      aTrouver -= 1;
      if (aTrouver > 0) return dire('sourire', bravo(), 'content');
      dire('etoile', bravo(), 'bravo');
      boutons.forEach((x) => { x.disabled = true; });
      grille.classList.add('finie'); // les cartes qui restent pâlissent doucement
      const suivant = el('button', { type: 'button', class: 'action' }, rang === 2 * MANCHES - 1 ? 'Terminer' : 'Continuer', icone('droite'));
      suivant.addEventListener('click', () => { rang += 1; poser(); });
      suite.replaceChildren(suivant);
      suivant.focus();
    }

    const grille = el('div', { class: `reponses visuels boites n${cartes.length}` }, ...boutons);
    // Bandeau « Niveau 2 » : il glisse en place à la 4e manche, puis reste.
    const bandeau = niveau === 2 ? el('p', { class: `niveau-boites${rang === MANCHES ? ' nouveau' : ''}` }, icone('etoile'), 'Niveau 2') : '';
    zone.replaceChildren(el('div', { class: 'exercice boites' },
      compteur(rang + 1, 2 * MANCHES), bandeau, titre, grille,
      el('div', { class: 'message-ex' }, av, retour), suite));
    if (rang) titre.focus();
  }
  poser();
}

export default {
  id: 'boites',
  nom: 'Chacun sa boîte',
  icone: 'boite',
  // Au moins 4 mots ici et un autre chapitre de l'année qu'on peut mélanger avec celui-ci (ou, en révision, deux chapitres).
  possible,
  lancer,
};
