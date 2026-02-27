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
  static const String transactionTypeWalletTopup = 'WALLET_TOPUP';
  static const String transactionTypeWalletToCard = 'WALLET_TO_CARD';
  static const String transactionTypeWalletWithdrawal = 'WALLET_WITHDRAWAL';

  // Transaction status
  static const String transactionStatusPending = 'PENDING';
  static const String transactionStatusSuccess = 'SUCCESS';
  static const String transactionStatusFailed = 'FAILED';

  // KYC status
  static const String kycStatusPending = 'PENDING';
  static const String kycStatusVerified = 'VERIFIED';
  static const String kycStatusRejected = 'REJECTED';

  // Currency — wallet and cards are in USD
  static const String defaultCurrency = 'USD';
  static const String currencySymbol = '\$';

  // Validation
  static const int minPasswordLength = 8;
  static const int maxPasswordLength = 64;

  // Pagination
  static const int defaultPageSize = 20;

  // Card purchase
  static const double cardPurchaseFee = 5.0;
  static const double minTopupAmount = 1.0;
  static const double maxTopupAmount = 10000.0;
  static const double minWithdrawAmount = 1.0;

  // Wallet fees
  static const double walletTransferFeeRate = 0.02; // 2% for wallet→card

  // 18 supported countries
  static const Map<String, Map<String, String>> supportedCountries = {
    'CM': {'name': 'Cameroun', 'flag': '\u{1F1E8}\u{1F1F2}', 'phone': '+237', 'currency': 'XAF'},
    'KE': {'name': 'Kenya', 'flag': '\u{1F1F0}\u{1F1EA}', 'phone': '+254', 'currency': 'KES'},
    'GA': {'name': 'Gabon', 'flag': '\u{1F1EC}\u{1F1E6}', 'phone': '+241', 'currency': 'XAF'},
    'CD': {'name': 'Congo DRC', 'flag': '\u{1F1E8}\u{1F1E9}', 'phone': '+243', 'currency': 'CDF'},
    'SN': {'name': 'Senegal', 'flag': '\u{1F1F8}\u{1F1F3}', 'phone': '+221', 'currency': 'XOF'},
    'CI': {'name': "Cote d'Ivoire", 'flag': '\u{1F1E8}\u{1F1EE}', 'phone': '+225', 'currency': 'XOF'},
    'BF': {'name': 'Burkina Faso', 'flag': '\u{1F1E7}\u{1F1EB}', 'phone': '+226', 'currency': 'XOF'},
    'ML': {'name': 'Mali', 'flag': '\u{1F1F2}\u{1F1F1}', 'phone': '+223', 'currency': 'XOF'},
    'BJ': {'name': 'Benin', 'flag': '\u{1F1E7}\u{1F1EF}', 'phone': '+229', 'currency': 'XOF'},
    'TG': {'name': 'Togo', 'flag': '\u{1F1F9}\u{1F1EC}', 'phone': '+228', 'currency': 'XOF'},
    'TZ': {'name': 'Tanzania', 'flag': '\u{1F1F9}\u{1F1FF}', 'phone': '+255', 'currency': 'TZS'},
    'UG': {'name': 'Uganda', 'flag': '\u{1F1FA}\u{1F1EC}', 'phone': '+256', 'currency': 'UGX'},
    'NG': {'name': 'Nigeria', 'flag': '\u{1F1F3}\u{1F1EC}', 'phone': '+234', 'currency': 'NGN'},
    'NE': {'name': 'Niger', 'flag': '\u{1F1F3}\u{1F1EA}', 'phone': '+227', 'currency': 'XOF'},
    'RW': {'name': 'Rwanda', 'flag': '\u{1F1F7}\u{1F1FC}', 'phone': '+250', 'currency': 'RWF'},
    'CG': {'name': 'Congo Brazzaville', 'flag': '\u{1F1E8}\u{1F1EC}', 'phone': '+242', 'currency': 'XAF'},
    'GN': {'name': 'Guinea Conakry', 'flag': '\u{1F1EC}\u{1F1F3}', 'phone': '+224', 'currency': 'GNF'},
    'GH': {'name': 'Ghana', 'flag': '\u{1F1EC}\u{1F1ED}', 'phone': '+233', 'currency': 'GHS'},
  };
}
