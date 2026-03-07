import 'package:flutter/foundation.dart';
import '../models/card.dart';
import '../services/api_service.dart';

/// Cards state provider
class CardsProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<VirtualCard> _cards = [];
  bool _isLoading = false;
  String? _error;

  List<VirtualCard> get cards => _cards;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Get total balance across all cards
  double get totalBalance {
    return _cards.fold(0.0, (sum, card) => sum + card.balance);
  }

  /// Get active cards count
  int get activeCardsCount {
    return _cards.where((card) => card.isActive).length;
  }

  /// Fetch all cards
  Future<void> fetchCards() async {
    // Only show loading indicator when no data exists yet (initial load)
    final showLoading = _cards.isEmpty;
    if (showLoading) {
      _isLoading = true;
      notifyListeners();
    }
    _error = null;

    try {
      _cards = await _apiService.getCards();
    } catch (e) {
      // Extract error message from exception
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
      _error = errorMessage;

      // If session expired, rethrow to let UI handle logout
      if (errorMessage.contains('Session expirée')) {
        rethrow;
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Get card by ID
  VirtualCard? getCardById(String cardId) {
    try {
      return _cards.firstWhere((card) => card.id == cardId);
    } catch (e) {
      return null;
    }
  }

  /// Purchase new card
  Future<bool> purchaseCard({
    required String type,
    required double initialBalance,
    String? cardTier,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final newCard = await _apiService.purchaseCard(
        type: type,
        initialBalance: initialBalance,
        cardTier: cardTier,
      );
      _cards = [..._cards, newCard];
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

  /// Update card status (freeze, unfreeze, block)
  Future<bool> updateCardStatus({
    required String cardId,
    required String status,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final updatedCard = await _apiService.updateCardStatus(
        cardId: cardId,
        status: status,
      );

      // Update card in list
      final index = _cards.indexWhere((card) => card.id == cardId);
      if (index != -1) {
        _cards[index] = updatedCard;
      }

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

  /// Replace card (blocks old, creates new via provider)
  Future<bool> replaceCard({required String cardId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final newCard = await _apiService.replaceCard(cardId);

      // Mark old card as blocked in local list
      final oldIndex = _cards.indexWhere((card) => card.id == cardId);
      if (oldIndex != -1) {
        _cards[oldIndex] = _cards[oldIndex].copyWith(status: 'BLOCKED');
      }

      // Add new card
      _cards = [..._cards, newCard];
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
      _error = errorMessage;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Update card spending limit (legacy - use updateCardLimits instead)
  Future<bool> updateCardLimit({
    required String cardId,
    required double spendingLimit,
  }) async {
    return updateCardLimits(
      cardId: cardId,
      spendingLimit: spendingLimit,
    );
  }

  /// Update card limits (spending, daily, transaction limits)
  Future<bool> updateCardLimits({
    required String cardId,
    double? spendingLimit,
    double? dailyLimit,
    double? transactionLimit,
  }) async {
    _error = null;

    try {
      final updatedCard = await _apiService.updateCardLimit(
        cardId,
        spendingLimit: spendingLimit,
        dailyLimit: dailyLimit,
        transactionLimit: transactionLimit,
      );

      final index = _cards.indexWhere((card) => card.id == cardId);
      if (index != -1) {
        _cards[index] = updatedCard;
      }

      notifyListeners();
      return true;
    } catch (e) {
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
      _error = errorMessage;
      notifyListeners();
      return false;
    }
  }

  /// Update card balance (after topup/withdrawal)
  void updateCardBalance(String cardId, double newBalance) {
    final index = _cards.indexWhere((card) => card.id == cardId);
    if (index != -1) {
      _cards[index] = _cards[index].copyWith(balance: newBalance);
      notifyListeners();
    }
  }

  /// Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }
}
