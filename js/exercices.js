// Rubriques « Je m'entraîne » et « Je vérifie » : un seul moteur d'exercices à choix, cinq variantes (cahier 7.4),
// puis les dictées en bas de « Je m'entraîne » (cahier 7.4 bis). Rien n'est enregistré.
import { el, icone, muet } from './outils.js?v=4a69adff';
import { creerLecteur, arreter } from './audio.js?v=4a69adff';
import { chercherFichiers, visuel, cheminDessin, dessinPhrase } from './cartes.js?v=4a69adff';
import { positionReponse, cheminSon } from './donnees.js?v=4a69adff';
import { avatar, chargerAvatar } from './avatar.js?v=4a69adff';
import { serieOrdre } from './ordre.js?v=4a69adff';
import { preparerCouleurs, lancerCouleurs } from './couleurs.js?v=4a69adff';

// Consigne de chaque variante : pictogramme + phrase de 8 mots au plus.
// Le nom sert aussi au fichier de consigne sonore facultatif : contenu/<langue>/consignes/<nom>.m4a
const CONSIGNES = {
  'image-mot': ['image', 'Quel mot va avec l\'image ?'],
  'mot-image': ['image', 'Touche l\'image qui va avec le mot.'],
  ecoute: ['haut-parleur', 'Écoute, puis touche la bonne réponse.'],
  trous: ['crayon', 'Choisis le mot qui manque.'],
  'fin-phrase': ['image', 'Regarde l\'image et choisis la bonne fin.'],
  'de-het': ['bulle', 'De ou het ? Choisis le bon petit mot.'],
  // Grammaire (v1.65) : consignes de l'enseignant ; le texte change selon le contenu (voir question()).
  tri: ['grille', 'Range chaque mot dans la bonne boîte.'],
  pronoms: ['bulle', 'Choisis le bon petit mot.'],
  'ecoute-clic': ['haut-parleur', 'Écoute la phrase, puis touche le bon mot.'],
};
const MELANGE = ['image-mot', 'mot-image', 'ecoute', 'trous'];
const estPhrase = (t) => /[.!?]$/.test(t);

// ---------- Logique (testée dans tests/exercices.test.js) ----------

// Ce qui vient de plusieurs chapitres (chapitre de révision, ligne « reprend: ») : les chapitres passent
// à tour de rôle, dans un ordre retiré à chaque tour, pour qu'aucun ne domine (demande du 2026-10-28).
export function melanger(liste) {
  const l = [...liste];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  const groupes = new Map();
  for (const x of l) {
    if (!groupes.has(x?.chapitre)) groupes.set(x?.chapitre, []);
    groupes.get(x?.chapitre).push(x);
  }
  if (groupes.size < 2) return l;
  const sortie = [];
  for (let reste = [...groupes.values()]; reste.length; reste = reste.filter((g) => g.length)) {
    for (const g of melanger(reste)) sortie.push(g.pop());
  }
  return sortie;
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
  const seuls = mots.filter((m) => !/[.!?]$/.test(m.mot)); // pas de phrase (« Het regent. ») : l'élève la recopie (demande du 2026-10-30)
  if (!seuls.length) return '';
  const jour = Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 864e5);
  const ordre = [...seuls].sort((a, b) => hacher(a.id) - hacher(b.id) || (a.id < b.id ? -1 : 1));
  return ordre[jour % ordre.length].mot;
}

// Une phrase (« Het regent. ») n'est pas un nom avec son article : le point final la distingue.
export const article = (mot) => (mot.match(/^(de|het)\s[^.!?]*$/i)?.[1] || '').toLowerCase();
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
// `deuxChoix` (grammaire, v1.65, accord de l'enseignant du 2026-11-11) : une seule proposition écrite suffit (have / has) ; texte à trous à 2 choix, v1.72.
export function disponibles(mots, phrases, n, deuxChoix = false) {
  const images = mots.filter(aUnVisuel);
  const sonores = mots.filter((m) => m.son);
  const noms = mots.filter((m) => article(m.mot));
  return {
    'image-mot': images.length >= n ? images : [],
    'mot-image': images.length >= n ? images : [],
    // Écoute : tous les mots avec un son, même sans dessin (choixEcoute dit parmi quoi on choisit).
    ecoute: sonores.length >= n ? sonores : [],
    // Propositions écrites dans le fichier : 2 suffisent, même en P4 et après (3 choix, comme « Het is… »).
    trous: phrases.filter((p) => p.reponse).map((p) => ({ ...p, faux: fauxTrous(p, phrases) })).filter((p) => p.faux.length >= (p.propositions.length ? (deuxChoix ? 1 : 2) : n - 1)),
    'de-het': noms.length >= 4 ? noms : [],
  };
}

// Écoute : on choisit parmi les mots qui ont un dessin si le mot en a un et qu'il y en a assez,
// sinon parmi les mots écrits, pour qu'un mot sans dessin ne se reconnaisse pas à ce seul détail.
export function choixEcoute(cible, ecoute, n) {
  const pareils = ecoute.filter((m) => aUnVisuel(m) === aUnVisuel(cible));
  return pareils.length >= n ? pareils : ecoute;
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

// « Het is… » : chaque manche une fois, dans le désordre.
export function planFins(fins) {
  return tirer(fins, fins.length).map((cible) => ({ variante: 'fin-phrase', cible }));
}

// Exercices de grammaire (v1.65) : chaque ligne une fois, dans le désordre.
export const planListe = (variante, liste) => tirer(liste, liste.length).map((cible) => ({ variante, cible }));

// « J'écoute et je clique » : la section [ecoute] si elle existe (réponse = smiley…), sinon les phrases à trou
// qui ont un son, si leurs réponses forment 2 à 4 boutons (am / is / are). Boutons dans l'ordre du fichier, jamais mélangés.
// `ordre` (ligne « en_couleur: am, is, are ») range les boutons dans l'ordre de la leçon.
export const rangerOptions = (options, ordre = []) => [...options].sort((a, b) => rang(a, ordre) - rang(b, ordre));
// Un mot de la leçon peut appartenir à un groupe « have/don't/do » (même couleur, même rang).
const rang = (o, ordre) => { const k = ordre.findIndex((g) => g.split('/').includes(o.toLowerCase())); return k < 0 ? ordre.length : k; };
export function itemsEcouteClic(phrases, ecoute, ordre = []) {
  const items = ecoute.length
    ? ecoute.map((e) => ({ ...phrases.find((p) => p.id === e.id), bonne: e.reponse, deSection: true })).filter((x) => x.phrase)
    : phrases.filter((p) => p.reponse && p.son).map((p) => ({ ...p, bonne: p.reponse }));
  // Phrases à trou dont la réponse et les propositions sont toutes des mots de la leçon (ligne en_couleur) :
  // chacune garde ses propres boutons (have / has, don't / doesn't, do / does).
  const lecon = ordre.flatMap((g) => g.split('/'));
  const propres = items.map((x) => ({ ...x, options: rangerOptions([x.bonne, ...(x.propositions || [])], ordre) }));
  if (!ecoute.length && propres.length && propres.every((x) => x.options.length >= 2 && x.options.length <= 4 && x.options.every((o) => lecon.includes(o.toLowerCase())))) return propres;
  // Sinon, les mêmes boutons pour toutes : les réponses du chapitre, s'il y en a 2 à 4.
  const options = [];
  for (const x of items) if (!options.some((o) => o.toLowerCase() === x.bonne.toLowerCase())) options.push(x.bonne);
  const ranges = rangerOptions(options, ordre);
  return options.length >= 2 && options.length <= 4 ? items.map((x) => ({ ...x, options: ranges })) : [];
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

// Tour suivant (demande du 2026-10-24) : les questions ratées, mélangées, sans recommencer par la dernière posée.
export function tourSuivant(ratees, derniere) {
  const t = melanger(ratees);
  if (t.length > 1 && t[0] === derniere) t.push(t.shift());
  return t;
}

// ---------- Affichage ----------

// Félicitation d'une bonne réponse, tirée au hasard (jamais deux fois la même d'affilée) : liste à changer ici.
const BRAVOS = ['Bravo !', 'Super !', 'Génial !', 'Bien joué !', 'Excellent !', 'Tu as trouvé !'];
let dernierBravo = '';
export function bravo() {
  dernierBravo = tirer(BRAVOS.filter((b) => b !== dernierBravo), 1)[0];
  return dernierBravo;
}

// « 3 / 8 » et sa petite barre (CSS), qui se remplit de la question précédente à celle-ci.
export function compteur(rang, total) {
  const p = el('p', { class: 'compteur' }, `${rang} / ${total}`);
  p.style.setProperty('--fait', `${(rang / total) * 100}%`);
  p.style.setProperty('--avant', `${((rang - 1) / total) * 100}%`);
  return p;
}

// Une question. `fin(premierCoup, juste)` est appelé quand elle est terminée (réussie du premier coup, réussie tout court).
// Sans `total` (jeu de l'oie), ni compteur ni « Terminer ».
export function question(q, ctx, verifie, rang, total, fin) {
  const { langue, n, dispo } = ctx;
  // `ctx.sansSon` (combat de boss, demande du 2026-10-28) : seul « Écoute » garde son son, pour ne pas casser le rythme de la musique.
  const son = (x) => (x.son && !ctx.sansSon ? creerLecteur(cheminSon(x, ctx.dossier), { nom: x.mot || x.phrase }) : null);
  const mot = (x) => el('span', { class: 'mot', lang: langue }, x.mot);
  const c = q.cible;
  let enonce;
  let choix; // [{ noeud, juste }]
  let lecteur = null; // le son joué après la réponse
  let lecteurDansEnonce = false;
  let apres = () => {}; // ce qui change dans l'énoncé une fois la réponse donnée
  let autreConsigne = ''; // consigne adaptée au contenu (exercices de grammaire)

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
    lecteur = creerLecteur(cheminSon(c, ctx.dossier), { nom: 'le mot à écouter' });
    lecteurDansEnonce = true;
    enonce = lecteur;
    const parmi = choixEcoute(c, dispo.ecoute, n);
    const images = parmi.every(aUnVisuel);
    choix = propositions(c, parmi, n).map((x) => ({ noeud: images ? visuel(x, x.ind, langue) : mot(x), juste: x === c }));
  } else if (q.variante === 'trous') {
    const i = positionReponse(c.phrase, c.reponse);
    const trou = el('span', { class: 'trou' }, '…');
    trou.setAttribute('aria-label', 'mot qui manque');
    apres = () => { trou.textContent = c.phrase.slice(i, i + c.reponse.length); trou.removeAttribute('aria-label'); trou.classList.add('rempli'); };
    lecteur = son(c);
    lecteurDansEnonce = true;
    enonce = el('div', { class: 'pile' },
      dessinPhrase(c.dessin),
      el('p', { class: 'phrase', lang: langue }, c.phrase.slice(0, i), trou, c.phrase.slice(i + c.reponse.length)),
      lecteur || '');
    choix = propositions(c.reponse, c.faux, n).map((x) => ({ noeud: el('span', { class: 'mot', lang: langue }, x), juste: x === c.reponse }));
  } else if (q.variante === 'fin-phrase') {
    // Le nombre de propositions vient du fichier : 3 en P4 aussi (choix de l'enseignant du 2026-10-30).
    const trou = el('span', { class: 'trou' }, '…');
    trou.setAttribute('aria-label', 'fin de la phrase');
    apres = () => { trou.textContent = c.fin; trou.removeAttribute('aria-label'); trou.classList.add('rempli'); };
    enonce = el('div', { class: 'pile' },
      visuel(c.ref, c.ref.ind, langue),
      el('p', { class: 'phrase', lang: langue }, `${c.debut} `, trou));
    choix = propositions(c.fin, c.faux, c.faux.length + 1).map((x) => ({ noeud: el('span', { class: 'mot', lang: langue }, x), juste: x === c.fin }));
    lecteur = son(c.ref);
  } else if (q.variante === 'tri') {
    // « Je trie » (v1.65) : un mot ou une phrase à la fois ; les boîtes sont les boutons, dans l'ordre du fichier.
    if (estPhrase(c.texte)) autreConsigne = 'Range chaque phrase dans la bonne boîte.';
    enonce = el('p', { class: 'phrase carte-tri', lang: langue }, c.texte);
    choix = c.options.map((o) => ({ noeud: option(o, ctx), juste: o === c.boite }));
  } else if (q.variante === 'pronoms') {
    // « Le bon petit mot » (v1.65) : la phrase, puis la même avec un trou à la place du sujet.
    const i = positionReponse(c.phrase, c.sujet);
    const trou = el('span', { class: 'trou' }, '…');
    trou.setAttribute('aria-label', 'petit mot qui manque');
    apres = () => { trou.textContent = c.bon; trou.removeAttribute('aria-label'); trou.classList.add('rempli'); };
    enonce = el('div', { class: 'pile' },
      el('p', { class: 'phrase', lang: langue }, c.phrase),
      el('p', { class: 'phrase', lang: langue }, c.phrase.slice(0, i), trou, c.phrase.slice(i + c.sujet.length)));
    choix = propositions(c.bon, c.autres, c.autres.length + 1).map((x) => ({ noeud: el('span', { class: 'mot', lang: langue }, x), juste: x === c.bon }));
  } else if (q.variante === 'ecoute-clic') {
    // « J'écoute et je clique » (v1.65) : la phrase entendue (écrite, avec son trou, sans le son), boutons fixes.
    const i = c.deSection ? -1 : positionReponse(c.phrase, c.reponse);
    const trou = el('span', { class: 'trou' }, '…');
    const ecrit = el('p', { class: 'phrase', lang: langue }, ...(i < 0 ? [c.phrase] : [c.phrase.slice(0, i), trou, c.phrase.slice(i + c.reponse.length)]));
    apres = () => { ecrit.hidden = false; trou.textContent = c.phrase.slice(i, i + c.reponse.length); trou.classList.add('rempli'); };
    lecteur = c.son && !ctx.sansSon ? creerLecteur(cheminSon(c, ctx.dossier), { nom: 'la phrase à écouter' }) : null; // le nom ne donne pas la réponse
    if (lecteur) {
      ecrit.hidden = true; // la phrase écrite n'apparaît qu'après la réponse
    } else autreConsigne = 'Lis la phrase, puis touche le bon mot.';
    lecteurDansEnonce = true;
    enonce = el('div', { class: 'pile' }, lecteur || '', ecrit);
    choix = c.options.map((o) => ({ noeud: option(o, ctx), juste: o.toLowerCase() === c.bonne.toLowerCase() }));
    if (choix.every((x) => x.noeud.matches('img'))) autreConsigne = lecteur ? 'Écoute la phrase, puis touche la bonne image.' : 'Lis la phrase, puis touche la bonne image.';
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

  const [ic, texteBase] = CONSIGNES[q.variante];
  const texte = autreConsigne || texteBase;
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
  // `ctx.sansAvatar` : le combat de boss a déjà l'avatar dans son arène (exception du cahier 7.8).
  const dire = (ic2, txt, pose) => { retour.replaceChildren(icone(ic2), txt); if (!ctx.sansAvatar) { av.pose(pose); message.prepend(av); } };

  let essais = 0;
  // `muette` : fin sans toucher (minuteur du combat Expert), donc sans son (jamais de son qui part seul, cahier §9).
  function terminer(juste, texte, ic2, pose, muette = false) {
    ctx.repondu?.(); // combat Expert : le minuteur s'arrête
    if (muette) lecteur = null;
    for (const b of boutons) b.disabled = true;
    if (!juste) {
      const bonne = boutons.find((b) => b.juste);
      marquer(bonne, true);
      bonne.classList.add('montree'); // elle grossit un instant (CSS)
    }
    dire(ic2, texte, pose);
    apres();
    if (lecteur) {
      if (!lecteurDansEnonce) retour.after(lecteur);
      lecteur.jouer(); // après un toucher : permis aussi sur iPhone
    }
    // Une question ratée repassera dans un autre tour : « Terminer » serait trompeur.
    if (rang === total && !(juste && essais === 0)) suite.firstChild.textContent = 'Suivant';
    // Avec l'enchaînement automatique (combat de boss), pas de « Suivant » : il rendrait les élèves confus.
    suite.hidden = !!ctx.enchainer;
    // `ctx.sansDefilement` (combat de boss) : la page ne descend pas jusqu'à « Suivant » (demande du 2026-10-25).
    suite.focus({ preventScroll: !!ctx.sansDefilement });
    let parti = false; // une seule suite, qu'elle vienne du bouton ou de l'enchaînement
    const partir = () => { if (!parti) { parti = true; fin(juste && essais === 0, juste); } };
    suite.addEventListener('click', partir);
    // `ctx.enchainer` (combat de boss, demande du 2026-10-25) : [pause après une bonne réponse, après une erreur], en ms.
    // On passe seul à la suite, le son fini et la pause écoulée.
    if (ctx.enchainer) {
      let attend = false;
      const attendre = () => { if (!attend) { attend = true; setTimeout(partir, ctx.enchainer[juste ? 0 : 1]); } };
      if (lecteur) {
        lecteur.addEventListener('fin', attendre, { once: true });
        setTimeout(attendre, 8000); // un son qui ne part pas (fichier absent, iPhone muet) ne bloque pas le combat
      } else attendre();
    }
  }
  for (const b of boutons) {
    b.addEventListener('click', () => {
      marquer(b, b.juste);
      if (b.juste) return terminer(true, bravo(), 'sourire', 'content');
      // Un bouton bloqué perd le focus : au clavier, on passe à la réponse suivante au lieu de repartir en haut.
      boutons.find((x) => !x.disabled && x !== b)?.focus({ preventScroll: !!ctx.sansDefilement });
      b.disabled = true;
      if (verifie) return terminer(false, 'Pas grave, continue !', 'bulle', 'encourage');
      essais += 1;
      if (essais < 2) return dire('tourner', 'Essaie encore !', 'reflechit');
      terminer(false, 'Voici la bonne réponse.', 'bulle', 'explique');
    });
  }

  const zone = el('div', { class: 'exercice' },
    el('div', { class: 'tete-ex' }, titre, total ? compteur(rang, total) : ''),
    ctx.presents.has(consigneSon) && !ctx.sansSon ? creerLecteur(consigneSon, { nom: 'la consigne', avecBarre: false, lent: false }) : '',
    el('div', { class: 'enonce' }, enonce),
    // Images en grille ; mots les uns sous les autres (« de » et « het » côte à côte).
    // « courts » : que des mots de 5 lettres au plus (am, is, are), sur une ligne dans le combat sur téléphone (CSS).
    el('div', { class: `reponses n${boutons.length}${choix[0].noeud.matches('.mot') ? '' : ' visuels'}${choix.every((x) => x.noeud.matches('.mot') && x.noeud.textContent.length <= 5) ? ' courts' : ''}` }, ...boutons),
    message, suite);
  zone.titre = titre;
  zone.suite = suite;
  // Combat Expert : le minuteur attend la fin du mot à écouter ; temps écoulé = erreur, bonne réponse montrée.
  zone.ecoute = q.variante === 'ecoute' ? lecteur : null;
  zone.tempsEcoule = () => { if (!boutons.every((b) => b.disabled)) terminer(false, 'Temps écoulé !', 'bulle', 'encourage', true); };
  return zone;
}

// Un bouton de « Je trie » ou de « J'écoute et je clique » : le dessin images/<valeur>.svg s'il existe (smileys),
// sinon la valeur écrite. Le texte du dessin est le français du mot qui l'utilise (« j'adore »).
export const cheminOption = (o, dossier) => `${dossier}images/${o.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.svg`;
function option(o, ctx) {
  const src = cheminOption(o, ctx.dossier);
  if (!ctx.presents.has(src)) return el('span', { class: 'mot', lang: ctx.langue }, o);
  const nom = src.split('/').pop();
  return el('img', { class: 'dessin-option', src, alt: ctx.mots.find((m) => m.image === nom)?.francais || o });
}

// Enchaîne les questions d'un plan. Celles qui ne sont pas réussies du premier coup repassent, tour après tour,
// jusqu'à ce que toutes soient réussies (demande du 2026-10-24) ; puis `bilan(ratees)`, les ratées du premier tour.
// `poser(q, rang, total, fin)` fabrique une question, qui appelle `fin(reussieDuPremierCoup)`.
export function serieARepasser(zone, plan, poser, bilan) {
  let tour = plan;
  let ratees = [];
  let premier = null;
  let i = 0;
  function suivante(reussie) {
    arreter();
    if (i > 0 && !reussie) ratees.push(tour[i - 1]);
    if (i === tour.length) {
      premier ??= ratees;
      if (!ratees.length) return bilan(premier);
      tour = tourSuivant(ratees, tour[i - 1]);
      ratees = [];
      i = 0;
      return annonceTour(zone, tour.length, () => suivante(true));
    }
    i += 1;
    const q = poser(tour[i - 1], i, tour.length, suivante);
    // Des ratées attendent leur tour : la dernière question de ce tour ne « termine » pas encore.
    if (ratees.length && i === tour.length) q.suite.firstChild.textContent = 'Suivant';
    zone.replaceChildren(q);
    if (i > 1 || tour !== plan) q.titre.focus(); // au clavier et au lecteur d'écran, on repart de la consigne
  }
  suivante(true);
}

// Entre deux tours : combien de questions reviennent, avec l'avatar « encourage » (demande du 2026-10-24).
function annonceTour(zone, nombre, partir) {
  const titre = el('h2', { tabindex: '-1' }, icone('tourner'), 'Encore un petit effort !');
  const b = el('button', { type: 'button', class: 'action' }, 'C\'est parti', icone('droite'));
  b.addEventListener('click', partir);
  zone.replaceChildren(el('div', { class: 'bilan' }, el('div', { class: 'tete-bilan' }, avatar('encourage'), titre),
    el('p', {}, nombre > 1 ? `Revoyons les ${nombre} questions ratées.` : 'Revoyons la question ratée.'), b));
  titre.focus();
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
    x.son ? creerLecteur(cheminSon(x, ctx.dossier), { nom: x.mot || x.phrase }) : ''));
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
  if (nb === 3) fete(zone.firstChild);
  titre.focus();
}

// Petite fête : des étoiles tombent une seconde (victoire du combat de boss, 3 étoiles de « Je vérifie »).
// Rien si l'appareil demande moins d'animations.
export function fete(zone) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pluie = el('div', { class: 'fete-boss', 'aria-hidden': 'true' },
    ...Array.from({ length: 12 }, (_, k) => {
      const s = el('span', {}, icone('etoile'));
      s.style.left = `${4 + k * 8}%`;
      s.style.animationDelay = `${(k % 4) * 0.1}s`;
      return s;
    }));
  zone.append(pluie);
  setTimeout(() => pluie.remove(), 1600);
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
    creerLecteur(cheminSon(d, ctx.dossier), { nom: d.titre, large: true }),
    el('details', { class: 'traduction' },
      el('summary', {}, icone('oeil'), 'Voir la correction'),
      el('p', { lang: ctx.langue }, ...lignes(d.texte)),
      d.francais ? el('p', { class: 'fr' }, ...lignes(d.francais)) : ''));
}

// Dictée de dates (ligne « id | titre | dates: ») : un jour, un nombre de 1 à 31 et un mois du chapitre,
// tirés au hasard et joués à la suite. Seuls les mots qui ont leur son servent ; jamais de « 31 februari ».
// Un chapitre qui a des ordinaux (anglais, texte:1st à texte:31st) les emploie à la place des nombres.
const JOURS = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MOIS = { januari: 31, februari: 29, maart: 31, april: 30, mei: 31, juni: 30, juli: 31, augustus: 31, september: 30, oktober: 31, november: 30, december: 31,
  January: 31, February: 29, March: 31, April: 30, May: 31, June: 30, July: 31, August: 31, September: 30, October: 31, November: 30, December: 31 };
const valeur = (m) => parseInt(m.image.slice(6), 10); // « texte:12 » -> 12, « texte:3rd » -> 3
export function piecesDates(mots) {
  const avecSon = mots.filter((m) => m.son);
  const ordinaux = avecSon.filter((m) => /^texte:([1-9]|[12]\d|3[01])(st|nd|rd|th)$/.test(m.image));
  return {
    jours: avecSon.filter((m) => JOURS.includes(m.mot)),
    mois: avecSon.filter((m) => MOIS[m.mot]),
    nombres: ordinaux.length ? ordinaux : avecSon.filter((m) => /^texte:([1-9]|[12]\d|3[01])$/.test(m.image)),
  };
}
export const datesPossibles = ({ jours, mois, nombres }) => jours.length > 0 && mois.length > 0 && nombres.length > 0;
export function tirerDate({ jours, mois, nombres }, hasard = Math.random) {
  const un = (liste) => liste[Math.floor(hasard() * liste.length)];
  const m = un(mois.filter((x) => nombres.some((n) => valeur(n) <= MOIS[x.mot])));
  return [un(jours), un(nombres.filter((n) => valeur(n) <= MOIS[m.mot])), m];
}

function dicteeDates(d, ctx) {
  const pieces = piecesDates(ctx.mots);
  const bloc = el('div', { class: 'piste' });
  const nouvelle = (e) => {
    arreter();
    const date = tirerDate(pieces);
    const autre = el('button', { type: 'button', class: 'action' }, icone('tourner'), 'Une autre date');
    autre.addEventListener('click', nouvelle);
    bloc.replaceChildren(
      el('h3', {}, d.titre),
      el('p', { class: 'consigne-dictee' }, icone('crayon'), 'Écoute et écris la date sur ta feuille.'),
      creerLecteur(date.map((m) => cheminSon(m, ctx.dossier)), { nom: 'la date', avecBarre: false }),
      el('details', { class: 'traduction' },
        el('summary', {}, icone('oeil'), 'Voir la correction'),
        el('p', { lang: ctx.langue }, `${date[0].mot} ${date[1].image.slice(6)} ${date[2].mot}`),
        // Traduction, comme pour les autres dictées (« lundi 1er janvier » : « 1er » en français).
        el('p', { class: 'fr' }, `${date[0].francais} ${valeur(date[1]) === 1 ? '1er' : valeur(date[1])} ${date[2].francais}`)),
      autre);
    if (e) bloc.querySelector('.lire').focus(); // après « Une autre date », on peut écouter tout de suite
  };
  nouvelle();
  return bloc;
}

// Entrées de « Je m'entraîne », gardées dans l'adresse (?exercice=de-het, ordre, couleurs ou dictees).
// shortcut: le nom « Het is… » est fixe, à rendre variable si un chapitre commence ses phrases autrement.
const ENTREES = { '': ['Exercices', 'crayon'], 'de-het': ['De ou het ?', 'bulle'], 'fin-phrase': ['Het is…', 'image'], ordre: ['Mots en ordre', 'ordre'], couleurs: ['Couleurs', 'image'], dictees: ['Dictées', 'haut-parleur'],
  tri: ['Je trie', 'grille'], pronoms: ['Le bon petit mot', 'bulle'], 'ecoute-clic': [muet ? 'Je lis et je clique' : 'J\'écoute et je clique', muet ? 'oeil' : 'haut-parleur'] };
const LISTES = ['tri', 'pronoms', 'ecoute-clic']; // exercices de grammaire : chaque ligne une fois (planListe)
function choixExercice(choix, actif) {
  const lien = (valeur) => {
    const params = new URLSearchParams(location.search);
    if (valeur) params.set('exercice', valeur); else params.delete('exercice');
    const [nom, ic] = ENTREES[valeur];
    return el('a', { class: 'seg', href: `?${params}`, 'aria-current': valeur === actif && 'page' }, icone(ic), nom);
  };
  return el('nav', { class: `segments sens n${choix.length}`, 'aria-label': 'Choix de l\'exercice' }, ...choix.map(lien));
}

// « Mots en ordre » : les manches de [ordre], dans l'ordre du fichier ; à la fin, le son de tout le texte s'il y en a un.
function lancerOrdre(zone, donnees, ctx) {
  const { dossier, langue, presents } = ctx;
  const audio = (o, id) => (id && presents.has(cheminSon(o, dossier, id)) ? cheminSon(o, dossier, id) : '');
  // Manche avec intrus : l'image du mot du chapitre présent dans la phrase, pour savoir quelle phrase faire
  // (jamais le français, demande du 2026-10-26). Comparaison sans article, majuscule ni ponctuation.
  const nu = (t) => t.toLowerCase().replace(/^(de|het) /, '').replace(/[.,!?]/g, '');
  const image = (o) => {
    // Dessin de la phrase du son de fin, sinon celui de la manche : il remplace l'image du mot (demande du 2026-11-02).
    const src = ctx.phrases.find((p) => p.id === o.son && p.dossier === o.dossier && p.dessin)?.dessin || (presents.has(cheminDessin(o, dossier)) ? cheminDessin(o, dossier) : '');
    if (src) return dessinPhrase(src);
    // Le son de la 3e colonne peut être celui d'une phrase de [mots] (« Het is zonnig. ») : son dessin vaut alors pour toute la manche.
    const m = o.intrus.length && ctx.mots.find((x) => x.ind.type === 'image' && (x.id === o.son || o.cases.some((c) => nu(c) === nu(x.mot))));
    return m ? visuel(m, m.ind, langue) : null;
  };
  // Un son de la 3e colonne propre à une seule manche se joue après elle ; partagé, il reste pour la fin (2026-10-26).
  // Chapitre de révision : 2 manches par chapitre repris, tirées à chaque partie (demande du 2026-10-28).
  const manches = donnees.reprend?.length ? melanger(donnees.ordre).slice(0, 2 * new Set(donnees.ordre.map((o) => o.chapitre)).size) : donnees.ordre;
  const usages = (x) => manches.filter((o) => o.son === x.son && o.dossier === x.dossier).length;
  const items = manches.map((o) => ({ cases: o.cases, audio: audio(o, o.id) || (usages(o) === 1 ? audio(o, o.son) : ''),
    francais: '', intrus: o.intrus, image: image(o) }));
  const sons = [...new Set(manches.filter((o) => usages(o) > 1).map((o) => audio(o, o.son)).filter(Boolean))];
  serieOrdre(zone, items, langue, () => lancerOrdre(zone, donnees, ctx),
    el('p', {}, 'Tu as remis tous les mots en ordre !'),
    ...sons.map((chemin) => el('div', { class: 'pile' },
      el('p', {}, icone('haut-parleur'), ' Écoute tout le texte :'),
      creerLecteur(chemin, { nom: 'tout le texte', large: true }))));
}

export async function afficherExercices(conteneur, donnees, dossier, langue, annee, verifie, exercice) {
  const consignes = Object.keys(CONSIGNES).map((v) => `contenu/${langue}/consignes/${v}.m4a`);
  // Sons facultatifs de [ordre] : un par manche, et celui à écouter à la fin.
  const sonsOrdre = donnees.ordre.flatMap((o) => [o.id, o.son].filter(Boolean).map((id) => cheminSon(o, dossier, id)));

  // Dessins des boîtes et des réponses de « Je trie » et « J'écoute et je clique » (smileys) : images/<valeur>.svg.
  const dessinsOptions = [...donnees.tri.map((t) => t.boite), ...donnees.ecoute.map((e) => e.reponse)].map((o) => cheminOption(o, dossier));
  const [{ presents, indices }] = await Promise.all([chercherFichiers(donnees, dossier, [...consignes, ...sonsOrdre, ...dessinsOptions]), chargerAvatar()]);
  const aSon = (x) => presents.has(cheminSon(x, dossier));
  const n = annee === 'p3' ? 3 : 4; // 3 choix en P3, 4 en P4
  const mots = donnees.mots.map((m, k) => ({ ...m, ind: indices[k], son: aSon(m) }));
  const phrases = donnees.phrases.map((p) => ({ ...p, son: aSon(p), dessin: presents.has(cheminDessin(p, dossier)) ? cheminDessin(p, dossier) : '' }));
  const dispo = disponibles(mots, phrases, n, annee === 'grammaire');
  const ctx = { langue, dossier, n, dispo, presents, mots, phrases };

  const parties = [];
  const avecMelange = unites(dispo).size > 0;
  const avecDeHet = dispo['de-het'].length > 0;
  const avecOrdre = !verifie && donnees.ordre.length > 0; // « Mots en ordre » : seulement dans « Je m'entraîne »
  const couleurs = verifie ? null : await preparerCouleurs(donnees, mots, langue, annee); // exercice « Couleurs » (ligne couleurs:)
  const fins = verifie ? [] : donnees.finsDePhrase.map((f) => ({ ...f, ref: mots.find((m) => m.id === f.mot) })).filter((f) => f.ref); // « Het is… » : seulement dans « Je m'entraîne »
  const dictees = verifie ? [] : donnees.dictees.filter((d) => (d.dates ? datesPossibles(piecesDates(mots)) : aSon(d))); // dictées : leur propre entrée (demande du 2026-10-20)
  // Les entrées possibles ; sans précision dans l'adresse, la première (les exercices mélangés s'il y en a).
  // Seules les entrées possibles restent (une condition fausse donne false ou null, jamais un nom d'entrée).
  // Grammaire (v1.65), seulement dans « Je m'entraîne » : chaque ligne avec ses boutons (boîtes, pronoms, réponses).
  // Ordre de la leçon : les mots de en_couleur, puis les dessins des cartes (smileys : love, like, dont-like).
  const ordreLecon = [...donnees.en_couleur, ...donnees.mots.map((m) => m.image.toLowerCase().replace(/\.svg$/, ''))];
  const boites = [];
  for (const t of donnees.tri) if (!boites.includes(t.boite)) boites.push(t.boite);
  const listes = verifie ? {} : {
    tri: boites.length >= 2 ? donnees.tri.map((t) => ({ ...t, options: rangerOptions(boites, ordreLecon) })) : [],
    pronoms: donnees.pronoms,
    'ecoute-clic': itemsEcouteClic(phrases, donnees.ecoute, ordreLecon),
  };
  const choix = [avecMelange && '', avecDeHet && 'de-het', fins.length > 0 && 'fin-phrase', avecOrdre && 'ordre',
    ...LISTES.map((v) => listes[v]?.length > 0 && v), couleurs && 'couleurs', dictees.length > 0 && 'dictees'].filter((x) => typeof x === 'string');
  const actif = choix.includes(exercice) ? exercice : choix[0];
  const deHet = actif === 'de-het';
  if (!verifie && choix.length > 1) parties.push(choixExercice(choix, actif));

  const zone = el('div', { class: 'zone-exercice' });
  const plan = () => (verifie ? planVerifie(dispo) : actif === 'fin-phrase' ? planFins(fins) : LISTES.includes(actif) ? planListe(actif, listes[actif]) : planEntraine(dispo, deHet));
  const lancer = () => {
    if (!verifie && actif === 'ordre') return lancerOrdre(zone, donnees, ctx);
    if (!verifie && actif === 'couleurs') return lancerCouleurs(zone, { ...couleurs, langue, dossier });
    if (!verifie && actif === 'dictees') return zone.replaceChildren(...dictees.map((d) => (d.dates ? dicteeDates(d, ctx) : dictee(d, ctx))));
    const p = plan();
    serieARepasser(zone, p, (q, rang, total, fin) => question(q, ctx, verifie, rang, total, fin), (ratees) => (verifie
      ? bilanVerifie(zone, p.length, ratees.map((q) => q.cible), ctx, lancer)
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
