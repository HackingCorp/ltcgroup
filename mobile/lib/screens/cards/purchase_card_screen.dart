import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../providers/cards_provider.dart';
import '../../providers/wallet_provider.dart';
import '../../widgets/success_dialog.dart';

/// Purchase card screen matching Kash Pay design
class PurchaseCardScreen extends StatefulWidget {
  const PurchaseCardScreen({super.key});

  @override
  State<PurchaseCardScreen> createState() => _PurchaseCardScreenState();
}

class _PurchaseCardScreenState extends State<PurchaseCardScreen> {
  String _selectedType = 'VISA';
  String _selectedTier = 'STANDARD';
  int _selectedAmountIndex = 1;
  bool _isProcessing = false;
  final _amountController = TextEditingController(text: '');

  final _amounts = [5, 10, 25, 50, 100];
  final _amountLabels = ['\$5', '\$10', '\$25', '\$50', '\$100'];

  double get _amount => double.tryParse(_amountController.text) ?? 0;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _selectAmount(int index) {
    setState(() {
      _selectedAmountIndex = index;
      _amountController.text = _amounts[index].toString();
    });
  }

  Future<void> _handlePurchase() async {
    if (_amount <= 0 || _isProcessing) return;
    setState(() => _isProcessing = true);

    if (_amount < AppConstants.minTopupAmount) {
      _showError('Le montant minimum est de \$${AppConstants.minTopupAmount.toStringAsFixed(0)}');
      setState(() => _isProcessing = false);
      return;
    }
    if (_amount > AppConstants.maxTopupAmount) {
      _showError('Le montant maximum est de \$${AppConstants.maxTopupAmount.toStringAsFixed(0)}');
      setState(() => _isProcessing = false);
      return;
    }

    // Check wallet balance
    final walletProvider = Provider.of<WalletProvider>(context, listen: false);
    if (walletProvider.balance < _amount) {
      _showError('Solde insuffisant. Votre solde est de \$${walletProvider.balance.toStringAsFixed(2)}');
      setState(() => _isProcessing = false);
      return;
    }

    // Show confirmation dialog before proceeding
    final confirmed = await _showConfirmationDialog();
    if (confirmed != true) {
      if (mounted) setState(() => _isProcessing = false);
      return;
    }

    try {
      final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
      final success = await cardsProvider.purchaseCard(
        type: _selectedType,
        initialBalance: _amount,
        cardTier: _selectedTier,
      );

      if (!mounted) return;

      if (success) {
        // Refresh wallet balance
        walletProvider.fetchBalance();

        await SuccessDialog.showPurchaseSuccess(
          context,
          cardType: _tierLabel,
          balance: _amount,
        );
        if (!mounted) return;
        Navigator.of(context).pop();
      } else {
        _showError(cardsProvider.error ?? "Erreur lors de l'achat");
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  String get _tierLabel {
    switch (_selectedTier) {
      case 'PREMIUM':
        return 'VISA Premium';
      case 'GOLD':
        return 'Gold Contactless';
      default:
        return 'VISA Standard';
    }
  }

  double get _tierPrice {
    switch (_selectedTier) {
      case 'PREMIUM':
        return 10.0;
      case 'GOLD':
        return 15.0;
      default:
        return 5.0;
    }
  }

  Future<bool?> _showConfirmationDialog() {
    final walletBalance = Provider.of<WalletProvider>(context, listen: false).balance;

    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: LTCColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Confirmer l\'achat',
          style: TextStyle(color: LTCColors.textPrimary),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _dialogRow('Carte', _tierLabel),
            const SizedBox(height: 8),
            _dialogRow('Solde initial', '\$${_amount.toStringAsFixed(2)}'),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(color: LTCColors.border, height: 1),
            ),
            _dialogRow('Total', '\$${_amount.toStringAsFixed(2)}', bold: true),
            const SizedBox(height: 8),
            _dialogRow('Solde compte', '\$${walletBalance.toStringAsFixed(2)}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler', style: TextStyle(color: LTCColors.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirmer', style: TextStyle(color: LTCColors.gold)),
          ),
        ],
      ),
    );
  }

  Widget _dialogRow(String label, String value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, color: LTCColors.textSecondary)),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: bold ? FontWeight.bold : FontWeight.w500,
            color: bold ? LTCColors.gold : LTCColors.textPrimary,
          ),
        ),
      ],
    );
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: LTCColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LTCColors.background,
      body: Stack(
        children: [
          Column(
            children: [
              _buildHeader(),
              _buildProgressStepper(),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 120),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 24),
                      _buildCardTypeSection(),
                      const SizedBox(height: 32),
                      _buildAmountSection(),
                      const SizedBox(height: 32),
                      _buildSummary(),
                    ],
                  ),
                ),
              ),
            ],
          ),
          // Sticky CTA
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _buildCta(),
          ),
        ],
      ),
    );
  }

  // ─── Header ───────────────────────────────────────────────

  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.fromLTRB(
          8, MediaQuery.of(context).padding.top + 8, 8, 16),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.arrow_back, color: LTCColors.textPrimary),
          ),
          const Expanded(
            child: Text(
              'Acheter une carte',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: LTCColors.textPrimary,
              ),
            ),
          ),
          const SizedBox(width: 48), // balance the back button
        ],
      ),
    );
  }

  // ─── Progress Stepper ─────────────────────────────────────

  Widget _buildProgressStepper() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Etape 1 sur 3',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: LTCColors.textSecondary,
                ),
              ),
              const Text(
                'Details de la carte',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: LTCColors.gold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: const LinearProgressIndicator(
              value: 0.33,
              minHeight: 6,
              backgroundColor: LTCColors.surfaceLight,
              valueColor: AlwaysStoppedAnimation<Color>(LTCColors.gold),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  // ─── Card Type Section ────────────────────────────────────

  Widget _buildCardTypeSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Choisir votre carte',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: LTCColors.textPrimary,
          ),
        ),
        const SizedBox(height: 16),
        _buildTierCard(
          tier: 'STANDARD',
          name: 'VISA Standard',
          price: '\$5',
          cardTypes: 'VISA uniquement',
          icon: Icons.credit_card_rounded,
          features: const [
            'Carte prepayee Debit',
            'Paiements en ligne',
            '85% taux de succes',
          ],
        ),
        const SizedBox(height: 12),
        _buildTierCard(
          tier: 'PREMIUM',
          name: 'VISA Premium',
          price: '\$10',
          cardTypes: 'VISA uniquement',
          icon: Icons.star_rounded,
          features: const [
            'Carte prepayee Credit',
            '95% taux de succes',
            'Marchands premium',
          ],
        ),
        const SizedBox(height: 12),
        _buildTierCard(
          tier: 'GOLD',
          name: 'Gold Contactless',
          price: '\$15',
          cardTypes: 'VISA ou Mastercard',
          icon: Icons.contactless_rounded,
          features: const [
            '99% taux de succes',
            'Apple / Samsung / Google Pay',
            'Paiements sans contact',
          ],
        ),
        if (_selectedTier == 'GOLD') ...[
          const SizedBox(height: 16),
          _buildGoldTypeSelector(),
        ],
      ],
    );
  }

  Widget _buildTierCard({
    required String tier,
    required String name,
    required String price,
    required String cardTypes,
    required IconData icon,
    required List<String> features,
  }) {
    final isSelected = _selectedTier == tier;

    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedTier = tier;
          if (tier != 'GOLD') {
            _selectedType = 'VISA';
          }
        });
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: LTCColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? LTCColors.gold : LTCColors.border,
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: LTCColors.goldDark.withValues(alpha: 0.1),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Radio
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected ? LTCColors.gold : LTCColors.textTertiary,
                    width: 2,
                  ),
                ),
                child: isSelected
                    ? Center(
                        child: Container(
                          width: 10,
                          height: 10,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: LTCColors.gold,
                          ),
                        ),
                      )
                    : null,
              ),
            ),
            const SizedBox(width: 12),
            // Icon
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected
                    ? LTCColors.gold.withValues(alpha: 0.15)
                    : LTCColors.surfaceLight,
              ),
              child: Icon(icon, size: 20, color: isSelected ? LTCColors.gold : LTCColors.textSecondary),
            ),
            const SizedBox(width: 12),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        name,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: isSelected ? LTCColors.textPrimary : LTCColors.textSecondary,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isSelected ? LTCColors.gold : LTCColors.surfaceLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          price,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? LTCColors.background : LTCColors.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    cardTypes,
                    style: const TextStyle(
                      fontSize: 12,
                      color: LTCColors.textTertiary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...features.map((f) => Padding(
                        padding: const EdgeInsets.only(bottom: 3),
                        child: Row(
                          children: [
                            Icon(
                              Icons.check_circle_outline_rounded,
                              size: 14,
                              color: isSelected ? LTCColors.success : LTCColors.textTertiary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              f,
                              style: TextStyle(
                                fontSize: 12,
                                color: isSelected ? LTCColors.textSecondary : LTCColors.textTertiary,
                              ),
                            ),
                          ],
                        ),
                      )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGoldTypeSelector() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: LTCColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: LTCColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Reseau de carte',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: LTCColors.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _buildNetworkChip('VISA', 'VISA'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildNetworkChip('MASTERCARD', 'Mastercard'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildNetworkChip(String value, String label) {
    final isSelected = _selectedType == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedType = value),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? LTCColors.gold.withValues(alpha: 0.15) : LTCColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? LTCColors.gold : LTCColors.border,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: isSelected ? LTCColors.gold : LTCColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  // ─── Amount Section ───────────────────────────────────────

  Widget _buildAmountSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Montant de recharge',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: LTCColors.textPrimary,
          ),
        ),
        const SizedBox(height: 16),
        // Input
        Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          decoration: BoxDecoration(
            color: LTCColors.surfaceLight,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: LTCColors.border, width: 2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Montant a crediter',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: LTCColors.textSecondary,
                ),
              ),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _amountController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: LTCColors.textPrimary,
                      ),
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                        hintText: '0',
                        hintStyle: TextStyle(color: LTCColors.textTertiary),
                        fillColor: Colors.transparent,
                        filled: true,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                      ),
                      onChanged: (val) {
                        setState(() {
                          // Deselect chip if value doesn't match
                          final parsed = int.tryParse(val) ?? 0;
                          final idx = _amounts.indexOf(parsed);
                          _selectedAmountIndex = idx;
                        });
                      },
                    ),
                  ),
                  const Text(
                    'USD',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: LTCColors.textTertiary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Quick amount chips
        SizedBox(
          height: 40,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _amountLabels.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final isActive = _selectedAmountIndex == index;
              return GestureDetector(
                onTap: () => _selectAmount(index),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: isActive ? LTCColors.gold : LTCColors.surfaceLight,
                    borderRadius: BorderRadius.circular(20),
                    border: isActive
                        ? null
                        : Border.all(color: LTCColors.border),
                    boxShadow: isActive
                        ? [
                            BoxShadow(
                              color: LTCColors.goldDark.withValues(alpha: 0.3),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            )
                          ]
                        : null,
                  ),
                  child: Text(
                    _amountLabels[index],
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: isActive ? LTCColors.background : LTCColors.textSecondary,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  // ─── Summary ──────────────────────────────────────────────

  Widget _buildSummary() {
    final walletBalance = Provider.of<WalletProvider>(context).balance;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.receipt_long_rounded,
                  size: 16, color: LTCColors.gold),
              SizedBox(width: 8),
              Text(
                'Resume',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: LTCColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildSummaryRow('Carte', _tierLabel),
          const SizedBox(height: 8),
          _buildSummaryRow(
            'Solde initial',
            '\$${_amount.toStringAsFixed(2)}',
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Divider(color: LTCColors.border, height: 1),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: LTCColors.textPrimary,
                ),
              ),
              Text(
                '\$${_amount.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: LTCColors.gold,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: LTCColors.surfaceLight,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                const Icon(Icons.account_balance_wallet_rounded,
                    size: 18, color: LTCColors.gold),
                const SizedBox(width: 10),
                const Text(
                  'Solde du compte',
                  style: TextStyle(
                    fontSize: 13,
                    color: LTCColors.textSecondary,
                  ),
                ),
                const Spacer(),
                Text(
                  '\$${walletBalance.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: walletBalance >= _amount ? LTCColors.success : LTCColors.error,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 14, color: LTCColors.textSecondary),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: valueColor ?? LTCColors.textSecondary,
            fontFamily: 'monospace',
          ),
        ),
      ],
    );
  }

  // ─── CTA ──────────────────────────────────────────────────

  Widget _buildCta() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            LTCColors.background.withValues(alpha: 0),
            LTCColors.background.withValues(alpha: 0.9),
            LTCColors.background,
          ],
        ),
      ),
      child: GestureDetector(
            onTap: _isProcessing ? null : _handlePurchase,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [LTCColors.cardGold1, LTCColors.cardGold2, LTCColors.cardGold3],
                ),
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: LTCColors.goldDark.withValues(alpha: 0.4),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_isProcessing)
                    SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: LTCColors.background,
                        strokeWidth: 2.5,
                      ),
                    )
                  else ...[
                    Text(
                      'Acheter ma carte',
                      style: TextStyle(
                        color: LTCColors.background,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(Icons.arrow_forward,
                        color: LTCColors.background, size: 18),
                  ],
                ],
              ),
            ),
          ),
    );
  }
}
