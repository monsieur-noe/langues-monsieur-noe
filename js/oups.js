// Message « Oups, il y a un problème. » quand une page ne s'affiche pas du tout (une erreur l'a arrêtée).
// Volontairement indépendant (aucun import) : il doit marcher même si les autres fichiers du site sont en panne.
// Chargé en premier par index.html et chapitre.html. Une erreur après l'affichage de la page n'affiche rien.

// La page est-elle déjà visible ? (accueil : une liste de choix ; chapitre : le contenu du chapitre)
const pageAffichee = () => document.querySelector('#contenu:not([hidden]), main > .liste:not([hidden])');

function oups() {
  const main = document.querySelector('main');
  if (!main || pageAffichee() || document.querySelector('.oups')) return;
  const bloc = document.createElement('div');
  bloc.className = 'oups';
  bloc.setAttribute('role', 'alert');

  // Avatar « oups » s'il existe ; sinon rien (l'image se retire toute seule).
  const avatar = document.createElement('img');
  avatar.className = 'avatar';
  avatar.alt = '';
  avatar.src = 'contenu/avatar/oups.svg';
  avatar.addEventListener('error', () => avatar.remove());

  const texte = document.createElement('div');
  const titre = document.createElement('p');
  titre.className = 'oups-titre';
  titre.textContent = 'Oups, il y a un problème.';
  const aide = document.createElement('p');
  aide.textContent = 'Recharge la page. Si ça continue, préviens ton enseignant.';
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'action';
  bouton.textContent = 'Recharger la page';
  bouton.addEventListener('click', () => location.reload());
  texte.append(titre, aide, bouton);

  bloc.append(avatar, texte);
  main.prepend(bloc);
}

// Erreurs de chargement d'un fichier du site et erreurs pendant l'affichage de la page.
window.addEventListener('error', oups);
window.addEventListener('unhandledrejection', oups);
