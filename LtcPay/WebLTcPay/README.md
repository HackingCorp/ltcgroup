# WebLTcPay - Merchant Dashboard

Dashboard web pour gérer les paiements et les API keys de la plateforme LtcPay.

## 🚀 Fonctionnalités

### Pages principales
- **Dashboard** (`/dashboard`) - Vue d'ensemble avec statistiques
- **API Keys** (`/api-keys`) - Gestion des clés API (live/test)
- **Payments** (`/payments`) - Liste et gestion des paiements
- **Create Payment** (`/payments/new`) - Créer un nouveau paiement avec QR code
- **Profile** (`/profile`) - Configuration profil et webhooks
- **Documentation** (`/docs`) - Guide d'intégration API

### Pages d'authentification
- **Login** (`/auth/login`)
- **Register** (`/auth/register`)
- **Forgot Password** (`/auth/forgot-password`)

## 📦 Stack technique

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **QR Code**: qrcode.react
- **Charts**: Recharts
- **Notifications**: React Hot Toast

## 🛠️ Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local

# Modifier .env.local
NEXT_PUBLIC_API_URL=http://localhost:8001
```

## 🏃 Démarrage

### Mode développement
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

### Mode production
```bash
npm run build
npm start
```

## 🔧 Configuration

### Variables d'environnement

```env
# API Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8001

# Optionnel
NODE_ENV=development
```

## 📁 Structure du projet

```
WebLTcPay/
├── app/
│   ├── (dashboard)/           # Routes protégées
│   │   ├── api-keys/
│   │   ├── payments/
│   │   │   └── new/
│   │   ├── profile/
│   │   └── docs/
│   ├── auth/                  # Pages d'authentification
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── dashboard/             # Dashboard principal
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                    # Composants UI réutilisables
│   ├── layout/                # Layout components
│   ├── dashboard/
│   ├── forms/
│   └── payments/
├── lib/
│   ├── api.ts                 # Client API HTTP
│   └── utils.ts
├── services/
│   ├── auth.service.ts
│   ├── dashboard.service.ts
│   └── payments.service.ts
├── types/
│   └── index.ts               # TypeScript types
├── hooks/
│   └── useAuth.ts
└── public/
```

## 🎨 Thème

Le dashboard utilise la palette de couleurs LTC :
- **Gold**: #D4AF37
- **Navy**: #001f3f, #002855
- **Accents**: Blue, Green, Red (status colors)

## 🔐 Authentification

Le dashboard utilise l'API LtcPay pour l'authentification :

1. **Register** : Créer un compte marchand
2. **Login** : Obtenir un access token
3. **Protected Routes** : Middleware Next.js vérifie l'authentification

## 📡 Intégration API

Toutes les requêtes API utilisent les services dans `/services/` :

```typescript
// Exemple: Créer un paiement
import { paymentsService } from '@/services/payments.service';

const payment = await paymentsService.create({
  amount: 10000,
  customer_info: {
    email: 'customer@example.com',
    name: 'John Doe'
  },
  merchant_reference: 'ORDER-123'
});
```

## 🧪 Tests

```bash
# Lancer les tests (à implémenter)
npm test
```

## 🚢 Déploiement

### Docker

```bash
# Build l'image
docker build -t webltcpay .

# Run le container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://backend:8001 \
  webltcpay
```

### Vercel/Netlify

1. Connecter le repo GitHub
2. Configurer les variables d'environnement
3. Déployer automatiquement

## 📝 TODO

- [ ] Connecter aux vraies APIs du backend LtcPay
- [ ] Implémenter l'authentification complète (JWT)
- [ ] Ajouter les tests unitaires et e2e
- [ ] Implémenter le refresh token
- [ ] Ajouter la pagination côté serveur
- [ ] Implémenter les filtres avancés
- [ ] Ajouter les graphiques temps réel
- [ ] Implémenter l'export PDF
- [ ] Ajouter le mode sombre
- [ ] Implémenter les notifications push

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT

## 🆘 Support

Pour toute question ou problème :
- Email: support@ltcgroup.net
- Documentation API: http://localhost:8001/docs
