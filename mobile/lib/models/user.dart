double _parseDouble(dynamic value) {
  if (value == null) return 0.0;
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value) ?? 0.0;
  return 0.0;
}

/// User model
class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phone;
  final String kycStatus; // PENDING, VERIFIED, REJECTED
  final double walletBalance;
  final String countryCode;
  final String? localCurrency;
  final DateTime createdAt;

  User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phone,
    required this.kycStatus,
    this.walletBalance = 0.0,
    this.countryCode = 'CM',
    this.localCurrency,
    required this.createdAt,
  });

  /// Full name getter
  String get fullName => '$firstName $lastName';

  /// Check if KYC is verified
  bool get isKycVerified => kycStatus == 'APPROVED' || kycStatus == 'VERIFIED';

  /// Create User from JSON
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: json['first_name'] as String,
      lastName: json['last_name'] as String,
      phone: json['phone'] as String?,
      kycStatus: json['kyc_status'] as String,
      walletBalance: _parseDouble(json['wallet_balance']),
      countryCode: json['country_code'] as String? ?? 'CM',
      localCurrency: json['local_currency'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  /// Convert User to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'first_name': firstName,
      'last_name': lastName,
      'phone': phone,
      'kyc_status': kycStatus,
      'wallet_balance': walletBalance,
      'country_code': countryCode,
      'local_currency': localCurrency,
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// Copy with method for updates
  User copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? phone,
    String? kycStatus,
    double? walletBalance,
    String? countryCode,
    String? localCurrency,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      kycStatus: kycStatus ?? this.kycStatus,
      walletBalance: walletBalance ?? this.walletBalance,
      countryCode: countryCode ?? this.countryCode,
      localCurrency: localCurrency ?? this.localCurrency,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
