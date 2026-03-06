import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';

/// Reset password — enter token + new password
class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _tokenController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  final _apiService = ApiService();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;

  @override
  void dispose() {
    _tokenController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _handleReset() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      await _apiService.resetPassword(
        _tokenController.text.trim(),
        _passwordController.text,
      );
      if (!mounted) return;

      // Show success and go back to login
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          backgroundColor: LTCColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(Icons.check_circle_rounded, color: LTCColors.success, size: 28),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Mot de passe reinitialise',
                  style: TextStyle(color: LTCColors.textPrimary, fontSize: 18),
                ),
              ),
            ],
          ),
          content: const Text(
            'Votre mot de passe a ete reinitialise avec succes. Vous pouvez maintenant vous connecter.',
            style: TextStyle(color: LTCColors.textSecondary),
          ),
          actions: [
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: LTCColors.gold,
                foregroundColor: LTCColors.background,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Connexion'),
            ),
          ],
        ),
      );

      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
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
                child: _buildForm(),
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
                'Nouveau mot de passe',
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

  Widget _buildForm() {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: LTCColors.gold.withValues(alpha: 0.12),
            ),
            child: const Icon(Icons.vpn_key_rounded, color: LTCColors.gold, size: 40),
          ),
          const SizedBox(height: 24),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Entrez le code recu par email et votre nouveau mot de passe.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: LTCColors.textSecondary),
            ),
          ),
          const SizedBox(height: 32),

          // Token field
          _buildLabel('CODE DE REINITIALISATION'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _tokenController,
            style: const TextStyle(fontSize: 15, color: LTCColors.textPrimary, fontFamily: 'monospace'),
            decoration: InputDecoration(
              hintText: 'Collez le code recu par email',
              hintStyle: const TextStyle(color: LTCColors.textTertiary, fontFamily: null),
              filled: true,
              fillColor: LTCColors.surfaceLight,
              prefixIcon: const Icon(Icons.key_rounded, color: LTCColors.textSecondary, size: 22),
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
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'Code requis';
              return null;
            },
          ),
          const SizedBox(height: 20),

          // New password
          _buildLabel('NOUVEAU MOT DE PASSE'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            style: const TextStyle(fontSize: 15, color: LTCColors.textPrimary),
            decoration: InputDecoration(
              hintText: 'Minimum 8 caracteres',
              hintStyle: const TextStyle(color: LTCColors.textTertiary),
              filled: true,
              fillColor: LTCColors.surfaceLight,
              prefixIcon: const Icon(Icons.lock_outline, color: LTCColors.textSecondary, size: 22),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  color: LTCColors.textSecondary,
                  size: 22,
                ),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
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
            validator: (v) {
              if (v == null || v.isEmpty) return 'Mot de passe requis';
              if (v.length < 8) return 'Minimum 8 caracteres';
              if (!RegExp(r'[A-Z]').hasMatch(v)) return 'Au moins une majuscule';
              if (!RegExp(r'[a-z]').hasMatch(v)) return 'Au moins une minuscule';
              if (!RegExp(r'\d').hasMatch(v)) return 'Au moins un chiffre';
              if (!RegExp(r'[^A-Za-z0-9]').hasMatch(v)) return 'Au moins un caractere special';
              return null;
            },
          ),
          const SizedBox(height: 20),

          // Confirm password
          _buildLabel('CONFIRMER MOT DE PASSE'),
          const SizedBox(height: 6),
          TextFormField(
            controller: _confirmController,
            obscureText: _obscureConfirm,
            style: const TextStyle(fontSize: 15, color: LTCColors.textPrimary),
            decoration: InputDecoration(
              hintText: 'Confirmez le mot de passe',
              hintStyle: const TextStyle(color: LTCColors.textTertiary),
              filled: true,
              fillColor: LTCColors.surfaceLight,
              prefixIcon: const Icon(Icons.lock_outline, color: LTCColors.textSecondary, size: 22),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  color: LTCColors.textSecondary,
                  size: 22,
                ),
                onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
              ),
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
            validator: (v) {
              if (v != _passwordController.text) return 'Les mots de passe ne correspondent pas';
              return null;
            },
          ),
          const SizedBox(height: 8),

          // Password rules
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: LTCColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: LTCColors.border),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Le mot de passe doit contenir :', style: TextStyle(fontSize: 12, color: LTCColors.textSecondary, fontWeight: FontWeight.w600)),
                SizedBox(height: 4),
                Text('  • Minimum 8 caracteres', style: TextStyle(fontSize: 11, color: LTCColors.textTertiary)),
                Text('  • Une lettre majuscule', style: TextStyle(fontSize: 11, color: LTCColors.textTertiary)),
                Text('  • Une lettre minuscule', style: TextStyle(fontSize: 11, color: LTCColors.textTertiary)),
                Text('  • Un chiffre', style: TextStyle(fontSize: 11, color: LTCColors.textTertiary)),
                Text('  • Un caractere special (@, #, \$, etc.)', style: TextStyle(fontSize: 11, color: LTCColors.textTertiary)),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Submit button
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
                onPressed: _isLoading ? null : _handleReset,
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
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Reinitialiser',
                            style: TextStyle(
                              color: LTCColors.background,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          SizedBox(width: 8),
                          Icon(Icons.check_rounded, color: LTCColors.background, size: 20),
                        ],
                      ),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Padding(
        padding: const EdgeInsets.only(left: 4),
        child: Text(
          text,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: LTCColors.textSecondary,
            letterSpacing: 1.2,
          ),
        ),
      ),
    );
  }
}
