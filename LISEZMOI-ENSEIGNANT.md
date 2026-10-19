# Notice : faire vivre le site tout seul

Cette notice explique comment modifier le site « Les langues avec Monsieur Noé » avec votre seul navigateur. Pas de logiciel à installer, pas de code à écrire.

**Les adresses à garder sous la main**

- Le site : https://monsieur-noe.github.io/langues-monsieur-noe/
- La page de contrôle (pour vous seul) : https://monsieur-noe.github.io/langues-monsieur-noe/controle/
- Le dépôt sur GitHub (là où sont rangés les fichiers) : https://github.com/monsieur-noe/langues-monsieur-noe

**Trois mots de vocabulaire**

- **Dépôt** : le dossier en ligne qui contient tous les fichiers du site.
- **Commit** : un enregistrement. Chaque fois que vous cliquez sur « Commit changes », GitHub garde une copie de cette version. Vous pouvez donc toujours revenir en arrière.
- **main** : le nom de la version publiée du site. Laissez toujours `main`.

**La règle d'or : après chaque modification**

1. Attendez **5 minutes** : GitHub met ce temps à publier.
2. Rechargez le site. Si rien n'a changé, attendez encore 5 minutes et rechargez de nouveau.
3. Ouvrez la **page de contrôle** et vérifiez que votre chapitre a une pastille ✔ (voir la partie 5).

Avant de commencer, connectez-vous à GitHub (bouton « Sign in » en haut à droite), avec votre mot de passe et votre application de double authentification.

---

## 1. Ce que vous pouvez modifier, et ce qu'il ne faut jamais toucher

Vous ne modifiez que le dossier **`contenu/`**. Tout le reste fait fonctionner le site : n'y touchez pas.

| Dossier ou fichier | Vous pouvez y toucher ? |
|---|---|
| `contenu/` : les chapitres, les sons, les images | **Oui** |
| `pages/parents.html` et `pages/confidentialite.html` | Rarement, seulement pour corriger une phrase |
| `index.html`, `chapitre.html`, `css/`, `js/`, `polices/`, `controle/` | **Non** |
| `.nojekyll` | **Non, et ne le supprimez jamais** |

Dans le dossier `contenu/` :

- `catalogue.txt` : la liste des chapitres affichés sur l'accueil.
- `accueil.txt` : la ligne « Hello! | Hallo! | Bonjour! » de l'accueil.
- `_modele/chapitre.txt` : un chapitre vide et expliqué, à copier pour en créer un nouveau.
- `nl/p3/<chapitre>/` : un dossier par chapitre. Dedans : `chapitre.txt` (les mots), `audio/` (les sons), et plus tard `images/`.

Les règles d'écriture des fichiers `.txt` :

- Les colonnes sont séparées par `|`, avec une espace de chaque côté.
- Une ligne qui commence par `#` est une note pour vous : le site l'ignore.
- Les lignes vides sont ignorées.
- Les noms de fichiers et les identifiants : **minuscules, sans accent, sans espace**, avec des tirets (`te-voet`, `kleren-1`).
- Un identifiant ne change plus une fois publié.

## 2. Corriger ou ajouter un mot ou une phrase

Exemple : le chapitre « Kleuren ».

1. Ouvrez le fichier à modifier avec ce lien (changez le nom du chapitre si besoin) :
   https://github.com/monsieur-noe/langues-monsieur-noe/edit/main/contenu/nl/p3/kleuren/chapitre.txt
2. Le texte s'affiche dans un éditeur. Cliquez à l'endroit voulu et écrivez.
   - **Corriger** : changez le mot ou le français. Ne changez pas l'identifiant (la 1re colonne).
   - **Ajouter un mot** : ajoutez une ligne sous `[mots]`, par exemple :
     `pet | de pet | la casquette`
   - **Ajouter une phrase** : ajoutez une ligne sous `[phrases]`, par exemple :
     `p3 | Ik draag een rode pet. | Je porte une casquette rouge. | rode`
3. Cliquez sur le bouton vert **« Commit changes... »** en haut à droite.

   ![Le bouton « Commit changes... » en haut à droite de l'éditeur](notice/1-modifier.jpg)

4. Une fenêtre s'ouvre. Laissez tout tel quel (« Commit directly to the main branch » reste coché) et cliquez sur **« Commit changes »**.

   ![La fenêtre d'enregistrement et son bouton « Commit changes »](notice/3-enregistrer.jpg)

5. Ajoutez le son du nouveau mot (partie 3), sous le nom `<identifiant>.m4a`, par exemple `pet.m4a`.
6. Appliquez la règle d'or : 5 minutes, puis la page de contrôle.

Sans son, le mot s'affiche quand même, simplement sans haut-parleur.

## 3. Ajouter ou remplacer un son ou une image

Il suffit de déposer le fichier, **au bon nom, dans le bon dossier**. Si un fichier du même nom existe déjà, il est remplacé.

**Le nom du fichier**

- Un son : `<identifiant>.m4a`, par exemple `rood.m4a` pour la ligne `rood | rood | rouge`. Format `.m4a` uniquement, 100 Ko au plus pour un mot.
- Une image : `<identifiant>.png`, par exemple `pet.png`. Une image en `.svg` ou `.webp` marche aussi, mais il faut alors écrire son nom dans la 4e colonne du mot (`pet | de pet | la casquette | pet.svg`). Taille : 600 × 600 pixels et 80 Ko au plus, fond uni, sans texte dans l'image.

**Déposer le fichier**

1. Sur votre ordinateur, vérifiez le nom du fichier (minuscules, sans accent, sans espace).
2. Ouvrez la page d'envoi du dossier voulu :
   - un son de « Kleuren » : https://github.com/monsieur-noe/langues-monsieur-noe/upload/main/contenu/nl/p3/kleuren/audio
   - une image de « Vervoermiddelen » : https://github.com/monsieur-noe/langues-monsieur-noe/upload/main/contenu/nl/p3/vervoermiddelen/images
   - pour un autre chapitre, remplacez `kleuren` par le nom de son dossier.
   Le lien marche même si le dossier n'existe pas encore (par exemple la première image d'un chapitre) : GitHub le crée.
3. Faites glisser le fichier depuis votre ordinateur dans le grand cadre de la page. Vous pouvez en glisser plusieurs à la fois.
4. Attendez que leur nom apparaisse sous le cadre, puis cliquez sur le bouton vert **« Commit changes »** en bas.

   ![La page d'envoi : le cadre où glisser les fichiers, puis le bouton « Commit changes »](notice/2-deposer.jpg)

5. Règle d'or : 5 minutes, puis la page de contrôle.

Un son enregistré en un seul long fichier (tous les mots à la suite) doit être découpé en un fichier par mot : demandez à Claude.

## 4. Ajouter un chapitre complet

Exemple : un chapitre « Kleren » pour la P3. Choisissez d'abord **le nom du dossier** : minuscules, sans accent, tirets. Ici : `kleren`.

**A. Créer le fichier du chapitre**

1. Ouvrez le chapitre modèle : https://github.com/monsieur-noe/langues-monsieur-noe/blob/main/contenu/_modele/chapitre.txt
2. Au-dessus du texte, à droite, cliquez sur l'icône **« Copy raw file »** (deux petits carrés). Tout le texte est copié.
3. Ouvrez ce lien, qui crée un nouveau fichier (remplacez `kleren` par votre nom de dossier) :
   https://github.com/monsieur-noe/langues-monsieur-noe/new/main?filename=contenu/nl/p3/kleren/chapitre.txt
4. Cliquez dans le grand cadre vide et collez (touches **Ctrl** et **V** en même temps).
5. Remplissez le fichier en lisant ses notes :
   - `titre:` le titre du chapitre, par exemple `titre: Kleren`.
   - sous `[mots]` : une ligne par mot. Au moins 4 mots ; 8 à 30 c'est mieux.
     `broek | de broek | le pantalon`
     `hemd | het hemd | la chemise`
     Pour un nom, écrivez l'article (`de` ou `het`) : l'exercice « De ou het ? » se crée tout seul.
   - `[phrases]`, `[pistes]`, `[dictees]` : facultatifs. Laissez-les vides si vous n'en avez pas.
   - Vous pouvez effacer les lignes d'exemple qui commencent par `#`, ou les garder : le site les ignore.
6. Cliquez sur **« Commit changes... »**, puis **« Commit changes »**.

**B. Déposer les sons**

1. Sur votre ordinateur, préparez un fichier par mot, nommé comme l'identifiant : `broek.m4a`, `hemd.m4a`…
2. Ouvrez la page d'envoi du dossier `audio` du nouveau chapitre (GitHub le crée) :
   https://github.com/monsieur-noe/langues-monsieur-noe/upload/main/contenu/nl/p3/kleren/audio
3. Faites glisser tous les sons d'un coup dans le cadre.
4. Cliquez sur **« Commit changes »**.

**C. Ajouter le chapitre à l'accueil**

1. Ouvrez le catalogue : https://github.com/monsieur-noe/langues-monsieur-noe/edit/main/contenu/catalogue.txt
2. Ajoutez une ligne à la fin :
   `nl | p3 | kleren | 4 | Kleren`
   Dans l'ordre : langue (`nl`), année (`p3` ou `p4`), nom du dossier (exactement le même qu'en A), place dans la liste, titre affiché.
3. **« Commit changes... »**, puis **« Commit changes »**.

**D. Vérifier**

Règle d'or : 5 minutes, puis la page de contrôle. Ensuite, ouvrez le chapitre sur le site et essayez les trois rubriques.

Les images viennent plus tard, quand vous les avez (partie 3). En attendant, les cartes montrent le français.

## 5. Vérifier votre travail avec la page de contrôle

Ouvrez **https://monsieur-noe.github.io/langues-monsieur-noe/controle/**

Cette page n'est liée nulle part sur le site : les élèves ne la voient pas. Elle relit tous les chapitres et met une pastille à chacun :

- **✔** : tout va bien.
- **⚠** : le site marche, mais il manque quelque chose (un son, une image, un exercice qui n'est pas proposé). Lisez la phrase : elle dit quoi faire.
- **✖** : une erreur empêche le chapitre de s'afficher correctement. La page donne le fichier, le numéro de ligne et la correction.

Les messages les plus fréquents :

- « il manque une colonne » : une ligne n'a pas assez de `|`. Allez à la ligne indiquée et comparez-la aux autres.
- « trouvé audio/Rood.m4a : renomme-le en rood.m4a » : le nom a une majuscule. Supprimez le fichier sur GitHub et déposez-le de nouveau sous le bon nom (ou demandez à Claude).
- « trouvé audio/rood.mp3 : ce format n'est pas accepté » : le son n'est pas en `.m4a`. Demandez à Claude de le convertir.
- « fichier introuvable » : vérifiez les majuscules, les accents, les espaces et l'extension du nom.
- « Texte à trous : il faut au moins 2 propositions fausses » : écrivez de fausses réponses en 5e colonne de la phrase, séparées par des virgules. Ce n'est pas grave si vous ne le faites pas : l'exercice n'est simplement pas proposé.
- « Le fichier … chapitre.txt est introuvable » : le nom du dossier écrit dans `catalogue.txt` n'est pas exactement le même que le vrai dossier.

La page montre aussi, pour chaque chapitre, les **mots secrets** des 7 derniers jours, et le bouton **« Copier pour Quizlet »**.

## 6. Annuler une erreur : revenir à la version précédente

GitHub garde toutes les versions de chaque fichier. Pour remettre une ancienne version :

1. Ouvrez l'historique du fichier. Exemple pour le catalogue :
   https://github.com/monsieur-noe/langues-monsieur-noe/commits/main/contenu/catalogue.txt
   (pour un autre fichier, remplacez la fin de l'adresse par son chemin).
2. La liste montre chaque enregistrement, le plus récent en haut, avec sa date. Repérez celui **d'avant** votre erreur.
3. Sur sa ligne, à droite, cliquez sur l'avant-dernière icône (une feuille avec « < > », nommée « View code at this point ») : le fichier s'affiche tel qu'il était ce jour-là.

   ![L'historique d'un fichier : l'icône « View code at this point »](notice/4-version-precedente.jpg)

4. Au-dessus du texte, à droite, cliquez sur l'icône **« Copy raw file »** (deux petits carrés, à côté de « Raw ») : l'ancienne version est copiée.
5. Ouvrez le fichier actuel en modification (lien de la partie 2), sélectionnez tout le texte (**Ctrl** + **A**), puis collez (**Ctrl** + **V**).
6. **« Commit changes... »**, puis **« Commit changes »**.

Un fichier supprimé par erreur : retrouvez-le de la même façon (étapes 1 à 4), puis recréez-le avec le lien « nouveau fichier » de la partie 4 A.

## 7. Faire une sauvegarde complète

Une fois par trimestre, ou avant un gros changement :

1. Cliquez sur ce lien : https://github.com/monsieur-noe/langues-monsieur-noe/archive/refs/heads/main.zip
2. Un fichier `langues-monsieur-noe-main.zip` se télécharge. Il contient tout le site.
3. Rangez-le chez vous (clé USB ou disque), avec la date dans le nom, par exemple `site-2026-12-20.zip`.

Gardez aussi vos enregistrements d'origine chez vous : ils ne sont pas dans le dépôt.

## 8. Si le site ne s'affiche plus, ou si GitHub change ses conditions

**Le site ne s'affiche plus**

1. Attendez 10 minutes et rechargez : une publication est peut-être en cours.
2. Ouvrez la page de contrôle : une ✖ indique souvent la cause.
3. Vérifiez que la publication est toujours active : https://github.com/monsieur-noe/langues-monsieur-noe/settings/pages
   Vous devez y voir « Your site is live at… », et sous « Branch » : `main` et `/ (root)`. Ne cliquez jamais sur le bouton rouge « Unpublish site » : il retire le site d'internet.

   ![Les réglages de publication : « Your site is live », puis main et / (root)](notice/5-publication.jpg)

4. Si une modification récente a tout cassé, annulez-la (partie 6).
5. Sinon, demandez de l'aide (partie 9).

**Une fois par an (par exemple à la rentrée)**

- Vérifiez que GitHub Pages est toujours gratuit pour un dépôt public : cherchez « GitHub Pages limits » ou demandez à Claude. Le site est très petit, loin des limites.
- Faites une sauvegarde (partie 7).

**Changer d'hébergeur**

Le site est fait pour déménager facilement : c'est un simple dossier de fichiers. Avec la sauvegarde ZIP, un autre hébergeur gratuit de « site statique » (par exemple Cloudflare Pages) peut le publier tel quel, sans rien modifier. Demandez à Claude de vous guider pas à pas.

## 9. Quand demander de l'aide

Vous faites seul : ajouter ou corriger un mot, une phrase, un son, une image, un chapitre ; annuler une erreur ; sauvegarder.

Demandez à Claude (ou à une personne qui code) pour :

- un nouveau type d'exercice, ou un changement de design (couleurs, disposition, boutons) ;
- découper un long enregistrement en un son par mot, ou convertir un son qui n'est pas en `.m4a` ;
- une ✖ que vous ne comprenez pas sur la page de contrôle ;
- un site qui ne s'affiche plus malgré la partie 8 ;
- l'anglais, une nouvelle année (P5, P6), les vidéos YouTube, ou l'avatar.

Quand vous demandez de l'aide, donnez : l'adresse de la page, ce que vous avez fait juste avant, et le message de la page de contrôle.
