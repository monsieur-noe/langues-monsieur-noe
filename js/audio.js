// Le lecteur audio unique du site (cahier 9) : tous les sons passent par creerLecteur().
// Bouton lecture/pause, barre de progression que l'on touche ou fait glisser, temps écoulé / durée.
// Un seul son à la fois ; rien ne démarre seul (sur iPhone, un son ne part qu'après un toucher).
import { el, icone } from './outils.js?v=c16b4cc5';

let actif = null; // le son en cours, pour l'arrêter quand un autre démarre

// Arrête le son en cours (par exemple quand la carte change).
export function arreter() {
  if (actif) actif.pause();
}

// 70 -> « 1:10 »
export function temps(s) {
  const n = Math.floor(s || 0);
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
}

// Ce que lit un lecteur d'écran sur la barre : « 7 secondes sur 70 ».
export function texteBarre(position, duree) {
  const n = Math.floor(position || 0); // arrondi vers le bas, comme l'horloge « 0:07 / 1:10 »
  return `${n} ${n > 1 ? 'secondes' : 'seconde'} sur ${Math.floor(duree || 0)}`;
}

// Crée un lecteur. Compact (phrases, exercices) : bouton et fine barre ; sans barre (cartes) : bouton seul.
// Large (pistes, dictées) : en plus le temps « 0:07 / 1:10 » et le bouton « ⟲ 5 secondes ».
// L'élément renvoyé a une méthode jouer(), pour les sons lancés après une réponse (exercices).
// `lent` : bouton « tortue » qui rejoue le son plus lentement, sans changer la voix (sauf consignes en français).
export function creerLecteur(chemin, { nom, large = false, avecBarre = true, lent = true }) {
  const audio = new Audio();
  // Économie de données : les petits fichiers chargent seulement leur durée, les longs rien du tout.
  audio.preload = large ? 'none' : 'metadata';
  // Plusieurs chemins (dictée de dates) : joués à la suite par ce même lecteur, donc jamais deux sons à la fois.
  const sons = [].concat(chemin);
  let rang = 0;
  audio.src = sons[0];
  const auDebut = (vitesse) => {
    if (rang) audio.src = sons[rang = 0];
    audio.currentTime = 0;
    audio.defaultPlaybackRate = audio.playbackRate = vitesse; // la vitesse par défaut survit au changement de son
  };

  const bouton = el('button', { type: 'button', class: 'lire' });
  const barre = el('input', { type: 'range', class: 'barre', min: 0, max: 0, step: 'any', value: 0,
    'aria-label': `Position dans « ${nom} »` });
  const horloge = el('span', { class: 'horloge', 'aria-hidden': 'true' });

  function maj() {
    const joue = !audio.paused;
    bouton.replaceChildren(icone(joue ? 'pause' : 'lecture'));
    bouton.classList.toggle('joue', joue); // ondes autour du bouton pendant le son (CSS)
    bouton.setAttribute('aria-label', `${joue ? 'Pause' : 'Écouter'} « ${nom} »`);
    const duree = Number.isFinite(audio.duration) ? audio.duration : 0; // inconnue avant le premier chargement
    barre.max = duree;
    barre.value = audio.currentTime;
    barre.disabled = !duree;
    barre.setAttribute('aria-valuetext', texteBarre(audio.currentTime, duree));
    barre.style.setProperty('--progres', `${duree ? (audio.currentTime / duree) * 100 : 0}%`);
    horloge.textContent = duree ? `${temps(audio.currentTime)} / ${temps(duree)}` : temps(audio.currentTime);
  }
  for (const evt of ['play', 'pause', 'ended', 'timeupdate', 'durationchange', 'loadedmetadata', 'seeked']) audio.addEventListener(evt, maj);
  audio.addEventListener('play', () => {
    if (actif && actif !== audio) actif.pause();
    actif = audio;
  });

  const lire = () => audio.play().catch(() => {}); // un son qui ne part pas n'affiche jamais d'erreur à l'enfant
  bouton.addEventListener('click', () => {
    if (!audio.paused) return audio.pause();
    audio.defaultPlaybackRate = audio.playbackRate = 1;
    lire();
  });
  barre.addEventListener('input', () => { audio.currentTime = Number(barre.value); });
  // Au clavier, une flèche = une seconde (sinon le navigateur avance d'un centième du son, invisible).
  barre.addEventListener('keydown', (e) => {
    const pas = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!pas) return;
    e.preventDefault();
    audio.currentTime = Math.min(Math.max(audio.currentTime + pas, 0), Number(barre.max));
  });

  const enfants = avecBarre ? [bouton, barre] : [bouton];
  if (lent) {
    const tortue = el('button', { type: 'button', class: 'tortue', 'aria-label': `Écouter lentement « ${nom} »` }, icone('tortue'));
    tortue.addEventListener('click', () => { auDebut(0.7); lire(); });
    enfants.push(tortue);
  }
  if (large) {
    const recul = el('button', { type: 'button', class: 'recul', 'aria-label': 'Réécouter les 5 dernières secondes' }, icone('recul'), '5 s');
    recul.addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - 5); });
    enfants.push(horloge, recul);
  }
  maj();
  const racine = el('div', { class: large ? 'lecteur-audio large' : 'lecteur-audio' }, ...enfants);
  racine.jouer = () => { auDebut(1); lire(); };
  // Son suivant de la liste ; à la fin de tout, signal « fin » : sert à enchaîner deux sons (exercice « Couleurs »).
  audio.addEventListener('ended', () => {
    if (rang < sons.length - 1) { audio.src = sons[++rang]; lire(); return; }
    if (rang) audio.src = sons[rang = 0]; // le prochain toucher repart du premier son
    racine.dispatchEvent(new Event('fin'));
  });
  return racine;
}
