// Lecture des fichiers texte de l'enseignant (catalogue.txt et chapitre.txt).
// Chaque erreur dit le fichier, la ligne et comment corriger : l'enseignant
// n'a que ces messages pour comprendre ce qui ne va pas.
import { LANGUES } from './outils.js?v=c16b4cc5';

const ID_VALIDE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Couleurs acceptées par « couleur:<nom> » dans [mots] (cahier 6.2). Un code #RRGGBB marche aussi.
export const COULEURS = {
  red: '#d32f2f', orange: '#f57c00', pink: '#f48fb1', yellow: '#fdd835', black: '#212121', green: '#2e7d32',
  purple: '#8e24aa', blue: '#1e88e5', white: '#ffffff', gray: '#9e9e9e', brown: '#795548',
};

// « couleur:red » -> '#d32f2f' ; « couleur:#C62828 » -> '#c62828' ; nom inconnu -> ''.
export function couleurIndice(valeur) {
  const nom = valeur.slice(8).trim().toLowerCase();
  return COULEURS[nom] || (/^#[0-9a-f]{6}$/.test(nom) ? nom : '');
}

// Colonnes attendues par section : [minimum, maximum, noms pour les messages].
const SECTIONS = {
  mots: [3, 4, 'id | mot | français | image (facultatif)'],
  phrases: [3, 5, 'id | phrase | français | réponse à masquer (facultatif) | autres propositions (facultatif)'],
  pistes: [2, 4, 'id | titre | texte (facultatif) | français (facultatif)'],
  dictees: [3, 4, 'id | titre | texte de la dictée | français (facultatif)'],
  ordre: [2, 4, 'id | cases séparées par « / » | son à écouter à la fin (facultatif) | intrus (facultatif)'],
  descriptions: [2, 3, 'id | texte de la description (« / » = nouvelle phrase) | français (facultatif)'],
};

// Garde les lignes utiles avec leur numéro (lignes vides et # ignorées).
function lignesUtiles(texte) {
  return texte.replace(/^﻿/, '').split(/\r?\n/)
    .map((t, i) => ({ num: i + 1, texte: t.trim() }))
    .filter((l) => l.texte !== '' && !l.texte.startsWith('#'));
}

function colonnes(texte) {
  return texte.split('|').map((c) => c.trim());
}

function erreur(fichier, ligne, message) {
  return { fichier, ligne, message };
}

export function lireCatalogue(texte, fichier = 'contenu/catalogue.txt') {
  const chapitres = [];
  const erreurs = [];
  for (const { num, texte: ligne } of lignesUtiles(texte)) {
    const c = colonnes(ligne);
    if (c.length < 5 || c.length > 6) {
      erreurs.push(erreur(fichier, num, `il faut 5 ou 6 colonnes séparées par « | » (langue | année | chapitre | ordre | titre | vignette), il y en a ${c.length}. Vérifie qu'il ne manque pas un « | ».`));
      continue;
    }
    const [langue, annee, chapitre, ordre, titre, vignette = ''] = c;
    // Une langue inconnue de l'accueil rendrait le chapitre invisible, sans autre message.
    if (!LANGUES.some((l) => l.code === langue)) {
      erreurs.push(erreur(fichier, num, `la langue « ${langue} » n'est pas reconnue. Écris ${LANGUES.map((l) => `« ${l.code} »`).join(' ou ')}, en minuscules.`));
      continue;
    }
    if (!/^p[1-6]$/.test(annee)) {
      erreurs.push(erreur(fichier, num, `l'année « ${annee} » n'est pas reconnue. Écris par exemple « p3 » ou « p4 », en minuscules.`));
      continue;
    }
    if (!ID_VALIDE.test(chapitre)) {
      erreurs.push(erreur(fichier, num, `le nom de chapitre « ${chapitre} » doit être en minuscules, sans accent ni espace, avec des tirets (exemple : kleren-1).`));
      continue;
    }
    if (!/^\d+$/.test(ordre)) {
      erreurs.push(erreur(fichier, num, `l'ordre « ${ordre} » doit être un nombre entier (exemple : 4).`));
      continue;
    }
    if (titre === '') {
      erreurs.push(erreur(fichier, num, 'le titre affiché est vide. Écris le titre dans la 5e colonne.'));
      continue;
    }
    chapitres.push({ langue, annee, chapitre, ordre: Number(ordre), titre, vignette });
  }
  chapitres.sort((a, b) => a.ordre - b.ordre);
  return { chapitres, erreurs };
}

// Où commence la réponse à masquer dans la phrase (-1 si absente), sans tenir compte des majuscules.
// Le mot entier d'abord : « de » ne doit pas être pris dans « rode ».
// (Sans « lookbehind » dans l'expression : Safari ne le connaît qu'à partir d'iOS 16.4.)
export function positionReponse(phrase, reponse) {
  const [p, r] = [phrase.toLowerCase(), reponse.toLowerCase()];
  const lettre = (c) => /[\p{L}\p{N}]/u.test(c || '');
  for (let i = p.indexOf(r); i >= 0; i = p.indexOf(r, i + 1)) {
    if (!lettre(p[i - 1]) && !lettre(p[i + r.length])) return i;
  }
  return p.indexOf(r);
}

export function lireChapitre(texte, fichier = 'chapitre.txt') {
  const resultat = { titre: '', quizlet: [], note_parents: '', couleurs: '', boss: '', mots: [], phrases: [], pistes: [], dictees: [], ordre: [], descriptions: [], erreurs: [] };
  const err = (num, message) => resultat.erreurs.push(erreur(fichier, num, message));
  const ids = new Map(); // id -> ligne, pour repérer les doublons dans tout le chapitre
  let section = null;
  let liste = ''; // liste en cours dans [mots] ou [phrases] (ligne « liste: »), remise à zéro à chaque section

  for (const { num, texte: ligne } of lignesUtiles(texte)) {
    const titreSection = ligne.match(/^\[(.*)\]$/);
    if (titreSection) {
      section = titreSection[1].trim().toLowerCase();
      liste = '';
      if (!SECTIONS[section]) {
        err(num, `la section « [${titreSection[1]}] » est inconnue. Les sections possibles sont [mots], [phrases], [pistes], [dictees], [ordre] et [descriptions].`);
        section = 'inconnue';
      }
      continue;
    }

    if (section === null) {
      // En-tête : lignes « clé: valeur » avant la première section.
      const m = ligne.match(/^([a-z_]+)\s*:\s*(.*)$/);
      if (!m) {
        err(num, 'cette ligne n\'est pas comprise. Avant [mots], on écrit seulement « titre: », « quizlet: », « note_parents: », « couleurs: » ou « boss: ».');
      } else if (m[1] === 'quizlet') {
        // Plusieurs lignes possibles, chacune « quizlet: lien » ou « quizlet: nom | lien » (demande du 2026-10-26).
        const [nom, lien] = m[2].includes('|') ? colonnes(m[2]) : ['', m[2].trim()];
        resultat.quizlet.push({ nom, lien });
      } else if (['titre', 'note_parents', 'couleurs', 'boss'].includes(m[1])) {
        resultat[m[1]] = m[2].trim();
      } else if (m[1] !== 'video') { // « video: » est prévu pour P5-P6, ignoré en version 1
        err(num, `« ${m[1]}: » n'est pas reconnu. Les mots possibles sont « titre: », « quizlet: », « note_parents: », « couleurs: » et « boss: ».`);
      }
      continue;
    }
    if (section === 'inconnue') continue;
    // « liste: Les mois » dans [mots] : les mots suivants forment une liste de « Je découvre » (demande du 2026-10-26).
    // Dans [phrases], même nom : les phrases suivantes s'affichent avec cette liste (sans liste : avec toutes).
    const ligneListe = (section === 'mots' || section === 'phrases') && ligne.match(/^liste\s*:\s*(.*)$/);
    if (ligneListe) {
      liste = ligneListe[1].trim();
      if (section === 'phrases' && !resultat.mots.some((m) => m.liste === liste)) {
        err(num, `la liste « ${liste} » n'existe pas dans [mots]. Recopie exactement le nom d'une ligne « liste: » de [mots].`);
        liste = '';
      }
      continue;
    }

    const [min, max, modele] = SECTIONS[section];
    const c = colonnes(ligne);
    if (c.length < min || c.length > max) {
      const manque = c.length < min ? 'il manque une colonne' : 'il y a trop de colonnes';
      err(num, `${manque} dans [${section}] : ${c.length} au lieu de ${min === max ? min : `${min} à ${max}`}. Modèle : ${modele}.`);
      continue;
    }
    const id = c[0];
    if (!ID_VALIDE.test(id)) {
      err(num, `l'identifiant « ${id} » doit être en minuscules, sans accent ni espace, avec des tirets (exemple : te-voet).`);
      continue;
    }
    if (ids.has(id)) {
      err(num, `l'identifiant « ${id} » est déjà utilisé ligne ${ids.get(id)}. Chaque identifiant doit être unique dans le chapitre.`);
      continue;
    }
    // Un mot avec un indice en 4e colonne (image, couleur:, texte:) peut se passer du français.
    const obligatoires = section === 'mots' && c[3] ? c.slice(1, 2) : c.slice(1, min);
    if (obligatoires.some((v) => v === '')) {
      err(num, section === 'mots' && c[1]
        ? 'le français est vide. Écris-le en 3e colonne, ou mets une image, « couleur: » ou « texte: » en 4e colonne.'
        : `une colonne obligatoire est vide. Modèle : ${modele}.`);
      continue;
    }
    if (section === 'mots' && c[3]?.startsWith('couleur:') && !couleurIndice(c[3])) {
      err(num, `la couleur « ${c[3].slice(8).trim()} » n'est pas reconnue. Écris un de ces noms : ${Object.keys(COULEURS).join(', ')} ; ou un code comme couleur:#C62828.`);
      continue;
    }
    // [ordre] : « / » sépare les cases ; ce qui est entre deux « / » forme une seule case.
    const cases = section === 'ordre' ? c[1].split('/').map((x) => x.trim()).filter(Boolean) : [];
    if (section === 'ordre' && cases.length < 2) {
      err(num, 'il faut au moins 2 cases, séparées par « / » (exemple : Ik / woon / in / Charleroi.).');
      continue;
    }
    if (section === 'mots' && c[3]?.startsWith('texte:') && !c[3].slice(6).trim()) {
      err(num, 'rien n\'est écrit après « texte: ». Écris ce qu\'il faut afficher en grand (exemple : texte:7).');
      continue;
    }
    ids.set(id, num);

    if (section === 'mots') {
      const [, mot, francais, image = ''] = c;
      resultat.mots.push({ id, mot, francais, image, liste, ligne: num });
    } else if (section === 'phrases') {
      const [, phrase, francais, reponse = '', autres = ''] = c;
      if (reponse && positionReponse(phrase, reponse) < 0) {
        err(num, `la réponse à masquer « ${reponse} » n'apparaît pas dans la phrase. Recopie-la exactement comme dans la phrase.`);
      }
      const propositions = autres ? autres.split(',').map((p) => p.trim()).filter(Boolean) : [];
      resultat.phrases.push({ id, phrase, francais, reponse, propositions, liste, ligne: num });
    } else if (section === 'pistes') {
      const [, titre, texteP = '', francais = ''] = c;
      resultat.pistes.push({ id, titre, texte: texteP, francais, ligne: num });
    } else if (section === 'ordre') {
      // 4e colonne : mots en trop, séparés par des virgules (demande du 2026-10-26).
      const intrus = (c[3] || '').split(',').map((x) => x.trim()).filter(Boolean);
      resultat.ordre.push({ id, cases, son: c[2] || '', intrus, ligne: num });
    } else if (section === 'descriptions') {
      // Jeu « Qui est-ce ? » (demande du 2026-10-28) : une personne décrite, son audio et son dessin images/<id>.png.
      resultat.descriptions.push({ id, phrases: c[1].split('/').map((x) => x.trim()).filter(Boolean), francais: c[2] || '', ligne: num });
    } else {
      const [, titre, texteD, francais = ''] = c;
      // « dates: » en 3e colonne : dictée de dates tirées au hasard, sans son à elle (demande du 2026-10-26).
      resultat.dictees.push({ id, titre, texte: texteD, francais, ligne: num, dates: texteD === 'dates:' });
    }
  }

  if (!resultat.titre) err(1, 'il manque la ligne « titre: » en haut du fichier (exemple : titre: Kleuren).');
  return resultat;
}

// Charge un fichier texte du site. Renvoie le texte, ou lance une erreur en français.
export async function chargerTexte(chemin) {
  let reponse;
  try {
    reponse = await fetch(chemin, { cache: 'no-cache' });
  } catch {
    throw new Error(`Impossible de lire « ${chemin} ». Vérifie la connexion internet, puis recharge la page.`);
  }
  if (!reponse.ok) {
    throw new Error(`Le fichier « ${chemin} » est introuvable. Vérifie son nom (minuscules, sans accent ni espace) et son dossier.`);
  }
  return reponse.text();
}

// Renvoie l'ensemble des chemins dont le fichier existe (audios, images).
// Un fichier absent ne doit rien afficher à l'enfant : on demande seulement s'il existe (HEAD), sans le télécharger.
// Chaque fichier n'est demandé qu'une fois par page, même si plusieurs parties de la page le cherchent.
const dejaDemandes = new Map();
export async function fichiersPresents(chemins) {
  const reponses = await Promise.all(chemins.map((chemin) => {
    if (!dejaDemandes.has(chemin)) {
      // Hors connexion ou autre souci : le fichier compte comme absent, sans message.
      dejaDemandes.set(chemin, fetch(chemin, { method: 'HEAD' }).then((r) => r.ok, () => false));
    }
    return dejaDemandes.get(chemin);
  }));
  return new Set(chemins.filter((_, k) => reponses[k]));
}

export function cheminChapitre(langue, annee, chapitre) {
  return `contenu/${langue}/${annee}/${chapitre}/`;
}

// Ligne de bienvenue (contenu/accueil.txt) : première ligne utile, découpée sur « | ».
export function lireAccueil(texte) {
  const ligne = lignesUtiles(texte)[0];
  return ligne ? colonnes(ligne.texte).filter(Boolean) : [];
}
