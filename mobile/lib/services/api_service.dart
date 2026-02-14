import 'dart:convert';
import '../models/user.dart';
import '../models/card.dart';
import '../models/transaction.dart';

/// API Service with MOCK data (Phase 1)
/// This will be replaced with real HTTP calls in Phase 2
class ApiService {
  // Mock delay to simulate network call
  Future<void> _mockDelay() async {
    await Future.delayed(const Duration(milliseconds: 800));
  }

  /// Login - Returns mock user and token
  Future<Map<String, dynamic>> login(String email, String password) async {
    await _mockDelay();

    // Simple validation
    if (email.isEmpty || password.isEmpty) {
      throw Exception('Email et mot de passe requis');
    }

    // Mock successful login
    return {
      'token': 'mock_token_${DateTime.now().millisecondsSinceEpoch}',
      'user': {
        'id': 'user-123',
        'email': email,
        'firstName': 'John',
        'lastName': 'Doe',
        'phone': '+33612345678',
        'kycStatus': 'VERIFIED',
        'createdAt': '2026-01-15T10:00:00Z',
      },
    };
  }

  /// Register - Returns mock user and token
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    await _mockDelay();

    // Simple validation
    if (email.isEmpty || password.isEmpty || firstName.isEmpty || lastName.isEmpty) {
      throw Exception('Tous les champs sont requis');
    }

    // Mock successful registration
    return {
      'token': 'mock_token_${DateTime.now().millisecondsSinceEpoch}',
      'user': {
        'id': 'user-${DateTime.now().millisecondsSinceEpoch}',
        'email': email,
        'firstName': firstName,
        'lastName': lastName,
        'phone': null,
        'kycStatus': 'PENDING',
        'createdAt': DateTime.now().toIso8601String(),
      },
    };
  }

  /// Get all cards - Returns mock cards
  Future<List<VirtualCard>> getCards() async {
    await _mockDelay();

    final mockCards = [
      {
        'id': 'card-1',
        'type': 'VISA',
        'balance': 250.00,
        'status': 'ACTIVE',
        'maskedNumber': '**** **** **** 4532',
        'currency': 'EUR',
        'expiryDate': '2028-12-31T00:00:00Z',
        'createdAt': '2026-01-20T14:30:00Z',
      },
      {
        'id': 'card-2',
        'type': 'MASTERCARD',
        'balance': 150.75,
        'status': 'ACTIVE',
        'maskedNumber': '**** **** **** 8765',
        'currency': 'EUR',
        'expiryDate': '2029-06-30T00:00:00Z',
        'createdAt': '2026-02-01T09:15:00Z',
      },
    ];

    return mockCards.map((json) => VirtualCard.fromJson(json)).toList();
  }

  /// Get card by ID - Returns mock card
  Future<VirtualCard> getCardById(String cardId) async {
    await _mockDelay();

    final cards = await getCards();
    try {
      return cards.firstWhere((card) => card.id == cardId);
    } catch (e) {
      throw Exception('Carte non trouvée');
    }
  }

  /// Purchase new card - Returns mock card
  Future<VirtualCard> purchaseCard({
    required String type,
    String currency = 'EUR',
  }) async {
    await _mockDelay();

    final mockCard = {
      'id': 'card-${DateTime.now().millisecondsSinceEpoch}',
      'type': type,
      'balance': 0.0,
      'status': 'ACTIVE',
      'maskedNumber': '**** **** **** ${1000 + DateTime.now().millisecondsSinceEpoch % 9000}',
      'currency': currency,
      'expiryDate': DateTime(DateTime.now().year + 4, 12, 31).toIso8601String(),
      'createdAt': DateTime.now().toIso8601String(),
    };

    return VirtualCard.fromJson(mockCard);
  }

  /// Get transactions - Returns mock transactions
  Future<List<Transaction>> getTransactions({String? cardId}) async {
    await _mockDelay();

    final mockTransactions = [
      {
        'id': 'tx-1',
        'cardId': 'card-1',
        'amount': -45.99,
        'type': 'PURCHASE',
        'status': 'SUCCESS',
        'merchant': 'Amazon',
        'createdAt': '2026-02-13T16:45:00Z',
      },
      {
        'id': 'tx-2',
        'cardId': 'card-1',
        'amount': 100.00,
        'type': 'TOPUP',
        'status': 'SUCCESS',
        'merchant': null,
        'createdAt': '2026-02-12T10:20:00Z',
      },
      {
        'id': 'tx-3',
        'cardId': 'card-2',
        'amount': -25.50,
        'type': 'PURCHASE',
        'status': 'SUCCESS',
        'merchant': 'Netflix',
        'createdAt': '2026-02-11T18:30:00Z',
      },
      {
        'id': 'tx-4',
        'cardId': 'card-1',
        'amount': -12.99,
        'type': 'PURCHASE',
        'status': 'SUCCESS',
        'merchant': 'Spotify',
        'createdAt': '2026-02-10T09:15:00Z',
      },
      {
        'id': 'tx-5',
        'cardId': 'card-2',
        'amount': 50.00,
        'type': 'TOPUP',
        'status': 'SUCCESS',
        'merchant': null,
        'createdAt': '2026-02-09T14:00:00Z',
      },
      {
        'id': 'tx-6',
        'cardId': 'card-1',
        'amount': -8.50,
        'type': 'PURCHASE',
        'status': 'FAILED',
        'merchant': 'Uber',
        'createdAt': '2026-02-08T20:30:00Z',
      },
    ];

    List<Transaction> transactions = mockTransactions
        .map((json) => Transaction.fromJson(json))
        .toList();

    // Filter by cardId if provided
    if (cardId != null) {
      transactions = transactions.where((tx) => tx.cardId == cardId).toList();
    }

    return transactions;
  }

  /// Topup card - Returns mock transaction
  Future<Transaction> topupCard({
    required String cardId,
    required double amount,
    required String method,
  }) async {
    await _mockDelay();

    if (amount <= 0) {
      throw Exception('Le montant doit être supérieur à 0');
    }

    final mockTransaction = {
      'id': 'tx-${DateTime.now().millisecondsSinceEpoch}',
      'cardId': cardId,
      'amount': amount,
      'type': 'TOPUP',
      'status': 'SUCCESS',
      'merchant': null,
      'createdAt': DateTime.now().toIso8601String(),
    };

    return Transaction.fromJson(mockTransaction);
  }

  /// Withdraw from card - Returns mock transaction
  Future<Transaction> withdrawFromCard({
    required String cardId,
    required double amount,
    required String destination,
  }) async {
    await _mockDelay();

    if (amount <= 0) {
      throw Exception('Le montant doit être supérieur à 0');
    }

    final mockTransaction = {
      'id': 'tx-${DateTime.now().millisecondsSinceEpoch}',
      'cardId': cardId,
      'amount': -amount,
      'type': 'WITHDRAWAL',
      'status': 'SUCCESS',
      'merchant': null,
      'createdAt': DateTime.now().toIso8601String(),
    };

    return Transaction.fromJson(mockTransaction);
  }

  /// Get notifications - Returns mock notifications
  Future<List<Map<String, dynamic>>> getNotifications() async {
    await _mockDelay();

    return [
      {
        'id': 'notif-1',
        'title': 'Achat réussi',
        'message': 'Achat de 45.99€ chez Amazon',
        'type': 'TRANSACTION',
        'read': false,
        'createdAt': '2026-02-13T16:45:00Z',
      },
      {
        'id': 'notif-2',
        'title': 'Recharge effectuée',
        'message': 'Votre carte a été rechargée de 100.00€',
        'type': 'TRANSACTION',
        'read': true,
        'createdAt': '2026-02-12T10:20:00Z',
      },
      {
        'id': 'notif-3',
        'title': 'KYC vérifié',
        'message': 'Votre identité a été vérifiée avec succès',
        'type': 'KYC',
        'read': true,
        'createdAt': '2026-01-16T12:00:00Z',
      },
    ];
  }

  /// Update card status - Returns updated card
  Future<VirtualCard> updateCardStatus({
    required String cardId,
    required String status,
  }) async {
    await _mockDelay();

    final card = await getCardById(cardId);
    return card.copyWith(status: status);
  }
}
