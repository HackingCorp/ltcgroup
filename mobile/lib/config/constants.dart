/// Global Constants for LTC vCard App
class AppConstants {
  // App info
  static const String appName = 'LTC vCard';
  static const String appVersion = '0.1.0';

  // Storage keys
  static const String storageKeyToken = 'auth_token';
  static const String storageKeyUser = 'user_data';
  static const String storageKeyTheme = 'theme_mode';

  // Card types
  static const String cardTypeVisa = 'VISA';
  static const String cardTypeMastercard = 'MASTERCARD';

  // Card status
  static const String cardStatusActive = 'ACTIVE';
  static const String cardStatusFrozen = 'FROZEN';
  static const String cardStatusBlocked = 'BLOCKED';

  // Transaction types
  static const String transactionTypePurchase = 'PURCHASE';
  static const String transactionTypeTopup = 'TOPUP';
  static const String transactionTypeWithdrawal = 'WITHDRAWAL';
  static const String transactionTypeRefund = 'REFUND';

  // Transaction status
  static const String transactionStatusPending = 'PENDING';
  static const String transactionStatusSuccess = 'SUCCESS';
  static const String transactionStatusFailed = 'FAILED';

  // KYC status
  static const String kycStatusPending = 'PENDING';
  static const String kycStatusVerified = 'VERIFIED';
  static const String kycStatusRejected = 'REJECTED';

  // Currency
  static const String defaultCurrency = 'EUR';
  static const String currencySymbol = '€';

  // Validation
  static const int minPasswordLength = 8;
  static const int maxPasswordLength = 64;

  // Pagination
  static const int defaultPageSize = 20;

  // Card purchase
  static const double cardPurchaseFee = 5.0;
  static const double minTopupAmount = 10.0;
  static const double maxTopupAmount = 1000.0;
  static const double minWithdrawAmount = 10.0;
}
