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
  "currency": "XAF",
  "payment_mode": "SDK",  // Optionnel si votre merchant default = SDK
  "merchant_reference": "ORDER-123",
  "description": "Achat produit X",
  "customer_info": {
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "phone": "237670000000"
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
  "currency": "XAF",
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

### Étape 1 : UI native - Sélection opérateur

Créez une interface dans votre app pour que le client choisisse :
- **Opérateur** : MTN ou Orange
- **Numéro de téléphone** : Son numéro Mobile Money

```dart
// Exemple Flutter
showModalBottomSheet(
  context: context,
  builder: (context) => Column(
    children: [
      Text('Choisissez votre opérateur'),
      ElevatedButton(
        onPressed: () => selectOperator('MTN'),
        child: Text('MTN Mobile Money'),
      ),
      ElevatedButton(
        onPressed: () => selectOperator('ORANGE'),
        child: Text('Orange Money'),
      ),
      TextField(
        decoration: InputDecoration(labelText: 'Numéro de téléphone'),
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
  "currency": "XAF",
  "payment_mode": "DIRECT_API",
  "operator": "MTN",                  // OBLIGATOIRE
  "customer_phone": "237670000000",   // OBLIGATOIRE
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
  "currency": "XAF",
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
  "currency": "XAF",
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

| Code | Nom complet | Pays |
|------|-------------|------|
| `MTN` | MTN Mobile Money | Cameroun |
| `ORANGE` | Orange Money | Cameroun |

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

## Configuration Merchant

Dans le dashboard admin, chaque merchant a un `default_payment_mode` :

```
SDK → Utilisé par défaut si payment_mode n'est pas fourni
DIRECT_API → Utilisé par défaut si payment_mode n'est pas fourni
```

**Mais vous pouvez toujours remplacer par paiement :**

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
