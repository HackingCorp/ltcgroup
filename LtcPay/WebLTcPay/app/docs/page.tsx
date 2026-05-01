"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

const BASE_URL = "https://pay.ltcgroup.site/api/v1";

/* ─── Translations ─── */
const translations = {
  fr: {
    // Header
    apiDocs: "API Docs",
    copyDocs: "Copy docs",
    copied: "Copied!",
    dashboard: "Dashboard",

    // Hero
    heroTitle: "Documentation API",
    heroDesc: "Intégrez LTCPay dans votre application pour accepter les paiements via Mobile Money et autres moyens de paiement locaux en Afrique.",
    baseUrl: "Base URL",

    // Integration Modes
    integrationModes: "Modes d\u2019intégration",
    unifiedFlowTitle: "Flux de paiement unifié — Plus de redirections navigateur !",
    unifiedFlowDesc: (
      <>
        Les modes <strong>SDK</strong> et <strong>Direct API</strong> utilisent la même <strong>interface de paiement native</strong> via TouchPay Direct API.
        Tous les paiements sont traités serveur-à-serveur avec <strong>zéro redirection navigateur</strong>.
      </>
    ),

    // SDK Mode card
    sdkTitle: "Liens de paiement",
    sdkIdealFor: "Idéal pour :",
    sdkIdealDesc: "Liens de paiement réutilisables, QR codes, factures",
    sdkBullets: [
      <>Créer un paiement <strong>sans</strong> opérateur/téléphone</>,
      "Le client choisit sur la page de paiement LtcPay",
      "\u2713 Aucune redirection navigateur",
      "Formulaire natif avec sélecteur d\u2019opérateur + saisie téléphone",
      "Polling pour mises à jour en temps réel",
    ],
    sdkFooter: "Parfait pour les URLs de paiement partageables",

    // Direct API Mode card
    directTitle: "Applications mobiles",
    directIdealFor: "Idéal pour :",
    directIdealDesc: "Applications mobiles natives avec UI personnalisée",
    directBullets: [
      <>Fournir opérateur + téléphone <strong>à la création</strong></>,
      "Initiation immédiate serveur-à-serveur",
      "\u2713 Pas besoin de navigateur/WebView",
      "Construisez votre propre UI native",
      "Polling via API pour les mises à jour de statut",
    ],
    directFooter: "\u26A0\uFE0F Requis : operator + customer_phone à la création",

    // Auto-detection banner
    autoDetectTitle: "\u2728 Détection automatique du mode — Aucune configuration nécessaire !",
    autoDetectDesc: (
      <>Le mode de paiement est <strong>détecté automatiquement</strong> selon les champs fournis :</>
    ),
    autoDetectBullets: [
      <><strong>Sans</strong> operator/phone → mode SDK (le client saisit sur la page de paiement)</>,
      <><strong>Avec</strong> operator + phone → mode Direct API (initiation immédiate)</>,
    ],
    autoDetectFooter: (
      <>Les deux modes sont <strong>toujours disponibles</strong> — créez le paiement et le système choisit le bon mode automatiquement !</>
    ),

    // Comparison table
    comparisonTitle: "Comparaison des modes",
    compFeature: "Fonctionnalité",
    compSdk: "SDK (Liens de paiement)",
    compDirect: "Direct API (Mobile)",
    compRows: [
      { feature: "Idéal pour", sdk: "Liens de paiement, QR codes, factures", direct: "Apps mobiles natives avec UI personnalisée" },
      { feature: "Redirections navigateur", sdk: "\u2713 Aucune redirection", direct: "\u2713 Aucune redirection", bold: true },
      { feature: "Requis à la création", sdk: "amount, currency", direct: "amount, currency, operator, customer_phone", directBold: true },
      { feature: "Sélection opérateur", sdk: "Le client choisit sur la page LtcPay", direct: "Le marchand fournit à la création" },
      { feature: "Statut initial", sdk: "PENDING", direct: "PROCESSING", code: true },
      { feature: "Interface de paiement", sdk: "Formulaire natif LtcPay (opérateur + téléphone)", direct: "Votre propre UI native" },
      { feature: "Initiation du paiement", sdk: "À la soumission → TouchPay Direct API", direct: "Immédiate → TouchPay Direct API" },
      { feature: "Vérification du statut", sdk: "Polling automatique sur la page + webhooks", direct: "Poll GET /payments/{reference} + webhooks" },
      { feature: "Complexité d\u2019intégration", sdk: "\u2B50\u2B50\u2B50 Simple (redirection)", direct: "\u2B50\u2B50\u2B50\u2B50 Moyen (UI + polling)" },
      { feature: "Liens réutilisables", sdk: "\u2713 Oui — parfait pour les factures", direct: "\u2717 Non — lié à un client spécifique" },
    ],

    // Direct API tip box
    directApiTipTitle: "\uD83D\uDCA1 Mode Direct API (Initiation immédiate)",
    directApiTipDesc: (
      <>Pour déclencher le <strong>mode Direct API</strong> avec initiation immédiate, fournissez les <strong>deux</strong> champs :</>
    ),
    directApiTipOperator: "Opérateur Mobile Money : ",
    directApiTipPhone: "Numéro du client (9 chiffres sans indicatif, ex: ",
    directApiTipFallback: (
      <>Sans ces champs, le paiement utilise le <strong>mode SDK</strong> (le client saisit les infos sur la page de paiement).</>
    ),

    // Authentication
    authTitle: "Authentification",
    authDesc: (
      <>
        Toutes les requêtes API doivent inclure votre clé API dans le header <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-API-Key</code>
        {" "}et votre secret API dans le header <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-API-Secret</code>.
        Utilisez les <strong>clés de test</strong> (<code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">ltcpay_test_*</code>) pour le sandbox
        {" "}et les <strong>clés live</strong> (<code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">ltcpay_live_*</code>) pour la production.
      </>
    ),

    // Endpoints
    endpointsTitle: "Points d\u2019accès (Endpoints)",

    // Create Payment
    createPaymentTitle: "Créer un paiement",
    createPaymentDesc: "Créer un nouveau paiement. Le mode est détecté automatiquement — aucune configuration nécessaire !",
    autoDetectEndpointTitle: "\u2728 Détection automatique du mode",
    autoDetectEndpointBullets: [
      <><strong>Sans operator/phone :</strong> mode SDK → retourne <code className="rounded bg-green-100 px-1 py-0.5 text-xs">payment_url</code> → le client saisit sur la page</>,
      <><strong>Avec operator + phone :</strong> mode Direct API → initiation immédiate → statut <code className="rounded bg-green-100 px-1 py-0.5 text-xs">PROCESSING</code></>,
      <>Pas besoin de spécifier <code className="rounded bg-green-100 px-1 py-0.5 text-xs">payment_mode</code> — c&apos;est automatique !</>,
      "Les deux modes utilisent TouchPay Direct API (zéro redirection navigateur)",
    ],

    // Param descriptions
    paramAmount: "Montant en unité de devise (ex: 5000 = 5 000 XAF). Minimum : 100.",
    paramCurrency: "Code devise ISO (XAF, XOF, EUR, USD). Par défaut : XAF",
    paramOperator: "Opérateur Mobile Money : 'MTN' ou 'ORANGE'. Déclenche le mode Direct API si fourni avec customer_phone.",
    paramPhone: "Téléphone client (9 chiffres sans indicatif, ex: 677179670). Le préfixe pays est retiré automatiquement.",
    paramPaymentMode: "Forcer le mode : 'SDK' ou 'DIRECT_API'. Détecté automatiquement si omis (recommandé).",
    paramMerchantRef: "Votre référence interne commande/facture pour la réconciliation",
    paramDescription: "Description du paiement affichée au client (max 500 caractères)",
    paramCustomerInfo: "Informations client : {name, email, phone}",
    paramCallbackUrl: "URL webhook pour les notifications de paiement (remplace le défaut marchand)",
    paramReturnUrl: "URL de redirection du client après le paiement",
    paramMetadata: "Données clé-valeur personnalisées attachées au paiement",

    // Create payment examples
    exSdkTitle: "Exemple 1 : Mode SDK (Liens de paiement)",
    exDirectTitle: "Exemple 2 : Mode Direct API (Apps mobiles avec UI personnalisée)",
    exPythonTitle: "Exemples Python",
    responseSdkTitle: "Réponse (Mode SDK)",
    responseDirectTitle: "Réponse (Mode Direct API)",
    responseDirectNote: (
      <>
        <strong>Note :</strong> En mode Direct API, le statut passe immédiatement à <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">PROCESSING</code> car le paiement est initié serveur-à-serveur. Le client reçoit une notification push pour approuver sur son app Mobile Money.
      </>
    ),

    // Get Payment
    getPaymentTitle: "Statut d\u2019un paiement",
    getPaymentDesc: "Récupérer le statut et les détails d\u2019un paiement par sa référence. En mode Direct API, interrogez cet endpoint toutes les 3-5 secondes pour vérifier si le paiement est terminé.",
    pollingTitle: "Polling Direct API :",
    pollingDesc: (
      <>
        Les apps mobiles en mode Direct API doivent interroger cet endpoint toutes les 3-5 secondes pour vérifier le statut.
        Arrêtez le polling quand le statut devient <code className="rounded bg-green-100 px-1 py-0.5 text-xs">COMPLETED</code>, <code className="rounded bg-green-100 px-1 py-0.5 text-xs">FAILED</code>, ou après 2 minutes (timeout).
      </>
    ),

    // List Payments
    listPaymentsTitle: "Lister les paiements",
    listPaymentsDesc: "Lister tous les paiements du marchand authentifié. Supporte la pagination et le filtrage par statut.",
    paramPage: "Numéro de page (par défaut : 1)",
    paramPageSize: "Éléments par page, 1-100 (par défaut : 20)",
    paramStatus: "Filtrer par statut : PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED, CANCELLED",

    // Fees
    feesTitle: "Frais",
    feesDesc: "Des frais sont appliqués sur chaque paiement. Le taux de commission est configuré par l\u2019administrateur LtcPay pour chaque marchand. Par défaut, les frais sont supportés par le marchand (déduits du montant reçu).",
    feeModeTitle: "Mode d\u2019imputation des frais",
    feeMode: "Mode",
    feeWhoPays: "Qui paie ?",
    feeExample: "Exemple (montant: 10 000 XAF)",
    feeMerchantDesc: "Le marchand supporte les frais. Le client paie le montant exact.",
    feeMerchantEx: (<>Client paie <strong>10 000</strong>, marchand reçoit montant - frais</>),
    feeClientDesc: "Le client paie les frais en plus du montant. Le marchand reçoit le montant intégral.",
    feeClientEx: (<>Client paie <strong>10 000 + frais</strong>, marchand reçoit 10 000</>),
    feeNote: (
      <>
        Le champ <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">fee</code> est retourné dans toutes les réponses de paiement et dans les webhooks. En mode <strong>CLIENT</strong>, le champ <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">amount</code> reflète le montant total facturé (montant de base + frais).
      </>
    ),

    // Phone Format
    phoneTitle: "Format du numéro de téléphone",
    phoneDesc: (
      <>
        Pour le mode <strong>Direct API</strong>, le numéro de téléphone doit contenir <strong>9 chiffres</strong> sans indicatif pays.
        LtcPay normalise automatiquement le numéro en retirant le préfixe <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">237</code>.
      </>
    ),
    phoneSent: "Format envoyé",
    phoneAccepted: "Accepté ?",
    phoneNotes: "Notes",
    phoneRows: [
      { format: "677179670", ok: true, note: "Format correct (9 chiffres)" },
      { format: "237677179670", ok: true, note: "Le préfixe 237 est retiré automatiquement" },
      { format: "+237677179670", ok: true, note: "Le +237 est retiré automatiquement" },
      { format: "00237677179670", ok: true, note: "Le 00237 est retiré automatiquement" },
    ],
    phoneReco: "Recommandation :",
    phoneRecoDesc: "Envoyez directement le format à 9 chiffres pour éviter toute ambiguïté.",

    // Webhooks
    webhooksTitle: "Webhooks",
    webhooksDesc: (
      <>
        LTCPay envoie des requêtes <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">POST</code>
        {" "}à votre <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">callback_url</code> lorsque le
        statut d&apos;un paiement change. Le payload est signé avec HMAC-SHA256 en utilisant votre <strong>webhook secret</strong>.
      </>
    ),
    webhooksNote: (
      <>
        <strong>Note :</strong> Les webhooks fonctionnent de manière identique pour les modes SDK et Direct API. Vous recevrez le même payload lorsqu&apos;un paiement atteint un statut terminal (<code className="rounded bg-blue-100 px-1 py-0.5 text-xs">COMPLETED</code>, <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">FAILED</code>, etc.).
      </>
    ),
    webhookHeadersTitle: "Headers des webhooks",
    webhookHeadersDesc: "Chaque requête webhook inclut les headers suivants :",
    headerCol: "Header",
    descriptionCol: "Description",
    webhookHeaders: [
      { header: "X-LtcPay-Signature", desc: "Signature HMAC-SHA256 du body JSON brut" },
      { header: "X-LtcPay-Event", desc: "Type d\u2019événement (ex: payment.status_changed)" },
      { header: "X-LtcPay-Delivery-Id", desc: "ID de livraison unique pour l\u2019idempotence" },
    ],
    webhookPayloadTitle: "Payload du webhook",
    webhookPayloadDesc: (
      <>
        L&apos;événement est toujours <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">payment.status_changed</code>. Vérifiez le champ <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">data.status</code> pour déterminer le nouveau statut.
      </>
    ),

    // Signature verification
    sigVerifyTitle: "Vérification des signatures",
    sigVerifyDesc: (
      <>
        La signature est calculée comme <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">HMAC-SHA256(raw_body, webhook_secret)</code>. Vous <strong>devez</strong> vérifier la signature en utilisant le body brut de la requête (pas une version re-sérialisée) pour éviter les erreurs.
      </>
    ),

    // Payment statuses
    statusTitle: "Statuts de paiement",
    statusCol: "Statut",
    terminalCol: "Terminal ?",
    statusRows: [
      { status: "PENDING", desc: "Paiement créé, en attente d\u2019action du client (mode SDK)", terminal: false },
      { status: "PROCESSING", desc: "Paiement initié via Direct API, le client a reçu la notification push", terminal: false },
      { status: "COMPLETED", desc: "Paiement traité avec succès", terminal: true, success: true },
      { status: "FAILED", desc: "Paiement échoué (solde insuffisant, timeout, refusé, etc.)", terminal: true, success: false },
      { status: "EXPIRED", desc: "Lien de paiement expiré (30 minutes en mode SDK)", terminal: true, success: false },
      { status: "CANCELLED", desc: "Paiement annulé par le client", terminal: true, success: false },
    ],
    yes: "Oui",
    no: "Non",

    // Retry policy
    retryTitle: "Politique de réessai",
    retryDesc: (
      <>
        Si votre endpoint retourne un code non-2xx, LTCPay réessaie jusqu&apos;à <strong>5 fois</strong> avec
        un backoff exponentiel (2s, 4s, 8s, 16s, 32s). Votre endpoint doit répondre en moins de <strong>30 secondes</strong>.
      </>
    ),

    // Webhook troubleshooting
    troubleshootTitle: "Dépannage : \"Invalid webhook signature\"",
    troubleshootDesc: (
      <>Si vous recevez une erreur <code className="rounded bg-red-100 px-1 py-0.5 text-xs">403 Invalid webhook signature</code>, vérifiez les points suivants :</>
    ),
    troubleshootBullets: [
      <>Lisez la signature depuis le header <code className="rounded bg-red-100 px-1 py-0.5 text-xs">X-LtcPay-Signature</code> (et non <code className="rounded bg-red-100 px-1 py-0.5 text-xs">X-Webhook-Signature</code>)</>,
      <>Utilisez le <strong>body brut de la requête</strong> pour la vérification HMAC &mdash; ne re-sérialisez PAS le JSON parsé (<code className="rounded bg-red-100 px-1 py-0.5 text-xs">JSON.stringify(req.body)</code> peut produire un formatage différent)</>,
      <>Assurez-vous d&apos;utiliser votre <strong>webhook secret marchand</strong> (défini lors de l&apos;inscription), et non votre clé API ou secret API</>,
      <>L&apos;algorithme de signature est <code className="rounded bg-red-100 px-1 py-0.5 text-xs">HMAC-SHA256</code> avec sortie hex digest</>,
      "Si vous n\u2019avez pas de webhook secret, contactez l\u2019administrateur LTCPay pour en configurer un",
    ],

    // Error Handling
    errorsTitle: "Gestion des erreurs",
    errorsDesc: (
      <>
        L&apos;API retourne des codes HTTP standards. Les erreurs incluent un body JSON avec un champ <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">detail</code>.
      </>
    ),
    codeCol: "Code",
    meaningCol: "Signification",
    errorCodes: [
      { code: "200", desc: "Succès" },
      { code: "201", desc: "Ressource créée" },
      { code: "400", desc: "Requête invalide — vérifiez les paramètres" },
      { code: "401", desc: "Identifiants API invalides ou manquants" },
      { code: "404", desc: "Ressource introuvable" },
      { code: "409", desc: "Conflit (ex: email déjà utilisé)" },
      { code: "429", desc: "Limite de requêtes dépassée" },
      { code: "500", desc: "Erreur serveur — contactez le support" },
    ],

    // Test Mode
    testTitle: "Mode test",
    testSubtitle: "Tests en sandbox",
    testBullets: [
      <>Utilisez votre <strong>clé API de test</strong> (<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">ltcpay_test_*</code>) — aucun argent réel n&apos;est débité</>,
      "Tous les endpoints fonctionnent de manière identique en mode test et live",
      "Les paiements de test se complètent automatiquement après quelques secondes",
      "Les webhooks sont envoyés pour les paiements de test comme pour les paiements réels",
      <>Passez à votre <strong>clé API live</strong> (<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">ltcpay_live_*</code>) quand vous êtes prêt pour la production</>,
    ],

    // Footer
    footerHelp: "Besoin d\u2019aide ? Contactez-nous à ",
    footerTagline: "LTCPay — Passerelle de paiement pour l\u2019Afrique",

    // ParamTable headers
    paramHeader: "Paramètre",
    typeHeader: "Type",
    requiredHeader: "Requis",
    descHeader: "Description",
    required: "requis",
    optional: "optionnel",

    // ResponseBlock
    responseLabel: "Réponse",
  },
  en: {
    // Header
    apiDocs: "API Docs",
    copyDocs: "Copy docs",
    copied: "Copied!",
    dashboard: "Dashboard",

    // Hero
    heroTitle: "API Documentation",
    heroDesc: "Integrate LTCPay into your application to accept payments via Mobile Money and other local payment methods in Africa.",
    baseUrl: "Base URL",

    // Integration Modes
    integrationModes: "Integration Modes",
    unifiedFlowTitle: "Unified Payment Flow — No More Browser Redirects!",
    unifiedFlowDesc: (
      <>
        Both <strong>SDK</strong> and <strong>Direct API</strong> modes use the same <strong>native payment interface</strong> via TouchPay Direct API.
        All payments are processed server-to-server with <strong>zero browser redirects</strong>.
      </>
    ),

    // SDK Mode card
    sdkTitle: "Payment Links",
    sdkIdealFor: "Ideal for:",
    sdkIdealDesc: "Reusable payment links, QR codes, invoices",
    sdkBullets: [
      <>Create a payment <strong>without</strong> operator/phone</>,
      "Customer chooses on the LtcPay payment page",
      "\u2713 No browser redirects",
      "Native form with operator selector + phone input",
      "Polling for real-time updates",
    ],
    sdkFooter: "Perfect for shareable payment URLs",

    // Direct API Mode card
    directTitle: "Mobile Apps",
    directIdealFor: "Ideal for:",
    directIdealDesc: "Native mobile apps with custom UI",
    directBullets: [
      <>Provide operator + phone <strong>at creation</strong></>,
      "Immediate server-to-server initiation",
      "\u2713 No browser/WebView needed",
      "Build your own native UI",
      "Poll via API for status updates",
    ],
    directFooter: "\u26A0\uFE0F Required: operator + customer_phone at creation",

    // Auto-detection banner
    autoDetectTitle: "\u2728 Automatic Mode Detection — No Configuration Needed!",
    autoDetectDesc: (
      <>The payment mode is <strong>automatically detected</strong> based on the fields provided:</>
    ),
    autoDetectBullets: [
      <><strong>Without</strong> operator/phone → SDK mode (customer enters info on payment page)</>,
      <><strong>With</strong> operator + phone → Direct API mode (immediate initiation)</>,
    ],
    autoDetectFooter: (
      <>Both modes are <strong>always available</strong> — create the payment and the system picks the right mode automatically!</>
    ),

    // Comparison table
    comparisonTitle: "Mode Comparison",
    compFeature: "Feature",
    compSdk: "SDK (Payment Links)",
    compDirect: "Direct API (Mobile)",
    compRows: [
      { feature: "Ideal for", sdk: "Payment links, QR codes, invoices", direct: "Native mobile apps with custom UI" },
      { feature: "Browser redirects", sdk: "\u2713 No redirects", direct: "\u2713 No redirects", bold: true },
      { feature: "Required at creation", sdk: "amount, currency", direct: "amount, currency, operator, customer_phone", directBold: true },
      { feature: "Operator selection", sdk: "Customer chooses on LtcPay page", direct: "Merchant provides at creation" },
      { feature: "Initial status", sdk: "PENDING", direct: "PROCESSING", code: true },
      { feature: "Payment interface", sdk: "LtcPay native form (operator + phone)", direct: "Your own native UI" },
      { feature: "Payment initiation", sdk: "On submission → TouchPay Direct API", direct: "Immediate → TouchPay Direct API" },
      { feature: "Status check", sdk: "Auto-polling on page + webhooks", direct: "Poll GET /payments/{reference} + webhooks" },
      { feature: "Integration complexity", sdk: "\u2B50\u2B50\u2B50 Simple (redirect)", direct: "\u2B50\u2B50\u2B50\u2B50 Medium (UI + polling)" },
      { feature: "Reusable links", sdk: "\u2713 Yes — perfect for invoices", direct: "\u2717 No — tied to a specific customer" },
    ],

    // Direct API tip box
    directApiTipTitle: "\uD83D\uDCA1 Direct API Mode (Immediate Initiation)",
    directApiTipDesc: (
      <>To trigger <strong>Direct API mode</strong> with immediate initiation, provide <strong>both</strong> fields:</>
    ),
    directApiTipOperator: "Mobile Money operator: ",
    directApiTipPhone: "Customer phone number (9 digits without country code, e.g.: ",
    directApiTipFallback: (
      <>Without these fields, the payment uses <strong>SDK mode</strong> (customer enters info on the payment page).</>
    ),

    // Authentication
    authTitle: "Authentication",
    authDesc: (
      <>
        All API requests must include your API key in the <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-API-Key</code>
        {" "}header and your API secret in the <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">X-API-Secret</code> header.
        Use <strong>test keys</strong> (<code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">ltcpay_test_*</code>) for sandbox
        {" "}and <strong>live keys</strong> (<code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">ltcpay_live_*</code>) for production.
      </>
    ),

    // Endpoints
    endpointsTitle: "Endpoints",

    // Create Payment
    createPaymentTitle: "Create a payment",
    createPaymentDesc: "Create a new payment. The mode is automatically detected — no configuration needed!",
    autoDetectEndpointTitle: "\u2728 Automatic mode detection",
    autoDetectEndpointBullets: [
      <><strong>Without operator/phone:</strong> SDK mode → returns <code className="rounded bg-green-100 px-1 py-0.5 text-xs">payment_url</code> → customer enters info on page</>,
      <><strong>With operator + phone:</strong> Direct API mode → immediate initiation → status <code className="rounded bg-green-100 px-1 py-0.5 text-xs">PROCESSING</code></>,
      <>No need to specify <code className="rounded bg-green-100 px-1 py-0.5 text-xs">payment_mode</code> — it&apos;s automatic!</>,
      "Both modes use TouchPay Direct API (zero browser redirects)",
    ],

    // Param descriptions
    paramAmount: "Amount in currency unit (e.g.: 5000 = 5,000 XAF). Minimum: 100.",
    paramCurrency: "ISO currency code (XAF, XOF, EUR, USD). Default: XAF",
    paramOperator: "Mobile Money operator: 'MTN' or 'ORANGE'. Triggers Direct API mode if provided with customer_phone.",
    paramPhone: "Customer phone (9 digits without country code, e.g.: 677179670). Country prefix is stripped automatically.",
    paramPaymentMode: "Force mode: 'SDK' or 'DIRECT_API'. Auto-detected if omitted (recommended).",
    paramMerchantRef: "Your internal order/invoice reference for reconciliation",
    paramDescription: "Payment description shown to the customer (max 500 characters)",
    paramCustomerInfo: "Customer information: {name, email, phone}",
    paramCallbackUrl: "Webhook URL for payment notifications (overrides merchant default)",
    paramReturnUrl: "Customer redirect URL after payment",
    paramMetadata: "Custom key-value data attached to the payment",

    // Create payment examples
    exSdkTitle: "Example 1: SDK Mode (Payment Links)",
    exDirectTitle: "Example 2: Direct API Mode (Mobile apps with custom UI)",
    exPythonTitle: "Python Examples",
    responseSdkTitle: "Response (SDK Mode)",
    responseDirectTitle: "Response (Direct API Mode)",
    responseDirectNote: (
      <>
        <strong>Note:</strong> In Direct API mode, the status immediately becomes <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">PROCESSING</code> because the payment is initiated server-to-server. The customer receives a push notification to approve on their Mobile Money app.
      </>
    ),

    // Get Payment
    getPaymentTitle: "Payment status",
    getPaymentDesc: "Retrieve the status and details of a payment by its reference. In Direct API mode, poll this endpoint every 3-5 seconds to check if the payment is complete.",
    pollingTitle: "Direct API Polling:",
    pollingDesc: (
      <>
        Mobile apps in Direct API mode should poll this endpoint every 3-5 seconds to check status.
        Stop polling when status becomes <code className="rounded bg-green-100 px-1 py-0.5 text-xs">COMPLETED</code>, <code className="rounded bg-green-100 px-1 py-0.5 text-xs">FAILED</code>, or after 2 minutes (timeout).
      </>
    ),

    // List Payments
    listPaymentsTitle: "List payments",
    listPaymentsDesc: "List all payments for the authenticated merchant. Supports pagination and status filtering.",
    paramPage: "Page number (default: 1)",
    paramPageSize: "Items per page, 1-100 (default: 20)",
    paramStatus: "Filter by status: PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED, CANCELLED",

    // Fees
    feesTitle: "Fees",
    feesDesc: "Fees are applied to each payment. The commission rate is configured by the LtcPay administrator for each merchant. By default, fees are borne by the merchant (deducted from the received amount).",
    feeModeTitle: "Fee allocation mode",
    feeMode: "Mode",
    feeWhoPays: "Who pays?",
    feeExample: "Example (amount: 10,000 XAF)",
    feeMerchantDesc: "The merchant bears the fees. The customer pays the exact amount.",
    feeMerchantEx: (<>Customer pays <strong>10,000</strong>, merchant receives amount - fees</>),
    feeClientDesc: "The customer pays the fees on top of the amount. The merchant receives the full amount.",
    feeClientEx: (<>Customer pays <strong>10,000 + fees</strong>, merchant receives 10,000</>),
    feeNote: (
      <>
        The <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">fee</code> field is returned in all payment responses and in webhooks. In <strong>CLIENT</strong> mode, the <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">amount</code> field reflects the total billed amount (base amount + fees).
      </>
    ),

    // Phone Format
    phoneTitle: "Phone Number Format",
    phoneDesc: (
      <>
        For <strong>Direct API</strong> mode, the phone number must contain <strong>9 digits</strong> without country code.
        LtcPay automatically normalizes the number by stripping the <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">237</code> prefix.
      </>
    ),
    phoneSent: "Format sent",
    phoneAccepted: "Accepted?",
    phoneNotes: "Notes",
    phoneRows: [
      { format: "677179670", ok: true, note: "Correct format (9 digits)" },
      { format: "237677179670", ok: true, note: "237 prefix is stripped automatically" },
      { format: "+237677179670", ok: true, note: "+237 is stripped automatically" },
      { format: "00237677179670", ok: true, note: "00237 is stripped automatically" },
    ],
    phoneReco: "Recommendation:",
    phoneRecoDesc: "Send the 9-digit format directly to avoid any ambiguity.",

    // Webhooks
    webhooksTitle: "Webhooks",
    webhooksDesc: (
      <>
        LTCPay sends <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">POST</code>
        {" "}requests to your <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">callback_url</code> when a
        payment status changes. The payload is signed with HMAC-SHA256 using your <strong>webhook secret</strong>.
      </>
    ),
    webhooksNote: (
      <>
        <strong>Note:</strong> Webhooks work identically for both SDK and Direct API modes. You will receive the same payload when a payment reaches a terminal status (<code className="rounded bg-blue-100 px-1 py-0.5 text-xs">COMPLETED</code>, <code className="rounded bg-blue-100 px-1 py-0.5 text-xs">FAILED</code>, etc.).
      </>
    ),
    webhookHeadersTitle: "Webhook Headers",
    webhookHeadersDesc: "Each webhook request includes the following headers:",
    headerCol: "Header",
    descriptionCol: "Description",
    webhookHeaders: [
      { header: "X-LtcPay-Signature", desc: "HMAC-SHA256 signature of the raw JSON body" },
      { header: "X-LtcPay-Event", desc: "Event type (e.g.: payment.status_changed)" },
      { header: "X-LtcPay-Delivery-Id", desc: "Unique delivery ID for idempotency" },
    ],
    webhookPayloadTitle: "Webhook Payload",
    webhookPayloadDesc: (
      <>
        The event is always <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">payment.status_changed</code>. Check the <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">data.status</code> field to determine the new status.
      </>
    ),

    // Signature verification
    sigVerifyTitle: "Signature Verification",
    sigVerifyDesc: (
      <>
        The signature is computed as <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">HMAC-SHA256(raw_body, webhook_secret)</code>. You <strong>must</strong> verify the signature using the raw request body (not a re-serialized version) to avoid errors.
      </>
    ),

    // Payment statuses
    statusTitle: "Payment Statuses",
    statusCol: "Status",
    terminalCol: "Terminal?",
    statusRows: [
      { status: "PENDING", desc: "Payment created, awaiting customer action (SDK mode)", terminal: false },
      { status: "PROCESSING", desc: "Payment initiated via Direct API, customer received push notification", terminal: false },
      { status: "COMPLETED", desc: "Payment processed successfully", terminal: true, success: true },
      { status: "FAILED", desc: "Payment failed (insufficient balance, timeout, rejected, etc.)", terminal: true, success: false },
      { status: "EXPIRED", desc: "Payment link expired (30 minutes in SDK mode)", terminal: true, success: false },
      { status: "CANCELLED", desc: "Payment cancelled by the customer", terminal: true, success: false },
    ],
    yes: "Yes",
    no: "No",

    // Retry policy
    retryTitle: "Retry Policy",
    retryDesc: (
      <>
        If your endpoint returns a non-2xx code, LTCPay retries up to <strong>5 times</strong> with
        exponential backoff (2s, 4s, 8s, 16s, 32s). Your endpoint must respond within <strong>30 seconds</strong>.
      </>
    ),

    // Webhook troubleshooting
    troubleshootTitle: "Troubleshooting: \"Invalid webhook signature\"",
    troubleshootDesc: (
      <>If you receive a <code className="rounded bg-red-100 px-1 py-0.5 text-xs">403 Invalid webhook signature</code> error, check the following:</>
    ),
    troubleshootBullets: [
      <>Read the signature from the <code className="rounded bg-red-100 px-1 py-0.5 text-xs">X-LtcPay-Signature</code> header (not <code className="rounded bg-red-100 px-1 py-0.5 text-xs">X-Webhook-Signature</code>)</>,
      <>Use the <strong>raw request body</strong> for HMAC verification &mdash; do NOT re-serialize the parsed JSON (<code className="rounded bg-red-100 px-1 py-0.5 text-xs">JSON.stringify(req.body)</code> may produce different formatting)</>,
      <>Make sure you are using your <strong>merchant webhook secret</strong> (set during registration), not your API key or API secret</>,
      <>The signing algorithm is <code className="rounded bg-red-100 px-1 py-0.5 text-xs">HMAC-SHA256</code> with hex digest output</>,
      "If you don\u2019t have a webhook secret, contact the LTCPay administrator to set one up",
    ],

    // Error Handling
    errorsTitle: "Error Handling",
    errorsDesc: (
      <>
        The API returns standard HTTP codes. Errors include a JSON body with a <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">detail</code> field.
      </>
    ),
    codeCol: "Code",
    meaningCol: "Meaning",
    errorCodes: [
      { code: "200", desc: "Success" },
      { code: "201", desc: "Resource created" },
      { code: "400", desc: "Invalid request — check parameters" },
      { code: "401", desc: "Invalid or missing API credentials" },
      { code: "404", desc: "Resource not found" },
      { code: "409", desc: "Conflict (e.g.: email already in use)" },
      { code: "429", desc: "Rate limit exceeded" },
      { code: "500", desc: "Server error — contact support" },
    ],

    // Test Mode
    testTitle: "Test Mode",
    testSubtitle: "Sandbox Testing",
    testBullets: [
      <>Use your <strong>test API key</strong> (<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">ltcpay_test_*</code>) — no real money is charged</>,
      "All endpoints work identically in test and live mode",
      "Test payments complete automatically after a few seconds",
      "Webhooks are sent for test payments just like real payments",
      <>Switch to your <strong>live API key</strong> (<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">ltcpay_live_*</code>) when you are ready for production</>,
    ],

    // Footer
    footerHelp: "Need help? Contact us at ",
    footerTagline: "LTCPay — Payment Gateway for Africa",

    // ParamTable headers
    paramHeader: "Parameter",
    typeHeader: "Type",
    requiredHeader: "Required",
    descHeader: "Description",
    required: "required",
    optional: "optional",

    // ResponseBlock
    responseLabel: "Response",
  },
} as const;

type Lang = "fr" | "en";
type Translations = typeof translations;
type T = Translations[Lang];

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative mt-3 rounded-lg bg-[#0d1117] text-sm">
      <div className="flex items-center justify-between border-b border-gray-700/50 px-4 py-2">
        <span className="text-xs text-gray-400">{language}</span>
        <button onClick={copy} className="text-gray-400 hover:text-white transition-colors">
          {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-gray-300 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EndpointSection({
  method,
  path,
  title,
  description,
  children,
  defaultOpen = false,
}: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  title: string;
  description: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const methodColors: Record<string, string> = {
    GET: "bg-green-500/10 text-green-400 border-green-500/20",
    POST: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    PATCH: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    DELETE: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        )}
        <span
          className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-bold ${methodColors[method]}`}
        >
          {method}
        </span>
        <code className="text-sm text-gray-600 font-mono">{path}</code>
        <span className="ml-auto text-sm font-medium text-gray-900">{title}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-5 space-y-4">
          <p className="text-sm text-gray-600">{description}</p>
          {children}
        </div>
      )}
    </div>
  );
}

function ParamTable({ params, t }: { params: { name: string; type: string; required: boolean; desc: string }[]; t: T }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="pb-2 font-medium">{t.paramHeader}</th>
            <th className="pb-2 font-medium">{t.typeHeader}</th>
            <th className="pb-2 font-medium">{t.requiredHeader}</th>
            <th className="pb-2 font-medium">{t.descHeader}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {params.map((p) => (
            <tr key={p.name}>
              <td className="py-2 font-mono text-xs text-gray-800">{p.name}</td>
              <td className="py-2 text-xs text-gray-500">{p.type}</td>
              <td className="py-2">
                {p.required ? (
                  <span className="text-xs font-medium text-red-500">{t.required}</span>
                ) : (
                  <span className="text-xs text-gray-400">{t.optional}</span>
                )}
              </td>
              <td className="py-2 text-xs text-gray-600">{p.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponseBlock({ status, body, t }: { status: number; body: string; t: T }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-medium text-gray-500">{t.responseLabel}</span>
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${status < 300 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
          {status}
        </span>
      </div>
      <CodeBlock language="json" code={body} />
    </div>
  );
}

function CopyDocsButton({ t }: { t: T }) {
  const [copied, setCopied] = useState(false);
  const copyDocs = () => {
    const main = document.querySelector("main");
    if (!main) return;
    const blocks: string[] = [];
    main.querySelectorAll("section, .rounded-xl").forEach((section) => {
      const headings = section.querySelectorAll("h1, h2, h3");
      headings.forEach((h) => {
        const level = h.tagName === "H1" ? "#" : h.tagName === "H2" ? "##" : "###";
        blocks.push(`${level} ${h.textContent}`);
      });
    });
    const text = main.innerText || main.textContent || "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <button
      onClick={copyDocs}
      className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      {copied ? t.copied : t.copyDocs}
    </button>
  );
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
      <button
        onClick={() => setLang("fr")}
        className={`px-3 py-2 transition-colors ${lang === "fr" ? "bg-navy-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
      >
        FR
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-2 transition-colors ${lang === "en" ? "bg-navy-500 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
      >
        EN
      </button>
    </div>
  );
}

export default function DocsPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const t = translations[lang];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400">
              <span className="text-sm font-bold text-navy-800">LP</span>
            </div>
            <span className="text-lg font-bold text-navy-500">LTCPay</span>
            <span className="ml-2 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
              {t.apiDocs}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LangToggle lang={lang} setLang={setLang} />
            <CopyDocsButton t={t} />
            <Link
              href="/auth/login"
              className="rounded-lg bg-navy-500 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600 transition-colors"
            >
              {t.dashboard}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        {/* Hero */}
        <section>
          <h1 className="text-3xl font-bold text-gray-900">{t.heroTitle}</h1>
          <p className="mt-2 text-gray-600 max-w-2xl">{t.heroDesc}</p>
          <div className="mt-5 rounded-xl bg-navy-500 p-5">
            <p className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-1">{t.baseUrl}</p>
            <code className="text-lg font-mono text-white">{BASE_URL}</code>
          </div>
        </section>

        {/* Integration Modes */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="integration-modes">{t.integrationModes}</h2>

          <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎉</span>
              <h3 className="text-base font-bold text-blue-900">{t.unifiedFlowTitle}</h3>
            </div>
            <p className="text-sm text-blue-800">{t.unifiedFlowDesc}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* SDK Mode */}
            <div className="rounded-xl border-2 border-purple-200 bg-purple-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-purple-500 px-2 py-1 text-xs font-bold text-white">SDK</span>
                <h3 className="text-sm font-semibold text-purple-900">{t.sdkTitle}</h3>
              </div>
              <p className="text-sm text-purple-800">
                <strong>{t.sdkIdealFor}</strong> {t.sdkIdealDesc}
              </p>
              <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
                {t.sdkBullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
              <div className="pt-2 border-t border-purple-200">
                <p className="text-xs font-medium text-purple-700">{t.sdkFooter}</p>
              </div>
            </div>

            {/* Direct API Mode */}
            <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-green-500 px-2 py-1 text-xs font-bold text-white">DIRECT_API</span>
                <h3 className="text-sm font-semibold text-green-900">{t.directTitle}</h3>
              </div>
              <p className="text-sm text-green-800">
                <strong>{t.directIdealFor}</strong> {t.directIdealDesc}
              </p>
              <ul className="text-sm text-green-800 space-y-1 list-disc list-inside">
                {t.directBullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
              <div className="pt-2 border-t border-green-200">
                <p className="text-xs font-bold text-green-900">{t.directFooter}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4 space-y-2">
            <p className="text-sm font-bold text-green-900">{t.autoDetectTitle}</p>
            <p className="text-sm text-green-800">{t.autoDetectDesc}</p>
            <ul className="text-sm text-green-800 space-y-1 list-disc list-inside ml-2">
              {t.autoDetectBullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
            <p className="text-sm text-green-800">{t.autoDetectFooter}</p>
          </div>

          {/* Comparison Table */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t.comparisonTitle}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 pr-4 font-medium">{t.compFeature}</th>
                    <th className="pb-2 pr-4 font-medium">{t.compSdk}</th>
                    <th className="pb-2 font-medium">{t.compDirect}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {t.compRows.map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-4 font-medium text-gray-700">{row.feature}</td>
                      <td className="py-2 pr-4 text-xs text-gray-600">
                        {(row as any).code ? <code className="text-xs rounded bg-gray-100 px-1 py-0.5">{row.sdk}</code> : (row as any).bold ? <strong>{row.sdk}</strong> : row.sdk}
                      </td>
                      <td className="py-2 text-xs text-gray-600">
                        {(row as any).code ? <code className="text-xs rounded bg-gray-100 px-1 py-0.5">{row.direct}</code> : ((row as any).directBold || (row as any).bold) ? <strong>{row.direct}</strong> : row.direct}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-amber-900">{t.directApiTipTitle}</h3>
            <p className="text-sm text-amber-800">{t.directApiTipDesc}</p>
            <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
              <li><code className="rounded bg-amber-100 px-1 py-0.5 text-xs">operator</code> — {t.directApiTipOperator}<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">&quot;MTN&quot;</code> {lang === "fr" ? "ou" : "or"} <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">&quot;ORANGE&quot;</code></li>
              <li><code className="rounded bg-amber-100 px-1 py-0.5 text-xs">customer_phone</code> — {t.directApiTipPhone}<code className="rounded bg-amber-100 px-1 py-0.5 text-xs">6XXXXXXXX</code>)</li>
            </ul>
            <p className="text-sm text-amber-800">{t.directApiTipFallback}</p>
          </div>
        </section>

        {/* Authentication */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="authentication">{t.authTitle}</h2>
          <p className="text-sm text-gray-600">{t.authDesc}</p>
          <CodeBlock
            language="bash"
            code={`curl -X POST ${BASE_URL}/payments \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ltcpay_test_abc123..." \\
  -H "X-API-Secret: your_api_secret" \\
  -d '{"amount": 5000, "currency": "XAF"}'`}
          />
          <CodeBlock
            language="javascript"
            code={`// Node.js / Fetch
const response = await fetch("${BASE_URL}/payments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.LTCPAY_API_KEY,
    "X-API-Secret": process.env.LTCPAY_API_SECRET,
  },
  body: JSON.stringify({ amount: 5000, currency: "XAF" }),
});
const payment = await response.json();`}
          />
          <CodeBlock
            language="python"
            code={`import httpx

headers = {
    "X-API-Key": "ltcpay_test_abc123...",
    "X-API-Secret": "your_api_secret",
}

resp = httpx.post(
    "${BASE_URL}/payments",
    headers=headers,
    json={"amount": 5000, "currency": "XAF"},
)
payment = resp.json()`}
          />
        </section>

        {/* Endpoints */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="endpoints">{t.endpointsTitle}</h2>

          {/* Create Payment */}
          <EndpointSection
            method="POST"
            path="/payments"
            title={t.createPaymentTitle}
            description={t.createPaymentDesc}
            defaultOpen
          >
            <div className="mb-4 rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <p className="text-sm font-bold text-green-900 mb-2">{t.autoDetectEndpointTitle}</p>
              <ul className="text-sm text-green-800 space-y-1.5 list-disc list-inside">
                {t.autoDetectEndpointBullets.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>

            <ParamTable
              t={t}
              params={[
                { name: "amount", type: "number", required: true, desc: t.paramAmount },
                { name: "currency", type: "string", required: false, desc: t.paramCurrency },
                { name: "operator", type: "string", required: false, desc: t.paramOperator },
                { name: "customer_phone", type: "string", required: false, desc: t.paramPhone },
                { name: "payment_mode", type: "string", required: false, desc: t.paramPaymentMode },
                { name: "merchant_reference", type: "string", required: false, desc: t.paramMerchantRef },
                { name: "description", type: "string", required: false, desc: t.paramDescription },
                { name: "customer_info", type: "object", required: false, desc: t.paramCustomerInfo },
                { name: "callback_url", type: "string", required: false, desc: t.paramCallbackUrl },
                { name: "return_url", type: "string", required: false, desc: t.paramReturnUrl },
                { name: "metadata", type: "object", required: false, desc: t.paramMetadata },
              ]}
            />
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">{t.exSdkTitle}</h4>
              <CodeBlock
                language="javascript"
                code={`// SDK Mode - Create reusable payment link
// Customer will choose operator + enter phone on LtcPay payment page
const response = await fetch("${BASE_URL}/payments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "ltcpay_test_abc123...",
    "X-API-Secret": "your_api_secret",
  },
  body: JSON.stringify({
    amount: 5000,
    currency: "XAF",
    // payment_mode: "SDK",  // Optional - auto-detected (SDK when no operator/phone)
    description: "Order #1234",
    customer_info: {
      name: "Jean Dupont",
      email: "jean@example.com"
    },
    return_url: "https://myshop.cm/order/1234/success",
    metadata: { order_id: "1234" },
  }),
});

const payment = await response.json();
console.log(payment.reference);    // "PAY-A1B2C3"
console.log(payment.status);       // "PENDING"
console.log(payment.payment_url);  // "https://pay.ltcgroup.site/pay/PAY-A1B2C3"

// Redirect customer to LtcPay native payment page
// No redirections to TouchPay - everything happens on LtcPay page!
window.location.href = payment.payment_url;

// Customer will see:
// 1. Native form with MTN/Orange selector
// 2. Phone number input
// 3. Submit → TouchPay Direct API initiation
// 4. Polling UI → redirect to return_url when COMPLETED`}
              />

              <h4 className="text-sm font-semibold text-gray-900">{t.exDirectTitle}</h4>
              <CodeBlock
                language="javascript"
                code={`// Direct API Mode - For mobile apps building custom native UI
// App shows its own operator selector + phone input, then creates payment
// ⚠️ IMPORTANT: operator and customer_phone are REQUIRED
const response = await fetch("${BASE_URL}/payments", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "ltcpay_test_abc123...",
    "X-API-Secret": "your_api_secret",
  },
  body: JSON.stringify({
    amount: 5000,
    currency: "XAF",
    // payment_mode: "DIRECT_API",       // Optional - auto-detected when operator+phone provided
    operator: "MTN",                      // Triggers Direct API mode
    customer_phone: "670000000",          // 9 digits sans indicatif (237 auto-stripped)
    description: "Order #1234",
    customer_info: {
      name: "Jean Dupont",
      email: "jean@example.com"
    },
    metadata: { order_id: "1234" },
  }),
});

const payment = await response.json();
console.log(payment.reference);  // "PAY-A1B2C3"
console.log(payment.status);     // "PROCESSING" - payment initiated immediately!

// Backend called TouchPay Direct API - customer receives push notification
// App shows native "Confirm on your phone" UI + polls for status
async function pollPaymentStatus(reference) {
  const maxAttempts = 40; // 2 minutes max
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const statusResp = await fetch(\`${BASE_URL}/payments/\${reference}\`, {
      headers: {
        "X-API-Key": "ltcpay_test_abc123...",
        "X-API-Secret": "your_api_secret",
      },
    });

    const payment = await statusResp.json();

    if (payment.status === "COMPLETED") {
      // Show success screen in app
      console.log("Payment successful!");
      return payment;
    } else if (payment.status === "FAILED") {
      // Show error screen in app
      console.log("Payment failed");
      return payment;
    }
  }
  console.log("Payment timeout");
}

pollPaymentStatus(payment.reference);`}
              />

              <h4 className="text-sm font-semibold text-gray-900">{t.exPythonTitle}</h4>
              <CodeBlock
                language="python"
                code={`import httpx
import time

headers = {
    "X-API-Key": "ltcpay_test_abc123...",
    "X-API-Secret": "your_api_secret",
}

# SDK Mode (web) - no operator/phone → auto-detected as SDK
sdk_payment = httpx.post(
    "${BASE_URL}/payments",
    headers=headers,
    json={
        "amount": 5000,
        "currency": "XAF",
        # "payment_mode": "SDK",  # Optional - auto-detected
        "description": "Order #1234",
        "customer_info": {
            "name": "Jean Dupont",
            "email": "jean@example.com",
        },
    },
).json()
print(f"Redirect to: {sdk_payment['payment_url']}")

# Direct API Mode (mobile) - operator+phone → auto-detected as DIRECT_API
direct_payment = httpx.post(
    "${BASE_URL}/payments",
    headers=headers,
    json={
        "amount": 5000,
        "currency": "XAF",
        # "payment_mode": "DIRECT_API",  # Optional - auto-detected
        "operator": "MTN",              # Triggers Direct API mode
        "customer_phone": "670000000",    # 9 digits sans indicatif
        "description": "Order #1234",
    },
).json()
print(f"Status: {direct_payment['status']}")  # "PROCESSING"

# Poll for completion
def poll_payment(reference: str, max_attempts: int = 40):
    for _ in range(max_attempts):
        time.sleep(3)
        payment = httpx.get(
            f"${BASE_URL}/payments/{reference}",
            headers=headers,
        ).json()

        if payment["status"] in ("COMPLETED", "FAILED"):
            return payment

    return None  # Timeout

result = poll_payment(direct_payment["reference"])
print(f"Final status: {result['status']}")`}
              />
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">{t.responseSdkTitle}</h4>
              <ResponseBlock
                t={t}
                status={201}
                body={`{
  "payment_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "reference": "PAY-A1B2C3",
  "payment_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "amount": "5000.00",
  "currency": "XAF",
  "status": "PENDING",
  "payment_mode": "SDK",
  "payment_url": "https://pay.ltcgroup.site/pay/PAY-A1B2C3",
  "created_at": "2026-04-09T12:00:00Z"
}`}
              />

              <h4 className="text-sm font-semibold text-gray-900">{t.responseDirectTitle}</h4>
              <ResponseBlock
                t={t}
                status={201}
                body={`{
  "payment_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "reference": "PAY-A1B2C3",
  "payment_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "amount": "5000.00",
  "currency": "XAF",
  "status": "PROCESSING",
  "payment_mode": "DIRECT_API",
  "payment_url": "https://pay.ltcgroup.site/pay/PAY-A1B2C3",
  "created_at": "2026-04-09T12:00:00Z"
}`}
              />
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-800">{t.responseDirectNote}</p>
              </div>
            </div>
          </EndpointSection>

          {/* Get Payment */}
          <EndpointSection
            method="GET"
            path="/payments/{reference}"
            title={t.getPaymentTitle}
            description={t.getPaymentDesc}
          >
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-900 mb-2">{t.pollingTitle}</p>
              <p className="text-sm text-green-800">{t.pollingDesc}</p>
            </div>
            <CodeBlock
              language="javascript"
              code={`// Get payment status by reference
const response = await fetch(
  "${BASE_URL}/payments/PAY-A1B2C3",
  {
    headers: {
      "X-API-Key": "ltcpay_test_abc123...",
      "X-API-Secret": "your_api_secret",
    },
  }
);
const payment = await response.json();
console.log(payment.status);
// "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "EXPIRED" | "CANCELLED"`}
            />
            <CodeBlock
              language="python"
              code={`# Get payment status
resp = httpx.get(
    f"${BASE_URL}/payments/{reference}",
    headers=headers,
)
payment = resp.json()
print(payment["status"])  # "COMPLETED"`}
            />
            <ResponseBlock
              t={t}
              status={200}
              body={`{
  "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "merchant_id": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "reference": "PAY-A1B2C3",
  "payment_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "merchant_reference": "order-1234",
  "provider_transaction_id": "1775499394985",
  "amount": "5000.00",
  "fee": "75.00",
  "currency": "XAF",
  "method": "MOBILE_MONEY",
  "status": "COMPLETED",
  "payment_mode": "DIRECT_API",
  "operator": "MTN",
  "operator_transaction_id": "MP210409.1234.A12345",
  "customer_info": {
    "name": "Jean Dupont",
    "email": "jean@example.com",
    "phone": "237670000000"
  },
  "description": "Order #1234",
  "completed_at": "2026-04-09T12:01:30Z",
  "created_at": "2026-04-09T12:00:00Z",
  "updated_at": "2026-04-09T12:01:30Z"
}`}
            />
          </EndpointSection>

          {/* List Payments */}
          <EndpointSection
            method="GET"
            path="/payments"
            title={t.listPaymentsTitle}
            description={t.listPaymentsDesc}
          >
            <ParamTable
              t={t}
              params={[
                { name: "page", type: "number", required: false, desc: t.paramPage },
                { name: "page_size", type: "number", required: false, desc: t.paramPageSize },
                { name: "status", type: "string", required: false, desc: t.paramStatus },
              ]}
            />
            <CodeBlock
              language="javascript"
              code={`const response = await fetch(
  "${BASE_URL}/payments?page=1&page_size=10&status=COMPLETED",
  {
    headers: {
      "X-API-Key": "ltcpay_test_abc123...",
      "X-API-Secret": "your_api_secret",
    },
  }
);
const data = await response.json();
console.log(data.total_count); // Total matching payments
console.log(data.payments);    // Array of payment objects`}
            />
            <ResponseBlock
              t={t}
              status={200}
              body={`{
  "payments": [
    {
      "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
      "merchant_id": "a1b2c3d4-...",
      "reference": "PAY-A1B2C3",
      "amount": "5000.00",
      "fee": "87.50",
      "currency": "XAF",
      "status": "COMPLETED",
      "payment_mode": "DIRECT_API",
      "created_at": "2026-04-09T12:00:00Z",
      "updated_at": "2026-04-09T12:01:30Z"
    }
  ],
  "total_count": 42,
  "page": 1,
  "page_size": 10
}`}
            />
          </EndpointSection>
        </section>

        {/* Fees */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="fees">{t.feesTitle}</h2>
          <p className="text-sm text-gray-600">{t.feesDesc}</p>
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">{t.feeModeTitle}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">{t.feeMode}</th>
                    <th className="pb-2 font-medium">{t.feeWhoPays}</th>
                    <th className="pb-2 font-medium">{t.feeExample}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 font-mono text-xs">MERCHANT</td>
                    <td className="py-2 text-xs text-gray-600">{t.feeMerchantDesc}</td>
                    <td className="py-2 text-xs text-gray-600">{t.feeMerchantEx}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-mono text-xs">CLIENT</td>
                    <td className="py-2 text-xs text-gray-600">{t.feeClientDesc}</td>
                    <td className="py-2 text-xs text-gray-600">{t.feeClientEx}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-800">{t.feeNote}</p>
            </div>
          </div>
        </section>

        {/* Phone Number Format */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="phone-format">{t.phoneTitle}</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <p className="text-sm text-gray-600">{t.phoneDesc}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">{t.phoneSent}</th>
                    <th className="pb-2 font-medium">{t.phoneAccepted}</th>
                    <th className="pb-2 font-medium">{t.phoneNotes}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {t.phoneRows.map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 font-mono text-xs">{row.format}</td>
                      <td className="py-2 text-xs text-green-600 font-medium">{row.ok ? `\u2713 ${t.yes}` : `\u2717 ${t.no}`}</td>
                      <td className="py-2 text-xs text-gray-600">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                <strong>{t.phoneReco}</strong> {t.phoneRecoDesc}
              </p>
            </div>
          </div>
        </section>

        {/* Webhooks */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="webhooks">{t.webhooksTitle}</h2>
          <p className="text-sm text-gray-600">{t.webhooksDesc}</p>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">{t.webhooksNote}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">{t.webhookHeadersTitle}</h3>
            <p className="text-sm text-gray-600">{t.webhookHeadersDesc}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">{t.headerCol}</th>
                    <th className="pb-2 font-medium">{t.descriptionCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {t.webhookHeaders.map((wh, i) => (
                    <tr key={i}>
                      <td className="py-2 font-mono text-xs">{wh.header}</td>
                      <td className="py-2 text-xs text-gray-600">{wh.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-gray-900">{t.webhookPayloadTitle}</h3>
            <p className="text-sm text-gray-600">{t.webhookPayloadDesc}</p>
            <CodeBlock
              language="json"
              code={`{
  "event": "payment.status_changed",
  "data": {
    "payment_id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "reference": "PAY-A1B2C3",
    "merchant_reference": "order-1234",
    "provider_transaction_id": "1775499394985",
    "amount": 5000.0,
    "fee": 87.5,
    "currency": "XAF",
    "status": "COMPLETED",
    "method": "MOBILE_MONEY",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "237699000000",
    "description": "Order #1234",
    "completed_at": "2026-04-09T18:17:14Z",
    "created_at": "2026-04-09T18:16:08Z"
  },
  "timestamp": "2026-04-09T18:17:14Z"
}`}
            />

            <h3 className="text-sm font-semibold text-gray-900">{t.sigVerifyTitle}</h3>
            <p className="text-sm text-gray-600">{t.sigVerifyDesc}</p>
            <CodeBlock
              language="javascript"
              code={`import crypto from "crypto";

function verifyWebhook(rawBody, signature, webhookSecret) {
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)  // Use the raw body string, NOT JSON.stringify(parsed)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express.js example (use express.raw() or express.text() to get raw body):
app.post("/webhooks/ltcpay", express.text({ type: "application/json" }), (req, res) => {
  const signature = req.headers["x-ltcpay-signature"];
  const rawBody = req.body; // raw string

  if (!verifyWebhook(rawBody, signature, process.env.LTCPAY_WEBHOOK_SECRET)) {
    return res.status(403).json({ message: "Invalid webhook signature" });
  }

  const { event, data } = JSON.parse(rawBody);
  if (data.status === "COMPLETED") {
    // Mark order as paid
    console.log("Payment completed:", data.reference);
  }

  res.status(200).send("OK");
});`}
            />
            <CodeBlock
              language="python"
              code={`import hmac, hashlib, json

def verify_webhook(raw_body: bytes, signature: str, secret: str) -> bool:
    """Verify the X-LtcPay-Signature header."""
    expected = hmac.new(
        secret.encode("utf-8"), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# FastAPI example:
@app.post("/webhooks/ltcpay")
async def handle_webhook(request: Request):
    raw_body = await request.body()
    signature = request.headers.get("X-LtcPay-Signature", "")

    if not verify_webhook(raw_body, signature, WEBHOOK_SECRET):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    data = json.loads(raw_body)
    if data["data"]["status"] == "COMPLETED":
        print(f"Payment completed: {data['data']['reference']}")

    return {"status": "ok"}`}
            />

            <h3 className="text-sm font-semibold text-gray-900">{t.statusTitle}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">{t.statusCol}</th>
                    <th className="pb-2 font-medium">{t.descriptionCol}</th>
                    <th className="pb-2 font-medium">{t.terminalCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {t.statusRows.map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 font-mono text-xs">{row.status}</td>
                      <td className="py-2 text-xs text-gray-600">{row.desc}</td>
                      <td className="py-2 text-xs">
                        {row.terminal ? (
                          row.success ? (
                            <span className="font-medium text-green-600">{t.yes} &#10003;</span>
                          ) : (
                            <span className="font-medium text-red-600">{t.yes} &#10007;</span>
                          )
                        ) : (
                          <span className="text-gray-500">{t.no}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-sm font-semibold text-gray-900">{t.retryTitle}</h3>
            <p className="text-sm text-gray-600">{t.retryDesc}</p>
          </div>

          {/* Webhook Troubleshooting */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-red-900">{t.troubleshootTitle}</h3>
            <p className="text-sm text-red-800">{t.troubleshootDesc}</p>
            <ul className="text-sm text-red-800 space-y-1.5 list-disc list-inside">
              {t.troubleshootBullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        </section>

        {/* Error Handling */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="errors">{t.errorsTitle}</h2>
          <p className="text-sm text-gray-600">{t.errorsDesc}</p>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="pb-2 font-medium">{t.codeCol}</th>
                    <th className="pb-2 font-medium">{t.meaningCol}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {t.errorCodes.map((ec, i) => (
                    <tr key={i}>
                      <td className="py-2 font-mono text-xs">{ec.code}</td>
                      <td className="py-2 text-xs text-gray-600">{ec.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CodeBlock
              language="json"
              code={`{
  "detail": "A merchant with this email already exists"
}`}
            />
          </div>
        </section>

        {/* Test Mode */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900" id="testing">{t.testTitle}</h2>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-amber-900">{t.testSubtitle}</h3>
            <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
              {t.testBullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-8 pb-12 text-center text-sm text-gray-500">
          <p>{t.footerHelp}<a href="mailto:support@ltcgroup.site" className="text-navy-500 hover:underline">support@ltcgroup.site</a></p>
          <p className="mt-1">{t.footerTagline}</p>
        </footer>
      </main>
    </div>
  );
}
