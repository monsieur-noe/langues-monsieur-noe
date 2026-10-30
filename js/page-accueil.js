// Accueil en trois écrans successifs : langue, puis année, puis chapitres.
// L'écran affiché dépend de l'adresse (index.html, ?langue=nl, ?langue=nl&annee=p3) :
// le bouton « retour » du navigateur fonctionne et un lien se partage.
import { lireCatalogue, lireAccueil, chargerTexte, cheminChapitre } from './donnees.js?v=491f0158';
import { LANGUES, parametre, couleur, el, icone, encadreErreurs } from './outils.js?v=491f0158';
import { avatar, chargerAvatar } from './avatar.js?v=491f0158';

const langue = parametre('langue');
const annee = parametre('annee');
const nomLangue = (LANGUES.find((l) => l.code === langue) || { nom: langue }).nom;

// Une carte de choix : un lien si le choix est possible, sinon une carte grisée « Bientôt ».
function carte(lien, classe, ...contenu) {
  return lien
    ? el('li', {}, el('a', { class: `choix ${classe}`, href: lien }, ...contenu, el('span', { class: 'fleche' }, icone('droite'))))
    : el('li', {}, el('span', { class: `choix off ${classe}` }, ...contenu, el('span', { class: 'pastille' }, 'Bientôt')));
}

// Écrans 2 et 3 : titre, rappel du chemin et flèche vers l'écran précédent.
function preparerEtape(consigne, retour, ...chemin) {
  document.getElementById('consigne').textContent = consigne;
  document.getElementById('retour').href = retour;
  document.getElementById('chemin').append(...chemin);
  document.getElementById('fil').hidden = false;
}

function montrer(id, cartes) {
  const liste = document.getElementById(id);
  liste.append(...cartes);
  liste.hidden = false;
}

function afficherLangues(chapitres) {
  montrer('langues', LANGUES.map((l) => carte(
    chapitres.some((c) => c.langue === l.code) && `index.html?langue=${l.code}`,
    `langue-${l.code}`,
    el('span', { class: 'bulle', lang: l.code }, l.bulle),
    el('span', { class: 'titre', lang: l.code }, l.nom, drapeau(l.drapeau)),
  )));
}

// Petit drapeau décoratif (dessiné dans index.html), même modèle partout.
function drapeau(nom) {
  const d = icone(nom);
  d.setAttribute('class', `drapeau ${nom}`);
  return d;
}

// Ligne de bienvenue (contenu/accueil.txt). Le drapeau dépend de la place du mot :
// 1re salutation = Royaume-Uni, 2e = Pays-Bas, 3e = aucun. Fichier absent : rien ne s'affiche.
const PLACES = [{ lang: 'en', drapeau: 'drapeau-gb' }, { lang: 'nl', drapeau: 'drapeau-nl' }, { lang: 'fr' }];

async function afficherBienvenue() {
  let salutations;
  try {
    salutations = lireAccueil(await chargerTexte('contenu/accueil.txt'));
  } catch {
    return;
  }
  if (!salutations.length) return;
  const ligne = document.getElementById('bienvenue');
  if (salutations.length === 1) {
    ligne.append(el('span', { class: 'salut' }, salutations[0])); // pas de « | » : telle quelle, sans drapeau
  } else {
    salutations.forEach((mot, i) => {
      const place = PLACES[i] || {};
      const salut = el('span', { class: 'salut', lang: place.lang });
      if (place.drapeau) salut.append(drapeau(place.drapeau));
      salut.append(mot);
      ligne.append(salut);
    });
  }
  ligne.hidden = false;
}

function afficherAnnees(chapitres) {
  preparerEtape('Choisis ton année.', 'index.html', el('span', { lang: langue }, nomLangue));
  // P3 et P4 toujours montrées ; une autre année (p5…) apparaît dès qu'elle est au catalogue.
  const annees = [...new Set(['p3', 'p4', ...chapitres.filter((c) => c.langue === langue).map((c) => c.annee)])].sort();
  montrer('annees', annees.map((a, i) => carte(
    chapitres.some((c) => c.langue === langue && c.annee === a) && `index.html?langue=${langue}&annee=${a}`,
    couleur(i + 2),
    el('span', { class: 'num' }, a.toUpperCase()),
    el('span', { class: 'titre' }, `${a.slice(1)}e primaire`),
  )));
}

function afficherChapitres(chapitres) {
  preparerEtape('Tes chapitres', `index.html?langue=${langue}`, el('span', { lang: langue }, nomLangue), ` · ${annee.toUpperCase()}`);
  const liste = chapitres.filter((c) => c.langue === langue && c.annee === annee);
  if (!liste.length) {
    document.getElementById('message').append(el('p', { class: 'message' }, 'Pas encore de chapitre ici. Reviens bientôt !'));
    return;
  }
  montrer('liste-chapitres', liste.map((c, i) => carte(
    `chapitre.html?langue=${c.langue}&annee=${c.annee}&chapitre=${c.chapitre}`,
    couleur(i),
    c.vignette
      ? el('img', { class: 'num', src: `${cheminChapitre(c.langue, c.annee, c.chapitre)}images/${c.vignette}`, alt: '' })
      : el('span', { class: 'num', 'aria-hidden': 'true' }, c.revision ? icone('tourner') : String(c.ordre)), // la numérotation continue d'une année à l'autre

    el('span', { class: 'titre', lang: c.langue }, c.titre),
  )));
}

async function demarrer() {
  const message = document.getElementById('message');
  let catalogue;
  try {
    catalogue = lireCatalogue(await chargerTexte('contenu/catalogue.txt'));
  } catch (e) {
    message.append(encadreErreurs([{ message: e.message }], 'La liste des chapitres ne s\'affiche pas.'));
    return;
  }
  if (!langue) {
    afficherBienvenue();
    afficherLangues(catalogue.chapitres);
    // L'avatar dit bonjour sous le choix des langues, seulement si contenu/avatar/bonjour.svg (ou .png) existe.
    chargerAvatar().then(() => document.getElementById('langues').after(avatar('bonjour', true)));
  }
  else if (!annee) afficherAnnees(catalogue.chapitres);
  else afficherChapitres(catalogue.chapitres);
  if (catalogue.erreurs.length) {
    message.append(encadreErreurs(catalogue.erreurs, 'Certaines lignes du catalogue sont ignorées :'));
  }
}

demarrer();
