import 'package:flutter/foundation.dart';
import '../services/api_service.dart';

/// Wallet state provider
class WalletProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  static double _toDouble(dynamic value, {double fallback = 0.0}) {
    if (value == null) return fallback;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? fallback;
    return fallback;
  }

  double _balance = 0.0;
  bool _isLoading = false;
  String? _error;

  // Exchange rate state
  double _topupRate = 0.0;
  double _withdrawalRate = 0.0;
  String _localCurrency = 'XAF';
  double _feeRate = 0.025;
  double _markupPercent = 8.0;

  double get balance => _balance;
  bool get isLoading => _isLoading;
  String? get error => _error;

  double get topupRate => _topupRate;
  double get withdrawalRate => _withdrawalRate;
  String get localCurrency => _localCurrency;
  double get feeRate => _feeRate;
  double get markupPercent => _markupPercent;

  /// Fetch wallet balance from API
  Future<void> fetchBalance() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _balance = await _apiService.getWalletBalance();
    } catch (e) {
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
      _error = errorMessage;
      if (errorMessage.contains('Session expir')) rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch exchange rates for user's country
  Future<void> fetchExchangeRate() async {
    try {
      final data = await _apiService.getExchangeRate();
      _topupRate = _toDouble(data['topup_rate']);
      _withdrawalRate = _toDouble(data['withdrawal_rate']);
      _localCurrency = data['local_currency'] as String? ?? 'XAF';
      _feeRate = _toDouble(data['fee_rate'], fallback: 0.025);
      _markupPercent = _toDouble(data['markup_percent'], fallback: 8.0);
      notifyListeners();
    } catch (e) {
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
      _error = errorMessage;
      notifyListeners();
    }
  }

  /// Top up wallet via MoMo/E-nkap — specify amountUsd or amountLocal
  Future<Map<String, dynamic>?> topupWallet({
    double? amountUsd,
    double? amountLocal,
    required String paymentMethod,
    String? phone,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _apiService.topupWallet(
        amountUsd: amountUsd,
        amountLocal: amountLocal,
        paymentMethod: paymentMethod,
        phone: phone,
      );
      // Balance will be updated after webhook confirmation
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Verify topup payment with Payin and credit wallet if confirmed.
  /// Polls up to [maxAttempts] times with [delay] between attempts.
  Future<Map<String, dynamic>?> verifyTopup(
    String transactionId, {
    int maxAttempts = 10,
    Duration delay = const Duration(seconds: 3),
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      for (int i = 0; i < maxAttempts; i++) {
        final result = await _apiService.verifyWalletTopup(transactionId);
        final status = result['status'] as String?;

        if (status == 'COMPLETED') {
          if (result['wallet_balance'] != null) {
            _balance = _toDouble(result['wallet_balance']);
          }
          _isLoading = false;
          notifyListeners();
          return result;
        }

        if (status == 'FAILED') {
          _isLoading = false;
          _error = result['message'] as String? ?? 'Le paiement a échoué';
          notifyListeners();
          return result;
        }

        // Still PENDING — wait and retry
        if (i < maxAttempts - 1) {
          await Future.delayed(delay);
        }
      }

      // Timed out — still pending
      _isLoading = false;
      notifyListeners();
      return {'status': 'PENDING', 'message': 'Paiement en cours de traitement'};
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Transfer from wallet to card
  Future<Map<String, dynamic>?> transferToCard({
    required String cardId,
    required double amount,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _apiService.transferToCard(
        cardId: cardId,
        amount: amount,
      );
      // Update local balance from response
      if (result['new_wallet_balance'] != null) {
        _balance = _toDouble(result['new_wallet_balance']);
      }
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Verify withdrawal payout with AccountPE and update wallet on completion.
  /// Polls up to [maxAttempts] times with [delay] between attempts.
  Future<Map<String, dynamic>?> verifyWithdraw(
    String transactionId, {
    int maxAttempts = 10,
    Duration delay = const Duration(seconds: 3),
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      for (int i = 0; i < maxAttempts; i++) {
        final result = await _apiService.verifyWithdrawFromWallet(transactionId);
        final status = result['status'] as String?;

        if (status == 'COMPLETED') {
          if (result['wallet_balance'] != null) {
            _balance = _toDouble(result['wallet_balance']);
          }
          _isLoading = false;
          notifyListeners();
          return result;
        }

        if (status == 'FAILED') {
          // Check if wallet was refunded
          if (result['wallet_balance'] != null) {
            _balance = _toDouble(result['wallet_balance']);
          }
          _isLoading = false;
          _error = result['message'] as String? ?? 'Le retrait a échoué';
          notifyListeners();
          return result;
        }

        // Still PENDING — wait and retry
        if (i < maxAttempts - 1) {
          await Future.delayed(delay);
        }
      }

      // Timed out — still pending
      _isLoading = false;
      notifyListeners();
      return {'status': 'PENDING', 'message': 'Retrait en cours de traitement'};
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Withdraw from wallet to MoMo — amount in USD
  Future<Map<String, dynamic>?> withdrawToMomo({
    required double amountUsd,
    required String phone,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _apiService.withdrawFromWallet(
        amountUsd: amountUsd,
        phone: phone,
      );
      // Update local balance from response
      if (result['new_wallet_balance'] != null) {
        _balance = _toDouble(result['new_wallet_balance']);
      }
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Update balance locally (e.g. from user profile refresh)
  void updateBalance(double newBalance) {
    _balance = newBalance;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
