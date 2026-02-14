# LTC Group - Mobile App (Flutter)

Application mobile Flutter pour la gestion de cartes virtuelles vCard.

## Phase 1 - Implémentation complète ✅

L'application est maintenant entièrement fonctionnelle avec des données mock.

### Fonctionnalités implémentées

1. **Authentification**
   - Connexion (login)
   - Inscription (register)
   - KYC (placeholder pour Phase 2)
   - Déconnexion

2. **Dashboard**
   - Vue d'ensemble avec balance totale
   - Cartes actives en carousel
   - Transactions récentes
   - Actions rapides (nouvelle carte, recharger, retirer)

3. **Gestion des cartes**
   - Liste de toutes les cartes
   - Détails d'une carte (numéro masqué, CVV, expiration)
   - Achat de nouvelle carte (Visa/Mastercard)
   - Actions: geler, dégeler, bloquer

4. **Transactions**
   - Historique complet
   - Filtrage par carte
   - Recharge de carte (Mobile Money, virement)
   - Retrait de fonds

5. **Profil utilisateur**
   - Informations personnelles
   - Statut KYC
   - Déconnexion

6. **Notifications**
   - Liste des notifications
   - Badges pour non lues

### Structure du projet

```
lib/
├── main.dart                          # Point d'entrée + MaterialApp
├── config/
│   ├── api_config.dart               # Configuration API
│   ├── theme.dart                    # Thème LTC Group
│   └── constants.dart                # Constantes globales
├── models/
│   ├── user.dart                     # Modèle utilisateur
│   ├── card.dart                     # Modèle carte virtuelle
│   └── transaction.dart              # Modèle transaction
├── services/
│   ├── api_service.dart              # Client API avec données mock
│   ├── auth_service.dart             # Service authentification
│   └── storage_service.dart          # Stockage local (SharedPreferences)
├── providers/
│   ├── auth_provider.dart            # État authentification
│   ├── cards_provider.dart           # État cartes
│   └── transactions_provider.dart    # État transactions
├── screens/
│   ├── main_screen.dart              # Navigation principale (BottomNav)
│   ├── auth/                         # Écrans authentification
│   ├── dashboard/                    # Dashboard
│   ├── cards/                        # Gestion cartes
│   ├── transactions/                 # Transactions
│   ├── notifications/                # Notifications
│   └── profile/                      # Profil
└── widgets/
    ├── card_widget.dart              # Widget carte visuelle
    ├── transaction_item.dart         # Item transaction
    ├── custom_button.dart            # Bouton personnalisé
    ├── custom_input.dart             # Input personnalisé
    └── loading_indicator.dart        # Indicateur chargement
```

## Prérequis

- Flutter SDK >= 3.19
- Dart >= 3.3
- Android Studio / Xcode pour émulateurs

## Installation

```bash
cd mobile
flutter pub get
```

## Lancement

### Sur émulateur/simulateur
```bash
flutter run
```

### Sur appareil physique
```bash
flutter devices              # Liste les appareils
flutter run -d <device-id>   # Lance sur l'appareil choisi
```

## Données de test (Phase 1)

### Connexion
- **Email**: n'importe quel email valide
- **Password**: n'importe quel mot de passe

L'application utilise des données mock, donc toute combinaison email/password fonctionne.

### Données préchargées
- **User**: John Doe (demo@ltcgroup.com) - KYC vérifié
- **Cartes**: 2 cartes (Visa 250€, Mastercard 150.75€)
- **Transactions**: 6 transactions variées

## Thème LTC Group

- **Primaire**: #10151E (dark navy)
- **Accent**: #CEA427 (gold)
- **Police**: System default (Roboto/SF Pro)

## Navigation

4 tabs principaux:
1. **Accueil** - Dashboard avec vue d'ensemble
2. **Cartes** - Liste et gestion des cartes
3. **Transactions** - Historique complet
4. **Profil** - Informations utilisateur

## API Backend

**Phase 1**: Toutes les données sont mock (pas de vraie API)

**Phase 2**: L'app sera connectée à l'API FastAPI sur `http://localhost:8000/api/v1`

Les endpoints sont déjà configurés dans `lib/config/api_config.dart` et prêts pour la Phase 2.

## Prochaines étapes (Phase 2)

1. Remplacer les données mock par de vrais appels HTTP dans `api_service.dart`
2. Implémenter le vrai processus KYC avec scan de documents
3. Intégrer les paiements Mobile Money réels
4. Ajouter les notifications push (Firebase)
5. Implémenter les fonctionnalités avancées (historique export, filtres, etc.)

## Tests

```bash
flutter test
```

## Build

### Android APK
```bash
flutter build apk --release
```

### iOS IPA
```bash
flutter build ios --release
```

## Dépendances principales

- `provider` - Gestion d'état
- `http` - Client HTTP
- `shared_preferences` - Stockage local
- `intl` - Formatage dates/montants
- `flutter_svg` - Support SVG

## Support

Pour toute question ou problème, contacter l'équipe technique LTC Group.
