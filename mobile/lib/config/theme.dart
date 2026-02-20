import 'package:flutter/material.dart';

/// LTC Group Color Palette
class LTCColors {
  // Primary colors
  static const Color primary = Color(0xFF10151E); // Dark navy
  static const Color accent = Color(0xFFCEA427); // Gold

  // Neutral colors
  static const Color background = Color(0xFFF5F5F5); // Light gray
  static const Color surface = Color(0xFFFFFFFF); // White
  static const Color textPrimary = Color(0xFF10151E);
  static const Color textSecondary = Color(0xFF757575);

  // Status colors
  static const Color error = Color(0xFFD32F2F); // Red
  static const Color success = Color(0xFF4CAF50); // Green
  static const Color warning = Color(0xFFFF9800); // Orange
  static const Color info = Color(0xFF2196F3); // Blue

  // Card specific
  static const Color cardVisa = Color(0xFF1A1F71); // Visa blue
  static const Color cardMastercard = Color(0xFFEB001B); // Mastercard red
}

/// LTC Group Theme
class LTCTheme {
  // Convenience color accessors
  static const Color gold = LTCColors.accent;
  static const Color navy = LTCColors.primary;

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,

    // Color scheme
    colorScheme: const ColorScheme.light(
      primary: LTCColors.primary,
      secondary: LTCColors.accent,
      surface: LTCColors.surface,
      error: LTCColors.error,
    ),

    // Scaffold
    scaffoldBackgroundColor: LTCColors.background,

    // AppBar
    appBarTheme: const AppBarTheme(
      backgroundColor: LTCColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
    ),

    // Bottom Navigation Bar
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: LTCColors.accent,
      unselectedItemColor: LTCColors.textSecondary,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
    ),

    // Text theme
    textTheme: const TextTheme(
      displayLarge: TextStyle(
        fontSize: 32,
        fontWeight: FontWeight.bold,
        color: LTCColors.textPrimary,
      ),
      displayMedium: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.bold,
        color: LTCColors.textPrimary,
      ),
      displaySmall: TextStyle(
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
    ),

    // Input decoration
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFE0E0E0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: LTCColors.accent, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: LTCColors.error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: LTCColors.error, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),

    // Elevated button
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: LTCColors.accent,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),

    // Card
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),
  );
}
