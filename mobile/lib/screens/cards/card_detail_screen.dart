import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cards_provider.dart';
import '../../widgets/card_widget.dart';
import '../../config/theme.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';
import '../../services/biometric_service.dart';
import '../../services/screen_security_service.dart';

class CardDetailScreen extends StatefulWidget {
  const CardDetailScreen({super.key});

  @override
  State<CardDetailScreen> createState() => _CardDetailScreenState();
}

class _CardDetailScreenState extends State<CardDetailScreen> {
  bool _isCardNumberRevealed = false;
  bool _isCvvRevealed = false;
  String? _revealedCardNumber;
  String? _revealedCvv;

  // Provider (AccountPE) card history
  List<Map<String, dynamic>> _providerHistory = [];
  bool _isLoadingHistory = false;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    // Prevent screenshots/screen recording on this sensitive screen
    ScreenSecurityService.enableProtection();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadProviderHistory();
      // Also refresh the card data from backend
      Provider.of<CardsProvider>(context, listen: false).fetchCards();
      // Auto-refresh card history every 30 seconds
      _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
        _loadProviderHistory();
      });
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    // Re-allow screenshots when leaving this screen
    ScreenSecurityService.disableProtection();
    // Overwrite sensitive data in memory before releasing references
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

  Future<void> _loadProviderHistory() async {
    final cardId = ModalRoute.of(context)?.settings.arguments as String?;
    if (cardId == null) return;

    setState(() => _isLoadingHistory = true);
    try {
      final history = await ApiService().getCardHistory(cardId);
      if (mounted) {
        setState(() {
          _providerHistory = history;
          _isLoadingHistory = false;
        });
      }
    } catch (e) {
      debugPrint('ERROR loading provider history: $e');
      if (mounted) {
        setState(() => _isLoadingHistory = false);
      }
    }
  }

  Future<void> _handleCardAction(String action, String cardId) async {
    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);

    String? newStatus;
    String message = '';

    switch (action) {
      case 'freeze':
        newStatus = AppConstants.cardStatusFrozen;
        message = 'Carte gelee avec succes';
        break;
      case 'unfreeze':
        newStatus = AppConstants.cardStatusActive;
        message = 'Carte degelee avec succes';
        break;
      case 'block':
        final confirmed = await _showBlockConfirmation();
        if (!confirmed) return;
        newStatus = AppConstants.cardStatusBlocked;
        message = 'Carte bloquee avec succes';
        break;
    }

    if (newStatus != null) {
      final success = await cardsProvider.updateCardStatus(
        cardId: cardId,
        status: newStatus,
      );

      if (!mounted) return;

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: LTCColors.success,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(cardsProvider.error ?? 'Erreur'),
            backgroundColor: LTCColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  Future<bool> _showBlockConfirmation() async {
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: LTCColors.surface,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Text(
              'Bloquer la carte',
              style: TextStyle(color: LTCColors.textPrimary),
            ),
            content: const Text(
              'Etes-vous sur de vouloir bloquer cette carte ? Cette action est irreversible.',
              style: TextStyle(color: LTCColors.textSecondary),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Annuler', style: TextStyle(color: LTCColors.textSecondary)),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                style: ElevatedButton.styleFrom(backgroundColor: LTCColors.error),
                child: const Text('Bloquer', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ) ??
        false;
  }

  Future<bool> _showFreezeConfirmation() async {
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            backgroundColor: LTCColors.surface,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Text(
              'Geler la carte',
              style: TextStyle(color: LTCColors.textPrimary),
            ),
            content: const Text(
              'Etes-vous sur de vouloir geler cette carte ? Vous pourrez la degeler plus tard.',
              style: TextStyle(color: LTCColors.textSecondary),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Annuler', style: TextStyle(color: LTCColors.textSecondary)),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                style: ElevatedButton.styleFrom(backgroundColor: LTCColors.warning),
                child: Text('Geler', style: TextStyle(color: LTCColors.background)),
              ),
            ],
          ),
        ) ??
        false;
  }

  /// Prompt biometric authentication before revealing sensitive card data.
  /// Returns true if authenticated or biometrics unavailable (fallback allow).
  Future<bool> _authenticateForReveal() async {
    final bio = BiometricService();
    final available = await bio.checkBiometricAvailable();
    if (!available) return true; // no biometrics → allow (device has no sensor)
    return await bio.authenticate(
      reason: 'Authentifiez-vous pour reveler les details de la carte',
    );
  }

  Future<void> _toggleCardNumberReveal(String cardId) async {
    if (_isCardNumberRevealed) {
      setState(() {
        _isCardNumberRevealed = false;
        _revealedCardNumber = null;
      });
      return;
    }

    // Require biometric auth before revealing card number
    final authenticated = await _authenticateForReveal();
    if (!authenticated) return;

    try {
      final revealData = await ApiService().revealCard(cardId);
      if (!mounted) return;

      setState(() {
        _revealedCardNumber = revealData['card_number'];
        _isCardNumberRevealed = true;
      });

      // Warn user 5 seconds before auto-hide
      Future.delayed(const Duration(seconds: 25), () {
        if (mounted && _isCardNumberRevealed) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Le numero sera masque dans 5 secondes')),
          );
        }
      });

      Future.delayed(const Duration(seconds: 30), () {
        if (mounted) {
          setState(() {
            _isCardNumberRevealed = false;
            _revealedCardNumber = null;
          });
        }
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: ${e.toString()}'),
          backgroundColor: LTCColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  Future<void> _toggleCvvReveal(String cardId) async {
    if (_isCvvRevealed) {
      setState(() {
        _isCvvRevealed = false;
        _revealedCvv = null;
      });
      return;
    }

    // Require biometric auth before revealing CVV
    final authenticated = await _authenticateForReveal();
    if (!authenticated) return;

    try {
      final revealData = await ApiService().revealCard(cardId);
      if (!mounted) return;

      setState(() {
        _revealedCvv = revealData['cvv'];
        _isCvvRevealed = true;
      });

      Future.delayed(const Duration(seconds: 30), () {
        if (mounted) {
          setState(() {
            _isCvvRevealed = false;
            _revealedCvv = null;
          });
        }
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur: ${e.toString()}'),
          backgroundColor: LTCColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  void _copyToClipboard(String value, String label) {
    Clipboard.setData(ClipboardData(text: value));
    // Auto-clear clipboard after 30 seconds for security
    Future.delayed(const Duration(seconds: 30), () {
      Clipboard.setData(const ClipboardData(text: ''));
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Text('$label copie !'),
          ],
        ),
        backgroundColor: LTCColors.success,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cardId = ModalRoute.of(context)?.settings.arguments as String?;
    final cardsProvider = Provider.of<CardsProvider>(context);

    if (cardId == null) {
      return Scaffold(
        backgroundColor: LTCColors.background,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Erreur', style: TextStyle(color: LTCColors.textPrimary)),
          iconTheme: const IconThemeData(color: LTCColors.textPrimary),
        ),
        body: const Center(
          child: Text('Carte non trouvee', style: TextStyle(color: LTCColors.textSecondary)),
        ),
      );
    }

    final card = cardsProvider.getCardById(cardId);

    if (card == null) {
      return Scaffold(
        backgroundColor: LTCColors.background,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          title: const Text('Erreur', style: TextStyle(color: LTCColors.textPrimary)),
          iconTheme: const IconThemeData(color: LTCColors.textPrimary),
        ),
        body: const Center(
          child: Text('Carte non trouvee', style: TextStyle(color: LTCColors.textSecondary)),
        ),
      );
    }

    final holderName =
        Provider.of<AuthProvider>(context).user?.fullName.toUpperCase() ??
            'UTILISATEUR';

    return Scaffold(
      backgroundColor: LTCColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Details de la carte',
          style: TextStyle(
            color: LTCColors.textPrimary,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        iconTheme: const IconThemeData(color: LTCColors.textPrimary),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ─── Card Visual ───
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              child: Stack(
                children: [
                  // Background glow
                  Positioned.fill(
                    child: Center(
                      child: Container(
                        width: 220,
                        height: 120,
                        decoration: BoxDecoration(
                          color: getCardTierGlow(card.tier).withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(100),
                        ),
                      ),
                    ),
                  ),
                  CardWidget(
                    card: card,
                    holderName: holderName,
                  ),
                ],
              ),
            ),

            // ─── Card Details Section ───
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                decoration: BoxDecoration(
                  color: LTCColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: LTCColors.border),
                ),
                child: Column(
                  children: [
                    // Card number row
                    _buildDetailRowWithActions(
                      icon: Icons.credit_card_rounded,
                      label: 'Numero',
                      value: _isCardNumberRevealed
                          ? _revealedCardNumber ?? card.maskedNumber
                          : card.maskedNumber,
                      isFirst: true,
                      revealable: true,
                      isRevealed: _isCardNumberRevealed,
                      onToggleReveal: () => _toggleCardNumberReveal(card.id),
                      onCopy: _isCardNumberRevealed && _revealedCardNumber != null
                          ? () => _copyToClipboard(_revealedCardNumber!, 'Numero')
                          : null,
                    ),
                    _divider(),
                    // Expiry row
                    _buildDetailRowWithActions(
                      icon: Icons.calendar_today_rounded,
                      label: 'Expire le',
                      value: card.expiryFormatted,
                      onCopy: () => _copyToClipboard(card.expiryFormatted, 'Date d\'expiration'),
                    ),
                    _divider(),
                    // CVV row
                    _buildDetailRowWithActions(
                      icon: Icons.lock_rounded,
                      label: 'CVV',
                      value: _isCvvRevealed
                          ? _revealedCvv ?? '***'
                          : '***',
                      revealable: true,
                      isRevealed: _isCvvRevealed,
                      onToggleReveal: () => _toggleCvvReveal(card.id),
                      onCopy: _isCvvRevealed && _revealedCvv != null
                          ? () => _copyToClipboard(_revealedCvv!, 'CVV')
                          : null,
                    ),
                    _divider(),
                    // Type row
                    _buildDetailRowWithActions(
                      icon: Icons.style_rounded,
                      label: 'Type',
                      value: card.type,
                    ),
                    _divider(),
                    // Tier row
                    _buildDetailRowWithActions(
                      icon: Icons.workspace_premium_rounded,
                      label: 'Tier',
                      value: _tierLabel(card.tier),
                    ),
                    _divider(),
                    // Currency row
                    _buildDetailRowWithActions(
                      icon: Icons.attach_money_rounded,
                      label: 'Devise',
                      value: card.currency,
                      isLast: true,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // ─── Blocked Card Warning ───
            if (card.isBlocked)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: LTCColors.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: LTCColors.error.withValues(alpha: 0.3)),
                  ),
                  child: const Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.warning_amber_rounded, color: LTCColors.error, size: 22),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Carte bloquee / desactivee',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: LTCColors.error,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Cette carte a ete desactivee par l\'emetteur. '
                              'Le solde restant a ete rembourse dans votre wallet. '
                              'Vous pouvez acheter une nouvelle carte.',
                              style: TextStyle(
                                fontSize: 12,
                                color: LTCColors.textSecondary,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            if (card.isBlocked)
              const SizedBox(height: 16),

            // ─── Info Banner: Card Rules ───
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: LTCColors.gold.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: LTCColors.gold.withValues(alpha: 0.2)),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline_rounded, color: LTCColors.gold, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Regles importantes',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: LTCColors.gold,
                          ),
                        ),
                      ],
                    ),
                    SizedBox(height: 8),
                    Text(
                      '\u2022 Nouvelle carte : 2 transactions refusees pour fonds insuffisants = carte bloquee automatiquement.\n'
                      '\u2022 Carte active : 5 transactions consecutives refusees pour fonds insuffisants = carte bloquee.\n'
                      '\u2022 Assurez-vous d\'avoir un solde suffisant avant chaque transaction.',
                      style: TextStyle(
                        fontSize: 12,
                        color: LTCColors.textSecondary,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // ─── Action Buttons ───
            if (!card.isBlocked)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _buildActionButton(
                            'Recharger',
                            Icons.arrow_downward_rounded,
                            isPrimary: true,
                            onPressed: () {
                              Navigator.of(context).pushNamed(
                                '/wallet-transfer',
                                arguments: card.id,
                              ).then((_) => _loadProviderHistory());
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _buildActionButton(
                            'Retirer',
                            Icons.arrow_upward_rounded,
                            onPressed: () {
                              Navigator.of(context).pushNamed(
                                '/withdraw',
                                arguments: card.id,
                              ).then((_) => _loadProviderHistory());
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (card.isActive)
                      _buildActionButton(
                        'Geler la carte',
                        Icons.ac_unit_rounded,
                        isOutline: true,
                        onPressed: () async {
                          final confirmed = await _showFreezeConfirmation();
                          if (confirmed) {
                            _handleCardAction('freeze', card.id);
                          }
                        },
                      ),
                    if (card.isFrozen)
                      _buildActionButton(
                        'Degeler la carte',
                        Icons.lock_open_rounded,
                        isOutline: true,
                        onPressed: () => _handleCardAction('unfreeze', card.id),
                      ),
                    const SizedBox(height: 12),
                    _buildActionButton(
                      'Bloquer definitivement',
                      Icons.block_rounded,
                      isDanger: true,
                      onPressed: () => _handleCardAction('block', card.id),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 32),

            // ─── Provider History Section (AccountPE) ───
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Text(
                'Historique carte (${_providerHistory.length})',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: LTCColors.textPrimary,
                ),
              ),
            ),

            const SizedBox(height: 12),

            if (_isLoadingHistory)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Center(
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: LTCColors.gold,
                    ),
                  ),
                ),
              )
            else if (_providerHistory.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 32),
                  decoration: BoxDecoration(
                    color: LTCColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: LTCColors.border),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.receipt_long_outlined,
                          size: 40, color: LTCColors.textTertiary),
                      SizedBox(height: 8),
                      Text(
                        'Aucune transaction pour cette carte',
                        style: TextStyle(
                          fontSize: 14,
                          color: LTCColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  decoration: BoxDecoration(
                    color: LTCColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: LTCColors.border),
                  ),
                  child: Column(
                    children: _providerHistory.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final txn = entry.value;
                      return _buildProviderTxnRow(
                        txn,
                        isFirst: idx == 0,
                        isLast: idx == _providerHistory.length - 1,
                      );
                    }).toList(),
                  ),
                ),
              ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  // ─── Detail Row with Reveal + Copy ───

  Widget _buildDetailRowWithActions({
    required IconData icon,
    required String label,
    required String value,
    bool isFirst = false,
    bool isLast = false,
    bool revealable = false,
    bool isRevealed = false,
    VoidCallback? onToggleReveal,
    VoidCallback? onCopy,
  }) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 8,
        top: isFirst ? 16 : 12,
        bottom: isLast ? 16 : 12,
      ),
      child: Row(
        children: [
          // Icon
          Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: LTCColors.surfaceLight,
            ),
            child: Icon(icon, size: 16, color: LTCColors.textSecondary),
          ),
          const SizedBox(width: 12),
          // Label + Value
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: LTCColors.textTertiary,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: LTCColors.textPrimary,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
          // Action buttons
          if (revealable)
            IconButton(
              icon: Icon(
                isRevealed ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                size: 20,
                color: LTCColors.gold,
              ),
              onPressed: onToggleReveal,
              tooltip: isRevealed ? 'Masquer' : 'Reveler',
            ),
          if (onCopy != null)
            IconButton(
              icon: const Icon(
                Icons.copy_rounded,
                size: 18,
                color: LTCColors.textSecondary,
              ),
              onPressed: onCopy,
              tooltip: 'Copier',
            ),
        ],
      ),
    );
  }

  Widget _divider() {
    return const Padding(
      padding: EdgeInsets.symmetric(horizontal: 16),
      child: Divider(height: 1, color: LTCColors.border),
    );
  }

  // ─── Action Buttons ───

  Widget _buildActionButton(
    String text,
    IconData icon, {
    bool isPrimary = false,
    bool isOutline = false,
    bool isDanger = false,
    required VoidCallback onPressed,
  }) {
    final Color bgColor;
    final Color textColor;
    final Color iconColor;
    final Border? border;

    if (isPrimary) {
      bgColor = LTCColors.gold;
      textColor = LTCColors.background;
      iconColor = LTCColors.background;
      border = null;
    } else if (isDanger) {
      bgColor = LTCColors.error.withValues(alpha: 0.12);
      textColor = LTCColors.error;
      iconColor = LTCColors.error;
      border = Border.all(color: LTCColors.error.withValues(alpha: 0.3));
    } else if (isOutline) {
      bgColor = LTCColors.surface;
      textColor = LTCColors.gold;
      iconColor = LTCColors.gold;
      border = Border.all(color: LTCColors.border);
    } else {
      bgColor = LTCColors.surfaceLight;
      textColor = LTCColors.textPrimary;
      iconColor = LTCColors.gold;
      border = Border.all(color: LTCColors.border);
    }

    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(12),
          border: border,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 20, color: iconColor),
            const SizedBox(width: 8),
            Text(
              text,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _tierLabel(String tier) {
    switch (tier) {
      case 'PREMIUM':
        return 'Premium';
      case 'GOLD':
        return 'Gold';
      default:
        return 'Standard';
    }
  }

  // ─── Provider Transaction Row ───

  Widget _buildProviderTxnRow(
    Map<String, dynamic> txn, {
    bool isFirst = false,
    bool isLast = false,
  }) {
    final type = txn['type'] as String? ?? '';
    final txnStatus = txn['status'] as String? ?? '';
    final amount = (txn['amount'] as num?)?.toDouble() ?? 0;
    final currency = txn['currency'] as String? ?? 'USD';
    final description = txn['description'] as String? ?? '';
    final merchantName = txn['merchant_name'] as String? ?? '';
    final balanceAfter = (txn['balance_after'] as num?)?.toDouble() ?? 0;
    final createdAt = txn['created_at'] as String? ?? '';

    // Icon and color based on type
    IconData icon;
    Color iconColor;
    String label;
    switch (type) {
      case 'CardIssuance':
        icon = Icons.credit_card_rounded;
        iconColor = LTCColors.success;
        label = 'Emission de carte';
        break;
      case 'CardTermination':
        icon = Icons.cancel_rounded;
        iconColor = LTCColors.error;
        label = 'Terminaison de carte';
        break;
      case 'Authorization':
        icon = Icons.shopping_cart_rounded;
        iconColor = txnStatus == 'Declined' ? LTCColors.error : LTCColors.success;
        label = txnStatus == 'Declined' ? 'Autorisation refusee' : 'Autorisation';
        break;
      case 'Refund':
        icon = Icons.replay_rounded;
        iconColor = LTCColors.success;
        label = 'Remboursement';
        break;
      default:
        icon = Icons.swap_horiz_rounded;
        iconColor = LTCColors.textSecondary;
        label = type;
    }

    // Format date — treat as UTC if no timezone info, then display in local time
    String dateStr = '';
    if (createdAt.isNotEmpty) {
      try {
        var dt = DateTime.parse(createdAt);
        if (!dt.isUtc) {
          dt = DateTime.utc(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second, dt.millisecond, dt.microsecond);
        }
        final local = dt.toLocal();
        dateStr = '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year} ${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
      } catch (_) {
        dateStr = createdAt;
      }
    }

    return Column(
      children: [
        Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: isFirst ? 16 : 12,
            bottom: isLast ? 16 : 12,
          ),
          child: Row(
            children: [
              // Icon
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: iconColor.withValues(alpha: 0.12),
                ),
                child: Icon(icon, size: 20, color: iconColor),
              ),
              const SizedBox(width: 12),
              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: LTCColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    if (merchantName.isNotEmpty && !merchantName.contains('Swychr'))
                      Text(
                        merchantName,
                        style: const TextStyle(
                          fontSize: 12,
                          color: LTCColors.textSecondary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    if (description.isNotEmpty)
                      Text(
                        description,
                        style: const TextStyle(
                          fontSize: 11,
                          color: LTCColors.textTertiary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    if (dateStr.isNotEmpty)
                      Text(
                        dateStr,
                        style: const TextStyle(
                          fontSize: 11,
                          color: LTCColors.textTertiary,
                        ),
                      ),
                  ],
                ),
              ),
              // Amount + balance after
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${txnStatus == 'Declined' ? '' : (type == 'Authorization' || type == 'CardTermination' ? '-' : '+')}$currency ${amount.toStringAsFixed(2)}',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: txnStatus == 'Declined'
                          ? LTCColors.error
                          : (type == 'Authorization' || type == 'CardTermination'
                              ? LTCColors.textPrimary
                              : LTCColors.success),
                    ),
                  ),
                  Text(
                    'Solde: \$${ balanceAfter.toStringAsFixed(2)}',
                    style: const TextStyle(
                      fontSize: 11,
                      color: LTCColors.textTertiary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (!isLast)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Divider(height: 1, color: LTCColors.border),
          ),
      ],
    );
  }
}
