import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/custom_button.dart';
import '../../config/theme.dart';
import '../../config/constants.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  Future<void> _handleLogout(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Êtes-vous sûr de vouloir vous déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Annuler'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: LTCColors.error,
            ),
            child: const Text('Déconnexion'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.logout();

      if (context.mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    if (user == null) {
      return const Scaffold(
        body: Center(child: Text('Utilisateur non connecté')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil'),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              decoration: const BoxDecoration(
                color: LTCColors.primary,
              ),
              child: Column(
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: LTCColors.accent,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        '${user.firstName[0]}${user.lastName[0]}',
                        style: const TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    user.fullName,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    user.email,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.white70,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildKycBadge(user.kycStatus),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // User info
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Informations personnelles',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildInfoCard(
                    icon: Icons.person_outline,
                    label: 'Nom complet',
                    value: user.fullName,
                  ),
                  const SizedBox(height: 12),
                  _buildInfoCard(
                    icon: Icons.email_outlined,
                    label: 'Email',
                    value: user.email,
                  ),
                  const SizedBox(height: 12),
                  _buildInfoCard(
                    icon: Icons.phone_outlined,
                    label: 'Téléphone',
                    value: user.phone ?? 'Non renseigné',
                  ),
                  const SizedBox(height: 12),
                  _buildInfoCard(
                    icon: Icons.verified_user_outlined,
                    label: 'Statut KYC',
                    value: _getKycStatusLabel(user.kycStatus),
                    valueColor: _getKycStatusColor(user.kycStatus),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Settings section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Paramètres',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildSettingsTile(
                    context,
                    icon: Icons.edit_outlined,
                    title: 'Modifier le profil',
                    subtitle: 'Mettre à jour vos informations',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Fonctionnalité disponible en Phase 2'),
                        ),
                      );
                    },
                  ),
                  const Divider(height: 1),
                  _buildSettingsTile(
                    context,
                    icon: Icons.settings_outlined,
                    title: 'Paramètres',
                    subtitle: 'Notifications, sécurité, etc.',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Fonctionnalité disponible en Phase 2'),
                        ),
                      );
                    },
                  ),
                  const Divider(height: 1),
                  _buildSettingsTile(
                    context,
                    icon: Icons.help_outline,
                    title: 'Aide & Support',
                    subtitle: 'FAQ, contact support',
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Fonctionnalité disponible en Phase 2'),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),

            // Logout button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: CustomButton(
                text: 'Se déconnecter',
                icon: Icons.logout,
                variant: ButtonVariant.outline,
                onPressed: () => _handleLogout(context),
              ),
            ),

            const SizedBox(height: 24),

            // App version
            Text(
              'Version ${AppConstants.appVersion}',
              style: const TextStyle(
                fontSize: 12,
                color: LTCColors.textSecondary,
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildKycBadge(String kycStatus) {
    Color badgeColor;
    String label;

    switch (kycStatus) {
      case AppConstants.kycStatusVerified:
        badgeColor = LTCColors.success;
        label = 'VÉRIFIÉ';
        break;
      case AppConstants.kycStatusPending:
        badgeColor = LTCColors.warning;
        label = 'EN ATTENTE';
        break;
      case AppConstants.kycStatusRejected:
        badgeColor = LTCColors.error;
        label = 'REJETÉ';
        break;
      default:
        badgeColor = Colors.grey;
        label = kycStatus;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: badgeColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.verified, color: Colors.white, size: 16),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: LTCColors.accent.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              icon,
              color: LTCColors.accent,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 12,
                    color: LTCColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: valueColor ?? LTCColors.textPrimary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: LTCColors.accent),
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
        ),
      ),
      subtitle: Text(
        subtitle,
        style: const TextStyle(
          fontSize: 12,
          color: LTCColors.textSecondary,
        ),
      ),
      trailing: const Icon(Icons.chevron_right, color: LTCColors.textSecondary),
    );
  }

  String _getKycStatusLabel(String status) {
    switch (status) {
      case AppConstants.kycStatusVerified:
        return 'Vérifié';
      case AppConstants.kycStatusPending:
        return 'En attente';
      case AppConstants.kycStatusRejected:
        return 'Rejeté';
      default:
        return status;
    }
  }

  Color _getKycStatusColor(String status) {
    switch (status) {
      case AppConstants.kycStatusVerified:
        return LTCColors.success;
      case AppConstants.kycStatusPending:
        return LTCColors.warning;
      case AppConstants.kycStatusRejected:
        return LTCColors.error;
      default:
        return Colors.grey;
    }
  }
}
