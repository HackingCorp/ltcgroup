# LtcPay API - Guide d'Intégration

## Vue d'ensemble

LtcPay supporte **deux modes d'intégration** pour s'adapter à vos besoins :

| Mode | Cas d'usage | Redirections | Complexité |
|------|-------------|--------------|------------|
| **SDK** | Applications web, sites e-commerce | ✅ Oui (2-3 redirections) | Simple |
| **Direct API** | Applications mobiles natives | ❌ Non | Moyenne |

---

## 🌐 Mode SDK (Web Integration)

**Idéal pour :** Sites web, boutiques en ligne, applications web

### Flux de paiement

```
1. Votre serveur → LtcPay API : Créer le paiement
2. LtcPay → Votre serveur : Retourne payment_url
3. Votre site → Client : Redirection vers payment_url
4. Client → TouchPay : Page de paiement TouchPay (iframe/redirect)
5. Client → LtcPay : Retour après paiement
6. LtcPay → Votre webhook : Notification du résultat
```

### Étape 1 : Créer un paiement

```bash
POST https://api.ltcgroup.site/api/v1/payments
Headers:
  X-API-Key: ltcpay_live_xxx
  X-API-Secret: your_secret
  Content-Type: application/json

Body:
{
  "amount": 5000,
  "country": "CM",                 // Code pays (optionnel, défaut selon merchant)
  "currency": "XAF",              // Optionnel — auto-détecté depuis le pays
  "payment_mode": "SDK",          // Optionnel si votre merchant default = SDK
  "merchant_reference": "ORDER-123",
  "description": "Achat produit X",
  "customer_info": {
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "phone": "677000000"
  },
  "callback_url": "https://monsite.com/webhook/ltcpay",
  "return_url": "https://monsite.com/merci"
}
```

### Réponse

```json
{
  "payment_id": "uuid",
  "reference": "PAY-ABC123",
  "amount": "5000.00",
  "fee": "87.50",
  "currency": "XAF",
  "country": "CM",
  "status": "PENDING",
  "payment_mode": "SDK",
  "payment_url": "https://pay.ltcgroup.site/pay/PAY-ABC123",
  "created_at": "2026-04-09T10:00:00Z"
}
```

### Étape 2 : Rediriger le client

```javascript
// Rediriger vers la page de paiement
window.location.href = response.payment_url;

// Ou ouvrir dans une nouvelle fenêtre
window.open(response.payment_url, '_blank');
```

### Étape 3 : Recevoir le webhook

LtcPay enverra une notification POST à votre `callback_url` :

```json
{
  "event": "payment.status_changed",
  "data": {
    "reference": "PAY-ABC123",
    "status": "COMPLETED",
    "amount": 5000.00,
    "merchant_reference": "ORDER-123"
  }
}
```

---

## 📱 Mode Direct API (Mobile Integration)

**Idéal pour :** Applications mobiles iOS/Android (Flutter, React Native, etc.)

**Avantages :**
- ✅ Zéro redirection navigateur
- ✅ UX native dans l'app
- ✅ Notification push Mobile Money
- ✅ Polling temps réel du statut

### Flux de paiement

```
1. App mobile → LtcPay API : Créer paiement avec opérateur + téléphone
2. LtcPay → TouchPay Direct API : Initier le paiement
3. TouchPay → Client : Notification push Mobile Money
4. Client → App Mobile Money : Approuver le paiement
5. App mobile → LtcPay API : Polling du statut (toutes les 3-5s)
6. LtcPay → App mobile : Statut COMPLETED
7. App mobile : Afficher écran de succès
```

### Étape 1 : UI native - Sélection pays et opérateur

Les opérateurs disponibles sont récupérés dynamiquement via l'API :

```bash
GET https://api.ltcgroup.site/api/v1/payments/countries
Headers:
  X-API-Key: ltcpay_live_xxx       # Optionnel — filtre par pays autorisés du merchant
  X-API-Secret: your_secret        # Optionnel
```

Créez une interface dans votre app pour que le client choisisse :
- **Pays** : Récupéré depuis `GET /api/v1/payments/countries`
- **Opérateur** : Liste dynamique selon le pays sélectionné
- **Numéro de téléphone** : Son numéro Mobile Money

```dart
// Exemple Flutter — chargement dynamique des pays et opérateurs
List<Country> countries = [];

Future<void> loadCountries() async {
  final response = await apiClient.get('/api/v1/payments/countries');
  countries = (response.data as List).map((c) => Country.fromJson(c)).toList();
}

showModalBottomSheet(
  context: context,
  builder: (context) => Column(
    children: [
      // Sélection du pays
      DropdownButton<Country>(
        hint: Text('Choisissez votre pays'),
        items: countries.map((c) => DropdownMenuItem(
          value: c,
          child: Text('${c.flagEmoji} ${c.name}'),
        )).toList(),
        onChanged: (country) {
          selectedCountry = country;
          setState(() {}); // Rafraîchir les opérateurs
        },
      ),
      // Sélection de l'opérateur (dynamique selon le pays)
      if (selectedCountry != null)
        ...selectedCountry!.operators.map((op) => ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: Color(int.parse(op.color.replaceFirst('#', '0xFF')))),
          onPressed: () => selectOperator(op.code),
          child: Text(op.name),
        )),
      TextField(
        decoration: InputDecoration(
          labelText: 'Numéro de téléphone',
          hintText: selectedCountry?.phonePattern ?? '',
          prefixText: selectedCountry != null ? '+${selectedCountry!.phonePrefix} ' : '',
        ),
        keyboardType: TextInputType.phone,
        onChanged: (value) => phoneNumber = value,
      ),
    ],
  ),
);
```

### Étape 2 : Créer le paiement avec opérateur

**IMPORTANT :** Vous devez fournir `operator` et `customer_phone` dès la création !

```bash
POST https://api.ltcgroup.site/api/v1/payments
Headers:
  X-API-Key: ltcpay_live_xxx
  X-API-Secret: your_secret
  Content-Type: application/json

Body:
{
  "amount": 5000,
  "country": "CM",                    // Optionnel — auto-détecté depuis le préfixe téléphone si absent
  "currency": "XAF",                  // Optionnel — auto-détecté depuis le pays
  "payment_mode": "DIRECT_API",
  "operator": "MTN",                  // OBLIGATOIRE
  "customer_phone": "677179670",      // OBLIGATOIRE — format variable selon le pays, normalisé automatiquement
  "merchant_reference": "ORDER-123",
  "description": "Achat produit X",
  "customer_info": {
    "name": "Jean Dupont",
    "email": "jean@example.com"
  }
}
```

### Réponse

```json
{
  "payment_id": "uuid",
  "reference": "PAY-ABC123",
  "amount": "5000.00",
  "fee": "87.50",
  "currency": "XAF",
  "country": "CM",
  "status": "PROCESSING",  // ← Immédiatement en cours
  "payment_mode": "DIRECT_API",
  "payment_url": null,     // ← Pas besoin de redirection
  "created_at": "2026-04-09T10:00:00Z"
}
```

### Étape 3 : Afficher le statut et polling

```dart
// Afficher un écran de chargement
showDialog(
  context: context,
  barrierDismissible: false,
  builder: (context) => AlertDialog(
    content: Column(
      children: [
        CircularProgressIndicator(),
        SizedBox(height: 16),
        Text('Veuillez confirmer le paiement sur votre téléphone'),
        Text('Un code a été envoyé via ${operator}'),
      ],
    ),
  ),
);

// Démarrer le polling
pollPaymentStatus(reference);
```

### Étape 4 : Polling du statut

```bash
GET https://api.ltcgroup.site/api/v1/payments/{reference}
Headers:
  X-API-Key: ltcpay_live_xxx
  X-API-Secret: your_secret
```

**Réponse :**

```json
{
  "reference": "PAY-ABC123",
  "status": "PROCESSING",  // ou COMPLETED, FAILED
  "amount": "5000.00",
  "fee": "87.50",
  "currency": "XAF",
  "country": "CM",
  "payment_mode": "DIRECT_API",
  "operator": "MTN",
  "created_at": "2026-04-09T10:00:00Z",
  "completed_at": null     // ou datetime si COMPLETED
}
```

**Exemple de polling en Flutter :**

```dart
Future<void> pollPaymentStatus(String reference) async {
  const maxAttempts = 40; // 40 × 3s = 2 minutes max
  int attempts = 0;

  while (attempts < maxAttempts) {
    await Future.delayed(Duration(seconds: 3));

    final payment = await apiClient.getPayment(reference);

    if (payment.status == 'COMPLETED') {
      Navigator.pop(context); // Fermer le loading
      showSuccessScreen(payment);
      return;
    } else if (payment.status == 'FAILED') {
      Navigator.pop(context);
      showErrorScreen(payment);
      return;
    }

    attempts++;
  }

  // Timeout après 2 minutes
  showTimeoutError();
}
```

### Étape 5 : Afficher le résultat

```dart
// Succès
void showSuccessScreen(Payment payment) {
  Navigator.pushReplacement(
    context,
    MaterialPageRoute(
      builder: (context) => PaymentSuccessScreen(
        amount: payment.amount,
        reference: payment.reference,
      ),
    ),
  );
}

// Échec
void showErrorScreen(Payment payment) {
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Paiement échoué'),
      content: Text('Le paiement n\'a pas pu être complété'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text('Réessayer'),
        ),
      ],
    ),
  );
}
```

---

## Opérateurs supportés

Les opérateurs disponibles sont dynamiques et dépendent des pays activés pour votre compte marchand. Utilisez l'endpoint `GET /api/v1/payments/countries` pour obtenir la liste complète.

**Exemples d'opérateurs :**

| Code | Nom complet | Pays disponibles |
|------|-------------|------------------|
| `MTN` | MTN Mobile Money | Cameroun (CM) |
| `ORANGE` | Orange Money | Cameroun (CM) |
| `WAVE` | Wave | Cote d'Ivoire (CI), Senegal (SN) |
| `MOOV` | Moov Money | Cote d'Ivoire (CI) |

> **Note :** Cette liste est indicative. Les opérateurs effectivement disponibles pour votre marchand dépendent de votre configuration. Consultez toujours `GET /api/v1/payments/countries` pour la liste exacte.

---

## Statuts de paiement

| Statut | Description | Terminal ? |
|--------|-------------|------------|
| `PENDING` | Paiement créé, en attente | Non |
| `PROCESSING` | En cours de traitement (Direct API) | Non |
| `COMPLETED` | Paiement réussi | Oui ✅ |
| `FAILED` | Paiement échoué | Oui ❌ |
| `CANCELLED` | Annulé par le client | Oui ❌ |
| `EXPIRED` | Lien de paiement expiré (30 min) | Oui ❌ |

---

## Format du numéro de téléphone

Pour le mode **Direct API**, le format du numéro de téléphone varie selon le pays. LtcPay normalise automatiquement le numéro en se basant sur le `phone_prefix` du pays.

| Pays | Indicatif | Chiffres locaux | Exemple |
|------|-----------|-----------------|---------|
| Cameroun (CM) | +237 | 9 chiffres | `677179670` |
| Cote d'Ivoire (CI) | +225 | 10 chiffres | `0707070707` |
| Senegal (SN) | +221 | 9 chiffres | `771234567` |

**Exemples de normalisation (Cameroun) :**

| Format envoyé | Accepté ? | Notes |
|---------------|-----------|-------|
| `677179670` | ✅ Oui | Format correct (9 chiffres) |
| `237677179670` | ✅ Oui | Le préfixe `237` est retiré automatiquement |
| `+237677179670` | ✅ Oui | Le `+237` est retiré automatiquement |
| `00237677179670` | ✅ Oui | Le `00237` est retiré automatiquement |

> **Note :** LtcPay normalise automatiquement le numéro en retirant l'indicatif pays en se basant sur le `phone_prefix` configuré pour chaque pays. Le nombre de chiffres attendu (`phone_digits`) et le pattern (`phone_pattern`) sont disponibles via `GET /api/v1/payments/countries`.

---

## Pays et opérateurs disponibles

L'endpoint `GET /api/v1/payments/countries` retourne la liste des pays disponibles avec leurs opérateurs, devises, formats de téléphone et limites de transaction.

```bash
GET https://api.ltcgroup.site/api/v1/payments/countries
Headers:
  X-API-Key: ltcpay_live_xxx       # Optionnel
  X-API-Secret: your_secret        # Optionnel
```

> **Note :** Cet endpoint fonctionne avec ou sans authentification. Avec les clés API du marchand, il filtre par pays autorisés pour ce marchand.

### Réponse

```json
[
  {
    "code": "CM",
    "name": "Cameroun",
    "currency": "XAF",
    "phone_prefix": "237",
    "phone_digits": 9,
    "phone_pattern": "6XX XX XX XX",
    "flag_emoji": "\ud83c\udde8\ud83c\uddf2",
    "min_amount": 100,
    "max_amount": 500000,
    "operators": [
      {"code": "MTN", "name": "MTN MoMo", "color": "#ffcc00", "ussd_code": "*126#"},
      {"code": "ORANGE", "name": "Orange Money", "color": "#ff6600", "ussd_code": "#150*50#"}
    ]
  }
]
```

### Champs retournés

| Champ | Description |
|-------|-------------|
| `code` | Code ISO du pays (ex: `CM`, `CI`, `SN`) |
| `name` | Nom du pays |
| `currency` | Devise utilisée (ex: `XAF`, `XOF`) |
| `phone_prefix` | Indicatif téléphonique du pays |
| `phone_digits` | Nombre de chiffres du numéro local (sans indicatif) |
| `phone_pattern` | Format d'affichage du numéro (pour le placeholder UI) |
| `flag_emoji` | Emoji drapeau du pays |
| `min_amount` | Montant minimum de transaction |
| `max_amount` | Montant maximum de transaction |
| `operators` | Liste des opérateurs disponibles dans ce pays |
| `operators[].code` | Code de l'opérateur (ex: `MTN`, `ORANGE`, `WAVE`) |
| `operators[].name` | Nom complet de l'opérateur |
| `operators[].color` | Couleur de marque (hex) pour l'UI |
| `operators[].ussd_code` | Code USSD pour vérifier le solde |

---

## Système de frais

Chaque marchand dispose d'une **configuration de frais** définie par l'administrateur LtcPay. Le taux est propre à chaque marchand et n'a pas besoin d'être précisé dans les requêtes API — il est appliqué automatiquement.

### Imputation des frais (`fee_bearer`)

| Mode | Comportement |
|------|-------------|
| `MERCHANT` (défaut) | Le client paie le montant exact. Les frais sont déduits du solde du marchand. |
| `CLIENT` | Les frais sont ajoutés au montant payé par le client. Le marchand reçoit le montant intégral. |

**Exemple — Mode MERCHANT :**
```
Montant demandé : 10 000 XAF → Le client paie 10 000 XAF, le marchand reçoit montant - frais
```

**Exemple — Mode CLIENT :**
```
Montant demandé : 10 000 XAF → Le client paie 10 000 + frais, le marchand reçoit 10 000 XAF
```

Le champ `fee` est retourné dans toutes les réponses de paiement pour indiquer le montant des frais calculés.

---

## Configuration Merchant

Dans le dashboard admin, chaque merchant a :

- **`default_payment_mode`** : Mode de paiement par défaut (SDK ou DIRECT_API)
- **`fee_bearer`** : Imputation des frais (`MERCHANT` ou `CLIENT`)

```
SDK → Utilisé par défaut si payment_mode n'est pas fourni
DIRECT_API → Utilisé par défaut si payment_mode n'est pas fourni
```

**Vous pouvez toujours remplacer le mode par paiement :**

```json
{
  "amount": 5000,
  "payment_mode": "DIRECT_API"  // ← Remplace le défaut du merchant
}
```

---

## Webhooks

Pour **les deux modes**, LtcPay envoie un webhook à votre `callback_url` quand le paiement atteint un statut terminal :

```
POST https://monsite.com/webhook/ltcpay
Headers:
  Content-Type: application/json
  X-LtcPay-Signature: <hmac-sha256>
  X-LtcPay-Event: payment.status_changed

Body:
{
  "event": "payment.status_changed",
  "data": {
    "payment_id": "uuid",
    "reference": "PAY-ABC123",
    "merchant_reference": "ORDER-123",
    "amount": 5000.0,
    "fee": 87.5,
    "currency": "XAF",
    "status": "COMPLETED",
    "payment_mode": "DIRECT_API",
    "operator": "MTN",
    "completed_at": "2026-04-09T10:05:00Z",
    "created_at": "2026-04-09T10:00:00Z"
  },
  "timestamp": "2026-04-09T10:05:01Z"
}
```

**Vérifiez toujours la signature** pour sécuriser votre webhook.

---

## Résumé : Quel mode choisir ?

| Critère | SDK | Direct API |
|---------|-----|------------|
| **Type d'app** | Web | Mobile native |
| **Redirections** | Oui (2-3) | Non |
| **Code client** | Simple redirect | UI native + polling |
| **UX mobile** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Contrôle UI** | Limité (SDK TouchPay) | Total (votre design) |
| **Push notification** | Non | Oui (Mobile Money) |

**Recommandation :**
- 📱 **App mobile** → Direct API
- 🌐 **Site web** → SDK

---

## Changelog

| Date | Modification |
|------|-------------|
| 2026-06-19 | Support multi-pays : champ `country`, endpoint GET /payments/countries, opérateurs dynamiques, limites par opérateur/pays, devise auto-détectée depuis le pays |
| 2026-04-30 | Ajout du système de frais (`fee_rate`, `fee_bearer`), champ `fee` dans les réponses |
| 2026-04-30 | Normalisation automatique du numéro de téléphone (suppression indicatif `237`) |
| 2026-04-09 | Version initiale : modes SDK et Direct API |
