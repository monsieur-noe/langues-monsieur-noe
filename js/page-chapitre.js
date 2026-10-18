// Page d'un chapitre : en-tête, trois rubriques, conseil aux parents, lien Quizlet.
// Adresse : chapitre.html?langue=nl&annee=p3&chapitre=kleuren&rubrique=decouvre
import { lireCatalogue, lireChapitre, chargerTexte, cheminChapitre } from './donnees.js';
import { parametre, couleur, el, icone, encadreErreurs } from './outils.js';
import { afficherDecouvre } from './cartes.js';
import { afficherExercices } from './exercices.js';

const RUBRIQUES = [
  { id: 'decouvre', nom: 'Je découvre', icone: 'oeil' },
  { id: 'entraine', nom: 'Je m\'entraîne', icone: 'crayon' },
  { id: 'verifie', nom: 'Je vérifie', icone: 'etoile' },
];

const langue = parametre('langue');
const annee = parametre('annee');
const chapitre = parametre('chapitre');
const sens = parametre('sens'); // 'indice' : l'image (ou le français) d'abord, sinon le mot d'abord
const rubrique = RUBRIQUES.find((r) => r.id === parametre('rubrique')) || RUBRIQUES[0];
const message = document.getElementById('message');

function afficherOnglets() {
  const nav = document.getElementById('onglets');
  for (const r of RUBRIQUES) {
    nav.append(el('a', {
      class: 'seg',
      href: `chapitre.html?langue=${langue}&annee=${annee}&chapitre=${chapitre}&rubrique=${r.id}${sens ? `&sens=${sens}` : ''}`,
      'aria-current': r === rubrique && 'page',
    }, icone(r.icone), r.nom));
  }
}

function afficherRubrique(donnees) {
  const zone = document.getElementById('rubrique');
  const dossier = cheminChapitre(langue, annee, chapitre);
  if (rubrique.id === 'decouvre') return afficherDecouvre(zone, donnees, dossier, langue, sens === 'indice');
  return afficherExercices(zone, donnees, dossier, langue, annee, rubrique.id === 'verifie', parametre('exercice'));
}

function afficherExtras(donnees) {
  if (donnees.note_parents) {
    document.getElementById('note-parents').textContent = donnees.note_parents;
    document.getElementById('conseil').hidden = false;
  }
  // Seul un lien https vers Quizlet est accepté (pas d'adresse piégée dans le fichier texte).
  if (/^https:\/\/([a-z0-9-]+\.)?quizlet\.com\//i.test(donnees.quizlet)) {
    const p = document.getElementById('quizlet');
    p.append(el('a', { href: donnees.quizlet, target: '_blank', rel: 'noopener noreferrer' },
      'Réviser sur Quizlet (site externe, avec un adulte)'));
    p.hidden = false;
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

  afficherOnglets();
  await afficherRubrique(donnees);
  afficherExtras(donnees);
  document.getElementById('contenu').hidden = false;
}

demarrer();
