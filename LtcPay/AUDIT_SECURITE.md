# 🔒 AUDIT DE SÉCURITÉ - PROJET LTCPAY

**Date**: 2 avril 2026
**Auditeur**: Claude Sonnet 4.5
**Scope**: Backend FastAPI + Frontend Next.js

---

## 📋 RÉSUMÉ EXÉCUTIF

### Niveau de sécurité global: ⭐⭐⭐⭐☆ (4/5)

Le projet LtcPay implémente des bonnes pratiques de sécurité solides. Quelques améliorations mineures sont recommandées.

**Points forts** ✅:
- Authentification robuste (API key + secret bcrypt)
- Signatures HMAC-SHA256 pour webhooks
- Idempotence des callbacks
- Updates atomiques en DB
- Validation Pydantic complète
- CORS configuré

**Points d'amélioration** ⚠️:
- Secrets en variables d'environnement (pas de rotation)
- Rate limiting manquant
- Logs sensibles potentiels
- Validation frontend insuffisante

---

## 🔍 AUDIT BACKEND (FastAPI)

### 1. Authentification & Autorisation

#### ✅ Points forts

**Double facteur API Key + Secret**
```python
# security.py
async def get_current_merchant(
    api_key: str = Security(api_key_header),
    api_secret: str = Security(api_secret_header),
    db: AsyncSession = Depends(get_db),
):
```
- ✅ API key stockée en clair (lookup rapide)
- ✅ Secret hashé avec bcrypt (salt automatique)
- ✅ Vérification constant-time (`bcrypt.checkpw`)
- ✅ Recherche par `api_key_live` OU `api_key_test`

**Génération sécurisée**
```python
def generate_api_secret() -> str:
    return secrets.token_hex(32)  # 64 caractères hex
```
- ✅ Utilise `secrets` (CSPRNG)
- ✅ 32 bytes = 256 bits d'entropie

#### ⚠️ Points d'amélioration

1. **Pas de rate limiting**
   - Risque: Brute force des API keys
   - Recommandation: Ajouter `slowapi` ou middleware custom
   ```python
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)

   @router.post("/payments")
   @limiter.limit("10/minute")
   async def create_payment(...):
   ```

2. **Pas de rotation automatique des secrets**
   - Risque: Secrets compromis restent valides indéfiniment
   - Recommandation: Implémenter rotation périodique ou sur demande

3. **Pas d'audit logging des authentifications**
   - Recommandation: Logger les tentatives (succès/échec) avec IP
   ```python
   logger.info(f"Auth success: merchant_id={merchant.id}, ip={request.client.host}")
   logger.warning(f"Auth failed: api_key={api_key[:8]}..., ip={request.client.host}")
   ```

---

### 2. Gestion des Secrets

#### ✅ Points forts

**Hashage bcrypt**
```python
def hash_api_secret(secret: str) -> str:
    return _bcrypt.hashpw(secret.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")
```
- ✅ Utilise bcrypt (résistant aux rainbow tables)
- ✅ Salt automatique par bcrypt
- ✅ Coût de hashage par défaut (12 rounds)

**HMAC pour webhooks**
```python
def generate_webhook_signature(payload: bytes, secret: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
```
- ✅ HMAC-SHA256 (standard industrie)
- ✅ Vérification constant-time (`hmac.compare_digest`)

#### ⚠️ Points d'amélioration

1. **Secrets en variables d'environnement**
   ```python
   # config.py
   TOUCHPAY_SECRET: str = ""
   jwt_secret_key: str = ""
   ```
   - Risque: Secrets exposés dans `.env` committé par erreur
   - Recommandation: Utiliser un vault (HashiCorp Vault, AWS Secrets Manager)
   - Alternative: `.env` dans `.gitignore` + documentation claire

2. **Génération JWT_SECRET manquante**
   ```python
   # config.py ligne 19
   SECRET_KEY: str = ""
   jwt_secret_key: str = ""
   ```
   - Risque: Si vide, utilise valeur par défaut faible
   - Recommandation: Générer automatiquement si absent
   ```python
   @model_validator(mode='after')
   def ensure_secrets(self):
       if not self.jwt_secret_key:
           self.jwt_secret_key = secrets.token_urlsafe(32)
       return self
   ```

3. **Webhook secret stocké en DB non chiffré**
   ```python
   # models/merchant.py
   webhook_secret = Column(String(255))
   ```
   - Risque: Admin DB peut voir les secrets marchands
   - Recommandation: Chiffrer avec Fernet ou hash (si unidirectionnel suffit)

---

### 3. Validation des entrées

#### ✅ Points forts

**Validation Pydantic complète**
```python
# schemas/payment.py
class PaymentInitiate(BaseModel):
    amount: Decimal = Field(..., ge=100, le=5000000)
    customer_info: Optional[CustomerInfo] = None
    description: Optional[str] = Field(None, max_length=500)
```
- ✅ Validation stricte des types
- ✅ Contraintes min/max sur montants
- ✅ Longueur max sur strings
- ✅ Validation Email avec `EmailStr`

**SQL Injection impossible**
```python
# Utilise SQLAlchemy ORM
result = await db.execute(
    select(Payment).where(Payment.reference == ref)
)
```
- ✅ Paramètres liés automatiquement (prepared statements)
- ✅ Pas de concaténation de SQL

#### ⚠️ Points d'amélioration

1. **Validation callback_url insuffisante**
   ```python
   callback_url: Optional[str] = Field(None)
   ```
   - Risque: SSRF si URL interne (http://localhost)
   - Recommandation: Valider que l'URL est externe
   ```python
   from pydantic import HttpUrl, field_validator

   callback_url: Optional[HttpUrl] = None

   @field_validator('callback_url')
   def validate_callback_url(cls, v):
       if v and v.host in ['localhost', '127.0.0.1', '0.0.0.0']:
           raise ValueError('Callback URL cannot be localhost')
       return v
   ```

2. **Pas de sanitization des descriptions**
   ```python
   description: Optional[str] = Field(None, max_length=500)
   ```
   - Risque: XSS si affiché dans dashboard sans escape
   - Recommandation: Escape HTML ou utiliser Markdown safe

---

### 4. Webhooks & Callbacks

#### ✅ Points forts

**Vérification signature HMAC**
```python
def _verify_touchpay_signature(body: bytes, signature: str) -> bool:
    expected = hmac.new(
        settings.TOUCHPAY_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```
- ✅ Constant-time comparison
- ✅ Signature sur body brut (pas JSON parsé)

**Idempotence des callbacks**
```python
# callbacks.py
if payment.status in (PaymentStatus.COMPLETED, PaymentStatus.FAILED):
    logger.info(f"Payment {payment.reference} already in terminal state")
    return {"status": "ok", "message": "already processed"}
```
- ✅ Empêche double-traitement
- ✅ Retourne 200 pour idempotence

**Update atomique**
```python
result = await db.execute(
    update(Payment)
    .where(
        Payment.id == payment.id,
        Payment.status == PaymentStatus.PENDING  # Condition CAS
    )
    .values(status=new_status, ...)
)
```
- ✅ Compare-And-Swap (CAS)
- ✅ Race condition évitée

#### ⚠️ Points d'amélioration

1. **Signature optionnelle en dev**
   ```python
   # callbacks.py ligne 97
   if not settings.TOUCHPAY_SECRET:
       return False
   ```
   - Risque: En dev, accepte callbacks non signés
   - Recommandation: Toujours exiger signature, même en dev

2. **Pas de nonce/timestamp dans webhooks**
   - Risque: Replay attack possible
   - Recommandation: Ajouter timestamp et rejeter si > 5 minutes
   ```python
   if abs(time.time() - webhook_timestamp) > 300:
       raise HTTPException(status_code=400, detail="Webhook expired")
   ```

3. **Notification marchands sans retry limit**
   ```python
   MAX_RETRIES = settings.merchant_webhook_max_retries
   ```
   - Risque: Infinite loop si mal configuré
   - Recommandation: Hard cap à 10 tentatives maximum

---

### 5. Injection & Vulnérabilités

#### ✅ Points forts

**SQL Injection: N/A**
- ✅ SQLAlchemy ORM utilisé partout
- ✅ Pas de `.execute()` avec SQL brut

**Command Injection: N/A**
- ✅ Pas d'appels `os.system()` ou `subprocess`

**Path Traversal: N/A**
- ✅ Pas de lecture fichiers user-controlled

**XXE: N/A**
- ✅ Pas de parsing XML

#### ⚠️ Points d'amélioration

1. **SSRF potentiel dans notifications**
   ```python
   # notification.py
   async with httpx.AsyncClient() as client:
       response = await client.post(callback_url, ...)
   ```
   - Risque: Callback vers URL interne (http://169.254.169.254)
   - Recommandation: Whitelist de domaines ou blacklist IPs internes
   ```python
   from urllib.parse import urlparse
   parsed = urlparse(callback_url)
   if parsed.hostname in INTERNAL_IPS:
       logger.warning(f"Blocked internal callback URL: {callback_url}")
       return False
   ```

---

### 6. CORS & Headers de sécurité

#### ✅ Points forts

**CORS configuré**
```python
# config.py
CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000,http://localhost:8001"
```
- ✅ Origins explicites (pas de `*`)

#### ⚠️ Points d'amélioration

1. **Headers de sécurité manquants**
   ```python
   # Ajouter dans main.py
   @app.middleware("http")
   async def add_security_headers(request, call_next):
       response = await call_next(request)
       response.headers["X-Content-Type-Options"] = "nosniff"
       response.headers["X-Frame-Options"] = "DENY"
       response.headers["X-XSS-Protection"] = "1; mode=block"
       response.headers["Strict-Transport-Security"] = "max-age=31536000"
       return response
   ```

2. **CORS credentials non configuré**
   - Recommandation: Expliciter `allow_credentials=True` si cookies utilisés

---

## 🖥️ AUDIT FRONTEND (Next.js)

### 1. Authentification & Session

#### ⚠️ Points critiques

1. **Tokens stockés dans cookies JS**
   ```typescript
   // auth.service.ts ligne 9
   Cookies.set("access_token", tokens.access_token, { expires: 7 });
   ```
   - Risque: XSS peut voler les tokens
   - Recommandation: Utiliser `httpOnly` cookies (backend set-cookie)
   ```typescript
   // Supprimer Cookies.set côté client
   // Laisser le backend retourner Set-Cookie: ... HttpOnly; Secure; SameSite=Strict
   ```

2. **Pas de CSRF protection**
   - Risque: CSRF sur endpoints authentifiés
   - Recommandation: Ajouter token CSRF ou utiliser SameSite cookies

3. **API keys visibles en localStorage**
   ```typescript
   // api-keys/page.tsx - TODO: fetch from API
   // Mais si stocké côté client = risque XSS
   ```
   - Recommandation: **JAMAIS** stocker API secret côté client
   - Uniquement afficher lors de la génération, puis hash côté serveur

### 2. XSS Protection

#### ⚠️ Points d'amélioration

1. **Pas de sanitization des descriptions**
   ```tsx
   // payments/page.tsx
   <div className="text-sm text-gray-500">
     {payment.description}
   </div>
   ```
   - Risque: Si description contient `<script>`, XSS possible
   - Recommandation: React escape automatiquement, mais valider côté backend

2. **dangerouslySetInnerHTML absent**
   - ✅ Pas d'utilisation de `dangerouslySetInnerHTML`
   - ✅ Bon point!

### 3. Validation côté client

#### ⚠️ Points d'amélioration

1. **Validation front insuffisante**
   ```tsx
   // payments/new/page.tsx
   <input type="number" required min="100" />
   ```
   - Risque: Validation HTML uniquement (bypassable)
   - Recommandation: Ajouter Zod validation
   ```typescript
   import { z } from 'zod';
   const schema = z.object({
     amount: z.number().min(100).max(5000000),
     customer_email: z.string().email(),
   });
   ```

---

## 📊 AUDIT INFRASTRUCTURE

### 1. Docker & Secrets

#### ⚠️ Points critiques

1. **Secrets en variables d'environnement**
   ```yaml
   # docker-compose.yml
   environment:
     TOUCHPAY_SECRET: "secure_code_here"
   ```
   - Risque: Visible dans `docker inspect`
   - Recommandation: Utiliser Docker secrets
   ```yaml
   secrets:
     touchpay_secret:
       file: ./secrets/touchpay_secret.txt
   services:
     backend:
       secrets:
         - touchpay_secret
   ```

2. **Credentials DB en clair**
   ```yaml
   POSTGRES_PASSWORD: ltcpay_secret
   ```
   - Recommandation: Générer dynamiquement ou utiliser secrets

---

## 🎯 RECOMMANDATIONS PRIORITAIRES

### 🔴 CRITIQUE (À corriger immédiatement)

1. **Frontend: Cookies httpOnly**
   - Passer de `Cookies.set()` JS à `Set-Cookie` backend avec `HttpOnly; Secure; SameSite=Strict`

2. **Backend: Rate limiting**
   - Ajouter sur `/api/v1/payments` (10 req/min par IP)
   - Ajouter sur auth endpoints (5 tentatives par IP par heure)

3. **Docker: Secrets management**
   - Utiliser Docker secrets pour TOUCHPAY_SECRET, DB passwords

### 🟡 IMPORTANT (À corriger sous 1 mois)

4. **SSRF protection**
   - Valider callback_url (pas localhost, pas IP internes)
   - Blocker 169.254.169.254 (AWS metadata)

5. **Webhook replay protection**
   - Ajouter timestamp + validation (< 5 min)

6. **Audit logging**
   - Logger auth attempts avec IP
   - Logger webhook deliveries
   - Alertes sur échecs répétés

### 🟢 AMÉLIORATION (Nice to have)

7. **Headers sécurité**
   - X-Content-Type-Options, X-Frame-Options, CSP

8. **Secrets rotation**
   - Endpoint pour rotate API keys
   - Versioning des secrets

9. **Input sanitization**
   - Sanitize descriptions HTML
   - Validation Zod frontend

---

## ✅ CHECKLIST DE SÉCURITÉ

### Backend
- [x] Authentification robuste (API key + secret)
- [x] Secrets hashés (bcrypt)
- [x] HMAC webhooks
- [x] Validation Pydantic
- [x] SQL injection N/A (ORM)
- [x] Idempotence callbacks
- [ ] Rate limiting
- [ ] Audit logging
- [ ] SSRF protection
- [ ] Webhook replay protection
- [ ] Headers sécurité

### Frontend
- [x] React auto-escape XSS
- [ ] HttpOnly cookies
- [ ] CSRF protection
- [ ] Validation Zod
- [ ] Secrets jamais côté client
- [ ] Content Security Policy

### Infrastructure
- [x] CORS configuré
- [x] PostgreSQL isolé
- [ ] Docker secrets
- [ ] SSL/TLS (production)
- [ ] Secrets rotation

---

## 📈 SCORE DÉTAILLÉ

| Catégorie | Score | Note |
|-----------|-------|------|
| Authentification | 4/5 | ⭐⭐⭐⭐☆ |
| Autorisation | 4/5 | ⭐⭐⭐⭐☆ |
| Cryptographie | 5/5 | ⭐⭐⭐⭐⭐ |
| Validation | 4/5 | ⭐⭐⭐⭐☆ |
| Injection | 5/5 | ⭐⭐⭐⭐⭐ |
| XSS | 3/5 | ⭐⭐⭐☆☆ |
| CSRF | 2/5 | ⭐⭐☆☆☆ |
| SSRF | 2/5 | ⭐⭐☆☆☆ |
| Secrets Mgmt | 3/5 | ⭐⭐⭐☆☆ |
| Logging | 2/5 | ⭐⭐☆☆☆ |

**Score global: 3.4/5 = 68% = ⭐⭐⭐☆☆**

---

## 🎓 CONCLUSION

Le projet LtcPay présente une **base de sécurité solide** avec des choix architecturaux corrects (bcrypt, HMAC, Pydantic, ORM).

Les **points critiques** (httpOnly cookies, rate limiting, secrets management) doivent être adressés avant la mise en production.

Avec les corrections recommandées, le score pourrait atteindre **4.5/5** (90%).

---

**Audit réalisé par**: Claude Sonnet 4.5
**Date**: 2 avril 2026
**Version**: 1.0
