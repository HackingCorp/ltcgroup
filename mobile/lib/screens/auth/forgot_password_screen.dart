import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';

/// Forgot password — enter email to receive reset token
class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _apiService = ApiService();
  bool _isLoading = false;
  bool _emailSent = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      await _apiService.forgotPassword(_emailController.text.trim());
      if (!mounted) return;
      setState(() => _emailSent = true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString().replaceFirst('Exception: ', '')),
          backgroundColor: LTCColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: LTCColors.background,
        body: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: _emailSent ? _buildSuccessState() : _buildFormState(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.only(top: 8, left: 4, right: 4),
        child: Row(
          children: [
            IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.chevron_left_rounded, size: 28, color: LTCColors.textPrimary),
            ),
            const Expanded(
              child: Text(
                'Mot de passe oublie',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: LTCColors.textPrimary,
                ),
              ),
            ),
            const SizedBox(width: 48),
          ],
        ),
      ),
    );
  }

  Widget _buildFormState() {
    return Column(
      children: [
        const SizedBox(height: 48),
        // Icon
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: LTCColors.gold.withValues(alpha: 0.12),
          ),
          child: const Icon(Icons.lock_reset_rounded, color: LTCColors.gold, size: 40),
        ),
        const SizedBox(height: 24),
        const Text(
          'Reinitialiser votre mot de passe',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: LTCColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Entrez votre adresse email et nous vous enverrons un code pour reinitialiser votre mot de passe.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: LTCColors.textSecondary),
          ),
        ),
        const SizedBox(height: 32),
        Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(left: 4, bottom: 6),
                child: Text(
                  'EMAIL',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: LTCColors.textSecondary,
                    letterSpacing: 1.2,
                  ),
                ),
              ),
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(fontSize: 15, color: LTCColors.textPrimary),
                decoration: InputDecoration(
                  hintText: 'votre@email.com',
                  hintStyle: const TextStyle(color: LTCColors.textTertiary),
                  filled: true,
                  fillColor: LTCColors.surfaceLight,
                  prefixIcon: const Icon(Icons.mail_outline, color: LTCColors.textSecondary, size: 22),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: LTCColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: LTCColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: LTCColors.gold, width: 1.5),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: LTCColors.error),
                  ),
                  errorStyle: const TextStyle(color: LTCColors.error),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) return 'Email requis';
                  if (!value.contains('@')) return 'Email invalide';
                  return null;
                },
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [LTCColors.goldDark, LTCColors.gold],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: LTCColors.gold.withValues(alpha: 0.25),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleSubmit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      disabledBackgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(color: LTCColors.background, strokeWidth: 2.5),
                          )
                        : const Text(
                            'Envoyer le code',
                            style: TextStyle(
                              color: LTCColors.background,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessState() {
    return Column(
      children: [
        const SizedBox(height: 48),
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: LTCColors.success.withValues(alpha: 0.12),
          ),
          child: const Icon(Icons.mark_email_read_rounded, color: LTCColors.success, size: 40),
        ),
        const SizedBox(height: 24),
        const Text(
          'Email envoye !',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: LTCColors.textPrimary,
          ),
        ),
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'Si un compte existe pour ${_emailController.text.trim()}, vous recevrez un email avec un code de reinitialisation.',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, color: LTCColors.textSecondary),
          ),
        ),
        const SizedBox(height: 32),
        // Continue to reset password screen
        SizedBox(
          width: double.infinity,
          height: 56,
          child: DecoratedBox(
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [LTCColors.goldDark, LTCColors.gold],
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: LTCColors.gold.withValues(alpha: 0.25),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: ElevatedButton(
              onPressed: () {
                Navigator.of(context).pushReplacementNamed('/reset-password');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.transparent,
                shadowColor: Colors.transparent,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "J'ai recu le code",
                    style: TextStyle(
                      color: LTCColors.background,
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  SizedBox(width: 8),
                  Icon(Icons.arrow_forward, color: LTCColors.background, size: 18),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),
        // Resend
        GestureDetector(
          onTap: () {
            setState(() => _emailSent = false);
          },
          child: const Text(
            'Renvoyer le code',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: LTCColors.gold,
            ),
          ),
        ),
      ],
    );
  }
}
