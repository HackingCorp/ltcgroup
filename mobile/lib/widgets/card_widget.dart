import 'package:flutter/material.dart';
import '../models/card.dart';
import '../config/theme.dart';

/// Returns the gradient colors for a card tier.
List<Color> getCardTierColors(String tier) {
  switch (tier) {
    case 'PREMIUM':
      return [LTCColors.cardPurple1, LTCColors.cardPurple2, LTCColors.cardPurple3];
    case 'GOLD':
      return [LTCColors.cardGold1, LTCColors.cardGold2, LTCColors.cardGold3];
    default: // STANDARD
      return [LTCColors.cardBlue1, LTCColors.cardBlue2, LTCColors.cardBlue3];
  }
}

/// Returns the LinearGradient for a card tier.
LinearGradient getCardTierGradient(String tier) {
  return LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: getCardTierColors(tier),
  );
}

/// Returns the glow color for a card tier (for background effects).
Color getCardTierGlow(String tier) {
  switch (tier) {
    case 'PREMIUM':
      return LTCColors.cardPurple2;
    case 'GOLD':
      return LTCColors.gold;
    default:
      return LTCColors.cardBlue2;
  }
}

/// Returns the tier display name.
String getCardTierLabel(String tier) {
  switch (tier) {
    case 'PREMIUM':
      return 'PREMIUM';
    case 'GOLD':
      return 'GOLD';
    default:
      return 'STANDARD';
  }
}

/// Returns the full label for a card (e.g. "VISA Standard", "Gold Contactless").
String getCardLabel(VirtualCard card) {
  switch (card.tier) {
    case 'PREMIUM':
      return 'VISA Premium';
    case 'GOLD':
      return 'Gold Contactless';
    default:
      return 'VISA Standard';
  }
}

/// Visual card widget — tier-based gradient, modern fintech design.
///
/// Layout:
/// ┌──────────────────────────────────┐
/// │  STANDARD              ● Active  │
/// │  ▣ (chip)                        │
/// │                                  │
/// │  Solde disponible                │
/// │  $1.00                           │
/// │                                  │
/// │  **** **** **** 5346             │
/// │  TITULAIRE       EXPIRE    VISA  │
/// │  NOM COMPLET     03/29           │
/// └──────────────────────────────────┘
class CardWidget extends StatelessWidget {
  final VirtualCard card;
  final VoidCallback? onTap;
  final bool showBalance;
  final String? holderName;

  const CardWidget({
    super.key,
    required this.card,
    this.onTap,
    this.showBalance = true,
    this.holderName,
  });

  @override
  Widget build(BuildContext context) {
    final tierColors = getCardTierColors(card.tier);
    final gradient = getCardTierGradient(card.tier);

    return Semantics(
      label: '${getCardTierLabel(card.tier)} ${card.type} card, balance \$${card.balance.toStringAsFixed(2)}, ${card.isActive ? "active" : card.isFrozen ? "frozen" : "blocked"}',
      button: onTap != null,
      child: GestureDetector(
      onTap: onTap,
      child: AspectRatio(
        aspectRatio: 1.586,
        child: Container(
          width: double.infinity,
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: gradient,
            boxShadow: [
              BoxShadow(
                color: tierColors[1].withValues(alpha: 0.35),
                blurRadius: 30,
                offset: const Offset(0, 16),
                spreadRadius: -8,
              ),
            ],
          ),
          child: Stack(
            children: [
              // ── Decorative circles ──
              Positioned(
                top: -50,
                right: -50,
                child: Container(
                  width: 180,
                  height: 180,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.07),
                  ),
                ),
              ),
              Positioned(
                bottom: -30,
                left: -30,
                child: Container(
                  width: 140,
                  height: 140,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.black.withValues(alpha: 0.12),
                  ),
                ),
              ),
              // ── Glass border overlay ──
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.12),
                  ),
                ),
              ),

              // ── Content ──
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Row 1: Tier label + Status badge ──
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          getCardTierLabel(card.tier),
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.8),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 2.5,
                          ),
                        ),
                        _buildStatusBadge(),
                      ],
                    ),

                    const SizedBox(height: 8),

                    // ── Row 2: EMV Chip ──
                    _buildChip(),

                    const Spacer(),

                    // ── Balance ──
                    if (showBalance) ...[
                      Text(
                        '\$${card.balance.toStringAsFixed(2)}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                    ],

                    // ── Card number ──
                    Text(
                      _formatCardNumber(card.maskedNumber),
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        letterSpacing: 2.5,
                        fontFamily: 'monospace',
                      ),
                    ),

                    const SizedBox(height: 12),

                    // ── Row bottom: Holder + Expiry + Logo ──
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        // Holder name
                        if (holderName != null)
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'TITULAIRE',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.45),
                                    fontSize: 8,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 1.5,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  holderName!,
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.9),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 0.5,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        // Expiry
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Text(
                              'EXPIRE',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.45),
                                fontSize: 8,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 1.5,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              card.expiryFormatted,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.9),
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(width: 24),
                        // Card network logo (bottom right)
                        _buildCardLogo(),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ),
    );
  }

  // ── EMV Chip ──
  Widget _buildChip() {
    final c = Colors.white.withValues(alpha: 0.35);
    return Container(
      width: 42,
      height: 30,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(5),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withValues(alpha: 0.25),
            Colors.white.withValues(alpha: 0.10),
          ],
        ),
        border: Border.all(color: c, width: 0.5),
      ),
      child: Stack(
        children: [
          // Horizontal lines
          Positioned(top: 9, left: 0, right: 0, child: Container(height: 0.5, color: c)),
          Positioned(bottom: 9, left: 0, right: 0, child: Container(height: 0.5, color: c)),
          // Vertical line
          Positioned(left: 14, top: 0, bottom: 0, child: Container(width: 0.5, color: c)),
          // Center rectangle
          Center(
            child: Container(
              width: 24,
              height: 16,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(2),
                border: Border.all(color: c, width: 0.5),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Status badge ──
  Widget _buildStatusBadge() {
    Color bgColor;
    Color textColor;
    String label;
    IconData? icon;

    if (card.isFrozen) {
      bgColor = Colors.white.withValues(alpha: 0.15);
      textColor = LTCColors.warning;
      label = 'Gelee';
      icon = Icons.ac_unit_rounded;
    } else if (card.isBlocked) {
      bgColor = Colors.white.withValues(alpha: 0.15);
      textColor = LTCColors.error;
      label = 'Bloquee';
      icon = Icons.block_rounded;
    } else {
      bgColor = Colors.white.withValues(alpha: 0.15);
      textColor = LTCColors.success;
      label = 'Active';
      icon = null;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 11, color: textColor),
            const SizedBox(width: 4),
          ] else ...[
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: textColor,
              ),
            ),
            const SizedBox(width: 5),
          ],
          Text(
            label,
            style: TextStyle(
              color: textColor,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  // ── Card network logo (VISA / Mastercard) ──
  Widget _buildCardLogo() {
    if (card.type == 'VISA') {
      return Text(
        'VISA',
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.85),
          fontSize: 20,
          fontWeight: FontWeight.bold,
          fontStyle: FontStyle.italic,
          letterSpacing: 2,
        ),
      );
    } else if (card.type == 'MASTERCARD') {
      return SizedBox(
        width: 40,
        height: 26,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Positioned(
              left: 0,
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.red.withValues(alpha: 0.7),
                ),
              ),
            ),
            Positioned(
              right: 0,
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.orange.withValues(alpha: 0.7),
                ),
              ),
            ),
          ],
        ),
      );
    }
    return Icon(
      Icons.contactless_rounded,
      color: Colors.white.withValues(alpha: 0.8),
      size: 26,
    );
  }

  /// Format masked number with spaces every 4 chars.
  String _formatCardNumber(String masked) {
    final clean = masked.replaceAll(' ', '');
    final buffer = StringBuffer();
    for (int i = 0; i < clean.length; i++) {
      if (i > 0 && i % 4 == 0) buffer.write('  ');
      buffer.write(clean[i]);
    }
    return buffer.toString();
  }
}
