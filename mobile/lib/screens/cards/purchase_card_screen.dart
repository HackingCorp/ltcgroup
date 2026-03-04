import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
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
  int _selectedAmountIndex = 0;
  bool _isProcessing = false;
  final _amountController = TextEditingController(text: '1');

  final _amounts = [1, 5, 10, 25, 50, 100];
  final _amountLabels = ['\$1', '\$5', '\$10', '\$25', '\$50', '\$100'];

  double get _amount => double.tryParse(_amountController.text) ?? 1;
  double get _rechargeFee => _amount * AppConstants.cardOperationFeeRate;
  double get _total => _amount + _tierPrice + _rechargeFee;

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
    if (_isProcessing) return;

    // KYC check
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    if (authProvider.user != null && !authProvider.user!.isKycVerified) {
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: LTCColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text(
            'Verification requise',
            style: TextStyle(color: LTCColors.textPrimary),
          ),
          content: const Text(
            'Vous devez verifier votre identite (KYC) avant de pouvoir acheter une carte virtuelle.',
            style: TextStyle(color: LTCColors.textSecondary, fontSize: 14),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Annuler', style: TextStyle(color: LTCColors.textSecondary)),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.of(context).pushNamed('/kyc');
              },
              child: const Text('Verifier mon identite', style: TextStyle(color: LTCColors.gold)),
            ),
          ],
        ),
      );
      return;
    }

    if (_amount < 1) {
      _showError('Le montant minimum de recharge est de \$1');
      return;
    }
    if (_amount > AppConstants.maxTopupAmount) {
      _showError('Le montant maximum est de \$${AppConstants.maxTopupAmount.toStringAsFixed(0)}');
      return;
    }

    // Check wallet balance
    final walletProvider = Provider.of<WalletProvider>(context, listen: false);
    if (walletProvider.balance < _total) {
      _showError('Solde insuffisant. Il vous faut \$${_total.toStringAsFixed(2)} (solde: \$${walletProvider.balance.toStringAsFixed(2)})');
      return;
    }

    // Show confirmation dialog before proceeding
    final confirmed = await _showConfirmationDialog();
    if (confirmed != true) return;

    if (!mounted) return;

    // Show processing overlay
    final result = await Navigator.of(context).push<bool>(
      PageRouteBuilder(
        opaque: false,
        barrierColor: Colors.black54,
        pageBuilder: (context, _, __) => _PurchaseProcessingOverlay(
          cardType: _selectedType,
          cardTier: _selectedTier,
          tierLabel: _tierLabel,
          amount: _amount,
        ),
      ),
    );

    if (!mounted) return;

    if (result == true) {
      walletProvider.fetchBalance();
      Provider.of<TransactionsProvider>(context, listen: false).fetchTransactions();
      Provider.of<CardsProvider>(context, listen: false).fetchCards();
      await SuccessDialog.showPurchaseSuccess(
        context,
        cardType: _tierLabel,
        balance: _amount,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
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
            _dialogRow('Prix carte', '\$${_tierPrice.toStringAsFixed(2)}'),
            const SizedBox(height: 8),
            _dialogRow('Solde initial', '\$${_amount.toStringAsFixed(2)}'),
            const SizedBox(height: 8),
            _dialogRow('Frais recharge (1.5%)', '\$${_rechargeFee.toStringAsFixed(2)}'),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(color: LTCColors.border, height: 1),
            ),
            _dialogRow('Total', '\$${_total.toStringAsFixed(2)}', bold: true),
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
          const SizedBox(height: 8),
          _buildSummaryRow(
            'Prix carte (${_tierLabel})',
            '\$${_tierPrice.toStringAsFixed(2)}',
          ),
          const SizedBox(height: 8),
          _buildSummaryRow(
            'Frais recharge (1.5%)',
            '\$${_rechargeFee.toStringAsFixed(2)}',
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
                '\$${_total.toStringAsFixed(2)}',
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
                    color: walletBalance >= _total ? LTCColors.success : LTCColors.error,
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
            onTap: _handlePurchase,
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
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Acheter ma carte',
                    style: TextStyle(
                      color: LTCColors.background,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(width: 8),
                  Icon(Icons.arrow_forward,
                      color: LTCColors.background, size: 18),
                ],
              ),
            ),
          ),
    );
  }
}

// ─── Processing overlay with step animation ──────────────────

class _PurchaseProcessingOverlay extends StatefulWidget {
  final String cardType;
  final String cardTier;
  final String tierLabel;
  final double amount;

  const _PurchaseProcessingOverlay({
    required this.cardType,
    required this.cardTier,
    required this.tierLabel,
    required this.amount,
  });

  @override
  State<_PurchaseProcessingOverlay> createState() =>
      _PurchaseProcessingOverlayState();
}

class _PurchaseProcessingOverlayState
    extends State<_PurchaseProcessingOverlay> with TickerProviderStateMixin {
  int _currentStep = 0;
  bool _failed = false;
  String? _errorMessage;
  late final AnimationController _pulseController;
  late final AnimationController _slideController;

  static const _steps = [
    {'icon': Icons.account_circle_outlined, 'label': 'Verification du compte...'},
    {'icon': Icons.credit_card, 'label': 'Creation de la carte...'},
    {'icon': Icons.settings_outlined, 'label': 'Configuration...'},
    {'icon': Icons.check_circle_outline, 'label': 'Finalisation...'},
  ];

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _slideController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    )..forward();
    _startPurchase();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _slideController.dispose();
    super.dispose();
  }

  Future<void> _startPurchase() async {
    // Step 0: Verification du compte
    await Future.delayed(const Duration(milliseconds: 800));
    if (!mounted) return;
    setState(() => _currentStep = 1);

    // Step 1: Creation de la carte
    await Future.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    setState(() => _currentStep = 2);

    // Step 2: Configuration — actual API call
    try {
      final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
      final success = await cardsProvider.purchaseCard(
        type: widget.cardType,
        initialBalance: widget.amount,
        cardTier: widget.cardTier,
      );

      if (!mounted) return;

      if (success) {
        setState(() => _currentStep = 3);
        await Future.delayed(const Duration(milliseconds: 800));
        if (!mounted) return;
        Navigator.of(context).pop(true);
      } else {
        setState(() {
          _failed = true;
          _errorMessage = cardsProvider.error ?? "Erreur lors de l'achat";
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _failed = true;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(0, 1),
          end: Offset.zero,
        ).animate(CurvedAnimation(
          parent: _slideController,
          curve: Curves.easeOutCubic,
        )),
        child: Center(
          child: Container(
            width: 320,
            margin: const EdgeInsets.symmetric(horizontal: 24),
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: LTCColors.surface,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: LTCColors.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.3),
                  blurRadius: 40,
                  offset: const Offset(0, 20),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Card icon with pulse
                AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    final scale = _failed
                        ? 1.0
                        : 1.0 + _pulseController.value * 0.08;
                    return Transform.scale(scale: scale, child: child);
                  },
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _failed
                          ? LTCColors.error.withValues(alpha: 0.1)
                          : LTCColors.gold.withValues(alpha: 0.1),
                    ),
                    child: Icon(
                      _failed ? Icons.error_outline : Icons.credit_card,
                      size: 36,
                      color: _failed ? LTCColors.error : LTCColors.gold,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  _failed ? 'Echec' : 'Achat en cours...',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: _failed ? LTCColors.error : LTCColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _failed ? '' : widget.tierLabel,
                  style: const TextStyle(
                    fontSize: 14,
                    color: LTCColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 28),

                // Steps
                ...List.generate(_steps.length, (i) {
                  final step = _steps[i];
                  final isDone = i < _currentStep;
                  final isActive = i == _currentStep && !_failed;
                  final isFailed = i == _currentStep && _failed;

                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        // Step indicator
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isDone
                                ? LTCColors.success.withValues(alpha: 0.15)
                                : isFailed
                                    ? LTCColors.error.withValues(alpha: 0.15)
                                    : isActive
                                        ? LTCColors.gold.withValues(alpha: 0.15)
                                        : LTCColors.surfaceLight,
                          ),
                          child: Center(
                            child: isDone
                                ? const Icon(Icons.check, size: 16, color: LTCColors.success)
                                : isFailed
                                    ? const Icon(Icons.close, size: 16, color: LTCColors.error)
                                    : isActive
                                        ? SizedBox(
                                            width: 14,
                                            height: 14,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: LTCColors.gold,
                                            ),
                                          )
                                        : Icon(
                                            step['icon'] as IconData,
                                            size: 14,
                                            color: LTCColors.textTertiary,
                                          ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            isDone
                                ? (step['label'] as String).replaceAll('...', '')
                                : step['label'] as String,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: isActive || isDone ? FontWeight.w600 : FontWeight.normal,
                              color: isDone
                                  ? LTCColors.success
                                  : isFailed
                                      ? LTCColors.error
                                      : isActive
                                          ? LTCColors.textPrimary
                                          : LTCColors.textTertiary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }),

                // Error message
                if (_failed && _errorMessage != null) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: LTCColors.error.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(fontSize: 13, color: LTCColors.error),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 16),
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(false),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: LTCColors.surfaceLight,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: LTCColors.border),
                      ),
                      child: const Text(
                        'Fermer',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: LTCColors.textPrimary,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
