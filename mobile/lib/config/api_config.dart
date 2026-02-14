/// API Configuration for LTC vCard Backend
class ApiConfig {
  // Base URL for API
  static const String baseUrl = 'http://localhost:8000/api/v1';

  // API Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String registerEndpoint = '/auth/register';
  static const String cardsEndpoint = '/cards';
  static const String transactionsEndpoint = '/transactions';
  static const String topupEndpoint = '/cards/topup';
  static const String withdrawEndpoint = '/cards/withdraw';
  static const String notificationsEndpoint = '/notifications';
  static const String profileEndpoint = '/users/me';

  // Timeout duration
  static const Duration timeout = Duration(seconds: 30);

  // Headers
  static Map<String, String> headers({String? token}) {
    final Map<String, String> defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token != null) {
      defaultHeaders['Authorization'] = 'Bearer $token';
    }

    return defaultHeaders;
  }
}
