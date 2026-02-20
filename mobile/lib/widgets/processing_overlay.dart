import 'dart:math' as math;
import 'package:flutter/material.dart';

/// Fullscreen processing overlay with animated card icon and spinner ring.
/// Shows a glassmorphism background with floating card animation,
/// title/subtitle text, and a security badge.
class ProcessingOverlay extends StatefulWidget {
  final String title;
  final String subtitle;

  const ProcessingOverlay({
    super.key,
    this.title = 'Création de votre carte en cours...',
    this.subtitle = 'Veuillez patienter quelques instants',
  });

  @override
  State<ProcessingOverlay> createState() => _ProcessingOverlayState();

  /// Show as a fullscreen overlay.
  static Future<T?> show<T>(
    BuildContext context, {
    String title = 'Création de votre carte en cours...',
    String subtitle = 'Veuillez patienter quelques instants',
  }) {
    return showGeneralDialog<T>(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.transparent,
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (context, anim1, anim2) {
        return ProcessingOverlay(title: title, subtitle: subtitle);
      },
    );
  }

  /// Show overlay, execute a future, then dismiss and return the result.
  static Future<T?> execute<T>(
    BuildContext context, {
    required Future<T> Function() task,
    String title = 'Traitement en cours...',
    String subtitle = 'Veuillez patienter quelques instants',
  }) async {
    // Show the overlay
    showGeneralDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.transparent,
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (ctx, anim1, anim2) {
        return ProcessingOverlay(title: title, subtitle: subtitle);
      },
    );

    try {
      final result = await task();
      if (context.mounted) Navigator.of(context).pop();
      return result;
    } catch (e) {
      if (context.mounted) Navigator.of(context).pop();
      rethrow;
    }
  }
}

class _ProcessingOverlayState extends State<ProcessingOverlay>
    with TickerProviderStateMixin {
  static const _primaryBlue = Color(0xFF2B2BEE);

  late final AnimationController _fadeController;
  late final AnimationController _floatController;
  late final AnimationController _spinController;
  late final AnimationController _pulseController;

  late final Animation<double> _fadeAnim;
  late final Animation<double> _floatAnim;

  @override
  void initState() {
    super.initState();

    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _fadeAnim = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    );

    _floatController = AnimationController(
      duration: const Duration(milliseconds: 3000),
      vsync: this,
    );
    _floatAnim = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _floatController, curve: Curves.easeInOut),
    );

    _spinController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 3000),
      vsync: this,
    );

    _fadeController.forward();
    _floatController.repeat(reverse: true);
    _spinController.repeat();
    _pulseController.repeat();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _floatController.dispose();
    _spinController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: FadeTransition(
        opacity: _fadeAnim,
        child: Container(
          width: double.infinity,
          height: double.infinity,
          color: Colors.white.withValues(alpha: 0.85),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildAnimatedIcon(),
              const SizedBox(height: 40),
              _buildText(),
              const SizedBox(height: 80),
              _buildSecurityBadge(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAnimatedIcon() {
    return SizedBox(
      width: 128,
      height: 128,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Pulse background
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              final scale = 1.0 + 0.1 * math.sin(_pulseController.value * math.pi * 2);
              return Transform.scale(
                scale: scale,
                child: Container(
                  width: 128,
                  height: 128,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _primaryBlue.withValues(alpha: 0.08),
                  ),
                ),
              );
            },
          ),
          // Ping circle
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              return Opacity(
                opacity: (1 - _pulseController.value) * 0.15,
                child: Transform.scale(
                  scale: 0.6 + _pulseController.value * 0.4,
                  child: Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _primaryBlue.withValues(alpha: 0.1),
                    ),
                  ),
                ),
              );
            },
          ),
          // Spinner ring
          SizedBox(
            width: 100,
            height: 100,
            child: AnimatedBuilder(
              animation: _spinController,
              builder: (context, child) {
                return CustomPaint(
                  painter: _SpinnerRingPainter(
                    progress: _spinController.value,
                    color: _primaryBlue,
                    trackColor: const Color(0xFFE2E8F0),
                  ),
                );
              },
            ),
          ),
          // Floating card icon
          AnimatedBuilder(
            animation: _floatAnim,
            builder: (context, child) {
              final dy = -8 * math.sin(_floatAnim.value * math.pi);
              return Transform.translate(
                offset: Offset(0, dy),
                child: child,
              );
            },
            child: _buildCardIcon(),
          ),
        ],
      ),
    );
  }

  Widget _buildCardIcon() {
    return SizedBox(
      width: 64,
      height: 44,
      child: Stack(
        children: [
          // Back card (stacked behind)
          Positioned(
            top: 0,
            right: 0,
            child: Transform.rotate(
              angle: 0.1,
              child: Container(
                width: 56,
                height: 36,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  color: _primaryBlue.withValues(alpha: 0.25),
                ),
              ),
            ),
          ),
          // Front card
          Positioned(
            bottom: 0,
            left: 0,
            child: Transform.rotate(
              angle: -0.05,
              child: Container(
                width: 56,
                height: 36,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [_primaryBlue, Color(0xFF4F4FFF)],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: _primaryBlue.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Stack(
                  children: [
                    // Chip
                    Positioned(
                      top: 8,
                      left: 6,
                      child: Container(
                        width: 10,
                        height: 8,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(2),
                          color: const Color(0xFFFFD700).withValues(alpha: 0.4),
                        ),
                      ),
                    ),
                    // Corner decoration
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(12),
                          ),
                          color: Colors.white.withValues(alpha: 0.1),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildText() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 40),
      child: Column(
        children: [
          Text(
            widget.title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF0F172A),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            widget.subtitle,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSecurityBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFFE2E8F0).withValues(alpha: 0.5),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.lock_rounded, size: 14, color: _primaryBlue),
          const SizedBox(width: 6),
          Text(
            'Connexion Sécurisée LTC Pay',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom painter for the animated spinner ring.
class _SpinnerRingPainter extends CustomPainter {
  final double progress;
  final Color color;
  final Color trackColor;

  _SpinnerRingPainter({
    required this.progress,
    required this.color,
    required this.trackColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 2;

    // Track
    final trackPaint = Paint()
      ..color = trackColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5;
    canvas.drawCircle(center, radius, trackPaint);

    // Animated arc
    final arcPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5
      ..strokeCap = StrokeCap.round;

    final startAngle = -math.pi / 2 + progress * math.pi * 2;
    // The arc sweeps between a small and large angle
    final sweepAngle =
        math.pi * 0.6 + math.sin(progress * math.pi * 2) * math.pi * 0.4;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      sweepAngle,
      false,
      arcPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _SpinnerRingPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
