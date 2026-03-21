import 'package:flutter/foundation.dart';
import 'package:posthog_flutter/posthog_flutter.dart';

class PosthogService {
  static Future<void> capture(String event, [Map<String, dynamic>? properties]) async {
    try {
      await Posthog().capture(eventName: event, properties: properties);
    } catch (e) {
      debugPrint('PostHog capture error: $e');
    }
  }

  static Future<void> identify(String userId, [Map<String, dynamic>? properties]) async {
    try {
      await Posthog().identify(userId: userId, userProperties: properties);
    } catch (e) {
      debugPrint('PostHog identify error: $e');
    }
  }

  static Future<void> reset() async {
    try {
      await Posthog().reset();
    } catch (e) {
      debugPrint('PostHog reset error: $e');
    }
  }
}
