import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../models/transaction.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  static const _headerColor = Color(0xFF1A365D);
  static const _primaryBlue = Color(0xFF2B2BEE);
  static const _surfaceDark = Color(0xFF15152D);
  static const _bgDark = Color(0xFF101022);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
    final transactionsProvider =
        Provider.of<TransactionsProvider>(context, listen: false);
    await Future.wait([
      cardsProvider.fetchCards(),
      transactionsProvider.fetchTransactions(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgDark,
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: _primaryBlue,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Header
            SliverToBoxAdapter(child: _buildHeader()),
            // Virtual card
            SliverToBoxAdapter(child: _buildVirtualCard()),
            // Quick actions
            SliverToBoxAdapter(child: _buildQuickActions()),
            // Transactions header
            SliverToBoxAdapter(child: _buildTransactionsHeader()),
            // Transactions list
            _buildTransactionsList(),
            // Bottom padding for nav bar
            const SliverPadding(padding: EdgeInsets.only(bottom: 120)),
          ],
        ),
      ),
    );
  }

  // ─── Header ───

  Widget _buildHeader() {
    final authProvider = Provider.of<AuthProvider>(context);
    final firstName = authProvider.user?.firstName ?? 'Utilisateur';

    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 16,
        left: 24,
        right: 24,
        bottom: 24,
      ),
      decoration: const BoxDecoration(
        color: _headerColor,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(24),
          bottomRight: Radius.circular(24),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Bienvenue,',
                style: TextStyle(
                  color: Colors.blue[200],
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Bonjour, $firstName',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
          // Notification bell
          GestureDetector(
            onTap: () => Navigator.of(context).pushNamed('/notifications'),
            child: Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.1),
              ),
              child: Stack(
                children: [
                  const Center(
                    child: Icon(
                      Icons.notifications_rounded,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                  // Red badge
                  Positioned(
                    top: 10,
                    right: 10,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: Colors.red[500],
                        shape: BoxShape.circle,
                        border: Border.all(color: _headerColor, width: 2),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Virtual Card ───

  Widget _buildVirtualCard() {
    final cardsProvider = Provider.of<CardsProvider>(context);
    final card = cardsProvider.cards.isNotEmpty ? cardsProvider.cards.first : null;

    final balance = card?.balance ?? cardsProvider.totalBalance;
    final maskedNumber = card?.maskedNumber ?? '•••• •••• •••• ----';
    final holderName = Provider.of<AuthProvider>(context).user?.firstName.toUpperCase() ?? 'UTILISATEUR';
    final expiry = card?.expiryFormatted ?? '--/--';

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 8),
      child: Stack(
        children: [
          // Background glow
          Positioned.fill(
            child: Center(
              child: Container(
                width: 250,
                height: 150,
                decoration: BoxDecoration(
                  color: _primaryBlue.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(100),
                ),
              ),
            ),
          ),
          // Card
          AspectRatio(
            aspectRatio: 1.586,
            child: Container(
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF2B2BEE),
                  Color(0xFF5B2BEE),
                  Color(0xFF8E2BEE),
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.5),
                  blurRadius: 40,
                  offset: const Offset(0, 20),
                ),
              ],
            ),
            child: Stack(
              children: [
                // Glass overlay
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.15),
                    ),
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Colors.white.withValues(alpha: 0.1),
                        Colors.white.withValues(alpha: 0.05),
                      ],
                    ),
                  ),
                ),

                // Decorative blurred circles
                Positioned(
                  top: -40,
                  right: -40,
                  child: Container(
                    width: 160,
                    height: 160,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withValues(alpha: 0.08),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 40,
                  left: -40,
                  child: Container(
                    width: 128,
                    height: 128,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _primaryBlue.withValues(alpha: 0.3),
                    ),
                  ),
                ),

                // Card content
                Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Top row: VISA + chip
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // VISA logo
                          Text(
                            'VISA',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              fontStyle: FontStyle.italic,
                              letterSpacing: 2,
                            ),
                          ),
                          // Chip
                          _buildChip(),
                        ],
                      ),

                      const Spacer(),

                      // Balance
                      Text(
                        'Solde disponible',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 1,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_formatAmount(balance)} FCFA',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          letterSpacing: -0.5,
                        ),
                      ),

                      const Spacer(),

                      // Card number
                      Text(
                        maskedNumber,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 18,
                          fontWeight: FontWeight.w500,
                          letterSpacing: 3,
                          fontFamily: 'monospace',
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Bottom row: holder + expiry
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'TITULAIRE',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.5),
                                  fontSize: 9,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: 2,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                holderName,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: 1,
                                ),
                              ),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                'EXPIRE',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.5),
                                  fontSize: 9,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: 2,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                expiry,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  letterSpacing: 1,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          ),
        ],
      ),
    );
  }

  Widget _buildChip() {
    return Container(
      width: 48,
      height: 32,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4),
        color: const Color(0xFFFFD700).withValues(alpha: 0.2),
        border: Border.all(
          color: const Color(0xFFFFD700).withValues(alpha: 0.4),
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: 8,
            left: 0,
            right: 0,
            child: Container(
              height: 1,
              color: const Color(0xFFFFD700).withValues(alpha: 0.4),
            ),
          ),
          Positioned(
            bottom: 8,
            left: 0,
            right: 0,
            child: Container(
              height: 1,
              color: const Color(0xFFFFD700).withValues(alpha: 0.4),
            ),
          ),
          Positioned(
            left: 16,
            top: 0,
            bottom: 0,
            child: Container(
              width: 1,
              color: const Color(0xFFFFD700).withValues(alpha: 0.4),
            ),
          ),
          Center(
            child: Container(
              width: 32,
              height: 20,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(2),
                border: Border.all(
                  color: const Color(0xFFFFD700).withValues(alpha: 0.6),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Quick Actions ───

  Widget _buildQuickActions() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildActionButton(
            icon: Icons.shopping_bag_rounded,
            label: 'Acheter',
            isPrimary: false,
            onTap: () => Navigator.of(context).pushNamed('/purchase-card'),
          ),
          _buildActionButton(
            icon: Icons.add_rounded,
            label: 'Recharger',
            isPrimary: true,
            onTap: () => Navigator.of(context).pushNamed('/topup'),
          ),
          _buildActionButton(
            icon: Icons.south_rounded,
            label: 'Retirer',
            isPrimary: false,
            onTap: () => Navigator.of(context).pushNamed('/withdraw'),
          ),
          _buildActionButton(
            icon: Icons.history_rounded,
            label: 'Historique',
            isPrimary: false,
            onTap: () {
              // Switch to transactions tab handled by parent
            },
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required bool isPrimary,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isPrimary ? _primaryBlue : _surfaceDark,
              border: isPrimary
                  ? null
                  : Border.all(color: Colors.white.withValues(alpha: 0.05)),
              boxShadow: isPrimary
                  ? [
                      BoxShadow(
                        color: _primaryBlue.withValues(alpha: 0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ]
                  : [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.3),
                        blurRadius: 8,
                      ),
                    ],
            ),
            child: Icon(
              icon,
              color: isPrimary ? Colors.white : _primaryBlue,
              size: 24,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Transactions ───

  Widget _buildTransactionsHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'Transactions Récentes',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          GestureDetector(
            onTap: () {
              // Navigate to full transactions
            },
            child: const Text(
              'Voir tout',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: _primaryBlue,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionsList() {
    final transactionsProvider = Provider.of<TransactionsProvider>(context);
    final transactions = transactionsProvider.recentTransactions;

    if (transactions.isEmpty) {
      return SliverList(
        delegate: SliverChildListDelegate([
          Padding(
            padding: const EdgeInsets.all(32),
            child: Center(
              child: Column(
                children: [
                  Icon(Icons.receipt_long, size: 48, color: Colors.grey[700]),
                  const SizedBox(height: 12),
                  Text(
                    'Aucune transaction récente',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ]),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      sliver: SliverList(
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildTransactionItem(transactions[index]),
            );
          },
          childCount: transactions.length,
        ),
      ),
    );
  }

  Widget _buildTransactionItem(Transaction tx) {
    final dateFormat = DateFormat("dd MMM, HH:mm", 'fr_FR');
    final isCredit = tx.isCredit;

    // Determine icon and color based on merchant/type
    IconData iconData;
    Color iconBg;
    Color iconFg;

    switch (tx.type) {
      case 'TOPUP':
        iconData = Icons.account_balance_wallet_rounded;
        iconBg = Colors.orange;
        iconFg = Colors.white;
        break;
      case 'WITHDRAWAL':
        iconData = Icons.south_rounded;
        iconBg = _surfaceDark;
        iconFg = _primaryBlue;
        break;
      default:
        iconData = Icons.shopping_bag_rounded;
        iconBg = _surfaceDark;
        iconFg = _primaryBlue;
    }

    // Status badge
    Color statusColor;
    String statusLabel;
    switch (tx.status) {
      case 'SUCCESS':
      case 'COMPLETED':
        statusColor = const Color(0xFF22C55E);
        statusLabel = isCredit ? 'Reçu' : 'Complété';
        break;
      case 'PENDING':
        statusColor = const Color(0xFFF59E0B);
        statusLabel = 'En attente';
        break;
      default:
        statusColor = const Color(0xFFEF4444);
        statusLabel = 'Échoué';
    }

    return GestureDetector(
      onTap: () {
        Navigator.of(context).pushNamed(
          '/transaction-detail',
          arguments: tx,
        );
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _surfaceDark,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
        ),
        child: Row(
          children: [
            // Icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: iconBg,
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.1),
                ),
              ),
              child: Icon(iconData, color: iconFg, size: 22),
            ),
            const SizedBox(width: 16),
            // Name + date
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    tx.description,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    dateFormat.format(tx.createdAt),
                    style: TextStyle(
                      color: Colors.grey[500],
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            // Amount + status
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${isCredit ? '+' : '-'} ${_formatAmount(tx.absoluteAmount)} F',
                  style: TextStyle(
                    color: isCredit ? const Color(0xFF22C55E) : Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: statusColor.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ─── Helpers ───

  String _formatAmount(double amount) {
    final formatter = NumberFormat('#,###', 'fr_FR');
    return formatter.format(amount.round());
  }
}
