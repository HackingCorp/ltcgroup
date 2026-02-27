import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../services/storage_service.dart';
import '../../services/biometric_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final StorageService _storageService = StorageService();
  final BiometricService _biometricService = BiometricService();

  bool _biometricEnabled = false;
  bool _biometricAvailable = false;
  bool _pushEnabled = true;
  bool _emailEnabled = true;
  bool _smsEnabled = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final bioEnabled = await _storageService.isBiometricEnabled();
    final bioAvailable = await _biometricService.checkBiometricAvailable();
    final pushEnabled = await _storageService.isPushEnabled();
    final emailEnabled = await _storageService.isEmailEnabled();
    final smsEnabled = await _storageService.isSmsEnabled();
    if (mounted) {
      setState(() {
        _biometricEnabled = bioEnabled;
        _biometricAvailable = bioAvailable;
        _pushEnabled = pushEnabled;
        _emailEnabled = emailEnabled;
        _smsEnabled = smsEnabled;
      });
    }
  }

  Future<void> _toggleBiometric(bool value) async {
    if (value) {
      final authenticated = await _biometricService.authenticate(
        reason: 'Activer l\'authentification biométrique',
      );
      if (authenticated) {
        await _storageService.setBiometricEnabled(true);
        setState(() => _biometricEnabled = true);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Authentification biométrique activée')),
          );
        }
      }
    } else {
      await _storageService.setBiometricEnabled(false);
      setState(() => _biometricEnabled = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Authentification biométrique désactivée')),
        );
      }
    }
  }

  Future<void> _handleLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: LTCColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Déconnexion',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: LTCColors.textPrimary,
          ),
        ),
        content: const Text(
          'Êtes-vous sûr de vouloir vous déconnecter ?',
          style: TextStyle(color: LTCColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            style: TextButton.styleFrom(
              foregroundColor: LTCColors.gold,
            ),
            child: const Text(
              'Annuler',
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: LTCColors.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Déconnexion'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.logout();
      if (mounted) {
        Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
      }
    }
  }

  void _showComingSoon() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Bientot disponible')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    if (user == null) {
      return const Scaffold(
        backgroundColor: LTCColors.background,
        body: Center(
          child: Text(
            'Utilisateur non connecté',
            style: TextStyle(color: LTCColors.textSecondary),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: LTCColors.background,
      body: Column(
        children: [
          // ── Header ──
          Container(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 8,
              bottom: 16,
              left: 4,
              right: 4,
            ),
            decoration: const BoxDecoration(
              color: LTCColors.background,
              border: Border(
                bottom: BorderSide(color: LTCColors.border),
              ),
            ),
            child: const Row(
              children: [
                SizedBox(width: 48),
                Expanded(
                  child: Text(
                    'Profil',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: LTCColors.textPrimary,
                    ),
                  ),
                ),
                SizedBox(width: 48),
              ],
            ),
          ),

          // ── Body ──
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 40),
              child: Column(
                children: [
                  // ── Profile Avatar + Info ──
                  _buildProfileHeader(user),
                  const SizedBox(height: 32),

                  // ── Sécurité ──
                  _buildSettingsGroup(
                    title: 'Sécurité',
                    children: [
                      _buildNavItem(
                        icon: Icons.lock_rounded,
                        iconBg: LTCColors.gold.withValues(alpha: 0.12),
                        iconColor: LTCColors.gold,
                        label: 'Code PIN',
                        onTap: () => _showComingSoon(),
                      ),
                      if (_biometricAvailable)
                        _buildToggleItem(
                          icon: Icons.face_rounded,
                          iconBg: LTCColors.goldLight.withValues(alpha: 0.10),
                          iconColor: LTCColors.goldLight,
                          label: 'Biométrie',
                          value: _biometricEnabled,
                          onChanged: _toggleBiometric,
                        ),
                      _buildNavItem(
                        icon: Icons.vpn_key_rounded,
                        iconBg: LTCColors.gold.withValues(alpha: 0.12),
                        iconColor: LTCColors.gold,
                        label: 'Changer mot de passe',
                        onTap: () => _showComingSoon(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // ── Notifications ──
                  _buildSettingsGroup(
                    title: 'Notifications',
                    children: [
                      _buildToggleItem(
                        icon: Icons.notifications_rounded,
                        iconBg: LTCColors.warning.withValues(alpha: 0.12),
                        iconColor: LTCColors.warning,
                        label: 'Push',
                        value: _pushEnabled,
                        onChanged: (v) {
                          setState(() => _pushEnabled = v);
                          _storageService.setPushEnabled(v);
                        },
                      ),
                      _buildToggleItem(
                        icon: Icons.email_rounded,
                        iconBg: const Color(0xFF60A5FA).withValues(alpha: 0.12),
                        iconColor: const Color(0xFF60A5FA),
                        label: 'Email',
                        value: _emailEnabled,
                        onChanged: (v) {
                          setState(() => _emailEnabled = v);
                          _storageService.setEmailEnabled(v);
                        },
                      ),
                      _buildToggleItem(
                        icon: Icons.sms_rounded,
                        iconBg: LTCColors.success.withValues(alpha: 0.12),
                        iconColor: LTCColors.success,
                        label: 'SMS',
                        value: _smsEnabled,
                        onChanged: (v) {
                          setState(() => _smsEnabled = v);
                          _storageService.setSmsEnabled(v);
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // ── Limites ──
                  _buildLimitsSection(),
                  const SizedBox(height: 24),

                  // ── Support ──
                  _buildSettingsGroup(
                    title: 'Support',
                    children: [
                      _buildNavItem(
                        icon: Icons.help_outline_rounded,
                        iconBg: LTCColors.success.withValues(alpha: 0.12),
                        iconColor: LTCColors.success,
                        label: 'FAQ',
                        onTap: () => _showComingSoon(),
                      ),
                      _buildNavItem(
                        icon: Icons.support_agent_rounded,
                        iconBg: const Color(0xFF60A5FA).withValues(alpha: 0.12),
                        iconColor: const Color(0xFF60A5FA),
                        label: 'Contactez-nous',
                        onTap: () => _showComingSoon(),
                      ),
                      _buildNavItem(
                        icon: Icons.report_problem_rounded,
                        iconBg: LTCColors.error.withValues(alpha: 0.12),
                        iconColor: LTCColors.error,
                        label: 'Signaler un problème',
                        onTap: () => _showComingSoon(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // ── À propos ──
                  Container(
                    decoration: BoxDecoration(
                      color: LTCColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: LTCColors.border),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(16),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () => _showComingSoon(),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 16),
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: LTCColors.gold.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.info_rounded,
                                    size: 18, color: LTCColors.textSecondary),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Text(
                                  'À propos de LTC Pay',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: LTCColors.textPrimary,
                                  ),
                                ),
                              ),
                              const Text(
                                'v${AppConstants.appVersion}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: LTCColors.textSecondary,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(Icons.chevron_right_rounded,
                                  color: LTCColors.textTertiary, size: 22),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),

                  // ── Déconnexion ──
                  GestureDetector(
                    onTap: _handleLogout,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: LTCColors.error.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.logout_rounded,
                              color: LTCColors.error, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Déconnexion',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: LTCColors.error,
                            ),
                          ),
                        ],
                      ),
                    ),
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

  // ── Profile Avatar + Name + Badge ──
  Widget _buildProfileHeader(user) {
    final initials = '${user.firstName.isNotEmpty ? user.firstName[0] : '?'}${user.lastName.isNotEmpty ? user.lastName[0] : '?'}'.toUpperCase();
    final kycVerified = user.kycStatus == AppConstants.kycStatusVerified;

    return Column(
      children: [
        // Avatar with camera button
        Stack(
          children: [
            Container(
              width: 112,
              height: 112,
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: LTCColors.surface,
                shape: BoxShape.circle,
              ),
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      LTCColors.gold.withValues(alpha: 0.15),
                      LTCColors.gold.withValues(alpha: 0.08),
                    ],
                  ),
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: const TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      color: LTCColors.gold,
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 4,
              right: 4,
              child: GestureDetector(
                onTap: () => _showComingSoon(),
                child: Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: LTCColors.gold,
                    shape: BoxShape.circle,
                    border: Border.all(color: LTCColors.background, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: LTCColors.gold.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.camera_alt_rounded,
                      color: LTCColors.background, size: 16),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Name
        Text(
          user.fullName,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w700,
            color: LTCColors.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        // Email + phone
        Text(
          '${user.email}${user.phone != null ? ' • ${user.phone}' : ''}',
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: LTCColors.textSecondary,
          ),
        ),
        const SizedBox(height: 12),
        // KYC badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          decoration: BoxDecoration(
            color: kycVerified
                ? LTCColors.success.withValues(alpha: 0.12)
                : LTCColors.warning.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: kycVerified
                  ? LTCColors.success.withValues(alpha: 0.3)
                  : LTCColors.warning.withValues(alpha: 0.3),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                kycVerified ? Icons.verified_rounded : Icons.schedule_rounded,
                size: 14,
                color: kycVerified ? LTCColors.success : LTCColors.warning,
              ),
              const SizedBox(width: 6),
              Text(
                kycVerified ? 'Vérifié' : 'En attente',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                  color: kycVerified ? LTCColors.success : LTCColors.warning,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Settings Group Card ──
  Widget _buildSettingsGroup({
    required String title,
    String? trailing,
    VoidCallback? onTrailingTap,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
      ),
      child: Column(
        children: [
          // Section header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: LTCColors.gold.withValues(alpha: 0.08),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
              border: const Border(
                bottom: BorderSide(color: LTCColors.border),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: LTCColors.gold,
                    letterSpacing: 1.2,
                  ),
                ),
                if (trailing != null)
                  GestureDetector(
                    onTap: onTrailingTap,
                    child: Text(
                      trailing,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: LTCColors.gold.withValues(alpha: 0.7),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          // Items
          for (int i = 0; i < children.length; i++) ...[
            if (i > 0)
              const Divider(
                height: 1,
                indent: 16,
                endIndent: 16,
                color: LTCColors.border,
              ),
            children[i],
          ],
        ],
      ),
    );
  }

  // ── Navigation Item (with chevron) ──
  Widget _buildNavItem({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String label,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: iconColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: LTCColors.textPrimary,
                  ),
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  color: LTCColors.textTertiary, size: 22),
            ],
          ),
        ),
      ),
    );
  }

  // ── Toggle Item (with switch) ──
  Widget _buildToggleItem({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String label,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: LTCColors.textPrimary,
              ),
            ),
          ),
          SizedBox(
            width: 48,
            height: 28,
            child: Switch(
              value: value,
              onChanged: onChanged,
              activeThumbColor: Colors.white,
              activeTrackColor: LTCColors.gold,
              inactiveThumbColor: Colors.white,
              inactiveTrackColor: LTCColors.surfaceLight,
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
        ],
      ),
    );
  }

  // ── Limits Section ──
  Widget _buildLimitsSection() {
    return _buildSettingsGroup(
      title: 'Limites',
      trailing: 'Modifier',
      onTrailingTap: () => _showComingSoon(),
      children: [
        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              _buildLimitBar(
                label: 'Limite Transaction',
                current: 250000,
                max: 500000,
                progress: 0.5,
              ),
              const SizedBox(height: 24),
              _buildLimitBar(
                label: 'Limite Mensuelle',
                current: 1600000,
                max: 2000000,
                progress: 0.8,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLimitBar({
    required String label,
    required double current,
    required double max,
    required double progress,
  }) {
    String formatAmount(double amount) {
      if (amount >= 1000000) {
        final m = amount / 1000000;
        return m == m.roundToDouble()
            ? '${m.toInt()}M'
            : '${m.toStringAsFixed(1)}M';
      }
      return '${(amount / 1000).toInt()}.000';
    }

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: LTCColors.textPrimary,
              ),
            ),
            Text(
              '\$${formatAmount(current)} / \$${formatAmount(max)}',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: LTCColors.gold,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          height: 8,
          width: double.infinity,
          decoration: BoxDecoration(
            color: LTCColors.surfaceLight,
            borderRadius: BorderRadius.circular(4),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: progress.clamp(0.0, 1.0),
            child: Container(
              decoration: BoxDecoration(
                color: LTCColors.gold,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
