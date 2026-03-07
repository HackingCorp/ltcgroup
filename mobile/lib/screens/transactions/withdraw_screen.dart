import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../providers/wallet_provider.dart';
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
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _amountController.addListener(() => setState(() {}));
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
    if (_isProcessing) return;
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

    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Montant invalide'),
          backgroundColor: LTCColors.error,
        ),
      );
      return;
    }
    final fee = amount * AppConstants.cardOperationFeeRate;
    final totalDebit = amount + fee;
    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
    final card = cardsProvider.getCardById(_selectedCardId!);

    // Check if balance is sufficient (amount + 1.5% fee)
    if (card != null && card.balance < totalDebit) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Solde insuffisant. Il vous faut \$${totalDebit.toStringAsFixed(2)} pour cette operation.'),
          backgroundColor: LTCColors.error,
        ),
      );
      return;
    }

    setState(() => _isProcessing = true);

    try {
      final transactionsProvider =
          Provider.of<TransactionsProvider>(context, listen: false);

      final success = await transactionsProvider.withdrawFromCard(
        cardId: _selectedCardId!,
        amount: amount,
        currency: 'XAF',
      );

      if (!mounted) return;

      if (success) {
        // Update card balance (amount + fee deducted)
        if (card != null) {
          cardsProvider.updateCardBalance(_selectedCardId!, card.balance - totalDebit);
        }

        // Refresh transactions and wallet balance
        transactionsProvider.fetchTransactions();
        Provider.of<WalletProvider>(context, listen: false).fetchBalance();

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
    } finally {
      if (mounted) setState(() => _isProcessing = false);
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
                        (card) {
                          // Extract last 4 digits safely
                          final last4 = card.maskedNumber.length >= 4
                              ? card.maskedNumber.substring(card.maskedNumber.length - 4)
                              : card.maskedNumber;
                          return DropdownMenuItem(
                            value: card.id,
                            child: Text(
                              '${card.type} ****$last4 - ${card.balance.toStringAsFixed(2)} ${AppConstants.currencySymbol}',
                              style: const TextStyle(color: LTCColors.textPrimary),
                            ),
                          );
                        },
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

              const SizedBox(height: 24),

              // Fee summary
              _buildFeeSummary(),

              const SizedBox(height: 24),

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
                onPressed: _isProcessing ? null : _handleWithdraw,
                isLoading: transactionsProvider.isLoading || _isProcessing,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFeeSummary() {
    final amount = double.tryParse(_amountController.text) ?? 0;
    final fee = amount * AppConstants.cardOperationFeeRate;
    final total = amount + fee;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: LTCColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: LTCColors.border),
      ),
      child: Column(
        children: [
          _feeRow('Montant retrait', '\$${amount.toStringAsFixed(2)}'),
          const SizedBox(height: 8),
          _feeRow('Frais (1.5%)', '\$${fee.toStringAsFixed(2)}'),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: Divider(color: LTCColors.border, height: 1),
          ),
          _feeRow('Total debite', '\$${total.toStringAsFixed(2)}', bold: true),
        ],
      ),
    );
  }

  Widget _feeRow(String label, String value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 13, color: LTCColors.textSecondary)),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: bold ? FontWeight.bold : FontWeight.w500,
            color: bold ? LTCColors.gold : LTCColors.textPrimary,
          ),
        ),
      ],
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
