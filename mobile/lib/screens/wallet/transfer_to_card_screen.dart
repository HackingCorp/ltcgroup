import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/wallet_provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../models/card.dart';

/// Transfer funds from wallet to a virtual card
class TransferToCardScreen extends StatefulWidget {
  const TransferToCardScreen({super.key});

  @override
  State<TransferToCardScreen> createState() => _TransferToCardScreenState();
}

class _TransferToCardScreenState extends State<TransferToCardScreen> {
  static const _feeRate = 0.02;

  final _amountController = TextEditingController(text: '10');
  String? _selectedCardId;
  int _selectedAmountIndex = 1;
  bool _isProcessing = false;

  final _amounts = [5, 10, 25, 50];
  final _amountLabels = ['\$5', '\$10', '\$25', '\$50'];

  double get _amount => double.tryParse(_amountController.text) ?? 0;
  double get _fee => _amount * _feeRate;
  double get _totalDebit => _amount + _fee;

  bool _isInsufficientBalance(WalletProvider wp) => _amount > 0 && wp.balance < _totalDebit;

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

  Future<void> _handleTransfer() async {
    if (_amount <= 0 || _selectedCardId == null || _isProcessing) return;

    setState(() => _isProcessing = true);

    try {
    final walletProvider = Provider.of<WalletProvider>(context, listen: false);
    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);

    if (walletProvider.balance < _totalDebit) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Solde insuffisant pour effectuer ce transfert'),
          backgroundColor: LTCColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    final result = await walletProvider.transferToCard(
      cardId: _selectedCardId!,
      amount: _amount,
    );

    if (!mounted) return;

    if (result != null && result['success'] == true) {
      // Update card balance locally
      if (result['new_card_balance'] != null) {
        cardsProvider.updateCardBalance(
          _selectedCardId!,
          (result['new_card_balance'] as num).toDouble(),
        );
      }

      // Refresh transactions so dashboard/activity show the new transfer
      final txProvider = Provider.of<TransactionsProvider>(context, listen: false);
      txProvider.fetchTransactions();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Transfert effectue'),
          backgroundColor: LTCColors.success,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(walletProvider.error ?? 'Erreur lors du transfert'),
          backgroundColor: LTCColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
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
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 8),
                      _buildWalletBalance(),
                      const SizedBox(height: 24),
                      _buildCardSelector(),
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
              'Transferer vers Carte',
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

  Widget _buildCardSelector() {
    final cardsProvider = Provider.of<CardsProvider>(context);
    final activeCards = cardsProvider.cards.where((c) => !c.isBlocked).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Carte de destination', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: LTCColors.textPrimary)),
        const SizedBox(height: 12),
        if (activeCards.isEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: LTCColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: LTCColors.border),
            ),
            child: const Center(
              child: Text('Aucune carte active', style: TextStyle(color: LTCColors.textSecondary)),
            ),
          )
        else
          ...activeCards.map((card) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: _buildCardOption(card),
              )),
      ],
    );
  }

  Widget _buildCardOption(VirtualCard card) {
    final isSelected = _selectedCardId == card.id;
    return GestureDetector(
      onTap: () => setState(() => _selectedCardId = card.id),
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
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: isSelected ? LTCColors.gold : LTCColors.textTertiary, width: 2),
              ),
              child: isSelected
                  ? Center(child: Container(width: 10, height: 10, decoration: const BoxDecoration(shape: BoxShape.circle, color: LTCColors.gold)))
                  : null,
            ),
            const SizedBox(width: 16),
            Container(
              width: 40,
              height: 28,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                gradient: LinearGradient(
                  colors: card.type == 'VISA'
                      ? [const Color(0xFF2563EB), const Color(0xFF312E81)]
                      : [const Color(0xFFF97316), const Color(0xFFEF4444)],
                ),
              ),
              child: Center(
                child: Text(
                  card.type == 'VISA' ? 'V' : 'M',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${card.type} ${card.maskedNumber.length >= 4 ? card.maskedNumber.substring(card.maskedNumber.length - 4) : card.maskedNumber}',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textPrimary),
                  ),
                  Text(
                    '\$${_formatUsd(card.balance)}',
                    style: const TextStyle(fontSize: 12, color: LTCColors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAmountSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Montant a transferer', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: LTCColors.textPrimary)),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          decoration: BoxDecoration(
            color: LTCColors.surfaceLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: LTCColors.border),
          ),
          child: Row(
            children: [
              const Text('\$', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: LTCColors.textSecondary)),
              const SizedBox(width: 8),
              Expanded(
                child: TextField(
                  controller: _amountController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: LTCColors.textPrimary),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                    hintText: '0',
                    hintStyle: TextStyle(color: LTCColors.textTertiary),
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
              const Text('USD', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: LTCColors.textTertiary)),
            ],
          ),
        ),
        // Insufficient balance warning
        Consumer<WalletProvider>(
          builder: (context, wp, _) {
            if (_isInsufficientBalance(wp)) {
              return Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded, size: 16, color: LTCColors.error),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Solde insuffisant (\$${_formatUsd(wp.balance)} disponible, \$${_formatUsd(_totalDebit)} requis)',
                        style: const TextStyle(fontSize: 12, color: LTCColors.error, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              );
            }
            return const SizedBox.shrink();
          },
        ),
        const SizedBox(height: 12),
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
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: isActive ? LTCColors.gold : LTCColors.surfaceLight,
                    borderRadius: BorderRadius.circular(12),
                    border: isActive ? null : Border.all(color: LTCColors.border),
                  ),
                  child: Text(
                    _amountLabels[index],
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: isActive ? LTCColors.background : LTCColors.textSecondary),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSummary() {
    final usdFmt = NumberFormat('#,##0.00', 'en_US');
    final cardsProvider = Provider.of<CardsProvider>(context);
    final card = _selectedCardId != null ? cardsProvider.getCardById(_selectedCardId!) : null;
    final masked = card != null
        ? '.... ${card.maskedNumber.substring(card.maskedNumber.length - 4)}'
        : '----';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: LTCColors.border),
      ),
      child: Column(
        children: [
          _summaryRow('Carte', masked),
          const SizedBox(height: 12),
          _summaryRow('Montant', '\$${usdFmt.format(_amount)}'),
          const SizedBox(height: 12),
          _feeRow('Frais (2%)', '\$${usdFmt.format(_fee)}'),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Container(height: 1, color: LTCColors.border),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total debite du wallet', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: LTCColors.textPrimary)),
              Text('\$${usdFmt.format(_totalDebit)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: LTCColors.textPrimary)),
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

  Widget _feeRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, color: LTCColors.textSecondary)),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: LTCColors.gold)),
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
          final disabled = walletProvider.isLoading || _isProcessing || _amount <= 0 || _selectedCardId == null || _isInsufficientBalance(walletProvider);
          return GestureDetector(
            onTap: disabled ? null : _handleTransfer,
            child: Opacity(
              opacity: disabled ? 0.4 : 1.0,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 18),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [LTCColors.goldDark, LTCColors.gold],
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: disabled
                      ? null
                      : [BoxShadow(color: LTCColors.gold.withValues(alpha: 0.4), blurRadius: 20, offset: const Offset(0, 8))],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (walletProvider.isLoading || _isProcessing)
                      const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: LTCColors.background, strokeWidth: 2.5))
                    else ...[
                      const Text('Transferer', style: TextStyle(color: LTCColors.background, fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward, color: LTCColors.background, size: 18),
                    ],
                  ],
                ),
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
