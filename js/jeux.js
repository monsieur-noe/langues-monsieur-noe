// Rubrique « Je joue » (cahier 7.9) : des jeux qui se fabriquent seuls à partir du contenu du chapitre.
// Un jeu sans assez de contenu n'apparaît pas, sans message à l'enfant. Rien n'est enregistré.
// Adresse : chapitre.html?…&rubrique=joue (menu), puis &jeu=<id> (un jeu).
import { el, icone } from './outils.js?v=22778f70';
import { cheminSon } from './donnees.js?v=22778f70';
import { chercherFichiers } from './cartes.js?v=22778f70';
import { chargerAvatar } from './avatar.js?v=22778f70';
import { amorcer } from './musique.js?v=22778f70';
import juist from './jeu-juist.js?v=22778f70';
import loto from './jeu-loto.js?v=22778f70';
import memory from './jeu-memory.js?v=22778f70';
import oie, { oieDifficile } from './jeu-oie.js?v=22778f70';
import phrases from './jeu-phrases.js?v=22778f70';
import boss, { bossDifficile } from './jeu-boss.js?v=22778f70';
import qui from './jeu-qui.js?v=22778f70';

// Chaque jeu : { id (dans l'adresse), nom, lang (si le nom est en néerlandais), icone, possible(contenu), lancer(zone, contenu) },
// et `pleinEcran` pour masquer la barre des rubriques pendant le jeu.
// Les jeux s'ajoutent ici un par un, quand ils sont prêts.
export const JEUX = [juist, loto, memory, oie, oieDifficile, phrases, qui, boss, bossDifficile];

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
    phrases: donnees.phrases.map((p) => ({ ...p, son: aSon(p) })),
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
    if (choisi.pleinEcran) document.getElementById('onglets').hidden = true;
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
  conteneur.replaceChildren(
    el('h2', { class: 'consigne' }, icone('puzzle'), 'Choisis un jeu.'),
    el('ul', { class: 'liste' }, ...possibles.map((j) => {
      const lien = el('a', { class: 'choix', href: lienJeu(j.id) },
        el('span', { class: 'num' }, icone(j.icone)),
        el('span', { class: 'titre', lang: j.lang }, j.nom),
        el('span', { class: 'fleche' }, icone('droite')));
      // Combat : ouvert sans changer de page. Sur iPhone, un nouveau chargement perdrait ce toucher, et la musique attendrait le suivant.
      if (j.pleinEcran) {
        lien.addEventListener('click', (e) => {
          e.preventDefault();
          amorcer();
          history.pushState(null, '', lienJeu(j.id));
          addEventListener('popstate', () => location.reload(), { once: true }); // bouton « retour » du navigateur
          afficherJeux(conteneur, contenu, j.id);
        });
      }
      return el('li', {}, lien);
    })));
}
