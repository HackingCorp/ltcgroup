import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_input.dart';
import '../../config/theme.dart';
import '../../config/constants.dart';

class WithdrawScreen extends StatefulWidget {
  const WithdrawScreen({super.key});

  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  String? _selectedCardId;
  String _selectedDestination = 'mobile_money';

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

  Future<void> _handleWithdraw() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedCardId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez selectionner une carte'),
          backgroundColor: LTCColors.error,
        ),
      );
      return;
    }

    final amount = double.parse(_amountController.text);
    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
    final card = cardsProvider.getCardById(_selectedCardId!);

    // Check if balance is sufficient
    if (card != null && card.balance < amount) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Solde insuffisant'),
          backgroundColor: LTCColors.error,
        ),
      );
      return;
    }

    final transactionsProvider =
        Provider.of<TransactionsProvider>(context, listen: false);

    final success = await transactionsProvider.withdrawFromCard(
      cardId: _selectedCardId!,
      amount: amount,
      currency: 'XAF',
    );

    if (!mounted) return;

    if (success) {
      // Update card balance
      if (card != null) {
        cardsProvider.updateCardBalance(_selectedCardId!, card.balance - amount);
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Retrait effectue avec succes'),
          backgroundColor: LTCColors.success,
        ),
      );
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content:
              Text(transactionsProvider.error ?? 'Erreur lors du retrait'),
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
      backgroundColor: LTCColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: LTCColors.textPrimary,
        elevation: 0,
        title: const Text(
          'Retirer des fonds',
          style: TextStyle(
            color: LTCColors.textPrimary,
            fontWeight: FontWeight.w600,
            fontSize: 18,
          ),
        ),
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
                'Carte source',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: LTCColors.textPrimary,
                ),
              ),

              const SizedBox(height: 16),

              Container(
                decoration: BoxDecoration(
                  color: LTCColors.surfaceLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: LTCColors.border),
                ),
                child: DropdownButtonFormField<String>(
                  value: _selectedCardId,
                  dropdownColor: LTCColors.surfaceElevated,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: LTCColors.surfaceLight,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: LTCColors.gold),
                    ),
                    prefixIcon: const Icon(Icons.credit_card,
                        color: LTCColors.textSecondary),
                  ),
                  hint: const Text(
                    'Selectionner une carte',
                    style: TextStyle(color: LTCColors.textTertiary),
                  ),
                  style: const TextStyle(
                    color: LTCColors.textPrimary,
                    fontSize: 14,
                  ),
                  items: cardsProvider.cards
                      .where((card) => card.isActive && card.balance > 0)
                      .map(
                        (card) => DropdownMenuItem(
                          value: card.id,
                          child: Text(
                            '${card.type} ${card.maskedNumber.substring(15)} - ${card.balance.toStringAsFixed(2)} ${AppConstants.currencySymbol}',
                            style: const TextStyle(color: LTCColors.textPrimary),
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
                      return 'Veuillez selectionner une carte';
                    }
                    return null;
                  },
                ),
              ),

              const SizedBox(height: 24),

              // Amount
              CustomInput(
                label: 'Montant a retirer',
                hint: '50.00',
                controller: _amountController,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                prefixIcon: Icons.payments,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Montant requis';
                  }
                  final amount = double.tryParse(value);
                  if (amount == null) {
                    return 'Montant invalide';
                  }
                  if (amount < AppConstants.minWithdrawAmount) {
                    return 'Minimum ${AppConstants.minWithdrawAmount} ${AppConstants.currencySymbol}';
                  }
                  if (_selectedCardId != null) {
                    final card = cardsProvider.getCardById(_selectedCardId!);
                    if (card != null && amount > card.balance) {
                      return 'Solde insuffisant';
                    }
                  }
                  return null;
                },
              ),

              const SizedBox(height: 24),

              // Destination
              const Text(
                'Destination',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: LTCColors.textPrimary,
                ),
              ),

              const SizedBox(height: 16),

              _buildDestinationOption(
                'mobile_money',
                'Mobile Money',
                Icons.phone_android,
              ),

              const SizedBox(height: 12),

              _buildDestinationOption(
                'bank_account',
                'Compte bancaire',
                Icons.account_balance,
              ),

              const SizedBox(height: 32),

              // Info note
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: LTCColors.warning.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: LTCColors.warning.withValues(alpha: 0.2),
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline,
                        color: LTCColors.warning, size: 20),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'Les retraits peuvent prendre 24-48h pour etre traites',
                        style: TextStyle(
                          fontSize: 12,
                          color: LTCColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Submit button
              CustomButton(
                text: 'Retirer',
                onPressed: _handleWithdraw,
                isLoading: transactionsProvider.isLoading,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDestinationOption(String value, String label, IconData icon) {
    final isSelected = _selectedDestination == value;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedDestination = value;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: LTCColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? LTCColors.gold : LTCColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isSelected
                    ? LTCColors.gold.withValues(alpha: 0.15)
                    : LTCColors.surfaceLight,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: isSelected ? LTCColors.gold : LTCColors.textSecondary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: isSelected ? LTCColors.gold : LTCColors.textPrimary,
                ),
              ),
            ),
            if (isSelected)
              const Icon(
                Icons.check_circle,
                color: LTCColors.gold,
              ),
          ],
        ),
      ),
    );
  }
}
