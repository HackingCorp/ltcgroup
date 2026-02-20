import 'package:flutter/foundation.dart';
import '../models/transaction.dart';
import '../services/api_service.dart';

/// Transactions state provider
class TransactionsProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  static const int _pageSize = 50;

  List<Transaction> _transactions = [];
  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  String? _error;
  String? _filterCardId;

  List<Transaction> get transactions => _transactions;
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasMore => _hasMore;
  String? get error => _error;
  String? get filterCardId => _filterCardId;

  /// Get recent transactions (last 5)
  List<Transaction> get recentTransactions {
    return _transactions.take(5).toList();
  }

  /// Fetch first page of transactions (resets list)
  Future<void> fetchTransactions({String? cardId}) async {
    _isLoading = true;
    _error = null;
    _filterCardId = cardId;
    _hasMore = true;
    notifyListeners();

    try {
      _transactions = await _apiService.getTransactions(
        cardId: cardId,
        limit: _pageSize,
        offset: 0,
      );
      _hasMore = _transactions.length >= _pageSize;
      // Sort by date descending
      _transactions.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    } catch (e) {
      // Extract error message from exception
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
      _error = errorMessage;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load next page of transactions (appends to list)
  Future<void> fetchMoreTransactions() async {
    if (_isLoadingMore || !_hasMore) return;

    _isLoadingMore = true;
    notifyListeners();

    try {
      final newItems = await _apiService.getTransactions(
        cardId: _filterCardId,
        limit: _pageSize,
        offset: _transactions.length,
      );
      _hasMore = newItems.length >= _pageSize;
      _transactions.addAll(newItems);
      _transactions.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    } catch (e) {
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
      _error = errorMessage;
    } finally {
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  /// Topup card
  Future<bool> topupCard({
    required String cardId,
    required double amount,
    String currency = 'XAF',
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final transaction = await _apiService.topupCard(
        cardId: cardId,
        amount: amount,
        currency: currency,
      );

      // Add transaction to list
      _transactions.insert(0, transaction);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      // Extract error message from exception
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
      _error = errorMessage;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Withdraw from card
  Future<bool> withdrawFromCard({
    required String cardId,
    required double amount,
    String currency = 'XAF',
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final transaction = await _apiService.withdrawFromCard(
        cardId: cardId,
        amount: amount,
        currency: currency,
      );

      // Add transaction to list
      _transactions.insert(0, transaction);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      // Extract error message from exception
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
      _error = errorMessage;
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
