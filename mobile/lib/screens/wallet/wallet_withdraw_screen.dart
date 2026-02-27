import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/wallet_provider.dart';

/// Withdraw wallet funds to MoMo
class WalletWithdrawScreen extends StatefulWidget {
  const WalletWithdrawScreen({super.key});

  @override
  State<WalletWithdrawScreen> createState() => _WalletWithdrawScreenState();
}

class _WalletWithdrawScreenState extends State<WalletWithdrawScreen> {
  final _amountController = TextEditingController(text: '10');
  final _phoneController = TextEditingController();
  int _selectedAmountIndex = 1;
  String _selectedPayment = 'mtn';

  final _amounts = [5, 10, 25, 50];
  final _amountLabels = ['\$5', '\$10', '\$25', '\$50'];

  double get _amount => double.tryParse(_amountController.text) ?? 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<WalletProvider>(context, listen: false).fetchExchangeRate();
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  void _selectAmount(int index) {
    setState(() {
      _selectedAmountIndex = index;
      _amountController.text = _amounts[index].toString();
    });
  }

  Future<void> _handleWithdraw() async {
    if (_amount <= 0) return;

    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Veuillez entrer le numero de reception'),
          backgroundColor: LTCColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    final walletProvider = Provider.of<WalletProvider>(context, listen: false);
    final result = await walletProvider.withdrawToMomo(
      amountUsd: _amount,
      phone: phone,
    );

    if (!mounted) return;

    if (result != null && result['success'] == true) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Retrait en cours de traitement'),
          backgroundColor: LTCColors.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(walletProvider.error ?? 'Erreur lors du retrait'),
          backgroundColor: LTCColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
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
                      _buildWalletBalance(),
                      const SizedBox(height: 20),
                      _buildExchangeRateInfo(),
                      const SizedBox(height: 32),
                      _buildAmountInput(),
                      const SizedBox(height: 24),
                      _buildQuickChips(),
                      const SizedBox(height: 32),
                      _buildPhoneInput(),
                      const SizedBox(height: 24),
                      _buildPaymentMethods(),
                      const SizedBox(height: 32),
                      _buildSummary(),
                    ],
                  ),
                ),
              ),
            ],
          ),
          Positioned(left: 0, right: 0, bottom: 0, child: _buildCta()),
        ],
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
              'Retrait Wallet',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: LTCColors.textPrimary),
            ),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  Widget _buildWalletBalance() {
    final walletProvider = Provider.of<WalletProvider>(context);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [LTCColors.surfaceElevated, LTCColors.surface],
        ),
        border: Border.all(color: LTCColors.border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Solde Wallet', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: LTCColors.textSecondary)),
              const SizedBox(height: 4),
              Text(
                '\$${_formatUsd(walletProvider.balance)}',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: LTCColors.textPrimary),
              ),
            ],
          ),
          Icon(Icons.account_balance_wallet_rounded, color: LTCColors.gold.withValues(alpha: 0.5), size: 28),
        ],
      ),
    );
  }

  Widget _buildExchangeRateInfo() {
    final wp = Provider.of<WalletProvider>(context);
    if (wp.withdrawalRate <= 0) return const SizedBox.shrink();

    final rateFmt = NumberFormat('#,##0.00', 'fr_FR');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: LTCColors.border),
      ),
      child: Row(
        children: [
          const Icon(Icons.currency_exchange_rounded, size: 18, color: LTCColors.gold),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '1 USD = ${rateFmt.format(wp.withdrawalRate)} ${wp.localCurrency} (taux reel)',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: LTCColors.gold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAmountInput() {
    return Column(
      children: [
        const Text('Montant a retirer', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: LTCColors.textSecondary)),
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
                _selectedAmountIndex = _amounts.indexOf(int.tryParse(val) ?? 0);
              });
            },
          ),
        ),
        const SizedBox(height: 4),
        const Text('USD', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textTertiary, letterSpacing: 2)),
      ],
    );
  }

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
                _amountLabels[index],
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

  Widget _buildPhoneInput() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 4, bottom: 8),
          child: Text('Numero de reception', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textSecondary)),
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
          child: Text('Recevoir via', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textSecondary)),
        ),
        _buildPaymentOption(
          id: 'mtn',
          title: 'MTN Mobile Money',
          color: const Color(0xFFFBBF24),
          child: const Text('MTN', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black)),
        ),
        const SizedBox(height: 12),
        _buildPaymentOption(
          id: 'orange',
          title: 'Orange Money',
          color: const Color(0xFFF97316),
          child: const Text('OM', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
        ),
      ],
    );
  }

  Widget _buildPaymentOption({
    required String id,
    required String title,
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
          border: Border.all(color: isSelected ? LTCColors.gold : LTCColors.border),
        ),
        child: Row(
          children: [
            Container(width: 40, height: 40, decoration: BoxDecoration(shape: BoxShape.circle, color: color), child: Center(child: child)),
            const SizedBox(width: 16),
            Expanded(child: Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textPrimary))),
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
    final localFmt = NumberFormat('#,###', 'fr_FR');
    final usdFmt = NumberFormat('#,##0.00', 'en_US');
    final realRate = wp.withdrawalRate;
    final amountLocal = _amount * realRate;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: LTCColors.border),
      ),
      child: Column(
        children: [
          _summaryRow('Montant du retrait', '\$${usdFmt.format(_amount)}'),
          if (realRate > 0) ...[
            const SizedBox(height: 12),
            _summaryRow('Taux de conversion', '1 USD = ${localFmt.format(realRate.round())} ${wp.localCurrency}'),
          ],
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Container(height: 1, color: LTCColors.border),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Vous recevrez', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textPrimary)),
              Text(
                realRate > 0
                    ? '${localFmt.format(amountLocal.round())} ${wp.localCurrency}'
                    : '\$${usdFmt.format(_amount)}',
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

  Widget _buildCta() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
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
            onTap: walletProvider.isLoading ? null : _handleWithdraw,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [LTCColors.goldDark, LTCColors.gold],
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [BoxShadow(color: LTCColors.gold.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (walletProvider.isLoading)
                    const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: LTCColors.background, strokeWidth: 2.5))
                  else ...[
                    const Icon(Icons.south_rounded, color: LTCColors.background, size: 20),
                    const SizedBox(width: 8),
                    const Text('Retirer maintenant', style: TextStyle(color: LTCColors.background, fontSize: 16, fontWeight: FontWeight.bold)),
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
}
