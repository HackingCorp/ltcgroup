import 'package:flutter/material.dart';
import 'dart:math' as math;
import '../../services/storage_service.dart';

class OnboardingScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const OnboardingScreen({super.key, required this.onComplete});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen>
    with TickerProviderStateMixin {
  final PageController _pageController = PageController();
  late final AnimationController _floatController;
  late final AnimationController _scanController;
  int _currentPage = 0;

  static const _bgColor = Color(0xFF101922);
  static const _primaryBlue = Color(0xFF258CF4);
  static const _secondaryText = Color(0xFF9CA3AF);

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
    _scanController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();
  }

  @override
  void dispose() {
    _pageController.dispose();
    _floatController.dispose();
    _scanController.dispose();
    super.dispose();
  }

  Future<void> _onComplete() async {
    final storageService = StorageService();
    await storageService.setOnboardingSeen();
    widget.onComplete();
  }

  void _nextPage() {
    if (_currentPage < 2) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _onComplete();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgColor,
      body: SafeArea(
        child: Column(
          children: [
            // Skip button
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.only(top: 16, right: 16),
                child: AnimatedOpacity(
                  opacity: _currentPage < 2 ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 200),
                  child: GestureDetector(
                    onTap: _currentPage < 2 ? _onComplete : null,
                    child: const Padding(
                      padding: EdgeInsets.all(8.0),
                      child: Text(
                        'Passer',
                        style: TextStyle(
                          color: _secondaryText,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),

            // Page content
            Expanded(
              child: PageView(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() => _currentPage = index);
                },
                children: [
                  _OnboardingPage(
                    illustration: _CardIllustration(
                      floatAnimation: _floatController,
                    ),
                    title: 'Cartes ',
                    titleBold: 'Instantanées',
                    subtitle:
                        'Obtenez votre carte virtuelle Visa en quelques secondes. Payez en ligne partout dans le monde.',
                  ),
                  _OnboardingPage(
                    illustration: _ScannerIllustration(
                      floatAnimation: _floatController,
                      scanAnimation: _scanController,
                    ),
                    title: 'Vérification ',
                    titleBold: 'Rapide',
                    subtitle:
                        'Vérifiez votre identité facilement grâce à notre processus KYC simplifié et sécurisé.',
                  ),
                  _OnboardingPage(
                    illustration: _WalletIllustration(
                      floatAnimation: _floatController,
                    ),
                    title: 'Recharges ',
                    titleBold: 'Faciles',
                    subtitle:
                        'Rechargez votre carte via Mobile Money : MTN MoMo, Orange Money et bien plus.',
                  ),
                ],
              ),
            ),

            // Page indicators
            Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(3, (index) {
                  final isActive = index == _currentPage;
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOut,
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: isActive ? 28 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: isActive ? _primaryBlue : const Color(0xFF374151),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  );
                }),
              ),
            ),

            // Next / Get started button
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _nextPage,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                    textStyle: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  child: Text(_currentPage < 2 ? 'Suivant' : 'Commencer'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Onboarding page layout ───

class _OnboardingPage extends StatelessWidget {
  final Widget illustration;
  final String title;
  final String titleBold;
  final String subtitle;

  const _OnboardingPage({
    required this.illustration,
    required this.title,
    required this.titleBold,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(height: 200, child: illustration),
          const SizedBox(height: 48),
          RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              style: const TextStyle(fontSize: 32, color: Colors.white),
              children: [
                TextSpan(text: title),
                TextSpan(
                  text: titleBold,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF258CF4),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 16,
              color: Color(0xFF9CA3AF),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Page 1: Card Illustration ───

class _CardIllustration extends StatelessWidget {
  final AnimationController floatAnimation;

  const _CardIllustration({required this.floatAnimation});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: floatAnimation,
      builder: (context, child) {
        final offset = math.sin(floatAnimation.value * math.pi) * 10;
        return Transform.translate(
          offset: Offset(0, offset),
          child: child,
        );
      },
      child: Center(
        child: Container(
          width: 280,
          height: 170,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(0xFF1E3A5F).withValues(alpha: 0.9),
                const Color(0xFF258CF4).withValues(alpha: 0.4),
              ],
            ),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.15),
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF258CF4).withValues(alpha: 0.3),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Glass effect circles
              Positioned(
                top: -30,
                right: -30,
                child: Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.05),
                  ),
                ),
              ),
              // Chip
              Positioned(
                top: 30,
                left: 24,
                child: Container(
                  width: 40,
                  height: 28,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(4),
                    gradient: const LinearGradient(
                      colors: [Color(0xFFD4A855), Color(0xFFF0D78C)],
                    ),
                  ),
                  child: Center(
                    child: Container(
                      width: 28,
                      height: 20,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(2),
                        border: Border.all(
                          color: const Color(0xFFC49B30),
                          width: 0.5,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              // Card number
              const Positioned(
                bottom: 52,
                left: 24,
                child: Text(
                  '•••• •••• •••• 4589',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                    letterSpacing: 2,
                  ),
                ),
              ),
              // Holder name
              const Positioned(
                bottom: 24,
                left: 24,
                child: Text(
                  'JOHN DOE',
                  style: TextStyle(
                    color: Colors.white60,
                    fontSize: 11,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
              // Expiry
              const Positioned(
                bottom: 24,
                right: 70,
                child: Text(
                  '12/28',
                  style: TextStyle(
                    color: Colors.white60,
                    fontSize: 11,
                  ),
                ),
              ),
              // Mastercard circles
              Positioned(
                bottom: 20,
                right: 20,
                child: SizedBox(
                  width: 44,
                  height: 28,
                  child: Stack(
                    children: [
                      Positioned(
                        left: 0,
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFFEB001B).withValues(alpha: 0.8),
                          ),
                        ),
                      ),
                      Positioned(
                        right: 0,
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFFF79E1B).withValues(alpha: 0.8),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              // VISA text
              Positioned(
                top: 24,
                right: 20,
                child: Text(
                  'VISA',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.9),
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Page 2: Scanner Illustration ───

class _ScannerIllustration extends StatelessWidget {
  final AnimationController floatAnimation;
  final AnimationController scanAnimation;

  const _ScannerIllustration({
    required this.floatAnimation,
    required this.scanAnimation,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: floatAnimation,
      builder: (context, child) {
        final offset = math.sin(floatAnimation.value * math.pi) * 6;
        return Transform.translate(
          offset: Offset(0, offset),
          child: child,
        );
      },
      child: Center(
        child: SizedBox(
          width: 220,
          height: 200,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // ID Card behind (tilted)
              Positioned(
                bottom: 20,
                right: 10,
                child: Transform.rotate(
                  angle: 0.15,
                  child: Container(
                    width: 120,
                    height: 76,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: const Color(0xFF374151),
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 20,
                            height: 20,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withValues(alpha: 0.1),
                            ),
                            child: Icon(
                              Icons.person,
                              size: 12,
                              color: Colors.white.withValues(alpha: 0.3),
                            ),
                          ),
                          const Spacer(),
                          Container(
                            width: 60,
                            height: 4,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            width: 40,
                            height: 4,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.07),
                              borderRadius: BorderRadius.circular(2),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // Phone frame
              Container(
                width: 140,
                height: 180,
                decoration: BoxDecoration(
                  color: const Color(0xFF1A2332),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: const Color(0xFF374151),
                    width: 2,
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: Stack(
                    children: [
                      // Screen
                      Container(
                        color: const Color(0xFF0F1923),
                      ),

                      // Viewfinder corners
                      ..._buildViewfinderCorners(),

                      // Scan beam
                      AnimatedBuilder(
                        animation: scanAnimation,
                        builder: (context, _) {
                          return Positioned(
                            left: 20,
                            right: 20,
                            top: 20 + (scanAnimation.value * 130),
                            child: Container(
                              height: 2,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [
                                    const Color(0xFF258CF4).withValues(alpha: 0.0),
                                    const Color(0xFF258CF4),
                                    const Color(0xFF258CF4).withValues(alpha: 0.0),
                                  ],
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF258CF4)
                                        .withValues(alpha: 0.5),
                                    blurRadius: 8,
                                    spreadRadius: 2,
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),

              // Fingerprint icon
              Positioned(
                bottom: 0,
                right: 20,
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF258CF4).withValues(alpha: 0.15),
                    border: Border.all(
                      color: const Color(0xFF258CF4).withValues(alpha: 0.4),
                    ),
                  ),
                  child: const Icon(
                    Icons.fingerprint,
                    color: Color(0xFF258CF4),
                    size: 24,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildViewfinderCorners() {
    const color = Color(0xFF258CF4);
    const len = 20.0;
    const thickness = 2.5;
    const inset = 16.0;

    return [
      // Top-left
      Positioned(
        top: inset,
        left: inset,
        child: SizedBox(
          width: len,
          height: len,
          child: CustomPaint(painter: _CornerPainter(color, thickness, _Corner.topLeft)),
        ),
      ),
      // Top-right
      Positioned(
        top: inset,
        right: inset,
        child: SizedBox(
          width: len,
          height: len,
          child: CustomPaint(painter: _CornerPainter(color, thickness, _Corner.topRight)),
        ),
      ),
      // Bottom-left
      Positioned(
        bottom: inset,
        left: inset,
        child: SizedBox(
          width: len,
          height: len,
          child: CustomPaint(painter: _CornerPainter(color, thickness, _Corner.bottomLeft)),
        ),
      ),
      // Bottom-right
      Positioned(
        bottom: inset,
        right: inset,
        child: SizedBox(
          width: len,
          height: len,
          child: CustomPaint(painter: _CornerPainter(color, thickness, _Corner.bottomRight)),
        ),
      ),
    ];
  }
}

enum _Corner { topLeft, topRight, bottomLeft, bottomRight }

class _CornerPainter extends CustomPainter {
  final Color color;
  final double thickness;
  final _Corner corner;

  _CornerPainter(this.color, this.thickness, this.corner);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = thickness
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    switch (corner) {
      case _Corner.topLeft:
        path.moveTo(0, size.height);
        path.lineTo(0, 0);
        path.lineTo(size.width, 0);
        break;
      case _Corner.topRight:
        path.moveTo(0, 0);
        path.lineTo(size.width, 0);
        path.lineTo(size.width, size.height);
        break;
      case _Corner.bottomLeft:
        path.moveTo(0, 0);
        path.lineTo(0, size.height);
        path.lineTo(size.width, size.height);
        break;
      case _Corner.bottomRight:
        path.moveTo(size.width, 0);
        path.lineTo(size.width, size.height);
        path.lineTo(0, size.height);
        break;
    }
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ─── Page 3: Wallet Illustration ───

class _WalletIllustration extends StatelessWidget {
  final AnimationController floatAnimation;

  const _WalletIllustration({required this.floatAnimation});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: floatAnimation,
      builder: (context, child) {
        final offset = math.sin(floatAnimation.value * math.pi) * 8;
        return Transform.translate(
          offset: Offset(0, offset),
          child: child,
        );
      },
      child: Center(
        child: SizedBox(
          width: 260,
          height: 200,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Main wallet icon
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF258CF4).withValues(alpha: 0.15),
                ),
                child: const Icon(
                  Icons.account_balance_wallet,
                  color: Color(0xFF258CF4),
                  size: 44,
                ),
              ),

              // MTN MoMo badge
              const Positioned(
                top: 10,
                right: 20,
                child: _ProviderBadge(
                  color: Color(0xFFFFCC00),
                  child: Text(
                    'MTN\nMoMo',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      height: 1.2,
                    ),
                  ),
                ),
              ),

              // Orange Money badge
              const Positioned(
                bottom: 10,
                left: 20,
                child: _ProviderBadge(
                  color: Color(0xFFFF7900),
                  child: Icon(
                    Icons.currency_exchange,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
              ),

              // Connecting dashes (decorative arcs)
              Positioned(
                top: 30,
                right: 75,
                child: Container(
                  width: 40,
                  height: 2,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFFFFCC00).withValues(alpha: 0.6),
                        const Color(0xFFFFCC00).withValues(alpha: 0.0),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                bottom: 35,
                left: 75,
                child: Container(
                  width: 40,
                  height: 2,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFFFF7900).withValues(alpha: 0.0),
                        const Color(0xFFFF7900).withValues(alpha: 0.6),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProviderBadge extends StatelessWidget {
  final Color color;
  final Widget child;

  const _ProviderBadge({required this.color, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.4),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Center(child: child),
    );
  }
}
