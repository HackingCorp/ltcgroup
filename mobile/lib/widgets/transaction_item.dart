import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/transaction.dart';
import '../config/theme.dart';
import '../config/constants.dart';

/// Transaction list item widget
class TransactionItem extends StatelessWidget {
  final Transaction transaction;
  final VoidCallback? onTap;

  const TransactionItem({
    super.key,
    required this.transaction,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy HH:mm', 'fr_FR');

    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: _getIconBackgroundColor(),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Icon(
          _getIcon(),
          color: _getIconColor(),
          size: 24,
        ),
      ),
      title: Text(
        transaction.description,
        style: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: LTCColors.textPrimary,
        ),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 4),
          Text(
            dateFormat.format(transaction.createdAt),
            style: const TextStyle(
              fontSize: 12,
              color: LTCColors.textSecondary,
            ),
          ),
          if (!transaction.isSuccess) ...[
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: _getStatusColor().withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                _getStatusLabel(),
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: _getStatusColor(),
                ),
              ),
            ),
          ],
        ],
      ),
      trailing: Text(
        '${transaction.amount > 0 ? '+' : ''}${transaction.amount.toStringAsFixed(2)} ${AppConstants.currencySymbol}',
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.bold,
          color: transaction.isCredit
              ? LTCColors.success
              : LTCColors.textPrimary,
        ),
      ),
    );
  }

  IconData _getIcon() {
    switch (transaction.type) {
      case AppConstants.transactionTypePurchase:
        return Icons.shopping_bag;
      case AppConstants.transactionTypeTopup:
        return Icons.arrow_downward;
      case AppConstants.transactionTypeWithdrawal:
        return Icons.arrow_upward;
      case AppConstants.transactionTypeRefund:
        return Icons.refresh;
      default:
        return Icons.receipt;
    }
  }

  Color _getIconColor() {
    switch (transaction.type) {
      case AppConstants.transactionTypePurchase:
        return LTCColors.primary;
      case AppConstants.transactionTypeTopup:
        return LTCColors.success;
      case AppConstants.transactionTypeWithdrawal:
        return LTCColors.warning;
      case AppConstants.transactionTypeRefund:
        return LTCColors.info;
      default:
        return Colors.grey;
    }
  }

  Color _getIconBackgroundColor() {
    return _getIconColor().withOpacity(0.1);
  }

  Color _getStatusColor() {
    switch (transaction.status) {
      case AppConstants.transactionStatusSuccess:
        return LTCColors.success;
      case AppConstants.transactionStatusPending:
        return LTCColors.warning;
      case AppConstants.transactionStatusFailed:
        return LTCColors.error;
      default:
        return Colors.grey;
    }
  }

  String _getStatusLabel() {
    switch (transaction.status) {
      case AppConstants.transactionStatusSuccess:
        return 'RÉUSSI';
      case AppConstants.transactionStatusPending:
        return 'EN COURS';
      case AppConstants.transactionStatusFailed:
        return 'ÉCHOUÉ';
      default:
        return transaction.status;
    }
  }
}
