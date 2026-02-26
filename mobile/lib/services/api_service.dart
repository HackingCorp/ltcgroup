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

  /// Global callback invoked when a 401 response is received (session expired).
  /// Set this from the AuthProvider to trigger automatic logout.
  static void Function()? onSessionExpired;

  /// Get authorization headers with token
  Future<Map<String, String>> _getAuthHeaders() async {
    final token = await _storageService.getToken();
    return ApiConfig.headers(token: token);
  }

  /// Retry helper for GET requests (retries on 5xx or network errors).
  Future<http.Response> _retryGet(String url, {Map<String, String>? headers, int maxRetries = 2}) async {
    for (int i = 0; i <= maxRetries; i++) {
      try {
        final response = await http.get(Uri.parse(url), headers: headers).timeout(ApiConfig.timeout);
        if (response.statusCode < 500) return response;
        if (i < maxRetries) await Future.delayed(const Duration(seconds: 1));
      } catch (e) {
        if (i >= maxRetries) rethrow;
        await Future.delayed(const Duration(seconds: 1));
      }
    }
    throw Exception('Request failed after retries');
  }

  /// Handle API errors
  Exception _handleError(http.Response response) {
    if (response.statusCode == 401) {
      // Session expired - clear token and notify the app
      _storageService.removeToken();
      onSessionExpired?.call();
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
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.loginEndpoint}');

    try {
      final response = await http.post(
        url,
        headers: ApiConfig.headers(),
        body: json.encode({'email': email, 'password': password}),
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
    String countryCode = 'CM',
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.registerEndpoint}');

    final body = {
      'email': email,
      'password': password,
      'first_name': firstName,
      'last_name': lastName,
      'country_code': countryCode,
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
    final url = '${ApiConfig.baseUrl}${ApiConfig.profileEndpoint}';
    final headers = await _getAuthHeaders();

    try {
      final response = await _retryGet(url, headers: headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return User.fromJson(data);
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
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de mise à jour du profil: $e');
    }
  }

  /// Upload a KYC file (front, back, or selfie)
  Future<String> uploadKycFile({
    required String filePath,
    required String documentType,
    required String side,
  }) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/uploads/kyc');
    final token = await _storageService.getToken();

    final request = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer $token'
      ..fields['document_type'] = documentType
      ..fields['side'] = side
      ..files.add(await http.MultipartFile.fromPath('file', filePath));

    try {
      final streamedResponse = await request.send().timeout(ApiConfig.timeout);
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = json.decode(response.body);
        return data['file_url'] as String;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Erreur lors de l'upload du fichier: $e");
    }
  }

  /// Submit full KYC with personal info + document/selfie URLs
  Future<Map<String, dynamic>> submitKyc({
    required String dob,
    required String gender,
    required String address,
    required String street,
    required String city,
    required String postalCode,
    required String documentType,
    required String idProofNo,
    required String idProofExpiry,
    required String documentFrontUrl,
    String? documentBackUrl,
    required String selfieUrl,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.kycEndpoint}');
    final headers = await _getAuthHeaders();

    final body = {
      'dob': dob,
      'gender': gender,
      'address': address,
      'street': street,
      'city': city,
      'postal_code': postalCode,
      'document_type': documentType,
      'id_proof_no': idProofNo,
      'id_proof_expiry': idProofExpiry,
      'document_front_url': documentFrontUrl,
      if (documentBackUrl != null) 'document_back_url': documentBackUrl,
      'selfie_url': selfieUrl,
    };

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: json.encode(body),
      ).timeout(const Duration(seconds: 120)); // ML inference can be slow

      if (response.statusCode == 200 || response.statusCode == 201) {
        return json.decode(response.body) as Map<String, dynamic>;
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
    final url = '${ApiConfig.baseUrl}${ApiConfig.cardsEndpoint}/';
    final headers = await _getAuthHeaders();

    try {
      final response = await _retryGet(url, headers: headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final cardsList = data['cards'] as List;
        return cardsList.map((json) => VirtualCard.fromJson(json)).toList();
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
    final url = '${ApiConfig.baseUrl}${ApiConfig.cardsEndpoint}/$cardId';
    final headers = await _getAuthHeaders();

    try {
      final response = await _retryGet(url, headers: headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return VirtualCard.fromJson(data);
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

    final url = '${ApiConfig.baseUrl}$path?limit=$limit&offset=$offset';
    final headers = await _getAuthHeaders();

    try {
      final response = await _retryGet(url, headers: headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final transactionsList = data['transactions'] as List;
        return transactionsList.map((json) => Transaction.fromJson(json)).toList();
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
    String currency = 'XAF',
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
    String currency = 'XAF',
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
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de retrait: $e');
    }
  }

  /// Reveal card sensitive data (card number, CVV, expiry)
  Future<Map<String, dynamic>> revealCard(String cardId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.cardsEndpoint}/$cardId/reveal');
    final headers = await _getAuthHeaders();

    try {
      final response = await http.post(
        url,
        headers: headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'card_number': data['card_number'] as String,
          'cvv': data['cvv'] as String,
          'expiry_date': data['expiry_date'] as String,
        };
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de révélation de carte: $e');
    }
  }

  // ─── Wallet ────────────────────────────────────────────────

  /// Get wallet balance
  Future<double> getWalletBalance() async {
    final url = '${ApiConfig.baseUrl}${ApiConfig.walletBalanceEndpoint}';
    final headers = await _getAuthHeaders();

    try {
      final response = await _retryGet(url, headers: headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return (data['balance'] as num).toDouble();
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de récupération du solde wallet: $e');
    }
  }

  /// Get exchange rates for current user's country
  Future<Map<String, dynamic>> getExchangeRate() async {
    final url = '${ApiConfig.baseUrl}${ApiConfig.exchangeRateEndpoint}';
    final headers = await _getAuthHeaders();

    try {
      final response = await _retryGet(url, headers: headers);

      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de recuperation du taux de change: $e');
    }
  }

  /// Top up wallet via MoMo — specify amountUsd OR amountLocal
  Future<Map<String, dynamic>> topupWallet({
    double? amountUsd,
    double? amountLocal,
    required String paymentMethod,
    String? phone,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.walletTopupEndpoint}');
    final headers = await _getAuthHeaders();

    final body = <String, dynamic>{
      'payment_method': paymentMethod,
      if (amountUsd != null) 'amount_usd': amountUsd,
      if (amountLocal != null) 'amount_local': amountLocal,
      if (phone != null) 'phone': phone,
    };

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de recharge wallet: $e');
    }
  }

  /// Transfer from wallet to card
  Future<Map<String, dynamic>> transferToCard({
    required String cardId,
    required double amount,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.walletTransferEndpoint}');
    final headers = await _getAuthHeaders();

    final body = {
      'card_id': cardId,
      'amount': amount,
    };

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de transfert vers carte: $e');
    }
  }

  /// Withdraw from wallet to MoMo — amount in USD
  Future<Map<String, dynamic>> withdrawFromWallet({
    required double amountUsd,
    required String phone,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.walletWithdrawEndpoint}');
    final headers = await _getAuthHeaders();

    final body = {
      'amount_usd': amountUsd,
      'phone': phone,
    };

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de retrait wallet: $e');
    }
  }

  /// Initiate a payment (Mobile Money via Payin or E-nkap)
  /// Returns {success, transaction_id, payment_reference, payment_url, message}
  Future<Map<String, dynamic>> initiatePayment({
    required String method,
    required double amount,
    required String cardId,
    String? phone,
    String? customerName,
    String? customerEmail,
    String? countryCode,
  }) async {
    final url = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.paymentInitiateEndpoint}');
    final headers = await _getAuthHeaders();

    final body = <String, dynamic>{
      'method': method,
      'amount': amount,
      'card_id': cardId,
    };
    if (phone != null) body['phone'] = phone;
    if (customerName != null) body['customer_name'] = customerName;
    if (customerEmail != null) body['customer_email'] = customerEmail;
    if (countryCode != null) body['country_code'] = countryCode;

    try {
      final response = await http.post(
        url,
        headers: headers,
        body: json.encode(body),
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200 || response.statusCode == 201) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur d\'initiation du paiement: $e');
    }
  }

  /// Check payment status
  Future<Map<String, dynamic>> getPaymentStatus(String transactionId) async {
    final url = '${ApiConfig.baseUrl}${ApiConfig.paymentStatusEndpoint}/$transactionId';
    final headers = await _getAuthHeaders();

    try {
      final response = await _retryGet(url, headers: headers, maxRetries: 1);

      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de vérification du paiement: $e');
    }
  }

  /// Get supported countries for Mobile Money (Payin)
  Future<List<Map<String, dynamic>>> getPaymentCountries() async {
    final url = '${ApiConfig.baseUrl}${ApiConfig.paymentCountriesEndpoint}';
    final headers = await _getAuthHeaders();

    try {
      final response = await _retryGet(url, headers: headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de récupération des pays: $e');
    }
  }

  /// Get notifications
  Future<List<Map<String, dynamic>>> getNotifications({int limit = 50, int offset = 0}) async {
    final url = '${ApiConfig.baseUrl}/notifications?limit=$limit&offset=$offset';
    final headers = await _getAuthHeaders();

    try {
      final response = await _retryGet(url, headers: headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data['notifications'] ?? []);
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de récupération des notifications: $e');
    }
  }

  /// Get unread notification count
  Future<int> getUnreadNotificationCount() async {
    final url = '${ApiConfig.baseUrl}/notifications/unread-count';
    final headers = await _getAuthHeaders();

    try {
      final response = await _retryGet(url, headers: headers);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['count'] ?? 0;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de récupération du compteur: $e');
    }
  }

  /// Mark notification as read
  Future<void> markNotificationRead(String notificationId) async {
    final url = Uri.parse('${ApiConfig.baseUrl}/notifications/$notificationId/read');
    final headers = await _getAuthHeaders();

    try {
      final response = await http.post(
        url,
        headers: headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        return;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de marquage de notification: $e');
    }
  }

  /// Mark all notifications as read
  Future<void> markAllNotificationsRead() async {
    final url = Uri.parse('${ApiConfig.baseUrl}/notifications/read-all');
    final headers = await _getAuthHeaders();

    try {
      final response = await http.post(
        url,
        headers: headers,
      ).timeout(ApiConfig.timeout);

      if (response.statusCode == 200) {
        return;
      } else {
        throw _handleError(response);
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception('Erreur de marquage des notifications: $e');
    }
  }
}
