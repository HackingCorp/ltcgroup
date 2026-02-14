import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/transactions_provider.dart';
import '../../providers/cards_provider.dart';
import '../../widgets/transaction_item.dart';
import '../../widgets/loading_indicator.dart';
import '../../config/theme.dart';

class TransactionListScreen extends StatefulWidget {
  const TransactionListScreen({super.key});

  @override
  State<TransactionListScreen> createState() => _TransactionListScreenState();
}

class _TransactionListScreenState extends State<TransactionListScreen> {
  String? _filterCardId;

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  Future<void> _loadTransactions() async {
    final transactionsProvider =
        Provider.of<TransactionsProvider>(context, listen: false);
    await transactionsProvider.fetchTransactions(cardId: _filterCardId);
  }

  Future<void> _handleRefresh() async {
    await _loadTransactions();
  }

  void _showFilterDialog() {
    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Filtrer par carte'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Toutes les cartes'),
              leading: Radio<String?>(
                value: null,
                groupValue: _filterCardId,
                onChanged: (value) {
                  setState(() {
                    _filterCardId = value;
                  });
                  Navigator.of(context).pop();
                  _loadTransactions();
                },
              ),
            ),
            ...cardsProvider.cards.map(
              (card) => ListTile(
                title: Text('${card.type} ${card.maskedNumber.substring(15)}'),
                leading: Radio<String?>(
                  value: card.id,
                  groupValue: _filterCardId,
                  onChanged: (value) {
                    setState(() {
                      _filterCardId = value;
                    });
                    Navigator.of(context).pop();
                    _loadTransactions();
                  },
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Fermer'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final transactionsProvider = Provider.of<TransactionsProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'),
        actions: [
          IconButton(
            icon: Icon(
              _filterCardId != null
                  ? Icons.filter_alt
                  : Icons.filter_alt_outlined,
            ),
            onPressed: _showFilterDialog,
          ),
        ],
      ),
      body: transactionsProvider.isLoading &&
              transactionsProvider.transactions.isEmpty
          ? const LoadingIndicator(message: 'Chargement des transactions...')
          : RefreshIndicator(
              onRefresh: _handleRefresh,
              child: transactionsProvider.transactions.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      itemCount: transactionsProvider.transactions.length,
                      itemBuilder: (context, index) {
                        final transaction =
                            transactionsProvider.transactions[index];
                        return TransactionItem(transaction: transaction);
                      },
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
              Icons.receipt_long_outlined,
              size: 100,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 24),
            const Text(
              'Aucune transaction',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: LTCColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              _filterCardId != null
                  ? 'Aucune transaction pour cette carte'
                  : 'Vos transactions apparaîtront ici',
              textAlign: TextAlign.center,
              style: const TextStyle(
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
