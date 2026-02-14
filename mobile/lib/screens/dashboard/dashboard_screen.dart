import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cards_provider.dart';
import '../../providers/transactions_provider.dart';
import '../../widgets/card_widget.dart';
import '../../widgets/transaction_item.dart';
import '../../widgets/loading_indicator.dart';
import '../../config/theme.dart';
import '../../config/constants.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
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

  Future<void> _handleRefresh() async {
    await _loadData();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final cardsProvider = Provider.of<CardsProvider>(context);
    final transactionsProvider = Provider.of<TransactionsProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Accueil'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              Navigator.of(context).pushNamed('/notifications');
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _handleRefresh,
        child: cardsProvider.isLoading && cardsProvider.cards.isEmpty
            ? const LoadingIndicator(message: 'Chargement...')
            : SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Welcome header
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(24),
                      decoration: const BoxDecoration(
                        color: LTCColors.primary,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Bonjour, ${authProvider.user?.firstName ?? 'Utilisateur'}',
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Gérez vos cartes virtuelles',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.white70,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Total balance card
                    Container(
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [LTCColors.accent, Color(0xFFD4AF37)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: LTCColors.accent.withOpacity(0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Balance totale',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.white70,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '${cardsProvider.totalBalance.toStringAsFixed(2)} ${AppConstants.currencySymbol}',
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              _buildStatItem(
                                Icons.credit_card,
                                '${cardsProvider.activeCardsCount} Cartes actives',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Quick actions
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        children: [
                          Expanded(
                            child: _buildQuickAction(
                              context,
                              Icons.add_card,
                              'Nouvelle\ncarte',
                              () {
                                Navigator.of(context).pushNamed('/purchase-card');
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildQuickAction(
                              context,
                              Icons.arrow_downward,
                              'Recharger',
                              () {
                                Navigator.of(context).pushNamed('/topup');
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildQuickAction(
                              context,
                              Icons.arrow_upward,
                              'Retirer',
                              () {
                                Navigator.of(context).pushNamed('/withdraw');
                              },
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // My Cards section
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Mes cartes',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              // Switch to cards tab
                              // This is handled by MainScreen navigation
                            },
                            child: const Text('Voir tout'),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 12),

                    // Cards horizontal scroll
                    if (cardsProvider.cards.isEmpty)
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Center(
                          child: Column(
                            children: [
                              Icon(
                                Icons.credit_card_off,
                                size: 64,
                                color: Colors.grey[400],
                              ),
                              const SizedBox(height: 16),
                              const Text(
                                'Aucune carte disponible',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: LTCColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      SizedBox(
                        height: 220,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: cardsProvider.cards.length,
                          itemBuilder: (context, index) {
                            final card = cardsProvider.cards[index];
                            return Container(
                              width: 340,
                              margin: const EdgeInsets.only(right: 16),
                              child: CardWidget(
                                card: card,
                                onTap: () {
                                  Navigator.of(context).pushNamed(
                                    '/card-detail',
                                    arguments: card.id,
                                  );
                                },
                              ),
                            );
                          },
                        ),
                      ),

                    const SizedBox(height: 24),

                    // Recent transactions
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Transactions récentes',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              // Switch to transactions tab
                            },
                            child: const Text('Voir tout'),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 8),

                    // Transactions list
                    if (transactionsProvider.recentTransactions.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(
                          child: Text(
                            'Aucune transaction récente',
                            style: TextStyle(
                              fontSize: 14,
                              color: LTCColors.textSecondary,
                            ),
                          ),
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount:
                            transactionsProvider.recentTransactions.length,
                        itemBuilder: (context, index) {
                          final transaction =
                              transactionsProvider.recentTransactions[index];
                          return TransactionItem(transaction: transaction);
                        },
                      ),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, color: Colors.white, size: 18),
        const SizedBox(width: 8),
        Text(
          text,
          style: const TextStyle(
            fontSize: 14,
            color: Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildQuickAction(
    BuildContext context,
    IconData icon,
    String label,
    VoidCallback onTap,
  ) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: LTCColors.accent.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: LTCColors.accent,
                size: 24,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                height: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
