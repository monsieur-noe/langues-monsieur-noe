// Jeu « Devinette à indices » (jeu 8 du document de l'enseignant, 2026-11-08) : une carte mystère cache un mot.
// L'enfant demande des indices quand il veut, toujours dans le même ordre, et choisit le mot parmi 4 boutons.
// Aucun compte des indices utilisés : ce n'est pas un score. Rien n'est enregistré.
import { el, icone, muet } from './outils.js?v=16a7b2c4';
import { cheminSon, chargerTexte, lireCatalogue, lireChapitre, cheminChapitre } from './donnees.js?v=16a7b2c4';
import { creerLecteur, arreter } from './audio.js?v=16a7b2c4';
import { visuel } from './cartes.js?v=16a7b2c4';
import { melanger, tirer, bilanEntraine, compteur, bravo, fete, article, sansArticle } from './exercices.js?v=16a7b2c4';
import { avatar } from './avatar.js?v=16a7b2c4';

const NOMBRE = 6;
const CHOIX = 4;

// ---------- Logique (testée dans tests/devinette.test.js) ----------

const nbLettres = (mot) => sansArticle(mot).replace(/[^\p{L}]/gu, '').length;
// Les phrases rangées parmi les mots (« Het regent. » dans Het weer) sont laissées de côté (décision du 2026-11-08).
const estPhrase = (mot) => /[.!?…]/.test(mot);
// L'indice 4 ne doit jamais être le mot lui-même : sans dessin, couleur ni chiffre, il faut le français.
export const utilisables = (mots) => mots.filter((m) => !estPhrase(m.mot) && nbLettres(m.mot) >= 2 && (m.ind.type !== 'francais' || m.francais));

// Indices de ce mot, dans l'ordre du document : cases, article (noms seulement), première lettre, dessin, son.
// Sans son (version muette ou son absent), le français remplace le son s'il n'a pas déjà servi d'indice 4.
export function indicesDe(m) {
  const liste = ['cases'];
  if (article(m.mot)) liste.push('article');
  liste.push('lettre', 'dessin');
  if (m.son) liste.push('son');
  else if (m.ind.type !== 'francais' && m.francais) liste.push('francais');
  return liste;
}

const cle = (m) => (m.ind ? `${m.ind.type}:${m.ind.src || m.ind.fond || m.ind.texte}` : '');

// 3 leurres de longueur proche : d'abord ceux du chapitre, puis ceux des autres chapitres de l'année.
// Jamais le même mot, ni un mot qui a le même indice (« een » et « één » montrent tous deux « 1 »).
export function leurres(cible, chapitre, annee, n = CHOIX - 1) {
  const vus = new Set([sansArticle(cible.mot).toLowerCase()]);
  const candidats = [...chapitre.map((m) => [m, 0]), ...annee.map((m) => [m, 0.5])]
    .filter(([m]) => !estPhrase(m.mot) && m !== cible && !(cle(m) && cle(m) === cle(cible)))
    .map(([m, loin]) => [m, Math.abs(nbLettres(m.mot) - nbLettres(cible.mot)) + loin + Math.random() * 0.4])
    .sort((a, b) => a[1] - b[1]);
  const sortie = [];
  for (const [m] of candidats) {
    const t = sansArticle(m.mot).toLowerCase();
    if (sortie.length === n) break;
    if (!vus.has(t)) { vus.add(t); sortie.push(m); }
  }
  return sortie;
}

// ---------- Mots des autres chapitres de la même année (pour les leurres) ----------

const motsAnnee = new Map();
function chargerAnnee({ langue, annee, dossier }) {
  const k = `${langue}/${annee}`;
  if (!motsAnnee.has(k)) {
    motsAnnee.set(k, chargerTexte('contenu/catalogue.txt').then(async (texte) => {
      const chapitres = lireCatalogue(texte).chapitres
        .map((c) => cheminChapitre(c.langue, c.annee, c.chapitre))
        .filter((d) => d.startsWith(`contenu/${k}/`) && d !== dossier);
      const lus = await Promise.all(chapitres.map((d) => chargerTexte(`${d}chapitre.txt`).then((t) => lireChapitre(t).mots, () => [])));
      return lus.flat();
    }).catch(() => []));
  }
  return motsAnnee.get(k);
}

// ---------- Affichage ----------

let styleCharge = false;
function preparerPage() {
  if (styleCharge) return;
  styleCharge = true;
  document.head.append(el('link', { rel: 'stylesheet', href: 'css/jeu-devinette.css?v=16a7b2c4' }));
}

// Pictogramme du menu et de la carte mystère : une carte avec un point d'interrogation (dessiné par Claude).
if (typeof document !== 'undefined' && !document.getElementById('devinette')) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'symbol');
  s.id = 'devinette';
  s.setAttribute('viewBox', '0 0 24 24');
  s.innerHTML = '<rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.7M12 17.2v.1"/>';
  document.querySelector('svg.sprite')?.append(s);
}

// Cases des lettres : une case par lettre, groupées par mot ; tiret et apostrophe restent écrits.
function cases(mot) {
  const groupes = sansArticle(mot).split(/\s+/).map((g) => el('span', { class: 'groupe-dv' },
    ...[...g].map((c) => (/\p{L}/u.test(c) ? el('span', { class: 'case-dv' }) : el('span', { class: 'signe-dv' }, c)))));
  const n = nbLettres(mot);
  const ligne = el('div', { class: 'cases-dv', role: 'img', 'aria-label': `${n} lettres` }, ...groupes);
  // Le plus long mot tient sur une ligne, même à 360 px : la largeur des cases en dépend.
  ligne.style.setProperty('--n', Math.max(...groupes.map((g) => g.children.length)));
  return ligne;
}

function remplir(ligne, mot, tout) {
  const lettres = [...sansArticle(mot)].filter((c) => /\p{L}/u.test(c));
  const cases = [...ligne.querySelectorAll('.case-dv')];
  cases.forEach((c, k) => {
    if (!tout && k > 0) return;
    c.textContent = lettres[k];
    // Les lettres s'écrivent une à une, de gauche à droite (0,5 s en tout, même pour un mot long).
    c.classList.remove('ecrit-dv');
    void c.offsetWidth;
    c.style.animationDelay = tout ? `${(k * 0.4) / cases.length}s` : '0s';
    c.classList.add('ecrit-dv');
  });
  ligne.setAttribute('aria-label', tout ? sansArticle(mot) : `${lettres.length} lettres, commence par ${lettres[0]}`);
}

function question(m, ctx, annee, rang, fin) {
  const { langue, dossier } = ctx;
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone('devinette'), 'Demande un indice, puis choisis le mot.');
  const mystere = el('span', { class: 'mystere-dv' }, icone('devinette'));
  const haut = el('div', { class: 'haut-dv' });
  const art = el('span', { class: 'article-dv', lang: langue, hidden: '' }, article(m.mot));
  const ligne = cases(m.mot);
  const rangee = el('div', { class: 'rangee-dv', hidden: '' }, art, ligne);
  const bas = el('div', { class: 'bas-dv' });
  const carte = el('div', { class: 'carte-dv', 'aria-live': 'polite' }, mystere, haut, rangee, bas);

  const etapes = indicesDe(m);
  let montres = 0;
  let lecteur = null;
  const bouton = el('button', { type: 'button', class: 'action indice-dv' }, icone('loupe'), 'Un indice');
  // Ce qui vient d'apparaître glisse un peu en arrivant (CSS, coupé si l'appareil demande moins d'animations).
  const arrive = (x) => x?.classList.add('arrive-dv');
  function montrer(e) {
    if (!mystere.hidden) carte.classList.add('tourne-dv'); // premier indice : la carte se retourne
    mystere.hidden = true;
    if (e === 'cases') rangee.hidden = false;
    if (e === 'article') { art.hidden = false; arrive(art); }
    if (e === 'lettre') remplir(ligne, m.mot, false);
    if (e === 'dessin') {
      const v = visuel(m, m.ind, langue);
      // Le texte de remplacement donnerait la réponse.
      if (v.tagName === 'IMG') v.alt = 'Dessin du mot';
      if (v.classList.contains('carre')) v.setAttribute('aria-label', 'Couleur du mot');
      haut.replaceChildren(v);
      arrive(v);
    }
    if (e === 'son' && !lecteur) {
      lecteur = creerLecteur(cheminSon(m, dossier), { nom: 'le mot caché' });
      bas.replaceChildren(lecteur);
      arrive(lecteur);
      lecteur.jouer(); // juste après le toucher de l'enfant (permis sur iPhone)
    }
    if (e === 'francais') { bas.replaceChildren(el('p', { class: 'fr-dv' }, 'En français : ', el('strong', {}, m.francais))); arrive(bas.firstChild); }
  }
  bouton.addEventListener('click', () => {
    montrer(etapes[montres]);
    montres += 1;
    if (montres === etapes.length) bouton.hidden = true;
  });

  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  const av = avatar('neutre');
  av.hidden = true; // l'avatar n'apparaît qu'après une réponse
  const message = el('div', { class: 'message-ex' }, av, retour);
  const dire = (ic, txt, pose) => { retour.replaceChildren(icone(ic), txt); av.pose(pose); };
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === NOMBRE ? 'Terminer' : 'Suivant', icone('droite'));
  suite.addEventListener('click', fin);

  const mots = melanger([m, ...leurres(m, ctx.mots, annee)]);
  const long = mots.some((x) => x.mot.length > 9); // au-delà, deux colonnes coupent le mot à 360 px
  let erreurs = 0;
  const boutons = mots.map((x) => {
    const b = el('button', { type: 'button', class: 'reponse' }, el('span', { class: 'mot', lang: langue }, x.mot));
    b.juste = x === m;
    b.addEventListener('click', () => {
      b.disabled = true;
      b.classList.add(b.juste ? 'juste' : 'faux');
      b.prepend(el('span', { class: 'marque-ex' }, icone(b.juste ? 'coche' : 'croix')));
      if (!b.juste) {
        erreurs += 1;
        // Après deux erreurs, la bonne réponse reçoit un cadre épais, fixe.
        if (erreurs === 2) boutons.find((y) => y.juste).classList.add('cadre-dv');
        return dire('tourner', 'Essaie encore !', 'reflechit');
      }
      for (const y of boutons) y.disabled = true;
      bouton.hidden = true;
      // Le mot complet s'affiche (et le dessin s'il n'était pas encore là), puis il est dit.
      mystere.hidden = true;
      rangee.hidden = false;
      if (art.hidden) { art.hidden = false; arrive(art); }
      remplir(ligne, m.mot, true);
      carte.classList.add('trouve-dv');
      if (!haut.firstChild) montrer('dessin');
      dire('sourire', bravo(), 'content');
      if (m.son) {
        if (!lecteur) { lecteur = creerLecteur(cheminSon(m, dossier), { nom: m.mot }); bas.replaceChildren(lecteur); }
        lecteur.jouer();
      }
      suite.hidden = false;
      suite.focus();
    });
    return b;
  });

  const zone = el('div', { class: 'exercice devinette' },
    el('div', { class: 'tete-ex' }, titre, compteur(rang, NOMBRE)),
    carte, bouton,
    el('div', { class: `reponses ${long ? 'long-dv' : 'n2'}` }, ...boutons),
    message, suite);
  zone.titre = titre;
  return zone;
}

function lancer(zone, contenu) {
  preparerPage();
  // Le chapitre a toujours assez de mots pour les leurres : on n'attend pas ceux de l'année, ils servent dès qu'ils arrivent.
  let annee = [];
  chargerAnnee(contenu).then((mots) => { annee = mots; });
  const plan = tirer(utilisables(contenu.mots), NOMBRE);
  let i = 0;
  function suivante() {
    arreter();
    if (i === plan.length) {
      bilanEntraine(zone, () => lancer(zone, contenu), 'bravo', el('p', {}, `Tu as deviné les ${NOMBRE} mots !`));
      return fete(zone.querySelector('.bilan')); // pluie d'étoiles du site (rien si l'appareil demande moins d'animations)
    }
    i += 1;
    const q = question(plan[i - 1], contenu, annee, i, suivante);
    zone.replaceChildren(q);
    if (i > 1) q.titre.focus();
  }
  suivante();
}

export default {
  id: 'devinette',
  nom: 'Devinette à indices',
  icone: 'devinette',
  // Au moins 6 mots avec un indice (dessin, couleur, chiffre ou français) dans le chapitre.
  possible: (contenu) => utilisables(contenu.mots).length >= NOMBRE,
  lancer,
};
