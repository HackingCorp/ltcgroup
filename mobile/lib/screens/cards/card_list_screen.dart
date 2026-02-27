import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../models/card.dart';
import '../../models/transaction.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';

/// Card management screen matching LTC Pay design
class CardListScreen extends StatefulWidget {
  const CardListScreen({super.key});

  @override
  State<CardListScreen> createState() => _CardListScreenState();
}

class _CardListScreenState extends State<CardListScreen> {
  final PageController _pageController = PageController(viewportFraction: 0.88);
  int _currentCardIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
    await cardsProvider.fetchCards();
    if (mounted) {
      final txProvider =
          Provider.of<TransactionsProvider>(context, listen: false);
      await txProvider.fetchTransactions();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LTCColors.background,
      body: Consumer<CardsProvider>(
        builder: (context, cardsProvider, _) {
          if (cardsProvider.isLoading && cardsProvider.cards.isEmpty) {
            return const Center(
              child: CircularProgressIndicator(color: LTCColors.gold),
            );
          }

          if (cardsProvider.cards.isEmpty) {
            return _buildEmptyState();
          }

          final selectedCard = _currentCardIndex < cardsProvider.cards.length
              ? cardsProvider.cards[_currentCardIndex]
              : cardsProvider.cards.first;

          return Stack(
            children: [
              RefreshIndicator(
                color: LTCColors.gold,
                backgroundColor: LTCColors.surface,
                onRefresh: _loadData,
                child: ListView(
                  padding: EdgeInsets.zero,
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 16),
                    _buildCarousel(cardsProvider.cards),
                    const SizedBox(height: 16),
                    _buildPaginationDots(cardsProvider.cards.length),
                    const SizedBox(height: 24),
                    _buildActionButtons(selectedCard),
                    const SizedBox(height: 24),
                    _buildInfoSection(selectedCard),
                    const SizedBox(height: 32),
                    _buildRecentActivity(selectedCard),
                    const SizedBox(height: 120),
                  ],
                ),
              ),
              // FAB
              Positioned(
                bottom: 24,
                right: 24,
                child: _buildFab(),
              ),
            ],
          );
        },
      ),
    );
  }

  // ─── Header ───────────────────────────────────────────────

  Widget _buildHeader() {
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    return Padding(
      padding: EdgeInsets.fromLTRB(
          24, MediaQuery.of(context).padding.top + 16, 24, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Mes Cartes',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: LTCColors.textPrimary,
                ),
              ),
              const SizedBox(height: 2),
              const Text(
                'Gerez vos moyens de paiement',
                style: TextStyle(
                  fontSize: 14,
                  color: LTCColors.textSecondary,
                ),
              ),
            ],
          ),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: LTCColors.surfaceLight,
              border: Border.all(color: LTCColors.border, width: 2),
            ),
            child: ClipOval(
              child: Center(
                child: Text(
                  user?.firstName.substring(0, 1).toUpperCase() ?? 'U',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: LTCColors.gold,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Cards Carousel ───────────────────────────────────────

  Widget _buildCarousel(List<VirtualCard> cards) {
    return SizedBox(
      height: 210,
      child: PageView.builder(
        controller: _pageController,
        itemCount: cards.length,
        onPageChanged: (index) {
          setState(() => _currentCardIndex = index);
        },
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: _buildCard(cards[index]),
          );
        },
      ),
    );
  }

  Widget _buildCard(VirtualCard card) {
    final gradient = _getCardGradient(card);
    final statusInfo = _getStatusInfo(card);

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: gradient,
        boxShadow: [
          if (card.isActive)
            BoxShadow(
              color: LTCColors.goldDark.withValues(alpha: 0.3),
              blurRadius: 50,
              offset: const Offset(0, 20),
              spreadRadius: -12,
            )
          else
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
        ],
      ),
      child: Stack(
        children: [
          // Background decoration — glassmorphism overlay
          Positioned(
            top: -60,
            right: -60,
            child: Container(
              width: 200,
              height: 200,
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
          // Glassmorphism overlay bar
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.12),
                ),
              ),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top row: card type + status
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _getCardLabel(card),
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 1,
                      ),
                    ),
                    _buildStatusBadge(statusInfo),
                  ],
                ),
                // Balance
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Solde disponible',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.7),
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '\$${_formatUsd(card.balance)}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ],
                ),
                // Bottom row: masked number + logo
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Numero de carte',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.6),
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _getShortMasked(card.maskedNumber),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 3,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                    _buildCardLogo(card),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(_StatusInfo info) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: info.bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: info.borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (info.icon != null) ...[
            Icon(info.icon, size: 12, color: info.textColor),
            const SizedBox(width: 4),
          ] else ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: info.dotColor,
              ),
            ),
            const SizedBox(width: 6),
          ],
          Text(
            info.label,
            style: TextStyle(
              color: info.textColor,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardLogo(VirtualCard card) {
    if (card.type == 'VISA') {
      return Text(
        'VISA',
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.9),
          fontSize: 22,
          fontWeight: FontWeight.bold,
          fontStyle: FontStyle.italic,
          letterSpacing: 2,
        ),
      );
    } else if (card.type == 'MASTERCARD') {
      return SizedBox(
        width: 48,
        height: 32,
        child: Stack(
          children: [
            Positioned(
              left: 0,
              child: Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.3),
                ),
              ),
            ),
            Positioned(
              right: 8,
              child: Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.3),
                ),
              ),
            ),
          ],
        ),
      );
    }
    return Icon(
      Icons.contactless_rounded,
      color: Colors.white.withValues(alpha: 0.8),
      size: 30,
    );
  }

  // ─── Pagination Dots ──────────────────────────────────────

  Widget _buildPaginationDots(int count) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(count, (index) {
        final isActive = index == _currentCardIndex;
        return Container(
          width: 8,
          height: 8,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isActive ? LTCColors.gold : LTCColors.surfaceLight,
          ),
        );
      }),
    );
  }

  // ─── Action Buttons ───────────────────────────────────────

  Widget _buildActionButtons(VirtualCard card) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildActionBtn(
            Icons.ac_unit_rounded,
            card.isFrozen ? 'Degeler' : 'Geler',
            () => _handleFreeze(card),
          ),
          _buildActionBtn(
            Icons.security_outlined,
            'Bloquer',
            () => _handleBlock(card),
          ),
          _buildActionBtn(
            Icons.sync_rounded,
            'Remplacer',
            () {},
          ),
          _buildActionBtn(
            Icons.visibility_outlined,
            'Details',
            () => Navigator.of(context)
                .pushNamed('/card-detail', arguments: card.id),
          ),
        ],
      ),
    );
  }

  Widget _buildActionBtn(IconData icon, String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: LTCColors.surface,
              border: Border.all(color: LTCColors.border),
            ),
            child: Icon(icon, color: LTCColors.gold, size: 24),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: LTCColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  // ─── Information Section ──────────────────────────────────

  Widget _buildInfoSection(VirtualCard card) {
    final createdFormatted =
        DateFormat('dd MMM, yyyy', 'fr_FR').format(card.createdAt);
    final usedPercent = (card.balance / 500).clamp(0.0, 1.0);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Informations',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: LTCColors.textPrimary,
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: LTCColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: LTCColors.border),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.15),
                  blurRadius: 40,
                  offset: const Offset(0, 10),
                  spreadRadius: -10,
                ),
              ],
            ),
            child: Column(
              children: [
                // Grid info
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem(
                        'TYPE DE CARTE',
                        _getCardLabel(card),
                        icon: Icons.credit_card_rounded,
                      ),
                    ),
                    Expanded(
                      child: _buildInfoItem('EMETTEUR', 'LTC Bank'),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem(
                          'EXPIRE LE', card.expiryFormatted),
                    ),
                    Expanded(
                      child: _buildInfoItem('CREEE LE', createdFormatted),
                    ),
                  ],
                ),
                // Limit progress
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.only(top: 24),
                  decoration: const BoxDecoration(
                    border: Border(
                      top: BorderSide(color: LTCColors.border),
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Plafond mensuel',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: LTCColors.textSecondary,
                            ),
                          ),
                          Text(
                            '\$${_formatUsd(card.balance)} / \$500',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: LTCColors.gold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: usedPercent,
                          minHeight: 8,
                          backgroundColor: LTCColors.surfaceLight,
                          valueColor: const AlwaysStoppedAnimation<Color>(
                              LTCColors.gold),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem(String label, String value, {IconData? icon}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: LTCColors.textTertiary,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            if (icon != null) ...[
              Icon(icon, size: 16, color: LTCColors.gold),
              const SizedBox(width: 6),
            ],
            Flexible(
              child: Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: LTCColors.textPrimary,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ─── Recent Activity ──────────────────────────────────────

  Widget _buildRecentActivity(VirtualCard card) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Consumer<TransactionsProvider>(
        builder: (context, txProvider, _) {
          final cardTxns = txProvider
              .getTransactionsForCard(card.id)
              .take(3)
              .toList();

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Dernieres Activites',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: LTCColors.textPrimary,
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      // Navigate to transactions filtered by this card
                    },
                    child: const Text(
                      'Voir tout',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: LTCColors.gold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (cardTxns.isEmpty)
                _buildNoActivity()
              else
                ...cardTxns.map((tx) => Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _buildActivityItem(tx),
                    )),
            ],
          );
        },
      ),
    );
  }

  Widget _buildNoActivity() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 32),
      width: double.infinity,
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
      ),
      child: const Column(
        children: [
          Icon(Icons.receipt_long_outlined,
              size: 40, color: LTCColors.textTertiary),
          SizedBox(height: 8),
          Text(
            'Aucune activite recente',
            style: TextStyle(
              fontSize: 14,
              color: LTCColors.textTertiary,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityItem(Transaction tx) {
    final iconInfo = _getTxIcon(tx);
    final dateFormatted = _formatTxDate(tx.createdAt);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: iconInfo.bgColor,
            ),
            child: Icon(iconInfo.icon, size: 18, color: iconInfo.iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  tx.description,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: LTCColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  dateFormatted,
                  style: const TextStyle(
                    fontSize: 12,
                    color: LTCColors.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          Text(
            '${tx.isDebit ? '-' : '+'} \$${_formatUsd(tx.absoluteAmount)}',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: tx.isDebit ? LTCColors.error : LTCColors.success,
            ),
          ),
        ],
      ),
    );
  }

  // ─── FAB ──────────────────────────────────────────────────

  Widget _buildFab() {
    return GestureDetector(
      onTap: () => Navigator.of(context).pushNamed('/purchase-card'),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
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
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.add_rounded, color: LTCColors.background, size: 22),
            const SizedBox(width: 8),
            Text(
              'Nouvelle carte',
              style: TextStyle(
                color: LTCColors.background,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Empty State ──────────────────────────────────────────

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.credit_card_off_rounded,
                size: 80, color: LTCColors.textTertiary),
            const SizedBox(height: 24),
            const Text(
              'Aucune carte disponible',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: LTCColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Commencez par creer votre premiere carte virtuelle',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: LTCColors.textSecondary),
            ),
            const SizedBox(height: 32),
            GestureDetector(
              onTap: () => Navigator.of(context).pushNamed('/purchase-card'),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [LTCColors.cardGold1, LTCColors.cardGold2, LTCColors.cardGold3],
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  'Creer une carte',
                  style: TextStyle(
                    color: LTCColors.background,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Actions ──────────────────────────────────────────────

  Future<void> _handleFreeze(VirtualCard card) async {
    final actionLabel = card.isFrozen ? 'degeler' : 'geler';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: LTCColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(
          'Voulez-vous $actionLabel cette carte ?',
          style: const TextStyle(color: LTCColors.textPrimary),
        ),
        content: Text(
          card.isFrozen
              ? 'La carte sera reactive et utilisable.'
              : 'La carte sera temporairement desactivee.',
          style: const TextStyle(color: LTCColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler', style: TextStyle(color: LTCColors.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Confirmer', style: TextStyle(color: card.isFrozen ? LTCColors.success : LTCColors.warning)),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
    final newStatus = card.isFrozen ? 'ACTIVE' : 'FROZEN';
    final success = await cardsProvider.updateCardStatus(
      cardId: card.id,
      status: newStatus,
    );
    if (!mounted) return;
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
              card.isFrozen ? 'Carte degelee' : 'Carte gelee'),
          backgroundColor: LTCColors.success,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  Future<void> _handleBlock(VirtualCard card) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: LTCColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Bloquer la carte ?',
          style: TextStyle(color: LTCColors.textPrimary),
        ),
        content: const Text(
          'Cette action est irreversible. Voulez-vous vraiment bloquer cette carte ?',
          style: TextStyle(color: LTCColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler', style: TextStyle(color: LTCColors.textSecondary)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child:
                const Text('Bloquer', style: TextStyle(color: LTCColors.error)),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
    final success = await cardsProvider.updateCardStatus(
      cardId: card.id,
      status: 'BLOCKED',
    );
    if (!mounted) return;
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Carte bloquee'),
          backgroundColor: LTCColors.error,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  // ─── Helpers ──────────────────────────────────────────────

  LinearGradient _getCardGradient(VirtualCard card) {
    if (card.isFrozen) {
      return LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          LTCColors.warning.withValues(alpha: 0.9),
          LTCColors.error.withValues(alpha: 0.8),
        ],
      );
    }
    if (card.isBlocked) {
      return LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          LTCColors.textTertiary,
          LTCColors.surfaceElevated,
        ],
      );
    }
    // Active card: gold gradient
    return const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [LTCColors.cardGold1, LTCColors.cardGold2, LTCColors.cardGold3],
    );
  }

  _StatusInfo _getStatusInfo(VirtualCard card) {
    if (card.isFrozen) {
      return _StatusInfo(
        label: 'Gelee',
        bgColor: LTCColors.warning.withValues(alpha: 0.2),
        borderColor: LTCColors.warning.withValues(alpha: 0.3),
        textColor: LTCColors.warning,
        dotColor: Colors.transparent,
        icon: Icons.ac_unit_rounded,
      );
    }
    if (card.isBlocked) {
      return _StatusInfo(
        label: 'Bloquee',
        bgColor: LTCColors.error.withValues(alpha: 0.2),
        borderColor: LTCColors.error.withValues(alpha: 0.3),
        textColor: LTCColors.error,
        dotColor: Colors.transparent,
        icon: Icons.block_rounded,
      );
    }
    return _StatusInfo(
      label: 'Active',
      bgColor: LTCColors.success.withValues(alpha: 0.2),
      borderColor: LTCColors.success.withValues(alpha: 0.3),
      textColor: LTCColors.success,
      dotColor: LTCColors.success,
    );
  }

  String _getCardLabel(VirtualCard card) {
    if (card.type == 'VISA') return 'Debit Virtuelle';
    if (card.type == 'MASTERCARD') return 'Prepayee';
    return 'Business';
  }

  String _getShortMasked(String masked) {
    if (masked.length >= 4) {
      return '**** ${masked.substring(masked.length - 4)}';
    }
    return masked;
  }

  String _formatUsd(double amount) {
    return NumberFormat('#,##0.00', 'en_US').format(amount);
  }

  _TxIconInfo _getTxIcon(Transaction tx) {
    switch (tx.type) {
      case 'PURCHASE':
        return _TxIconInfo(
          icon: Icons.shopping_bag_rounded,
          iconColor: LTCColors.warning,
          bgColor: LTCColors.warning.withValues(alpha: 0.12),
        );
      case 'TOPUP':
        return _TxIconInfo(
          icon: Icons.arrow_downward_rounded,
          iconColor: LTCColors.success,
          bgColor: LTCColors.success.withValues(alpha: 0.12),
        );
      case 'WITHDRAWAL':
        return _TxIconInfo(
          icon: Icons.arrow_upward_rounded,
          iconColor: LTCColors.error,
          bgColor: LTCColors.error.withValues(alpha: 0.12),
        );
      default:
        return _TxIconInfo(
          icon: Icons.subscriptions_rounded,
          iconColor: LTCColors.gold,
          bgColor: LTCColors.gold.withValues(alpha: 0.12),
        );
    }
  }

  String _formatTxDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final txDay = DateTime(date.year, date.month, date.day);

    final timeStr = DateFormat('HH:mm').format(date);
    if (txDay == today) {
      return "Aujourd'hui, $timeStr";
    }
    if (txDay == today.subtract(const Duration(days: 1))) {
      return 'Hier, $timeStr';
    }
    return '${DateFormat('dd MMM', 'fr_FR').format(date)}, $timeStr';
  }
}

// ─── Private data classes ─────────────────────────────────────

class _StatusInfo {
  final String label;
  final Color bgColor;
  final Color borderColor;
  final Color textColor;
  final Color dotColor;
  final IconData? icon;

  const _StatusInfo({
    required this.label,
    required this.bgColor,
    required this.borderColor,
    required this.textColor,
    required this.dotColor,
    this.icon,
  });
}

class _TxIconInfo {
  final IconData icon;
  final Color iconColor;
  final Color bgColor;

  const _TxIconInfo({
    required this.icon,
    required this.iconColor,
    required this.bgColor,
  });
}
