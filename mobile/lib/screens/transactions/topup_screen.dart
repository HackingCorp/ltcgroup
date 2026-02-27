import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/success_dialog.dart';
import '../../config/theme.dart';
import '../payments/payment_webview_screen.dart';

/// Card recharge screen matching LTC Pay dark/gold design
class TopupScreen extends StatefulWidget {
  const TopupScreen({super.key});

  @override
  State<TopupScreen> createState() => _TopupScreenState();
}

class _TopupScreenState extends State<TopupScreen> {
  final _amountController = TextEditingController(text: '10000');
  final _apiService = ApiService();
  String? _selectedCardId;
  int _selectedAmountIndex = 1;
  String _selectedPayment = 'mobile_money'; // 'mobile_money' or 'card'
  String _selectedCountry = 'CM';
  bool _isProcessing = false;

  final _amounts = [5, 10, 25, 50];
  final _amountLabels = ['\$5', '\$10', '\$25', '\$50'];

  // Country list (subset shown by default, full list available)
  static const _countries = [
    {'code': 'CM', 'name': 'Cameroun', 'fee': 3.0},
    {'code': 'SN', 'name': 'Senegal', 'fee': 3.0},
    {'code': 'CI', 'name': "Cote d'Ivoire", 'fee': 3.5},
    {'code': 'GA', 'name': 'Gabon', 'fee': 3.5},
    {'code': 'CD', 'name': 'Congo RDC', 'fee': 4.0},
    {'code': 'BF', 'name': 'Burkina Faso', 'fee': 3.5},
    {'code': 'ML', 'name': 'Mali', 'fee': 3.5},
    {'code': 'BJ', 'name': 'Benin', 'fee': 3.5},
    {'code': 'TG', 'name': 'Togo', 'fee': 3.5},
    {'code': 'KE', 'name': 'Kenya', 'fee': 2.0},
    {'code': 'TZ', 'name': 'Tanzanie', 'fee': 3.5},
    {'code': 'UG', 'name': 'Ouganda', 'fee': 3.5},
    {'code': 'NG', 'name': 'Nigeria', 'fee': 2.5},
    {'code': 'NE', 'name': 'Niger', 'fee': 4.0},
    {'code': 'RW', 'name': 'Rwanda', 'fee': 4.25},
    {'code': 'CG', 'name': 'Congo Brazza', 'fee': 5.0},
    {'code': 'GN', 'name': 'Guinee', 'fee': 4.25},
    {'code': 'GH', 'name': 'Ghana', 'fee': 3.0},
  ];

  double get _amount => double.tryParse(_amountController.text) ?? 0;
  double get _feeRate {
    if (_selectedPayment != 'mobile_money') return 0.0;
    final country = _countries.firstWhere(
      (c) => c['code'] == _selectedCountry,
      orElse: () => {'fee': 3.0},
    );
    return (country['fee'] as num).toDouble() / 100;
  }
  double get _fee => _amount * _feeRate;
  double get _total => _amount + _fee;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is String) {
        setState(() => _selectedCardId = args);
      } else {
        final cards = Provider.of<CardsProvider>(context, listen: false).cards;
        final active = cards.where((c) => !c.isBlocked).toList();
        if (active.isNotEmpty) {
          setState(() => _selectedCardId = active.first.id);
        }
      }
    });
  }

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

  Future<void> _handleTopup() async {
    if (_amount <= 0 || _selectedCardId == null || _isProcessing) return;

    setState(() => _isProcessing = true);

    try {
      if (_selectedPayment == 'mobile_money') {
        await _handleMobileMoneyTopup();
      } else {
        await _handleCardTopup();
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _handleMobileMoneyTopup() async {
    try {
      // Call payment initiation API
      final result = await _apiService.initiatePayment(
        method: 'mobile_money',
        amount: _amount,
        cardId: _selectedCardId!,
        countryCode: _selectedCountry,
      );

      if (!mounted) return;

      final paymentUrl = result['payment_url'] as String?;
      if (paymentUrl == null || paymentUrl.isEmpty) {
        _showError('Le lien de paiement n\'a pas ete genere');
        return;
      }

      // Open WebView for payment
      final paymentResult = await Navigator.of(context).push<bool?>(
        MaterialPageRoute(
          builder: (context) => PaymentWebViewScreen(
            paymentUrl: paymentUrl,
            title: 'Paiement Mobile Money',
          ),
        ),
      );

      if (!mounted) return;

      if (paymentResult == true) {
        // Payment succeeded
        final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
        final card = cardsProvider.getCardById(_selectedCardId!);
        final newBalance = (card?.balance ?? 0) + _amount;
        if (card != null) {
          cardsProvider.updateCardBalance(_selectedCardId!, newBalance);
        }

        await SuccessDialog.showTopupSuccess(
          context,
          amount: _amount,
          newBalance: newBalance,
        );

        if (!mounted) return;
        Navigator.of(context).pop();
      } else if (paymentResult == false) {
        _showError('Le paiement a echoue. Veuillez reessayer.');
      }
      // null = user dismissed, do nothing
    } catch (e) {
      if (!mounted) return;
      _showError(e.toString().replaceFirst('Exception: ', ''));
    }
  }

  Future<void> _handleCardTopup() async {
    try {
      // E-nkap card payment
      final result = await _apiService.initiatePayment(
        method: 'enkap',
        amount: _amount,
        cardId: _selectedCardId!,
        customerName: 'Client LTC',
      );

      if (!mounted) return;

      final paymentUrl = result['payment_url'] as String?;
      if (paymentUrl == null || paymentUrl.isEmpty) {
        _showError('Le lien de paiement n\'a pas ete genere');
        return;
      }

      final paymentResult = await Navigator.of(context).push<bool?>(
        MaterialPageRoute(
          builder: (context) => PaymentWebViewScreen(
            paymentUrl: paymentUrl,
            title: 'Paiement par Carte',
          ),
        ),
      );

      if (!mounted) return;

      if (paymentResult == true) {
        final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
        final card = cardsProvider.getCardById(_selectedCardId!);
        final newBalance = (card?.balance ?? 0) + _amount;
        if (card != null) {
          cardsProvider.updateCardBalance(_selectedCardId!, newBalance);
        }

        await SuccessDialog.showTopupSuccess(
          context,
          amount: _amount,
          newBalance: newBalance,
        );

        if (!mounted) return;
        Navigator.of(context).pop();
      } else if (paymentResult == false) {
        _showError('Le paiement a echoue. Veuillez reessayer.');
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
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 140),
                  child: Column(
                    children: [
                      const SizedBox(height: 8),
                      _buildMiniCard(),
                      const SizedBox(height: 32),
                      _buildAmountInput(),
                      const SizedBox(height: 24),
                      _buildQuickChips(),
                      const SizedBox(height: 32),
                      _buildPaymentMethods(),
                      if (_selectedPayment == 'mobile_money') ...[
                        const SizedBox(height: 16),
                        _buildCountrySelector(),
                      ],
                      const SizedBox(height: 32),
                      _buildSummary(),
                    ],
                  ),
                ),
              ),
            ],
          ),
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

  // --- Header ---

  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.fromLTRB(
          8, MediaQuery.of(context).padding.top + 8, 8, 16),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.chevron_left_rounded,
                size: 28, color: LTCColors.textPrimary),
          ),
          const Expanded(
            child: Text(
              'Recharge',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: LTCColors.textPrimary,
                letterSpacing: -0.3,
              ),
            ),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  // --- Mini Virtual Card ---

  Widget _buildMiniCard() {
    final cardsProvider = Provider.of<CardsProvider>(context);
    final card = _selectedCardId != null
        ? cardsProvider.getCardById(_selectedCardId!)
        : (cardsProvider.cards.isNotEmpty ? cardsProvider.cards.first : null);

    final balance = card?.balance ?? 0;
    final masked = card != null
        ? '**** ${card.maskedNumber.substring(card.maskedNumber.length - 4)}'
        : '**** ----';

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [LTCColors.surfaceElevated, LTCColors.surface],
        ),
        border: Border.all(color: LTCColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -40,
            top: -40,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: LTCColors.gold.withValues(alpha: 0.1),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Solde actuel',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: LTCColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          _formatAmount(balance),
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: LTCColors.textPrimary,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'USD',
                          style: TextStyle(
                            fontSize: 13,
                            color: LTCColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'LTC',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        fontStyle: FontStyle.italic,
                        color: LTCColors.gold.withValues(alpha: 0.8),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      masked,
                      style: const TextStyle(
                        fontSize: 14,
                        fontFamily: 'monospace',
                        letterSpacing: 2,
                        color: LTCColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --- Amount Input ---

  Widget _buildAmountInput() {
    return Column(
      children: [
        const Text(
          'Montant a recharger',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: LTCColors.textSecondary,
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: 280,
          child: TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 48,
              fontWeight: FontWeight.bold,
              color: LTCColors.textPrimary,
              letterSpacing: -1,
            ),
            decoration: const InputDecoration(
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              hintText: '0',
              hintStyle: TextStyle(color: LTCColors.textTertiary),
              contentPadding: EdgeInsets.zero,
              isDense: true,
              filled: false,
            ),
            onChanged: (val) {
              setState(() {
                final parsed = int.tryParse(val) ?? 0;
                _selectedAmountIndex = _amounts.indexOf(parsed);
              });
            },
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'USD',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: LTCColors.textTertiary,
            letterSpacing: 2,
          ),
        ),
      ],
    );
  }

  // --- Quick Chips ---

  Widget _buildQuickChips() {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _amountLabels.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final isActive = _selectedAmountIndex == index;
          return GestureDetector(
            onTap: () => _selectAmount(index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding:
                  const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: isActive ? LTCColors.gold : LTCColors.surface,
                borderRadius: BorderRadius.circular(22),
                border: isActive
                    ? null
                    : Border.all(color: LTCColors.border),
                boxShadow: isActive
                    ? [
                        BoxShadow(
                          color: LTCColors.gold.withValues(alpha: 0.3),
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
                  fontWeight: isActive ? FontWeight.bold : FontWeight.w600,
                  color: isActive
                      ? LTCColors.background
                      : LTCColors.textSecondary,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // --- Payment Methods ---

  Widget _buildPaymentMethods() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 4, bottom: 16),
          child: Text(
            'Moyen de paiement',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: LTCColors.textPrimary,
            ),
          ),
        ),
        _buildPaymentOption(
          id: 'mobile_money',
          title: 'Mobile Money',
          subtitle: '18 pays africains',
          color: LTCColors.warning,
          child: const Icon(Icons.phone_android_rounded,
              size: 18, color: LTCColors.background),
        ),
        const SizedBox(height: 12),
        _buildPaymentOption(
          id: 'card',
          title: 'Carte Bancaire',
          subtitle: 'Visa, Mastercard',
          color: LTCColors.surfaceElevated,
          child: const Icon(Icons.credit_card_rounded,
              size: 18, color: LTCColors.textPrimary),
        ),
      ],
    );
  }

  Widget _buildPaymentOption({
    required String id,
    required String title,
    required String subtitle,
    required Color color,
    required Widget child,
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
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color,
              ),
              child: Center(child: child),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
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
            ),
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected
                      ? LTCColors.gold
                      : LTCColors.textTertiary,
                  width: 2,
                ),
                color: isSelected ? LTCColors.gold : Colors.transparent,
              ),
              child: isSelected
                  ? const Center(
                      child: Icon(Icons.circle,
                          size: 8, color: LTCColors.background),
                    )
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  // --- Country Selector ---

  Widget _buildCountrySelector() {
    final selectedCountry = _countries.firstWhere(
      (c) => c['code'] == _selectedCountry,
      orElse: () => _countries.first,
    );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      decoration: BoxDecoration(
        color: LTCColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: _selectedCountry,
          isExpanded: true,
          dropdownColor: LTCColors.surfaceElevated,
          icon: const Icon(Icons.keyboard_arrow_down_rounded,
              color: LTCColors.textSecondary),
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
                  const Icon(Icons.public, size: 18,
                      color: LTCColors.textSecondary),
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

  // --- Summary ---

  Widget _buildSummary() {
    final fmt = NumberFormat('#,###', 'fr_FR');
    final cardsProvider = Provider.of<CardsProvider>(context);
    final card = _selectedCardId != null
        ? cardsProvider.getCardById(_selectedCardId!)
        : null;
    final masked = card != null
        ? '**** ${card.maskedNumber.substring(card.maskedNumber.length - 4)}'
        : '----';

    final feeLabel = _selectedPayment == 'mobile_money'
        ? 'Frais (${(_feeRate * 100).toStringAsFixed(1)}%)'
        : 'Frais';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: LTCColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
      ),
      child: Column(
        children: [
          _summaryRow('Carte', masked, isMono: true),
          const SizedBox(height: 12),
          _summaryRow(
              'Recharge', '\$${_amount.toStringAsFixed(2)}',
              bold: true),
          const SizedBox(height: 12),
          _summaryRow(
              feeLabel, '\$${_fee.toStringAsFixed(2)}',
              bold: true),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Container(
              height: 1,
              color: LTCColors.border,
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total a payer',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: LTCColors.textPrimary,
                ),
              ),
              Text(
                '\$${_total.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: LTCColors.gold,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value,
      {bool bold = false, bool isMono = false}) {
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
            fontWeight: bold ? FontWeight.w500 : FontWeight.normal,
            color: bold ? LTCColors.textPrimary : LTCColors.textSecondary,
            fontFamily: isMono ? 'monospace' : null,
          ),
        ),
      ],
    );
  }

  // --- CTA ---

  Widget _buildCta() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
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
        onTap: _isProcessing ? null : _handleTopup,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [LTCColors.goldDark, LTCColors.gold, LTCColors.goldLight],
            ),
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: LTCColors.gold.withValues(alpha: 0.25),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (_isProcessing)
                const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    color: LTCColors.background,
                    strokeWidth: 2.5,
                  ),
                )
              else ...[
                const Icon(Icons.bolt_rounded,
                    color: LTCColors.background, size: 22),
                const SizedBox(width: 8),
                const Text(
                  'Recharger maintenant',
                  style: TextStyle(
                    color: LTCColors.background,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // --- Helpers ---

  String _formatAmount(double amount) {
    return NumberFormat('#,###', 'fr_FR').format(amount.round());
  }
}
