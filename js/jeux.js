// Rubrique « Je joue » (cahier 7.9) : des jeux qui se fabriquent seuls à partir du contenu du chapitre.
// Un jeu sans assez de contenu n'apparaît pas, sans message à l'enfant. Rien n'est enregistré.
// Adresse : chapitre.html?…&rubrique=joue (menu), puis &jeu=<id> (un jeu).
import { el, icone } from './outils.js?v=c6de7ac4';
import { chercherFichiers } from './cartes.js?v=c6de7ac4';
import { chargerAvatar } from './avatar.js?v=c6de7ac4';
import juist from './jeu-juist.js?v=c6de7ac4';
import loto from './jeu-loto.js?v=c6de7ac4';
import memory from './jeu-memory.js?v=c6de7ac4';
import oie, { oieDifficile } from './jeu-oie.js?v=c6de7ac4';
import phrases from './jeu-phrases.js?v=c6de7ac4';
import boss, { bossDifficile } from './jeu-boss.js?v=c6de7ac4';

// Chaque jeu : { id (dans l'adresse), nom, lang (si le nom est en néerlandais), icone, possible(contenu), lancer(zone, contenu) },
// et `pleinEcran` pour masquer la barre des rubriques pendant le jeu.
// Les jeux s'ajoutent ici un par un, quand ils sont prêts.
export const JEUX = [juist, loto, memory, oie, oieDifficile, phrases, boss, bossDifficile];

// Ce que les jeux utilisent : les mots avec leur indice (`ind`) et leur son (`son`), les phrases avec leur son.
export async function contenuJeux(donnees, dossier, langue, annee) {
  const { presents, indices } = await chercherFichiers(donnees, dossier);
  const aSon = (x) => presents.has(`${dossier}audio/${x.id}.m4a`);
  return {
    langue, annee, dossier, presents,
    boss: donnees.boss, // nom du monstre du combat de boss (ligne « boss: » du chapitre)
    n: annee === 'p3' ? 3 : 4, // 3 choix en P3, 4 en P4, comme les exercices
    mots: donnees.mots.map((m, k) => ({ ...m, ind: indices[k], son: aSon(m) })),
    phrases: donnees.phrases.map((p) => ({ ...p, son: aSon(p) })),
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
    if (choisi.pleinEcran) document.getElementById('onglets').hidden = true;
    choisi.lancer(zone, contenu);
    // Sur téléphone, le jeu remonte en haut de l'écran : les boutons de réponse restent visibles sans défiler.
    requestAnimationFrame(() => conteneur.scrollIntoView({ block: 'start' }));
    return;
  }
  if (!possibles.length) {
    conteneur.replaceChildren(el('p', { class: 'bientot-ici' }, icone('puzzle'), 'Pas encore de jeu dans ce chapitre.'));
    return;
  }
  conteneur.replaceChildren(
    el('h2', { class: 'consigne' }, icone('puzzle'), 'Choisis un jeu.'),
    el('ul', { class: 'liste' }, ...possibles.map((j) => el('li', {},
      el('a', { class: 'choix', href: lienJeu(j.id) },
        el('span', { class: 'num' }, icone(j.icone)),
        el('span', { class: 'titre', lang: j.lang }, j.nom),
        el('span', { class: 'fleche' }, icone('droite')))))));
}
