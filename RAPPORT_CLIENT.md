# Rapport client — IGC CTF « The Insider Threat »

**Projet :** expérience CTF jouable dans le navigateur, sur un bureau macOS simulé
**Livrable :** application Next.js 14 (App Router) + assets de preuve privés + documentation d'exploitation
**Date du rapport :** 18 novembre 2026
**Statut :** livré et fonctionnel en environnement de développement ; prêt pour mise en production après les actions listées en §10

---

## 1. Résumé exécutif

L'expérience **IGC — The Insider Threat** est une enquête numérique en 8 étapes : le joueur
se connecte à un faux poste macOS, explore un système de fichiers simulé (Finder, Terminal,
Photos, Notes, Safari…), déchiffre des archives, interroge un coffre-fort de mots de passe,
retrouve une photo de preuve, identifie un membre du club puis présente la preuve au
président pour obtenir le code final.

Les points structurants de la livraison :

- **Aucune réponse ne se trouve dans le code client.** Toutes les validations passent par
  `POST /api/ctf/verify` et les réponses vivent uniquement dans les variables d'environnement
  du serveur.
- **Les images de preuve ne sont jamais publiques.** Elles sont stockées hors de `public/`
  (`private-assets/`) et servies uniquement par une route protégée par un jeton à usage unique.
- **Progression persistante et cohérente** (étapes monotones, reprise après F5, remise à zéro
  par raccourci clavier).
- **Parcours de fin complet** : révélation de la photo nette, fenêtre « Final Access »,
  écran de victoire « MISSION COMPLETE ».

---

## 2. Objectif et périmètre

### Objectif
Faire vivre aux participants une enquête interne scénarisée (fuite de données au sein du club
IGC) avec une difficulté progressive, un sentiment d'exploration d'un vrai poste de travail, et
une validation d'énigmes fiable côté serveur.

### Inclus dans la livraison
- Bureau macOS simulé : barre de menus, dock, fenêtres déplaçables/redimensionnables, fond d'écran.
- Applications : Finder, Terminal, Photos, Notes, Safari, Réglages, Arcade.
- Système de fichiers virtuel (VFS) persistant avec dossiers cachés, fichiers verrouillés et
  visibilité conditionnée par l'étape.
- Les 8 étapes du scénario, avec popups narratives du « hacker ».
- Écran de révélation de la photo et fenêtre finale « Final Access ».
- Documentation d'exploitation (`CTF_README.md`) et rapport de recette.

### Hors périmètre (non livré)
- Comptes joueurs, classement, tableau de bord d'administration.
- Base de données : la progression est stockée dans le navigateur du joueur.
- Tests automatisés (unitaires / E2E) : la recette est manuelle et documentée.
- Déploiement : aucune mise en production n'a été effectuée.

---

## 3. Expérience joueur — les 8 étapes

| Étape | Déclencheur | Ce que le joueur découvre |
|---|---|---|
| 1 | Mot de passe de session (année de fondation d'IGC) | Déverrouillage du bureau |
| 2 | Connexion réussie | Bureau, `Documents/`, `instagram_account.txt`, `classified_file.txt` verrouillé |
| 3 | Mot de passe de `classified_file.txt` | Dossier `Classified/` (barre latérale + Finder), premier message du hacker |
| 4 | Donnée de `confidential_data.txt` | Application **Password Vault** (ouverture automatique + icône Dock) |
| 5 | Coffre : date + heure + salle | `Logs/last_activity.log` |
| 6 | Lecture du journal | Dossier caché `.evidence/` (visible avec `ls -a` ou Ctrl/Cmd + Maj + .) |
| 7 | Nom du membre identifié sur la photo | Révélation de la photo nette + fenêtre **Final Access** |
| 8 | Code final du président | Écran plein écran **MISSION COMPLETE**, victoire persistée |

Détails d'usage notables :
- **Terminal** : `ls` masque les fichiers cachés, `ls -a` / `ls -la` les révèlent, `cd` fonctionne,
  `cat` / `open` / `unlock` gèrent les fichiers protégés.
- **Finder** : double-clic sur un fichier verrouillé ouvre la modale de mot de passe ; bascule
  d'affichage des fichiers cachés.
- **Réinitialisation** : `Ctrl + Alt + R` (ou `Ctrl + Maj + R`) → confirmation → retour à l'écran
  de connexion, VFS réinitialisé, victoire effacée, images en cache purgées.
- **Fin de partie** : après la révélation, la fenêtre Final Access est rouvrable depuis le Dock
  tant que la partie n'est pas gagnée : le joueur ne peut pas se bloquer en fermant une fenêtre.

---

## 4. Architecture technique

### Stack
| Couche | Technologie |
|---|---|
| Framework | Next.js 14.2.3 (App Router), React 18 |
| État applicatif | Zustand 4 avec persistance `localStorage` |
| Style / animation | Tailwind CSS 3, framer-motion 11 |
| Fenêtres | react-rnd (déplacement / redimensionnement) |
| Icônes | lucide-react |
| Stockage images | IndexedDB (`igc-evidence` / `images`) + cache mémoire |

### Découpage du code
```
src/app/                     page unique + 3 routes API (verify, proof, evidence)
src/components/system/       Desktop, Window, MenuBar, BootSequence, ResetModal
src/components/apps/         Finder, Terminal, Photos, Notes, Safari, Settings, Arcade
src/components/ctf/          PasswordModal, PasswordVault, HackerPopup,
                             RevealScreen, FinalAccess, VictoryScreen
src/components/Dock/         Dock, DockIcon, tooltip, proximité souris
src/lib/                     logique CTF serveur et client (preuves, jetons, rate limit…)
src/stores/                  ctfStore (progression), fileSystemStore (VFS), windowStore
private-assets/              photos de preuve, jamais servies en statique
```

### Routes serveur
| Route | Rôle |
|---|---|
| `POST /api/ctf/verify` | Valide toutes les énigmes ; seule source de vérité |
| `POST /api/ctf/proof` | Échange une preuve signée contre un nouveau jeton de téléchargement |
| `GET /api/ctf/evidence/[id]` | Sert une image de preuve contre un jeton à usage unique |

### Parcours de la photo de preuve (étape 7)
1. Le nom du membre est validé côté serveur ; la réponse contient un **jeton à usage unique**
   et une **preuve signée (HMAC)**.
2. La photo nette est téléchargée une seule fois, puis **écrite dans IndexedDB avant d'être
   affichée** : un rafraîchissement ne nécessite plus le jeton.
3. Si l'image a disparu du navigateur et que le jeton est consommé, la preuve permet d'en
   obtenir un nouveau via `/api/ctf/proof` (pas de blocage).
4. L'écran de révélation est affiché dans un portail React, hors des fenêtres déplaçables, pour
   éviter tout rognage ; il se ferme sur « Continue » et rouvre la fenêtre Final Access.

### Persistance
| Donnée | Support | Version |
|---|---|---|
| Progression CTF (étape, victoire, preuves, jetons) | `localStorage` (`ctf-storage`) | 7 |
| Système de fichiers virtuel | `localStorage` (`macos-filesystem-storage`) | 6 |
| Session déverrouillée (survit au F5, pas à la fermeture de l'onglet) | `sessionStorage` | — |
| Images de preuve | IndexedDB | — |

Les migrations sont prévues : une sauvegarde existante récupère automatiquement les nouveaux
contenus canoniques sans perdre les fichiers créés par le joueur.

---

## 5. Sécurité

| Mesure | Mise en œuvre |
|---|---|
| Réponses hors du client | Toutes les valeurs attendues sont lues via `process.env` côté serveur |
| Comparaison sûre | Normalisation (minuscules, sans accents, espaces réduits) puis comparaison à temps constant sur empreintes SHA-256 |
| Limitation de débit | 10 tentatives/min derrière proxy, 30/min en local ; purge automatique des compteurs |
| Anti-bruteforce ciblé | Palier spécifique sur l'identification du membre (30 s → 600 s après échecs répétés) |
| Jetons de preuve | HMAC-SHA256, portée figée côté serveur, expiration 24 h, aucun secret dans le client |
| Jetons de téléchargement | Usage unique, durée courte, liés à un identifiant d'image précis |
| Images non publiques | Stockées dans `private-assets/` (hors `public/`), servies uniquement par la route protégée ; identifiant validé (chiffres uniquement, pas de traversée de chemin) |
| Exposition du bundle | Vérifié : aucune réponse, aucun hash, aucune image de preuve dans `.next/static` |
| Indexation | `robots: { index: false }` |
| Secrets | `.env*` ignoré par Git, seul `.env.local.example` est suivi |
| Gating du flag final | Le code final exige une preuve valide : un joueur à l'étape 6 reçoit `403` |

---

## 6. Configuration et exploitation

### Variables d'environnement
| Variable | Usage |
|---|---|
| `CTF_LOGIN` | Mot de passe du lockscreen (étape 1) |
| `CTF_CLASSIFIED` | Mot de passe de `classified_file.txt` |
| `CTF_CONFIDENTIAL` | Donnée de `confidential_data.txt` |
| `CTF_DATE`, `CTF_TIME`, `CTF_LOCATION` | Champs du coffre (salle : variantes séparées par une barre verticale) |
| `CTF_MEMBER_NAME` | Nom(s) accepté(s) pour la photo, séparés par des virgules |
| `CTF_FINAL` | Code final du président |
| `CTF_PROOF_SECRET` | Clé HMAC des preuves (repli : `CTF_TECH_ASSISTANT`) |
| `CTF_TECH_ASSISTANT` | Ancienne réponse, conservée comme repli de secret |
| `TRUST_PROXY` | `1` uniquement derrière un reverse proxy de confiance |

### Procédure de mise en route
```bash
pnpm install
cp .env.local.example .env.local     # renseigner toutes les valeurs
pnpm dev                             # développement
pnpm build && pnpm start             # production
```

### Contraintes d'hébergement
- Le serveur doit être **Node.js** (pas d'export statique) : la route des preuves lit
  `private-assets/` sur le disque.
- Le dossier `private-assets/` doit être présent sur le serveur et **non exposé** en statique.
- Les variables d'environnement doivent être fournies par le coffre de secrets de l'hébergeur.
- Le rate limiting est en mémoire : il est exact sur une instance unique ; pour plusieurs
  instances, prévoir un stockage partagé (Redis).

---

## 7. Contenus et personnalisation

| Contenu | Emplacement | Comment le modifier |
|---|---|---|
| Photo de l'équipe technique (indice) | `private-assets/evidence_01.jpg` | Remplacer le fichier (sans métadonnées EXIF) |
| Photo nette (preuve finale) | `private-assets/evidence_03.png` | Remplacer le fichier |
| Compte Instagram affiché | `src/stores/fileSystemStore.ts` (`instagram_account.txt`) | Lien actuel : `https://www.instagram.com/isitcomgoogleclub2/` |
| Contact de l'opérateur | `src/stores/fileSystemStore.ts` (`mail.txt`) | Adresse actuelle : `stcmgglclbhr@gmail.com` |
| Textes du scénario, indices | `src/lib/ctf-content.ts` | Chaînes centralisées |
| Réponses des énigmes | `.env.local` | Jamais dans le code, jamais commitées |

Le dossier `Classified/` contient désormais `mail.txt` (contact de l'opérateur par e-mail) et
`confidential_data.txt` (verrouillé). Les sauvegardes existantes sont migrées automatiquement
(version VFS 6).

---

## 8. Validation et tests effectués

| Vérification | Résultat |
|---|---|
| `npx tsc --noEmit` | **OK** (exit 0) |
| `pnpm build` | **OK** (exit 0) — exécuté avant les dernières modifications de contenu (données seules) |
| Démarrage et réponse HTTP de l'application | **OK** |
| Connexion (étape 1) via l'API | **OK** |
| Accès à une preuve sans jeton | **Refusé (403)** comme attendu |
| Preuve de déverrouillage falsifiée | **Refusée** comme attendu |
| Code final sans preuve valide | **Refusé (403)** comme attendu |
| Code final avec preuve valide | **Accepté** ; victoire enregistrée |
| Parcours UI étape 7 → 8 | **OK** : révélation → Continue → Final Access → victoire (clic et touche Entrée) |
| Recherche de fuites dans `.next/static` | **OK** : aucune réponse, aucune image |
| Migration VFS 5 → 6 après F5 | **OK** : `mail.txt` présent, `phone_number.txt` absent, liens à jour |

### Ce qui n'a pas été testé
- Le parcours complet 1 → 8 en une seule session manuelle, du lockscreen à la victoire.
- Les tests sur navigateurs autres que Chromium.
- Le comportement derrière un vrai reverse proxy (en-têtes `X-Forwarded-For`).
- La charge (plusieurs dizaines de joueurs simultanés).

---

## 9. Documentation livrée

| Document | Contenu |
|---|---|
| `CTF_README.md` | Scénario, variables, sécurité, procédure de recette, checklist de régression |
| `private-assets/README.md` | Nommage et contraintes des images de preuve |
| `RAPPORT_CLIENT.md` | Le présent rapport |
| `.env.local.example` | Gabarit de configuration sans valeur réelle |

---

## 10. Points d'attention et limites connues

1. **Dépendances obsolètes (priorité haute).** `pnpm audit` remonte **48 avis**, dont
   **4 critiques** et **20 élevés**, liés notamment à `next@14.2.3`. Une montée de version
   Next.js (14.2.x récent ou 15) est recommandée avant exposition publique, avec une passe de
   recette sur les routes API et le rendu.
2. **Secret des preuves non dédié.** `CTF_PROOF_SECRET` est vide : le serveur retombe sur
   `CTF_TECH_ASSISTANT`. Fonctionnel, mais il faut une clé dédiée pour pouvoir changer les
   réponses sans invalider les preuves en cours.
3. **Rate limiting en mémoire.** Suffisant pour une instance ; à remplacer par un stockage
   partagé en cas de scale-out.
4. **Pas de tests automatisés.** La recette est manuelle (checklist du `CTF_README.md`) ; une
   suite minimale sur `/api/ctf/verify` sécuriserait les évolutions.
5. **Métadonnées à finaliser.** `src/app/layout.tsx` conserve une description générique
   (« A functional macOS Sequoia desktop environment ») et `package.json` garde le nom
   `portfolio-three`.
6. **Contenu de démonstration.** Les photos de preuve et certaines données (numéros, adresses)
   sont des contenus de travail : vérifier les droits d'utilisation avant diffusion.
7. **Accessibilité.** Interface très visuelle (drag & drop, raccourcis clavier) : prévoir un
   mot d'accompagnement pour les joueurs, notamment sur la révélation de fichiers cachés.

---

## 11. Recommandations et prochaines étapes

| Priorité | Action |
|---|---|
| 1 | Mettre à jour Next.js et repasser `pnpm build` + recette API |
| 2 | Définir un `CTF_PROOF_SECRET` dédié et des réponses définitives |
| 3 | Ajouter une suite de tests sur `/api/ctf/verify` (bons/mauvais cas, rate limit, 403) |
| 4 | Finaliser les métadonnées (`layout.tsx`, `package.json`) |
| 5 | Choisir l'hébergement Node.js, monter `private-assets/` et les secrets |
| 6 | Faire une session de recette complète 1 → 8 sur le navigateur cible |
| 7 | Prévoir la supervision (journaux serveur) et une procédure de changement des réponses |

---

## 12. Annexes

### Commandes utiles
```bash
pnpm dev                 # serveur de développement
pnpm build               # build de production
pnpm start               # serveur de production
npx tsc --noEmit         # vérification des types
pnpm generate:evidence   # régénère des images de test dans private-assets/placeholders
```

### Checklist de recette (extrait)
- [ ] Réinitialisation complète : écran de connexion, VFS vide, victoire effacée.
- [ ] Étape 3 : le contenu de `classified_file.txt` n'apparaît qu'après le bon mot de passe.
- [ ] Étape 4 : `confidential_data.txt` verrouillé sur toutes les surfaces.
- [ ] Étape 6 : `.evidence` invisible sans `ls -a`, visible avec.
- [ ] Étape 7 : la photo nette s'affiche, se télécharge, et reste disponible après F5.
- [ ] Étape 8 : mauvais code → refus ; bon code → « MISSION COMPLETE » persisté.
- [ ] Aucune réponse ni image dans `.next/static` après build.
