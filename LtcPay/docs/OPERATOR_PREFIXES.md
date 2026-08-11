# Préfixes opérateurs par pays — proposition à valider

Données compilées le 2026-08-11 depuis les plans de numérotation publics
(ITU-T, régulateurs, sources secondaires recoupées). **À faire valider par
TouchPay avant application** : un préfixe erroné bloque des paiements
légitimes. Grâce à la sémantique « mismatch prouvé », une plage absente
n'est jamais bloquante — en cas de doute, omettre le préfixe.

Les préfixes s'entendent sur le **numéro national tel que stocké par LtcPay**
(sans indicatif pays). Vérifier pour chaque pays le format effectivement
saisi au checkout (avec ou sans `0` initial) avant d'appliquer.

## Statut par pays

| Pays | Portabilité | `enforce_phone_prefix_check` recommandé |
|------|-------------|------------------------------------------|
| CM Cameroun | non | `true` (défaut) |
| CG Congo | non | `true` |
| GA Gabon | non | `true` |
| GN Guinée | non | `true` |
| CD RDC | non | `true` |
| UG Uganda | non | `true` |
| SN Sénégal | **oui** | `false` — préfixes indicatifs seulement |
| CI Côte d'Ivoire | **oui** | `false` — préfixes indicatifs seulement |

## CM — Cameroun (appliqué, migration 010)

| Opérateur | Préfixes | Confiance |
|-----------|----------|-----------|
| MTN | 67, 650–654 | haute (appliqué) |
| ORANGE | 69, 655–659 | haute (appliqué) |
| — | 680–684 / 685–689 | **non appliqué** — découpage MTN/Orange à confirmer |

## CG — Congo-Brazzaville (numéros à 9 chiffres, format 0X XXX XXXX)

| Opérateur | Préfixes proposés | Confiance |
|-----------|-------------------|-----------|
| MTN | 06 | haute (ITU +242, Libon) |
| AIRTEL | 05 | haute |

```json
{"phone_prefixes": ["06"]}   // MTN
{"phone_prefixes": ["05"]}   // AIRTEL
```
⚠️ Si LtcPay stocke le numéro sans le `0` initial, utiliser `["6"]` / `["5"]`.

## GA — Gabon (9 chiffres depuis 2019, `0` initial inclus dans le NSN)

| Opérateur | Préfixes proposés | Confiance |
|-----------|-------------------|-----------|
| AIRTEL (Airtel Money) | 074, 076, 077 | moyenne-haute (ITU +241 2024, Wikipédia) |
| MOOV / Gabon Telecom (Moov Money) | 060, 062, 065, 066 | moyenne-haute |

⚠️ Le NSN gabonais inclut le `0` initial depuis la migration 2019 — vérifier
le format stocké avant d'appliquer (sinon `74/76/77` et `60/62/65/66`).

## GN — Guinée (9 chiffres)

| Opérateur | Préfixes proposés | Confiance |
|-----------|-------------------|-----------|
| ORANGE (Orange Money) | 62 | haute (ARPT) |
| MTN | 66 | moyenne — **vérifier le statut de MTN Guinée** (retrait annoncé du marché) |
| CELLCOM | 65 | moyenne |

## CD — RDC (9 chiffres)

| Opérateur | Préfixes proposés | Confiance |
|-----------|-------------------|-----------|
| VODACOM (M-Pesa) | 81, 82, 83 | haute |
| AIRTEL (Airtel Money) | 97, 98, 99 | haute |
| ORANGE (Orange Money) | 80, 84, 85, 89 | moyenne-haute (89/84/85 ex-Tigo absorbé par Orange en 2016) |
| AFRICELL (Afrimoney) | 90, 91 | moyenne |

## UG — Uganda (9 chiffres, sans le `0` de tronc)

| Opérateur | Préfixes proposés | Confiance |
|-----------|-------------------|-----------|
| MTN (MoMo) | 76, 77, 78, 79 | haute (UCC ; 79 attribué en mars 2025) |
| AIRTEL (Airtel Money) | 70, 74, 75 | haute (UCC) |

⚠️ Si les numéros sont stockés avec le `0` (077…), utiliser `["076","077","078","079"]` etc.

## Application

Par opérateur, via l'API admin (aucun redéploiement) :

```
PATCH /api/v1/admin/countries/{code}/operators/{operator_id}
{"phone_prefixes": ["81", "82", "83"]}
```

Pour un pays à portabilité (SN, CI) :

```
PATCH /api/v1/admin/countries/{code}
{"enforce_phone_prefix_check": false}
```
Les préfixes restent alors exposés aux partenaires et au checkout comme
**indication** (avertissement non bloquant), mais l'API n'y rejette aucun
paiement.

## Sources

- ITU-T National Numbering Plans : +242 Congo (communication 2024), +241 Gabon (communication 2024), +224 Guinée (communication 2020)
- ARPT Guinée (arpt.gov.gn), UCC Uganda (attributions 076/079, 074)
- countrycode.com (RDC), Wikipédia (Telephone numbers in Gabon), Libon (MTN Congo-B)
