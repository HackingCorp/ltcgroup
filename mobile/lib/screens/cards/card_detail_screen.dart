import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../widgets/card_widget.dart';
import '../../widgets/transaction_item.dart';
import '../../config/theme.dart';
import '../../config/constants.dart';
import '../../services/api_service.dart';

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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCardTransactions();
    });
  }

  @override
  void dispose() {
    // Clear revealed data
    _revealedCardNumber = null;
    _revealedCvv = null;
    super.dispose();
  }

  Future<void> _loadCardTransactions() async {
    final cardId = ModalRoute.of(context)?.settings.arguments as String?;
    if (cardId == null) return;

    final transactionsProvider =
        Provider.of<TransactionsProvider>(context, listen: false);
    await transactionsProvider.fetchTransactions(cardId: cardId);
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
        // Show confirmation dialog
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
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(cardsProvider.error ?? 'Erreur'),
            backgroundColor: LTCColors.error,
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
                style: ElevatedButton.styleFrom(
                  backgroundColor: LTCColors.error,
                ),
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
                style: ElevatedButton.styleFrom(
                  backgroundColor: LTCColors.warning,
                ),
                child: Text('Geler', style: TextStyle(color: LTCColors.background)),
              ),
            ],
          ),
        ) ??
        false;
  }

  Future<void> _toggleCardNumberReveal(String cardId) async {
    if (_isCardNumberRevealed) {
      setState(() {
        _isCardNumberRevealed = false;
        _revealedCardNumber = null;
      });
      return;
    }

    // Call real API to reveal card data
    try {
      final revealData = await ApiService().revealCard(cardId);
      if (!mounted) return;

      setState(() {
        _revealedCardNumber = revealData['card_number'];
        _isCardNumberRevealed = true;
      });

      // Auto-hide after 30 seconds
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

    // Call real API to reveal CVV
    try {
      final revealData = await ApiService().revealCard(cardId);
      if (!mounted) return;

      setState(() {
        _revealedCvv = revealData['cvv'];
        _isCvvRevealed = true;
      });

      // Auto-hide after 30 seconds
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
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cardId = ModalRoute.of(context)?.settings.arguments as String?;
    final cardsProvider = Provider.of<CardsProvider>(context);
    final transactionsProvider = Provider.of<TransactionsProvider>(context);

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

    final cardTransactions = transactionsProvider.getTransactionsForCard(cardId);

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
            // Card display
            Padding(
              padding: const EdgeInsets.all(16),
              child: CardWidget(card: card),
            ),

            // Card details
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: LTCColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: LTCColors.border),
              ),
              child: Column(
                children: [
                  _buildRevealableRow(
                    'Numero',
                    _isCardNumberRevealed ? _revealedCardNumber! : card.maskedNumber,
                    _isCardNumberRevealed,
                    () => _toggleCardNumberReveal(card.id),
                  ),
                  const Divider(height: 24, color: LTCColors.border),
                  _buildDetailRow('Expire le', card.expiryFormatted),
                  const Divider(height: 24, color: LTCColors.border),
                  _buildRevealableRow(
                    'CVV',
                    _isCvvRevealed ? _revealedCvv! : '***',
                    _isCvvRevealed,
                    () => _toggleCvvReveal(card.id),
                  ),
                  const Divider(height: 24, color: LTCColors.border),
                  _buildDetailRow('Type', card.type),
                  const Divider(height: 24, color: LTCColors.border),
                  _buildDetailRow('Devise', card.currency),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Action buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _buildDarkActionButton(
                          'Recharger',
                          Icons.arrow_downward,
                          isPrimary: true,
                          onPressed: () {
                            Navigator.of(context).pushNamed(
                              '/topup',
                              arguments: card.id,
                            );
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildDarkActionButton(
                          'Retirer',
                          Icons.arrow_upward,
                          isPrimary: false,
                          onPressed: () {
                            Navigator.of(context).pushNamed(
                              '/withdraw',
                              arguments: card.id,
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (card.isActive)
                    _buildDarkActionButton(
                      'Geler la carte',
                      Icons.ac_unit,
                      isPrimary: false,
                      isOutline: true,
                      onPressed: () async {
                        final confirmed = await _showFreezeConfirmation();
                        if (confirmed) {
                          _handleCardAction('freeze', card.id);
                        }
                      },
                    ),
                  if (card.isFrozen)
                    _buildDarkActionButton(
                      'Degeler la carte',
                      Icons.lock_open,
                      isPrimary: false,
                      isOutline: true,
                      onPressed: () => _handleCardAction('unfreeze', card.id),
                    ),
                  const SizedBox(height: 12),
                  if (!card.isBlocked)
                    _buildDarkActionButton(
                      'Bloquer definitivement',
                      Icons.block,
                      isPrimary: false,
                      isOutline: true,
                      isDanger: true,
                      onPressed: () => _handleCardAction('block', card.id),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Transactions section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'Transactions (${cardTransactions.length})',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: LTCColors.textPrimary,
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Transactions list
            if (cardTransactions.isEmpty)
              Padding(
                padding: const EdgeInsets.all(16),
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
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: cardTransactions.length,
                itemBuilder: (context, index) {
                  final transaction = cardTransactions[index];
                  return TransactionItem(transaction: transaction);
                },
              ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildDarkActionButton(
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

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            color: LTCColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: LTCColors.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildRevealableRow(String label, String value, bool isRevealed, VoidCallback onToggle) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            color: LTCColors.textSecondary,
          ),
        ),
        Row(
          children: [
            Text(
              value,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: LTCColors.textPrimary,
              ),
            ),
            const SizedBox(width: 8),
            IconButton(
              icon: Icon(
                isRevealed ? Icons.visibility_off : Icons.visibility,
                size: 20,
                color: LTCColors.gold,
              ),
              onPressed: onToggle,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ],
        ),
      ],
    );
  }
}
