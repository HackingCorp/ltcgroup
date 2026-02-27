import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../models/transaction.dart';
import '../../providers/transactions_provider.dart';
import '../../config/theme.dart';

/// Transaction history screen matching Kash Pay design
class TransactionListScreen extends StatefulWidget {
  const TransactionListScreen({super.key});

  @override
  State<TransactionListScreen> createState() => _TransactionListScreenState();
}

class _TransactionListScreenState extends State<TransactionListScreen> {
  int _activeFilter = 0; // 0=all, 1=debits, 2=credits, 3=pending
  String _searchQuery = '';
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadTransactions();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      final txProvider =
          Provider.of<TransactionsProvider>(context, listen: false);
      if (!txProvider.isLoadingMore && txProvider.hasMore) {
        txProvider.fetchMoreTransactions();
      }
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadTransactions() async {
    final txProvider =
        Provider.of<TransactionsProvider>(context, listen: false);
    await txProvider.fetchTransactions();
  }

  List<Transaction> get _filteredTransactions {
    final txProvider = Provider.of<TransactionsProvider>(context);
    var txns = txProvider.transactions;

    // Filter by type
    switch (_activeFilter) {
      case 1: // Debits
        txns = txns.where((tx) => tx.isDebit).toList();
        break;
      case 2: // Credits
        txns = txns.where((tx) => tx.isCredit).toList();
        break;
      case 3: // En attente
        txns = txns.where((tx) => tx.isPending).toList();
        break;
    }

    // Search filter
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      txns = txns
          .where((tx) => tx.description.toLowerCase().contains(q))
          .toList();
    }

    return txns;
  }

  /// Group transactions by date label (Aujourd'hui, Hier, date)
  Map<String, List<Transaction>> _groupByDate(List<Transaction> txns) {
    final groups = <String, List<Transaction>>{};
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));

    for (final tx in txns) {
      final txDay = DateTime(tx.createdAt.year, tx.createdAt.month, tx.createdAt.day);
      String label;
      if (txDay == today) {
        label = "Aujourd'hui";
      } else if (txDay == yesterday) {
        label = 'Hier';
      } else {
        label = DateFormat('dd MMMM yyyy', 'fr_FR').format(tx.createdAt);
      }
      groups.putIfAbsent(label, () => []).add(tx);
    }
    return groups;
  }

  double get _monthlySpending {
    final txProvider = Provider.of<TransactionsProvider>(context);
    final now = DateTime.now();
    return txProvider.transactions
        .where((tx) =>
            tx.isDebit &&
            tx.createdAt.year == now.year &&
            tx.createdAt.month == now.month)
        .fold(0.0, (sum, tx) => sum + tx.absoluteAmount);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LTCColors.background,
      body: Consumer<TransactionsProvider>(
        builder: (context, txProvider, _) {
          if (txProvider.isLoading && txProvider.transactions.isEmpty) {
            return const Center(
              child: CircularProgressIndicator(color: LTCColors.gold),
            );
          }

          final filtered = _filteredTransactions;
          final grouped = _groupByDate(filtered);

          return Stack(
            children: [
              Column(
                children: [
                  _buildHeader(),
                  Expanded(
                    child: RefreshIndicator(
                      color: LTCColors.gold,
                      backgroundColor: LTCColors.surface,
                      onRefresh: _loadTransactions,
                      child: filtered.isEmpty
                          ? _buildEmptyState()
                          : ListView(
                              controller: _scrollController,
                              padding:
                                  const EdgeInsets.fromLTRB(0, 0, 0, 120),
                              children: [
                                _buildFilters(),
                                _buildSearchBar(),
                                ...grouped.entries.map((entry) =>
                                    _buildDateGroup(
                                        entry.key, entry.value)),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
              // Summary footer
              Positioned(
                bottom: 24,
                left: 16,
                right: 16,
                child: _buildSummaryFooter(),
              ),
            ],
          );
        },
      ),
    );
  }

  // --- Header ---

  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.fromLTRB(
          8, MediaQuery.of(context).padding.top + 8, 8, 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const SizedBox(width: 48),
          const Text(
            'Historique',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: LTCColors.textPrimary,
              letterSpacing: -0.3,
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.more_horiz,
                color: LTCColors.textSecondary),
          ),
        ],
      ),
    );
  }

  // --- Filters ---

  Widget _buildFilters() {
    const labels = ['Toutes', 'Debits', 'Credits', 'En attente'];
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      child: SizedBox(
        height: 42,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: labels.length,
          separatorBuilder: (_, __) => const SizedBox(width: 12),
          itemBuilder: (context, index) {
            final isActive = _activeFilter == index;
            return GestureDetector(
              onTap: () => setState(() => _activeFilter = index),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                decoration: BoxDecoration(
                  color: isActive ? LTCColors.gold : LTCColors.surface,
                  borderRadius: BorderRadius.circular(21),
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
                  labels[index],
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: isActive
                        ? LTCColors.background
                        : LTCColors.textSecondary,
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  // --- Search Bar ---

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
      child: Container(
        decoration: BoxDecoration(
          color: LTCColors.surfaceLight,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: LTCColors.border),
        ),
        child: TextField(
          controller: _searchController,
          onChanged: (val) => setState(() => _searchQuery = val),
          style: const TextStyle(fontSize: 14, color: LTCColors.textPrimary),
          decoration: InputDecoration(
            hintText: 'Rechercher une transaction...',
            hintStyle: const TextStyle(
                color: LTCColors.textTertiary, fontSize: 14),
            prefixIcon: const Icon(Icons.search,
                color: LTCColors.textSecondary, size: 22),
            suffixIcon: Container(
              margin: const EdgeInsets.all(8),
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: LTCColors.gold.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.calendar_today,
                  color: LTCColors.gold, size: 18),
            ),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
        ),
      ),
    );
  }

  // --- Date Group ---

  Widget _buildDateGroup(String label, List<Transaction> txns) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 8, bottom: 16),
            child: Text(
              label.toUpperCase(),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: LTCColors.textTertiary,
                letterSpacing: 1.2,
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: LTCColors.surface,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: LTCColors.border),
            ),
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                children: [
                  for (int i = 0; i < txns.length; i++) ...[
                    if (i > 0)
                      const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 16),
                        child: Divider(
                            color: LTCColors.border, height: 1),
                      ),
                    _buildTransactionItem(txns[i]),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // --- Transaction Item ---

  Widget _buildTransactionItem(Transaction tx) {
    final iconInfo = _getTxIcon(tx);
    final statusInfo = _getTxStatus(tx);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          children: [
            // Avatar with status badge
            SizedBox(
              width: 48,
              height: 48,
              child: Stack(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: iconInfo.bgColor,
                    ),
                    child: Center(
                      child: iconInfo.text != null
                          ? Text(
                              iconInfo.text!,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: iconInfo.textColor,
                              ),
                            )
                          : Icon(iconInfo.icon,
                              size: 22, color: iconInfo.textColor),
                    ),
                  ),
                  // Status badge
                  Positioned(
                    bottom: -2,
                    right: -2,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: const BoxDecoration(
                        color: LTCColors.surface,
                        shape: BoxShape.circle,
                      ),
                      child: Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: statusInfo.bgColor,
                        ),
                        child: Icon(statusInfo.icon,
                            size: 10, color: statusInfo.iconColor),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            // Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Flexible(
                        child: Text(
                          tx.description,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: LTCColors.textPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${tx.isDebit ? '-' : '+'}\$${_formatUsd(tx.absoluteAmount)}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: tx.isDebit
                              ? LTCColors.textPrimary
                              : LTCColors.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            tx.type == 'TOPUP'
                                ? Icons.account_balance_wallet
                                : Icons.place,
                            size: 12,
                            color: LTCColors.textTertiary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            tx.type == 'TOPUP' ? 'Kash Pay' : _getTxLocation(tx),
                            style: const TextStyle(
                              fontSize: 12,
                              color: LTCColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _getCategoryColor(tx).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _getCategoryLabel(tx),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                            color: _getCategoryColor(tx),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --- Summary Footer ---

  Widget _buildSummaryFooter() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: LTCColors.surfaceElevated.withValues(alpha: 0.95),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 30,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Depenses ce mois',
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
                    '\$${_formatUsd(_monthlySpending)}',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: LTCColors.textPrimary,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
            ],
          ),
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: LTCColors.gold,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: LTCColors.gold.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Icon(Icons.bar_chart_rounded,
                color: LTCColors.background, size: 20),
          ),
        ],
      ),
    );
  }

  // --- Empty State ---

  Widget _buildEmptyState() {
    return ListView(
      children: [
        _buildFilters(),
        _buildSearchBar(),
        Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            children: [
              const SizedBox(height: 48),
              Icon(Icons.receipt_long_outlined,
                  size: 80, color: LTCColors.textTertiary),
              const SizedBox(height: 24),
              const Text(
                'Aucune transaction',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: LTCColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Vos transactions apparaitront ici',
                style: TextStyle(
                    fontSize: 14, color: LTCColors.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // --- Helpers ---

  String _formatUsd(double amount) {
    return NumberFormat('#,##0.00', 'en_US').format(amount);
  }

  _TxIconInfo _getTxIcon(Transaction tx) {
    switch (tx.type) {
      case 'TOPUP':
        return _TxIconInfo(
          bgColor: LTCColors.gold.withValues(alpha: 0.15),
          textColor: LTCColors.gold,
          icon: Icons.add_card,
        );
      case 'WITHDRAWAL':
        return _TxIconInfo(
          bgColor: LTCColors.error.withValues(alpha: 0.15),
          textColor: LTCColors.error,
          icon: Icons.arrow_upward_rounded,
        );
      case 'REFUND':
        return _TxIconInfo(
          bgColor: LTCColors.success.withValues(alpha: 0.15),
          textColor: LTCColors.success,
          icon: Icons.replay_rounded,
        );
      default:
        // Purchase - show merchant initial
        final initial = tx.description.isNotEmpty
            ? tx.description[0].toUpperCase()
            : '?';
        return _TxIconInfo(
          bgColor: _getMerchantColor(tx.description),
          textColor: Colors.white,
          text: initial,
        );
    }
  }

  Color _getMerchantColor(String name) {
    final colors = [
      const Color(0xFF1C2233),
      const Color(0xFFF97316),
      const Color(0xFF8B5CF6),
      const Color(0xFF06B6D4),
      const Color(0xFFEC4899),
      const Color(0xFF14B8A6),
    ];
    return colors[name.hashCode.abs() % colors.length];
  }

  _TxStatusInfo _getTxStatus(Transaction tx) {
    if (tx.isSuccess) {
      return _TxStatusInfo(
        icon: Icons.check,
        iconColor: LTCColors.success,
        bgColor: LTCColors.success.withValues(alpha: 0.2),
      );
    }
    if (tx.isPending) {
      return _TxStatusInfo(
        icon: Icons.schedule,
        iconColor: LTCColors.warning,
        bgColor: LTCColors.warning.withValues(alpha: 0.2),
      );
    }
    return _TxStatusInfo(
      icon: Icons.close,
      iconColor: LTCColors.error,
      bgColor: LTCColors.error.withValues(alpha: 0.2),
    );
  }

  String _getTxLocation(Transaction tx) {
    // Generate a plausible location from merchant name
    if (tx.merchant == null) return 'Local';
    final m = tx.merchant!.toLowerCase();
    if (m.contains('netflix')) return 'Dublin, IE';
    if (m.contains('amazon')) return 'Seattle, US';
    if (m.contains('alibaba')) return 'Hangzhou, CN';
    if (m.contains('jumia')) return 'Lagos, NG';
    return 'Local';
  }

  String _getCategoryLabel(Transaction tx) {
    switch (tx.type) {
      case 'TOPUP':
        return 'Depot';
      case 'WITHDRAWAL':
        return 'Retrait';
      case 'REFUND':
        return 'Remboursement';
      default:
        if (tx.isPending) return 'En attente';
        return 'Achat';
    }
  }

  Color _getCategoryColor(Transaction tx) {
    switch (tx.type) {
      case 'TOPUP':
        return LTCColors.gold;
      case 'WITHDRAWAL':
        return LTCColors.error;
      case 'REFUND':
        return LTCColors.success;
      default:
        if (tx.isPending) return LTCColors.warning;
        return LTCColors.textSecondary;
    }
  }
}

// --- Private data classes ---

class _TxIconInfo {
  final Color bgColor;
  final Color textColor;
  final IconData? icon;
  final String? text;

  const _TxIconInfo({
    required this.bgColor,
    required this.textColor,
    this.icon,
    this.text,
  });
}

class _TxStatusInfo {
  final IconData icon;
  final Color iconColor;
  final Color bgColor;

  const _TxStatusInfo({
    required this.icon,
    required this.iconColor,
    required this.bgColor,
  });
}
