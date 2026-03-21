import 'package:flutter/foundation.dart';
import '../models/transaction.dart';
import '../services/api_service.dart';
import '../services/posthog_service.dart';

/// Transactions state provider
class TransactionsProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  static const int _pageSize = 50;

  List<Transaction> _transactions = [];
  List<Transaction> _walletTransactions = [];
  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _isLoadingWallet = false;
  bool _hasMore = true;
  String? _error;
  String? _filterCardId;

  List<Transaction> get transactions => _transactions;
  List<Transaction> get walletTransactions => _walletTransactions;
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get isLoadingWallet => _isLoadingWallet;
  bool get hasMore => _hasMore;
  String? get error => _error;
  String? get filterCardId => _filterCardId;

  /// Get recent transactions (last 5)
  List<Transaction> get recentTransactions {
    return _transactions.take(5).toList();
  }

  /// Fetch first page of transactions (resets list)
  Future<void> fetchTransactions({String? cardId}) async {
    // Only show loading indicator when no data exists yet (initial load)
    final showLoading = _transactions.isEmpty;
    if (showLoading) {
      _isLoading = true;
      notifyListeners();
    }
    _error = null;
    _filterCardId = cardId;
    _hasMore = true;

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
    } catch (e) {
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
      _error = errorMessage;
    } finally {
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  /// Fetch wallet-only transactions (WALLET_TOPUP, WALLET_TO_CARD, WALLET_WITHDRAWAL)
  Future<void> fetchWalletTransactions() async {
    _isLoadingWallet = true;
    notifyListeners();

    try {
      _walletTransactions = await _apiService.getTransactions(
        category: 'wallet',
        limit: 20,
        offset: 0,
      );
    } catch (e) {
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
      _error = errorMessage;
    } finally {
      _isLoadingWallet = false;
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
      PosthogService.capture('card_topped_up', {'amount': amount, 'currency': currency});

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
      PosthogService.capture('card_withdrawn', {'amount': amount, 'currency': currency});

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
