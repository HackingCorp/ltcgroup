import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Notification data model
class AppNotification {
  final String id;
  final String title;
  final String body;
  final DateTime timestamp;
  final bool isRead;
  final String? data;

  AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.timestamp,
    this.isRead = false,
    this.data,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'body': body,
        'timestamp': timestamp.toIso8601String(),
        'isRead': isRead,
        'data': data,
      };

  factory AppNotification.fromJson(Map<String, dynamic> json) => AppNotification(
        id: json['id'] as String,
        title: json['title'] as String,
        body: json['body'] as String,
        timestamp: DateTime.parse(json['timestamp'] as String),
        isRead: json['isRead'] as bool? ?? false,
        data: json['data'] as String?,
      );
}

/// Service for push and local notifications
class NotificationService {
  static const String _notificationsKey = 'stored_notifications';

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();

  /// Initialize notifications
  Future<void> initializeNotifications() async {
    // Request permission
    await requestPermission();

    // Initialize local notifications
    const AndroidInitializationSettings androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Setup foreground message handler
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Setup background message handler
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Setup notification opened handler
    FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationOpened);
  }

  /// Request notification permission
  Future<bool> requestPermission() async {
    final NotificationSettings settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    return settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
  }

  /// Get FCM token
  Future<String?> getToken() async {
    try {
      return await _firebaseMessaging.getToken();
    } catch (e) {
      return null;
    }
  }

  /// Handle foreground messages
  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    final notification = message.notification;
    if (notification != null) {
      await showLocalNotification(
        title: notification.title ?? 'LTC vCard',
        body: notification.body ?? '',
        data: message.data,
      );
      await _storeNotification(
        title: notification.title ?? 'LTC vCard',
        body: notification.body ?? '',
        data: json.encode(message.data),
      );
    }
  }

  /// Handle notification opened
  Future<void> _handleNotificationOpened(RemoteMessage message) async {
    if (message.notification != null) {
      await _storeNotification(
        title: message.notification!.title ?? 'LTC vCard',
        body: message.notification!.body ?? '',
        data: json.encode(message.data),
        isRead: true,
      );
    }
  }

  /// Show local notification
  Future<void> showLocalNotification({
    required String title,
    required String body,
    Map<String, dynamic>? data,
  }) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'ltc_vcard_channel',
      'LTC vCard Notifications',
      channelDescription: 'Notifications pour les transactions et mises à jour',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails platformDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      platformDetails,
      payload: data != null ? json.encode(data) : null,
    );
  }

  /// Notification tapped handler
  void _onNotificationTapped(NotificationResponse response) {
    // Handle notification tap
  }

  /// Store notification locally
  Future<void> _storeNotification({
    required String title,
    required String body,
    String? data,
    bool isRead = false,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    final storedNotificationsJson = prefs.getString(_notificationsKey);

    List<AppNotification> notifications = [];

    if (storedNotificationsJson != null) {
      final List<dynamic> decoded = json.decode(storedNotificationsJson);
      notifications = decoded.map((e) => AppNotification.fromJson(e as Map<String, dynamic>)).toList();
    }

    notifications.insert(
      0,
      AppNotification(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        title: title,
        body: body,
        timestamp: DateTime.now(),
        isRead: isRead,
        data: data,
      ),
    );

    if (notifications.length > 100) {
      notifications = notifications.sublist(0, 100);
    }

    final encoded = json.encode(notifications.map((e) => e.toJson()).toList());
    await prefs.setString(_notificationsKey, encoded);
  }

  /// Get stored notifications
  Future<List<AppNotification>> getStoredNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    final storedNotificationsJson = prefs.getString(_notificationsKey);

    if (storedNotificationsJson == null) {
      return [];
    }

    final List<dynamic> decoded = json.decode(storedNotificationsJson);
    return decoded.map((e) => AppNotification.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Mark notification as read
  Future<void> markAsRead(String notificationId) async {
    final prefs = await SharedPreferences.getInstance();
    final storedNotificationsJson = prefs.getString(_notificationsKey);

    if (storedNotificationsJson == null) return;

    final List<dynamic> decoded = json.decode(storedNotificationsJson);
    final notifications = decoded.map((e) => AppNotification.fromJson(e as Map<String, dynamic>)).toList();

    final index = notifications.indexWhere((n) => n.id == notificationId);
    if (index != -1) {
      notifications[index] = AppNotification(
        id: notifications[index].id,
        title: notifications[index].title,
        body: notifications[index].body,
        timestamp: notifications[index].timestamp,
        isRead: true,
        data: notifications[index].data,
      );

      final encoded = json.encode(notifications.map((e) => e.toJson()).toList());
      await prefs.setString(_notificationsKey, encoded);
    }
  }

  /// Clear all notifications
  Future<void> clearAllNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_notificationsKey);
  }
}

/// Background message handler (must be top-level function)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Handle background message
}
