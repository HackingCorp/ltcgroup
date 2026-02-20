import 'package:flutter/material.dart';
import '../models/card.dart';
import '../config/theme.dart';
import '../config/constants.dart';

/// Visual card widget displaying virtual card
class CardWidget extends StatelessWidget {
  final VirtualCard card;
  final VoidCallback? onTap;
  final bool showBalance;

  const CardWidget({
    super.key,
    required this.card,
    this.onTap,
    this.showBalance = true,
  });

  @override
  Widget build(BuildContext context) {
    // Determine gradient based on card type
    final gradient = card.type == AppConstants.cardTypeVisa
        ? const LinearGradient(
            colors: [Color(0xFF1A1F71), Color(0xFF2E3A8C)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          )
        : const LinearGradient(
            colors: [Color(0xFFEB001B), Color(0xFFF79E1B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          );

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        height: 200,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha:0.15),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Header: Card type and status
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  card.type,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(card.status),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _getStatusLabel(card.status),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),

            // Card number
            Text(
              card.maskedNumber,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.w500,
                letterSpacing: 2,
              ),
            ),

            // Footer: Expiry and Balance
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'EXPIRE',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 10,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      card.expiryFormatted,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                if (showBalance)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        'SOLDE',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: 10,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${card.balance.toStringAsFixed(2)} ${AppConstants.currencySymbol}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case AppConstants.cardStatusActive:
        return LTCColors.success;
      case AppConstants.cardStatusFrozen:
        return LTCColors.warning;
      case AppConstants.cardStatusBlocked:
        return LTCColors.error;
      default:
        return Colors.grey;
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case AppConstants.cardStatusActive:
        return 'ACTIVE';
      case AppConstants.cardStatusFrozen:
        return 'GELÉE';
      case AppConstants.cardStatusBlocked:
        return 'BLOQUÉE';
      default:
        return status;
    }
  }
}
