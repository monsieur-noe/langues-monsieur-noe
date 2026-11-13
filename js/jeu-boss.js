// Jeu « Le combat de boss » (cahier 7.9, demandé le 2026-10-25) : un monstre rigolo de fin de chapitre.
// Questions du jeu de l'oie (même moteur que « Je m'entraîne »), un seul essai chacune comme « Je vérifie ».
// L'avatar de l'enseignant combat le monstre ; l'élève l'aide en répondant (textes à la première personne).
// Bonne réponse : le monstre perd un cœur. Erreur : l'enseignant perd un cœur (la bonne réponse est montrée et dite).
// Avant chaque question, le monstre annonce son intention : deux en P3-P4, trois en P5-P6 (cahier 7.9).
import { el, icone, muet } from './outils.js?v=4a69adff';
import { arreter } from './audio.js?v=4a69adff';
import { jouer, arreterMusique, couper, coupee, existe } from './musique.js?v=4a69adff';
import { avatar } from './avatar.js?v=4a69adff';
import { disponibles, question, fete } from './exercices.js?v=4a69adff'; // fete : pluie d'étoiles de la victoire
import { fichiersPresents } from './donnees.js?v=4a69adff';
import oie, { planOie } from './jeu-oie.js?v=4a69adff';

export const VIES = { boss: 5, noe: 3 };
const GRANDS = ['p5', 'p6', 'grammaire']; // la grammaire suit les règles de P5-P6 (v1.65)
// Pause avant la question suivante, une fois le son de la réponse fini : courte si c'est juste,
// plus longue après une erreur pour bien voir la bonne réponse (pas de bouton à toucher, demande du 2026-10-25).
const ENCHAINER = [1000, 2100];
export const LIMITE = 12; // P5-P6 : au-delà, le monstre s'enfuit (une erreur n'y coûte pas toujours un cœur)
// Combat Expert (demande du 2026-11-09) : 10 cœurs pour le monstre, 1 pour moi, 4 réponses, plus de questions « Écoute »,
// et un minuteur de 10 s (exception voulue par l'enseignant au « aucun chronomètre » du cahier §8, Expert seulement).
export const EXPERT = { boss: 10, limite: 20, minuteur: 10000 };
// Deuxième phase (Expert, v1.64) : à la moitié de sa vie (5 cœurs sur 10), le monstre se met en colère ; ses annonces deviennent plus menaçantes.
const INTENTIONS_RAGE = {
  attaque: ['epee', 'Il déchaîne sa colère !', 'Si tu te trompes, je suis battu.'],
  soin: ['coeur-plus', 'Il puise dans sa magie !', 'Si tu te trompes, je suis battu.'],
  protege: ['bouclier', 'Il dresse un mur magique !', 'Deux bonnes réponses de suite pour le toucher.'],
  renforce: ['coeur-plus', 'Il absorbe la foudre !', 'Si tu te trompes, il reprend un cœur.'],
};

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
export function intention(annee, vies, aSoigne, max = VIES.boss) {
  const blesse = vies.boss < max;
  const choix = GRANDS.includes(annee)
    ? ['attaque', 'protege', ...(blesse ? ['renforce'] : [])]
    : ['attaque', 'attaque', ...(blesse && !aSoigne ? ['soin'] : [])];
  return choix[Math.floor(Math.random() * choix.length)];
}

// Les cœurs après une réponse. `bouclier` : bonnes réponses d'affilée contre le bouclier, celle-ci comprise.
export function coup({ boss, noe }, juste, but = 'attaque', bouclier = 0, max = VIES.boss) {
  if (juste) return { boss: but === 'protege' && bouclier < 2 ? boss : boss - 1, noe };
  return {
    boss: but === 'soin' || but === 'renforce' ? Math.min(max, boss + 1) : boss,
    noe: but === 'protege' || but === 'renforce' ? noe : noe - 1,
  };
}

// Rangée de cœurs, pleins ou vides : la forme change, pas seulement la couleur.
function coeurs(qui, nom, total) {
  const p = el('p', { class: `coeurs ${qui}${total > 5 ? ' dix' : ''}`, role: 'img' }); // 10 cœurs : 2 lignes de 5 (CSS)
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
const PAF = [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.25)', offset: 0.4 }, { opacity: 0, transform: 'scale(1)' }]; // étoile du coup qui touche
// Victoire : le monstre tourne en rétrécissant et disparaît dans des volutes de fumée ; fuite (P5-P6) : il part par la droite.
const DISPARAIT = [{ transform: 'none' }, { transform: 'rotate(360deg) scale(.2)', opacity: 0 }];
const FUITE = [{ transform: 'none' }, { transform: 'translateX(-.5rem)', offset: 0.25 }, { transform: 'translateX(60vw)', opacity: 0 }];
const TREMBLE = [{ transform: 'none' }, { transform: 'translateX(-.15rem)' }, { transform: 'translateX(.15rem)' }, { transform: 'none' }]; // super-attaque : l'arène tremble à peine
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
// En même temps, le pictogramme de l'annonce fait son geste : l'épée frappe, le bouclier se lève, le cœur « + » gonfle.
const GESTE = {
  attaque: [{ transform: 'none' }, { transform: 'rotate(-25deg)' }, { transform: 'rotate(12deg)' }, { transform: 'none' }],
  protege: [{ transform: 'none' }, { transform: 'translateY(-.3rem) scale(1.15)' }, { transform: 'none' }],
  soin: [{ transform: 'none' }, { transform: 'scale(1.3)' }, { transform: 'none' }],
};
GESTE.renforce = GESTE.soin;
const SAUTE = [{ transform: 'none' }, { transform: 'translateY(-.5rem) scale(1.2)' }, { transform: 'none' }]; // victoire : mes cœurs sauvés
// Combat expert : le monstre tombe du ciel, l'arène tremble à son arrivée.
const TOMBE = [{ transform: 'translateY(-70vh)', opacity: 0 }, { transform: 'translateY(.4rem)', opacity: 1, offset: 0.85 }, { transform: 'none' }];
const SECOUSSE = [{ transform: 'none' }, { transform: 'translateX(-.4rem)' }, { transform: 'translateX(.4rem)' }, { transform: 'translateX(-.2rem)' }, { transform: 'none' }];
// Victoire expert : le monstre tremble de plus en plus fort, puis éclate.
const AGONIE = [{ transform: 'none' }, { transform: 'translateX(-.15rem)' }, { transform: 'translateX(.15rem)' }, { transform: 'translateX(-.3rem) scale(1.03)' },
  { transform: 'translateX(.3rem) scale(1.03)' }, { transform: 'translateX(-.45rem) scale(1.06)' }, { transform: 'translateX(.45rem) scale(1.08)' }, { transform: 'scale(1.1)' }];
const ECLATE = [{ transform: 'scale(1.1)', opacity: 1 }, { transform: 'scale(1.7)', opacity: 0 }];
const APPROCHE = [{ transform: 'scale(.95)' }, { transform: 'none' }]; // début : l'arène s'avance un peu, comme une caméra
export const SUPER = 3; // bonnes réponses d'affilée pour une super-attaque (traînée d'étoiles, mêmes règles)


// Plus de questions « Écoute » (Expert) : une question à image sur deux devient l'écoute du même mot, s'il a un son.
export function planExpert(plan, dispo) {
  return plan.map((q) => (q.variante.includes('image') && dispo.ecoute.includes(q.cible) && Math.random() < 0.5 ? { ...q, variante: 'ecoute' } : q));
}

function lancer(zone, contenu, difficile, expert = false) {
  // `sansAvatar` : l'avatar est dans l'arène, pas à côté de « Bravo ! » (un seul avatar à l'écran, cahier 7.8).
  // Nom du monstre : la ligne « boss: » du chapitre, sinon « le monstre » (avec une majuscule en début de phrase).
  const nom = contenu.boss || 'le monstre';
  const Nom = nom[0].toUpperCase() + nom.slice(1);
  const n = expert ? 4 : contenu.n; // Expert : 4 réponses, même en P3
  const ctx = { ...contenu, n, dispo: disponibles(contenu.mots, contenu.phrases, n, contenu.annee === 'grammaire'), sansAvatar: true, sansDefilement: true, sansSon: true, enchainer: ENCHAINER };
  const max = { boss: expert ? EXPERT.boss : VIES.boss, noe: difficile ? VIE_DIFFICILE : VIES.noe };
  const limite = expert ? EXPERT.limite : LIMITE;
  // Minuteur (Expert) : une barre qui se vide en 10 s en rougissant ; elle part à l'affichage de la question,
  // ou à la fin du mot à écouter ; arrêtée dès la réponse. Pas coupée par « moins d'animations » : elle fait partie du jeu.
  const barre = el('span', {});
  const minuteur = expert ? el('div', { class: 'minuteur', role: 'img', 'aria-label': 'Minuteur : 10 secondes pour répondre' }, barre) : '';
  let course = null;
  ctx.repondu = () => course?.pause();
  let vies = { ...max };
  let plan = [];
  zone.classList.toggle('boss-difficile', difficile); // monstre plus inquiétant (CSS)
  zone.classList.toggle('boss-expert', expert); // violet et or (CSS)
  let rage = false; // deuxième phase du combat expert
  zone.classList.add('combat-boss'); // écran compact sur téléphone (CSS)
  zone.classList.remove('suite');
  let but = null;
  let bouclier = 0;
  let aSoigne = false;
  let questions = 0;
  let retourNeutre = 0;
  let serie = 0; // bonnes réponses d'affilée
  let preparation = null;
  let geste = null; // pictogramme de l'annonce
  // Musique (demande du 2026-10-28) : celle des chapitres ou celle du boss de fin d'année, normale ou difficile ;
  // à mi-combat, sa version stressante. Elle part au premier toucher (exigence des navigateurs).
  // Expert : sa propre musique si elle existe (repères dans musique.js), sinon celle du combat difficile.
  const base = contenu.revision ? 'fin-annee' : 'combat';
  const musique = expert && existe(`${base}-expert`) ? `${base}-expert` : `${base}${difficile ? '-difficile' : ''}`;
  let stressante = false;
  jouer(musique);

  // Bouclier du monstre (P5-P6) et cœur « + » de son soin : invisibles hors de leur animation.
  const bouclierBoss = el('span', { class: 'parade parade-boss', 'aria-hidden': 'true' }, icone('bouclier'));
  const soinBoss = el('span', { class: 'soin-boss', 'aria-hidden': 'true' }, icone('coeur-plus'));
  // Étoile du coup qui touche et cœur perdu qui s'envole : invisibles eux aussi.
  const pafBoss = el('span', { class: 'paf-boss', 'aria-hidden': 'true' }, icone('etoile'));
  const perteBoss = el('span', { class: 'soin-boss perte-boss', 'aria-hidden': 'true' }, icone('coeur'));
  // Le monstre : son dessin `boss.svg` (ou `.png`) dans le dossier du chapitre ; en attendant, la forme provisoire.
  // Version difficile : `boss-difficile.svg` (ou `.png`) ; sans lui, le dessin de base assombri (CSS `.de-base`).
  const monstre = el('div', { class: 'monstre' }, icone(difficile ? 'monstre-fort' : 'monstre'), bouclierBoss, soinBoss, pafBoss, perteBoss);
  const fichiers = (n) => [`${contenu.dossier}${n}.svg`, `${contenu.dossier}${n}.png`];
  // Expert : `boss-expert`, sinon le dessin difficile entouré d'un halo violet (CSS `.halo-expert`).
  const versions = expert ? ['boss-expert', 'boss-difficile'] : difficile ? ['boss-difficile'] : [];
  fichiersPresents([...versions.flatMap(fichiers), ...fichiers('boss')]).then((p) => {
    const dessin = [...p][0];
    if (dessin) {
      const propre = /boss-(difficile|expert)\./.test(dessin);
      monstre.firstChild.replaceWith(el('img', {
        class: `dessin-boss${difficile && !propre ? ' de-base' : ''}${expert && !dessin.includes('expert') ? ' halo-expert' : ''}`, src: dessin, alt: '' }));
    }
  });
  const prof = avatar('neutre'); // sans dessin d'avatar : rien, le cadre « Monsieur Noé » suffit
  const bouclierProf = el('span', { class: 'parade', 'aria-hidden': 'true' }, icone('bouclier')); // invisible hors parade
  const coeursBoss = coeurs('boss', Nom, max.boss);
  const coeursNoe = coeurs('noe', 'Monsieur Noé', max.noe);
  const cadreBoss = el('div', { class: 'cadre-vies' }, el('span', { class: 'nom-vies' }, Nom), coeursBoss);
  const cadreNoe = el('div', { class: 'cadre-vies' }, el('span', { class: 'nom-vies' }, 'Monsieur Noé'), coeursNoe);
  const placeProf = el('div', { class: 'place-prof' }, prof, bouclierProf);
  // Bouton pour couper ou rallumer la musique (56 px), dans l'encadré de l'intention (demande de l'enseignant).
  const boutonMusique = el('button', { type: 'button', class: 'bouton-musique', 'aria-label': 'Musique', hidden: muet });
  const majMusique = () => {
    boutonMusique.setAttribute('aria-pressed', String(!coupee));
    boutonMusique.replaceChildren(icone(coupee ? 'musique-coupee' : 'musique'));
  };
  boutonMusique.addEventListener('click', () => { couper(!coupee); majMusique(); });
  majMusique();
  // Arène face à face : en haut, le cadre du monstre et le monstre ; en bas, l'avatar et le cadre de l'enseignant.
  const arene = el('div', { class: 'arene' }, cadreBoss, monstre, placeProf, cadreNoe);
  // Décor du chapitre (ligne « arene: ») : contenu/arene/<nom>.jpg, ou <nom>-difficile.jpg pour le combat difficile.
  if (contenu.arene) {
    arene.classList.add('avec-decor');
    const decor = (v) => `contenu/arene/${contenu.arene}${v}.jpg`;
    arene.style.backgroundImage = `url("${decor(difficile ? '-difficile' : '')}")`;
    // Expert : <nom>-expert.jpg s'il existe, sinon le décor difficile.
    if (expert) fichiersPresents([decor('-expert')]).then((p) => { if (p.size) arene.style.backgroundImage = `url("${decor('-expert')}")`; });
  }
  const annonce = el('div', { class: 'intention', 'aria-live': 'polite' });
  const questionZone = el('div', { class: 'zone-exercice' });
  // Nouveau combat : il repart du haut de l'écran, comme au premier (sur téléphone, les réponses restent visibles).
  const relancer = () => { lancer(zone, contenu, difficile, expert); zone.parentElement.scrollIntoView({ block: 'start' }); };

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
      coupEpee(parade + 100);
      if (serie % SUPER === 0) trainee(parade);
      if (vies.boss) bouger(monstre, TOUCHE, { duration: 350, delay: parade + 150 }); // au dernier cœur, il disparaît (fin du combat)
      bouger(pafBoss, PAF, { duration: 350, delay: parade + 150 });
      bouger(perteBoss, MONTE, { duration: 800, delay: parade + 200 });
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

  // Trait courbe et léger, comme un coup d'épée, qui passe un instant de l'avatar au monstre.
  function coupEpee(delai) {
    if (calme()) return;
    const centre = (n) => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
    const { left: ax, top: ay } = arene.getBoundingClientRect();
    const [px, py] = centre(placeProf);
    const [mx, my] = centre(monstre);
    const c = el('span', { class: 'coup-epee', 'aria-hidden': 'true' });
    c.style.left = `${px - ax}px`;
    c.style.top = `${py - ay}px`;
    c.style.width = `${Math.hypot(mx - px, my - py)}px`;
    const tourne = `rotate(${Math.atan2(my - py, mx - px)}rad)`;
    arene.append(c);
    c.animate([
      { transform: `${tourne} scaleX(.2)`, opacity: 0 }, { transform: `${tourne} scaleX(1)`, opacity: .9, offset: 0.4 },
      { transform: `${tourne} scaleX(1)`, opacity: 0 }],
    { duration: 350, delay: delai, easing: 'ease-out', fill: 'backwards' }).onfinish = () => c.remove();
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
    bouger(arene, TREMBLE, { duration: 250, delay: delai + 450 }); // quand les étoiles arrivent
  }

  // Victoire : le monstre tourne en rétrécissant et part en fumée (volutes grises qui montent en s'étalant,
  // chacune sur son chemin, demande du 2026-11-02 : pas un nuage dessiné). Moins d'animations : il penche (CSS .vaincu).
  function vaincre(delai) {
    if (calme()) return setTimeout(() => monstre.classList.add('vaincu'), delai);
    bouger(monstre, DISPARAIT, { duration: 600, delay: delai + 300, easing: 'ease-in', fill: 'forwards' });
    fumee(delai + 550);
  }

  // Victoire expert, plus dramatique (demande du 2026-11-09) : le monstre tremble de plus en plus fort, des rayons
  // violets et dorés sortent de lui, puis il éclate dans une lumière, l'arène tremble, fumée et étoiles dorées partout.
  // Rend le temps ajouté avant la suite de la fête. Moins d'animations : il penche, comme les autres combats.
  function vaincreExpert(delai) {
    if (calme()) { setTimeout(() => monstre.classList.add('vaincu'), delai); return 0; }
    const r = monstre.getBoundingClientRect();
    const a = arene.getBoundingClientRect();
    const placer = (n) => { n.style.left = `${r.left - a.left + r.width / 2}px`; n.style.top = `${r.top - a.top + r.height / 2}px`; arene.append(n); return n; };
    const centre = (t) => `translate(-50%, -50%) ${t}`;
    bouger(monstre, AGONIE, { duration: 900, delay: delai + 300, fill: 'forwards' });
    const rayons = placer(el('span', { class: 'rayons-boss', 'aria-hidden': 'true' }));
    rayons.animate([{ opacity: 0, transform: centre('scale(.3)') }, { opacity: 1, transform: centre('scale(1.4) rotate(60deg)'), offset: 0.8 },
      { opacity: 0, transform: centre('scale(2.2) rotate(90deg)') }], { duration: 1300, delay: delai + 300, fill: 'backwards' }).onfinish = () => rayons.remove();
    const t = delai + 1200; // l'éclat
    const eclat = placer(el('span', { class: 'eclat-boss', 'aria-hidden': 'true' }));
    eclat.animate([{ opacity: 0, transform: centre('scale(.2)') }, { opacity: 0.9, transform: centre('scale(2)'), offset: 0.3 },
      { opacity: 0, transform: centre('scale(4)') }], { duration: 700, delay: t, fill: 'backwards' }).onfinish = () => eclat.remove();
    bouger(monstre, ECLATE, { duration: 350, delay: t, easing: 'ease-in', fill: 'forwards' });
    bouger(arene, SECOUSSE, { duration: 450, delay: t });
    fumee(t + 100);
    for (let k = 0; k < 12; k++) {
      const s = placer(el('span', { class: 'etoile-super', 'aria-hidden': 'true' }, icone('etoile')));
      const angle = (k / 12) * 2 * Math.PI;
      const d = 4 + Math.random() * 2; // en rem
      s.animate([{ transform: centre('scale(.4)'), opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * d}rem), calc(-50% + ${Math.sin(angle) * d}rem)) scale(1)`, opacity: 0 }],
      { duration: 800, delay: t, easing: 'ease-out', fill: 'backwards' }).onfinish = () => s.remove();
    }
    return 1300;
  }

  // Volutes de fumée qui montent du monstre (victoire ; colère du combat expert).
  function fumee(delai) {
    const r = monstre.getBoundingClientRect();
    const a = arene.getBoundingClientRect();
    for (let k = 0; k < 10; k++) {
      const f = el('span', { class: 'fumee', 'aria-hidden': 'true' });
      f.style.left = `${r.left - a.left + r.width / 2 + (Math.random() - 0.5) * r.width * 0.5}px`;
      f.style.top = `${r.top - a.top + r.height * 0.6}px`;
      arene.append(f);
      const dx = (Math.random() - 0.5) * 3; // en rem : chaque volute dérive de son côté
      f.animate([
        { transform: 'translate(-50%, -50%) scale(.3)', opacity: 0 },
        { transform: `translate(calc(-50% + ${dx / 3}rem), calc(-50% - .75rem)) scale(.9)`, opacity: .85, offset: 0.3 },
        { transform: `translate(calc(-50% + ${dx}rem), calc(-50% - ${2.5 + Math.random() * 1.5}rem)) scale(${1.6 + Math.random() * 0.8})`, opacity: 0 }],
      { duration: 1100 + Math.random() * 400, delay: delai + k * 60, easing: 'ease-out', fill: 'backwards' }).onfinish = () => f.remove();
    }
  }

  // Début du combat : le monstre arrive par la droite, l'avatar par la gauche, puis les cadres et leurs cœurs.
  function entree() {
    bouger(arene, APPROCHE, { duration: 900 });
    if (expert && !calme()) {
      // Boss final : l'arène s'assombrit, « Le boss ultime arrive ! », le monstre tombe du ciel et l'arène tremble.
      const ombre = el('span', { class: 'ombre-boss', 'aria-hidden': 'true' });
      const alerte = el('span', { class: 'alerte-boss', 'aria-hidden': 'true' }, 'Le boss ultime arrive !');
      arene.append(ombre, alerte);
      ombre.animate([{ opacity: 0 }, { opacity: 0.6, offset: 0.3 }, { opacity: 0.6, offset: 0.6 }, { opacity: 0 }], { duration: 1600 }).onfinish = () => ombre.remove();
      alerte.animate([{ opacity: 0, transform: 'translate(-50%, -50%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: 0.2 },
        { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 1600 }).onfinish = () => alerte.remove();
      bouger(monstre, TOMBE, { duration: 500, delay: 700, easing: 'ease-in', fill: 'backwards' });
      bouger(arene, SECOUSSE, { duration: 350, delay: 1200 });
    } else bouger(monstre, DE_DROITE, { duration: 600 });
    bouger(prof, DE_GAUCHE, { duration: 600 });
    [cadreBoss, cadreNoe].forEach((c) => bouger(c, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: 400, fill: 'backwards' }));
    [...coeursBoss.children, ...coeursNoe.children].forEach((c, k) => bouger(c, NAIT, { duration: 250, delay: 500 + k * 90, fill: 'backwards' }));
  }

  function annoncer() {
    const [ic, titre, explication] = (rage ? INTENTIONS_RAGE : difficile ? INTENTIONS_DIFFICILE : INTENTIONS)[but];
    // Sur téléphone, l'explication n'est montrée qu'à la première question (classe `suite`, CSS), sauf le bouclier.
    annonce.replaceChildren(icone(ic), el('p', {}, el('strong', {}, titre), el('span', { class: but === 'protege' ? '' : 'explication' }, el('br'),
      but === 'protege' && bouclier ? 'Encore une bonne réponse pour le toucher !' : explication)), boutonMusique);
  }


  // Fin du combat : l'avatar de l'arène prend la pose, l'écran de fin n'en ajoute pas un second.
  function fin(pose, ic, titreTexte, phrase, bouton) {
    annonce.replaceChildren();
    if (minuteur) minuteur.hidden = true;
    arreterMusique();
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
    geste?.cancel();
    let parade = 0;
    if (juste !== undefined) {
      serie = juste ? serie + 1 : 0;
      bouclier = but === 'protege' && juste ? bouclier + 1 : 0;
      const avant = vies;
      vies = coup(vies, juste, but, bouclier, max.boss);
      aSoigne ||= vies.boss > avant.boss;
      if (bouclier === 2) bouclier = 0; // bouclier cassé
      afficherVies();
      // L'arène revient à l'écran seulement si elle en est sortie par le haut (téléphone) : sinon la page ne bouge pas.
      if (arene.getBoundingClientRect().top < 0) arene.scrollIntoView({ block: 'start' });
      parade = animer(avant, juste);
      // Combat expert, à la moitié de sa vie (demande du 2026-11-11) : le monstre se met en colère (fumée, il grandit et brille en violet).
      if (expert && !rage && vies.boss && vies.boss <= max.boss / 2) {
        rage = true;
        if (calme()) monstre.classList.add('enrage');
        else { fumee(parade + 600); setTimeout(() => monstre.classList.add('enrage'), parade + 900); }
      }
      // Plus qu'un cœur pour moi (combat normal) ou monstre à mi-vie (difficile) : la musique devient stressante.
      if (!stressante && vies.boss && vies.noe && (expert ? vies.boss <= max.boss / 2 : difficile ? vies.boss <= 2 : vies.noe === 1)) {
        stressante = true;
        if (!difficile) arene.classList.add('tension'); // cadre rouge, fixe (CSS) ; pas dans le combat difficile
        jouer(`${musique}-un-coeur`, true);
      }
    }
    if (!vies.boss) {
      const plus = expert ? vaincreExpert(parade) : (vaincre(parade), 0); // expert : la fête attend l'éclat du monstre
      fin('bravo', 'sourire', expert ? 'Tu es un vrai champion !' : difficile ? 'Incroyable, bravo !' : 'C\'est fini, bravo !',
        `On a ${difficile ? 'vaincu' : 'battu'} ${nom} ensemble !`, 'Recommencer');
      bouger(prof, DANSE, { duration: 900, delay: parade + plus + 450 });
      if (expert) {
        // Victoire expert : une couronne descend sur moi (dessin de l'enseignant, contenu/avatar/couronne.png).
        const couronne = el('img', { class: 'couronne', src: 'contenu/avatar/couronne.png', alt: '' });
        placeProf.append(couronne);
        // À la taille de ma tête, quelle que soit celle de l'avatar (téléphone, ordinateur) : dans les dessins de l'avatar,
        // la tête fait environ 45 % de la largeur, centrée à 48 %, et le haut des cheveux est vers 10 % de la hauteur.
        const { offsetLeft: x, offsetTop: y, offsetWidth: l, offsetHeight: h } = prof;
        if (l) Object.assign(couronne.style, { width: `${l * 0.45}px`, left: `${x + l * 0.48}px`, top: `${y + h * 0.1 - l * 0.45 * 0.7}px` });
        bouger(couronne, [{ transform: 'translate(-50%, -3rem)', opacity: 0 }, { transform: 'translate(-50%, .2rem)', opacity: 1, offset: 0.8 },
          { transform: 'translate(-50%, 0)', opacity: 1 }], { duration: 700, delay: parade + plus + 1500, fill: 'backwards' });
      }
      [...coeursNoe.querySelectorAll('.plein')].forEach((c, k) => bouger(c, SAUTE, { duration: 400, delay: parade + plus + 1400 + k * 150 }));
      if (!plus) return fete(zone);
      return setTimeout(() => { if (questionZone.isConnected) fete(zone); }, parade + plus); // pas dans un combat relancé entre-temps
    }
    if (!vies.noe || questions === limite) {
      fin('encourage', 'bulle', vies.noe ? `${Nom} s'est enfui !` : `${Nom} ${difficile ? 'était trop fort' : 'a gagné'} cette fois.`, 'On réessaie ?', 'Réessayer');
      // Fuite (P5-P6) : le monstre part par la droite, après les animations de la réponse ; moins d'animations : il disparaît.
      if (vies.noe && !bouger(monstre, FUITE, { duration: 700, delay: 1100, easing: 'ease-in', fill: 'forwards' })) monstre.style.visibility = 'hidden';
      // Défaite : le monstre sautille deux fois, content, sans se moquer (version douce demandée le 2026-11-02).
      if (!vies.noe) bouger(monstre, DANSE, { duration: 900, delay: 1100 });
      return bouger(prof, RELEVE, { duration: 600, delay: 1300 }); // je me relève, prêt pour la revanche
    }
    // Le bouclier reste annoncé tant qu'il n'est pas cassé (deux bonnes réponses d'affilée).
    if (!bouclier) but = intention(contenu.annee, vies, aSoigne, max.boss);
    if (juste !== undefined) zone.classList.add('suite');
    annoncer();
    // Une fois les animations de la réponse finies (ou l'entrée du combat), le monstre montre ce qu'il prépare.
    const d = juste === undefined ? 1300 : 1800;
    preparation = bouger(monstre, PREPARE[but], { duration: 600, delay: d });
    geste = bouger(annonce.firstChild, GESTE[but], { duration: 600, delay: d });
    questions += 1;
    if (!plan.length) plan = expert ? planExpert(planOie(ctx.dispo, 20), ctx.dispo) : planOie(ctx.dispo, 20);
    const q = question(plan.shift(), ctx, true, 1, 0, tour); // un seul essai ; total 0 : ni compteur ni « Terminer »
    questionZone.replaceChildren(q);
    if (expert) {
      course?.cancel(); // la barre redevient pleine
      const partir = () => {
        if (!q.isConnected) return; // question déjà remplacée (nouveau combat)
        course = barre.animate([
          { width: '100%', backgroundColor: '#16a34a' }, { backgroundColor: '#f59e0b', offset: 0.5 }, { width: '0%', backgroundColor: '#dc2626' }],
        { duration: EXPERT.minuteur, fill: 'forwards' });
        course.onfinish = () => { if (q.isConnected) q.tempsEcoule(); };
      };
      if (q.ecoute) q.ecoute.addEventListener('fin', partir, { once: true });
      else if (questions === 1) setTimeout(partir, 1600); // première question : après l'entrée du boss
      else partir();
    }
    if (juste !== undefined) q.titre.focus({ preventScroll: true });
  }

  zone.replaceChildren(
    el('p', { class: 'consigne-oie' }, icone('epee'),
      expert ? `Le boss ultime arrive ! Aide-moi à vaincre ${nom} !`
        : difficile ? `${Nom} est furieux ! Aide-moi à le vaincre !` : `Aide-moi à battre ${nom} !`),
    arene,
    annonce,
    minuteur,
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

export const bossExpert = {
  id: 'boss-expert',
  nom: 'Le combat de boss expert',
  icone: 'epee',
  possible: (contenu) => oie.possible({ ...contenu, n: 4 }), // 4 réponses : assez de mots pour cela
  pleinEcran: true,
  lancer: (zone, contenu) => lancer(zone, contenu, true, true),
};
