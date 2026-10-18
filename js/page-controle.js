// Page de contrôle de l'enseignant : relit le catalogue et chaque chapitre avec le même code que le site,
// puis dit, chapitre par chapitre, ce qui va (✔), ce qui est à vérifier (⚠) et ce qui est à corriger (✖). Cahier 7.6.
import { lireCatalogue, lireChapitre, chargerTexte, cheminChapitre, fichiersPresents } from './donnees.js';
import { chercherFichiers, cheminImage } from './cartes.js';
import { disponibles, motSecret } from './exercices.js';
import { el } from './outils.js';
import { variantesNom, conseilNom, variantesManquantes, texteQuizlet, taille, LIMITE_DICTEE } from './controle.js';

const RACINE = '../'; // la page est dans controle/, le contenu à côté
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
function attendus(donnees, vignette) {
  const { mots, phrases, pistes, dictees } = donnees;
  return [
    ...[...mots, ...phrases, ...pistes, ...dictees].map((x) => ({ chemin: `audio/${x.id}.m4a`, id: x.id, obligatoire: true })),
    ...mots.filter((m) => !/^(texte|couleur):/.test(m.image)).map((m) => ({ chemin: cheminImage(m, ''), id: m.id, obligatoire: !!m.image })),
    ...(vignette ? [{ chemin: `images/${vignette}`, id: `vignette ${vignette}`, obligatoire: true }] : []),
  ];
}

// Audios ou images absents : nom voisin trouvé -> conseil précis ; sinon, liste des identifiants.
async function fichiersManquants(absents, dossier, quoi) {
  if (!absents.length) return [];
  const conseils = [];
  const introuvables = [];
  await Promise.all(absents.map(async (a) => {
    const voisins = variantesNom(a.chemin);
    const trouves = await fichiersPresents(voisins.map((v) => dossier + v));
    const trouve = voisins.find((v) => trouves.has(dossier + v));
    if (trouve) conseils.push(conseilNom(a.chemin, trouve));
    else if (a.obligatoire) introuvables.push(a.id);
  }));
  if (introuvables.length) {
    conseils.push(`Introuvables : ${introuvables.join(', ')}. Vérifie les majuscules, les accents, les espaces et l'extension.`);
  }
  return conseils.length ? [constat('attention', quoi, conseils)] : [];
}

function boutonQuizlet(mots) {
  const { texte, sansFrancais } = texteQuizlet(mots);
  const info = el('p', { class: 'info-quizlet', 'aria-live': 'polite' });
  const bouton = el('button', { type: 'button', class: 'action', disabled: !texte }, 'Copier pour Quizlet');
  const bloc = el('div', { class: 'quizlet-copie' }, bouton, info);
  bouton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(texte);
      info.textContent = `Copié (${nombre(texte.split('\n').length, 'mot')}). Dans Quizlet : « Importer », colle, puis garde « Tabulation » et « Nouvelle ligne ».`;
    } catch {
      // Copie refusée par le navigateur : le texte à copier à la main.
      const zone = el('textarea', { readonly: '', rows: 6, 'aria-label': 'Texte pour Quizlet' });
      zone.value = texte;
      info.replaceChildren('La copie automatique n\'a pas marché : sélectionne le texte ci-dessous et copie-le.', zone);
      zone.select();
    }
  });
  const constats = sansFrancais.length
    ? [constat('attention', 'Sans français, donc pas copiés pour Quizlet :', [sansFrancais.join(', ')])]
    : [];
  return { bloc, constats };
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

async function controlerChapitre(c) {
  const relatif = cheminChapitre(c.langue, c.annee, c.chapitre);
  const dossier = RACINE + relatif;
  const fichier = `${relatif}chapitre.txt`;
  const titre = el('h2', {}, `${c.titre} `, el('span', { class: 'sous-titre' }, `(${c.langue} · ${c.annee} · ${c.chapitre})`));

  let donnees;
  try {
    donnees = lireChapitre(await chargerTexte(RACINE + fichier), fichier);
  } catch {
    return carte('erreur', titre, [constat('erreur', `Le fichier ${fichier} est introuvable.`, [
      `Vérifie que le dossier du chapitre s'appelle exactement « ${c.chapitre} », comme dans catalogue.txt, et qu'il contient chapitre.txt.`,
    ])]);
  }

  const constats = [];
  if (donnees.erreurs.length) {
    constats.push(constat('erreur', `Erreurs dans ${fichier} (ces lignes sont ignorées par le site) :`,
      donnees.erreurs.map((e) => `ligne ${e.ligne} : ${e.message}`)));
  }

  const { presents, indices } = await chercherFichiers(donnees, dossier, c.vignette ? [`${dossier}images/${c.vignette}`] : []);
  const absents = attendus(donnees, c.vignette).filter((a) => !presents.has(dossier + a.chemin));
  constats.push(...await fichiersManquants(absents.filter((a) => a.chemin.startsWith('audio/')), dossier, 'Audios mal nommés ou manquants :'));
  constats.push(...await fichiersManquants(absents.filter((a) => a.chemin.startsWith('images/')), dossier, 'Images mal nommées ou manquantes :'));

  // Dictées trop lourdes (3 Mo au plus) : plus longues à charger sur un vieux téléphone.
  const lourdes = [];
  await Promise.all(donnees.dictees.map(async (d) => {
    const t = await taille(`${dossier}audio/${d.id}.m4a`);
    if (t > LIMITE_DICTEE) lourdes.push(`${d.id} : ${(Math.ceil(t / 1024 / 102.4) / 10).toFixed(1).replace('.', ',')} Mo. Demande à Claude de réduire le fichier.`);
  }));
  if (lourdes.length) constats.push(constat('attention', 'Dictées de plus de 3 Mo :', lourdes));

  // Variantes d'exercice : même calcul que les pages d'exercices.
  const aSon = (x) => presents.has(`${dossier}audio/${x.id}.m4a`);
  const n = c.annee === 'p3' ? 3 : 4;
  const mots = donnees.mots.map((m, k) => ({ ...m, ind: indices[k], son: aSon(m) }));
  const phrases = donnees.phrases.map((p) => ({ ...p, son: aSon(p) }));
  const manque = variantesManquantes(disponibles(mots, phrases, n), mots, phrases, n);
  const aCorriger = manque.filter((m) => !m.normal);
  const detail = manque.map((m) => `${m.nom} : ${m.message}`);
  constats.push(aCorriger.length
    ? constat('attention', 'Exercices pas proposés aux élèves :', detail)
    : constat('ok', 'Tous les exercices possibles sont proposés.', detail));

  const quizlet = boutonQuizlet(donnees.mots);
  constats.push(...quizlet.constats);
  if (donnees.mots.length < 4) constats.push(constat('attention', `Seulement ${donnees.mots.length} mots : il en faut au moins 4.`));

  const audios = attendus(donnees, '').filter((a) => a.chemin.startsWith('audio/'));
  const nbAudios = audios.filter((a) => presents.has(dossier + a.chemin)).length;
  const compteurs = el('p', { class: 'compteurs' },
    `${nombre(donnees.mots.length, 'mot')} · ${nombre(donnees.phrases.length, 'phrase')} · ${nombre(donnees.dictees.length, 'dictée')} · ${nbAudios} sur ${nombre(audios.length, 'audio')} présents`);

  const pire = constats.reduce((a, k) => (RANG[k.etat] > RANG[a] ? k.etat : a), 'ok');
  if (pire === 'ok') constats.unshift(constat('ok', 'Aucune erreur, aucun fichier manquant.'));
  return carte(pire, titre, constats, compteurs, quizlet.bloc, motsSecrets(donnees.mots, c.langue));
}

function carte(etat, titre, constats, compteurs = '', quizlet = '', secrets = '') {
  titre.prepend(pastille(etat), ' ');
  return el('section', { class: 'fiche controle-chapitre' }, titre, compteurs,
    el('ul', { class: 'constats' }, ...constats.map((k) => k.li)), quizlet, secrets);
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
