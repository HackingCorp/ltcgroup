import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/biometric_service.dart';

/// Login screen matching LTC Pay design
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _biometricService = BiometricService();

  static const _headerColor = Color(0xFF1A365D);
  static const _primaryBlue = Color(0xFF258CF4);
  static const _primaryDark = Color(0xFF1A6CB0);

  int _loginAttempts = 0;
  bool _isLocked = false;
  Timer? _lockTimer;

  @override
  void dispose() {
    _lockTimer?.cancel();
    _phoneController.dispose();
    _otpController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_isLocked || !_formKey.currentState!.validate()) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final phone = '+237${_phoneController.text.trim()}';

    final success = await authProvider.login(
      email: phone,
      password: _otpController.text.trim(),
    );

    if (!mounted) return;

    if (success) {
      _loginAttempts = 0;
      Navigator.of(context).pushReplacementNamed('/main');
    } else {
      _loginAttempts++;
      if (_loginAttempts >= 5) {
        setState(() => _isLocked = true);
        _lockTimer?.cancel();
        _lockTimer = Timer(const Duration(seconds: 30), () {
          if (mounted) {
            setState(() {
              _isLocked = false;
              _loginAttempts = 0;
            });
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Trop de tentatives. Réessayez dans 30 secondes.'),
            backgroundColor: Colors.red[700],
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.error ?? 'Erreur de connexion'),
            backgroundColor: Colors.red[700],
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    }
  }

  Future<void> _handleBiometricLogin() async {
    final isAvailable = await _biometricService.checkBiometricAvailable();
    if (isAvailable) {
      Navigator.of(context).pushNamed('/biometric');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Column(
        children: [
          // Header Section (28% of screen)
          _buildHeader(context),

          // Main Content
          Expanded(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  children: [
                    const SizedBox(height: 40),
                    _buildWelcomeText(),
                    const SizedBox(height: 32),
                    _buildForm(),
                    const SizedBox(height: 24),
                    _buildFooter(),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    final height = MediaQuery.of(context).size.height * 0.28;
    return Container(
      height: height,
      width: double.infinity,
      decoration: const BoxDecoration(
        color: _headerColor,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(40),
          bottomRight: Radius.circular(40),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background decoration circles
          Positioned(
            top: -80,
            left: -40,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _primaryBlue.withValues(alpha: 0.15),
              ),
            ),
          ),
          Positioned(
            bottom: -20,
            right: -20,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _primaryBlue.withValues(alpha: 0.08),
              ),
            ),
          ),
          // Content
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: 20),
                // Logo container
                Container(
                  width: 64,
                  height: 64,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.2),
                    ),
                  ),
                  child: const Icon(
                    Icons.credit_card,
                    color: Colors.white,
                    size: 36,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'LTC Pay',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Votre portefeuille numérique sécurisé',
                  style: TextStyle(
                    color: Colors.blue[100]?.withValues(alpha: 0.8),
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWelcomeText() {
    return Column(
      children: [
        const Text(
          'Bon retour',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Entrez votre numéro pour continuer',
          style: TextStyle(
            color: Colors.grey[500],
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Phone input
          _buildLabel('NUMÉRO DE TÉLÉPHONE'),
          const SizedBox(height: 6),
          _buildPhoneInput(),

          const SizedBox(height: 20),

          // OTP input
          _buildLabel('CODE DE VÉRIFICATION'),
          const SizedBox(height: 6),
          _buildOtpInput(),

          const SizedBox(height: 24),

          // Locked message
          if (_isLocked)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                'Trop de tentatives. Réessayez dans 30 secondes.',
                style: TextStyle(color: Colors.red[700], fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ),

          // Login button
          Consumer<AuthProvider>(
            builder: (context, authProvider, _) {
              return _buildGradientButton(
                text: 'Connexion',
                onPressed: _handleLogin,
                isLoading: authProvider.isLoading || _isLocked,
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: Colors.grey[600],
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildPhoneInput() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          // Country selector
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(12),
                bottomLeft: Radius.circular(12),
              ),
              border: Border(
                right: BorderSide(color: Color(0xFFF1F5F9)),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('🇨🇲', style: TextStyle(fontSize: 20)),
                const SizedBox(width: 6),
                Text(
                  '+237',
                  style: TextStyle(
                    color: Colors.grey[700],
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
                Icon(Icons.expand_more, color: Colors.grey[400], size: 16),
              ],
            ),
          ),
          // Phone input
          Expanded(
            child: TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B),
                letterSpacing: 1.5,
              ),
              decoration: const InputDecoration(
                hintText: '6XX XX XX XX',
                hintStyle: TextStyle(
                  color: Color(0xFFCBD5E1),
                  fontWeight: FontWeight.normal,
                  letterSpacing: 1.5,
                ),
                border: InputBorder.none,
                contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Numéro requis';
                }
                if (value.length < 9) {
                  return 'Numéro invalide';
                }
                return null;
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOtpInput() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 4,
            offset: const Offset(0, 1),
          ),
        ],
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: TextFormField(
        controller: _otpController,
        keyboardType: TextInputType.number,
        maxLength: 6,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: Color(0xFF1E293B),
          letterSpacing: 8,
        ),
        decoration: InputDecoration(
          hintText: '• • • • • •',
          hintStyle: const TextStyle(
            color: Color(0xFFCBD5E1),
            fontWeight: FontWeight.normal,
            letterSpacing: 4,
          ),
          prefixIcon: Icon(Icons.lock, color: Colors.grey[400]),
          suffixIcon: TextButton(
            onPressed: () {
              // TODO: Resend OTP
            },
            child: const Text(
              'Renvoyer',
              style: TextStyle(
                color: _primaryBlue,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          border: InputBorder.none,
          counterText: '',
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
        validator: (value) {
          if (value == null || value.isEmpty) {
            return 'Code requis';
          }
          return null;
        },
      ),
    );
  }

  Widget _buildGradientButton({
    required String text,
    required VoidCallback onPressed,
    bool isLoading = false,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [_primaryBlue, _primaryDark],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: _primaryBlue.withValues(alpha: 0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: isLoading
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    color: Colors.white,
                    strokeWidth: 2.5,
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      text,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      Icons.arrow_forward,
                      color: Colors.white.withValues(alpha: 0.8),
                      size: 16,
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Column(
      children: [
        // Divider "Ou connectez-vous avec"
        Row(
          children: [
            Expanded(child: Divider(color: Colors.grey[200])),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'OU CONNECTEZ-VOUS AVEC',
                style: TextStyle(
                  color: Colors.grey[400],
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.5,
                ),
              ),
            ),
            Expanded(child: Divider(color: Colors.grey[200])),
          ],
        ),

        const SizedBox(height: 24),

        // Biometric button
        GestureDetector(
          onTap: _handleBiometricLogin,
          child: Column(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white,
                  border: Border.all(color: const Color(0xFFF1F5F9)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.08),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.fingerprint,
                  color: _primaryBlue,
                  size: 32,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Touch ID',
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        // Bottom links
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            GestureDetector(
              onTap: () {
                Navigator.of(context).pushNamed('/register');
              },
              child: Text(
                'Créer un compte',
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Text(
                '|',
                style: TextStyle(color: Colors.grey[300]),
              ),
            ),
            GestureDetector(
              onTap: () {},
              child: Text(
                'Aide',
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}
