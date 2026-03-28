# 🛍️ NEXORA – Plateforme de E-commerce Intelligent

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

---

## 📌 Description du projet

**NEXORA** est une plateforme de e-commerce intelligente qui combine des recommandations hybrides, le tracking avant connexion, un panier persistant et l'intégration de l'intelligence artificielle pour offrir une expérience d'achat moderne et personnalisée.

L'application s'adresse à trois types d'utilisateurs : les **visiteurs** qui naviguent librement, les **acheteurs** qui passent commande, et les **vendeurs** qui gèrent leurs produits — le tout supervisé par un **administrateur**.

🌐 **Site déployé** : [https://nexora-dusky-eight.vercel.app](https://nexora-dusky-eight.vercel.app)  
📁 **Repository GitHub** : [https://github.com/abdinasserrob-source/NEXORA](https://github.com/abdinasserrob-source/NEXORA)

---

## 🎯 Objectifs

- Offrir une expérience d'achat fluide, moderne et personnalisée pour visiteurs, acheteurs et vendeurs
- Intégrer l'intelligence artificielle (GPT-4o-mini) pour des recommandations de produits pertinentes
- Mettre en place un système de paiement sécurisé avec Stripe
- Permettre aux vendeurs de gérer leurs boutiques et produits en autonomie
- Assurer la persistance du panier même avant la connexion de l'utilisateur
- Déployer une application production-ready sur Vercel avec CI/CD automatique

---

## 👥 Présentation de l'équipe

| Rôle | Responsable | Responsabilités principales |
|---|---|---|
| **Chef de projet** | Abdinasser Robleh Abdillahi | Planification, suivi de l'avancement, gestion des risques |
| **Analyste** | Ensemble de l'équipe | Collecte et analyse des besoins |
| **Architecte logiciel** | Abdichakour Ahmed Mohamed | Conception de l'architecture et choix technologiques |
| **Développeur Full-Stack** | Abdinasser / Abdichakour | Développement frontend, backend et base de données |
| **Testeur** | Abdinasser / Abdichakour | Test et validation du système |
| **Rédacteur** | Aicha Rihan Ali / Abass Moussa Djibril | Documentation technique et rédaction du rapport |
| **Encadreur pédagogique** | Dr. Moubarek Barre | Supervision, orientation et validation des étapes |

---

## ⚙️ Technologies utilisées

### Langages
- **TypeScript / JavaScript** — langage principal
- **HTML / CSS** via Tailwind CSS

### Frameworks & Bibliothèques

| Technologie | Usage |
|---|---|
| **Next.js 14** (App Router) | Framework principal fullstack |
| **Tailwind CSS** | Styles et design responsive |
| **Prisma** | ORM pour PostgreSQL |
| **PrismaPg** | Driver PostgreSQL natif |
| **NextAuth / JWT** | Authentification sécurisée |
| **Chart.js** | Graphiques du tableau de bord admin |
| **OpenAI API (gpt-4o-mini)** | Recommandations intelligentes par IA |
| **Stripe** | Paiements en ligne sécurisés |
| **Nodemailer** | Envoi d'emails SMTP |

### Base de données
- **PostgreSQL** hébergé sur `db.prisma.io`
- 13 migrations Prisma : `init_postgresql`, `seller_refactor`, `user_wallet`, `reco_algo_config`, `return_requests_v2`, etc.

### Outils de développement

| Outil | Usage |
|---|---|
| **Cursor / VS Code** | Éditeur de code |
| **Git / GitHub** | Versioning et collaboration |
| **Vercel** | Déploiement continu (CI/CD) |
| **draw.io / StarUML** | Modélisation et diagrammes UML |
| **Docker Compose** | Environnement de développement local |

---

## 🚀 Fonctionnalités

### 👁️ Côté Visiteur (non connecté)
- Navigation libre sur la boutique et les catégories
- Consultation des produits et fiches détaillées
- Ajout au panier (persistant même sans compte)
- Accès à la page FAQ et aux promotions
- Recherche de produits en temps réel

### 🛒 Côté Client (Acheteur connecté)
- Toutes les fonctionnalités visiteur +
- Connexion via Google OAuth ou email/mot de passe
- Panier persistant synchronisé après connexion
- Paiement sécurisé via Stripe
- Suivi de commandes en temps réel
- Gestion du compte et de l'adresse
- Recommandations personnalisées par IA (GPT-4o-mini)
- Confirmation de commande par email (Nodemailer)
- Système de portefeuille utilisateur (wallet)

### 🏪 Côté Vendeur
- Espace vendeur dédié
- Gestion de ses produits (ajout, modification, suppression)
- Suivi des commandes reçues
- Statistiques de vente
- Gestion des promotions

### 🛠️ Côté Administrateur
- Tableau de bord complet avec graphiques (Chart.js)
- Gestion de tous les produits et catégories
- Gestion des utilisateurs et vendeurs
- Suivi et gestion de toutes les commandes
- Configuration de l'algorithme de recommandation
- Gestion des zones de livraison et prix
- Gestion des demandes de retour

---

## 🗂️ Structure du projet

```
NEXORA/
├── docs/                          # Documentation du projet
├── prisma/
│   ├── migrations/                # Historique des migrations BDD (13 migrations)
│   ├── schema.prisma              # Schéma de la base de données
│   ├── seed.ts                    # Données initiales
│   └── dev                        # Base de données locale dev
├── public/                        # Assets statiques (images, icônes)
├── scripts/                       # Scripts utilitaires
├── src/
│   ├── app/                       # App Router Next.js 14
│   │   ├── admin/                 # Espace administrateur
│   │   ├── api/                   # Routes API REST
│   │   ├── boutique/              # Page boutique
│   │   ├── categories/            # Pages catégories
│   │   ├── commande/              # Pages commande
│   │   ├── compte/                # Espace compte utilisateur
│   │   ├── connexion/             # Page connexion
│   │   ├── inscription/           # Page inscription
│   │   ├── panier/                # Page panier
│   │   ├── produit/               # Fiches produits
│   │   ├── promos/                # Pages promotions
│   │   ├── recherche/             # Recherche produits
│   │   ├── suivi/                 # Suivi de commandes
│   │   ├── faq/                   # Page FAQ
│   │   └── mot-de-passe-oublie/   # Réinitialisation mot de passe
│   ├── components/                # Composants React réutilisables
│   ├── generated/                 # Fichiers générés automatiquement
│   ├── i18n/                      # Internationalisation
│   └── lib/                       # Utilitaires et configuration
├── .env.example                   # Exemple de variables d'environnement
├── docker-compose.yml             # Configuration Docker
├── next.config.ts                 # Configuration Next.js
├── prisma.config.ts               # Configuration Prisma
├── tailwind.config.ts             # Configuration Tailwind
└── package.json
```

---

## 🧪 Tests réalisés

| Type de test | Description | Résultat |
|---|---|---|
| Authentification Google | Connexion OAuth avec Google | ✅ Fonctionnel |
| Authentification Email | Connexion par email/mot de passe | ✅ Fonctionnel |
| Panier persistant | Persistance avant/après connexion | ✅ Fonctionnel |
| Paiement Stripe | Passage de commande en mode test | ✅ Fonctionnel |
| Recommandations IA | Suggestions via GPT-4o-mini | ✅ Fonctionnel |
| Envoi d'email | Confirmation de commande SMTP | ✅ Fonctionnel |
| Espace vendeur | Gestion produits côté vendeur | ✅ Fonctionnel |
| Tableau de bord admin | Gestion produits, commandes, utilisateurs | ✅ Fonctionnel |
| Migrations BDD | 13 migrations Prisma appliquées | ✅ Fonctionnel |
| Déploiement Vercel | Build et déploiement production | ✅ Fonctionnel |
| Responsive design | Affichage mobile et desktop | ✅ Fonctionnel |

> 📸 Des captures d'écran des tests sont disponibles dans le dossier [`/docs`](./docs)

---

## 🚀 Lancer le projet en local

### Prérequis
- Node.js 18+
- PostgreSQL ou compte db.prisma.io
- Compte Google Cloud (OAuth)
- Compte Stripe
- Clé API OpenAI

### Installation

```bash
# 1. Cloner le repository
git clone https://github.com/abdinasserrob-source/NEXORA.git
cd NEXORA

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Remplir les valeurs dans .env

# 4. Initialiser la base de données
npx prisma migrate dev
npx prisma db seed

# 5. Lancer le serveur de développement
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) dans le navigateur.

### Variables d'environnement requises

Copie `.env.example` en `.env` et remplis les valeurs :

```properties
# Base PostgreSQL (créez la base puis : npx prisma migrate deploy && npm run db:seed)
DATABASE_URL="postgres://USER:PASSWORD@db.prisma.io:5432/postgres?sslmode=require"

OPENAI_API_KEY="sk-proj-..."
OPENAI_CHAT_MODEL="gpt-4o-mini"

JWT_SECRET="votre-secret-min-32-caracteres"

GOOGLE_CLIENT_ID="votre-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="votre-google-client-secret"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="votre-google-client-id.apps.googleusercontent.com"

NEXT_PUBLIC_APP_URL="http://localhost:3000"

STRIPE_SECRET_KEY="sk_test_..."

ADMIN_EMAIL="votre-email-admin@gmail.com"
ADMIN_PASSWORD="votre-mot-de-passe-admin"

# E-mails (codes OTP) — Gmail : créer un mot de passe d'application
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="votre-email@gmail.com"
SMTP_PASS="votre-mot-de-passe-application-google-16-caracteres"
SMTP_FROM="NEXORA <votre-email@gmail.com>"
```

---

## 📄 Licence

Ce projet est réalisé dans le cadre d'un projet académique.  
Tous droits réservés © 2026 – Équipe NEXORA.

---

## 🙏 Remerciements

Nous tenons à remercier chaleureusement :

- **Dr. Moubarek Barre** pour son encadrement, ses conseils bienveillants et sa disponibilité tout au long de ce projet
- L'ensemble du corps enseignant pour la qualité de la formation dispensée
- La communauté open-source pour les outils et bibliothèques utilisés (Next.js, Prisma, Tailwind CSS, OpenAI, Stripe, etc.)
- Nos familles pour leur soutien constant

---

<p align="center">
  Fait avec ❤️ par l'équipe NEXORA — 2026
</p>
