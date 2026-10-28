// Exercice « Couleurs » de « Je m'entraîne » (cahier 7.4, v1.15) : un dessin du chapitre repeint dans une couleur
// d'un autre chapitre (ligne « couleurs: kleuren » de chapitre.txt), et la phrase « De ____ is ____. » à compléter :
// le moyen de transport parmi 5 mots, la couleur parmi 5 mots. Seconde chance pour chaque trou.
// Seuls les dessins SVG dont une partie est marquée class="teinte" peuvent être repeints.
import { el, icone } from './outils.js?v=c16b4cc5';
import { creerLecteur } from './audio.js?v=c16b4cc5';
import { lireChapitre, chargerTexte, cheminChapitre, couleurIndice, fichiersPresents } from './donnees.js?v=c16b4cc5';
import { melanger, tirer, propositions, article, sansArticle, bilanEntraine, serieARepasser, compteur, bravo } from './exercices.js?v=c16b4cc5';
import { avatar } from './avatar.js?v=c16b4cc5';

const NOMBRE = 10;
const CHOIX = 5;

// Questions : chaque dessin une fois avant toute répétition ; jamais deux fois la même couleur de suite.
export function planCouleurs(vehicules, couleurs, nombre) {
  let avant = null;
  return tirer(vehicules, nombre).map((vehicule) => {
    const couleur = melanger(couleurs.filter((c) => c !== avant))[0];
    avant = couleur;
    return { vehicule, couleur };
  });
}

// Hublots clairs sur une couleur foncée, foncés sur une couleur claire (blanc, jaune, rose…).
export function couleurHublot(fond) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(fond.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1f2a44' : '#dde3ec';
}

// Cherche les dessins repeignables du chapitre et les couleurs de l'autre chapitre.
// Renvoie null (pas d'exercice, sans message à l'enfant) s'il en manque.
export async function preparerCouleurs(donnees, mots, langue, annee) {
  if (!donnees.couleurs) return null;
  const vehicules = [];
  const candidats = mots.filter((m) => m.ind.type === 'image' && m.ind.src.endsWith('.svg') && article(m.mot));
  await Promise.all(candidats.map(async (m) => {
    try {
      const svg = await chargerTexte(m.ind.src);
      if (svg.includes('class="teinte"')) vehicules.push({ ...m, svg });
    } catch {
      // Dessin illisible : il ne sert pas à cet exercice.
    }
  }));
  let couleurs = [];
  try {
    const dossier = cheminChapitre(langue, annee, donnees.couleurs);
    const chapitre = lireChapitre(await chargerTexte(`${dossier}chapitre.txt`));
    const avecFond = chapitre.mots.filter((m) => m.image.startsWith('couleur:') && couleurIndice(m.image))
      .map((m) => ({ ...m, fond: couleurIndice(m.image), audio: `${dossier}audio/${m.id}.m4a` }));
    const presents = await fichiersPresents(avecFond.map((m) => m.audio));
    couleurs = avecFond.map((m) => ({ ...m, son: presents.has(m.audio) }));
  } catch {
    // Chapitre des couleurs introuvable : pas d'exercice (la page de contrôle reste l'outil de l'enseignant).
  }
  return vehicules.length >= 3 && couleurs.length >= 3 ? { vehicules, couleurs } : null;
}

// Le dessin, repeint dans la couleur de la question (dessin intégré à la page, pour pouvoir le colorier).
function dessin(vehicule, fond) {
  const svg = new DOMParser().parseFromString(vehicule.svg, 'image/svg+xml').documentElement;
  for (const p of svg.querySelectorAll('.teinte')) {
    // Le cadre du vélo est un trait (stroke), les carrosseries sont des surfaces (fill).
    p.setAttribute(p.getAttribute('fill') && p.getAttribute('fill') !== 'none' ? 'fill' : 'stroke', fond);
  }
  for (const p of svg.querySelectorAll('.hublot')) p.setAttribute('fill', couleurHublot(fond));
  svg.setAttribute('class', 'image dessin-couleur');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'le dessin à décrire'); // le nom donnerait la réponse
  return document.importNode(svg, true);
}

function question(q, ctx, rang, total, fin) {
  const { langue, dossier } = ctx;
  const art = article(q.vehicule.mot);
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('crayon'), 'Complète la phrase.');
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une réponse
  const message = el('div', { class: 'message-ex' }, av, retour);
  const ecoute = el('div', { class: 'ecoute-couleurs', hidden: '' });
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === total ? 'Terminer' : 'Suivant', icone('droite'));
  let premierCoup = true; // les deux trous trouvés sans erreur ; sinon la question repassera
  suite.addEventListener('click', () => fin(premierCoup));
  const dire = (ic, texte, pose) => { retour.replaceChildren(icone(ic), texte); av.pose(pose); };

  const trous = [el('span', { class: 'trou' }, '…'), el('span', { class: 'trou' }, '…')];
  const groupes = [
    { trou: trous[0], bonne: sansArticle(q.vehicule.mot), pool: ctx.vehicules.map((v) => sansArticle(v.mot)), question: 'Qu\'est-ce que c\'est ?' }, // valable pour tous les chapitres (véhicules, matériel scolaire…)
    { trou: trous[1], bonne: q.couleur.mot, pool: ctx.couleurs.map((c) => c.mot), question: 'Quelle couleur ?' },
  ];
  let finis = 0;

  function terminer() {
    // Les deux trous sont remplis : le mot du dessin, puis la couleur, avec les enregistrements existants.
    const sonV = q.vehicule.son ? creerLecteur(`${dossier}audio/${q.vehicule.id}.m4a`, { nom: q.vehicule.mot }) : null;
    const sonC = q.couleur.son ? creerLecteur(q.couleur.audio, { nom: q.couleur.mot }) : null;
    if (sonV && sonC) sonV.addEventListener('fin', () => sonC.jouer());
    ecoute.replaceChildren(...[sonV, sonC].filter(Boolean));
    ecoute.hidden = !sonV && !sonC;
    (sonV || sonC)?.jouer(); // après un toucher : permis sur iPhone
    if (!premierCoup) suite.firstChild.textContent = 'Suivant'; // elle repassera : pas encore « Terminer »
    suite.hidden = false;
    suite.focus();
  }

  const blocs = groupes.map((g) => {
    let essais = 0;
    const boutons = propositions(g.bonne, [...new Set(g.pool)], CHOIX).map((texte) => {
      const b = el('button', { type: 'button', class: 'reponse mot-phrase', lang: langue }, texte);
      b.juste = texte === g.bonne;
      return b;
    });
    const marquer = (b, juste) => { b.classList.add(juste ? 'juste' : 'faux'); b.prepend(el('span', { class: 'marque-ex' }, icone(juste ? 'coche' : 'croix'))); };
    const remplir = () => {
      g.trou.textContent = g.bonne;
      g.trou.classList.add('rempli');
      for (const x of boutons) x.disabled = true;
      finis += 1;
      if (finis === 2) terminer();
    };
    for (const b of boutons) {
      b.addEventListener('click', () => {
        marquer(b, b.juste);
        b.disabled = true;
        if (b.juste) { dire('sourire', bravo(), 'content'); return remplir(); }
        essais += 1;
        premierCoup = false;
        if (essais < 2) return dire('tourner', 'Essaie encore !', 'reflechit');
        marquer(boutons.find((x) => x.juste), true);
        dire('bulle', 'Voici la bonne réponse.', 'explique');
        remplir();
      });
    }
    return el('div', { class: 'groupe-couleurs' }, el('p', { class: 'question-couleurs' }, g.question),
      el('div', { class: 'choix-couleurs' }, ...boutons));
  });

  const zone = el('div', { class: 'exercice ex-couleurs' },
    el('div', { class: 'tete-ex' }, titre, compteur(rang, total)),
    el('div', { class: 'enonce' }, dessin(q.vehicule, q.couleur.fond)),
    el('p', { class: 'phrase', lang: langue }, `${art[0].toUpperCase()}${art.slice(1)} `, trous[0], ' is ', trous[1], '.'),
    ...blocs, message, ecoute, suite);
  zone.titre = titre;
  zone.suite = suite;
  return zone;
}

// Les questions ratées repassent jusqu'à ce que tout soit réussi (demande du 2026-10-24).
export function lancerCouleurs(zone, ctx) {
  serieARepasser(zone, planCouleurs(ctx.vehicules, ctx.couleurs, NOMBRE),
    (q, rang, total, fin) => question(q, ctx, rang, total, fin),
    () => bilanEntraine(zone, () => lancerCouleurs(zone, ctx)));
}
