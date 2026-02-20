import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../widgets/success_dialog.dart';

/// Card recharge screen matching LTC Pay design (green theme)
class TopupScreen extends StatefulWidget {
  const TopupScreen({super.key});

  @override
  State<TopupScreen> createState() => _TopupScreenState();
}

class _TopupScreenState extends State<TopupScreen> {
  static const _primaryGreen = Color(0xFF13EC5B);
  static const _bgLight = Color(0xFFF6F8F6);
  static const _feeRate = 0.02; // 2%

  final _amountController = TextEditingController(text: '10000');
  String? _selectedCardId;
  int _selectedAmountIndex = 1;
  String _selectedPayment = 'mtn';

  final _amounts = [5000, 10000, 25000, 50000];
  final _amountLabels = ['5,000', '10,000', '25,000', '50,000'];

  double get _amount => double.tryParse(_amountController.text) ?? 0;
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
        // Auto-select first active card
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
    if (_amount <= 0 || _selectedCardId == null) return;

    final txProvider =
        Provider.of<TransactionsProvider>(context, listen: false);
    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);

    final success = await txProvider.topupCard(
      cardId: _selectedCardId!,
      amount: _amount,
      currency: 'XAF',
    );

    if (!mounted) return;

    if (success) {
      final card = cardsProvider.getCardById(_selectedCardId!);
      final newBalance = (card?.balance ?? 0) + _amount;
      if (card != null) {
        cardsProvider.updateCardBalance(_selectedCardId!, newBalance);
      }

      if (!mounted) return;

      await SuccessDialog.showTopupSuccess(
        context,
        amount: _amount,
        newBalance: newBalance,
      );

      if (!mounted) return;
      Navigator.of(context).pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content:
              Text(txProvider.error ?? 'Erreur lors de la recharge'),
          backgroundColor: Colors.red[700],
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgLight,
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

  // ─── Header ───────────────────────────────────────────────

  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.fromLTRB(
          8, MediaQuery.of(context).padding.top + 8, 8, 16),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.chevron_left_rounded,
                size: 28, color: Color(0xFF1F2937)),
          ),
          const Expanded(
            child: Text(
              'Recharge',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF111827),
                letterSpacing: -0.3,
              ),
            ),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  // ─── Mini Virtual Card ────────────────────────────────────

  Widget _buildMiniCard() {
    final cardsProvider = Provider.of<CardsProvider>(context);
    final card = _selectedCardId != null
        ? cardsProvider.getCardById(_selectedCardId!)
        : (cardsProvider.cards.isNotEmpty ? cardsProvider.cards.first : null);

    final balance = card?.balance ?? 0;
    final masked = card != null
        ? '•••• ${card.maskedNumber.substring(card.maskedNumber.length - 4)}'
        : '•••• ----';

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1F2937), Color(0xFF111827)],
        ),
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
          // Green glow
          Positioned(
            right: -40,
            top: -40,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _primaryGreen.withValues(alpha: 0.2),
              ),
            ),
          ),
          // Content
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
                        color: Color(0xFF9CA3AF),
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
                            color: Colors.white,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'FCFA',
                          style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF9CA3AF),
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
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      masked,
                      style: const TextStyle(
                        fontSize: 14,
                        fontFamily: 'monospace',
                        letterSpacing: 2,
                        color: Color(0xFFD1D5DB),
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

  // ─── Amount Input ─────────────────────────────────────────

  Widget _buildAmountInput() {
    return Column(
      children: [
        Text(
          'Montant à recharger',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Colors.grey[500],
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
              color: Color(0xFF111827),
              letterSpacing: -1,
            ),
            decoration: const InputDecoration(
              border: InputBorder.none,
              hintText: '0',
              hintStyle: TextStyle(color: Color(0xFFD1D5DB)),
              contentPadding: EdgeInsets.zero,
              isDense: true,
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
        Text(
          'FCFA',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.grey[400],
            letterSpacing: 2,
          ),
        ),
      ],
    );
  }

  // ─── Quick Chips ──────────────────────────────────────────

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
                color: isActive ? _primaryGreen : Colors.white,
                borderRadius: BorderRadius.circular(22),
                border: isActive
                    ? null
                    : Border.all(color: const Color(0xFFE5E7EB)),
                boxShadow: isActive
                    ? [
                        BoxShadow(
                          color: _primaryGreen.withValues(alpha: 0.3),
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
                  color: isActive ? Colors.black : Colors.grey[600],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ─── Payment Methods ──────────────────────────────────────

  Widget _buildPaymentMethods() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 16),
          child: Text(
            'Moyen de paiement',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Colors.grey[900],
            ),
          ),
        ),
        _buildPaymentOption(
          id: 'mtn',
          title: 'MTN Mobile Money',
          subtitle: '•••• 8821',
          color: const Color(0xFFFBBF24),
          child: const Text(
            'MTN',
            style: TextStyle(
                fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black),
          ),
        ),
        const SizedBox(height: 12),
        _buildPaymentOption(
          id: 'orange',
          title: 'Orange Money',
          subtitle: 'Ajouter un numéro',
          color: const Color(0xFFF97316),
          child: const Text(
            'OM',
            style: TextStyle(
                fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
          ),
        ),
        const SizedBox(height: 12),
        _buildPaymentOption(
          id: 'card',
          title: 'Carte Bancaire',
          subtitle: 'Visa, Mastercard',
          color: const Color(0xFF1F2937),
          child: const Icon(Icons.credit_card_rounded,
              size: 18, color: Colors.white),
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
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? _primaryGreen : const Color(0xFFF3F4F6),
          ),
        ),
        child: Stack(
          children: [
            Row(
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
                          color: Color(0xFF111827),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
                // Custom radio
                Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected
                          ? _primaryGreen
                          : Colors.grey[300]!,
                      width: 2,
                    ),
                    color: isSelected ? _primaryGreen : Colors.transparent,
                  ),
                  child: isSelected
                      ? const Center(
                          child: Icon(Icons.circle,
                              size: 8, color: Colors.black),
                        )
                      : null,
                ),
              ],
            ),
            // Ring overlay
            if (isSelected)
              Positioned.fill(
                child: IgnorePointer(
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border:
                          Border.all(color: _primaryGreen, width: 2),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ─── Summary ──────────────────────────────────────────────

  Widget _buildSummary() {
    final fmt = NumberFormat('#,###', 'fr_FR');
    final cardsProvider = Provider.of<CardsProvider>(context);
    final card = _selectedCardId != null
        ? cardsProvider.getCardById(_selectedCardId!)
        : null;
    final masked = card != null
        ? '•••• ${card.maskedNumber.substring(card.maskedNumber.length - 4)}'
        : '----';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF).withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: const Color(0xFFDBEAFE)),
      ),
      child: Column(
        children: [
          _summaryRow('Carte', masked, isMono: true),
          const SizedBox(height: 12),
          _summaryRow(
              'Recharge', '${fmt.format(_amount.round())} FCFA',
              bold: true),
          const SizedBox(height: 12),
          _summaryRow(
              'Frais (2%)', '${fmt.format(_fee.round())} FCFA',
              bold: true),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Container(
              height: 1,
              color: const Color(0xFFBFDBFE).withValues(alpha: 0.5),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total à payer',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF111827),
                ),
              ),
              Text(
                '${fmt.format(_total.round())} FCFA',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827),
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
          style: TextStyle(fontSize: 14, color: Colors.grey[500]),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: bold ? FontWeight.w500 : FontWeight.normal,
            color: bold ? const Color(0xFF111827) : const Color(0xFF374151),
            fontFamily: isMono ? 'monospace' : null,
          ),
        ),
      ],
    );
  }

  // ─── CTA ──────────────────────────────────────────────────

  Widget _buildCta() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 48, 24, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            _bgLight.withValues(alpha: 0),
            _bgLight.withValues(alpha: 0.9),
            _bgLight,
          ],
        ),
      ),
      child: Consumer<TransactionsProvider>(
        builder: (context, txProvider, _) {
          return GestureDetector(
            onTap: txProvider.isLoading ? null : _handleTopup,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 18),
              decoration: BoxDecoration(
                color: _primaryGreen,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: _primaryGreen.withValues(alpha: 0.25),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (txProvider.isLoading)
                    const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        color: Colors.black,
                        strokeWidth: 2.5,
                      ),
                    )
                  else ...[
                    const Icon(Icons.bolt_rounded,
                        color: Colors.black, size: 22),
                    const SizedBox(width: 8),
                    const Text(
                      'Recharger maintenant',
                      style: TextStyle(
                        color: Colors.black,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ─── Helpers ──────────────────────────────────────────────

  String _formatAmount(double amount) {
    return NumberFormat('#,###', 'fr_FR').format(amount.round());
  }
}
