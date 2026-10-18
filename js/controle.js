// Logique de la page de contrôle (testée dans tests/controle.test.js) : noms de fichiers à essayer,
// conseils de renommage, variantes d'exercice indisponibles, texte pour Quizlet. Cahier 7.6.
import { article } from './exercices.js';

export const LIMITE_DICTEE = 3 * 1024 * 1024; // 3 Mo par dictée (cahier 9)
const AUTRES_AUDIO = ['mp3', 'wav'];
const AUTRES_IMAGE = ['png', 'webp', 'svg', 'jpg', 'jpeg'];
const IMAGES_ACCEPTEES = ['png', 'webp', 'svg'];

// Noms voisins d'un fichier attendu mais absent : majuscule initiale, extension en majuscules, autre extension.
// « audio/rood.m4a » -> audio/Rood.m4a, audio/rood.M4A, audio/rood.mp3, audio/rood.wav
export function variantesNom(chemin) {
  const [, dossier, nom, ext] = chemin.match(/^(.*\/)([^/]+)\.([^./]+)$/) || [];
  if (!nom) return [];
  const autres = (dossier.endsWith('audio/') ? AUTRES_AUDIO : AUTRES_IMAGE).filter((e) => e !== ext.toLowerCase());
  return [
    `${dossier}${nom[0].toUpperCase()}${nom.slice(1)}.${ext}`,
    `${dossier}${nom}.${ext.toUpperCase()}`,
    ...autres.map((e) => `${dossier}${nom}.${e}`),
  ].filter((v) => v !== chemin);
}

// Ce que l'enseignant doit faire quand `trouve` existe à la place de `attendu` (chemins dans le dossier du chapitre).
export function conseilNom(attendu, trouve) {
  const nomAttendu = attendu.split('/').pop();
  const ext = trouve.split('.').pop();
  if (ext.toLowerCase() === attendu.split('.').pop().toLowerCase()) {
    return `trouvé ${trouve} : renomme-le en ${nomAttendu} (tout en minuscules).`;
  }
  if (trouve.startsWith('audio/')) {
    return `trouvé ${trouve} : ce format n'est pas accepté (seulement .m4a), demande à Claude de le convertir.`;
  }
  if (IMAGES_ACCEPTEES.includes(ext)) {
    return `trouvé ${trouve} : écris ${trouve.split('/').pop()} dans la 4e colonne du mot.`;
  }
  return `trouvé ${trouve} : ce format n'est pas accepté (seulement .png, .webp ou .svg), demande à Claude de le convertir.`;
}

// Pourquoi chaque variante d'exercice manque. `dispo` vient de disponibles() (exercices.js), n = 3 en P3, 4 en P4.
// Renvoie [{ nom, message, normal }] ; `normal` = absence attendue, sans rien à corriger.
export function variantesManquantes(dispo, mots, phrases, n) {
  const visuels = mots.filter((m) => m.ind.type !== 'francais').length;
  const sonores = mots.filter((m) => m.son).length;
  const noms = mots.filter((m) => article(m.mot)).length;
  const aTrous = phrases.filter((p) => p.reponse).length;
  const manque = [];
  if (!dispo['image-mot'].length) {
    manque.push({ nom: '« Image vers mot » et « Mot vers image »', message: `il faut au moins ${n} mots avec une image, une couleur ou un chiffre (il y en a ${visuels}).` });
  }
  if (!dispo.ecoute.length) {
    manque.push({ nom: '« Écoute »', message: `il faut au moins ${n} mots avec leur audio (il y en a ${sonores}).` });
  }
  if (!phrases.length) {
    manque.push({ nom: '« Texte à trous »', message: 'pas de phrase dans ce chapitre.', normal: true });
  } else if (!dispo.trous.length) {
    manque.push({
      nom: '« Texte à trous »',
      message: aTrous
        ? `il faut au moins ${n - 1} propositions fausses différentes par phrase : écris-les en 5e colonne, séparées par des virgules.`
        : 'aucune phrase n\'a de réponse à masquer (4e colonne de [phrases]).',
    });
  }
  if (!dispo['de-het'].length) {
    manque.push(noms
      ? { nom: '« De ou het ? »', message: `il faut au moins 4 noms avec « de » ou « het » (il y en a ${noms}).` }
      : { nom: '« De ou het ? »', message: 'aucun nom avec « de » ou « het » : c\'est normal pour les couleurs ou les nombres.', normal: true });
  }
  return manque;
}

// Texte à coller dans l'import de Quizlet : « mot<tabulation>français », une ligne par mot.
// Les mots sans français sont mis de côté pour l'avertissement.
export function texteQuizlet(mots) {
  const propre = (t) => t.replace(/\s+/g, ' ').trim(); // une tabulation ou un retour à la ligne casserait l'import
  const avec = mots.filter((m) => m.francais);
  return {
    texte: avec.map((m) => `${propre(m.mot)}\t${propre(m.francais)}`).join('\n'),
    sansFrancais: mots.filter((m) => !m.francais).map((m) => m.mot),
  };
}

// Taille d'un fichier en octets, sans le télécharger (null si inconnue).
export async function taille(chemin) {
  try {
    const r = await fetch(chemin, { method: 'HEAD' });
    const t = Number(r.headers.get('content-length'));
    return r.ok && t ? t : null;
  } catch {
    return null;
  }
}
