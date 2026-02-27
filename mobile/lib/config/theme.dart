import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// ─── Kash Pay Design System 2025 ───
/// Dark-first, Gold accent — inspired by Revolut, Cash App, Kuda
/// Distinctive gold palette sets us apart from blue/purple/green fintech market

class LTCColors {
  LTCColors._();

  // ── Core Brand ──
  static const Color gold = Color(0xFFD4A843);
  static const Color goldLight = Color(0xFFE8C76A);
  static const Color goldDark = Color(0xFFB08A2A);

  // ── Backgrounds ──
  static const Color background = Color(0xFF0A0E17);
  static const Color surface = Color(0xFF141925);
  static const Color surfaceLight = Color(0xFF1C2233);
  static const Color surfaceElevated = Color(0xFF232A3E);

  // ── Text ──
  static const Color textPrimary = Color(0xFFF1F3F6);
  static const Color textSecondary = Color(0xFF7A8399);
  static const Color textTertiary = Color(0xFF4A5568);

  // ── Borders & Dividers ──
  static const Color border = Color(0xFF1E2A3A);
  static const Color divider = Color(0xFF1A2235);
  static const Color borderLight = Color(0xFF2A3650);

  // ── Semantic ──
  static const Color success = Color(0xFF34D399);
  static const Color error = Color(0xFFF87171);
  static const Color warning = Color(0xFFFBBF24);
  static const Color info = Color(0xFF60A5FA);

  // ── Card Gradients ──
  static const Color cardGold1 = Color(0xFFB08A2A);
  static const Color cardGold2 = Color(0xFFD4A843);
  static const Color cardGold3 = Color(0xFFE8C76A);

  // ── Overlay / Glass ──
  static const Color glassWhite = Color(0x14FFFFFF); // 8%
  static const Color glassBorder = Color(0x1AFFFFFF); // 10%
}

/// Reusable box decorations
class LTCDecorations {
  LTCDecorations._();

  static BoxDecoration get card => BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
      );

  static BoxDecoration get cardElevated => BoxDecoration(
        color: LTCColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      );

  static BoxDecoration get glass => BoxDecoration(
        color: LTCColors.glassWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.glassBorder),
      );

  static BoxDecoration get input => BoxDecoration(
        color: LTCColors.surfaceLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: LTCColors.border),
      );
}

/// Main theme configuration
class LTCTheme {
  LTCTheme._();

  // Convenience accessors
  static const Color gold = LTCColors.gold;

  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,

    colorScheme: const ColorScheme.dark(
      primary: LTCColors.gold,
      secondary: LTCColors.goldLight,
      surface: LTCColors.surface,
      error: LTCColors.error,
      onPrimary: LTCColors.background,
      onSecondary: LTCColors.background,
      onSurface: LTCColors.textPrimary,
      onError: Colors.white,
    ),

    scaffoldBackgroundColor: LTCColors.background,

    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: LTCColors.textPrimary,
      elevation: 0,
      centerTitle: true,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: LTCColors.textPrimary,
      ),
    ),

    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: LTCColors.surface,
      selectedItemColor: LTCColors.gold,
      unselectedItemColor: LTCColors.textTertiary,
      type: BottomNavigationBarType.fixed,
      elevation: 0,
    ),

    textTheme: const TextTheme(
      displayLarge: TextStyle(
        fontSize: 32,
        fontWeight: FontWeight.bold,
        color: LTCColors.textPrimary,
        letterSpacing: -0.5,
      ),
      displayMedium: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: LTCColors.textPrimary,
        letterSpacing: -0.3,
      ),
      displaySmall: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w600,
        color: LTCColors.textPrimary,
      ),
      headlineMedium: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: LTCColors.textPrimary,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        color: LTCColors.textPrimary,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        color: LTCColors.textPrimary,
      ),
      bodySmall: TextStyle(
        fontSize: 12,
        color: LTCColors.textSecondary,
      ),
      labelLarge: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: LTCColors.textPrimary,
      ),
      labelSmall: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w600,
        color: LTCColors.textSecondary,
        letterSpacing: 0.8,
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: LTCColors.surfaceLight,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: LTCColors.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: LTCColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: LTCColors.gold, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: LTCColors.error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: LTCColors.error, width: 1.5),
      ),
      hintStyle: const TextStyle(color: LTCColors.textTertiary),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: LTCColors.gold,
        foregroundColor: LTCColors.background,
        disabledBackgroundColor: LTCColors.surfaceLight,
        disabledForegroundColor: LTCColors.textTertiary,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        minimumSize: const Size(double.infinity, 56),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        elevation: 0,
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: LTCColors.gold,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        minimumSize: const Size(double.infinity, 56),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        side: const BorderSide(color: LTCColors.gold),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: LTCColors.gold,
        textStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),

    cardTheme: CardThemeData(
      color: LTCColors.surface,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: LTCColors.border),
      ),
    ),

    dividerTheme: const DividerThemeData(
      color: LTCColors.divider,
      thickness: 1,
      space: 1,
    ),

    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.all(Colors.white),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return LTCColors.gold;
        }
        return LTCColors.surfaceLight;
      }),
      trackOutlineColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return LTCColors.gold;
        }
        return LTCColors.border;
      }),
    ),

    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) {
          return LTCColors.gold;
        }
        return Colors.transparent;
      }),
      checkColor: WidgetStateProperty.all(LTCColors.background),
      side: const BorderSide(color: LTCColors.textTertiary),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
    ),

    snackBarTheme: SnackBarThemeData(
      backgroundColor: LTCColors.surfaceElevated,
      contentTextStyle: const TextStyle(color: LTCColors.textPrimary),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),

    dialogTheme: DialogThemeData(
      backgroundColor: LTCColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      titleTextStyle: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: LTCColors.textPrimary,
      ),
      contentTextStyle: const TextStyle(
        fontSize: 14,
        color: LTCColors.textSecondary,
      ),
    ),

    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: LTCColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
    ),

    progressIndicatorTheme: const ProgressIndicatorThemeData(
      color: LTCColors.gold,
      linearTrackColor: LTCColors.surfaceLight,
    ),
  );
}
