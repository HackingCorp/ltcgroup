import 'package:flutter/material.dart';

/// Success modal shown after a virtual card is created.
/// Displays an animated checkmark, card preview, and action buttons.
class CardSuccessDialog extends StatefulWidget {
  final String holderName;
  final String maskedNumber;
  final String cardType; // VISA or MASTERCARD
  final VoidCallback onViewCard;
  final VoidCallback onGoHome;

  const CardSuccessDialog({
    super.key,
    required this.holderName,
    required this.maskedNumber,
    this.cardType = 'VISA',
    required this.onViewCard,
    required this.onGoHome,
  });

  @override
  State<CardSuccessDialog> createState() => _CardSuccessDialogState();

  /// Show as a fullscreen modal overlay.
  static Future<void> show(
    BuildContext context, {
    required String holderName,
    required String maskedNumber,
    String cardType = 'VISA',
    VoidCallback? onViewCard,
    VoidCallback? onGoHome,
  }) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.transparent,
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (context, anim1, anim2) {
        return CardSuccessDialog(
          holderName: holderName,
          maskedNumber: maskedNumber,
          cardType: cardType,
          onViewCard: onViewCard ?? () => Navigator.of(context).pop(),
          onGoHome: onGoHome ?? () => Navigator.of(context).pop(),
        );
      },
    );
  }
}

class _CardSuccessDialogState extends State<CardSuccessDialog>
    with TickerProviderStateMixin {
  static const _primaryBlue = Color(0xFF2B2BEE);
  static const _successGreen = Color(0xFF10B981);

  late final AnimationController _backdropController;
  late final AnimationController _modalController;
  late final AnimationController _checkController;
  late final AnimationController _pulseController;

  late final Animation<double> _backdropAnim;
  late final Animation<double> _modalScale;
  late final Animation<double> _checkScale;

  @override
  void initState() {
    super.initState();

    _backdropController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _backdropAnim = CurvedAnimation(
      parent: _backdropController,
      curve: Curves.easeOut,
    );

    _modalController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _modalScale = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(parent: _modalController, curve: Curves.elasticOut),
    );

    _checkController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _checkScale = CurvedAnimation(
      parent: _checkController,
      curve: const Interval(0.0, 1.0, curve: Curves.elasticOut),
    );

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    // Sequence
    _backdropController.forward();
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) _modalController.forward();
    });
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) {
        _checkController.forward();
        _pulseController.repeat();
      }
    });
  }

  @override
  void dispose() {
    _backdropController.dispose();
    _modalController.dispose();
    _checkController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Stack(
        children: [
          // Blurred backdrop
          AnimatedBuilder(
            animation: _backdropAnim,
            builder: (context, child) {
              return Container(
                color:
                    Colors.black.withValues(alpha: 0.3 * _backdropAnim.value),
              );
            },
          ),
          // Modal
          Center(
            child: AnimatedBuilder(
              animation: _modalController,
              builder: (context, child) {
                return Opacity(
                  opacity: _modalController.value.clamp(0.0, 1.0),
                  child: Transform.scale(
                    scale: _modalScale.value,
                    child: child,
                  ),
                );
              },
              child: _buildModal(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModal() {
    return Container(
      width: 340,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.15),
            blurRadius: 40,
            offset: const Offset(0, 20),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildCheckIcon(),
            const SizedBox(height: 20),
            const Text(
              'Carte créée avec succès!',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Votre carte virtuelle LTC Pay est prête.',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[500],
              ),
            ),
            const SizedBox(height: 28),
            _buildCardPreview(),
            const SizedBox(height: 28),
            _buildActions(),
          ],
        ),
      ),
    );
  }

  Widget _buildCheckIcon() {
    return ScaleTransition(
      scale: _checkScale,
      child: SizedBox(
        width: 80,
        height: 80,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Pulse ring
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                return Opacity(
                  opacity: (1 - _pulseController.value) * 0.3,
                  child: Transform.scale(
                    scale: 1 + _pulseController.value * 0.5,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _successGreen.withValues(alpha: 0.15),
                      ),
                    ),
                  ),
                );
              },
            ),
            // Background
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _successGreen.withValues(alpha: 0.1),
              ),
            ),
            // Icon
            const Icon(
              Icons.check_circle_rounded,
              size: 50,
              color: _successGreen,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCardPreview() {
    final last4 = widget.maskedNumber.length >= 4
        ? widget.maskedNumber.substring(widget.maskedNumber.length - 4)
        : widget.maskedNumber;

    return AspectRatio(
      aspectRatio: 1.586,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [_primaryBlue, Color(0xFF1A1AB8)],
          ),
          boxShadow: [
            BoxShadow(
              color: _primaryBlue.withValues(alpha: 0.3),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Decorative circles
            Positioned(
              top: -40,
              right: -40,
              child: Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.05),
                ),
              ),
            ),
            Positioned(
              bottom: -20,
              left: -20,
              child: Container(
                width: 90,
                height: 90,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.1),
                ),
              ),
            ),
            // Card content
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Top: Chip + Brand
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Chip
                      Container(
                        width: 36,
                        height: 28,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(4),
                          gradient: const LinearGradient(
                            colors: [Color(0xFFFFD700), Color(0xFFF0C060)],
                          ),
                        ),
                        child: Center(
                          child: Container(
                            width: 16,
                            height: 12,
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: const Color(0xFFDAA520),
                                width: 0.5,
                              ),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ),
                      ),
                      Text(
                        'LTC Pay',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Colors.white.withValues(alpha: 0.9),
                          letterSpacing: 1,
                        ),
                      ),
                    ],
                  ),
                  // Middle: Masked number
                  Row(
                    children: [
                      for (int i = 0; i < 3; i++) ...[
                        Text(
                          '••••',
                          style: TextStyle(
                            fontSize: 16,
                            letterSpacing: 2,
                            color: Colors.white.withValues(alpha: 0.6),
                          ),
                        ),
                        const SizedBox(width: 12),
                      ],
                      Text(
                        last4,
                        style: const TextStyle(
                          fontSize: 16,
                          fontFamily: 'monospace',
                          fontWeight: FontWeight.w500,
                          letterSpacing: 2,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                  // Bottom: Holder + Network
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'TITULAIRE',
                            style: TextStyle(
                              fontSize: 8,
                              fontWeight: FontWeight.w600,
                              color: Colors.white.withValues(alpha: 0.5),
                              letterSpacing: 1,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.holderName.toUpperCase(),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Colors.white,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      _buildNetworkLogo(),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNetworkLogo() {
    if (widget.cardType == 'MASTERCARD') {
      return SizedBox(
        width: 40,
        height: 26,
        child: Stack(
          children: [
            Positioned(
              left: 0,
              child: Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFEB001B).withValues(alpha: 0.9),
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
                  color: const Color(0xFFF79E1B).withValues(alpha: 0.9),
                ),
              ),
            ),
          ],
        ),
      );
    }
    return Text(
      'VISA',
      style: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        fontStyle: FontStyle.italic,
        color: Colors.white.withValues(alpha: 0.9),
        letterSpacing: -0.5,
      ),
    );
  }

  Widget _buildActions() {
    return Column(
      children: [
        GestureDetector(
          onTap: widget.onViewCard,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: _primaryBlue,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: _primaryBlue.withValues(alpha: 0.2),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Voir ma carte',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
                SizedBox(width: 6),
                Icon(Icons.arrow_forward_rounded,
                    color: Colors.white, size: 18),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: widget.onGoHome,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'Retour à l\'accueil',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.grey[500],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
