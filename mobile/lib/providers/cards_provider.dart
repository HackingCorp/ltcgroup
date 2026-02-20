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
    _isLoading = true;
    _error = null;
    notifyListeners();

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
    String currency = 'XAF',
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final newCard = await _apiService.purchaseCard(
        type: type,
        initialBalance: initialBalance,
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
