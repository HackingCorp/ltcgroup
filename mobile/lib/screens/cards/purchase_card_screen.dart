import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cards_provider.dart';
import '../../widgets/success_dialog.dart';

/// Purchase card screen matching LTC Pay design
class PurchaseCardScreen extends StatefulWidget {
  const PurchaseCardScreen({super.key});

  @override
  State<PurchaseCardScreen> createState() => _PurchaseCardScreenState();
}

class _PurchaseCardScreenState extends State<PurchaseCardScreen> {
  static const _primaryBlue = Color(0xFF2B2BEE);
  static const _bgLight = Color(0xFFF6F6F8);
  static const _serviceFee = 1500.0;

  String _selectedType = 'VISA';
  int _selectedAmountIndex = 1;
  String _selectedPayment = 'orange';
  final _amountController = TextEditingController(text: '10000');

  final _amounts = [5000, 10000, 25000, 50000, 100000];
  final _amountLabels = ['5,000', '10,000', '25,000', '50,000', '100k'];

  double get _amount => double.tryParse(_amountController.text) ?? 0;
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
    if (_amount <= 0) return;

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
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(cardsProvider.error ?? "Erreur lors de l'achat"),
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
      backgroundColor: Colors.white,
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
            icon: const Icon(Icons.arrow_back, color: Color(0xFF1F2937)),
          ),
          const Expanded(
            child: Text(
              'Acheter une carte',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF111827),
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
              Text(
                'Étape 1 sur 3',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Colors.grey[500],
                ),
              ),
              const Text(
                'Détails de la carte',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: _primaryBlue,
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
              backgroundColor: Color(0xFFF3F4F6),
              valueColor: AlwaysStoppedAnimation<Color>(_primaryBlue),
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
                color: Color(0xFF111827),
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
        color: _bgLight,
        borderRadius: BorderRadius.circular(20),
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
        color: active ? Colors.white : Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        boxShadow: active
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.06),
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
          color: active ? const Color(0xFF111827) : Colors.grey[500],
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
            colors: [Color(0xFF2563EB), _primaryBlue, Color(0xFF312E81)],
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF3B82F6).withValues(alpha: 0.2),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Background decoration
            Positioned(
              top: -60,
              right: -60,
              child: Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.05),
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
                  color: const Color(0xFF60A5FA).withValues(alpha: 0.2),
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
                        'LTC Pay',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.8),
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
                          color: const Color(0xFFFFD700).withValues(alpha: 0.2),
                        ),
                      ),
                      Text(
                        '•••• •••• •••• 4289',
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
                  child: const Icon(Icons.check, size: 16, color: _primaryBlue),
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
                  Color(0xFFF97316),
                  Color(0xFFEF4444),
                  Color(0xFFE11D48)
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFF97316).withValues(alpha: 0.2),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Stack(
              children: [
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'LTC Pay',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.8),
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 1,
                        ),
                      ),
                      Text(
                        '•••• •••• •••• ••••',
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
                      child: const Icon(Icons.check,
                          size: 16, color: _primaryBlue),
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
            color: Color(0xFF111827),
          ),
        ),
        const SizedBox(height: 16),
        // Input
        Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          decoration: BoxDecoration(
            color: _bgLight,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.transparent, width: 2),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Montant à créditer',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Colors.grey[500],
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
                        color: Color(0xFF111827),
                      ),
                      decoration: const InputDecoration(
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                        hintText: '0',
                        hintStyle: TextStyle(color: Color(0xFFD1D5DB)),
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
                  Text(
                    'FCFA',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey[400],
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
                    color: isActive ? _primaryBlue : _bgLight,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: isActive
                        ? [
                            BoxShadow(
                              color: _primaryBlue.withValues(alpha: 0.3),
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
                      color: isActive ? Colors.white : Colors.grey[600],
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
            color: Color(0xFF111827),
          ),
        ),
        const SizedBox(height: 16),
        _buildPaymentOption(
          id: 'mtn',
          title: 'MTN MoMo',
          subtitle: 'Mobile Money',
          color: const Color(0xFFFBBF24),
          iconWidget: const Text(
            'MTN',
            style: TextStyle(
                fontWeight: FontWeight.bold, fontSize: 11, color: Colors.black),
          ),
        ),
        const SizedBox(height: 12),
        _buildPaymentOption(
          id: 'orange',
          title: 'Orange Money',
          subtitle: 'Paiement mobile',
          color: const Color(0xFFF97316),
          iconWidget: const Icon(Icons.currency_exchange,
              size: 18, color: Colors.white),
        ),
        const SizedBox(height: 12),
        _buildPaymentOption(
          id: 'card',
          title: 'Carte Bancaire',
          subtitle: 'Visa / Mastercard',
          color: const Color(0xFFDBEAFE),
          iconWidget: const Icon(Icons.credit_card,
              size: 18, color: _primaryBlue),
        ),
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
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? _primaryBlue : const Color(0xFFF3F4F6),
            width: isSelected ? 1.5 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: _primaryBlue.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ],
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
                  color: isSelected ? _primaryBlue : Colors.grey[300]!,
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
                          color: _primaryBlue,
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
          ],
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
        color: _bgLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.receipt_long_rounded,
                  size: 16, color: _primaryBlue),
              SizedBox(width: 8),
              Text(
                'Résumé du paiement',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildSummaryRow(
            'Montant recharge',
            '${fmt.format(_amount.round())} FCFA',
          ),
          const SizedBox(height: 8),
          _buildSummaryRow(
            'Frais de service',
            '+ ${fmt.format(_serviceFee.round())} FCFA',
            valueColor: const Color(0xFFF97316),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Divider(color: Colors.grey[200], height: 1),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total à payer',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827),
                ),
              ),
              Text(
                '${fmt.format(_total.round())} FCFA',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF111827),
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
          style: TextStyle(fontSize: 14, color: Colors.grey[600]),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: valueColor ?? Colors.grey[600],
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
            Colors.white.withValues(alpha: 0),
            Colors.white.withValues(alpha: 0.9),
            Colors.white,
          ],
        ),
      ),
      child: Consumer<CardsProvider>(
        builder: (context, cardsProvider, _) {
          return GestureDetector(
            onTap: cardsProvider.isLoading ? null : _handlePurchase,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 18),
              decoration: BoxDecoration(
                color: _primaryBlue,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: _primaryBlue.withValues(alpha: 0.4),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (cardsProvider.isLoading)
                    const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    )
                  else ...[
                    const Text(
                      'Acheter ma carte',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward,
                        color: Colors.white, size: 18),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
