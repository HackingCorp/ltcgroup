# Audit de Securite - Application Mobile Flutter (Kash Pay)

**Date**: 2026-03-08
**Auditeur**: security-expert-mobile
**Perimetre**: Application mobile Flutter (iOS/Android) - Kash Pay
**Version auditee**: 0.1.0

---

## Resume executif

L'application mobile Kash Pay presente **plusieurs vulnerabilites de securite critiques et hautes** qui necessitent une correction immediate avant toute mise en production. Les principaux risques identifies concernent la desactivation de la validation SSL en iOS (production incluse), l'absence totale de protection contre le reverse engineering, l'absence de certificate pinning, et des faiblesses dans la gestion des ecrans sensibles.

### Score de securite global: 4/10

### Repartition des vulnerabilites

| Criticite | Nombre |
|-----------|--------|
| Critical  | 3      |
| High      | 5      |
| Medium    | 5      |
| Low       | 4      |

---

## Vulnerabilites identifiees

---

### VULN-M01: NSAllowsArbitraryLoads active en production (iOS ATS desactive)

**Criticite**: CRITICAL
**OWASP Mobile**: M3 - Insecure Communication
**Fichier**: `mobile/ios/Runner/Info.plist:32-37`

**Description**:
Le fichier `Info.plist` desactive completement App Transport Security (ATS) pour iOS:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
    <key>NSAllowsLocalNetworking</key>
    <true/>
</dict>
```

Cette configuration autorise **toutes les connexions HTTP non chiffrees** et **desactive la validation des certificats TLS** pour l'ensemble de l'application en production. Cela expose les utilisateurs a des attaques Man-in-the-Middle (MitM) sur tout reseau non fiable (Wi-Fi public, hotspot compromis).

**Impact**: Un attaquant sur le meme reseau peut intercepter toutes les communications incluant les tokens d'authentification, les numeros de carte bancaire, les donnees KYC, et les mots de passe en clair.

**Preuve de concept**: Tout proxy HTTP (mitmproxy, Burp Suite) sur le meme reseau peut intercepter le trafic sans aucun avertissement cote utilisateur.

**Recommandation**:
- Supprimer `NSAllowsArbitraryLoads` ou le mettre a `false`
- Configurer des exceptions ATS uniquement pour les domaines de developpement si necessaire
- Utiliser des configurations differentes pour debug et release via des schemes Xcode

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

---

### VULN-M02: Absence de Certificate Pinning (SSL Pinning)

**Criticite**: CRITICAL
**OWASP Mobile**: M3 - Insecure Communication
**Fichiers**: `mobile/lib/services/api_service.dart`, `mobile/lib/config/api_config.dart`

**Description**:
L'application utilise le package `http` standard sans aucune forme de certificate pinning. Aucun fichier `network_security_config.xml` n'existe pour Android, et aucune configuration de pinning n'est presente dans le code Dart.

L'API communique avec `https://api.ltcgroup.site/api/v1` mais le client accepte **n'importe quel certificat TLS valide** emis par n'importe quelle autorite de certification.

**Impact**: Un attaquant disposant d'un certificat valide emis par une CA compromise ou un CA d'entreprise peut realiser un MitM transparent, interceptant tous les echanges API (tokens, PAN, CVV, donnees personnelles KYC).

**Preuve de concept**: Un attaquant sur un reseau d'entreprise avec son propre CA root installe peut intercepter tout le trafic HTTPS de l'application sans alerte.

**Recommandation**:
- Implementer le certificate pinning avec le package `dio` + `dio_certificate_pinning` ou `http_certificate_pinning`
- Creer un fichier `network_security_config.xml` pour Android avec les pins SHA-256 du certificat du serveur
- Utiliser `TrustManager` custom sur iOS via le plugin natif
- Implementer une rotation planifiee des pins

---

### VULN-M03: Absence totale de protection contre le reverse engineering

**Criticite**: CRITICAL
**OWASP Mobile**: M9 - Reverse Engineering
**Fichier**: `mobile/android/app/build.gradle:31-35`

**Description**:
La configuration de build Android ne contient **aucune protection** contre le reverse engineering:

```gradle
buildTypes {
    release {
        signingConfig signingConfigs.debug  // Signe avec la cle debug!
    }
}
```

Problemes identifies:
1. **Pas de minification/obfuscation** (pas de `minifyEnabled true`)
2. **Pas de `shrinkResources true`**
3. **Pas de ProGuard/R8** configure
4. **Release signe avec la cle de debug** - absolument inacceptable pour la production
5. **Pas de `--obfuscate --split-debug-info` pour Flutter**

**Impact**: Toute personne peut decompiler l'APK et obtenir le code source quasi-complet, incluant la logique metier, les endpoints API, les patterns de validation, et potentiellement exploiter des failles decouvertes.

**Preuve de concept**: `apktool d kashpay.apk` suivi de `jadx kashpay.apk` revele tout le code.

**Recommandation**:
```gradle
buildTypes {
    release {
        signingConfig signingConfigs.release  // Cle de production!
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

Pour Flutter, ajouter au build:
```bash
flutter build apk --obfuscate --split-debug-info=build/debug-info
```

---

### VULN-M04: Cle API Firebase exposee dans le code source commite

**Criticite**: HIGH
**OWASP Mobile**: M1 - Improper Platform Usage / M10 - Extraneous Functionality
**Fichier**: `mobile/android/app/google-services.json:17-19`

**Description**:
Le fichier `google-services.json` contient une cle API Firebase reelle commitee dans le repository Git:

```json
"api_key": [
    {
        "current_key": "AIzaSyCEtNHNU0Xg39Qbf83HAcR9jimPbz_i7ac"
    }
]
```

Avec le project ID `kash-pay` et l'app ID `1:503949676751:android:e487efb9d1821bffc367ba` egalement exposes.

**Impact**: Un attaquant peut utiliser cette cle pour abuser des services Firebase (envoi de notifications spam, consommation du quota, acces potentiel aux donnees si les regles Firestore/Storage sont mal configurees).

**Preuve de concept**: La cle est directement lisible dans l'historique Git et peut etre utilisee avec les SDK Firebase.

**Recommandation**:
- Ajouter `google-services.json` et `GoogleService-Info.plist` au `.gitignore`
- Restreindre la cle API dans la console Google Cloud (limiter par package name, SHA-1, API scope)
- Configurer les Firebase Security Rules pour limiter l'acces
- Considerer l'utilisation de Firebase App Check

---

### VULN-M05: Bypass SSL en mode debug avec risque de fuite en production

**Criticite**: HIGH
**OWASP Mobile**: M3 - Insecure Communication
**Fichier**: `mobile/lib/main.dart:42-57`

**Description**:
Le code desactive la validation SSL en mode debug:

```dart
class _DevHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    return super.createHttpClient(context)
      ..badCertificateCallback = (X509Certificate cert, String host, int port) => true;
  }
}

void main() async {
  if (kDebugMode) {
    HttpOverrides.global = _DevHttpOverrides();
  }
```

Bien que protege par `kDebugMode`, cette approche presente des risques:
1. Le code de bypass SSL est **present dans le binaire de production** (il n'est juste pas execute)
2. Un attaquant peut modifier le binaire pour activer ce code
3. Combine avec VULN-M01 (ATS desactive), iOS n'a aucune protection supplementaire

**Impact**: La presence du code de bypass dans le binaire facilite le reverse engineering. Si un attaquant patche le binaire, il peut desactiver toute validation SSL.

**Recommandation**:
- Utiliser une directive de compilation conditionnelle pour exclure completement ce code du build release
- Utiliser `dart-define` pour les URLs de dev au lieu de desactiver SSL globalement

---

### VULN-M06: Absence de protection des ecrans sensibles (capture d'ecran/enregistrement)

**Criticite**: HIGH
**OWASP Mobile**: M2 - Insecure Data Storage
**Fichiers**: Tous les ecrans dans `mobile/lib/screens/`

**Description**:
Aucun ecran de l'application n'implemente de protection contre les captures d'ecran ou l'enregistrement d'ecran. Aucune utilisation de `FLAG_SECURE` (Android) ou d'equivalent iOS n'a ete trouvee.

Les ecrans concernes incluent:
- **CardDetailScreen**: Affiche le numero de carte complet et le CVV lors du reveal
- **BiometricScreen**: Ecran d'authentification biometrique
- **LoginScreen**: Ecran de saisie du mot de passe
- **KycScreen**: Documents d'identite et selfie
- **TransactionDetailScreen**: Details des transactions financieres
- **DashboardScreen**: Soldes et cartes

**Impact**: Un malware avec permission de capture d'ecran ou un enregistrement d'ecran peut capturer les PAN (numeros de carte), CVV, mots de passe, et documents KYC en clair.

**Preuve de concept**: Toute application avec `MediaProjection` (Android) ou un enregistrement d'ecran (iOS) capture les donnees sensibles affichees.

**Recommandation**:
- Implementer `FLAG_SECURE` via un canal de methode Flutter natif pour les ecrans sensibles (au minimum card detail, login, biometric, KYC)
- Sur Android: `getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)`
- Sur iOS: Detecter la capture d'ecran via `UIScreen.capturedDidChangeNotification`
- Masquer le contenu dans le multitache (app switcher)

---

### VULN-M07: WebView avec JavaScript illimite et risque d'injection

**Criticite**: HIGH
**OWASP Mobile**: M1 - Improper Platform Usage
**Fichier**: `mobile/lib/screens/payments/payment_webview_screen.dart:44`

**Description**:
Le WebView de paiement active JavaScript en mode illimite:

```dart
_controller = WebViewController()
  ..setJavaScriptMode(JavaScriptMode.unrestricted)
```

Bien que le code implemente un whitelisting de domaines (positif), le JavaScript est completement non restreint sur les domaines autorises. Si un des domaines de paiement est compromis ou vulnerable a XSS, l'attaquant peut executer du code arbitraire dans le WebView.

De plus, le whitelist est base sur le suffixe de domaine (`host.endsWith(...)`) ce qui peut etre contourne:
```dart
host.endsWith('.payin.cm') || host == 'payin.cm' ||
host.endsWith('.e-nkap.cm') || host == 'e-nkap.cm' ||
host.endsWith('.stripe.com') || host == 'stripe.com';
```

Un domaine comme `evil-payin.cm` serait bloque, mais `malicious.payin.cm` serait autorise si un attaquant peut creer un sous-domaine.

**Impact**: Execution de code JavaScript arbitraire dans le contexte de paiement, potentiel vol de donnees de paiement ou redirection vers des pages de phishing.

**Recommandation**:
- Limiter le `JavaScriptMode` au strict necessaire
- Renforcer le whitelist avec des verifications de domaine exactes
- Ajouter des Content-Security-Policy headers si le serveur le supporte
- Ne pas partager les cookies de l'app avec le WebView
- Considerer l'utilisation de Custom Tabs (Android) ou SFSafariViewController (iOS) au lieu d'un WebView embarque pour les paiements

---

### VULN-M08: Donnees sensibles non protegees dans les logs debug

**Criticite**: HIGH
**OWASP Mobile**: M4 - Insufficient Input/Output Validation
**Fichiers**: Multiples fichiers dans `mobile/lib/`

**Description**:
L'application utilise `debugPrint()` pour logger des informations qui peuvent contenir des donnees sensibles:

```dart
// auth_provider.dart:85
debugPrint('FCM token registered with backend');

// auth_provider.dart:88
debugPrint('Failed to register FCM token: $e');

// auth_provider.dart:102
debugPrint('Silent refresh failed: $e');

// card_detail_screen.dart:74
debugPrint('ERROR loading provider history: $e');
```

Bien que `debugPrint` est cense etre non-op en release, les exceptions serialisees (`$e`) peuvent contenir des informations sensibles (tokens, URLs avec parametres, details de reponse API).

De plus, sur certaines configurations Android, les logs `debugPrint` peuvent persister dans `logcat` et etre accessibles par d'autres applications avec la permission `READ_LOGS`.

**Impact**: Fuite de tokens d'authentification, d'URLs API internes, et de messages d'erreur revealant l'architecture backend via les logs systeme.

**Recommandation**:
- Implementer un service de logging centralise avec des niveaux de log (debug/info/error)
- Ne jamais logger d'informations sensibles, meme en mode debug
- Supprimer ou anonymiser les données dans les messages d'erreur avant de les logger
- Utiliser `kDebugMode` pour conditionner tout logging
- Considerer l'utilisation d'un package comme `logger` avec filtrage automatique en release

---

### VULN-M09: Notifications stockees en clair dans SharedPreferences

**Criticite**: MEDIUM
**OWASP Mobile**: M2 - Insecure Data Storage
**Fichier**: `mobile/lib/services/notification_service.dart:176-209`

**Description**:
Les notifications push sont stockees en clair dans `SharedPreferences`:

```dart
Future<void> _storeNotification({...}) async {
    final prefs = await SharedPreferences.getInstance();
    // ...
    await prefs.setString(_notificationsKey, encoded);
}
```

`SharedPreferences` stocke les donnees en clair:
- Android: fichier XML dans `/data/data/<package>/shared_prefs/`
- iOS: `NSUserDefaults` plist

Les notifications de transactions financieres peuvent contenir des montants, des descriptions, et des references de transaction.

**Impact**: Sur un appareil roote/jailbreake, un attaquant peut lire les notifications stockees contenant potentiellement des informations financieres.

**Recommandation**:
- Migrer le stockage des notifications vers `flutter_secure_storage`
- Ou chiffrer les donnees avant de les stocker dans SharedPreferences
- Limiter les informations sensibles dans le contenu des notifications

---

### VULN-M10: Biometric fallback silencieux permet le bypass

**Criticite**: MEDIUM
**OWASP Mobile**: M6 - Insecure Authorization
**Fichier**: `mobile/lib/screens/cards/card_detail_screen.dart:196-203`

**Description**:
La verification biometrique pour reveler les donnees sensibles de carte (PAN, CVV) permet un fallback silencieux:

```dart
Future<bool> _authenticateForReveal() async {
    final bio = BiometricService();
    final available = await bio.checkBiometricAvailable();
    if (!available) return true; // no biometrics -> allow (device has no sensor)
    return await bio.authenticate(
      reason: 'Authentifiez-vous pour reveler les details de la carte',
    );
}
```

Si la biometrie n'est pas disponible (pas de capteur, pas d'empreinte enregistree), l'acces aux donnees sensibles est **automatiquement accorde sans aucune authentification alternative**.

**Impact**: Sur un appareil sans biometrie ou avec la biometrie desactivee, n'importe qui ayant acces au telephone debloque peut voir le numero de carte complet et le CVV sans aucune verification supplementaire.

**Preuve de concept**: Sur un emulateur Android (pas de capteur biometrique), le reveal de carte se fait sans aucune authentification.

**Recommandation**:
- Exiger une authentification alternative (PIN, mot de passe) quand la biometrie n'est pas disponible
- Ne jamais retourner `true` par defaut sans authentification
- Implementer un PIN applicatif comme alternative a la biometrie

```dart
if (!available) {
    return await _promptForPin(); // ou _promptForPassword()
}
```

---

### VULN-M11: Permissions Android excessives

**Criticite**: MEDIUM
**OWASP Mobile**: M1 - Improper Platform Usage
**Fichier**: `mobile/android/app/src/main/AndroidManifest.xml:4-5`

**Description**:
L'application demande des permissions de stockage larges qui ne sont plus necessaires sur les versions modernes d'Android:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

Avec `targetSdk 35`, ces permissions sont depreciees et remplacees par des permissions granulaires (`READ_MEDIA_IMAGES`, etc.). De plus, pour le simple upload KYC via `image_picker`, ces permissions ne sont pas necessaires car le plugin utilise les APIs scoped storage.

L'absence de `android:allowBackup="false"` permet egalement la sauvegarde des donnees de l'application via ADB.

**Impact**: Surface d'attaque elargie. Un attaquant peut extraire les donnees de l'application via `adb backup` si `allowBackup` n'est pas explicitement desactive.

**Recommandation**:
- Supprimer `READ_EXTERNAL_STORAGE` et `WRITE_EXTERNAL_STORAGE`
- Ajouter `android:allowBackup="false"` dans la balise `<application>`
- Ajouter `android:networkSecurityConfig="@xml/network_security_config"` pour configurer la securite reseau
- Utiliser `maxSdkVersion` pour les permissions legacy si necessaire

---

### VULN-M12: Absence de validation des entrees API cote client

**Criticite**: MEDIUM
**OWASP Mobile**: M4 - Insufficient Input/Output Validation
**Fichiers**: `mobile/lib/services/api_service.dart`, ecrans de saisie

**Description**:
Les reponses API ne sont pas validees avant d'etre traitees. Le code fait confiance aux types retournes par le backend sans verification:

```dart
// api_service.dart:127-129
final tokenData = data['token'] is Map ? data['token'] : data;
final token = tokenData['access_token'] as String;  // Crash si null
final refreshToken = tokenData['refresh_token'] as String?;
```

De plus, la validation de l'email cote client est basique (login: `value.contains('@')`) et la validation du mot de passe sur le login est absente (seul le champ vide est verifie). La page d'inscription a une meilleure validation mais elle n'est pas coherente.

**Impact**: Un serveur compromis ou une attaque MitM pourrait injecter des donnees malformees causant des crashs ou un comportement imprevu.

**Recommandation**:
- Ajouter des verifications null-safe pour tous les champs critiques des reponses API
- Harmoniser la validation des entrees entre login et register
- Valider le format des tokens JWT avant de les stocker

---

### VULN-M13: Token JWT non valide localement avant utilisation

**Criticite**: MEDIUM
**OWASP Mobile**: M6 - Insecure Authorization
**Fichier**: `mobile/lib/services/storage_service.dart:85-88`

**Description**:
La verification de session (`isLoggedIn`) se base uniquement sur la presence d'un token non-vide:

```dart
Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
}
```

Le token JWT n'est **jamais decode ni valide localement**. Un token expire, malformed, ou invalide sera considere comme valide jusqu'a ce qu'un appel API echoue avec un 401.

**Impact**: L'utilisateur peut voir brievement l'ecran principal avec des donnees cachees avant d'etre redirige vers le login, creant une confusion UX et potentiellement exposant des donnees obsoletes.

**Recommandation**:
- Decoder le JWT localement et verifier la date d'expiration (`exp` claim)
- Utiliser un package comme `jwt_decoder` pour parser le token
- Rediriger vers le login proactivement si le token est proche de l'expiration

---

### VULN-M14: Clipboard non securise pour les donnees de carte

**Criticite**: LOW
**OWASP Mobile**: M2 - Insecure Data Storage
**Fichier**: `mobile/lib/screens/cards/card_detail_screen.dart:300-305`

**Description**:
Les numeros de carte et CVV peuvent etre copies dans le presse-papiers avec un auto-clear apres 30 secondes:

```dart
void _copyToClipboard(String value, String label) {
    Clipboard.setData(ClipboardData(text: value));
    Future.delayed(const Duration(seconds: 30), () {
      Clipboard.setData(const ClipboardData(text: ''));
    });
}
```

Bien que l'auto-clear est une bonne pratique, pendant les 30 secondes, n'importe quelle application peut lire le presse-papiers. De plus, sur Android 12 et anterieur, les applications en arriere-plan peuvent acceder au clipboard sans notification.

**Impact**: Exposition temporaire du PAN ou CVV a d'autres applications via le presse-papiers systeme.

**Recommandation**:
- Reduire le delai d'auto-clear a 10-15 secondes
- Afficher un avertissement a l'utilisateur avant de copier les donnees sensibles
- Sur Android 13+, le systeme notifie deja les acces au clipboard

---

### VULN-M15: Pas de detection de root/jailbreak

**Criticite**: LOW
**OWASP Mobile**: M8 - Code Tampering
**Fichiers**: `mobile/lib/main.dart`, `mobile/lib/services/`

**Description**:
L'application ne detecte pas si l'appareil est roote (Android) ou jailbreake (iOS). Sur un appareil compromis, les protections de `flutter_secure_storage` peuvent etre contournees car le Keystore/Keychain est accessible.

**Impact**: Sur un appareil roote/jailbreake, un attaquant peut:
- Extraire les tokens JWT du Keystore
- Lire le contenu de `flutter_secure_storage`
- Intercepter les appels API
- Modifier le comportement de l'application

**Recommandation**:
- Utiliser un package comme `flutter_jailbreak_detection` ou `root_checker`
- Afficher un avertissement a l'utilisateur sur un appareil compromis
- Optionnellement, refuser le fonctionnement de l'application sur des appareils rootes (selon la politique de securite)

---

### VULN-M16: Pas de timeout de session applicatif

**Criticite**: LOW
**OWASP Mobile**: M6 - Insecure Authorization
**Fichiers**: `mobile/lib/providers/auth_provider.dart`, `mobile/lib/main.dart`

**Description**:
L'application ne deconnecte pas l'utilisateur apres une periode d'inactivite. L'utilisateur reste authentifie indefiniment tant que le token est valide (ou est renouvele via refresh token).

La seule deconnexion automatique survient lors d'un echec de refresh token (401). Il n'y a pas de:
- Timer d'inactivite (pas de detection du temps depuis la derniere interaction)
- Verrouillage de l'app lors du retour au premier plan apres une absence prolongee
- Re-authentification pour les actions sensibles (sauf le reveal de carte)

**Impact**: Si un utilisateur laisse son telephone debloque, n'importe qui peut utiliser l'application sans aucune re-authentification.

**Recommandation**:
- Implementer un timer d'inactivite (ex: 5 minutes) qui verrouille l'app
- Exiger la biometrie ou le PIN lors du retour au premier plan apres X minutes
- Utiliser `WidgetsBindingObserver` pour detecter le lifecycle de l'app (`didChangeAppLifecycleState`)

---

### VULN-M17: Donnees sensibles en memoire non zeroise systematiquement

**Criticite**: LOW
**OWASP Mobile**: M2 - Insecure Data Storage
**Fichier**: `mobile/lib/screens/cards/card_detail_screen.dart:48-57`

**Description**:
Le code tente de zeroise les donnees sensibles dans `dispose()`:

```dart
@override
void dispose() {
    if (_revealedCardNumber != null) {
      _revealedCardNumber = '0' * _revealedCardNumber!.length;
    }
    if (_revealedCvv != null) {
      _revealedCvv = '0' * _revealedCvv!.length;
    }
    _revealedCardNumber = null;
    _revealedCvv = null;
    super.dispose();
}
```

C'est une bonne initiative mais insuffisante en Dart/Flutter:
- Les Strings Dart sont immutables; l'original reste en memoire jusqu'au GC
- L'ecriture de zeros cree une **nouvelle** String, elle ne modifie pas l'ancienne
- Le garbage collector ne garantit pas un nettoyage immediat

**Impact**: Les PAN et CVV restent en memoire potentiellement longtemps apres le `dispose()`. Un dump memoire peut les reveler.

**Recommandation**:
- Utiliser `Uint8List` au lieu de `String` pour les donnees sensibles (peut etre explicitement ecrase)
- Minimiser la duree de retention en memoire
- Bien que la protection parfaite soit difficile en Dart, utiliser des structures mutables pour les donnees sensibles

---

## Points positifs identifies

L'audit a egalement identifie plusieurs bonnes pratiques de securite deja en place:

1. **Stockage securise des tokens**: Utilisation correcte de `flutter_secure_storage` pour les tokens d'authentification (JWT, refresh token) et les donnees utilisateur (`storage_service.dart`)

2. **Gestion du refresh token**: Implementation robuste avec deduplication des requetes concurrentes via `_refreshFuture` et retry automatique sur 401 (`api_service.dart:47-63`)

3. **Auto-hide des donnees sensibles**: Le numero de carte et le CVV sont automatiquement masques apres 30 secondes (`card_detail_screen.dart:228-243`)

4. **Biometrie pour le reveal de carte**: La verification biometrique est requise avant d'afficher les donnees sensibles de carte (PAN, CVV)

5. **Whitelist de domaines WebView**: Le WebView de paiement filtre les navigations par domaine et bloque les schemes non-HTTP (`payment_webview_screen.dart:62-113`)

6. **Validation de mot de passe robuste**: L'ecran d'inscription exige une majuscule, minuscule, chiffre, et caractere special (`register_screen.dart:383`)

7. **Auto-clear du presse-papiers**: Le presse-papiers est automatiquement vide 30 secondes apres la copie de donnees sensibles

8. **Nettoyage a la deconnexion**: `clearAll()` supprime tous les tokens et donnees du stockage securise et de SharedPreferences

9. **Firebase options avec placeholder**: Les options Firebase utilisent un pattern "PLACEHOLDER" avec detection (`firebase_options.dart:8`)

10. **Gestion 401 globale**: Un callback `onSessionExpired` global assure la deconnexion automatique sur toute erreur 401

---

## Matrice de risque

| ID | Vulnerabilite | Criticite | Exploitabilite | Impact | Priorite |
|----|--------------|-----------|----------------|--------|----------|
| M01 | ATS desactive (iOS) | Critical | Facile | Elevee | P0 |
| M02 | Pas de certificate pinning | Critical | Moyenne | Elevee | P0 |
| M03 | Pas de protection reverse engineering | Critical | Facile | Elevee | P0 |
| M04 | Cle Firebase commitee | High | Facile | Moyenne | P1 |
| M05 | Code bypass SSL en binaire | High | Moyenne | Elevee | P1 |
| M06 | Pas de FLAG_SECURE | High | Facile | Moyenne | P1 |
| M07 | WebView JS illimite | High | Moyenne | Elevee | P1 |
| M08 | Donnees sensibles dans logs | High | Moyenne | Moyenne | P1 |
| M09 | Notifications en clair | Medium | Difficile | Moyenne | P2 |
| M10 | Biometric fallback bypass | Medium | Facile | Moyenne | P2 |
| M11 | Permissions excessives | Medium | Facile | Faible | P2 |
| M12 | Pas de validation reponses API | Medium | Moyenne | Moyenne | P2 |
| M13 | Token non valide localement | Medium | Facile | Faible | P2 |
| M14 | Clipboard non securise | Low | Facile | Faible | P3 |
| M15 | Pas de detection root/jailbreak | Low | Difficile | Elevee | P3 |
| M16 | Pas de timeout de session | Low | Facile | Faible | P3 |
| M17 | Memoire non zeroisee | Low | Difficile | Faible | P3 |

---

## Plan de remediation recommande

### Phase 1 - Corrections immediates (P0 - avant mise en production)
1. Desactiver `NSAllowsArbitraryLoads` dans `Info.plist` (VULN-M01)
2. Implementer le certificate pinning (VULN-M02)
3. Configurer les build types release avec obfuscation et signing production (VULN-M03)

### Phase 2 - Corrections prioritaires (P1 - sous 2 semaines)
4. Retirer `google-services.json` du Git et restreindre la cle API (VULN-M04)
5. Exclure le code de bypass SSL du build release (VULN-M05)
6. Implementer `FLAG_SECURE` sur les ecrans sensibles (VULN-M06)
7. Securiser le WebView (VULN-M07)
8. Centraliser et securiser le logging (VULN-M08)

### Phase 3 - Ameliorations de securite (P2 - sous 1 mois)
9. Chiffrer les notifications stockees (VULN-M09)
10. Implementer un fallback PIN pour la biometrie (VULN-M10)
11. Nettoyer les permissions Android (VULN-M11)
12. Ajouter la validation des reponses API (VULN-M12)
13. Valider le JWT localement (VULN-M13)

### Phase 4 - Durcissement (P3 - sous 3 mois)
14. Reduire le delai du clipboard (VULN-M14)
15. Ajouter la detection root/jailbreak (VULN-M15)
16. Implementer le timeout de session (VULN-M16)
17. Utiliser des buffers mutables pour les donnees sensibles (VULN-M17)

---

## Conclusion

L'application Kash Pay presente une base fonctionnelle solide avec certaines bonnes pratiques de securite (stockage securise, refresh token, biometrie). Cependant, **3 vulnerabilites critiques** empechent toute mise en production en l'etat:

1. La desactivation complete d'ATS sur iOS expose tout le trafic
2. L'absence de certificate pinning permet les attaques MitM
3. L'absence de protection contre le reverse engineering et le signing avec la cle debug

Ces corrections sont imperatives et doivent etre adressees **avant toute publication** sur les stores Apple et Google.
