import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cards_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/success_dialog.dart';
import '../payments/payment_webview_screen.dart';

/// Purchase card screen matching Kash Pay design
class PurchaseCardScreen extends StatefulWidget {
  const PurchaseCardScreen({super.key});

  @override
  State<PurchaseCardScreen> createState() => _PurchaseCardScreenState();
}

class _PurchaseCardScreenState extends State<PurchaseCardScreen> {
  String _selectedType = 'VISA';
  int _selectedAmountIndex = 1;
  String _selectedPayment = 'mobile_money';
  String _selectedCountry = 'CM';
  bool _isProcessing = false;
  final _amountController = TextEditingController(text: '');
  final _apiService = ApiService();

  static const _countries = [
    {'code': 'CM', 'name': 'Cameroun', 'fee': 3.0},
    {'code': 'SN', 'name': 'Senegal', 'fee': 3.0},
    {'code': 'CI', 'name': "Cote d'Ivoire", 'fee': 3.5},
    {'code': 'GA', 'name': 'Gabon', 'fee': 3.5},
    {'code': 'CD', 'name': 'Congo RDC', 'fee': 4.0},
    {'code': 'KE', 'name': 'Kenya', 'fee': 2.0},
    {'code': 'NG', 'name': 'Nigeria', 'fee': 2.5},
    {'code': 'GH', 'name': 'Ghana', 'fee': 3.0},
    {'code': 'BF', 'name': 'Burkina Faso', 'fee': 3.5},
    {'code': 'ML', 'name': 'Mali', 'fee': 3.5},
    {'code': 'BJ', 'name': 'Benin', 'fee': 3.5},
    {'code': 'TG', 'name': 'Togo', 'fee': 3.5},
    {'code': 'TZ', 'name': 'Tanzanie', 'fee': 3.5},
    {'code': 'UG', 'name': 'Ouganda', 'fee': 3.5},
    {'code': 'NE', 'name': 'Niger', 'fee': 4.0},
    {'code': 'RW', 'name': 'Rwanda', 'fee': 4.25},
    {'code': 'CG', 'name': 'Congo Brazza', 'fee': 5.0},
    {'code': 'GN', 'name': 'Guinee', 'fee': 4.25},
  ];

  final _amounts = [5, 10, 25, 50, 100];
  final _amountLabels = ['\$5', '\$10', '\$25', '\$50', '\$100'];

  double get _amount => double.tryParse(_amountController.text) ?? 0;

  double get _countryFeeRate {
    final country = _countries.firstWhere(
      (c) => c['code'] == _selectedCountry,
      orElse: () => _countries.first,
    );
    return (country['fee'] as num).toDouble();
  }

  double get _serviceFee => _amount * (_countryFeeRate / 100);
  double get _total => _amount + _serviceFee;

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

    // Show confirmation dialog before proceeding
    final confirmed = await _showConfirmationDialog();
    if (confirmed != true) {
      if (mounted) setState(() => _isProcessing = false);
      return;
    }

    try {
      if (_selectedPayment == 'mobile_money') {
        await _handleMobileMoneyPurchase();
      } else {
        await _handleCardPurchase();
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<bool?> _showConfirmationDialog() {
    final cardType = _selectedType == 'VISA' ? 'Visa' : 'Mastercard';
    final paymentLabel = _selectedPayment == 'mobile_money'
        ? 'Mobile Money'
        : 'Carte Bancaire';

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
            _dialogRow('Carte', '$cardType virtuelle'),
            const SizedBox(height: 8),
            _dialogRow('Montant', '\$${_amount.toStringAsFixed(2)}'),
            const SizedBox(height: 8),
            _dialogRow('Frais (${_countryFeeRate.toStringAsFixed(1)}%)', '\$${_serviceFee.toStringAsFixed(2)}'),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(color: LTCColors.border, height: 1),
            ),
            _dialogRow('Total', '\$${_total.toStringAsFixed(2)}', bold: true),
            const SizedBox(height: 8),
            _dialogRow('Paiement', paymentLabel),
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

  Future<void> _handleMobileMoneyPurchase() async {
    try {
      final result = await _apiService.initiatePayment(
        method: 'mobile_money',
        amount: _total,
        countryCode: _selectedCountry,
      );

      if (!mounted) return;

      final paymentUrl = result['payment_url'] as String?;
      final transactionId = result['transaction_id'] as String?;
      if (paymentUrl == null || paymentUrl.isEmpty) {
        _showError('Le lien de paiement n\'a pas ete genere');
        return;
      }

      // WebView returns: 'completed', 'failed', 'pending', or null (user dismiss)
      final paymentResult = await Navigator.of(context).push<String?>(
        MaterialPageRoute(
          builder: (context) => PaymentWebViewScreen(
            paymentUrl: paymentUrl,
            title: 'Paiement Mobile Money',
          ),
        ),
      );

      if (!mounted) return;

      if (paymentResult == 'completed' && transactionId != null) {
        // Verify payment status with backend
        final status = await _apiService.pollPaymentStatus(transactionId);
        if (!mounted) return;

        if (status['status'] == 'COMPLETED') {
          final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
          final success = await cardsProvider.purchaseCard(
            type: _selectedType,
            initialBalance: _amount,
          );

          if (!mounted) return;

          if (success) {
            await SuccessDialog.showPurchaseSuccess(
              context,
              cardType: _selectedType == 'VISA' ? 'Visa' : 'Mastercard',
              balance: _amount,
            );
            if (!mounted) return;
            Navigator.of(context).pop();
          } else {
            _showError(cardsProvider.error ?? "Erreur lors de l'achat");
          }
        } else if (status['status'] == 'FAILED') {
          _showError('Le paiement a echoue. Veuillez reessayer.');
        } else {
          _showError('Le paiement est en cours de traitement. Votre carte sera creee automatiquement.');
        }
      } else if (paymentResult == 'completed') {
        _showError('Le paiement est en cours de traitement. Votre carte sera creee automatiquement.');
      } else if (paymentResult == 'failed') {
        _showError('Le paiement a echoue. Veuillez reessayer.');
      } else if (paymentResult == 'pending') {
        _showError('Le paiement est en cours de traitement. Votre carte sera creee automatiquement.');
      }
    } catch (e) {
      if (!mounted) return;
      _showError(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _handleCardPurchase() async {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final user = authProvider.user;

      final result = await _apiService.initiatePayment(
        method: 'enkap',
        amount: _total,
        customerName: user != null ? '${user.firstName} ${user.lastName}' : 'Client Kash Pay',
        customerEmail: user?.email,
      );

      if (!mounted) return;

      final paymentUrl = result['payment_url'] as String?;
      final transactionId = result['transaction_id'] as String?;
      if (paymentUrl == null || paymentUrl.isEmpty) {
        _showError('Le lien de paiement n\'a pas ete genere');
        return;
      }

      // WebView returns: 'completed', 'failed', 'pending', or null (user dismiss)
      final paymentResult = await Navigator.of(context).push<String?>(
        MaterialPageRoute(
          builder: (context) => PaymentWebViewScreen(
            paymentUrl: paymentUrl,
            title: 'Paiement par Carte',
          ),
        ),
      );

      if (!mounted) return;

      if (paymentResult == 'completed' && transactionId != null) {
        // Verify payment status with backend
        final status = await _apiService.pollPaymentStatus(transactionId);
        if (!mounted) return;

        if (status['status'] == 'COMPLETED') {
          final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
          final success = await cardsProvider.purchaseCard(
            type: _selectedType,
            initialBalance: _amount,
          );

          if (!mounted) return;

          if (success) {
            await SuccessDialog.showPurchaseSuccess(
              context,
              cardType: _selectedType == 'VISA' ? 'Visa' : 'Mastercard',
              balance: _amount,
            );
            if (!mounted) return;
            Navigator.of(context).pop();
          } else {
            _showError(cardsProvider.error ?? "Erreur lors de l'achat");
          }
        } else if (status['status'] == 'FAILED') {
          _showError('Le paiement a echoue. Veuillez reessayer.');
        } else {
          _showError('Le paiement est en cours de traitement. Votre carte sera creee automatiquement.');
        }
      } else if (paymentResult == 'completed') {
        _showError('Le paiement est en cours de traitement. Votre carte sera creee automatiquement.');
      } else if (paymentResult == 'failed') {
        _showError('Le paiement a echoue. Veuillez reessayer.');
      } else if (paymentResult == 'pending') {
        _showError('Le paiement est en cours de traitement. Votre carte sera creee automatiquement.');
      }
    } catch (e) {
      if (!mounted) return;
      _showError(e.toString().replaceFirst('Exception: ', ''));
    }
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
                      _buildPaymentSection(),
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
        // Title + toggle
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Text(
              'Type de Carte',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: LTCColors.textPrimary,
              ),
            ),
            _buildToggle(),
          ],
        ),
        const SizedBox(height: 16),
        // Card carousel
        SizedBox(
          height: 175,
          child: ListView(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            children: [
              _buildVisaCard(),
              const SizedBox(width: 16),
              _buildMastercardCard(),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildToggle() {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: LTCColors.surfaceLight,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: LTCColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildToggleBtn('Classique', true),
          _buildToggleBtn('Contactless', false),
        ],
      ),
    );
  }

  Widget _buildToggleBtn(String label, bool active) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: active ? LTCColors.surfaceElevated : Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        boxShadow: active
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.15),
                  blurRadius: 4,
                  offset: const Offset(0, 1),
                )
              ]
            : null,
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: active ? LTCColors.textPrimary : LTCColors.textTertiary,
        ),
      ),
    );
  }

  Widget _buildVisaCard() {
    final isSelected = _selectedType == 'VISA';
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    final name = user?.firstName ?? 'Votre Nom';

    return GestureDetector(
      onTap: () => setState(() => _selectedType = 'VISA'),
      child: Container(
        width: 280,
        height: 170,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [LTCColors.cardGold1, LTCColors.cardGold2, LTCColors.cardGold3],
          ),
          border: isSelected
              ? Border.all(color: LTCColors.goldLight, width: 2)
              : null,
          boxShadow: [
            BoxShadow(
              color: LTCColors.goldDark.withValues(alpha: 0.3),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Background decoration -- glassmorphism
            Positioned(
              top: -60,
              right: -60,
              child: Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.07),
                ),
              ),
            ),
            Positioned(
              bottom: -40,
              left: -40,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.black.withValues(alpha: 0.15),
                ),
              ),
            ),
            // Glass border overlay
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.1),
                  ),
                ),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Kash Pay',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 1,
                        ),
                      ),
                      Icon(Icons.contactless_rounded,
                          color: Colors.white.withValues(alpha: 0.5),
                          size: 20),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Chip
                      Container(
                        width: 40,
                        height: 24,
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(4),
                          color: Colors.white.withValues(alpha: 0.15),
                        ),
                      ),
                      Text(
                        '**** **** **** 4289',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 17,
                          letterSpacing: 3,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'TITULAIRE',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.6),
                              fontSize: 9,
                              letterSpacing: 1,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        'VISA',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          fontStyle: FontStyle.italic,
                          letterSpacing: 2,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Selected check
            if (isSelected)
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.check, size: 16, color: LTCColors.goldDark),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildMastercardCard() {
    final isSelected = _selectedType == 'MASTERCARD';

    return GestureDetector(
      onTap: () => setState(() => _selectedType = 'MASTERCARD'),
      child: Opacity(
        opacity: isSelected ? 1.0 : 0.6,
        child: Transform.scale(
          scale: isSelected ? 1.0 : 0.95,
          child: Container(
            width: 280,
            height: 170,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  LTCColors.cardGold1,
                  LTCColors.cardGold2,
                  LTCColors.cardGold3,
                ],
              ),
              border: isSelected
                  ? Border.all(color: LTCColors.goldLight, width: 2)
                  : null,
              boxShadow: [
                BoxShadow(
                  color: LTCColors.goldDark.withValues(alpha: 0.3),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Stack(
              children: [
                // Glass border overlay
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Kash Pay',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.85),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        '**** **** **** ****',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 17,
                          letterSpacing: 3,
                          fontFamily: 'monospace',
                        ),
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'TITULAIRE',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.6),
                                  fontSize: 9,
                                  letterSpacing: 1,
                                ),
                              ),
                              const SizedBox(height: 2),
                              const Text(
                                'Votre Nom',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          // Mastercard circles
                          SizedBox(
                            width: 40,
                            height: 24,
                            child: Stack(
                              children: [
                                Positioned(
                                  left: 0,
                                  child: Container(
                                    width: 24,
                                    height: 24,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Colors.red.withValues(alpha: 0.9),
                                    ),
                                  ),
                                ),
                                Positioned(
                                  left: 14,
                                  child: Container(
                                    width: 24,
                                    height: 24,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Colors.yellow
                                          .withValues(alpha: 0.9),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.check,
                          size: 16, color: LTCColors.goldDark),
                    ),
                  ),
              ],
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

  // ─── Payment Section ──────────────────────────────────────

  Widget _buildPaymentSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Moyen de paiement',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: LTCColors.textPrimary,
          ),
        ),
        const SizedBox(height: 16),
        _buildPaymentOption(
          id: 'mobile_money',
          title: 'Mobile Money',
          subtitle: '18 pays africains',
          color: LTCColors.warning.withValues(alpha: 0.15),
          iconWidget: const Icon(Icons.phone_android_rounded,
              size: 18, color: LTCColors.warning),
        ),
        const SizedBox(height: 12),
        _buildPaymentOption(
          id: 'card',
          title: 'Carte Bancaire',
          subtitle: 'Visa / Mastercard',
          color: LTCColors.gold.withValues(alpha: 0.12),
          iconWidget: const Icon(Icons.credit_card,
              size: 18, color: LTCColors.gold),
        ),
        if (_selectedPayment == 'mobile_money') ...[
          const SizedBox(height: 16),
          _buildCountrySelector(),
        ],
      ],
    );
  }

  Widget _buildPaymentOption({
    required String id,
    required String title,
    required String subtitle,
    required Color color,
    required Widget iconWidget,
  }) {
    final isSelected = _selectedPayment == id;

    return GestureDetector(
      onTap: () => setState(() => _selectedPayment = id),
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
          children: [
            // Radio
            Container(
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
            const SizedBox(width: 16),
            // Icon circle
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color,
              ),
              child: Center(child: iconWidget),
            ),
            const SizedBox(width: 12),
            // Text
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: LTCColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: LTCColors.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─── Country Selector ──────────────────────────────────────

  Widget _buildCountrySelector() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedCountry,
          isExpanded: true,
          dropdownColor: LTCColors.surfaceElevated,
          icon: const Icon(Icons.keyboard_arrow_down_rounded, color: LTCColors.textSecondary),
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: LTCColors.textPrimary,
          ),
          items: _countries.map((country) {
            return DropdownMenuItem<String>(
              value: country['code'] as String,
              child: Row(
                children: [
                  const Icon(Icons.public, size: 18, color: LTCColors.textSecondary),
                  const SizedBox(width: 12),
                  Text(country['name'] as String),
                  const Spacer(),
                  Text(
                    '${country['fee']}%',
                    style: const TextStyle(
                      fontSize: 12,
                      color: LTCColors.textTertiary,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
          onChanged: (value) {
            if (value != null) setState(() => _selectedCountry = value);
          },
        ),
      ),
    );
  }

  // ─── Summary ──────────────────────────────────────────────

  Widget _buildSummary() {
    final fmt = NumberFormat('#,###', 'fr_FR');

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
                'Resume du paiement',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: LTCColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildSummaryRow(
            'Montant recharge',
            '\$${_amount.toStringAsFixed(2)}',
          ),
          const SizedBox(height: 8),
          _buildSummaryRow(
            'Frais de service (${_countryFeeRate.toStringAsFixed(1)}%)',
            '+ \$${_serviceFee.toStringAsFixed(2)}',
            valueColor: LTCColors.warning,
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Divider(color: LTCColors.border, height: 1),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total a payer',
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
