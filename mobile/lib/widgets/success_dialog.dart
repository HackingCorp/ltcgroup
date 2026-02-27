import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../config/theme.dart';

/// Success confirmation dialog matching Kash Pay design.
/// Shows after a successful topup/purchase with spring animation.
class SuccessDialog extends StatefulWidget {
  final String title;
  final String subtitle;
  final List<SuccessDialogDetail> details;
  final String primaryButtonText;
  final String? secondaryButtonText;
  final VoidCallback onPrimaryPressed;
  final VoidCallback? onSecondaryPressed;

  const SuccessDialog({
    super.key,
    required this.title,
    required this.subtitle,
    required this.details,
    this.primaryButtonText = 'Terminer',
    this.secondaryButtonText,
    required this.onPrimaryPressed,
    this.onSecondaryPressed,
  });

  @override
  State<SuccessDialog> createState() => _SuccessDialogState();

  /// Show as a modal dialog over the current screen.
  static Future<void> show(
    BuildContext context, {
    required String title,
    required String subtitle,
    required List<SuccessDialogDetail> details,
    String primaryButtonText = 'Terminer',
    String? secondaryButtonText,
    VoidCallback? onSecondaryPressed,
  }) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.transparent,
      transitionDuration: const Duration(milliseconds: 400),
      pageBuilder: (context, anim1, anim2) {
        return SuccessDialog(
          title: title,
          subtitle: subtitle,
          details: details,
          primaryButtonText: primaryButtonText,
          secondaryButtonText: secondaryButtonText,
          onPrimaryPressed: () => Navigator.of(context).pop(),
          onSecondaryPressed: onSecondaryPressed,
        );
      },
    );
  }

  /// Convenience for topup success.
  static Future<void> showTopupSuccess(
    BuildContext context, {
    required double amount,
    required double newBalance,
  }) {
    final fmt = NumberFormat('#,##0.00', 'en_US');
    return show(
      context,
      title: 'Recharge réussie !',
      subtitle: 'Votre carte virtuelle a été rechargée instantanément.',
      details: [
        SuccessDialogDetail(
          label: 'Montant rechargé',
          value: '\$${fmt.format(amount)}',
        ),
        SuccessDialogDetail(
          label: 'Nouveau solde',
          value: '\$${fmt.format(newBalance)}',
          isPrimary: true,
        ),
      ],
      secondaryButtonText: 'Voir le reçu',
    );
  }

  /// Convenience for purchase success.
  static Future<void> showPurchaseSuccess(
    BuildContext context, {
    required String cardType,
    required double balance,
  }) {
    final fmt = NumberFormat('#,##0.00', 'en_US');
    return show(
      context,
      title: 'Carte créée !',
      subtitle: 'Votre nouvelle carte virtuelle est prête à utiliser.',
      details: [
        SuccessDialogDetail(
          label: 'Type de carte',
          value: cardType,
        ),
        SuccessDialogDetail(
          label: 'Solde initial',
          value: '\$${fmt.format(balance)}',
          isPrimary: true,
        ),
      ],
    );
  }
}

class _SuccessDialogState extends State<SuccessDialog>
    with TickerProviderStateMixin {

  late final AnimationController _backdropController;
  late final AnimationController _modalController;
  late final AnimationController _checkController;
  late final AnimationController _pingController;

  late final Animation<double> _backdropAnim;
  late final Animation<double> _modalScale;
  late final Animation<double> _modalSlide;
  late final Animation<double> _checkScale;

  @override
  void initState() {
    super.initState();

    // Backdrop fade
    _backdropController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _backdropAnim = CurvedAnimation(
      parent: _backdropController,
      curve: Curves.easeOut,
    );

    // Modal spring up
    _modalController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _modalScale = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(
        parent: _modalController,
        curve: Curves.elasticOut,
      ),
    );
    _modalSlide = Tween<double>(begin: 20, end: 0).animate(
      CurvedAnimation(
        parent: _modalController,
        curve: Curves.elasticOut,
      ),
    );

    // Checkmark scale
    _checkController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _checkScale = CurvedAnimation(
      parent: _checkController,
      curve: Curves.easeOut,
    );

    // Ping ring
    _pingController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    // Start sequence
    _backdropController.forward();
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) _modalController.forward();
    });
    Future.delayed(const Duration(milliseconds: 300), () {
      if (mounted) {
        _checkController.forward();
        _pingController.repeat();
      }
    });
  }

  @override
  void dispose() {
    _backdropController.dispose();
    _modalController.dispose();
    _checkController.dispose();
    _pingController.dispose();
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
                color: Colors.black
                    .withValues(alpha: 0.4 * _backdropAnim.value),
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
                  child: Transform.translate(
                    offset: Offset(0, _modalSlide.value),
                    child: Transform.scale(
                      scale: _modalScale.value,
                      child: child,
                    ),
                  ),
                );
              },
              child: _buildModalCard(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModalCard() {
    return Container(
      width: 340,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: LTCColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 40,
            offset: const Offset(0, 20),
            spreadRadius: -5,
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
            spreadRadius: -5,
          ),
        ],
      ),
      child: Stack(
        children: [
          // Top gold gradient line
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: Container(
              height: 3,
              decoration: BoxDecoration(
                borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(32)),
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    LTCColors.success.withValues(alpha: 0.5),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildCheckmark(),
                const SizedBox(height: 24),
                Text(
                  widget.title,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: LTCColors.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.subtitle,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: LTCColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 32),
                _buildDetailsBlock(),
                const SizedBox(height: 32),
                _buildActions(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckmark() {
    return ScaleTransition(
      scale: _checkScale,
      child: SizedBox(
        width: 80,
        height: 80,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Ping ring
            AnimatedBuilder(
              animation: _pingController,
              builder: (context, child) {
                return Opacity(
                  opacity: (1 - _pingController.value) * 0.2,
                  child: Transform.scale(
                    scale: 1 + _pingController.value * 0.5,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: LTCColors.success,
                      ),
                    ),
                  ),
                );
              },
            ),
            // Background circle
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: LTCColors.success.withValues(alpha: 0.1),
              ),
            ),
            // Check icon
            const Icon(
              Icons.check_rounded,
              size: 48,
              color: LTCColors.success,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailsBlock() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: LTCColors.surfaceLight,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: LTCColors.border),
      ),
      child: Column(
        children: [
          for (int i = 0; i < widget.details.length; i++) ...[
            if (i > 0) ...[
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: CustomPaint(
                  size: const Size(double.infinity, 1),
                  painter: _DashedLinePainter(
                    color: LTCColors.border,
                  ),
                ),
              ),
            ],
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  widget.details[i].label,
                  style: const TextStyle(
                    fontSize: 14,
                    color: LTCColors.textSecondary,
                  ),
                ),
                Text(
                  widget.details[i].value,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: widget.details[i].isPrimary
                        ? LTCColors.gold
                        : LTCColors.textPrimary,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildActions() {
    return Column(
      children: [
        // Primary button
        GestureDetector(
          onTap: widget.onPrimaryPressed,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: LTCColors.gold,
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: LTCColors.gold.withValues(alpha: 0.15),
                  blurRadius: 20,
                  spreadRadius: 0,
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  widget.primaryButtonText,
                  style: const TextStyle(
                    color: LTCColors.background,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.arrow_forward_rounded,
                    color: LTCColors.background, size: 18),
              ],
            ),
          ),
        ),
        // Secondary button
        if (widget.secondaryButtonText != null) ...[
          const SizedBox(height: 12),
          GestureDetector(
            onTap: widget.onSecondaryPressed,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                widget.secondaryButtonText!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: LTCColors.textSecondary,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// Detail row model for the success dialog.
class SuccessDialogDetail {
  final String label;
  final String value;
  final bool isPrimary;

  const SuccessDialogDetail({
    required this.label,
    required this.value,
    this.isPrimary = false,
  });
}

/// Dashed line painter for detail separators.
class _DashedLinePainter extends CustomPainter {
  final Color color;

  _DashedLinePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;

    const dashWidth = 4.0;
    const dashSpace = 3.0;
    double startX = 0;

    while (startX < size.width) {
      canvas.drawLine(
        Offset(startX, 0),
        Offset(startX + dashWidth, 0),
        paint,
      );
      startX += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
