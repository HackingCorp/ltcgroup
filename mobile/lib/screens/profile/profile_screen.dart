import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../config/constants.dart';
import '../../services/storage_service.dart';
import '../../services/biometric_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  static const _primaryBlue = Color(0xFF2B2BEE);
  static const _bgLight = Color(0xFFF6F6F8);

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
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Déconnexion',
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
        content: const Text('Êtes-vous sûr de vouloir vous déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text(
              'Annuler',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
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
      backgroundColor: _bgLight,
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
            decoration: BoxDecoration(
              color: _bgLight.withValues(alpha: 0.8),
              border: Border(
                bottom: BorderSide(
                  color: _primaryBlue.withValues(alpha: 0.1),
                ),
              ),
            ),
            child: Row(
              children: [
                const SizedBox(width: 48),
                const Expanded(
                  child: Text(
                    'Profil',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF111827),
                    ),
                  ),
                ),
                const SizedBox(width: 48), // balance right side
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
                        iconBg: const Color(0xFFEFF6FF),
                        iconColor: _primaryBlue,
                        label: 'Code PIN',
                        onTap: () {},
                      ),
                      if (_biometricAvailable)
                        _buildToggleItem(
                          icon: Icons.face_rounded,
                          iconBg: const Color(0xFFF3E8FF),
                          iconColor: const Color(0xFF9333EA),
                          label: 'Biométrie',
                          value: _biometricEnabled,
                          onChanged: _toggleBiometric,
                        ),
                      _buildNavItem(
                        icon: Icons.vpn_key_rounded,
                        iconBg: const Color(0xFFEEF2FF),
                        iconColor: const Color(0xFF4F46E5),
                        label: 'Changer mot de passe',
                        onTap: () {},
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
                        iconBg: const Color(0xFFFFF7ED),
                        iconColor: const Color(0xFFEA580C),
                        label: 'Push',
                        value: _pushEnabled,
                        onChanged: (v) {
                          setState(() => _pushEnabled = v);
                          _storageService.setPushEnabled(v);
                        },
                      ),
                      _buildToggleItem(
                        icon: Icons.email_rounded,
                        iconBg: const Color(0xFFF0F9FF),
                        iconColor: const Color(0xFF0284C7),
                        label: 'Email',
                        value: _emailEnabled,
                        onChanged: (v) {
                          setState(() => _emailEnabled = v);
                          _storageService.setEmailEnabled(v);
                        },
                      ),
                      _buildToggleItem(
                        icon: Icons.sms_rounded,
                        iconBg: const Color(0xFFECFDF5),
                        iconColor: const Color(0xFF059669),
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
                        iconBg: const Color(0xFFF0FDFA),
                        iconColor: const Color(0xFF0D9488),
                        label: 'FAQ',
                        onTap: () {},
                      ),
                      _buildNavItem(
                        icon: Icons.support_agent_rounded,
                        iconBg: const Color(0xFFECFEFF),
                        iconColor: const Color(0xFF0891B2),
                        label: 'Contactez-nous',
                        onTap: () {},
                      ),
                      _buildNavItem(
                        icon: Icons.report_problem_rounded,
                        iconBg: const Color(0xFFFFF1F2),
                        iconColor: const Color(0xFFE11D48),
                        label: 'Signaler un problème',
                        onTap: () {},
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // ── À propos ──
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                          color: _primaryBlue.withValues(alpha: 0.05)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Material(
                      color: Colors.transparent,
                      borderRadius: BorderRadius.circular(16),
                      child: InkWell(
                        borderRadius: BorderRadius.circular(16),
                        onTap: () {},
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 16),
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF9FAFB),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.info_rounded,
                                    size: 18, color: Color(0xFF6B7280)),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Text(
                                  'À propos de LTC Pay',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                    color: Color(0xFF374151),
                                  ),
                                ),
                              ),
                              const Text(
                                'v${AppConstants.appVersion}',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF9CA3AF),
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(Icons.chevron_right_rounded,
                                  color: Color(0xFFD1D5DB), size: 22),
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
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.03),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.logout_rounded,
                              color: Color(0xFFDC2626), size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Déconnexion',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFDC2626),
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
    final initials = '${user.firstName[0]}${user.lastName[0]}'.toUpperCase();
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
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Color(0x0A000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      _primaryBlue.withValues(alpha: 0.15),
                      _primaryBlue.withValues(alpha: 0.08),
                    ],
                  ),
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: const TextStyle(
                      fontSize: 36,
                      fontWeight: FontWeight.w800,
                      color: _primaryBlue,
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 4,
              right: 4,
              child: GestureDetector(
                onTap: () {},
                child: Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: _primaryBlue,
                    shape: BoxShape.circle,
                    border: Border.all(color: _bgLight, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: _primaryBlue.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.camera_alt_rounded,
                      color: Colors.white, size: 16),
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
            color: Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 4),
        // Email + phone
        Text(
          '${user.email}${user.phone != null ? ' • ${user.phone}' : ''}',
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: Color(0xFF64748B),
          ),
        ),
        const SizedBox(height: 12),
        // KYC badge
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
          decoration: BoxDecoration(
            color: kycVerified
                ? const Color(0xFFDCFCE7)
                : const Color(0xFFFEF9C3),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: kycVerified
                  ? const Color(0xFFBBF7D0)
                  : const Color(0xFFFDE68A),
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                kycVerified ? Icons.verified_rounded : Icons.schedule_rounded,
                size: 14,
                color: kycVerified
                    ? const Color(0xFF15803D)
                    : const Color(0xFFCA8A04),
              ),
              const SizedBox(width: 6),
              Text(
                kycVerified ? 'Vérifié' : 'En attente',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                  color: kycVerified
                      ? const Color(0xFF15803D)
                      : const Color(0xFFCA8A04),
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
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _primaryBlue.withValues(alpha: 0.05)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Section header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: _primaryBlue.withValues(alpha: 0.05),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
              border: Border(
                bottom: BorderSide(
                    color: _primaryBlue.withValues(alpha: 0.05)),
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
                    color: _primaryBlue,
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
                        color: _primaryBlue.withValues(alpha: 0.7),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          // Items
          for (int i = 0; i < children.length; i++) ...[
            if (i > 0)
              Divider(
                height: 1,
                indent: 16,
                endIndent: 16,
                color: _primaryBlue.withValues(alpha: 0.05),
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
                    color: Color(0xFF374151),
                  ),
                ),
              ),
              const Icon(Icons.chevron_right_rounded,
                  color: Color(0xFFD1D5DB), size: 22),
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
                color: Color(0xFF374151),
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
              activeTrackColor: _primaryBlue,
              inactiveThumbColor: Colors.white,
              inactiveTrackColor: const Color(0xFFE2E8F0),
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
      onTrailingTap: () {},
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
                color: Color(0xFF374151),
              ),
            ),
            Text(
              '${formatAmount(current)} / ${formatAmount(max)} XAF',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: _primaryBlue,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Container(
          height: 8,
          width: double.infinity,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(4),
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: progress.clamp(0.0, 1.0),
            child: Container(
              decoration: BoxDecoration(
                color: _primaryBlue,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
