import 'dart:ui';

/// Centralized color constants for the LTC Pay app.
/// Reference file -- mirrors values from [LTCColors] in theme.dart
/// and commonly-used inline colors across screens.
class AppColors {
  // ── Primary (from LTCColors) ──────────────────────────────
  static const Color primaryGold = Color(0xFFCEA427);
  static const Color primaryNavy = Color(0xFF10151E);

  // ── Cards ─────────────────────────────────────────────────
  static const Color cardBlue = Color(0xFF2B2BEE);
  static const Color cardVisa = Color(0xFF1A1F71);
  static const Color cardMastercard = Color(0xFFEB001B);

  // ── Onboarding / Login ────────────────────────────────────
  static const Color onboardingBg = Color(0xFF1A365D);
  static const Color onboardingBlue = Color(0xFF258CF4);

  // ── Status ────────────────────────────────────────────────
  static const Color success = Color(0xFF4CAF50);
  static const Color error = Color(0xFFD32F2F);
  static const Color warning = Color(0xFFFF9800);
  static const Color info = Color(0xFF2196F3);

  // ── Surfaces / Neutrals ───────────────────────────────────
  static const Color background = Color(0xFFF5F5F5);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color textPrimary = Color(0xFF10151E);
  static const Color textSecondary = Color(0xFF757575);

  // ── Accent greens (topup screen) ──────────────────────────
  static const Color accentGreen = Color(0xFF13EC5B);
}
