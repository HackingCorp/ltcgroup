import 'package:flutter/foundation.dart';

/// API Configuration for Kash Pay Backend
class ApiConfig {
  // TODO: Switch to production URL before release
  // Pass --dart-define=API_BASE_URL=https://api.ltcgroup.site/api/v1 for production builds
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.1.111:8000/api/v1',
  );

  // API Endpoints
  static const String loginEndpoint = '/auth/login';
  static const String registerEndpoint = '/auth/register';
  static const String cardsEndpoint = '/cards';
  static const String transactionsEndpoint = '/transactions';
  static const String topupEndpoint = '/transactions/topup';
  static const String withdrawEndpoint = '/transactions/withdraw';
  static const String notificationsEndpoint = '/notifications';
  static const String profileEndpoint = '/users/me';
  static const String kycEndpoint = '/users/kyc';

  // Payment endpoints
  static const String paymentInitiateEndpoint = '/payments/initiate';
  static const String paymentStatusEndpoint = '/payments/status';
  static const String paymentCountriesEndpoint = '/payments/countries';

  // Wallet endpoints
  static const String walletBalanceEndpoint = '/wallet/balance';
  static const String walletTopupEndpoint = '/wallet/topup';
  static const String walletTransferEndpoint = '/wallet/transfer-to-card';
  static const String walletWithdrawEndpoint = '/wallet/withdraw';
  static const String exchangeRateEndpoint = '/wallet/exchange-rate';

  // Timeout duration
  static const Duration timeout = Duration(seconds: 30);
  static const Duration uploadTimeout = Duration(seconds: 60);

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
