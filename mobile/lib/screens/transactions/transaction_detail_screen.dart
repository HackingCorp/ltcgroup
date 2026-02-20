import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../../models/transaction.dart';
import '../../config/theme.dart';

class TransactionDetailScreen extends StatelessWidget {
  const TransactionDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final transaction = ModalRoute.of(context)?.settings.arguments as Transaction? ??
        (throw Exception('Transaction argument missing'));
    final dateFormat = DateFormat('dd MMMM yyyy à HH:mm', 'fr_FR');
    final currencyFormat = NumberFormat.currency(symbol: 'FCFA ', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Détails de la transaction'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () => _shareReceipt(transaction, dateFormat, currencyFormat),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const SizedBox(height: 24),
            // Receipt card
            _buildReceiptCard(transaction, dateFormat, currencyFormat, context),
            const SizedBox(height: 24),
            // Share button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: ElevatedButton.icon(
                onPressed: () => _shareReceipt(transaction, dateFormat, currencyFormat),
                icon: const Icon(Icons.share),
                label: const Text('Partager le reçu'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: LTCTheme.gold,
                  foregroundColor: LTCTheme.navy,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildReceiptCard(Transaction transaction, DateFormat dateFormat, NumberFormat currencyFormat, BuildContext context) {
    Color statusColor;
    IconData statusIcon;

    switch (transaction.status.toUpperCase()) {
      case 'COMPLETED':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        break;
      case 'PENDING':
        statusColor = Colors.orange;
        statusIcon = Icons.pending;
        break;
      case 'FAILED':
        statusColor = Colors.red;
        statusIcon = Icons.cancel;
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.help_outline;
    }

    final isDebit = transaction.type == 'DEBIT' || transaction.type == 'WITHDRAWAL';
    final amountColor = isDebit ? Colors.red : Colors.green;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with LTC branding
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        Icons.account_balance,
                        color: LTCTheme.gold,
                        size: 32,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'LTC vCard',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: LTCTheme.navy,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Reçu de transaction',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, size: 16, color: statusColor),
                    const SizedBox(width: 4),
                    Text(
                      _getStatusText(transaction.status),
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 24),

          // Amount
          Center(
            child: Column(
              children: [
                Text(
                  'Montant',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.grey.shade600,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${isDebit ? '-' : '+'}${currencyFormat.format(transaction.amount)}',
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                        color: amountColor,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),

          // Transaction details
          _buildDetailRow('Type', _getTypeText(transaction.type)),
          _buildDetailRow('Date', dateFormat.format(transaction.createdAt)),
          _buildDetailRow('ID Transaction', transaction.id),
          if (transaction.cardId != null)
            _buildDetailRow('Carte', 'Card ${transaction.cardId!.substring(0, 8)}...'),
          _buildDetailRow('Devise', transaction.currency),

          const SizedBox(height: 24),
          const Divider(),
          const SizedBox(height: 16),

          // Footer
          Center(
            child: Column(
              children: [
                Text(
                  'LTC Group',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey.shade600,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'support@ltcgroup.com',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey.shade400,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Colors.grey,
              fontSize: 14,
            ),
          ),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  String _getStatusText(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'Terminé';
      case 'PENDING':
        return 'En attente';
      case 'FAILED':
        return 'Échoué';
      default:
        return status;
    }
  }

  String _getTypeText(String type) {
    switch (type.toUpperCase()) {
      case 'TOPUP':
        return 'Recharge';
      case 'WITHDRAWAL':
        return 'Retrait';
      case 'PURCHASE':
        return 'Achat';
      case 'DEBIT':
        return 'Débit';
      case 'CREDIT':
        return 'Crédit';
      default:
        return type;
    }
  }

  void _shareReceipt(Transaction transaction, DateFormat dateFormat, NumberFormat currencyFormat) {
    final isDebit = transaction.type == 'DEBIT' || transaction.type == 'WITHDRAWAL';
    final receiptText = '''
🧾 Reçu de transaction - LTC vCard

💰 Montant: ${isDebit ? '-' : '+'}${currencyFormat.format(transaction.amount)}
📅 Date: ${dateFormat.format(transaction.createdAt)}
🏷️ Type: ${_getTypeText(transaction.type)}
✅ Statut: ${_getStatusText(transaction.status)}
🆔 ID: ${transaction.id}
${transaction.cardId != null ? '💳 Carte: ${transaction.cardId!.substring(0, 8)}...' : ''}

---
LTC Group
support@ltcgroup.com
    ''';

    Share.share(receiptText, subject: 'Reçu de transaction LTC vCard');
  }
}
