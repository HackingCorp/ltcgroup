import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/api_service.dart';
import '../../widgets/loading_indicator.dart';
import '../../config/theme.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final ApiService _apiService = ApiService();
  List<Map<String, dynamic>> _notifications = [];
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
      _notifications = await _apiService.getNotifications();
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
        _notifications.where((n) => n['read'] == false).length;

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
                  ? _buildEmptyState()
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

  Widget _buildNotificationItem(Map<String, dynamic> notification) {
    final dateFormat = DateFormat('dd MMM yyyy HH:mm', 'fr_FR');
    final createdAt = DateTime.parse(notification['createdAt'] as String);
    final isRead = notification['read'] as bool;
    final type = notification['type'] as String;

    IconData icon;
    Color iconColor;

    switch (type) {
      case 'TRANSACTION':
        icon = Icons.receipt;
        iconColor = LTCColors.info;
        break;
      case 'KYC':
        icon = Icons.verified_user;
        iconColor = LTCColors.success;
        break;
      case 'CARD':
        icon = Icons.credit_card;
        iconColor = LTCColors.accent;
        break;
      default:
        icon = Icons.notifications;
        iconColor = Colors.grey;
    }

    return Container(
      color: isRead ? Colors.transparent : LTCColors.accent.withOpacity(0.05),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
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
                notification['title'] as String,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: isRead ? FontWeight.w500 : FontWeight.bold,
                  color: LTCColors.textPrimary,
                ),
              ),
            ),
            if (!isRead)
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: LTCColors.accent,
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
              notification['message'] as String,
              style: const TextStyle(
                fontSize: 14,
                color: LTCColors.textSecondary,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              dateFormat.format(createdAt),
              style: const TextStyle(
                fontSize: 12,
                color: LTCColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_none,
              size: 100,
              color: Colors.grey[400],
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
            const SizedBox(height: 12),
            const Text(
              'Vos notifications apparaîtront ici',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: LTCColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
