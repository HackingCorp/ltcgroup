import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/user.dart';
import '../models/card.dart';
import '../models/transaction.dart';
import '../config/api_config.dart';
import 'storage_service.dart';

/// API Service with real HTTP calls
class ApiService {
  final StorageService _storageService = StorageService();

  /// Get authorization headers with token
  Future<Map<String, String>> _getAuthHeaders() async {
    final token = await _storageService.getToken();
    return ApiConfig.headers(token: token);
  }

  /// Handle API errors
  Exception _handleError(http.Response response) {
    if (response.statusCode == 401) {
      // Session expired - clear token
      _storageService.removeToken();
      return Exception('Session expirée. Veuillez vous reconnecter.');
    }

    try {
      final data = json.decode(response.body);
      final detail = data['detail'] ?? 'Une erreur est survenue';
      return Exception(detail);
    } catch (e) {
      return Exception('Erreur ${response.statusCode}: ${response.reasonPhrase}');
    }
  }

  /// Login - Returns user and token
  Future<Map<String, dynamic>> login(String email, String password) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.loginEndpoint}?email=$email&password=$password');

    try {
      final response = await http.post(
        url,
        headers: ApiConfig.headers(),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'token': data['access_token'] as String,
          'user': null, // We'll fetch user data separately with /users/me
        };
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de connexion: $e');
    }
  }

  /// Register - Returns user and token
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.registerEndpoint}');

    final body = {
      'email': email,
      'password': password,
      'first_name': firstName,
      'last_name': lastName,
      if (phone != null) 'phone': phone,
    };

    try {
      final response = await http.post(
        url,
        headers: ApiConfig.headers(),
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        return {
          'token': data['token']['access_token'] as String,
          'user': data['user'],
        };
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur d\'inscription: $e');
    }
  }

  /// Get current user profile
  Future<User> getCurrentUser() async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.profileEndpoint}');
    final headers = await _getAuthHeaders();

    try {
      final response = await http.get(
        url,
        headers: headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return User.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de récupération du profil: $e');
    }
  }

  /// Update user profile
  Future<User> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.profileEndpoint}');
    final headers = await _getAuthHeaders();

    final body = <String, dynamic>{};
    if (firstName != null) body['first_name'] = firstName;
    if (lastName != null) body['last_name'] = lastName;
    if (phone != null) body['phone'] = phone;

    try {
      final response = await http.patch(
        url,
        headers: headers,
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return User.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de mise à jour du profil: $e');
    }
  }

  /// Submit KYC document
  Future<void> submitKyc({
    required String documentUrl,
    required String documentType,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.kycEndpoint}');
    final headers = await _getAuthHeaders();

    final body = {
      'document_url': documentUrl,
      'document_type': documentType,
    };

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return;
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de soumission KYC: $e');
    }
  }

  /// Get all cards
  Future<List<VirtualCard>> getCards() async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.cardsEndpoint}/');
    final headers = await _getAuthHeaders();

    try {
      final response = await http.get(
        url,
        headers: headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final cardsList = data['cards'] as List;
        return cardsList.map((json) => VirtualCard.fromJson(json)).toList();
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de récupération des cartes: $e');
    }
  }

  /// Get card by ID
  Future<VirtualCard> getCardById(String cardId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.cardsEndpoint}/$cardId');
    final headers = await _getAuthHeaders();

    try {
      final response = await http.get(
        url,
        headers: headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return VirtualCard.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else if (response.statusCode == 404) {
        throw Exception('Carte non trouvée');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de récupération de la carte: $e');
    }
  }

  /// Purchase new card
  Future<VirtualCard> purchaseCard({
    required String type,
    required double initialBalance,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.cardsEndpoint}/purchase');
    final headers = await _getAuthHeaders();

    final body = {
      'card_type': type,
      'initial_balance': initialBalance,
    };

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        return VirtualCard.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur d\'achat de carte: $e');
    }
  }

  /// Freeze card
  Future<VirtualCard> freezeCard(String cardId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.cardsEndpoint}/$cardId/freeze');
    final headers = await _getAuthHeaders();

    try {
      final response = await http.post(
        url,
        headers: headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return VirtualCard.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de gel de la carte: $e');
    }
  }

  /// Unfreeze card
  Future<VirtualCard> unfreezeCard(String cardId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.cardsEndpoint}/$cardId/unfreeze');
    final headers = await _getAuthHeaders();

    try {
      final response = await http.post(
        url,
        headers: headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return VirtualCard.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de dégel de la carte: $e');
    }
  }

  /// Block card
  Future<VirtualCard> blockCard(String cardId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.cardsEndpoint}/$cardId/block');
    final headers = await _getAuthHeaders();

    try {
      final response = await http.post(
        url,
        headers: headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return VirtualCard.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de blocage de la carte: $e');
    }
  }

  /// Update card status (generic method)
  Future<VirtualCard> updateCardStatus({
    required String cardId,
    required String status,
  }) async {
    switch (status.toUpperCase()) {
      case 'FROZEN':
        return await freezeCard(cardId);
      case 'BLOCKED':
        return await blockCard(cardId);
      case 'ACTIVE':
        return await unfreezeCard(cardId);
      default:
        throw Exception('Statut de carte invalide: $status');
    }
  }

  /// Get transactions for a card
  Future<List<Transaction>> getTransactions({
    String? cardId,
    int limit = 50,
    int offset = 0,
  }) async {
    final String path = cardId != null
        ? '${ApiConfig.transactionsEndpoint}/cards/$cardId/transactions'
        : ApiConfig.transactionsEndpoint;

    final url = Uri.parse('${ApiConfig.baseUrl}$path?limit=$limit&offset=$offset');
    final headers = await _getAuthHeaders();

    try {
      final response = await http.get(
        url,
        headers: headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final transactionsList = data['transactions'] as List;
        return transactionsList.map((json) => Transaction.fromJson(json)).toList();
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de récupération des transactions: $e');
    }
  }

  /// Topup card
  Future<Transaction> topupCard({
    required String cardId,
    required double amount,
    String currency = 'USD',
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.topupEndpoint}');
    final headers = await _getAuthHeaders();

    final body = {
      'card_id': cardId,
      'amount': amount,
      'currency': currency,
    };

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        return Transaction.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de recharge: $e');
    }
  }

  /// Withdraw from card
  Future<Transaction> withdrawFromCard({
    required String cardId,
    required double amount,
    String currency = 'USD',
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.withdrawEndpoint}');
    final headers = await _getAuthHeaders();

    final body = {
      'card_id': cardId,
      'amount': amount,
      'currency': currency,
    };

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        return Transaction.fromJson(data);
      } else if (response.statusCode == 401) {
        throw Exception('Session expirée. Veuillez vous reconnecter.');
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de retrait: $e');
    }
  }

  /// Get notifications - Mock implementation (no backend endpoint yet)
  Future<List<Map<String, dynamic>>> getNotifications() async {
    // This endpoint doesn't exist in the backend yet, so we keep a mock
    await Future.delayed(const Duration(milliseconds: 500));
    return [];
  }
}
