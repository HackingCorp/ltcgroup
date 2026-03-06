import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/cards_provider.dart';
import '../providers/transactions_provider.dart';
import '../providers/wallet_provider.dart';
import 'dashboard/dashboard_screen.dart';
import 'cards/card_list_screen.dart';
import 'transactions/transaction_list_screen.dart';
import 'profile/profile_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> with WidgetsBindingObserver {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    DashboardScreen(),
    CardListScreen(),
    TransactionListScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Pre-fetch all data immediately when MainScreen mounts
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshTabData(0);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.read<AuthProvider>().refreshUser();
      // Refresh current tab data when app comes back to foreground
      _refreshTabData(_currentIndex);
    }
  }

  /// Refresh data when switching tabs so stale data is updated.
  void _refreshTabData(int index) {
    switch (index) {
      case 0: // Dashboard
        context.read<TransactionsProvider>().fetchTransactions();
        context.read<WalletProvider>().fetchBalance();
        context.read<CardsProvider>().fetchCards();
        break;
      case 1: // Cards
        context.read<CardsProvider>().fetchCards();
        break;
      case 2: // Transactions / Activite
        context.read<TransactionsProvider>().fetchTransactions();
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LTCColors.background,
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      extendBody: true,
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: LTCColors.surface.withValues(alpha: 0.95),
        border: Border(
          top: BorderSide(color: LTCColors.border.withValues(alpha: 0.5)),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(0, Icons.home_rounded, 'Accueil'),
              _buildNavItem(1, Icons.credit_card_rounded, 'Cartes'),
              _buildNavItem(2, Icons.bar_chart_rounded, 'Activite'),
              _buildNavItem(3, Icons.person_rounded, 'Profil'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isActive = _currentIndex == index;
    return GestureDetector(
      onTap: () {
        if (_currentIndex != index) {
          setState(() => _currentIndex = index);
          _refreshTabData(index);
        }
      },
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 24,
              color: isActive ? LTCColors.gold : LTCColors.textTertiary,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: isActive ? LTCColors.gold : LTCColors.textTertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
