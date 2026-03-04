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
    final dateFormat = DateFormat('dd MMMM yyyy a HH:mm', 'fr_FR');
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

    return Scaffold(
      backgroundColor: LTCColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: LTCColors.textPrimary,
        elevation: 0,
        title: const Text(
          'Details de la transaction',
          style: TextStyle(
            color: LTCColors.textPrimary,
            fontWeight: FontWeight.w600,
            fontSize: 18,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share, color: LTCColors.textSecondary),
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
              child: GestureDetector(
                onTap: () => _shareReceipt(transaction, dateFormat, currencyFormat),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [LTCColors.goldDark, LTCColors.gold, LTCColors.goldLight],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: LTCColors.gold.withValues(alpha: 0.3),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.share, color: LTCColors.background, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Partager le recu',
                        style: TextStyle(
                          color: LTCColors.background,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
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
        statusColor = LTCColors.success;
        statusIcon = Icons.check_circle;
        break;
      case 'PENDING':
        statusColor = LTCColors.warning;
        statusIcon = Icons.pending;
        break;
      case 'FAILED':
        statusColor = LTCColors.error;
        statusIcon = Icons.cancel;
        break;
      default:
        statusColor = LTCColors.textSecondary;
        statusIcon = Icons.help_outline;
    }

    final isDebit = transaction.isDebit;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
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
                      const Icon(
                        Icons.account_balance,
                        color: LTCColors.gold,
                        size: 32,
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Kash Pay',
                        style: TextStyle(
                          fontSize: 20,
                          color: LTCColors.textPrimary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Recu de transaction',
                    style: TextStyle(
                      fontSize: 12,
                      color: LTCColors.textSecondary,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withValues(alpha: 0.4)),
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
          Container(height: 1, color: LTCColors.border),
          const SizedBox(height: 24),

          // Amount
          Center(
            child: Column(
              children: [
                const Text(
                  'Montant',
                  style: TextStyle(
                    fontSize: 14,
                    color: LTCColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${isDebit ? '-' : '+'}${currencyFormat.format(transaction.amount)}',
                  style: TextStyle(
                    fontSize: 36,
                    fontWeight: FontWeight.bold,
                    color: LTCColors.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Container(height: 1, color: LTCColors.border),
          const SizedBox(height: 16),

          // Transaction details
          _buildDetailRow('Type', _getTypeText(transaction.type)),
          _buildDetailRow('Date', dateFormat.format(transaction.createdAt.toLocal())),
          _buildDetailRow('ID Transaction', transaction.id),
          if (transaction.cardId != null)
            _buildDetailRow('Carte', 'Card ${transaction.cardId!.substring(0, 8)}...'),
          _buildDetailRow('Devise', transaction.currency),

          const SizedBox(height: 24),
          Container(height: 1, color: LTCColors.border),
          const SizedBox(height: 16),

          // Footer
          const Center(
            child: Column(
              children: [
                Text(
                  'Kash Pay',
                  style: TextStyle(
                    fontSize: 12,
                    color: LTCColors.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                SizedBox(height: 4),
                Text(
                  'support@kashpay.app',
                  style: TextStyle(
                    fontSize: 12,
                    color: LTCColors.textTertiary,
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
              color: LTCColors.textSecondary,
              fontSize: 14,
            ),
          ),
          Flexible(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: LTCColors.textPrimary,
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
        return 'Termine';
      case 'PENDING':
        return 'En attente';
      case 'FAILED':
        return 'Echoue';
      default:
        return status;
    }
  }

  String _getTypeText(String type) {
    switch (type.toUpperCase()) {
      case 'TOPUP':
        return 'Recharge carte';
      case 'WITHDRAWAL':
        return 'Retrait carte';
      case 'PURCHASE':
        return 'Achat';
      case 'DEBIT':
        return 'Debit';
      case 'CREDIT':
        return 'Credit';
      case 'REFUND':
        return 'Remboursement';
      case 'WALLET_TOPUP':
        return 'Recharge wallet';
      case 'WALLET_TO_CARD':
        return 'Transfert vers carte';
      case 'WALLET_WITHDRAWAL':
        return 'Retrait wallet';
      default:
        return type;
    }
  }

  void _shareReceipt(Transaction transaction, DateFormat dateFormat, NumberFormat currencyFormat) {
    final isDebit = transaction.isDebit;
    final receiptText = '''
Recu de transaction - Kash Pay

Montant: ${isDebit ? '-' : '+'}${currencyFormat.format(transaction.amount)}
Date: ${dateFormat.format(transaction.createdAt.toLocal())}
Type: ${_getTypeText(transaction.type)}
Statut: ${_getStatusText(transaction.status)}
ID: ${transaction.id}
${transaction.cardId != null ? 'Carte: ${transaction.cardId!.substring(0, 8)}...' : ''}

---
Kash Pay
support@kashpay.app
    ''';

    Share.share(receiptText, subject: 'Recu de transaction Kash Pay');
  }
}
