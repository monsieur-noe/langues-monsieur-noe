// Page d'un chapitre : en-tête, trois rubriques, conseil aux parents.
// Adresse : chapitre.html?langue=nl&annee=p3&chapitre=kleuren&rubrique=decouvre
import { lireCatalogue, lireChapitre, chargerTexte, cheminChapitre, puiser } from './donnees.js?v=0b1d5cd9';
import { parametre, couleur, el, icone, encadreErreurs } from './outils.js?v=0b1d5cd9';
import { afficherDecouvre } from './cartes.js?v=0b1d5cd9';
import { afficherExercices } from './exercices.js?v=0b1d5cd9';
import { avatar, chargerAvatar } from './avatar.js?v=0b1d5cd9';
import { afficherJeux, contenuJeux, jeuxPossibles } from './jeux.js?v=0b1d5cd9';
import { afficherComprends } from './comprends.js?v=0b1d5cd9';

const RUBRIQUES = [
  { id: 'comprends', nom: 'Je comprends', icone: 'ampoule' }, // grammaire (v1.65) : seulement avec une section [explication]
  { id: 'decouvre', nom: 'Je découvre', icone: 'oeil' },
  { id: 'entraine', nom: 'Je m\'entraîne', icone: 'crayon' },
  { id: 'verifie', nom: 'Je vérifie', icone: 'etoile' },
  { id: 'joue', nom: 'Je joue', icone: 'puzzle' },
];

const langue = parametre('langue');
const annee = parametre('annee');
const chapitre = parametre('chapitre');
const sens = parametre('sens'); // 'indice' : l'image (ou le français) d'abord, sinon le mot d'abord
let rubrique; // choisie une fois le chapitre lu (« Je comprends » n'existe pas partout)
const message = document.getElementById('message');

// « Je joue » n'apparaît que si au moins un jeu est possible dans ce chapitre.
function afficherOnglets(rubriques) {
  const nav = document.getElementById('onglets');
  // Quatre onglets : deux lignes de deux sur téléphone (classe lue par le CSS).
  nav.classList.toggle('quatre', rubriques.length === 4);
  nav.classList.toggle('cinq', rubriques.length === 5);
  // Téléphone : barre en pictogrammes, seul le nom de la rubrique ouverte écrit (CSS ; menu des jeux v1.83, toutes les rubriques v1.84).
  // Grammaire (5 rubriques) : seulement dans « Je joue », « Je comprends » et « Je m'entraîne » ne tenant pas à côté de 4 pictogrammes.
  if (rubriques.length < 5 || rubrique.id === 'joue') nav.classList.add('compact');
  for (const r of rubriques) {
    nav.append(el('a', {
      class: 'seg',
      href: `chapitre.html?langue=${langue}&annee=${annee}&chapitre=${chapitre}&rubrique=${r.id}${sens ? `&sens=${sens}` : ''}`,
      'aria-current': r === rubrique && 'page',
    }, icone(r.icone), el('span', { class: 'nom-seg' }, r.nom)));
  }
}

function afficherRubrique(donnees, jeux) {
  const zone = document.getElementById('rubrique');
  const dossier = cheminChapitre(langue, annee, chapitre);
  if (rubrique.id === 'joue') return afficherJeux(zone, jeux, parametre('jeu'));
  if (rubrique.id === 'comprends') return afficherComprends(zone, donnees, dossier, langue);
  if (rubrique.id === 'decouvre') return afficherDecouvre(zone, donnees, dossier, langue, sens === 'indice');
  return afficherExercices(zone, donnees, dossier, langue, annee, rubrique.id === 'verifie', parametre('exercice'));
}

function afficherExtras(donnees) {
  // « Je joue » : ni conseil, ni pied de page (demande de l'enseignant du 2026-11-09).
  if (rubrique.id === 'joue') { document.querySelector('.pied').hidden = true; return; }
  if (donnees.note_parents) {
    document.getElementById('note-parents').textContent = donnees.note_parents;
    document.getElementById('conseil').hidden = false;
    // L'avatar « explique » n'apparaît que quand le conseil est ouvert (cahier 7.8).
    chargerAvatar().then(() => document.getElementById('note-parents').before(avatar('explique')));
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
    await puiser(donnees, langue, annee); // chapitre de révision (ligne « reprend: »)
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
  const rubriques = RUBRIQUES.filter((r) => (r.id !== 'joue' || jeuxPossibles(jeux).length > 0) && (r.id !== 'comprends' || donnees.explication.length > 0));
  rubrique = rubriques.find((r) => r.id === parametre('rubrique')) || rubriques[0];
  afficherOnglets(rubriques);
  await afficherRubrique(donnees, jeux);
  afficherExtras(donnees);
  document.getElementById('contenu').hidden = false;
}

demarrer();
