import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/notification_service.dart';
import '../../widgets/loading_indicator.dart';
import '../../widgets/empty_state.dart';
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
            backgroundColor: Colors.red,
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
      appBar: AppBar(
        title: Text(
          unreadCount > 0
              ? 'Notifications ($unreadCount)'
              : 'Notifications',
        ),
      ),
      body: _isLoading
          ? const LoadingIndicator(message: 'Chargement des notifications...')
          : RefreshIndicator(
              onRefresh: _handleRefresh,
              child: _notifications.isEmpty
                  ? const EmptyState(
                      title: 'Aucune notification',
                      message: 'Vos notifications apparaîtront ici',
                      icon: Icons.notifications_none,
                    )
                  : ListView.builder(
                      itemCount: _notifications.length,
                      itemBuilder: (context, index) {
                        final notification = _notifications[index];
                        return _buildNotificationItem(notification);
                      },
                    ),
            ),
    );
  }

  Widget _buildNotificationItem(AppNotification notification) {
    final dateFormat = DateFormat('dd MMM yyyy HH:mm', 'fr_FR');

    // Determine icon and color based on title/body content
    IconData icon = Icons.notifications;
    Color iconColor = LTCTheme.gold;

    if (notification.title.toLowerCase().contains('transaction') ||
        notification.body.toLowerCase().contains('transaction')) {
      icon = Icons.receipt;
      iconColor = Colors.blue;
    } else if (notification.title.toLowerCase().contains('kyc') ||
        notification.body.toLowerCase().contains('kyc')) {
      icon = Icons.verified_user;
      iconColor = Colors.green;
    } else if (notification.title.toLowerCase().contains('carte') ||
        notification.body.toLowerCase().contains('carte')) {
      icon = Icons.credit_card;
      iconColor = LTCTheme.gold;
    }

    return InkWell(
      onTap: () async {
        if (!notification.isRead) {
          await _notificationService.markAsRead(notification.id);
          _loadNotifications();
        }
      },
      child: Container(
        color: notification.isRead ? Colors.transparent : LTCTheme.gold.withValues(alpha:0.05),
        child: ListTile(
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          leading: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: iconColor.withValues(alpha:0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: iconColor,
              size: 24,
            ),
          ),
          title: Row(
            children: [
              Expanded(
                child: Text(
                  notification.title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: notification.isRead ? FontWeight.w500 : FontWeight.bold,
                  ),
                ),
              ),
              if (!notification.isRead)
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: LTCTheme.gold,
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 4),
              Text(
                notification.body,
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                dateFormat.format(notification.timestamp),
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
