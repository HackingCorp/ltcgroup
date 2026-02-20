import 'package:flutter/material.dart';

/// Error modal overlay shown when a payment or operation fails.
/// Features animated red X icon with ping, error message, and retry/support actions.
class ErrorDialog extends StatefulWidget {
  final String title;
  final String message;
  final String primaryButtonText;
  final String? secondaryButtonText;
  final VoidCallback onPrimaryPressed;
  final VoidCallback? onSecondaryPressed;

  const ErrorDialog({
    super.key,
    required this.title,
    required this.message,
    this.primaryButtonText = 'Réessayer',
    this.secondaryButtonText,
    required this.onPrimaryPressed,
    this.onSecondaryPressed,
  });

  @override
  State<ErrorDialog> createState() => _ErrorDialogState();

  /// Show as a modal dialog.
  static Future<void> show(
    BuildContext context, {
    required String title,
    required String message,
    String primaryButtonText = 'Réessayer',
    String? secondaryButtonText,
    VoidCallback? onPrimaryPressed,
    VoidCallback? onSecondaryPressed,
  }) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.transparent,
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (context, anim1, anim2) {
        return ErrorDialog(
          title: title,
          message: message,
          primaryButtonText: primaryButtonText,
          secondaryButtonText: secondaryButtonText,
          onPrimaryPressed:
              onPrimaryPressed ?? () => Navigator.of(context).pop(),
          onSecondaryPressed: onSecondaryPressed,
        );
      },
    );
  }

  /// Convenience for payment failure.
  static Future<void> showPaymentError(
    BuildContext context, {
    VoidCallback? onRetry,
    VoidCallback? onContactSupport,
  }) {
    return show(
      context,
      title: 'Échec du paiement',
      message:
          'Votre transaction n\'a pas pu aboutir en raison d\'un problème de connexion avec votre banque. Aucune somme n\'a été débitée.',
      primaryButtonText: 'Réessayer',
      secondaryButtonText: 'Contacter le support',
      onPrimaryPressed: onRetry ?? () => Navigator.of(context).pop(),
      onSecondaryPressed: onContactSupport,
    );
  }
}

class _ErrorDialogState extends State<ErrorDialog>
    with TickerProviderStateMixin {
  static const _primaryBlue = Color(0xFF2B2BEE);
  static const _dangerRed = Color(0xFFEF4444);

  late final AnimationController _backdropController;
  late final AnimationController _modalController;
  late final AnimationController _iconController;
  late final AnimationController _pingController;

  late final Animation<double> _backdropAnim;
  late final Animation<double> _modalScale;
  late final Animation<double> _iconScale;

  @override
  void initState() {
    super.initState();

    _backdropController = AnimationController(
      duration: const Duration(milliseconds: 350),
      vsync: this,
    );
    _backdropAnim = CurvedAnimation(
      parent: _backdropController,
      curve: Curves.easeOut,
    );

    _modalController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _modalScale = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(parent: _modalController, curve: Curves.elasticOut),
    );

    _iconController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _iconScale = CurvedAnimation(
      parent: _iconController,
      curve: Curves.elasticOut,
    );

    _pingController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    // Sequence
    _backdropController.forward();
    Future.delayed(const Duration(milliseconds: 80), () {
      if (mounted) _modalController.forward();
    });
    Future.delayed(const Duration(milliseconds: 250), () {
      if (mounted) {
        _iconController.forward();
        _pingController.repeat();
      }
    });
  }

  @override
  void dispose() {
    _backdropController.dispose();
    _modalController.dispose();
    _iconController.dispose();
    _pingController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Stack(
        children: [
          // Backdrop
          AnimatedBuilder(
            animation: _backdropAnim,
            builder: (context, child) {
              return Container(
                color:
                    Colors.black.withValues(alpha: 0.2 * _backdropAnim.value),
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
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 24),
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
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildErrorIcon(),
            const SizedBox(height: 24),
            Text(
              widget.title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(
                widget.message,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.5,
                  color: Colors.grey[500],
                ),
              ),
            ),
            const SizedBox(height: 32),
            _buildActions(),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorIcon() {
    return ScaleTransition(
      scale: _iconScale,
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
                  opacity: (1 - _pingController.value) * 0.4,
                  child: Transform.scale(
                    scale: 1 + _pingController.value * 0.4,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _dangerRed.withValues(alpha: 0.15),
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
                color: _dangerRed.withValues(alpha: 0.08),
                border: Border.all(color: Colors.white, width: 4),
              ),
            ),
            // X icon
            const Icon(
              Icons.close_rounded,
              size: 40,
              color: _dangerRed,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActions() {
    return Column(
      children: [
        // Primary: Retry
        GestureDetector(
          onTap: widget.onPrimaryPressed,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: _primaryBlue,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: _primaryBlue.withValues(alpha: 0.3),
                  blurRadius: 16,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.refresh_rounded,
                    color: Colors.white, size: 18),
                const SizedBox(width: 8),
                Text(
                  widget.primaryButtonText,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
        // Secondary: Contact support
        if (widget.secondaryButtonText != null) ...[
          const SizedBox(height: 8),
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
                  fontWeight: FontWeight.w500,
                  color: _primaryBlue,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
