// Rubrique « Je joue » (cahier 7.9) : des jeux qui se fabriquent seuls à partir du contenu du chapitre.
// Un jeu sans assez de contenu n'apparaît pas, sans message à l'enfant. Rien n'est enregistré.
// Adresse : chapitre.html?…&rubrique=joue (menu), puis &jeu=<id> (un jeu).
import { el, icone } from './outils.js?v=38e1124f';
import { cheminSon } from './donnees.js?v=38e1124f';
import { chercherFichiers, cheminDessin } from './cartes.js?v=38e1124f';
import { chargerAvatar } from './avatar.js?v=38e1124f';
import { amorcer } from './musique.js?v=38e1124f';
import juist from './jeu-juist.js?v=38e1124f';
import loto from './jeu-loto.js?v=38e1124f';
import memory from './jeu-memory.js?v=38e1124f';
import oie, { oieDifficile } from './jeu-oie.js?v=38e1124f';
import phrases from './jeu-phrases.js?v=38e1124f';
import boss, { bossDifficile } from './jeu-boss.js?v=38e1124f';
import qui from './jeu-qui.js?v=38e1124f';
import phraseImages from './jeu-phrase-images.js?v=38e1124f';
import motEnPieces from './jeu-mot-en-pieces.js?v=38e1124f';
import ballons, { ballonsDifficile } from './jeu-ballons.js?v=38e1124f';
import jumeaux, { jumeauxDifficile } from './jeu-jumeaux.js?v=38e1124f';
import motsCaches from './jeu-mots-caches.js?v=38e1124f';
import sentier from './jeu-sentier.js?v=38e1124f';
import panier from './jeu-panier.js?v=38e1124f';
import boites from './jeu-boites.js?v=38e1124f';
import devinette from './jeu-devinette.js?v=38e1124f';
import cadenas from './jeu-cadenas.js?v=38e1124f';
import robot, { robotDifficile } from './jeu-robot.js?v=38e1124f';
import dessinDisparu from './jeu-dessin-disparu.js?v=38e1124f';
import terriers from './jeu-terriers.js?v=38e1124f';

// Chaque jeu : { id (dans l'adresse), nom, lang (si le nom est en néerlandais), anglais (son nom dans les chapitres d'anglais, si besoin), icone, possible(contenu), lancer(zone, contenu) },
// et `pleinEcran` pour l'ouvrir sans changer de page (combat : garde le toucher qui permet la musique sur iPhone).
// Les jeux s'ajoutent ici un par un, quand ils sont prêts.
export const JEUX = [juist, loto, memory, oie, oieDifficile, phrases, phraseImages, qui, motEnPieces, ballons, ballonsDifficile, jumeaux, jumeauxDifficile, motsCaches, panier, boites, sentier, cadenas, devinette, robot, robotDifficile, dessinDisparu, terriers, boss, bossDifficile];

// Ce que les jeux utilisent : les mots avec leur indice (`ind`) et leur son (`son`), les phrases avec leur son.
export async function contenuJeux(donnees, dossier, langue, annee) {
  const dessin = (d) => `${d.dossier || dossier}images/${d.id}.png`;
  const { presents, indices } = await chercherFichiers(donnees, dossier, donnees.descriptions.flatMap((d) => [cheminSon(d, dossier), dessin(d)]));
  const aSon = (x) => presents.has(cheminSon(x, dossier));
  return {
    langue, annee, dossier, presents,
    boss: donnees.boss, // nom du monstre du combat de boss (ligne « boss: » du chapitre)
    arene: donnees.arene, // décor du combat de boss (ligne « arene: »)
    revision: donnees.reprend.length > 0, // chapitre de révision : musique du boss de fin d'année
    n: annee === 'p3' ? 3 : 4, // 3 choix en P3, 4 en P4, comme les exercices
    mots: donnees.mots.map((m, k) => ({ ...m, ind: indices[k], son: aSon(m) })),
    phrases: donnees.phrases.map((p) => ({ ...p, son: aSon(p), dessin: presents.has(cheminDessin(p, dossier)) ? cheminDessin(p, dossier) : '' })),
    // « Qui est-ce ? » : seulement les personnes dont le dessin existe.
    descriptions: donnees.descriptions.filter((d) => presents.has(dessin(d))).map((d) => ({ ...d, src: dessin(d), son: aSon(d) })),
  };
}

export const jeuxPossibles = (contenu) => JEUX.filter((j) => j.possible(contenu));

const lienJeu = (id) => {
  const params = new URLSearchParams(location.search);
  if (id) params.set('jeu', id); else params.delete('jeu');
  return `?${params}`;
};

export async function afficherJeux(conteneur, contenu, jeu) {
  await chargerAvatar();
  const possibles = jeuxPossibles(contenu);
  const choisi = possibles.find((j) => j.id === jeu);
  if (choisi) {
    const zone = el('div', { class: 'zone-jeu' });
    conteneur.replaceChildren(
      el('a', { class: 'retour-jeux', href: lienJeu('') }, icone('gauche'), 'Retour aux jeux'),
      zone);
    // Dans tous les jeux, la barre des rubriques est masquée pour laisser la place au jeu (demande du 2026-11-09).
    document.getElementById('onglets').hidden = true;
    choisi.lancer(zone, contenu);
    // Sur téléphone, le jeu remonte en haut de l'écran : les boutons de réponse restent visibles sans défiler.
    // Après un rechargement, le navigateur ne remet pas la page où elle était (il annulerait cette remontée).
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    requestAnimationFrame(() => conteneur.scrollIntoView({ block: 'start' }));
    return;
  }
  if (!possibles.length) {
    conteneur.replaceChildren(el('p', { class: 'bientot-ici' }, icone('puzzle'), 'Pas encore de jeu dans ce chapitre.'));
    return;
  }
  // Combat : ouvert sans changer de page. Sur iPhone, un nouveau chargement perdrait ce toucher, et la musique attendrait le suivant.
  const ouvrir = (lien, j) => {
    if (j.pleinEcran) {
      lien.addEventListener('click', (e) => {
        e.preventDefault();
        amorcer();
        history.pushState(null, '', lienJeu(j.id));
        addEventListener('popstate', () => location.reload(), { once: true }); // bouton « retour » du navigateur
        afficherJeux(conteneur, contenu, j.id);
      });
    }
    return lien;
  };
  const nomDe = (j) => (contenu.langue === 'en' && j.anglais ? [j.anglais, 'en'] : [j.nom, j.lang]);
  // Les familles qui ont au moins un jeu ; l'onglet choisi reste dans l'adresse (retour au même onglet après un jeu).
  const familles = FAMILLES.map((f) => ({ ...f, jeux: possibles.filter((j) => f.jeux.includes(j.id.replace(/-difficile$/, ''))) })).filter((f) => f.jeux.length);
  const famille = familles.find((f) => f.id === new URLSearchParams(location.search).get('famille')) || familles[0];
  const lienFamille = (id) => { const p = new URLSearchParams(location.search); p.set('famille', id); return `?${p}`; };
  const vignette = (balise, attributs, j) => {
    const [nom, lang] = nomDe(j);
    return el(balise, { class: 'choix', ...attributs },
      el('span', { class: 'num' }, icone(j.icone)),
      el('span', { class: 'titre', lang }, nom),
      el('span', { class: 'fleche' }, icone('droite')));
  };
  // Une vignette par jeu ; un jeu qui a une version difficile propose « Normal » et « Difficile » quand on le touche.
  const normaux = famille.jeux.filter((j) => !j.id.endsWith('-difficile') || !famille.jeux.some((n) => `${n.id}-difficile` === j.id));
  conteneur.replaceChildren(
    el('h2', { class: 'consigne' }, icone('puzzle'), 'Choisis un jeu.'),
    familles.length > 1 ? el('nav', { class: 'segments familles', 'aria-label': 'Familles de jeux' }, ...familles.map((f) =>
      el('a', { class: 'seg', href: lienFamille(f.id), 'aria-current': f === famille && 'page' }, icone(f.icone), f.nom))) : '',
    el('ul', { class: 'liste' }, ...normaux.map((j) => {
      const dur = famille.jeux.find((d) => d.id === `${j.id}-difficile`);
      if (!dur) return el('li', {}, ouvrir(vignette('a', { href: lienJeu(j.id) }, j), j));
      const versions = el('div', { class: 'versions', hidden: true },
        ouvrir(el('a', { class: 'choix', href: lienJeu(j.id) }, el('span', { class: 'titre' }, 'Normal')), j),
        ouvrir(el('a', { class: 'choix', href: lienJeu(dur.id) }, el('span', { class: 'titre' }, 'Difficile')), dur));
      const bouton = vignette('button', { type: 'button', 'aria-expanded': 'false' }, j);
      bouton.addEventListener('click', () => {
        versions.hidden = !versions.hidden;
        bouton.setAttribute('aria-expanded', String(!versions.hidden));
      });
      return el('li', {}, bouton, versions);
    })));
}

// Familles du menu (choix de l'enseignant du 2026-11-09), avec l'identifiant de la version normale de chaque jeu.
const FAMILLES = [
  { id: 'mots', nom: 'Trouve le mot', icone: 'loupe', jeux: ['juist-of-fout', 'loto', 'ballons', 'jumeaux', 'boites', 'terriers', 'devinette'] },
  { id: 'enigmes', nom: 'Mémoire et énigmes', icone: 'cle', jeux: ['memory', 'mot-en-pieces', 'mots-caches', 'panier', 'cadenas', 'robot', 'dessin-disparu'] },
  { id: 'phrases', nom: 'Phrases', icone: 'bulle', jeux: ['phrases', 'phrase-images', 'qui-est-ce'] },
  { id: 'aventures', nom: 'Aventures', icone: 'pion', jeux: ['oie', 'sentier', 'boss'] },
];
