import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
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

  static const _primaryBlue = Color(0xFF2B2BEE);
  static const _bgLight = Color(0xFFF6F6F8);

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
      backgroundColor: _bgLight,
      body: Consumer<CardsProvider>(
        builder: (context, cardsProvider, _) {
          if (cardsProvider.isLoading && cardsProvider.cards.isEmpty) {
            return const Center(child: CircularProgressIndicator());
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
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Gérez vos moyens de paiement',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.grey[100],
              border: Border.all(color: Colors.grey[300]!, width: 2),
            ),
            child: ClipOval(
              child: Center(
                child: Text(
                  user?.firstName.substring(0, 1).toUpperCase() ?? 'U',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Color(0xFF0F172A),
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
              color: _primaryBlue.withValues(alpha: 0.25),
              blurRadius: 50,
              offset: const Offset(0, 20),
              spreadRadius: -12,
            )
          else
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
              blurRadius: 20,
              offset: const Offset(0, 10),
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
              width: 200,
              height: 200,
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
                color: Colors.black.withValues(alpha: 0.1),
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
                        color: Colors.white.withValues(alpha: 0.8),
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
                      '${_formatAmount(card.balance)} FCFA',
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
                          'Numéro de carte',
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
            color: isActive ? _primaryBlue : Colors.grey[300],
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
            card.isFrozen ? 'Dégeler' : 'Geler',
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
            'Détails',
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
              color: _primaryBlue.withValues(alpha: 0.1),
            ),
            child: Icon(icon, color: _primaryBlue, size: 24),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.grey[600],
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
    final usedPercent = (card.balance / 500000).clamp(0.0, 1.0);

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
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFF1F5F9)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
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
                      child: _buildInfoItem('ÉMETTEUR', 'LTC Bank'),
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
                      child: _buildInfoItem('CRÉÉE LE', createdFormatted),
                    ),
                  ],
                ),
                // Limit progress
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.only(top: 24),
                  decoration: const BoxDecoration(
                    border: Border(
                      top: BorderSide(color: Color(0xFFF1F5F9)),
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Plafond mensuel',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.grey[500],
                            ),
                          ),
                          Text(
                            '${_formatAmountShort(card.balance)} / 500k FCFA',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: _primaryBlue,
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
                          backgroundColor: const Color(0xFFF1F5F9),
                          valueColor: const AlwaysStoppedAnimation<Color>(
                              _primaryBlue),
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
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: Colors.grey[400],
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            if (icon != null) ...[
              Icon(icon, size: 16, color: _primaryBlue),
              const SizedBox(width: 6),
            ],
            Flexible(
              child: Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF1E293B),
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
                    'Dernières Activités',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
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
                        color: _primaryBlue,
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Column(
        children: [
          Icon(Icons.receipt_long_outlined,
              size: 40, color: Colors.grey[300]),
          const SizedBox(height: 8),
          Text(
            'Aucune activité récente',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[400],
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
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
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  dateFormatted,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),
          Text(
            '${tx.isDebit ? '-' : '+'} ${_formatAmount(tx.absoluteAmount)} F',
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
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
          color: _primaryBlue,
          borderRadius: BorderRadius.circular(28),
          boxShadow: [
            BoxShadow(
              color: _primaryBlue.withValues(alpha: 0.3),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.add_rounded, color: Colors.white, size: 22),
            SizedBox(width: 8),
            Text(
              'Nouvelle carte',
              style: TextStyle(
                color: Colors.white,
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
            Icon(Icons.credit_card_off_rounded,
                size: 80, color: Colors.grey[300]),
            const SizedBox(height: 24),
            const Text(
              'Aucune carte disponible',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Commencez par créer votre première carte virtuelle',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: Colors.grey[500]),
            ),
            const SizedBox(height: 32),
            GestureDetector(
              onTap: () => Navigator.of(context).pushNamed('/purchase-card'),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                decoration: BoxDecoration(
                  color: _primaryBlue,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Text(
                  'Créer une carte',
                  style: TextStyle(
                    color: Colors.white,
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
              card.isFrozen ? 'Carte dégelée' : 'Carte gelée'),
          backgroundColor: const Color(0xFF10B981),
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
        title: const Text('Bloquer la carte ?'),
        content: const Text(
            'Cette action est irréversible. Voulez-vous vraiment bloquer cette carte ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child:
                const Text('Bloquer', style: TextStyle(color: Colors.red)),
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
          content: const Text('Carte bloquée'),
          backgroundColor: Colors.red[700],
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
      return const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFFF97316), Color(0xFFE11D48)],
      );
    }
    if (card.isBlocked) {
      return const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF9333EA), Color(0xFF312E81)],
      );
    }
    return const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF2B2BEE), Color(0xFF60A5FA)],
    );
  }

  _StatusInfo _getStatusInfo(VirtualCard card) {
    if (card.isFrozen) {
      return _StatusInfo(
        label: 'Gelée',
        bgColor: const Color(0xFFF97316).withValues(alpha: 0.2),
        borderColor: const Color(0xFFFED7AA).withValues(alpha: 0.3),
        textColor: const Color(0xFFFFF7ED),
        dotColor: Colors.transparent,
        icon: Icons.ac_unit_rounded,
      );
    }
    if (card.isBlocked) {
      return _StatusInfo(
        label: 'Bloquée',
        bgColor: Colors.red.withValues(alpha: 0.3),
        borderColor: const Color(0xFFFECACA).withValues(alpha: 0.3),
        textColor: const Color(0xFFFEE2E2),
        dotColor: Colors.transparent,
        icon: Icons.block_rounded,
      );
    }
    return _StatusInfo(
      label: 'Active',
      bgColor: const Color(0xFF10B981).withValues(alpha: 0.2),
      borderColor: const Color(0xFF34D399).withValues(alpha: 0.3),
      textColor: const Color(0xFFD1FAE5),
      dotColor: const Color(0xFF34D399),
    );
  }

  String _getCardLabel(VirtualCard card) {
    if (card.type == 'VISA') return 'Débit Virtuelle';
    if (card.type == 'MASTERCARD') return 'Prépayée';
    return 'Business';
  }

  String _getShortMasked(String masked) {
    if (masked.length >= 4) {
      return '•••• ${masked.substring(masked.length - 4)}';
    }
    return masked;
  }

  String _formatAmount(double amount) {
    return NumberFormat('#,###', 'fr_FR').format(amount.round());
  }

  String _formatAmountShort(double amount) {
    if (amount >= 1000) {
      return '${(amount / 1000).round()}k';
    }
    return amount.round().toString();
  }

  _TxIconInfo _getTxIcon(Transaction tx) {
    switch (tx.type) {
      case 'PURCHASE':
        return const _TxIconInfo(
          icon: Icons.shopping_bag_rounded,
          iconColor: Color(0xFFEA580C),
          bgColor: Color(0xFFFFF7ED),
        );
      case 'TOPUP':
        return const _TxIconInfo(
          icon: Icons.arrow_downward_rounded,
          iconColor: Color(0xFF10B981),
          bgColor: Color(0xFFECFDF5),
        );
      case 'WITHDRAWAL':
        return const _TxIconInfo(
          icon: Icons.arrow_upward_rounded,
          iconColor: Color(0xFFEF4444),
          bgColor: Color(0xFFFEF2F2),
        );
      default:
        return const _TxIconInfo(
          icon: Icons.subscriptions_rounded,
          iconColor: Color(0xFF2563EB),
          bgColor: Color(0xFFEFF6FF),
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
