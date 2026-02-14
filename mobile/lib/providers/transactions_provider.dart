import 'package:flutter/foundation.dart';
import '../models/transaction.dart';
import '../services/api_service.dart';

/// Transactions state provider
class TransactionsProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Transaction> _transactions = [];
  bool _isLoading = false;
  String? _error;
  String? _filterCardId;

  List<Transaction> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get filterCardId => _filterCardId;

  /// Get recent transactions (last 5)
  List<Transaction> get recentTransactions {
    return _transactions.take(5).toList();
  }

  /// Fetch all transactions
  Future<void> fetchTransactions({String? cardId}) async {
    _isLoading = true;
    _error = null;
    _filterCardId = cardId;
    notifyListeners();

    try {
      _transactions = await _apiService.getTransactions(cardId: cardId);
      // Sort by date descending
      _transactions.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    } catch (e) {
      _error = 'Erreur lors du chargement des transactions';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Topup card
  Future<bool> topupCard({
    required String cardId,
    required double amount,
    required String method,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final transaction = await _apiService.topupCard(
        cardId: cardId,
        amount: amount,
        method: method,
      );

      // Add transaction to list
      _transactions.insert(0, transaction);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Erreur lors de la recharge';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Withdraw from card
  Future<bool> withdrawFromCard({
    required String cardId,
    required double amount,
    required String destination,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final transaction = await _apiService.withdrawFromCard(
        cardId: cardId,
        amount: amount,
        destination: destination,
      );

      // Add transaction to list
      _transactions.insert(0, transaction);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Erreur lors du retrait';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Get transactions for specific card
  List<Transaction> getTransactionsForCard(String cardId) {
    return _transactions.where((tx) => tx.cardId == cardId).toList();
  }

  /// Clear filter
  void clearFilter() {
    _filterCardId = null;
    notifyListeners();
  }

  /// Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
