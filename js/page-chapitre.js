// Page d'un chapitre : en-tête, trois rubriques, conseil aux parents, lien Quizlet.
// Adresse : chapitre.html?langue=nl&annee=p3&chapitre=kleuren&rubrique=decouvre
import { lireCatalogue, lireChapitre, chargerTexte, cheminChapitre } from './donnees.js?v=c16b4cc5';
import { parametre, couleur, el, icone, encadreErreurs } from './outils.js?v=c16b4cc5';
import { afficherDecouvre } from './cartes.js?v=c16b4cc5';
import { afficherExercices } from './exercices.js?v=c16b4cc5';
import { avatar, chargerAvatar } from './avatar.js?v=c16b4cc5';
import { afficherJeux, contenuJeux, jeuxPossibles } from './jeux.js?v=c16b4cc5';

const RUBRIQUES = [
  { id: 'decouvre', nom: 'Je découvre', icone: 'oeil' },
  { id: 'entraine', nom: 'Je m\'entraîne', icone: 'crayon' },
  { id: 'verifie', nom: 'Je vérifie', icone: 'etoile' },
  { id: 'joue', nom: 'Je joue', icone: 'puzzle' },
];

const langue = parametre('langue');
const annee = parametre('annee');
const chapitre = parametre('chapitre');
const sens = parametre('sens'); // 'indice' : l'image (ou le français) d'abord, sinon le mot d'abord
const rubrique = RUBRIQUES.find((r) => r.id === parametre('rubrique')) || RUBRIQUES[0];
const message = document.getElementById('message');

// « Je joue » n'apparaît que si au moins un jeu est possible dans ce chapitre.
function afficherOnglets(avecJeux) {
  const nav = document.getElementById('onglets');
  // Quatre onglets : deux lignes de deux sur téléphone (classe lue par le CSS).
  nav.classList.toggle('quatre', avecJeux);
  for (const r of RUBRIQUES.filter((x) => avecJeux || x.id !== 'joue')) {
    nav.append(el('a', {
      class: 'seg',
      href: `chapitre.html?langue=${langue}&annee=${annee}&chapitre=${chapitre}&rubrique=${r.id}${sens ? `&sens=${sens}` : ''}`,
      'aria-current': r === rubrique && 'page',
    }, icone(r.icone), r.nom));
  }
}

function afficherRubrique(donnees, jeux) {
  const zone = document.getElementById('rubrique');
  const dossier = cheminChapitre(langue, annee, chapitre);
  if (rubrique.id === 'joue') return afficherJeux(zone, jeux, parametre('jeu'));
  if (rubrique.id === 'decouvre') return afficherDecouvre(zone, donnees, dossier, langue, sens === 'indice');
  return afficherExercices(zone, donnees, dossier, langue, annee, rubrique.id === 'verifie', parametre('exercice'));
}

function afficherExtras(donnees) {
  if (donnees.note_parents) {
    document.getElementById('note-parents').textContent = donnees.note_parents;
    document.getElementById('conseil').hidden = false;
    // L'avatar « explique » n'apparaît que quand le conseil est ouvert (cahier 7.8).
    chargerAvatar().then(() => document.getElementById('note-parents').before(avatar('explique')));
  }
  // Seul un lien https vers Quizlet est accepté (pas d'adresse piégée dans le fichier texte).
  const liens = donnees.quizlet.filter((q) => /^https:\/\/([a-z0-9-]+\.)?quizlet\.com\//i.test(q.lien));
  if (liens.length) {
    const p = document.getElementById('quizlet');
    const lien = (q, ...contenu) => el('a', { href: q.lien, target: '_blank', rel: 'noopener noreferrer' }, ...contenu);
    const prudence = " (site externe, demande d'abord l'accord de tes parents)";
    // Un seul lien sans nom : la phrase d'origine. Sinon, une phrase puis un lien par nom.
    p.append(liens.length === 1 && !liens[0].nom
      ? lien(liens[0], 'Pour aller plus loin : révise sur Quizlet ', el('strong', { class: 'ici' }, 'ici'), prudence)
      : el('span', { class: 'liens' }, `Pour aller plus loin : révise sur Quizlet${prudence}.`,
        ...liens.map((q) => lien(q, el('strong', { class: 'ici' }, q.nom || 'Quizlet')))));
    p.hidden = false;
    // Petit avatar « reflechit » à côté du lien (demande de l'enseignant du 2026-10-20).
    chargerAvatar().then(() => p.prepend(avatar('reflechit')));
  }
}

// La couleur du chapitre suit son rang dans le catalogue, comme sur l'accueil.
async function appliquerCouleur() {
  try {
    const { chapitres } = lireCatalogue(await chargerTexte('contenu/catalogue.txt'));
    const rang = chapitres.filter((c) => c.langue === langue && c.annee === annee).findIndex((c) => c.chapitre === chapitre);
    if (rang >= 0) document.getElementById('page').classList.add(couleur(rang));
  } catch {
    // Sans catalogue, la couleur par défaut suffit.
  }
}

async function demarrer() {
  if (!langue || !annee || !chapitre) {
    message.append(encadreErreurs([{ message: 'L\'adresse de cette page est incomplète. Retourne à l\'accueil pour choisir un chapitre.' }], 'Chapitre introuvable.'));
    return;
  }
  document.getElementById('retour').href = `index.html?langue=${langue}&annee=${annee}`;
  appliquerCouleur();

  const fichier = `${cheminChapitre(langue, annee, chapitre)}chapitre.txt`;
  let donnees;
  try {
    donnees = lireChapitre(await chargerTexte(fichier), fichier);
  } catch (e) {
    message.append(encadreErreurs([{ message: e.message }], 'Ce chapitre ne s\'affiche pas.'));
    return;
  }

  const titre = document.getElementById('titre');
  titre.textContent = donnees.titre || chapitre;
  titre.lang = langue;
  document.title = `${titre.textContent} · Les langues avec Monsieur Noé`;
  if (donnees.erreurs.length) message.append(encadreErreurs(donnees.erreurs, 'Certaines lignes du chapitre sont ignorées :'));

  const jeux = await contenuJeux(donnees, cheminChapitre(langue, annee, chapitre), langue, annee);
  afficherOnglets(jeuxPossibles(jeux).length > 0);
  await afficherRubrique(donnees, jeux);
  afficherExtras(donnees);
  document.getElementById('contenu').hidden = false;
}

demarrer();
