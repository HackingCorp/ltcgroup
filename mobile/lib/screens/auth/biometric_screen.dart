import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import '../../services/biometric_service.dart';
import '../../config/theme.dart';

class BiometricScreen extends StatefulWidget {
  const BiometricScreen({super.key});

  @override
  State<BiometricScreen> createState() => _BiometricScreenState();
}

class _BiometricScreenState extends State<BiometricScreen> with SingleTickerProviderStateMixin {
  final BiometricService _biometricService = BiometricService();
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  bool _isAuthenticating = false;
  String _errorMessage = '';
  String _biometricType = 'Biométrie';

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..repeat(reverse: true);

    _scaleAnimation = Tween<double>(begin: 0.9, end: 1.1).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

    _loadBiometricType();
    _authenticate();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _loadBiometricType() async {
    final types = await _biometricService.getAvailableBiometrics();
    setState(() {
      _biometricType = _biometricService.getBiometricTypeName(types);
    });
  }

  Future<void> _authenticate() async {
    if (_isAuthenticating) return;

    setState(() {
      _isAuthenticating = true;
      _errorMessage = '';
    });

    final bool authenticated = await _biometricService.authenticate(
      reason: 'Authentifiez-vous pour accéder à votre compte',
      biometricOnly: false,
    );

    if (authenticated) {
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/main');
      }
    } else {
      setState(() {
        _isAuthenticating = false;
        _errorMessage = 'Authentification échouée. Veuillez réessayer.';
      });
    }
  }

  void _usePassword() {
    Navigator.of(context).pushReplacementNamed('/');
  }

  @override
  Widget build(BuildContext context) {
    final types = [BiometricType.face, BiometricType.fingerprint];

    return Scaffold(
      backgroundColor: LTCTheme.navy,
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Spacer(),
                // Logo
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: LTCTheme.gold.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Icon(
                    Icons.account_balance,
                    size: 48,
                    color: LTCTheme.gold,
                  ),
                ),
                const SizedBox(height: 32),

                // Title
                Text(
                  'LTC vCard',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Authentification sécurisée',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.white70,
                      ),
                ),
                const SizedBox(height: 64),

                // Biometric icon with animation
                ScaleTransition(
                  scale: _scaleAnimation,
                  child: Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: LTCTheme.gold.withOpacity(0.2),
                      border: Border.all(
                        color: LTCTheme.gold,
                        width: 2,
                      ),
                    ),
                    child: Icon(
                      _biometricType.contains('Face') ? Icons.face : Icons.fingerprint,
                      size: 64,
                      color: LTCTheme.gold,
                    ),
                  ),
                ),
                const SizedBox(height: 32),

                // Instruction text
                Text(
                  _isAuthenticating
                      ? 'Authentification en cours...'
                      : 'Touchez le capteur pour vous authentifier',
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.white,
                      ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),

                // Error message
                if (_errorMessage.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline, color: Colors.red, size: 20),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            _errorMessage,
                            style: const TextStyle(color: Colors.red),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    ),
                  ),

                const Spacer(),

                // Retry button
                if (!_isAuthenticating && _errorMessage.isNotEmpty)
                  ElevatedButton(
                    onPressed: _authenticate,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: LTCTheme.gold,
                      foregroundColor: LTCTheme.navy,
                      padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('Réessayer'),
                  ),
                const SizedBox(height: 16),

                // Use password link
                TextButton(
                  onPressed: _usePassword,
                  child: Text(
                    'Utiliser le mot de passe',
                    style: TextStyle(
                      color: LTCTheme.gold,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
