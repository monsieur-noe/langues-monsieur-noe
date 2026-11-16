// Page de contrôle de l'enseignant : relit le catalogue et chaque chapitre avec le même code que le site,
// puis dit, chapitre par chapitre, ce qui va (✔), ce qui est à vérifier (⚠) et ce qui est à corriger (✖). Cahier 7.6.
import { lireCatalogue, lireChapitre, chargerTexte, cheminChapitre, fichiersPresents, cheminSon, puiser } from './donnees.js?v=cec4fc40';
import { chercherFichiers, cheminImage } from './cartes.js?v=cec4fc40';
import { disponibles, motSecret, piecesDates, datesPossibles } from './exercices.js?v=cec4fc40';
import { creerLecteur } from './audio.js?v=cec4fc40';
import { el } from './outils.js?v=cec4fc40';
import { variantesNom, conseilNom, variantesManquantes, taille, LIMITE_DICTEE } from './controle.js?v=cec4fc40';

const RACINE = '../'; // la page est dans controle/, le contenu à côté

// Demandes au serveur (2026-11-14) : la page vérifie quelque 3 000 fichiers ; envoyées toutes ensemble, GitHub
// en refusait une partie (« trop de demandes », code 429), comptées à tort comme fichiers introuvables.
// Ici seulement : 6 demandes à la fois ; un refus (429, panne du serveur, coupure) est retenté 5 fois, de plus en
// plus tard (0,5 à 8 s) ; s'il dure, le fichier est « pas vérifié », jamais « introuvable ». Seul 404 dit « absent ».
const EN_MEME_TEMPS = 6;
const ESSAIS = 5;
const nonVerifies = new Set();
const fetchDuSite = window.fetch.bind(window);
const attente = [];
let enCours = 0;
const pause = (ms) => new Promise((r) => { setTimeout(r, ms); });
async function prendrePlace() {
  while (enCours >= EN_MEME_TEMPS) await new Promise((r) => { attente.push(r); });
  enCours += 1;
}
function rendrePlace() {
  enCours -= 1;
  attente.shift()?.();
}
window.fetch = async (chemin, options) => {
  for (let essai = 1; ; essai += 1) {
    await prendrePlace();
    let reponse;
    let panne = null;
    try {
      reponse = await fetchDuSite(chemin, options);
    } catch (e) {
      panne = e;
    } finally {
      rendrePlace();
    }
    if (!panne && reponse.status !== 429 && reponse.status < 500) return reponse;
    if (essai === ESSAIS) {
      nonVerifies.add(String(chemin));
      if (panne) throw panne;
      return reponse;
    }
    await pause(500 * 2 ** (essai - 1));
  }
};
const RANG = { ok: 0, attention: 1, erreur: 2 };
const PASTILLES = { ok: ['✔', 'Tout va bien'], attention: ['⚠', 'À vérifier'], erreur: ['✖', 'À corriger'] };

const nombre = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;

function pastille(etat) {
  const [signe, nom] = PASTILLES[etat];
  return el('span', { class: `etat ${etat}`, role: 'img', 'aria-label': nom, title: nom }, signe);
}

// Un constat : pastille, phrase, détails éventuels.
function constat(etat, titre, details = []) {
  return {
    etat,
    li: el('li', { class: 'constat' }, pastille(etat), el('div', {},
      el('p', {}, titre),
      details.length ? el('ul', {}, ...details.map((d) => el('li', {}, d))) : '')),
  };
}

// Fichiers attendus du chapitre (chemins dans son dossier). `obligatoire` : l'absence est à signaler.
// Une image sans 4e colonne n'est pas obligatoire (les images viennent plus tard), mais un nom voisin trouvé est signalé.
// `dossier` : celui du chapitre, ou celui du chapitre d'origine pour ce qu'il reprend (ligne « reprend: »).
function attendus(donnees, vignette, dossier) {
  const { mots, phrases, pistes, dictees, descriptions } = donnees;
  return [
    ...[...mots, ...phrases, ...pistes, ...dictees.filter((d) => !d.dates), ...descriptions, ...donnees.heures].map((x) => ({ chemin: `audio/${x.id}.m4a`, id: x.id, obligatoire: true, dossier: x.dossier || dossier })),
    ...mots.filter((m) => !/^(texte|couleur):/.test(m.image)).map((m) => ({ chemin: cheminImage(m, ''), id: m.id, obligatoire: !!m.image, dossier: m.dossier || dossier })),
    // « Qui est-ce ? » : le dessin de chaque personne décrite.
    ...descriptions.map((d) => ({ chemin: `images/${d.id}.png`, id: d.id, obligatoire: true, dossier: d.dossier || dossier })),
    ...(vignette ? [{ chemin: `images/${vignette}`, id: `vignette ${vignette}`, obligatoire: true, dossier }] : []),
    // Décor du combat de boss (ligne « arene: »), dans le dossier commun contenu/arene/.
    ...(donnees.arene ? ['', '-difficile'].map((v) => ({ chemin: `arene/${donnees.arene}${v}.jpg`, id: `arène ${donnees.arene}${v}.jpg`, obligatoire: true, dossier: `${RACINE}contenu/` })) : []),
  ];
}

// Audios ou images absents : nom voisin trouvé -> conseil précis ; sinon, liste des identifiants.
async function fichiersManquants(absents, quoi) {
  if (!absents.length) return [];
  const conseils = [];
  const introuvables = [];
  const pasVerifies = [];
  await Promise.all(absents.map(async (a) => {
    if (nonVerifies.has(a.dossier + a.chemin)) { // le serveur n'a pas répondu : on ne sait pas
      pasVerifies.push(a.id);
      return;
    }
    const voisins = variantesNom(a.chemin);
    const trouves = await fichiersPresents(voisins.map((v) => a.dossier + v));
    const trouve = voisins.find((v) => trouves.has(a.dossier + v));
    if (trouve) conseils.push(conseilNom(a.chemin, trouve));
    else if (a.obligatoire) introuvables.push(a.id);
  }));
  if (introuvables.length) {
    conseils.push(`Introuvables : ${introuvables.join(', ')}. Vérifie les majuscules, les accents, les espaces et l'extension.`);
  }
  if (pasVerifies.length) {
    conseils.push(`Pas pu vérifier, le serveur était trop occupé : ${pasVerifies.join(', ')}. Recharge la page dans quelques minutes.`);
  }
  return conseils.length ? [constat('attention', quoi, conseils)] : [];
}

// Mots secrets des 7 derniers jours : pour vérifier le mot qu'un élève montre en classe.
function motsSecrets(mots, langue) {
  if (!mots.length) return '';
  const jours = [0, 1, 2, 3, 4, 5, 6].map((k) => {
    const d = new Date();
    d.setDate(d.getDate() - k);
    const nom = k ? d.toLocaleDateString('fr-BE', { weekday: 'long', day: 'numeric', month: 'long' }) : 'aujourd\'hui';
    return el('li', {}, `${nom} : `, el('strong', { lang: langue }, motSecret(mots, d)));
  });
  return el('div', { class: 'secrets' }, el('p', {}, 'Mots secrets (fin de « Je vérifie ») :'), el('ul', {}, ...jours));
}

// Écouter les sons du chapitre (v1.84, pour vérifier ses enregistrements) : mots, phrases, descriptions et heures,
// avec leur texte et le nom du fichier ; « Tout écouter à la suite » les enchaîne (une pause arrête la suite).
// Dictées et pistes, longues, n'y sont pas. Les lecteurs ne sont créés qu'à l'ouverture (pas de téléchargement avant).
function ecouteSons(donnees, dossier, presents) {
  const sons = [...donnees.mots, ...donnees.phrases, ...donnees.descriptions, ...donnees.heures]
    .filter((x) => presents.has(cheminSon(x, dossier)));
  if (!sons.length) return '';
  const bloc = el('details', { class: 'ecoute-sons' }, el('summary', {}, `Écouter les sons (${sons.length})`));
  bloc.addEventListener('toggle', () => {
    if (!bloc.open || bloc.querySelector('ol')) return;
    const lignes = sons.map((x) => {
      const lecteur = creerLecteur(cheminSon(x, dossier), { nom: x.id, lent: false });
      return el('li', {}, lecteur, el('span', { lang: donnees.langue }, x.mot || x.phrase || x.titre || x.texte || x.id), ' ', el('small', {}, `${x.id}.m4a`));
    });
    const tout = el('button', { type: 'button', class: 'action secondaire' }, 'Tout écouter à la suite');
    let suite = false;
    const jouer = (k) => {
      lignes.forEach((l, j) => l.classList.toggle('en-cours', j === k));
      if (k >= lignes.length) { suite = false; return; }
      lignes[k].scrollIntoView({ block: 'nearest' });
      lignes[k].firstChild.jouer();
    };
    lignes.forEach((l, k) => l.firstChild.addEventListener('fin', () => { if (suite) jouer(k + 1); }));
    tout.addEventListener('click', () => { suite = true; jouer(0); });
    bloc.append(tout, el('ol', {}, ...lignes));
  });
  return bloc;
}

async function controlerChapitre(c) {
  const relatif = cheminChapitre(c.langue, c.annee, c.chapitre);
  const dossier = RACINE + relatif;
  const fichier = `${relatif}chapitre.txt`;
  const titre = el('h2', {}, `${c.titre} `, el('span', { class: 'sous-titre' }, `(${c.langue} · ${c.annee} · ${c.chapitre})`));

  let donnees;
  try {
    donnees = lireChapitre(await chargerTexte(RACINE + fichier), fichier);
    await puiser(donnees, c.langue, c.annee, RACINE); // chapitre de révision : ses sons et images restent dans les autres chapitres
  } catch {
    return carte('erreur', titre, [constat('erreur', `Le fichier ${fichier} est introuvable.`, [
      `Vérifie que le dossier du chapitre s'appelle exactement « ${c.chapitre} », comme dans catalogue.txt, et qu'il contient chapitre.txt.`,
    ])]);
  }

  const constats = [];
  if (donnees.erreurs.length) {
    constats.push(constat('erreur', `Erreurs dans ${fichier} (ces lignes sont ignorées par le site) :`,
      donnees.erreurs.map((e) => (e.ligne ? `ligne ${e.ligne} : ${e.message}` : e.message))));
  }

  const tous = attendus(donnees, c.vignette, dossier);
  const { presents, indices } = await chercherFichiers(donnees, dossier, tous.map((a) => a.dossier + a.chemin));
  const absents = tous.filter((a) => !presents.has(a.dossier + a.chemin));
  constats.push(...await fichiersManquants(absents.filter((a) => a.chemin.startsWith('audio/')), 'Audios mal nommés ou manquants :'));
  constats.push(...await fichiersManquants(absents.filter((a) => /^(images|arene)\//.test(a.chemin)), 'Images mal nommées ou manquantes :'));

  // Dictées trop lourdes (3 Mo au plus) : plus longues à charger sur un vieux téléphone.
  const lourdes = [];
  await Promise.all(donnees.dictees.filter((d) => !d.dates).map(async (d) => {
    const t = await taille(cheminSon(d, dossier));
    if (t > LIMITE_DICTEE) lourdes.push(`${d.id} : ${(Math.ceil(t / 1024 / 102.4) / 10).toFixed(1).replace('.', ',')} Mo. Demande à Claude de réduire le fichier.`);
  }));
  if (lourdes.length) constats.push(constat('attention', 'Dictées de plus de 3 Mo :', lourdes));

  // Variantes d'exercice : même calcul que les pages d'exercices.
  const aSon = (x) => presents.has(cheminSon(x, dossier));
  const n = c.annee === 'p3' ? 3 : 4;
  const mots = donnees.mots.map((m, k) => ({ ...m, ind: indices[k], son: aSon(m) }));
  const phrases = donnees.phrases.map((p) => ({ ...p, son: aSon(p) }));
  const manque = variantesManquantes(disponibles(mots, phrases, n, c.annee === 'grammaire'), mots, phrases, n)
    .filter((m) => c.langue === 'nl' || !m.nom.includes('De ou het')); // pas de sens hors du néerlandais
  const aCorriger = manque.filter((m) => !m.normal);
  const detail = manque.map((m) => `${m.nom} : ${m.message}`);
  constats.push(aCorriger.length
    ? constat('attention', 'Exercices pas proposés aux élèves :', detail)
    : constat('ok', 'Tous les exercices possibles sont proposés.', detail));
  if (donnees.dictees.some((d) => d.dates) && !datesPossibles(piecesDates(mots))) {
    constats.push(constat('attention', 'Dictée de dates pas proposée : il faut des jours, des mois et des nombres de 1 à 31 (texte:), avec leur son.'));
  }

  if (donnees.mots.length < 4) constats.push(constat('attention', `Seulement ${donnees.mots.length} mots : il en faut au moins 4.`));

  const audios = attendus(donnees, '', dossier).filter((a) => a.chemin.startsWith('audio/'));
  const nbAudios = audios.filter((a) => presents.has(a.dossier + a.chemin)).length;

  const compteurs = el('p', { class: 'compteurs' },
    `${nombre(donnees.mots.length, 'mot')} · ${nombre(donnees.phrases.length, 'phrase')} · ${nombre(donnees.dictees.length, 'dictée')} · ${nbAudios} sur ${nombre(audios.length, 'audio')} présents`);

  const pire = constats.reduce((a, k) => (RANG[k.etat] > RANG[a] ? k.etat : a), 'ok');
  if (pire === 'ok') constats.unshift(constat('ok', 'Aucune erreur, aucun fichier manquant.'));
  // Ouvre le chapitre tel que les élèves le voient, dans un nouvel onglet (la page de contrôle reste ouverte).
  const voir = el('p', {}, el('a', { class: 'action secondaire', target: '_blank',
    href: `${RACINE}chapitre.html?langue=${c.langue}&annee=${c.annee}&chapitre=${c.chapitre}` }, 'Voir comme un élève'));
  return carte(pire, titre, constats, compteurs, motsSecrets(donnees.mots, c.langue), voir, ecouteSons({ ...donnees, langue: c.langue }, dossier, presents));
}

function carte(etat, titre, constats, compteurs = '', secrets = '', voir = '', ecoute = '') {
  titre.prepend(pastille(etat), ' ');
  return el('section', { class: 'fiche controle-chapitre' }, titre, compteurs, voir,
    el('ul', { class: 'constats' }, ...constats.map((k) => k.li)), secrets, ecoute);
}

async function demarrer() {
  const zone = document.getElementById('resultats');
  let catalogue;
  try {
    catalogue = lireCatalogue(await chargerTexte(`${RACINE}contenu/catalogue.txt`));
  } catch {
    zone.replaceChildren(el('section', { class: 'fiche controle-chapitre' }, el('ul', { class: 'constats' },
      constat('erreur', 'Le fichier contenu/catalogue.txt est introuvable.', ['Vérifie qu\'il existe dans le dossier contenu/ et qu\'il s\'appelle exactement catalogue.txt.']).li)));
    return;
  }
  const parties = [];
  if (catalogue.erreurs.length) {
    parties.push(el('section', { class: 'fiche controle-chapitre' },
      el('h2', {}, pastille('erreur'), ' Catalogue'),
      el('ul', { class: 'constats' }, constat('erreur', 'Erreurs dans contenu/catalogue.txt (ces chapitres n\'apparaissent pas sur le site) :',
        catalogue.erreurs.map((e) => `ligne ${e.ligne} : ${e.message}`)).li)));
  }
  parties.push(...await Promise.all(catalogue.chapitres.map(controlerChapitre)));
  zone.replaceChildren(...parties);
}

demarrer();
