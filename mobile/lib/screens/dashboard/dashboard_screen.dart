import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../providers/wallet_provider.dart';
import '../../models/transaction.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      setState(() => _hasError = false);
      final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
      final transactionsProvider =
          Provider.of<TransactionsProvider>(context, listen: false);
      final walletProvider =
          Provider.of<WalletProvider>(context, listen: false);
      await Future.wait([
        cardsProvider.fetchCards(),
        transactionsProvider.fetchTransactions(),
        walletProvider.fetchBalance(),
      ]);
    } catch (e) {
      if (mounted) {
        setState(() => _hasError = true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LTCColors.background,
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: LTCColors.gold,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Header
            SliverToBoxAdapter(child: _buildHeader()),
            if (_hasError)
              SliverFillRemaining(
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_off_rounded,
                          size: 48, color: LTCColors.textTertiary),
                      const SizedBox(height: 16),
                      const Text(
                        'Erreur de chargement',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: LTCColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 16),
                      GestureDetector(
                        onTap: _loadData,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 24, vertical: 12),
                          decoration: BoxDecoration(
                            color: LTCColors.gold,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            'Reessayer',
                            style: TextStyle(
                              color: LTCColors.background,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else ...[
              // Wallet balance
              SliverToBoxAdapter(child: _buildWalletBalance()),
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
          ],
        ),
      ),
    );
  }

  // ─── Header ───

  Widget _buildHeader() {
    final authProvider = Provider.of<AuthProvider>(context);
    final firstName = authProvider.user?.firstName ?? 'Utilisateur';

    return Padding(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 16,
        left: 24,
        right: 24,
        bottom: 24,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Bienvenue,',
                style: TextStyle(
                  color: LTCColors.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Bonjour, $firstName',
                style: const TextStyle(
                  color: LTCColors.textPrimary,
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
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: LTCColors.surface,
              ),
              child: Stack(
                children: [
                  const Center(
                    child: Icon(
                      Icons.notifications_rounded,
                      color: LTCColors.textPrimary,
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
                        border: Border.all(color: LTCColors.surface, width: 2),
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

  // ─── Wallet Balance ───

  Widget _buildWalletBalance() {
    final walletProvider = Provider.of<WalletProvider>(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 0),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: LTCColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: LTCColors.border),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: LTCColors.gold.withValues(alpha: 0.15),
              ),
              child: const Icon(
                Icons.account_balance_wallet_rounded,
                color: LTCColors.gold,
                size: 24,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Solde Wallet',
                    style: TextStyle(
                      color: LTCColors.textSecondary,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '\$${_formatUsd(walletProvider.balance)}',
                    style: const TextStyle(
                      color: LTCColors.textPrimary,
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ),
            GestureDetector(
              onTap: () => Navigator.of(context).pushNamed('/wallet-topup'),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [LTCColors.goldDark, LTCColors.gold],
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.add, color: LTCColors.background, size: 16),
                    const SizedBox(width: 4),
                    Text(
                      'Recharger',
                      style: TextStyle(
                        color: LTCColors.background,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Virtual Card ───

  Widget _buildVirtualCard() {
    final cardsProvider = Provider.of<CardsProvider>(context);

    // No cards — show prompt to buy one
    if (cardsProvider.cards.isEmpty) {
      return _buildNoCardPrompt();
    }

    final card = cardsProvider.cards.first;
    final balance = card.balance;
    final maskedNumber = card.maskedNumber;
    final holderName =
        Provider.of<AuthProvider>(context).user?.firstName.toUpperCase() ??
            'UTILISATEUR';
    final expiry = card.expiryFormatted;

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
                  color: LTCColors.gold.withValues(alpha: 0.3),
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
                    LTCColors.cardGold1,
                    LTCColors.cardGold2,
                    LTCColors.cardGold3,
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
                        color: LTCColors.glassBorder,
                      ),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          LTCColors.glassWhite,
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
                        color: LTCColors.goldDark.withValues(alpha: 0.3),
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
                          '\$${_formatUsd(balance)}',
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
                                    color:
                                        Colors.white.withValues(alpha: 0.5),
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
                                    color:
                                        Colors.white.withValues(alpha: 0.5),
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

  Widget _buildNoCardPrompt() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 8),
      child: GestureDetector(
        onTap: () => Navigator.of(context).pushNamed('/purchase-card'),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: LTCColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: LTCColors.border),
          ),
          child: Column(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: LTCColors.gold.withValues(alpha: 0.15),
                ),
                child: const Icon(
                  Icons.credit_card_rounded,
                  color: LTCColors.gold,
                  size: 32,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Aucune carte virtuelle',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: LTCColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Achetez votre premiere carte virtuelle VISA pour effectuer des paiements en ligne',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  color: LTCColors.textSecondary,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [LTCColors.goldDark, LTCColors.gold],
                  ),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.add_rounded, color: LTCColors.background, size: 18),
                    SizedBox(width: 8),
                    Text(
                      'Acheter une carte',
                      style: TextStyle(
                        color: LTCColors.background,
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChip() {
    return Container(
      width: 48,
      height: 32,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(4),
        color: LTCColors.goldLight.withValues(alpha: 0.25),
        border: Border.all(
          color: LTCColors.goldLight.withValues(alpha: 0.5),
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
              color: LTCColors.goldLight.withValues(alpha: 0.5),
            ),
          ),
          Positioned(
            bottom: 8,
            left: 0,
            right: 0,
            child: Container(
              height: 1,
              color: LTCColors.goldLight.withValues(alpha: 0.5),
            ),
          ),
          Positioned(
            left: 16,
            top: 0,
            bottom: 0,
            child: Container(
              width: 1,
              color: LTCColors.goldLight.withValues(alpha: 0.5),
            ),
          ),
          Center(
            child: Container(
              width: 32,
              height: 20,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(2),
                border: Border.all(
                  color: LTCColors.goldLight.withValues(alpha: 0.7),
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
            icon: Icons.add_rounded,
            label: 'Recharger',
            isPrimary: true,
            onTap: () => Navigator.of(context).pushNamed('/wallet-topup'),
          ),
          _buildActionButton(
            icon: Icons.credit_card_rounded,
            label: 'Vers Carte',
            isPrimary: false,
            onTap: () => Navigator.of(context).pushNamed('/wallet-transfer'),
          ),
          _buildActionButton(
            icon: Icons.south_rounded,
            label: 'Retirer',
            isPrimary: false,
            onTap: () => Navigator.of(context).pushNamed('/wallet-withdraw'),
          ),
          _buildActionButton(
            icon: Icons.shopping_bag_rounded,
            label: 'Acheter',
            isPrimary: false,
            onTap: () => Navigator.of(context).pushNamed('/purchase-card'),
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
              gradient: isPrimary
                  ? const LinearGradient(
                      colors: [LTCColors.goldDark, LTCColors.gold],
                    )
                  : null,
              color: isPrimary ? null : LTCColors.surface,
              border: isPrimary
                  ? null
                  : Border.all(color: LTCColors.border),
              boxShadow: isPrimary
                  ? [
                      BoxShadow(
                        color: LTCColors.gold.withValues(alpha: 0.3),
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
              color: isPrimary ? LTCColors.background : LTCColors.gold,
              size: 24,
            ),
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
              color: LTCColors.textPrimary,
            ),
          ),
          GestureDetector(
            onTap: () => Navigator.of(context).pushNamed('/transactions'),
            child: const Text(
              'Voir tout',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: LTCColors.gold,
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
          const Padding(
            padding: EdgeInsets.all(32),
            child: Center(
              child: Column(
                children: [
                  Icon(
                    Icons.receipt_long,
                    size: 48,
                    color: LTCColors.textTertiary,
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Aucune transaction récente',
                    style: TextStyle(
                      fontSize: 14,
                      color: LTCColors.textTertiary,
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
      case 'WALLET_TOPUP':
        iconData = Icons.account_balance_wallet_rounded;
        iconBg = LTCColors.gold;
        iconFg = LTCColors.background;
        break;
      case 'WITHDRAWAL':
      case 'WALLET_WITHDRAWAL':
        iconData = Icons.south_rounded;
        iconBg = LTCColors.surface;
        iconFg = LTCColors.gold;
        break;
      case 'WALLET_TO_CARD':
        iconData = Icons.credit_card_rounded;
        iconBg = LTCColors.gold.withValues(alpha: 0.15);
        iconFg = LTCColors.gold;
        break;
      default:
        iconData = Icons.shopping_bag_rounded;
        iconBg = LTCColors.surface;
        iconFg = LTCColors.gold;
    }

    // Status badge
    Color statusColor;
    String statusLabel;
    switch (tx.status) {
      case 'SUCCESS':
      case 'COMPLETED':
        statusColor = LTCColors.success;
        statusLabel = isCredit ? 'Reçu' : 'Complété';
        break;
      case 'PENDING':
        statusColor = LTCColors.warning;
        statusLabel = 'En attente';
        break;
      default:
        statusColor = LTCColors.error;
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
          color: LTCColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: LTCColors.border),
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
                  color: LTCColors.border,
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
                      color: LTCColors.textPrimary,
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    dateFormat.format(tx.createdAt),
                    style: const TextStyle(
                      color: LTCColors.textSecondary,
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
                  '${isCredit ? '+' : '-'} \$${_formatUsd(tx.absoluteAmount)}',
                  style: TextStyle(
                    color: isCredit ? LTCColors.success : LTCColors.textPrimary,
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
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

  String _formatUsd(double amount) {
    return NumberFormat('#,##0.00', 'en_US').format(amount);
  }
}
