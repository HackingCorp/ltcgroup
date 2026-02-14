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
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCardTransactions();
    });
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
                  _buildDetailRow('Numéro', card.maskedNumber),
                  const Divider(height: 24),
                  _buildDetailRow('Expire le', card.expiryFormatted),
                  const Divider(height: 24),
                  _buildDetailRow('CVV', '***'),
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
                      onPressed: () => _handleCardAction('freeze', card.id),
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
}
