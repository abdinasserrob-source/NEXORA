# 2. Configuration du serveur

Certaines variables d’environnement doivent être définies sur le serveur cible **avant** le déploiement. Elles ne sont pas versionnées dans Git (fichier `.env` local uniquement). Les **exemples de valeur** ci-dessous sont ceux documentés dans `.env.example` du projet Nexora.

| Variable | Rôle | Exemple de valeur |
|----------|------|-------------------|
| `DATABASE_URL` | URL de connexion PostgreSQL (Prisma) | `postgresql://USER:PASSWORD@localhost:5432/nexora?schema=public` |
| `JWT_SECRET` | Clé secrète pour signer les jetons JWT (session) | `changez-moi-au-moins-32-caracteres-aleatoires` |
| `NEXT_PUBLIC_APP_URL` | URL publique de l’application (liens, emails vendeur, etc.) | `http://localhost:3000` (prod : `https://votre-projet.vercel.app`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ID client OAuth Google (navigateur — bouton Google) | `123456789-xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_ID` | ID client OAuth Google (serveur — vérification du token) | `123456789-xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Secret client Google Cloud (OAuth) | `GOCSPX-votre_secret_google_cloud` |
| `ADMIN_EMAIL` | Email du compte administrateur créé par le seed Prisma | `admin@nexora.com` |
| `ADMIN_PASSWORD` | Mot de passe admin initial (seed) | `votre_mot_de_passe_securise` |
| `SMTP_HOST` | Hôte du serveur mail (Nodemailer) | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP | `587` |
| `SMTP_SECURE` | TLS explicite (`true` / `false`) | `false` |
| `SMTP_USER` | Compte d’envoi | `votre.email@gmail.com` |
| `SMTP_PASS` | Mot de passe (ex. mot de passe d’application Gmail) | `mot_de_passe_application_ou_vide` |
| `SMTP_FROM` | En-tête « From » des emails | `NEXORA <votre.email@gmail.com>` |
| `OPENAI_API_KEY` | Clé API OpenAI (chat NEXORA+, recherche par image) | `sk-...` (voir `.env.example`) |
| `OPENAI_CHAT_MODEL` | Modèle de chat (défaut dans le code : `gpt-4o-mini`) | `gpt-4o-mini` |
| `OPENAI_VISION_MODEL` | Modèle vision pour la recherche image | `gpt-4o-mini` |
| `RECO_CRON_SECRET` | Secret pour sécuriser l’appel cron des notifications reco | `chaine_aleatoire_longue` |
| `NEXT_PUBLIC_HERO_IMAGE` | Image hero accueil (optionnel) | URL Unsplash ou autre (voir `.env.example`) |
| `NEXT_PUBLIC_HERO_IMAGE_2` | Deuxième bannière accueil (optionnel) | `https://...` |
| `NEXT_PUBLIC_HERO_IMAGE_3` | Troisième bannière accueil (optionnel) | `https://...` |

**Paiement Stripe :** le dépôt inclut la bibliothèque Stripe, mais le parcours de commande actuel **simule** le paiement — aucune variable `STRIPE_*` n’est lue dans le code pour l’instant. Lorsque le paiement réel sera branché, il faudra ajouter sur le serveur (et documenter) par exemple `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET`, puis les utiliser dans l’API.

**Note :** remplacer systématiquement les exemples par vos vraies valeurs sur Vercel (ou autre hébergeur) ; ne pas commiter le fichier `.env`.
