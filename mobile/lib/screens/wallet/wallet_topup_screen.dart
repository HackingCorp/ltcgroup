import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../providers/wallet_provider.dart';
import '../../widgets/transaction_item.dart';
import '../payments/payment_webview_screen.dart';

/// Wallet recharge screen — top up wallet via MoMo/Orange Money
/// Dual-currency: user can enter in USD or local currency
class WalletTopupScreen extends StatefulWidget {
  const WalletTopupScreen({super.key});

  @override
  State<WalletTopupScreen> createState() => _WalletTopupScreenState();
}

class _WalletTopupScreenState extends State<WalletTopupScreen> {
  final _amountController = TextEditingController(text: '10');
  final _phoneController = TextEditingController();
  int _selectedAmountIndex = 1;
  String _selectedPayment = 'mobile_money';
  bool _isUsdMode = true; // true = USD input, false = local currency input
  // USD quick chips
  final _usdAmounts = [5, 10, 25, 50];
  final _usdLabels = ['\$5', '\$10', '\$25', '\$50'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<WalletProvider>(context, listen: false).fetchExchangeRate();
      Provider.of<TransactionsProvider>(context, listen: false).fetchWalletTransactions();
      // Pre-fill phone number from user profile
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      if (user?.phone != null && user!.phone!.isNotEmpty) {
        _phoneController.text = user.phone!;
      }
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  double get _inputAmount => double.tryParse(_amountController.text) ?? 0;

  double _amountUsd(WalletProvider wp) {
    if (_isUsdMode) return _inputAmount;
    if (wp.topupRate <= 0) return 0;
    return _inputAmount / wp.topupRate;
  }

  double _amountLocal(WalletProvider wp) {
    if (!_isUsdMode) return _inputAmount;
    return _inputAmount * wp.topupRate;
  }

  double _feeLocal(WalletProvider wp) => _amountLocal(wp) * wp.feeRate;
  double _totalLocal(WalletProvider wp) => _amountLocal(wp) + _feeLocal(wp);

  void _selectAmount(int index) {
    setState(() {
      _selectedAmountIndex = index;
      _amountController.text = _usdAmounts[index].toString();
      _isUsdMode = true;
    });
  }

  Future<void> _handleTopup() async {
    if (_inputAmount <= 0) return;

    final walletProvider = Provider.of<WalletProvider>(context, listen: false);
    final usdAmount = _isUsdMode ? _inputAmount : _amountUsd(walletProvider);

    if (usdAmount < 1) {
      _showSnack('Le montant minimum est de \$1 USD', LTCColors.error);
      return;
    }

    if (usdAmount > 10000) {
      _showSnack('Le montant maximum est de \$10,000 USD', LTCColors.error);
      return;
    }

    final phone = _phoneController.text.trim();
    if (_selectedPayment == 'mobile_money' && phone.isEmpty) {
      _showSnack('Veuillez entrer votre numero de telephone', LTCColors.error);
      return;
    }

    final paymentMethod = _selectedPayment == 'card' ? 'enkap' : 'mobile_money';
    final result = await walletProvider.topupWallet(
      amountUsd: _isUsdMode ? _inputAmount : null,
      amountLocal: !_isUsdMode ? _inputAmount : null,
      paymentMethod: paymentMethod,
      phone: _selectedPayment == 'mobile_money' ? phone : null,
    );

    if (!mounted) return;

    if (result == null || result['success'] != true) {
      _showSnack(walletProvider.error ?? 'Erreur lors de la recharge', LTCColors.error);
      return;
    }

    final paymentUrl = result['payment_url'] as String?;
    final transactionId = result['transaction_id'] as String?;

    if (paymentUrl == null || paymentUrl.isEmpty) {
      _showSnack(result['message'] ?? 'Paiement initie avec succes', LTCColors.success);
      Navigator.of(context).pop();
      return;
    }

    // Open payment WebView — verification happens inside the WebView
    // Returns: 'completed', 'failed', 'pending', or null (user dismiss)
    final title = _selectedPayment == 'card'
        ? 'Paiement par Carte'
        : 'Paiement Mobile Money';
    final paymentResult = await Navigator.of(context).push<String?>(
      MaterialPageRoute(
        builder: (context) => PaymentWebViewScreen(
          paymentUrl: paymentUrl,
          title: title,
          transactionId: transactionId,
        ),
      ),
    );
    if (!mounted) return;

    final txProvider = Provider.of<TransactionsProvider>(context, listen: false);

    if (paymentResult == 'completed') {
      _showSnack('Paiement confirme ! Wallet recharge avec succes.', LTCColors.success);
      walletProvider.fetchBalance();
      txProvider.fetchWalletTransactions();
      txProvider.fetchTransactions(); // Refresh main list for dashboard/activite
      Navigator.of(context).pop();
    } else if (paymentResult == 'failed') {
      _showSnack('Le paiement a echoue. Veuillez reessayer.', LTCColors.error);
      txProvider.fetchTransactions(); // Still refresh — FAILED tx should show
    } else if (paymentResult == 'pending') {
      _showSnack(
        'Paiement en cours de traitement. Votre solde sera mis a jour automatiquement.',
        LTCColors.warning,
      );
      txProvider.fetchTransactions(); // Refresh — PENDING tx should show
      Navigator.of(context).pop();
    } else {
      // User dismissed WebView manually — try quick verify
      if (transactionId != null) {
        final verifyResult = await walletProvider.verifyTopup(
          transactionId,
          maxAttempts: 3,
          delay: const Duration(seconds: 2),
        );
        if (!mounted) return;
        final status = verifyResult?['status'] as String?;
        if (status == 'COMPLETED') {
          _showSnack('Paiement confirme ! Wallet recharge avec succes.', LTCColors.success);
          walletProvider.fetchBalance();
          Navigator.of(context).pop();
        }
      }
      // Always refresh main transactions list when leaving
      txProvider.fetchTransactions();
    }
  }

  void _showSnack(String message, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Scaffold(
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
                      _buildWalletCard(),
                      const SizedBox(height: 24),
                      _buildCurrencyToggle(),
                      const SizedBox(height: 16),
                      _buildAmountInput(),
                      const SizedBox(height: 24),
                      _buildQuickChips(),
                      const SizedBox(height: 24),
                      _buildExchangeRateInfo(),
                      const SizedBox(height: 24),
                      _buildPaymentMethods(),
                      if (_selectedPayment == 'mobile_money') ...[
                        const SizedBox(height: 24),
                        _buildPhoneInput(),
                      ],
                      const SizedBox(height: 32),
                      _buildSummary(),
                      const SizedBox(height: 32),
                      _buildWalletHistory(),
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
    ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.fromLTRB(8, MediaQuery.of(context).padding.top + 8, 8, 16),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.chevron_left_rounded, size: 28, color: LTCColors.textPrimary),
          ),
          const Expanded(
            child: Text(
              'Recharger Wallet',
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

  Widget _buildWalletCard() {
    final walletProvider = Provider.of<WalletProvider>(context);
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [LTCColors.surfaceElevated, LTCColors.surface],
        ),
        border: Border.all(color: LTCColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
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
                      'Solde Wallet',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: LTCColors.textSecondary),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          '\$${_formatUsd(walletProvider.balance)}',
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: LTCColors.textPrimary, letterSpacing: -0.5),
                        ),
                        const SizedBox(width: 6),
                        const Text('USD', style: TextStyle(fontSize: 13, color: LTCColors.textSecondary)),
                      ],
                    ),
                  ],
                ),
                Icon(Icons.account_balance_wallet_rounded, color: LTCColors.gold.withValues(alpha: 0.5), size: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrencyToggle() {
    final wp = Provider.of<WalletProvider>(context);
    return Container(
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: LTCColors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() {
                if (!_isUsdMode) {
                  _isUsdMode = true;
                  _amountController.text = _amountUsd(wp).toStringAsFixed(0);
                  _selectedAmountIndex = -1;
                }
              }),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: _isUsdMode ? LTCColors.gold : Colors.transparent,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Text(
                  'USD (\$)',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: _isUsdMode ? LTCColors.background : LTCColors.textSecondary,
                  ),
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() {
                if (_isUsdMode) {
                  _isUsdMode = false;
                  _amountController.text = _amountLocal(wp).toStringAsFixed(0);
                  _selectedAmountIndex = -1;
                }
              }),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: !_isUsdMode ? LTCColors.gold : Colors.transparent,
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Text(
                  wp.localCurrency,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: !_isUsdMode ? LTCColors.background : LTCColors.textSecondary,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAmountInput() {
    final wp = Provider.of<WalletProvider>(context);
    return Column(
      children: [
        const Text(
          'Montant a recharger',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: LTCColors.textSecondary),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: 280,
          child: TextField(
            controller: _amountController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: LTCColors.textPrimary, letterSpacing: -1),
            decoration: const InputDecoration(
              border: InputBorder.none,
              hintText: '0',
              hintStyle: TextStyle(color: LTCColors.textTertiary),
              contentPadding: EdgeInsets.zero,
              isDense: true,
              fillColor: Colors.transparent,
              filled: false,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
            ),
            onChanged: (val) {
              setState(() {
                if (_isUsdMode) {
                  final parsed = double.tryParse(val) ?? 0.0;
                  _selectedAmountIndex = _usdAmounts.indexOf(parsed.toInt());
                } else {
                  _selectedAmountIndex = -1;
                }
              });
            },
          ),
        ),
        const SizedBox(height: 4),
        Text(
          _isUsdMode ? 'USD' : wp.localCurrency,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textTertiary, letterSpacing: 2),
        ),
      ],
    );
  }

  Widget _buildQuickChips() {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _usdLabels.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          final isActive = _isUsdMode && _selectedAmountIndex == index;
          return GestureDetector(
            onTap: () => _selectAmount(index),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: isActive ? LTCColors.gold : LTCColors.surfaceLight,
                borderRadius: BorderRadius.circular(12),
                border: isActive ? null : Border.all(color: LTCColors.border),
                boxShadow: isActive
                    ? [BoxShadow(color: LTCColors.gold.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))]
                    : null,
              ),
              child: Text(
                _usdLabels[index],
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isActive ? FontWeight.bold : FontWeight.w600,
                  color: isActive ? LTCColors.background : LTCColors.textSecondary,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildExchangeRateInfo() {
    final wp = Provider.of<WalletProvider>(context);
    if (wp.topupRate <= 0) {
      return const SizedBox.shrink();
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: LTCColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.currency_exchange, size: 18, color: LTCColors.gold),
          const SizedBox(width: 8),
          Text(
            '1 USD = ${_formatLocal(wp.topupRate)} ${wp.localCurrency}',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: LTCColors.gold),
          ),
        ],
      ),
    );
  }

  Widget _buildPhoneInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 4, bottom: 8),
          child: Text('Numero de telephone', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textSecondary)),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: LTCColors.surfaceLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: LTCColors.border),
          ),
          child: TextField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            style: const TextStyle(fontSize: 16, color: LTCColors.textPrimary),
            decoration: const InputDecoration(
              border: InputBorder.none,
              hintText: '6XXXXXXXX',
              hintStyle: TextStyle(color: LTCColors.textTertiary),
              prefixIcon: Icon(Icons.phone_rounded, color: LTCColors.textSecondary),
              fillColor: Colors.transparent,
              filled: false,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentMethods() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 4, bottom: 16),
          child: Text('Moyen de paiement', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textSecondary)),
        ),
        _buildPaymentOption(
          id: 'mobile_money',
          title: 'Mobile Money',
          subtitle: 'MTN MoMo, Orange Money',
          color: LTCColors.warning,
          child: const Icon(Icons.phone_android_rounded, size: 18, color: LTCColors.background),
        ),
        const SizedBox(height: 12),
        _buildPaymentOption(
          id: 'card',
          title: 'Carte Bancaire',
          subtitle: 'Visa, Mastercard',
          color: LTCColors.surfaceElevated,
          child: const Icon(Icons.credit_card_rounded, size: 18, color: LTCColors.textPrimary),
        ),
      ],
    );
  }

  Widget _buildPaymentOption({
    required String id,
    required String title,
    String? subtitle,
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
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? LTCColors.gold : LTCColors.border, width: isSelected ? 1.5 : 1),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(shape: BoxShape.circle, color: color),
              child: Center(child: child),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textPrimary)),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 12, color: LTCColors.textSecondary)),
                  ],
                ],
              ),
            ),
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: isSelected ? LTCColors.gold : LTCColors.textTertiary, width: 2),
                color: isSelected ? LTCColors.gold : Colors.transparent,
              ),
              child: isSelected ? const Center(child: Icon(Icons.circle, size: 8, color: LTCColors.background)) : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummary() {
    final wp = Provider.of<WalletProvider>(context);
    final localAmt = _amountLocal(wp);
    final fee = _feeLocal(wp);
    final total = _totalLocal(wp);
    final usdAmt = _amountUsd(wp);
    final feePercent = (wp.feeRate * 100).toStringAsFixed(1);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: LTCColors.border),
      ),
      child: Column(
        children: [
          _summaryRow('Credit wallet', '\$${_formatUsd(usdAmt)} USD'),
          const SizedBox(height: 12),
          _summaryRow('Montant ${wp.localCurrency}', '${_formatLocal(localAmt)} ${wp.localCurrency}'),
          const SizedBox(height: 12),
          _summaryRow('Frais ($feePercent%)', '${_formatLocal(fee)} ${wp.localCurrency}'),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Container(height: 1, color: LTCColors.border),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total a payer', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textPrimary)),
              Text(
                '${_formatLocal(total)} ${wp.localCurrency}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: LTCColors.textPrimary),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, color: LTCColors.textSecondary)),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: LTCColors.textPrimary)),
      ],
    );
  }

  Widget _buildWalletHistory() {
    return Consumer<TransactionsProvider>(
      builder: (context, txProvider, _) {
        if (txProvider.isLoadingWallet) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: CircularProgressIndicator(color: LTCColors.gold, strokeWidth: 2)),
          );
        }

        final txList = txProvider.walletTransactions;
        if (txList.isEmpty) {
          return const SizedBox.shrink();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.only(left: 4, bottom: 12),
              child: Text(
                'Historique wallet',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textSecondary),
              ),
            ),
            Container(
              decoration: BoxDecoration(
                color: LTCColors.surface,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: LTCColors.border),
              ),
              child: ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: txList.length > 10 ? 10 : txList.length,
                separatorBuilder: (_, __) => Divider(height: 1, color: LTCColors.border.withValues(alpha: 0.5)),
                itemBuilder: (context, index) {
                  return TransactionItem(transaction: txList[index]);
                },
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildCta() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [LTCColors.background.withValues(alpha: 0), LTCColors.background.withValues(alpha: 0.9), LTCColors.background],
        ),
      ),
      child: Consumer<WalletProvider>(
        builder: (context, walletProvider, _) {
          return GestureDetector(
            onTap: walletProvider.isLoading ? null : _handleTopup,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [LTCColors.goldDark, LTCColors.gold],
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [BoxShadow(color: LTCColors.gold.withValues(alpha: 0.25), blurRadius: 20, offset: const Offset(0, 8))],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (walletProvider.isLoading)
                    const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: LTCColors.background, strokeWidth: 2.5))
                  else ...[
                    const Icon(Icons.bolt_rounded, color: LTCColors.background, size: 22),
                    const SizedBox(width: 8),
                    const Text('Recharger maintenant', style: TextStyle(color: LTCColors.background, fontSize: 16, fontWeight: FontWeight.bold)),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _formatUsd(double amount) {
    return NumberFormat('#,##0.00', 'en_US').format(amount);
  }

  String _formatLocal(double amount) {
    return NumberFormat('#,###', 'fr_FR').format(amount.round());
  }
}
