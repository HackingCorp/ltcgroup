import 'package:flutter/material.dart';
import 'dashboard/dashboard_screen.dart';
import 'cards/card_list_screen.dart';
import 'transactions/transaction_list_screen.dart';
import 'profile/profile_screen.dart';

/// Main screen with bottom navigation matching LTC Pay design
class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  static const _surfaceDark = Color(0xFF15152D);
  static const _bgDark = Color(0xFF101022);
  static const _primaryBlue = Color(0xFF2B2BEE);

  final List<Widget> _screens = const [
    DashboardScreen(),
    CardListScreen(),
    TransactionListScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgDark,
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
        color: _surfaceDark.withValues(alpha: 0.9),
        border: Border(
          top: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            // Nav items
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildNavItem(0, Icons.home_rounded, 'Accueil'),
                  _buildNavItem(1, Icons.credit_card_rounded, 'Cartes'),
                  const SizedBox(width: 48), // spacer for center button
                  _buildNavItem(2, Icons.pie_chart_rounded, 'Budget'),
                  _buildNavItem(3, Icons.person_rounded, 'Profil'),
                ],
              ),
            ),

            // Floating center QR button
            Positioned(
              top: -24,
              left: 0,
              right: 0,
              child: Center(
                child: GestureDetector(
                  onTap: () {
                    // QR scanner action
                  },
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: _primaryBlue,
                      shape: BoxShape.circle,
                      border: Border.all(color: _bgDark, width: 4),
                      boxShadow: [
                        BoxShadow(
                          color: _primaryBlue.withValues(alpha: 0.5),
                          blurRadius: 20,
                          spreadRadius: -5,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.qr_code_scanner_rounded,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isActive = _currentIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _currentIndex = index),
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 24,
              color: isActive ? _primaryBlue : Colors.grey[600],
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w500,
                color: isActive ? _primaryBlue : Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
