# LTC GROUP - Monorepo

**Connecting Africa to the World**

Plateforme digitale multi-services : solutions financières (vCard), logistique, hébergement web, immobilier.

## Architecture

```
ltcgroup/
├── web/          # Site Next.js (React 19 + Tailwind 4)
├── backend/      # API FastAPI (Python 3.12)
├── mobile/       # App Flutter (Dart 3.3)
├── db/           # Migrations PostgreSQL
└── docker-compose.yml
```

## Quick Start

### 1. Lancer l'infrastructure (PostgreSQL + Redis + pgAdmin)

```bash
cp .env.example .env
docker compose up -d
```

- **PostgreSQL** : `localhost:5432`
- **Redis** : `localhost:6379`
- **pgAdmin** : `http://localhost:5050`
- **Backend API** : `http://localhost:8000`

### 2. Lancer le site web (Next.js)

```bash
cd web
npm install
npm run dev
```

Le site est accessible sur `http://localhost:3000`.

### 3. Backend API (FastAPI)

Le backend démarre automatiquement via Docker. Health check :

```bash
curl http://localhost:8000/health
```

## Services

| Service | Description | Stack |
|---------|-------------|-------|
| **Web** | Site vitrine + formulaires commandes | Next.js 16, React 19, Tailwind 4 |
| **Backend** | API Gateway vCard + paiements | FastAPI, SQLAlchemy, asyncpg |
| **Mobile** | App gestion cartes virtuelles | Flutter 3.19, Dart 3.3 |
| **DB** | Base de données | PostgreSQL 16 |
| **Cache** | Sessions & cache | Redis 7 |

## Paiements intégrés

- **S3P / Smobilpay** : Mobile Money (MTN, Orange Money)
- **E-nkap** : Multi-canal (cartes, mobile money)

## Équipe

LTC GROUP SARL - [ltcgroup.site](https://ltcgroup.site)
