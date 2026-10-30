// Musique de fond du combat de boss (cahier 7.9 et 9, demandée le 2026-10-28) : la seule exception
// à « un seul son à la fois ». Elle baisse pendant chaque mot ou phrase (audio.js appelle baisser()).
// Web Audio plutôt qu'un lecteur : boucle sans blanc, et volume réglable même sur iPhone.
// Elle ne démarre qu'après un toucher (sur iPhone, jamais avant un toucher sur la page même).

// Introduction jouée une fois, puis boucle [début, fin] en secondes, trouvée par tests/boucler-musiques.py.
// Les musiques « un-coeur » arrivent en plein combat : elles commencent directement à leur boucle.
const BOUCLES = {
  'combat': [8.85, 54.379583],
  'combat-un-coeur': [0.5, 45.668917],
  'combat-difficile': [8.05, 51.122937],
  'combat-difficile-un-coeur': [0.5, 42.858729],
  'fin-annee': [14.9, 71.372729],
  'fin-annee-un-coeur': [0.5, 53.320833],
  'fin-annee-difficile': [14, 67.151667],
  'fin-annee-difficile-un-coeur': [0.5, 55.620146],
};
// Les enregistrements sont peu forts (moyenne autour de -38 dB, voir tests/mesurer-sons.py) : ces deux réglages gardent la voix nettement au-dessus.
const VOLUME = 0.15;
const BAS = 0.015; // pendant un mot : encore là, mais le mot s'entend bien

let ctx = null;
let piste = null; // { source, gain } de la musique en cours
let voulue = null; // musique demandée, en attente d'un toucher ou de son chargement
let enCours = null; // nom de la musique du combat, même coupée
let baisse = false;
export let coupee = false; // l'enfant l'a coupée : elle reste coupée jusqu'à la fin de la page (rien n'est enregistré)
const tampons = {};

const charger = (nom) => (tampons[nom] ??= fetch(`contenu/musique/${nom}.m4a`)
  .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject()))
  .then((b) => ctx.decodeAudioData(b)));

const niveau = () => (baisse ? BAS : VOLUME);

function fondre(gain, vers, duree) {
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setValueAtTime(gain.gain.value, t);
  gain.gain.linearRampToValueAtTime(vers, t + duree);
}

function eteindre(duree) {
  if (!piste) return;
  const { source, gain } = piste;
  fondre(gain, 0, duree);
  source.stop(ctx.currentTime + duree);
  piste = null;
}

async function lancer() {
  const demande = voulue;
  if (!demande || coupee || ctx.state !== 'running') return;
  let tampon;
  try { tampon = await charger(demande.nom); } catch { return; } // fichier absent : pas de musique, sans message
  if (voulue !== demande || coupee) return; // entre-temps, autre musique ou fin du combat
  const [debut, fin] = BOUCLES[demande.nom];
  const source = ctx.createBufferSource();
  source.buffer = tampon;
  source.loop = true;
  source.loopStart = debut;
  source.loopEnd = fin;
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(gain).connect(ctx.destination);
  eteindre(demande.fondu);
  source.start(0, demande.direct ? debut : 0);
  fondre(gain, niveau(), demande.direct ? demande.fondu : 0.05);
  piste = { source, gain };
  voulue = null;
}

// Au premier toucher sur la page, le navigateur permet le son : la musique demandée démarre alors.
function debloquer() {
  ctx.resume().then(lancer);
  if (piste) return;
  // Un son vide pendant le toucher lui-même : sur iPhone, c'est lui qui ouvre vraiment la sortie du son.
  const vide = ctx.createBufferSource();
  vide.buffer = ctx.createBuffer(1, 1, 22050);
  vide.connect(ctx.destination);
  vide.start();
}

// Page cachée (autre onglet, écran éteint) : la musique se tait, et reprend au retour.
// Fondu d'abord : un arrêt net fait un « biip » sur iPhone.
function veille() {
  if (document.hidden) {
    if (piste) fondre(piste.gain, 0, 0.05);
    setTimeout(() => document.hidden && ctx.suspend(), 80);
  } else ctx.resume().then(() => piste && fondre(piste.gain, niveau(), 0.3));
}

// Lien du site touché pendant la musique : même fondu, puis départ.
function quitter(e) {
  const lien = e.target.closest('a[href]');
  if (!piste || !lien || lien.target) return;
  e.preventDefault();
  eteindre(0.08);
  setTimeout(() => { location.href = lien.href; }, 120);
}

function preparer() {
  if (ctx) return;
  // iPhone en mode silencieux : sans cela, la musique se tait jusqu'au premier son du lecteur (les voix, elles, passent).
  // shortcut: iOS 16.3 et avant n'ont pas ce réglage, la musique y attend ce premier son ; à revoir si des familles s'en plaignent.
  if (navigator.audioSession) navigator.audioSession.type = 'playback';
  ctx = new AudioContext();
  document.addEventListener('visibilitychange', veille);
  addEventListener('click', quitter, true);
  // Les gestes qui autorisent le son. Écoutés sans fin : sur iPhone, un doigt qui glisse ou qui se pose ne compte pas, il faut réessayer au suivant.
  for (const geste of ['pointerup', 'pointerdown', 'touchend', 'click', 'keydown']) addEventListener(geste, debloquer);
}

// À appeler pendant le toucher qui ouvre le combat : la musique peut alors partir dès son début.
export function amorcer() {
  preparer();
  debloquer();
}

// Joue la musique `nom` ; `direct` : à sa boucle, en fondu enchaîné avec la précédente (plus qu'un cœur).
export function jouer(nom, direct = false) {
  preparer();
  charger(nom).catch(() => {}); // déjà prête au premier toucher, pour qu'elle parte sans attendre
  enCours = nom;
  voulue = { nom, direct, fondu: direct ? 1.5 : 0.3 };
  if (ctx.state === 'running') lancer();
  else ctx.resume().then(lancer).catch(() => {}); // sans toucher, le navigateur refuse : on attend le premier
}

export function arreterMusique() {
  voulue = enCours = null;
  if (ctx) eteindre(0.8);
}

export function couper(oui) {
  coupee = oui;
  if (oui) eteindre(0.3);
  else if (enCours) { voulue = { nom: enCours, direct: true, fondu: 0.5 }; debloquer(); } // rallumée : reprend à sa boucle
}

// Appelé par le lecteur unique (audio.js) : un mot ou une phrase commence ou finit.
export function baisser(oui) {
  baisse = oui;
  if (piste) fondre(piste.gain, niveau(), oui ? 0.08 : 0.6); // vite, pour ne pas couvrir le début d'un mot court
}
