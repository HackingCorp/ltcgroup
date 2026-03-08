import 'package:flutter/foundation.dart';
import 'package:no_screenshot/no_screenshot.dart';

/// Prevents screenshots and screen recording on sensitive screens.
///
/// Uses the `no_screenshot` package which leverages FLAG_SECURE on Android
/// and native APIs on iOS to block screen capture.
class ScreenSecurityService {
  ScreenSecurityService._();

  static final NoScreenshot _noScreenshot = NoScreenshot.instance;

  /// Enable screenshot protection. Call when entering a sensitive screen.
  static Future<void> enableProtection() async {
    if (kDebugMode) return; // Allow screenshots during development
    try {
      await _noScreenshot.screenshotOff();
    } catch (e) {
      debugPrint('ScreenSecurity: failed to enable protection: $e');
    }
  }

  /// Disable screenshot protection. Call when leaving a sensitive screen.
  static Future<void> disableProtection() async {
    if (kDebugMode) return;
    try {
      await _noScreenshot.screenshotOn();
    } catch (e) {
      debugPrint('ScreenSecurity: failed to disable protection: $e');
    }
  }
}
