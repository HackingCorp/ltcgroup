import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_input.dart';
import '../../config/theme.dart';
import '../../config/constants.dart';

class TopupScreen extends StatefulWidget {
  const TopupScreen({super.key});

  @override
  State<TopupScreen> createState() => _TopupScreenState();
}

class _TopupScreenState extends State<TopupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  String? _selectedCardId;
  String _selectedMethod = 'mobile_money';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is String) {
        setState(() {
          _selectedCardId = args;
        });
      }
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _handleTopup() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCardId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez sélectionner une carte'),
          backgroundColor: LTCColors.error,
        ),
      );
      return;
    }

    final amount = double.parse(_amountController.text);
    final transactionsProvider =
        Provider.of<TransactionsProvider>(context, listen: false);
    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);

    final success = await transactionsProvider.topupCard(
      cardId: _selectedCardId!,
      amount: amount,
      currency: 'USD',
    );

    if (!mounted) return;

    if (success) {
      // Update card balance
      final card = cardsProvider.getCardById(_selectedCardId!);
      if (card != null) {
        cardsProvider.updateCardBalance(_selectedCardId!, card.balance + amount);
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Recharge effectuée avec succès'),
          backgroundColor: LTCColors.success,
        ),
      );
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content:
              Text(transactionsProvider.error ?? 'Erreur lors de la recharge'),
          backgroundColor: LTCColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cardsProvider = Provider.of<CardsProvider>(context);
    final transactionsProvider = Provider.of<TransactionsProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Recharger une carte'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Card selection
              const Text(
                'Carte à recharger',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(height: 16),

              DropdownButtonFormField<String>(
                value: _selectedCardId,
                decoration: InputDecoration(
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  prefixIcon: const Icon(Icons.credit_card),
                ),
                hint: const Text('Sélectionner une carte'),
                items: cardsProvider.cards
                    .where((card) => !card.isBlocked)
                    .map(
                      (card) => DropdownMenuItem(
                        value: card.id,
                        child: Text(
                          '${card.type} ${card.maskedNumber.substring(15)} - ${card.balance.toStringAsFixed(2)} ${AppConstants.currencySymbol}',
                        ),
                      ),
                    )
                    .toList(),
                onChanged: (value) {
                  setState(() {
                    _selectedCardId = value;
                  });
                },
                validator: (value) {
                  if (value == null) {
                    return 'Veuillez sélectionner une carte';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 24),

              // Amount
              CustomInput(
                label: 'Montant à recharger',
                hint: '100.00',
                controller: _amountController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                prefixIcon: Icons.euro,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Montant requis';
                  }
                  final amount = double.tryParse(value);
                  if (amount == null) {
                    return 'Montant invalide';
                  }
                  if (amount < AppConstants.minTopupAmount) {
                    return 'Minimum ${AppConstants.minTopupAmount} ${AppConstants.currencySymbol}';
                  }
                  if (amount > AppConstants.maxTopupAmount) {
                    return 'Maximum ${AppConstants.maxTopupAmount} ${AppConstants.currencySymbol}';
                  }
                  return null;
                },
              ),

              const SizedBox(height: 24),

              // Payment method
              const Text(
                'Méthode de paiement',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),

              const SizedBox(height: 16),

              _buildPaymentMethod(
                'mobile_money',
                'Mobile Money',
                Icons.phone_android,
              ),

              const SizedBox(height: 12),

              _buildPaymentMethod(
                'bank_transfer',
                'Virement bancaire',
                Icons.account_balance,
              ),

              const SizedBox(height: 32),

              // Info note
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: LTCColors.info.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.info_outline, color: LTCColors.info, size: 20),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Phase 1: L\'intégration du paiement réel sera implémentée en Phase 2',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Submit button
              CustomButton(
                text: 'Recharger',
                onPressed: _handleTopup,
                isLoading: transactionsProvider.isLoading,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaymentMethod(String value, String label, IconData icon) {
    final isSelected = _selectedMethod == value;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedMethod = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? LTCColors.accent : const Color(0xFFE0E0E0),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: (isSelected ? LTCColors.accent : Colors.grey)
                    .withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: isSelected ? LTCColors.accent : Colors.grey,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: isSelected ? LTCColors.accent : LTCColors.textPrimary,
                ),
              ),
            ),
            if (isSelected)
              const Icon(
                Icons.check_circle,
                color: LTCColors.accent,
              ),
          ],
        ),
      ),
    );
  }
}
