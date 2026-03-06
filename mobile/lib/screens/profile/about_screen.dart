import 'package:flutter/material.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LTCColors.background,
      body: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
              child: Column(
                children: [
                  const SizedBox(height: 24),
                  // App icon
                  Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(24),
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [LTCColors.goldDark, LTCColors.gold],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: LTCColors.gold.withValues(alpha: 0.3),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.credit_card, color: LTCColors.background, size: 44),
                  ),
                  const SizedBox(height: 20),
                  const Text(
                    AppConstants.appName,
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      color: LTCColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Version ${AppConstants.appVersion}',
                    style: const TextStyle(fontSize: 14, color: LTCColors.textSecondary),
                  ),
                  const SizedBox(height: 32),

                  // Description
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: LTCColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: LTCColors.border),
                    ),
                    child: const Text(
                      'Kash Pay est votre portefeuille numerique securise. '
                      'Creez des cartes virtuelles Visa et Mastercard, '
                      'rechargez votre wallet via Mobile Money, '
                      'et effectuez des paiements en ligne partout dans le monde.\n\n'
                      'Disponible dans 18 pays africains.',
                      style: TextStyle(
                        fontSize: 14,
                        color: LTCColors.textSecondary,
                        height: 1.6,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Info items
                  _buildInfoGroup([
                    _InfoItem(icon: Icons.business_rounded, label: 'Editeur', value: 'LTC Group'),
                    _InfoItem(icon: Icons.language_rounded, label: 'Site web', value: 'ltcgroup.site'),
                    _InfoItem(icon: Icons.email_rounded, label: 'Contact', value: 'support@ltcgroup.site'),
                  ]),
                  const SizedBox(height: 24),

                  _buildInfoGroup([
                    _InfoItem(icon: Icons.security_rounded, label: 'Securite', value: 'Chiffrement AES-256'),
                    _InfoItem(icon: Icons.verified_rounded, label: 'KYC', value: 'Verification d\'identite'),
                    _InfoItem(icon: Icons.credit_card_rounded, label: 'Cartes', value: 'Visa & Mastercard'),
                  ]),
                  const SizedBox(height: 32),

                  // Legal
                  const Text(
                    '2024-2026 LTC Group. Tous droits reserves.',
                    style: TextStyle(fontSize: 12, color: LTCColors.textTertiary),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.only(top: 8, left: 4, right: 4, bottom: 8),
        child: Row(
          children: [
            IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.chevron_left_rounded, size: 28, color: LTCColors.textPrimary),
            ),
            const Expanded(
              child: Text(
                'A propos',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: LTCColors.textPrimary),
              ),
            ),
            const SizedBox(width: 48),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoGroup(List<_InfoItem> items) {
    return Container(
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
      ),
      child: Column(
        children: [
          for (int i = 0; i < items.length; i++) ...[
            if (i > 0)
              const Divider(height: 1, indent: 16, endIndent: 16, color: LTCColors.border),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: LTCColors.gold.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(items[i].icon, size: 18, color: LTCColors.gold),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      items[i].label,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: LTCColors.textPrimary),
                    ),
                  ),
                  Text(
                    items[i].value,
                    style: const TextStyle(fontSize: 13, color: LTCColors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoItem {
  final IconData icon;
  final String label;
  final String value;
  const _InfoItem({required this.icon, required this.label, required this.value});
}
