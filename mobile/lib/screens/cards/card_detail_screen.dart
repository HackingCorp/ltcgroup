import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../widgets/card_widget.dart';
import '../../widgets/transaction_item.dart';
import '../../widgets/custom_button.dart';
import '../../config/theme.dart';
import '../../config/constants.dart';

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
        message = 'Carte gelée avec succès';
        break;
      case 'unfreeze':
        newStatus = AppConstants.cardStatusActive;
        message = 'Carte dégelée avec succès';
        break;
      case 'block':
        // Show confirmation dialog
        final confirmed = await _showBlockConfirmation();
        if (!confirmed) return;

        newStatus = AppConstants.cardStatusBlocked;
        message = 'Carte bloquée avec succès';
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
            title: const Text('Bloquer la carte'),
            content: const Text(
              'Êtes-vous sûr de vouloir bloquer cette carte ? Cette action est irréversible.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Annuler'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: LTCColors.error,
                ),
                child: const Text('Bloquer'),
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
            title: const Text('Geler la carte'),
            content: const Text(
              'Êtes-vous sûr de vouloir geler cette carte ? Vous pourrez la dégeler plus tard.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: const Text('Annuler'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                child: const Text('Geler'),
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

    // In a real app, call GET /cards/{id}/reveal endpoint
    // For now, simulate the API call
    setState(() {
      _isCardNumberRevealed = true;
      _revealedCardNumber = '4532 1234 5678 9010'; // Mock data
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
  }

  Future<void> _toggleCvvReveal(String cardId) async {
    if (_isCvvRevealed) {
      setState(() {
        _isCvvRevealed = false;
        _revealedCvv = null;
      });
      return;
    }

    // In a real app, call GET /cards/{id}/reveal endpoint
    // For now, simulate the API call
    setState(() {
      _isCvvRevealed = true;
      _revealedCvv = '123'; // Mock data
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
  }

  @override
  Widget build(BuildContext context) {
    final cardId = ModalRoute.of(context)?.settings.arguments as String?;
    final cardsProvider = Provider.of<CardsProvider>(context);
    final transactionsProvider = Provider.of<TransactionsProvider>(context);

    if (cardId == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Erreur')),
        body: const Center(child: Text('Carte non trouvée')),
      );
    }

    final card = cardsProvider.getCardById(cardId);

    if (card == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Erreur')),
        body: const Center(child: Text('Carte non trouvée')),
      );
    }

    final cardTransactions = transactionsProvider.getTransactionsForCard(cardId);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Détails de la carte'),
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
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _buildRevealableRow(
                    'Numéro',
                    _isCardNumberRevealed ? _revealedCardNumber! : card.maskedNumber,
                    _isCardNumberRevealed,
                    () => _toggleCardNumberReveal(card.id),
                  ),
                  const Divider(height: 24),
                  _buildDetailRow('Expire le', card.expiryFormatted),
                  const Divider(height: 24),
                  _buildRevealableRow(
                    'CVV',
                    _isCvvRevealed ? _revealedCvv! : '***',
                    _isCvvRevealed,
                    () => _toggleCvvReveal(card.id),
                  ),
                  const Divider(height: 24),
                  _buildDetailRow('Type', card.type),
                  const Divider(height: 24),
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
                        child: CustomButton(
                          text: 'Recharger',
                          icon: Icons.arrow_downward,
                          variant: ButtonVariant.primary,
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
                        child: CustomButton(
                          text: 'Retirer',
                          icon: Icons.arrow_upward,
                          variant: ButtonVariant.secondary,
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
                    CustomButton(
                      text: 'Geler la carte',
                      icon: Icons.ac_unit,
                      variant: ButtonVariant.outline,
                      onPressed: () async {
                        final confirmed = await _showFreezeConfirmation();
                        if (confirmed) {
                          _handleCardAction('freeze', card.id);
                        }
                      },
                    ),
                  if (card.isFrozen)
                    CustomButton(
                      text: 'Dégeler la carte',
                      icon: Icons.lock_open,
                      variant: ButtonVariant.outline,
                      onPressed: () => _handleCardAction('unfreeze', card.id),
                    ),
                  const SizedBox(height: 12),
                  if (!card.isBlocked)
                    CustomButton(
                      text: 'Bloquer définitivement',
                      icon: Icons.block,
                      variant: ButtonVariant.outline,
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
                ),
              ),
            ),

            const SizedBox(height: 12),

            // Transactions list
            if (cardTransactions.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Center(
                  child: Text(
                    'Aucune transaction pour cette carte',
                    style: TextStyle(
                      fontSize: 14,
                      color: LTCColors.textSecondary,
                    ),
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
