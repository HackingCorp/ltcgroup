import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/notification_service.dart';
import '../../config/theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final NotificationService _notificationService = NotificationService();
  List<AppNotification> _notifications = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
    });

    try {
      _notifications = await _notificationService.getStoredNotifications();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erreur: $e'),
            backgroundColor: LTCColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _handleRefresh() async {
    await _loadNotifications();
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount =
        _notifications.where((n) => !n.isRead).length;

    return Scaffold(
      backgroundColor: LTCColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: LTCColors.textPrimary,
        elevation: 0,
        title: Text(
          unreadCount > 0
              ? 'Notifications ($unreadCount)'
              : 'Notifications',
          style: const TextStyle(
            color: LTCColors.textPrimary,
            fontWeight: FontWeight.w600,
            fontSize: 18,
          ),
        ),
      ),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(color: LTCColors.gold),
                  const SizedBox(height: 16),
                  const Text(
                    'Chargement des notifications...',
                    style: TextStyle(
                      color: LTCColors.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              color: LTCColors.gold,
              backgroundColor: LTCColors.surface,
              onRefresh: _handleRefresh,
              child: _notifications.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: _notifications.length,
                      itemBuilder: (context, index) {
                        final notification = _notifications[index];
                        return _buildNotificationItem(notification);
                      },
                    ),
            ),
    );
  }

  Widget _buildEmptyState() {
    return ListView(
      children: [
        SizedBox(height: MediaQuery.of(context).size.height * 0.25),
        Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: LTCColors.surfaceLight,
                shape: BoxShape.circle,
                border: Border.all(color: LTCColors.border),
              ),
              child: const Icon(
                Icons.notifications_none,
                size: 40,
                color: LTCColors.textTertiary,
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'Aucune notification',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: LTCColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Vos notifications apparaitront ici',
              style: TextStyle(
                fontSize: 14,
                color: LTCColors.textTertiary,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildNotificationItem(AppNotification notification) {
    final dateFormat = DateFormat('dd MMM yyyy HH:mm', 'fr_FR');

    // Determine icon and color based on title/body content
    IconData icon = Icons.notifications;
    Color iconColor = LTCColors.gold;

    if (notification.title.toLowerCase().contains('transaction') ||
        notification.body.toLowerCase().contains('transaction')) {
      icon = Icons.receipt;
      iconColor = LTCColors.info;
    } else if (notification.title.toLowerCase().contains('kyc') ||
        notification.body.toLowerCase().contains('kyc')) {
      icon = Icons.verified_user;
      iconColor = LTCColors.success;
    } else if (notification.title.toLowerCase().contains('carte') ||
        notification.body.toLowerCase().contains('carte')) {
      icon = Icons.credit_card;
      iconColor = LTCColors.gold;
    }

    return InkWell(
      onTap: () async {
        if (!notification.isRead) {
          await _notificationService.markAsRead(notification.id);
          _loadNotifications();
        }
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: notification.isRead
              ? LTCColors.surface
              : LTCColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: notification.isRead
                ? LTCColors.border
                : LTCColors.gold.withValues(alpha: 0.3),
          ),
          // Subtle gold glow for unread
          boxShadow: notification.isRead
              ? null
              : [
                  BoxShadow(
                    color: LTCColors.gold.withValues(alpha: 0.05),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                icon,
                color: iconColor,
                size: 24,
              ),
            ),
            const SizedBox(width: 14),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: notification.isRead
                                ? FontWeight.w500
                                : FontWeight.bold,
                            color: LTCColors.textPrimary,
                          ),
                        ),
                      ),
                      if (!notification.isRead)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: LTCColors.gold,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    notification.body,
                    style: const TextStyle(
                      fontSize: 13,
                      color: LTCColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    dateFormat.format(notification.timestamp),
                    style: const TextStyle(
                      fontSize: 11,
                      color: LTCColors.textTertiary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
