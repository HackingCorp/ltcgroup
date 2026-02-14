/// User model
class User {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phone;
  final String kycStatus; // PENDING, VERIFIED, REJECTED
  final DateTime createdAt;

  User({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phone,
    required this.kycStatus,
    required this.createdAt,
  });

  /// Full name getter
  String get fullName => '$firstName $lastName';

  /// Check if KYC is verified
  bool get isKycVerified => kycStatus == 'VERIFIED';

  /// Create User from JSON
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      phone: json['phone'] as String?,
      kycStatus: json['kycStatus'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  /// Convert User to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'phone': phone,
      'kycStatus': kycStatus,
      'createdAt': createdAt.toIso8601String(),
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
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      kycStatus: kycStatus ?? this.kycStatus,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
