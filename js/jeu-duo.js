// Duel à deux (cahier 7.9, v1.95, demandé par l'enseignant le 2026-11-19) : deux élèves l'un contre l'autre,
// une tablette posée à plat entre eux. L'écran est coupé en deux moitiés ; celle du haut est tournée pour le joueur d'en face.
// À chaque manche, chacun choisit d'abord en secret son action (attaque, bouclier, soin, force : l'idée des intentions
// du combat de boss, inspirées de Fluyo) ; puis la même question des deux côtés : le premier qui touche la bonne réponse
// fait son action. Celui qui fait tomber l'autre à 0 cœur gagne. Décor, musique et questions : ceux du combat de boss.
import { el, icone } from './outils.js?v=0b1d5cd9';
import { arreter, creerLecteur } from './audio.js?v=0b1d5cd9';
import { cheminSon } from './donnees.js?v=0b1d5cd9';
import { jouer, arreterMusique } from './musique.js?v=0b1d5cd9';
import { disponibles, question, fete } from './exercices.js?v=0b1d5cd9';
import oie, { planOie } from './jeu-oie.js?v=0b1d5cd9';
import { boutonMusiqueCombat, decorer, coeurs, bouger, POP, SECOUE } from './jeu-boss.js?v=0b1d5cd9';

// 5 cœurs chacun ; au bout de 20 questions, celui qui a le plus de cœurs gagne (sinon, égalité).
export const DUEL = { coeurs: 5, limite: 20 };

// [pictogramme, nom, ce qu'elle fait] de chaque action.
export const ACTIONS = {
  attaque: ['epee', 'Attaque', 'L\'autre perd 1 cœur.'],
  bouclier: ['bouclier', 'Bouclier', 'Pare la prochaine attaque.'],
  soin: ['coeur-plus', 'Soin', 'Reprends 1 cœur.'],
  force: ['tempete', 'Force', 'Ta prochaine attaque compte double.'],
};

export const depart = () => ({ coeurs: [DUEL.coeurs, DUEL.coeurs], bouclier: [false, false], force: [false, false] });

// Ce que le joueur k peut choisir : pas de soin à cœurs pleins, pas de second bouclier ni de seconde force en réserve.
export function permises(e, k) {
  return Object.keys(ACTIONS).filter((a) => !(a === 'soin' && e.coeurs[k] === DUEL.coeurs)
    && !(a === 'bouclier' && e.bouclier[k]) && !(a === 'force' && e.force[k]));
}

// Le gagnant g de la manche fait son action. Rend le nouvel état et ce qui s'est passé (`effet`).
// Une attaque contre un bouclier est parée (bouclier et force sont alors dépensés).
export function agir(e, g, action) {
  const a = 1 - g;
  const n = { coeurs: [...e.coeurs], bouclier: [...e.bouclier], force: [...e.force] };
  if (action === 'attaque') {
    const degats = e.force[g] ? 2 : 1;
    n.force[g] = false;
    if (e.bouclier[a]) { n.bouclier[a] = false; return { etat: n, effet: 'pare' }; }
    n.coeurs[a] = Math.max(0, e.coeurs[a] - degats);
    return { etat: n, effet: degats === 2 ? 'double' : 'touche' };
  }
  if (action === 'soin') n.coeurs[g] = Math.min(DUEL.coeurs, e.coeurs[g] + 1);
  if (action === 'bouclier') n.bouclier[g] = true;
  if (action === 'force') n.force[g] = true;
  return { etat: n, effet: action };
}

// Gagnant du duel : celui qui a encore des cœurs quand l'autre n'en a plus, ou le plus de cœurs à la limite ; null : égalité.
export function vainqueur(e) {
  if (e.coeurs[0] === e.coeurs[1]) return null;
  return e.coeurs[0] > e.coeurs[1] ? 0 : 1;
}

// Une manche : personne ne l'a encore gagnée, personne n'est bloqué.
export const nouvelleManche = () => ({ gagnant: null, bloques: [false, false], finie: false });

// Toucher du joueur 0 (en bas) ou 1 (en haut). Bonne réponse : il gagne la manche. Erreur : il est bloqué jusqu'à
// la question suivante (pour ne pas toucher au hasard) ; les deux bloqués, la manche finit sans gagnant.
// Un toucher qui ne compte plus (manche finie, joueur bloqué) rend la manche telle quelle.
export function toucher(m, joueur, juste) {
  if (m.finie || m.bloques[joueur]) return m;
  if (juste) return { ...m, gagnant: joueur, finie: true };
  const bloques = m.bloques.map((b, k) => b || k === joueur);
  return { ...m, bloques, finie: bloques.every(Boolean) };
}

const NOMS = ['Joueur 1', 'Joueur 2'];
const PAUSE = [1800, 2100]; // avant la manche suivante : après une action, après une manche sans gagnant

// Ce que lit chaque joueur après l'action du gagnant g : [pour le gagnant, pour l'autre].
function textes(effet, g) {
  const n = NOMS[g];
  return {
    touche: ['Bravo ! Ton attaque touche !', `${n} t'attaque : 1 cœur.`],
    double: ['Bravo ! Attaque double !', `${n} t'attaque avec force : 2 cœurs.`],
    pare: ['Bravo ! Mais son bouclier pare.', 'Ton bouclier a paré l\'attaque !'],
    bouclier: ['Bravo ! Ton bouclier est prêt.', `${n} lève son bouclier.`],
    soin: ['Bravo ! Tu reprends un cœur.', `${n} reprend un cœur.`],
    force: ['Bravo ! Ta prochaine attaque compte double.', `${n} prend de la force !`],
  }[effet];
}

// Chaque doigt compte à part (« pointerup ») : deux joueurs peuvent toucher en même temps, un « click » serait
// perdu sur certaines tablettes. Au clavier (detail 0), le « click » suffit.
function auDoigt(b, f) {
  b.addEventListener('pointerup', f);
  b.addEventListener('click', (e) => { if (!e.detail) f(); });
}

function lancer(zone, contenu) {
  const ctx = { ...contenu, dispo: disponibles(contenu.mots, contenu.phrases, contenu.n, contenu.annee === 'grammaire'), sansAvatar: true, sansSon: true, sansDefilement: true };
  zone.classList.add('combat-duo'); // écran en deux moitiés (CSS)
  let etat = depart();
  let plan = [];
  let questions = 0;
  const musique = contenu.revision ? 'fin-annee' : 'combat';
  let stressante = false;
  jouer(musique);

  // Au milieu : le décor du chapitre, les deux pions face à face et le bouton « Musique ».
  const arene = el('div', { class: 'arene arene-duo' },
    el('span', { class: 'pion-duo j1' }, icone('pion')), el('span', { class: 'pion-duo j2' }, icone('pion')), boutonMusiqueCombat());
  decorer(arene, contenu, false, false);

  // Une moitié par joueur : son nom, ses cœurs, son bouclier ou sa force en réserve, puis le choix ou la question.
  const joueurs = NOMS.map((n, k) => {
    const vies = coeurs('duel', n, DUEL.coeurs);
    const reserve = el('span', { class: 'reserve-duo' });
    const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
    const place = el('div', { class: 'question-duo' });
    const moitie = el('section', { class: `moitie j${k + 1}`, 'aria-label': n },
      el('div', { class: 'nom-joueur' }, icone('pion'), el('span', {}, n), reserve, vies), place, retour);
    return { moitie, vies, reserve, retour, place };
  });
  const afficher = () => joueurs.forEach((j, k) => {
    j.vies.mettre(etat.coeurs[k]);
    const en = [etat.bouclier[k] && ['bouclier', 'bouclier prêt'], etat.force[k] && ['tempete', 'force prête']].filter(Boolean);
    j.reserve.replaceChildren(...en.map(([ic, texte]) => el('span', { role: 'img', 'aria-label': texte }, icone(ic))));
  });
  const dire = (k, ic, texte) => joueurs[k].retour.replaceChildren(...(texte ? [icone(ic), texte] : []));
  const marquer = (b, juste) => { b.classList.add(juste ? 'juste' : 'faux'); b.prepend(el('span', { class: 'marque-ex' }, icone(juste ? 'coche' : 'croix'))); };

  // 1. Chacun choisit son action en secret : une fois touchée, elle se cache (« Prêt ! »).
  function choisir() {
    if (!arene.isConnected) return; // duel quitté ou relancé entre-temps
    arreter();
    const choix = [null, null];
    joueurs.forEach((j, k) => {
      const ok = permises(etat, k);
      const boutons = Object.entries(ACTIONS).map(([id, [ic, nom, effet]]) => {
        const b = el('button', { type: 'button', class: 'action-duo', disabled: !ok.includes(id) },
          icone(ic), el('span', { class: 'nom-action' }, nom), el('span', { class: 'effet-action' }, effet));
        auDoigt(b, () => {
          if (b.disabled || choix[k] || !b.isConnected) return;
          choix[k] = id;
          j.place.replaceChildren(el('p', { class: 'pret-duo' }, icone('coche'), 'Prêt !'));
          if (choix.every(Boolean)) manche(choix); else dire(k, 'bulle', 'Attends l\'autre joueur.');
        });
        return b;
      });
      j.place.replaceChildren(el('h2', { class: 'consigne' }, icone('cle'), 'Choisis ton action en secret.'), el('div', { class: 'actions-duo' }, ...boutons));
      dire(k);
    });
  }

  // 2. La même question des deux côtés : le premier qui répond juste fait son action.
  function manche(choix) {
    questions += 1;
    if (!plan.length) plan = planOie(ctx.dispo, 20);
    const q = plan.shift();
    // La question est fabriquée une fois par le moteur des exercices, puis recopiée dans chaque moitié :
    // mêmes réponses, dans le même ordre. Les touchers sont gérés ici, pas par le moteur.
    const modele = question(q, ctx, true, 1, 0, () => {});
    const justes = [...modele.querySelectorAll('.reponse')].map((b) => b.juste);
    let m = nouvelleManche();
    const parts = joueurs.map((j, k) => {
      const enonce = modele.querySelector('.enonce').cloneNode(true);
      // « Écoute » : chacun son bouton d'écoute (une copie ne joue pas) ; un seul son à la fois (lecteur unique).
      const ecoute = q.variante === 'ecoute' ? (k ? creerLecteur(cheminSon(q.cible, ctx.dossier), { nom: 'le mot à écouter' }) : modele.ecoute) : null;
      if (ecoute) enonce.replaceChildren(ecoute);
      const reponses = modele.querySelector('.reponses').cloneNode(true);
      const boutons = [...reponses.children];
      boutons.forEach((b, i) => { b.juste = justes[i]; auDoigt(b, () => repondre(k, b)); });
      j.place.replaceChildren(modele.titre.cloneNode(true), enonce, reponses);
      dire(k, 'epee', 'Touche vite la bonne réponse !');
      return { boutons, ecoute };
    });

    function repondre(k, b) {
      if (b.disabled) return;
      const avant = m;
      m = toucher(m, k, b.juste);
      if (m === avant) return;
      marquer(b, b.juste);
      if (!b.juste) {
        parts[k].boutons.forEach((x) => { x.disabled = true; });
        dire(k, 'bulle', 'Attends la question suivante.');
      }
      if (m.finie) finir();
    }

    function finir() {
      // La bonne réponse se voit des deux côtés.
      for (const p of parts) {
        for (const x of p.boutons) {
          x.disabled = true;
          if (x.juste && !x.classList.contains('juste')) { marquer(x, true); x.classList.add('montree'); }
        }
      }
      const g = m.gagnant;
      if (g !== null) {
        const avant = etat;
        const { etat: apres, effet } = agir(etat, g, choix[g]);
        etat = apres;
        afficher();
        const [pourMoi, pourLui] = textes(effet, g);
        dire(g, ACTIONS[choix[g]][0], pourMoi);
        dire(1 - g, ACTIONS[choix[g]][0], pourLui);
        const touche = 1 - g;
        if (etat.coeurs[touche] < avant.coeurs[touche]) {
          bouger(joueurs[touche].vies, SECOUE, { duration: 300 });
          for (let c = etat.coeurs[touche]; c < avant.coeurs[touche]; c++) bouger(joueurs[touche].vies.children[c], POP, { duration: 350 });
        }
        if (effet === 'soin') bouger(joueurs[g].vies.children[etat.coeurs[g] - 1], POP, { duration: 350 });
        bouger(joueurs[effet === 'pare' ? touche : g].reserve, POP, { duration: 350 });
      } else joueurs.forEach((_, k) => dire(k, 'bulle', 'Voici la bonne réponse.'));
      // Plus qu'un cœur pour l'un des deux : la musique devient stressante.
      if (!stressante && Math.min(...etat.coeurs) === 1) { stressante = true; jouer(`${musique}-un-coeur`, true); }
      const fini = !Math.min(...etat.coeurs) || questions >= DUEL.limite;
      const suite = () => { if (arene.isConnected) (fini ? victoire() : choisir()); };
      const pause = PAUSE[g === null ? 1 : 0];
      // « Écoute » : le mot est redit après la manche (juste après un toucher : permis), puis la pause.
      const lecteur = parts[0].ecoute;
      if (!lecteur) return setTimeout(suite, pause);
      let attend = false;
      const attendre = () => { if (!attend) { attend = true; setTimeout(suite, pause); } };
      lecteur.addEventListener('fin', attendre, { once: true });
      setTimeout(attendre, 8000); // un son qui ne part pas ne bloque pas le duel
      lecteur.jouer();
    }
  }

  // Fin : aucun mot négatif pour personne (cahier §8).
  function victoire() {
    arreterMusique();
    const g = vainqueur(etat);
    joueurs.forEach((j, k) => {
      const [ic, titre, phrase] = g === null ? ['sourire', 'Égalité !', 'Vous êtes aussi forts l\'un que l\'autre.']
        : k === g ? ['etoile', 'Tu as gagné le duel !', 'Bravo, champion !'] : ['sourire', 'Bien joué !', 'La revanche sera serrée !'];
      j.place.replaceChildren(el('div', { class: 'bilan' }, el('h2', {}, icone(ic), titre), el('p', {}, phrase)));
      dire(k);
    });
    const titre = el('h2', { tabindex: '-1' }, icone('sourire'), 'Bravo à tous les deux !');
    const rejouer = el('button', { type: 'button', class: 'action' }, icone('tourner'), 'Rejouer');
    rejouer.addEventListener('click', () => { lancer(zone, contenu); zone.parentElement.scrollIntoView({ block: 'start' }); });
    centre.replaceChildren(titre, rejouer);
    titre.focus({ preventScroll: true });
    fete(zone);
    // Pas de flamme du jour ici (cahier 7.11) : à décider par l'enseignant.
  }

  const centre = el('div', { class: 'centre-duo', 'aria-live': 'polite' });
  zone.replaceChildren(joueurs[1].moitie, arene, centre, joueurs[0].moitie);
  afficher();
  choisir();
}

export default {
  id: 'boss-duo',
  nom: 'Le duel à deux',
  icone: 'epee',
  possible: oie.possible, // les mêmes questions que le jeu de l'oie
  pleinEcran: true, // ouvert sans changer de page : la musique part au toucher qui l'ouvre (iPhone)
  lancer,
};
