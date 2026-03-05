/// Transaction model
class Transaction {
  final String id;
  final String? cardId;
  final double amount;
  final String type; // PURCHASE, TOPUP, WITHDRAWAL, REFUND, WALLET_TOPUP, WALLET_TO_CARD, WALLET_WITHDRAWAL
  final String status; // PENDING, SUCCESS, FAILED
  final String currency;
  final String? merchant;
  final DateTime createdAt;

  Transaction({
    required this.id,
    this.cardId,
    required this.amount,
    required this.type,
    required this.status,
    this.currency = 'USD',
    this.merchant,
    required this.createdAt,
  });

  /// Debit types: money leaves the user's wallet or card
  static const _debitTypes = {
    'PURCHASE',
    'TOPUP',         // wallet → card (debit from wallet)
    'WALLET_TO_CARD',
    'WALLET_WITHDRAWAL',
  };

  /// Check if transaction is credit (money received)
  bool get isCredit => !_debitTypes.contains(type);

  /// Check if transaction is debit (money spent)
  bool get isDebit => _debitTypes.contains(type);

  /// Get absolute amount
  double get absoluteAmount => amount.abs();

  /// Check if transaction is pending
  bool get isPending => status == 'PENDING';

  /// Check if transaction is successful
  bool get isSuccess => status == 'COMPLETED';

  /// Check if transaction is failed
  bool get isFailed => status == 'FAILED';

  /// Get transaction description
  String get description {
    if (merchant != null) {
      return merchant!;
    }
    switch (type) {
      case 'TOPUP':
        return 'Recharge carte';
      case 'WITHDRAWAL':
        return 'Retrait carte';
      case 'WALLET_TOPUP':
        return 'Recharge wallet';
      case 'WALLET_TO_CARD':
        return 'Wallet → Carte';
      case 'WALLET_WITHDRAWAL':
        return 'Retrait wallet';
      case 'REFUND':
        return 'Remboursement';
      case 'PURCHASE':
      default:
        return 'Achat';
    }
  }

  /// Create Transaction from JSON
  factory Transaction.fromJson(Map<String, dynamic> json) {
    // amount may be a number or a Decimal string from the backend
    final rawAmount = json['amount'];
    final amount = rawAmount is num
        ? rawAmount.toDouble()
        : double.tryParse(rawAmount.toString()) ?? 0.0;

    return Transaction(
      id: json['id'] as String,
      cardId: json['card_id'] as String?,
      amount: amount,
      type: json['transaction_type'] as String? ?? json['type'] as String,
      status: json['status'] as String,
      currency: json['currency'] as String? ?? 'USD',
      merchant: json['merchant'] as String? ?? json['description'] as String?,
      createdAt: _parseUtcDate(json['created_at'] as String),
    );
  }

  /// Parse date string ensuring UTC — dates without timezone suffix are treated as UTC
  static DateTime _parseUtcDate(String dateStr) {
    final dt = DateTime.parse(dateStr);
    return dt.isUtc ? dt : DateTime.utc(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second, dt.millisecond, dt.microsecond);
  }

  /// Convert Transaction to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'card_id': cardId,
      'amount': amount,
      'transaction_type': type,
      'status': status,
      'currency': currency,
      'merchant': merchant,
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// Copy with method for updates
  Transaction copyWith({
    String? id,
    String? cardId,
    double? amount,
    String? type,
    String? status,
    String? currency,
    String? merchant,
    DateTime? createdAt,
  }) {
    return Transaction(
      id: id ?? this.id,
      cardId: cardId ?? this.cardId,
      amount: amount ?? this.amount,
      type: type ?? this.type,
      status: status ?? this.status,
      currency: currency ?? this.currency,
      merchant: merchant ?? this.merchant,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
