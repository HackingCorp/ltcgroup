# LTC Group - Mobile App (Flutter)

Application mobile Flutter pour la gestion de cartes virtuelles vCard.

## Modules prévus

1. **Inscription / KYC** - Scan ID + vérification liveness
2. **Achat de cartes** - Visa / Mastercard virtuelles
3. **Dashboard** - Gestion des cartes (soldes, gel, blocage)
4. **Recharge / Retrait** - Via Mobile Money ou virement
5. **Notifications push** - Alertes transactions en temps réel

## Prérequis

- Flutter SDK >= 3.19
- Dart >= 3.3
- Android Studio / Xcode

## Setup

```bash
cd mobile
flutter pub get
flutter run
```

## API Backend

L'app consomme l'API FastAPI sur `http://localhost:8000/api/v1`.
