/// Transaction model
class Transaction {
  final String id;
  final String cardId;
  final double amount;
  final String type; // PURCHASE, TOPUP, WITHDRAWAL, REFUND
  final String status; // PENDING, SUCCESS, FAILED
  final String? merchant;
  final DateTime createdAt;

  Transaction({
    required this.id,
    required this.cardId,
    required this.amount,
    required this.type,
    required this.status,
    this.merchant,
    required this.createdAt,
  });

  /// Check if transaction is credit (positive amount)
  bool get isCredit => amount > 0;

  /// Check if transaction is debit (negative amount)
  bool get isDebit => amount < 0;

  /// Get absolute amount
  double get absoluteAmount => amount.abs();

  /// Check if transaction is pending
  bool get isPending => status == 'PENDING';

  /// Check if transaction is successful
  bool get isSuccess => status == 'SUCCESS';

  /// Check if transaction is failed
  bool get isFailed => status == 'FAILED';

  /// Get transaction description
  String get description {
    if (merchant != null) {
      return merchant!;
    }
    switch (type) {
      case 'TOPUP':
        return 'Recharge';
      case 'WITHDRAWAL':
        return 'Retrait';
      case 'REFUND':
        return 'Remboursement';
      case 'PURCHASE':
      default:
        return 'Achat';
    }
  }

  /// Create Transaction from JSON
  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String,
      cardId: json['cardId'] as String,
      amount: (json['amount'] as num).toDouble(),
      type: json['type'] as String,
      status: json['status'] as String,
      merchant: json['merchant'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  /// Convert Transaction to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'cardId': cardId,
      'amount': amount,
      'type': type,
      'status': status,
      'merchant': merchant,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  /// Copy with method for updates
  Transaction copyWith({
    String? id,
    String? cardId,
    double? amount,
    String? type,
    String? status,
    String? merchant,
    DateTime? createdAt,
  }) {
    return Transaction(
      id: id ?? this.id,
      cardId: cardId ?? this.cardId,
      amount: amount ?? this.amount,
      type: type ?? this.type,
      status: status ?? this.status,
      merchant: merchant ?? this.merchant,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
