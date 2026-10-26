// Jeu « Le combat de boss » (cahier 7.9, demandé le 2026-10-25) : un monstre rigolo de fin de chapitre.
// Questions du jeu de l'oie (même moteur que « Je m'entraîne »), un seul essai chacune comme « Je vérifie ».
// L'avatar de l'enseignant combat le monstre ; l'élève l'aide en répondant (textes à la première personne).
// Bonne réponse : le monstre perd un cœur. Erreur : l'enseignant perd un cœur (la bonne réponse est montrée et dite).
// Avant chaque question, le monstre annonce son intention : deux en P3-P4, trois en P5-P6 (cahier 7.9).
import { el, icone } from './outils.js?v=c6de7ac4';
import { arreter } from './audio.js?v=c6de7ac4';
import { avatar } from './avatar.js?v=c6de7ac4';
import { disponibles, question, fete } from './exercices.js?v=c6de7ac4'; // fete : pluie d'étoiles de la victoire
import { fichiersPresents } from './donnees.js?v=c6de7ac4';
import oie, { planOie } from './jeu-oie.js?v=c6de7ac4';

export const VIES = { boss: 5, noe: 3 };
const GRANDS = ['p5', 'p6'];
// Pause avant la question suivante, une fois le son de la réponse fini : courte si c'est juste,
// plus longue après une erreur pour bien voir la bonne réponse (pas de bouton à toucher, demande du 2026-10-25).
const ENCHAINER = [1000, 2100];
export const LIMITE = 12; // P5-P6 : au-delà, le monstre s'enfuit (une erreur n'y coûte pas toujours un cœur)

// [pictogramme, annonce, explication] de chaque intention.
const INTENTIONS = {
  attaque: ['epee', 'Il attaque !', 'Si tu te trompes, je perds un cœur.'],
  soin: ['coeur-plus', 'Il veut se soigner !', 'Si tu te trompes, il reprend un cœur.'],
  protege: ['bouclier', 'Il se protège !', 'Deux bonnes réponses de suite pour le toucher.'],
  renforce: ['coeur-plus', 'Il se renforce !', 'Si tu te trompes, il reprend un cœur.'],
};
// Version difficile (demande du 2026-10-25) : un seul cœur pour moi, des annonces plus menaçantes.
export const VIE_DIFFICILE = 1;
const INTENTIONS_DIFFICILE = {
  attaque: ['epee', 'Il prépare un coup terrible !', 'Si tu te trompes, je suis battu.'],
  soin: ['coeur-plus', 'Il reprend des forces !', 'Si tu te trompes, je suis battu.'],
  protege: ['bouclier', 'Il se cache sous sa carapace !', 'Deux bonnes réponses de suite pour le toucher.'],
  renforce: ['coeur-plus', 'Il devient encore plus fort !', 'Si tu te trompes, il reprend un cœur.'],
};

// Intention tirée au hasard. P3-P4 : « soin » une fois sur trois, seulement s'il a perdu un cœur et ne s'est
// encore jamais soigné (le combat reste court : 8 questions au plus). P5-P6 : attaque, protège ou renforce.
export function intention(annee, vies, aSoigne) {
  const blesse = vies.boss < VIES.boss;
  const choix = GRANDS.includes(annee)
    ? ['attaque', 'protege', ...(blesse ? ['renforce'] : [])]
    : ['attaque', 'attaque', ...(blesse && !aSoigne ? ['soin'] : [])];
  return choix[Math.floor(Math.random() * choix.length)];
}

// Les cœurs après une réponse. `bouclier` : bonnes réponses d'affilée contre le bouclier, celle-ci comprise.
export function coup({ boss, noe }, juste, but = 'attaque', bouclier = 0) {
  if (juste) return { boss: but === 'protege' && bouclier < 2 ? boss : boss - 1, noe };
  return {
    boss: but === 'soin' || but === 'renforce' ? Math.min(VIES.boss, boss + 1) : boss,
    noe: but === 'protege' || but === 'renforce' ? noe : noe - 1,
  };
}

// Rangée de cœurs, pleins ou vides : la forme change, pas seulement la couleur.
function coeurs(qui, nom, total) {
  const p = el('p', { class: `coeurs ${qui}`, role: 'img' });
  p.mettre = (reste) => {
    p.setAttribute('aria-label', `${nom} : ${reste} cœur${reste > 1 ? 's' : ''} sur ${total}`);
    p.replaceChildren(...Array.from({ length: total }, (_, k) => el('span', { class: k < reste ? 'plein' : '' }, icone('coeur'))));
  };
  return p;
}

const calme = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Petites animations du combat (0,25 à 0,6 s, sans clignotement), coupées si l'appareil demande moins d'animations.
function bouger(noeud, images, options) {
  return noeud && !calme() ? noeud.animate(images, { easing: 'ease-out', ...options }) : null;
}
const POP = [{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }]; // un cœur qui se vide
const NAIT = [{ transform: 'scale(0)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }]; // un cœur qui apparaît
// Le monstre est en haut à droite, l'avatar en bas à gauche : chacun bondit en diagonale vers l'autre.
const ATTAQUE = [{ transform: 'none' }, { transform: 'translate(-1.5rem, 1rem) scale(1.1)' }, { transform: 'none' }];
const ELAN = [{ transform: 'none' }, { transform: 'translate(1.5rem, -1rem)' }, { transform: 'none' }];
const TOUCHE = [{ transform: 'none' }, { transform: 'translateX(.75rem) rotate(10deg)' }, { transform: 'none' }];
// Bouclier qui surgit devant l'avatar, tient un instant, puis s'efface.
const PARADE = [
  { opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.15)', offset: 0.3 },
  { opacity: 1, transform: 'scale(1)', offset: 0.75 }, { opacity: 0, transform: 'scale(1)' }];
const ESQUIVE = [{ transform: 'none' }, { transform: 'translate(.75rem, -1.25rem)' }, { transform: 'none' }]; // le monstre évite mon attaque
const MONTE = [ // cœur « + » qui s'élève au-dessus du monstre quand il se soigne
  { opacity: 0, transform: 'translateY(.5rem) scale(.6)' }, { opacity: 1, transform: 'translateY(-.5rem) scale(1)', offset: 0.3 },
  { opacity: 0, transform: 'translateY(-2.25rem) scale(1)' }];
const RECUL = [{ transform: 'none' }, { transform: 'translateX(-.75rem) rotate(-6deg)' }, { transform: 'none' }];
const DE_DROITE = [{ transform: 'translateX(60vw)', opacity: 0 }, { transform: 'translateX(-.4rem)', opacity: 1, offset: 0.8 }, { transform: 'none' }];
const DE_GAUCHE = [{ transform: 'translateX(-60vw)', opacity: 0 }, { transform: 'translateX(.4rem)', opacity: 1, offset: 0.8 }, { transform: 'none' }];
const SOIN = [{ transform: 'none' }, { transform: 'translateY(-.9rem)' }, { transform: 'none' }];
const SECOUE = [{ transform: 'none' }, { transform: 'translateX(-.3rem)' }, { transform: 'translateX(.3rem)' }, { transform: 'none' }];
const DANSE = [{ transform: 'none' }, { transform: 'translateY(-1rem)' }, { transform: 'none' }, { transform: 'translateY(-1rem)' }, { transform: 'none' }]; // victoire : deux sauts de joie
const RELEVE = [{ transform: 'translateY(.5rem) rotate(-8deg)' }, { transform: 'translateY(-.75rem)' }, { transform: 'none' }]; // défaite : je me relève
// Le monstre se prépare avant chaque question, selon son intention : il se penche vers moi, se gonfle ou se ramasse.
const PENCHE = [{ transform: 'none' }, { transform: 'translate(-.5rem, .25rem) rotate(-8deg)' }, { transform: 'none' }];
const GONFLE = [{ transform: 'none' }, { transform: 'scale(1.1)' }, { transform: 'none' }];
const PREPARE = {
  attaque: PENCHE, soin: GONFLE, renforce: GONFLE,
  protege: [{ transform: 'none' }, { transform: 'scale(.9, 1.06)' }, { transform: 'none' }],
};
export const SUPER = 3; // bonnes réponses d'affilée pour une super-attaque (traînée d'étoiles, mêmes règles)


function lancer(zone, contenu, difficile) {
  // `sansAvatar` : l'avatar est dans l'arène, pas à côté de « Bravo ! » (un seul avatar à l'écran, cahier 7.8).
  // Nom du monstre : la ligne « boss: » du chapitre, sinon « le monstre » (avec une majuscule en début de phrase).
  const nom = contenu.boss || 'le monstre';
  const Nom = nom[0].toUpperCase() + nom.slice(1);
  const ctx = { ...contenu, dispo: disponibles(contenu.mots, contenu.phrases, contenu.n), sansAvatar: true, sansDefilement: true, enchainer: ENCHAINER };
  const max = { boss: VIES.boss, noe: difficile ? VIE_DIFFICILE : VIES.noe };
  let vies = { ...max };
  let plan = [];
  zone.classList.toggle('boss-difficile', difficile); // arène sombre, monstre plus inquiétant (CSS)
  let but = null;
  let bouclier = 0;
  let aSoigne = false;
  let questions = 0;
  let retourNeutre = 0;
  let serie = 0; // bonnes réponses d'affilée
  let preparation = null;

  // Bouclier du monstre (P5-P6) et cœur « + » de son soin : invisibles hors de leur animation.
  const bouclierBoss = el('span', { class: 'parade parade-boss', 'aria-hidden': 'true' }, icone('bouclier'));
  const soinBoss = el('span', { class: 'soin-boss', 'aria-hidden': 'true' }, icone('coeur-plus'));
  // Le monstre : son dessin `boss.svg` (ou `.png`) dans le dossier du chapitre ; en attendant, la forme provisoire.
  // Version difficile : `boss-difficile.svg` (ou `.png`) ; sans lui, le dessin de base assombri (CSS `.de-base`).
  const monstre = el('div', { class: 'monstre' }, icone(difficile ? 'monstre-fort' : 'monstre'), bouclierBoss, soinBoss);
  const fichiers = (n) => [`${contenu.dossier}${n}.svg`, `${contenu.dossier}${n}.png`];
  fichiersPresents([...(difficile ? fichiers('boss-difficile') : []), ...fichiers('boss')]).then((p) => {
    const dessin = [...p][0];
    if (dessin) {
      monstre.firstChild.replaceWith(el('img', {
        class: `dessin-boss${difficile && !dessin.includes('difficile') ? ' de-base' : ''}`, src: dessin, alt: '' }));
    }
  });
  const prof = avatar('neutre'); // sans dessin d'avatar : rien, le cadre « Monsieur Noé » suffit
  const bouclierProf = el('span', { class: 'parade', 'aria-hidden': 'true' }, icone('bouclier')); // invisible hors parade
  const coeursBoss = coeurs('boss', Nom, max.boss);
  const coeursNoe = coeurs('noe', 'Monsieur Noé', max.noe);
  const cadreBoss = el('div', { class: 'cadre-vies' }, el('span', { class: 'nom-vies' }, Nom), coeursBoss);
  const cadreNoe = el('div', { class: 'cadre-vies' }, el('span', { class: 'nom-vies' }, 'Monsieur Noé'), coeursNoe);
  const placeProf = el('div', { class: 'place-prof' }, prof, bouclierProf);
  // Arène face à face : en haut, le cadre du monstre et le monstre ; en bas, l'avatar et le cadre de l'enseignant.
  const arene = el('div', { class: 'arene' }, cadreBoss, monstre, placeProf, cadreNoe);
  const annonce = el('div', { class: 'intention', 'aria-live': 'polite' });
  const questionZone = el('div', { class: 'zone-exercice' });
  const relancer = () => lancer(zone, contenu, difficile);

  function afficherVies() {
    coeursBoss.mettre(vies.boss);
    coeursNoe.mettre(vies.noe);
  }

  // Pose de l'avatar, après `apres` ms ; `puisNeutre` : il revient en attente une seconde plus tard.
  // Une nouvelle pose (fin du combat comprise) annule celles qui attendaient encore.
  function poser(pose, puisNeutre = false, apres = 0) {
    clearTimeout(retourNeutre);
    const mettre = () => {
      prof.pose(pose);
      if (puisNeutre) retourNeutre = setTimeout(() => prof.pose('neutre'), 1000);
    };
    if (apres) retourNeutre = setTimeout(mettre, apres); else mettre();
  }

  // Ce qui bouge après une réponse : l'un attaque, l'autre est touché, ou le monstre se soigne ; le cœur qui change bondit.
  // Rend le temps avant le coup porté au monstre (pour le faire tomber après, à la victoire).
  function animer(avant, juste) {
    let parade = 0;
    // Mon attaque ratée : erreur, le monstre esquive ; ou bonne réponse contre son bouclier (P5-P6), je rebondis dessus.
    // Ensuite seulement, le monstre agit (`t`).
    const bloque = juste && vies.boss === avant.boss;
    const t = (!juste || bloque) && !calme() ? 550 : 0;
    if (t) {
      poser('attaque');
      bouger(prof, ELAN, { duration: 350 });
      if (bloque) {
        bouger(bouclierBoss, PARADE, { duration: 650, delay: 100 });
        bouger(prof, RECUL, { duration: 300, delay: 350 });
      } else bouger(monstre, ESQUIVE, { duration: 400, delay: 100 });
      if (vies.noe === avant.noe) poser('neutre', false, t + 400);
    }
    if (vies.noe < avant.noe) {
      poser('aie', true, t);
      bouger(monstre, ATTAQUE, { duration: 350, delay: t });
      bouger(prof, RECUL, { duration: 350, delay: t + 150 });
      bouger(coeursNoe, SECOUE, { duration: 300, delay: t + 150 });
      bouger(coeursNoe.children[vies.noe], POP, { duration: 350, delay: t + 150 });
    }
    if (vies.boss < avant.boss) {
      // « Il attaque ! » et bonne réponse : le monstre fonce, je pare avec mon bouclier, puis je contre-attaque.
      if (but === 'attaque' && !calme()) {
        parade = 450;
        bouger(monstre, ATTAQUE, { duration: 350 });
        bouger(bouclierProf, PARADE, { duration: 650, delay: 100 });
      }
      poser('attaque', true);
      bouger(prof, ELAN, { duration: 350, delay: parade });
      if (serie % SUPER === 0) trainee(parade);
      if (vies.boss) bouger(monstre, TOUCHE, { duration: 350, delay: parade + 150 }); // au dernier cœur, il tombe à la renverse (CSS .vaincu)
      bouger(coeursBoss.children[vies.boss], POP, { duration: 350, delay: parade + 150 });
    }
    if (vies.boss > avant.boss) {
      // Le monstre récupère un cœur : il sautille, un cœur « + » monte au-dessus de lui, son cœur revient.
      const s = t + (vies.noe < avant.noe ? 400 : 0);
      bouger(monstre, SOIN, { duration: 400, delay: s });
      bouger(soinBoss, MONTE, { duration: 800, delay: s });
      bouger(coeursBoss.children[vies.boss - 1], NAIT, { duration: 400, delay: s + 350, fill: 'backwards' });
    }
    return parade;
  }

  // Super-attaque (après SUPER bonnes réponses d'affilée) : trois étoiles filent de l'avatar vers le monstre.
  function trainee(delai) {
    if (calme()) return;
    const centre = (n) => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const { left: ax, top: ay } = arene.getBoundingClientRect(); // les étoiles sont placées dans l'arène
    const [px, py] = centre(placeProf); // la place de l'avatar existe même sans dessin
    const [mx, my] = centre(monstre);
    for (let k = 0; k < 3; k++) {
      const s = el('span', { class: 'etoile-super', 'aria-hidden': 'true' }, icone('etoile'));
      s.style.left = `${px - ax}px`;
      s.style.top = `${py - ay}px`;
      arene.append(s);
      s.animate([
        { transform: 'translate(-50%, -50%) scale(.5)', opacity: 0 }, { opacity: 1, offset: 0.2 },
        { transform: `translate(calc(${mx - px}px - 50%), calc(${my - py}px - 50%)) scale(1)`, opacity: 0 }],
      { duration: 500, delay: delai + k * 90, easing: 'ease-in', fill: 'backwards' }).onfinish = () => s.remove();
    }
  }

  // Début du combat : le monstre arrive par la droite, l'avatar par la gauche, puis les cadres et leurs cœurs.
  function entree() {
    bouger(monstre, DE_DROITE, { duration: 600 });
    bouger(prof, DE_GAUCHE, { duration: 600 });
    [cadreBoss, cadreNoe].forEach((c) => bouger(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: 400, fill: 'backwards' }));
    [...coeursBoss.children, ...coeursNoe.children].forEach((c, k) => bouger(c, NAIT, { duration: 250, delay: 500 + k * 90, fill: 'backwards' }));
  }

  function annoncer() {
    const [ic, titre, explication] = (difficile ? INTENTIONS_DIFFICILE : INTENTIONS)[but];
    annonce.replaceChildren(icone(ic), el('p', {}, el('strong', {}, titre), el('br'),
      but === 'protege' && bouclier ? 'Encore une bonne réponse pour le toucher !' : explication));
  }

  // Fin du combat : l'avatar de l'arène prend la pose, l'écran de fin n'en ajoute pas un second.
  function fin(pose, ic, titreTexte, phrase, bouton) {
    annonce.replaceChildren();
    poser(pose);
    const titre = el('h2', { tabindex: '-1' }, icone(ic), titreTexte);
    const b = el('button', { type: 'button', class: 'action' }, icone('tourner'), bouton);
    b.addEventListener('click', relancer);
    questionZone.replaceChildren(el('div', { class: 'bilan' }, titre, el('p', {}, phrase), b));
    titre.focus({ preventScroll: true });
  }

  function tour(_premierCoup, juste) {
    arreter();
    preparation?.cancel(); // le monstre ne se prépare plus : on vient de répondre
    let parade = 0;
    if (juste !== undefined) {
      serie = juste ? serie + 1 : 0;
      bouclier = but === 'protege' && juste ? bouclier + 1 : 0;
      const avant = vies;
      vies = coup(vies, juste, but, bouclier);
      aSoigne ||= vies.boss > avant.boss;
      if (bouclier === 2) bouclier = 0; // bouclier cassé
      afficherVies();
      // L'arène revient à l'écran seulement si elle en est sortie par le haut (téléphone) : sinon la page ne bouge pas.
      if (arene.getBoundingClientRect().top < 0) arene.scrollIntoView({ block: 'start' });
      parade = animer(avant, juste);
    }
    if (!vies.boss) {
      setTimeout(() => monstre.classList.add('vaincu'), parade);
      fin('bravo', 'sourire', difficile ? 'Incroyable, bravo !' : 'C\'est fini, bravo !',
        `On a ${difficile ? 'vaincu' : 'battu'} ${nom} ensemble !`, 'Recommencer');
      bouger(prof, DANSE, { duration: 900, delay: parade + 450 });
      return fete(zone);
    }
    if (!vies.noe || questions === LIMITE) {
      fin('encourage', 'bulle', vies.noe ? `${Nom} s'est enfui !` : `${Nom} ${difficile ? 'était trop fort' : 'a gagné'} cette fois.`, 'On réessaie ?', 'Réessayer');
      return bouger(prof, RELEVE, { duration: 600, delay: 1300 }); // je me relève, prêt pour la revanche
    }
    // Le bouclier reste annoncé tant qu'il n'est pas cassé (deux bonnes réponses d'affilée).
    if (!bouclier) but = intention(contenu.annee, vies, aSoigne);
    annoncer();
    // Une fois les animations de la réponse finies (ou l'entrée du combat), le monstre montre ce qu'il prépare.
    preparation = bouger(monstre, PREPARE[but], { duration: 600, delay: juste === undefined ? 1300 : 1800 });
    questions += 1;
    if (!plan.length) plan = planOie(ctx.dispo, 20);
    const q = question(plan.shift(), ctx, true, 1, 0, tour); // un seul essai ; total 0 : ni compteur ni « Terminer »
    questionZone.replaceChildren(q);
    if (juste !== undefined) q.titre.focus({ preventScroll: true });
  }

  zone.replaceChildren(
    el('p', { class: 'consigne-oie' }, icone('epee'),
      difficile ? `${Nom} est furieux ! Aide-moi à le vaincre !` : `Aide-moi à battre ${nom} !`),
    arene,
    annonce,
    questionZone);
  afficherVies();
  entree();
  tour();
}

export default {
  id: 'boss',
  nom: 'Le combat de boss',
  icone: 'epee',
  possible: oie.possible, // les mêmes questions que le jeu de l'oie
  pleinEcran: true, // sans la barre des rubriques, pour laisser la place à l'arène (demande du 2026-10-25)
  lancer: (zone, contenu) => lancer(zone, contenu, false),
};

export const bossDifficile = {
  id: 'boss-difficile',
  nom: 'Le combat de boss difficile',
  icone: 'epee',
  possible: oie.possible,
  pleinEcran: true,
  lancer: (zone, contenu) => lancer(zone, contenu, true),
};
