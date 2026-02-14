/// Virtual Card model
class VirtualCard {
  final String id;
  final String type; // VISA, MASTERCARD
  final double balance;
  final String status; // ACTIVE, FROZEN, BLOCKED
  final String maskedNumber; // **** **** **** 1234
  final String currency; // EUR
  final DateTime expiryDate;
  final DateTime createdAt;

  VirtualCard({
    required this.id,
    required this.type,
    required this.balance,
    required this.status,
    required this.maskedNumber,
    required this.currency,
    required this.expiryDate,
    required this.createdAt,
  });

  /// Check if card is active
  bool get isActive => status == 'ACTIVE';

  /// Check if card is frozen
  bool get isFrozen => status == 'FROZEN';

  /// Check if card is blocked
  bool get isBlocked => status == 'BLOCKED';

  /// Get card expiry in MM/YY format
  String get expiryFormatted {
    final month = expiryDate.month.toString().padLeft(2, '0');
    final year = expiryDate.year.toString().substring(2);
    return '$month/$year';
  }

  /// Create VirtualCard from JSON
  factory VirtualCard.fromJson(Map<String, dynamic> json) {
    return VirtualCard(
      id: json['id'] as String,
      type: json['type'] as String,
      balance: (json['balance'] as num).toDouble(),
      status: json['status'] as String,
      maskedNumber: json['maskedNumber'] as String,
      currency: json['currency'] as String,
      expiryDate: DateTime.parse(json['expiryDate'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  /// Convert VirtualCard to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type,
      'balance': balance,
      'status': status,
      'maskedNumber': maskedNumber,
      'currency': currency,
      'expiryDate': expiryDate.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
    };
  }

  /// Copy with method for updates
  VirtualCard copyWith({
    String? id,
    String? type,
    double? balance,
    String? status,
    String? maskedNumber,
    String? currency,
    DateTime? expiryDate,
    DateTime? createdAt,
  }) {
    return VirtualCard(
      id: id ?? this.id,
      type: type ?? this.type,
      balance: balance ?? this.balance,
      status: status ?? this.status,
      maskedNumber: maskedNumber ?? this.maskedNumber,
      currency: currency ?? this.currency,
      expiryDate: expiryDate ?? this.expiryDate,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
