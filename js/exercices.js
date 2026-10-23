// Rubriques « Je m'entraîne » et « Je vérifie » : un seul moteur d'exercices à choix, cinq variantes (cahier 7.4),
// puis les dictées en bas de « Je m'entraîne » (cahier 7.4 bis). Rien n'est enregistré.
import { el, icone } from './outils.js';
import { creerLecteur, arreter } from './audio.js';
import { chercherFichiers, visuel } from './cartes.js';
import { positionReponse } from './donnees.js';
import { avatar, chargerAvatar } from './avatar.js';
import { serieOrdre } from './ordre.js';
import { preparerCouleurs, lancerCouleurs } from './couleurs.js';

// Consigne de chaque variante : pictogramme + phrase de 8 mots au plus.
// Le nom sert aussi au fichier de consigne sonore facultatif : contenu/<langue>/consignes/<nom>.m4a
const CONSIGNES = {
  'image-mot': ['image', 'Quel mot va avec l\'image ?'],
  'mot-image': ['image', 'Touche l\'image qui va avec le mot.'],
  ecoute: ['haut-parleur', 'Écoute, puis touche la bonne réponse.'],
  trous: ['crayon', 'Choisis le mot qui manque.'],
  'de-het': ['bulle', 'De ou het ? Choisis le bon petit mot.'],
};
const MELANGE = ['image-mot', 'mot-image', 'ecoute', 'trous'];

// ---------- Logique (testée dans tests/exercices.test.js) ----------

export function melanger(liste) {
  const l = [...liste];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

// `nombre` éléments : chacun une fois avant toute répétition, et jamais deux fois le même de suite.
export function tirer(liste, nombre) {
  const sortie = [];
  while (sortie.length < nombre && liste.length) {
    const tour = melanger(liste);
    if (tour.length > 1 && tour[0] === sortie[sortie.length - 1]) tour.push(tour.shift());
    sortie.push(...tour);
  }
  return sortie.slice(0, nombre);
}

// La bonne réponse et `n - 1` mauvaises, tirées sans doublon, dans le désordre.
export function propositions(bonne, pool, n) {
  return melanger([bonne, ...melanger(pool.filter((x) => x !== bonne)).slice(0, n - 1)]);
}

// 3 étoiles dès 85 %, 2 dès 60 %, sinon 1 : jamais zéro.
export function etoiles(bonnes, total) {
  const taux = total ? bonnes / total : 0;
  return taux >= 0.85 ? 3 : taux >= 0.6 ? 2 : 1;
}

// Mot secret du jour, montré à la fin de « Je vérifie » : l'élève le recopie et le montre en classe.
// Calculé à partir de la date de l'appareil, sans rien enregistrer ni envoyer. Les mots du chapitre
// passent un par un, dans un ordre mélangé fixe (difficile à deviner) : un mot différent chaque jour,
// jusqu'à ce que la liste soit épuisée. La page de contrôle refait le même calcul.
// raccourci : un appareil mal réglé (mauvaise date) donne le mot d'un autre jour ; ajouter un mot change l'ordre.
const hacher = (texte) => [...texte].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);
export function motSecret(mots, date = new Date()) {
  if (!mots.length) return '';
  const jour = Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
  const ordre = [...mots].sort((a, b) => hacher(a.id) - hacher(b.id) || (a.id < b.id ? -1 : 1));
  return ordre[jour % ordre.length].mot;
}

export const article = (mot) => (mot.match(/^(de|het)\s/i)?.[1] || '').toLowerCase();
export const sansArticle = (mot) => mot.replace(/^(de|het)\s+/i, '');
const aUnVisuel = (m) => m.ind.type !== 'francais';

// Mauvaises réponses d'un texte à trous : la 5e colonne si elle existe, sinon les réponses des autres phrases.
export function fauxTrous(phrase, phrases) {
  const source = phrase.propositions.length ? phrase.propositions : phrases.filter((p) => p !== phrase).map((p) => p.reponse);
  const vus = new Set([phrase.reponse.toLowerCase(), '']);
  return source.filter((x) => !vus.has(x.toLowerCase()) && vus.add(x.toLowerCase()));
}

// Ce que chaque variante peut interroger. `mots` portent `ind` (indice) et `son` (audio présent).
// Une variante sans assez de contenu reçoit une liste vide : elle est ignorée, sans message à l'enfant.
export function disponibles(mots, phrases, n) {
  const images = mots.filter(aUnVisuel);
  const sonores = mots.filter((m) => m.son);
  const sonoresImages = sonores.filter(aUnVisuel);
  const noms = mots.filter((m) => article(m.mot));
  return {
    'image-mot': images.length >= n ? images : [],
    'mot-image': images.length >= n ? images : [],
    // Écoute : on choisit parmi des images si assez de mots en ont, sinon parmi des mots écrits.
    ecoute: sonoresImages.length >= n ? sonoresImages : sonores.length >= n ? sonores : [],
    trous: phrases.filter((p) => p.reponse).map((p) => ({ ...p, faux: fauxTrous(p, phrases) })).filter((p) => p.faux.length >= n - 1),
    'de-het': noms.length >= 4 ? noms : [],
  };
}

// Mots ou phrases interrogeables par les variantes 1 à 4, avec les variantes possibles pour chacun.
function unites(dispo) {
  const u = new Map();
  for (const v of MELANGE) for (const x of dispo[v]) u.set(x, [...(u.get(x) || []), v]);
  return u;
}

// Questions mélangées : chaque mot ou phrase une fois avant toute répétition ; pour chacun,
// la variante la moins utilisée jusque-là, pour bien mélanger les cinq types.
export function planMelange(dispo, nombre) {
  const u = unites(dispo);
  const usage = {};
  return tirer([...u.keys()], nombre).map((cible) => {
    const variante = melanger(u.get(cible)).reduce((a, b) => ((usage[b] || 0) < (usage[a] || 0) ? b : a));
    usage[variante] = (usage[variante] || 0) + 1;
    return { variante, cible };
  });
}

export function planDeHet(dispo, nombre) {
  return tirer(dispo['de-het'], nombre).map((cible) => ({ variante: 'de-het', cible }));
}

// Je m'entraîne : 10 questions, ou autant que de mots disponibles.
export function planEntraine(dispo, deHet) {
  return deHet ? planDeHet(dispo, Math.min(10, dispo['de-het'].length)) : planMelange(dispo, Math.min(10, unites(dispo).size));
}

// Je vérifie : 8 questions (ou autant que de mots, 4 au minimum), dont 2 « de ou het » si possible.
export function planVerifie(dispo) {
  const u = unites(dispo);
  const tous = new Set([...u.keys(), ...dispo['de-het']]).size;
  if (!tous) return [];
  const total = Math.max(4, Math.min(8, tous));
  // Au moins 2 « de ou het » ; plus si les autres questions manquent (sinon la même reviendrait de suite).
  const nbDeHet = dispo['de-het'].length ? Math.min(total, Math.max(2, total - u.size)) : 0;
  const plan = planMelange(dispo, total - nbDeHet);
  for (const q of planDeHet(dispo, nbDeHet)) plan.splice(Math.floor(Math.random() * (plan.length + 1)), 0, q);
  return plan;
}

// ---------- Affichage ----------

// Une question. `fin(premierCoup, juste)` est appelé quand elle est terminée (réussie du premier coup, réussie tout court).
// Sans `total` (jeu de l'oie), ni compteur ni « Terminer ».
export function question(q, ctx, verifie, rang, total, fin) {
  const { langue, n, dispo } = ctx;
  const son = (x) => (x.son ? creerLecteur(`${ctx.dossier}audio/${x.id}.m4a`, { nom: x.mot || x.phrase }) : null);
  const mot = (x) => el('span', { class: 'mot', lang: langue }, x.mot);
  const c = q.cible;
  let enonce;
  let choix; // [{ noeud, juste }]
  let lecteur = null; // le son joué après la réponse
  let lecteurDansEnonce = false;
  let apres = () => {}; // ce qui change dans l'énoncé une fois la réponse donnée

  if (q.variante === 'image-mot') {
    enonce = visuel(c, c.ind, langue);
    choix = propositions(c, dispo['image-mot'], n).map((x) => ({ noeud: mot(x), juste: x === c }));
    lecteur = son(c);
  } else if (q.variante === 'mot-image') {
    lecteur = son(c);
    lecteurDansEnonce = true;
    enonce = el('div', { class: 'pile' }, mot(c), lecteur || '');
    choix = propositions(c, dispo['mot-image'], n).map((x) => ({ noeud: visuel(x, x.ind, langue), juste: x === c }));
  } else if (q.variante === 'ecoute') {
    // Le nom lu par les lecteurs d'écran ne doit pas donner la réponse.
    lecteur = creerLecteur(`${ctx.dossier}audio/${c.id}.m4a`, { nom: 'le mot à écouter' });
    lecteurDansEnonce = true;
    enonce = lecteur;
    const images = dispo.ecoute.every(aUnVisuel);
    choix = propositions(c, dispo.ecoute, n).map((x) => ({ noeud: images ? visuel(x, x.ind, langue) : mot(x), juste: x === c }));
  } else if (q.variante === 'trous') {
    const i = positionReponse(c.phrase, c.reponse);
    const trou = el('span', { class: 'trou' }, '…');
    trou.setAttribute('aria-label', 'mot qui manque');
    apres = () => { trou.textContent = c.phrase.slice(i, i + c.reponse.length); trou.removeAttribute('aria-label'); trou.classList.add('rempli'); };
    lecteur = son(c);
    lecteurDansEnonce = true;
    enonce = el('div', { class: 'pile' },
      el('p', { class: 'phrase', lang: langue }, c.phrase.slice(0, i), trou, c.phrase.slice(i + c.reponse.length)),
      lecteur || '');
    choix = propositions(c.reponse, c.faux, n).map((x) => ({ noeud: el('span', { class: 'mot', lang: langue }, x), juste: x === c.reponse }));
  } else {
    // De ou het : le nom sans article ; le son (qui dit l'article) seulement après la réponse.
    const art = el('span', { class: 'trou' }, '…');
    apres = () => { art.textContent = article(c.mot); art.classList.add('rempli'); };
    enonce = el('div', { class: 'pile' },
      aUnVisuel(c) ? visuel(c, c.ind, langue) : '',
      el('span', { class: 'mot', lang: langue }, art, ' ', sansArticle(c.mot)));
    choix = ['de', 'het'].map((a) => ({ noeud: el('span', { class: 'mot', lang: langue }, a), juste: a === article(c.mot) }));
    lecteur = son(c);
  }

  const [ic, texte] = CONSIGNES[q.variante];
  const consigneSon = `contenu/${langue}/consignes/${q.variante}.m4a`;
  const titre = el('h2', { class: 'consigne', tabindex: '-1' }, icone(ic), texte);
  const retour = el('p', { class: 'retour-ex', 'aria-live': 'polite' });
  // Un seul avatar, montré seulement après une réponse, à côté du message (décision du 2026-10-19).
  const av = avatar('neutre');
  const message = el('div', { class: 'message-ex' }, retour);
  const suite = el('button', { type: 'button', class: 'action', hidden: '' }, rang === total ? 'Terminer' : 'Suivant', icone('droite'));
  const boutons = choix.map(({ noeud, juste }) => {
    const b = el('button', { type: 'button', class: 'reponse' }, noeud);
    b.juste = juste;
    return b;
  });
  const marquer = (b, juste) => { b.classList.add(juste ? 'juste' : 'faux'); b.prepend(el('span', { class: 'marque-ex' }, icone(juste ? 'coche' : 'croix'))); };
  const dire = (ic2, txt, pose) => { retour.replaceChildren(icone(ic2), txt); av.pose(pose); message.prepend(av); };

  let essais = 0;
  function terminer(juste, texte, ic2, pose) {
    for (const b of boutons) b.disabled = true;
    if (!juste) marquer(boutons.find((b) => b.juste), true);
    dire(ic2, texte, pose);
    apres();
    if (lecteur) {
      if (!lecteurDansEnonce) retour.after(lecteur);
      lecteur.jouer(); // après un toucher : permis aussi sur iPhone
    }
    suite.hidden = false;
    suite.focus();
    suite.addEventListener('click', () => fin(juste && essais === 0, juste));
  }
  for (const b of boutons) {
    b.addEventListener('click', () => {
      marquer(b, b.juste);
      if (b.juste) return terminer(true, 'Bravo !', 'sourire', 'content');
      // Un bouton bloqué perd le focus : au clavier, on passe à la réponse suivante au lieu de repartir en haut.
      boutons.find((x) => !x.disabled && x !== b)?.focus();
      b.disabled = true;
      if (verifie) return terminer(false, 'Pas grave, continue !', 'bulle', 'encourage');
      essais += 1;
      if (essais < 2) return dire('tourner', 'Essaie encore !', 'reflechit');
      terminer(false, 'Voici la bonne réponse.', 'bulle', 'explique');
    });
  }

  const zone = el('div', { class: 'exercice' },
    el('div', { class: 'tete-ex' }, titre, total ? el('p', { class: 'compteur' }, `${rang} / ${total}`) : ''),
    ctx.presents.has(consigneSon) ? creerLecteur(consigneSon, { nom: 'la consigne', avecBarre: false }) : '',
    el('div', { class: 'enonce' }, enonce),
    // Images en grille ; mots les uns sous les autres (« de » et « het » côte à côte).
    el('div', { class: `reponses n${boutons.length}${choix[0].noeud.matches('.mot') ? '' : ' visuels'}` }, ...boutons),
    message, suite);
  zone.titre = titre;
  return zone;
}

// Enchaîne les questions d'un plan, puis appelle `bilan(rates)` (liste des cibles ratées).
function serie(zone, plan, ctx, verifie, bilan) {
  const rates = [];
  let i = 0;
  function suivante(juste) {
    arreter();
    if (i > 0 && !juste) rates.push(plan[i - 1].cible);
    if (i === plan.length) return bilan(rates);
    i += 1;
    const q = question(plan[i - 1], ctx, verifie, i, plan.length, suivante);
    zone.replaceChildren(q);
    if (i > 1) q.titre.focus(); // au clavier et au lecteur d'écran, on repart de la consigne
  }
  suivante(true);
}

function boutonRecommencer(relancer) {
  const b = el('button', { type: 'button', class: 'action' }, icone('tourner'), 'Recommencer');
  b.addEventListener('click', relancer);
  return b;
}

// Je vérifie : étoiles, nombre de bonnes réponses, mots ratés avec image et son.
function bilanVerifie(zone, total, rates, ctx, relancer) {
  const nb = etoiles(total - rates.length, total);
  const titre = el('h2', { tabindex: '-1' }, ['', 'Continue, tu progresses !', 'Bien joué !', 'Bravo !'][nb]);
  // Une seule pose sur le bilan, selon les étoiles (décision du 2026-10-19).
  const av = avatar(['', 'encourage', 'content', 'bravo'][nb]);
  const ratees = [...new Set(rates)].map((x) => el('li', {},
    x.ind && aUnVisuel(x) ? visuel(x, x.ind, ctx.langue) : '',
    el('span', { class: 'mot', lang: ctx.langue }, x.mot || x.phrase),
    x.son ? creerLecteur(`${ctx.dossier}audio/${x.id}.m4a`, { nom: x.mot || x.phrase }) : ''));
  zone.replaceChildren(el('div', { class: 'bilan' },
    el('div', { class: 'tete-bilan' }, av, titre),
    el('p', { class: 'etoiles', role: 'img', 'aria-label': `${nb} étoile${nb > 1 ? 's' : ''} sur 3` },
      ...[1, 2, 3].map((k) => el('span', { class: k <= nb ? 'pleine' : '' }, icone('etoile')))),
    el('p', {}, `${total - rates.length} bonne${total - rates.length > 1 ? 's' : ''} réponse${total - rates.length > 1 ? 's' : ''} sur ${total}`),
    el('div', { class: 'mot-secret' },
      el('p', { class: 'consigne-dictee' }, icone('cle'), 'Ton mot secret du jour :'),
      el('p', { class: 'mot', lang: ctx.langue }, motSecret(ctx.mots)),
      el('p', {}, 'Écris-le dans ton journal de classe et viens me le montrer au prochain cours : il montre que tu as révisé !')),
    rates.length ? el('h3', {}, 'À revoir') : '',
    rates.length ? el('ul', { class: 'a-revoir' }, ...ratees) : '',
    boutonRecommencer(relancer)));
  titre.focus();
}

// Fin de « Je m'entraîne », et aussi des jeux (`pose` de l'avatar, `autres` : des lignes de plus sous le titre).
export function bilanEntraine(zone, relancer, pose = 'bravo', ...autres) {
  const titre = el('h2', { tabindex: '-1' }, icone('sourire'), 'C\'est fini, bravo !');
  zone.replaceChildren(el('div', { class: 'bilan' }, el('div', { class: 'tete-bilan' }, avatar(pose), titre), ...autres, boutonRecommencer(relancer)));
  titre.focus();
}

// Dictée : on écoute, on écrit sur sa feuille, puis on se corrige. « / » = retour à la ligne.
function dictee(d, ctx) {
  const lignes = (texte) => texte.split('/').flatMap((l, k) => (k ? [el('br'), l.trim()] : [l.trim()]));
  return el('div', { class: 'piste' },
    el('h3', {}, d.titre),
    el('p', { class: 'consigne-dictee' }, icone('crayon'), 'Écoute et écris sur ta feuille. Tu peux arrêter et réécouter.'),
    creerLecteur(`${ctx.dossier}audio/${d.id}.m4a`, { nom: d.titre, large: true }),
    el('details', { class: 'traduction' },
      el('summary', {}, icone('oeil'), 'Voir la correction'),
      el('p', { lang: ctx.langue }, ...lignes(d.texte)),
      d.francais ? el('p', { class: 'fr' }, ...lignes(d.francais)) : ''));
}

// Entrées de « Je m'entraîne », gardées dans l'adresse (?exercice=de-het, ordre, couleurs ou dictees).
const ENTREES = { '': ['Exercices', 'crayon'], 'de-het': ['De ou het ?', 'bulle'], ordre: ['Mots en ordre', 'ordre'], couleurs: ['Couleurs', 'image'], dictees: ['Dictées', 'haut-parleur'] };
function choixExercice(choix, actif) {
  const lien = (valeur) => {
    const params = new URLSearchParams(location.search);
    if (valeur) params.set('exercice', valeur); else params.delete('exercice');
    const [nom, ic] = ENTREES[valeur];
    return el('a', { class: 'seg', href: `?${params}`, 'aria-current': valeur === actif && 'page' }, icone(ic), nom);
  };
  return el('nav', { class: `segments sens n${choix.length}`, 'aria-label': 'Choix de l\'exercice' }, ...choix.map(lien));
}

// « Mots en ordre » : les manches de [ordre], dans l'ordre du fichier ; à la fin, le son de tout le texte.
function lancerOrdre(zone, donnees, ctx) {
  const { dossier, langue, presents } = ctx;
  const audio = (id) => (id && presents.has(`${dossier}audio/${id}.m4a`) ? `${dossier}audio/${id}.m4a` : '');
  const items = donnees.ordre.map((o) => ({ cases: o.cases, audio: audio(o.id), francais: '' }));
  const sons = [...new Set(donnees.ordre.map((o) => audio(o.son)).filter(Boolean))];
  serieOrdre(zone, items, langue, () => lancerOrdre(zone, donnees, ctx),
    el('p', {}, 'Tu as remis tous les mots en ordre !'),
    ...sons.map((chemin) => el('div', { class: 'pile' },
      el('p', {}, icone('haut-parleur'), ' Écoute tout le texte :'),
      creerLecteur(chemin, { nom: 'tout le texte', large: true }))));
}

export async function afficherExercices(conteneur, donnees, dossier, langue, annee, verifie, exercice) {
  const consignes = Object.keys(CONSIGNES).map((v) => `contenu/${langue}/consignes/${v}.m4a`);
  // Sons facultatifs de [ordre] : un par manche, et celui à écouter à la fin.
  const sonsOrdre = donnees.ordre.flatMap((o) => [o.id, o.son]).filter(Boolean).map((id) => `${dossier}audio/${id}.m4a`);
  const [{ presents, indices }] = await Promise.all([chercherFichiers(donnees, dossier, [...consignes, ...sonsOrdre]), chargerAvatar()]);
  const aSon = (x) => presents.has(`${dossier}audio/${x.id}.m4a`);
  const n = annee === 'p3' ? 3 : 4; // 3 choix en P3, 4 en P4
  const mots = donnees.mots.map((m, k) => ({ ...m, ind: indices[k], son: aSon(m) }));
  const phrases = donnees.phrases.map((p) => ({ ...p, son: aSon(p) }));
  const dispo = disponibles(mots, phrases, n);
  const ctx = { langue, dossier, n, dispo, presents, mots };

  const parties = [];
  const avecMelange = unites(dispo).size > 0;
  const avecDeHet = dispo['de-het'].length > 0;
  const avecOrdre = !verifie && donnees.ordre.length > 0; // « Mots en ordre » : seulement dans « Je m'entraîne »
  const couleurs = verifie ? null : await preparerCouleurs(donnees, mots, langue, annee); // exercice « Couleurs » (ligne couleurs:)
  const dictees = verifie ? [] : donnees.dictees.filter(aSon); // dictées : leur propre entrée (demande du 2026-10-20)
  // Les entrées possibles ; sans précision dans l'adresse, la première (les exercices mélangés s'il y en a).
  // Seules les entrées possibles restent (une condition fausse donne false ou null, jamais un nom d'entrée).
  const choix = [avecMelange && '', avecDeHet && 'de-het', avecOrdre && 'ordre', couleurs && 'couleurs', dictees.length > 0 && 'dictees'].filter((x) => typeof x === 'string');
  const actif = choix.includes(exercice) ? exercice : choix[0];
  const deHet = actif === 'de-het';
  if (!verifie && choix.length > 1) parties.push(choixExercice(choix, actif));

  const zone = el('div', { class: 'zone-exercice' });
  const plan = () => (verifie ? planVerifie(dispo) : planEntraine(dispo, deHet));
  const lancer = () => {
    if (!verifie && actif === 'ordre') return lancerOrdre(zone, donnees, ctx);
    if (!verifie && actif === 'couleurs') return lancerCouleurs(zone, { ...couleurs, langue, dossier });
    if (!verifie && actif === 'dictees') return zone.replaceChildren(...dictees.map((d) => dictee(d, ctx)));
    const p = plan();
    serie(zone, p, ctx, verifie, (rates) => (verifie
      ? bilanVerifie(zone, p.length, rates, ctx, lancer)
      : bilanEntraine(zone, lancer)));
  };
  if (choix.length) {
    parties.push(zone);
    lancer();
  } else {
    parties.push(el('p', { class: 'bientot-ici' }, icone(verifie ? 'etoile' : 'crayon'), 'Pas encore d\'exercice dans ce chapitre.'));
  }

  conteneur.replaceChildren(...parties);
}
