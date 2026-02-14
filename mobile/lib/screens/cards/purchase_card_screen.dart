import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/cards_provider.dart';
import '../../widgets/custom_button.dart';
import '../../config/theme.dart';
import '../../config/constants.dart';

class PurchaseCardScreen extends StatefulWidget {
  const PurchaseCardScreen({super.key});

  @override
  State<PurchaseCardScreen> createState() => _PurchaseCardScreenState();
}

class _PurchaseCardScreenState extends State<PurchaseCardScreen> {
  String _selectedType = AppConstants.cardTypeVisa;
  final String _currency = AppConstants.defaultCurrency;

  Future<void> _handlePurchase() async {
    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);

    final success = await cardsProvider.purchaseCard(
      type: _selectedType,
      currency: _currency,
    );

    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Carte achetée avec succès'),
          backgroundColor: LTCColors.success,
        ),
      );
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(cardsProvider.error ?? 'Erreur lors de l\'achat'),
          backgroundColor: LTCColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cardsProvider = Provider.of<CardsProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouvelle carte'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Title
            const Text(
              'Acheter une carte virtuelle',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 8),

            const Text(
              'Choisissez le type de carte que vous souhaitez acheter',
              style: TextStyle(
                fontSize: 14,
                color: LTCColors.textSecondary,
              ),
            ),

            const SizedBox(height: 32),

            // Card type selection
            const Text(
              'Type de carte',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),

            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: _buildCardTypeOption(
                    AppConstants.cardTypeVisa,
                    'Visa',
                    Icons.credit_card,
                    const Color(0xFF1A1F71),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildCardTypeOption(
                    AppConstants.cardTypeMastercard,
                    'Mastercard',
                    Icons.credit_card,
                    const Color(0xFFEB001B),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),

            // Currency (read-only for now)
            const Text(
              'Devise',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),

            const SizedBox(height: 16),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE0E0E0)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: LTCColors.accent.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.euro,
                      color: LTCColors.accent,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'EUR - Euro',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Price summary
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: LTCColors.info.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: LTCColors.info.withOpacity(0.3)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Frais d\'achat',
                        style: TextStyle(fontSize: 14),
                      ),
                      Text(
                        '${AppConstants.cardPurchaseFee.toStringAsFixed(2)} ${AppConstants.currencySymbol}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total à payer',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '${AppConstants.cardPurchaseFee.toStringAsFixed(2)} ${AppConstants.currencySymbol}',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: LTCColors.accent,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Info note
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: LTCColors.warning.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.info_outline, color: LTCColors.warning, size: 20),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Text(
                      'Votre carte sera créée avec un solde de 0€. Vous pourrez la recharger après l\'achat.',
                      style: TextStyle(fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Purchase button
            CustomButton(
              text: 'Acheter la carte',
              onPressed: _handlePurchase,
              isLoading: cardsProvider.isLoading,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCardTypeOption(
    String type,
    String label,
    IconData icon,
    Color color,
  ) {
    final isSelected = _selectedType == type;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedType = type;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? LTCColors.accent : const Color(0xFFE0E0E0),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: color,
                size: 32,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              label,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: isSelected ? LTCColors.accent : LTCColors.textPrimary,
              ),
            ),
            if (isSelected) ...[
              const SizedBox(height: 4),
              const Icon(
                Icons.check_circle,
                color: LTCColors.accent,
                size: 20,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
