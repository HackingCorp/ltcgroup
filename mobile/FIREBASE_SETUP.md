# Configuration Firebase pour LTC vCard

Ce document explique comment configurer Firebase pour l'application mobile LTC vCard.

## Prérequis

- Flutter SDK installé
- Compte Google/Firebase
- FlutterFire CLI installé

## Installation FlutterFire CLI

```bash
dart pub global activate flutterfire_cli
```

## Étapes de configuration

### 1. Créer un projet Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com)
2. Cliquer sur "Ajouter un projet"
3. Nom du projet: `ltc-vcard`
4. Activer Google Analytics (optionnel)
5. Cliquer sur "Créer le projet"

### 2. Configurer automatiquement avec FlutterFire CLI

Depuis le dossier `mobile/`:

```bash
flutterfire configure --project=ltc-vcard
```

Cette commande va:
- Créer automatiquement les applications iOS et Android dans Firebase
- Générer le fichier `lib/firebase_options.dart` avec la vraie configuration
- Télécharger `google-services.json` pour Android
- Télécharger `GoogleService-Info.plist` pour iOS

### 3. Configuration manuelle (alternative)

Si vous préférez configurer manuellement:

#### Android

1. Dans Firebase Console, ajouter une application Android
2. Package name: `site.ltcgroup.vcard`
3. Télécharger `google-services.json`
4. Placer le fichier dans `mobile/android/app/google-services.json`

#### iOS

1. Dans Firebase Console, ajouter une application iOS
2. Bundle ID: `site.ltcgroup.vcard`
3. Télécharger `GoogleService-Info.plist`
4. Placer le fichier dans `mobile/ios/Runner/GoogleService-Info.plist`

### 4. Activer Firebase Cloud Messaging (FCM)

1. Dans Firebase Console, aller dans "Cloud Messaging"
2. Activer l'API Cloud Messaging
3. Pour iOS: uploader le certificat APNs ou la clé d'authentification APNs

### 5. Vérifier l'installation

Lancer l'application:

```bash
flutter run
```

Si Firebase est correctement configuré, l'application devrait démarrer sans erreur Firebase.

## Structure des fichiers

```
mobile/
├── android/
│   └── app/
│       └── google-services.json       # Configuration Firebase Android
├── ios/
│   └── Runner/
│       └── GoogleService-Info.plist   # Configuration Firebase iOS
└── lib/
    └── firebase_options.dart          # Configuration Flutter générée par FlutterFire CLI
```

## Notes importantes

- Les fichiers de configuration Firebase contiennent des clés API publiques, ce n'est pas un problème de sécurité
- Assurez-vous d'ajouter les règles de sécurité Firebase appropriées dans la console
- Pour la production, configurez des restrictions d'API dans Google Cloud Console

## Dépannage

### Erreur "FirebaseApp not initialized"

Vérifiez que `Firebase.initializeApp()` est appelé dans `main.dart` avant `runApp()`.

### Erreur "Default FirebaseApp is not initialized"

Assurez-ez que `firebase_options.dart` est correctement généré et importé.

### Erreur de build Android

Assurez-vous que `google-services.json` est au bon emplacement et que le plugin Google Services est activé dans `android/app/build.gradle`.

## Support

Pour plus d'informations, consultez:
- [FlutterFire Documentation](https://firebase.flutter.dev)
- [Firebase Console](https://console.firebase.google.com)
