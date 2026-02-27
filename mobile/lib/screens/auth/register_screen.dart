import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/constants.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';

/// Registration screen matching Kash Pay dark theme design
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  String _selectedCountry = '';
  bool _termsAccepted = false;
  bool _obscurePassword = true;

  String get _selectedCountryCode {
    final c = AppConstants.supportedCountries[_selectedCountry];
    if (c != null) return '${c['flag']} ${c['phone']}';
    return '\u{1F1E8}\u{1F1F2} +237';
  }

  Map<String, String> get _countries {
    final map = <String, String>{'': 'Selectionnez votre pays'};
    for (final entry in AppConstants.supportedCountries.entries) {
      map[entry.key] = '${entry.value['flag']} ${entry.value['name']}';
    }
    return map;
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_termsAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Veuillez accepter les conditions d\'utilisation'),
          backgroundColor: LTCColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final nameParts = _fullNameController.text.trim().split(' ');
    final firstName = nameParts.first;
    final lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';
    final codeDigits = _selectedCountryCode.replaceAll(RegExp(r'[^\d+]'), '');

    final success = await authProvider.register(
      email: _emailController.text.trim(),
      phone: '$codeDigits${_phoneController.text.trim()}',
      password: _passwordController.text,
      firstName: firstName,
      lastName: lastName,
      countryCode: _selectedCountry.isNotEmpty ? _selectedCountry : 'CM',
    );

    if (!mounted) return;

    if (success) {
      Navigator.of(context).pushReplacementNamed('/kyc');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.error ?? 'Erreur lors de l\'inscription'),
          backgroundColor: LTCColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LTCColors.background,
      body: Column(
        children: [
          // Header
          _buildHeader(),

          // Scrollable form
          Expanded(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      const SizedBox(height: 32),
                      _buildFullNameField(),
                      const SizedBox(height: 24),
                      _buildEmailField(),
                      const SizedBox(height: 24),
                      _buildPasswordField(),
                      const SizedBox(height: 24),
                      _buildPhoneField(),
                      const SizedBox(height: 24),
                      _buildCountryField(),
                      const SizedBox(height: 20),
                      _buildTermsCheckbox(),
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Fixed footer
          _buildFooter(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Nav bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Icon(
                        Icons.chevron_left,
                        color: LTCColors.textSecondary,
                        size: 28,
                      ),
                    ),
                  ),
                  const Text(
                    'KASH PAY',
                    style: TextStyle(
                      color: LTCColors.gold,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                    ),
                  ),
                  const SizedBox(width: 36),
                ],
              ),
              const SizedBox(height: 24),
              const Text(
                'Inscription',
                style: TextStyle(
                  color: LTCColors.textPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'Cr\u00e9ez votre compte en quelques \u00e9tapes.',
                style: TextStyle(
                  color: LTCColors.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w300,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInputContainer({
    required String label,
    required Widget child,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: LTCColors.textSecondary,
            ),
          ),
        ),
        child,
      ],
    );
  }

  InputDecoration _inputDecoration({
    required String hint,
    required IconData icon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: LTCColors.textTertiary),
      prefixIcon: Icon(icon, color: LTCColors.textSecondary, size: 22),
      filled: true,
      fillColor: LTCColors.surfaceLight,
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
        borderSide: const BorderSide(color: LTCColors.gold, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: LTCColors.error),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: LTCColors.error, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  Widget _buildFullNameField() {
    return _buildInputContainer(
      label: 'Nom complet',
      child: TextFormField(
        controller: _fullNameController,
        textCapitalization: TextCapitalization.words,
        style: const TextStyle(
          color: LTCColors.textPrimary,
          fontSize: 15,
        ),
        decoration: _inputDecoration(
          hint: 'Jean Dupont',
          icon: Icons.person_outline,
        ),
        validator: (value) {
          if (value == null || value.trim().isEmpty) {
            return 'Nom complet requis';
          }
          if (value.trim().split(' ').length < 2) {
            return 'Entrez votre pr\u00e9nom et nom';
          }
          return null;
        },
      ),
    );
  }

  Widget _buildEmailField() {
    return _buildInputContainer(
      label: 'Email',
      child: TextFormField(
        controller: _emailController,
        keyboardType: TextInputType.emailAddress,
        style: const TextStyle(
          color: LTCColors.textPrimary,
          fontSize: 15,
        ),
        decoration: _inputDecoration(
          hint: 'jean@example.com',
          icon: Icons.mail_outline,
        ),
        validator: (value) {
          if (value == null || value.trim().isEmpty) {
            return 'Email requis';
          }
          final emailRegex = RegExp(r'^[\w\-\.]+@([\w\-]+\.)+[\w\-]{2,4}$');
          if (!emailRegex.hasMatch(value.trim())) {
            return 'Email invalide';
          }
          return null;
        },
      ),
    );
  }

  Widget _buildPasswordField() {
    return _buildInputContainer(
      label: 'Mot de passe',
      child: TextFormField(
        controller: _passwordController,
        obscureText: _obscurePassword,
        style: const TextStyle(
          color: LTCColors.textPrimary,
          fontSize: 15,
        ),
        decoration: InputDecoration(
          hintText: 'Minimum 8 caract\u00e8res',
          hintStyle: const TextStyle(color: LTCColors.textTertiary),
          prefixIcon: const Icon(Icons.lock_outline, color: LTCColors.textSecondary, size: 22),
          suffixIcon: IconButton(
            icon: Icon(
              _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
              color: LTCColors.textSecondary,
              size: 22,
            ),
            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
          ),
          filled: true,
          fillColor: LTCColors.surfaceLight,
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
            borderSide: const BorderSide(color: LTCColors.gold, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: LTCColors.error),
          ),
          focusedErrorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: LTCColors.error, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
        validator: (value) {
          if (value == null || value.isEmpty) {
            return 'Mot de passe requis';
          }
          if (value.length < 8) {
            return 'Minimum 8 caract\u00e8res';
          }
          if (!RegExp(r'(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])').hasMatch(value)) {
            return 'Le mot de passe doit contenir majuscule, minuscule, chiffre et caract\u00e8re sp\u00e9cial';
          }
          return null;
        },
      ),
    );
  }

  Widget _buildPhoneField() {
    return _buildInputContainer(
      label: 'Num\u00e9ro de t\u00e9l\u00e9phone',
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: LTCColors.border),
          color: LTCColors.surfaceLight,
        ),
        child: Row(
          children: [
            // Country code display (auto-set from selected country)
            Container(
              width: 100,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
              decoration: const BoxDecoration(
                color: LTCColors.surface,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(12),
                  bottomLeft: Radius.circular(12),
                ),
                border: Border(
                  right: BorderSide(color: LTCColors.border),
                ),
              ),
              child: Text(
                _selectedCountryCode,
                style: const TextStyle(color: LTCColors.textSecondary, fontSize: 13),
                textAlign: TextAlign.center,
              ),
            ),
            // Phone input
            Expanded(
              child: TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                style: const TextStyle(
                  color: LTCColors.textPrimary,
                  fontSize: 15,
                ),
                decoration: const InputDecoration(
                  hintText: '6 12 34 56 78',
                  hintStyle: TextStyle(color: LTCColors.textTertiary),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Num\u00e9ro requis';
                  }
                  if (!RegExp(r'^\d+$').hasMatch(value.trim())) {
                    return 'Le num\u00e9ro ne doit contenir que des chiffres';
                  }
                  if (value.trim().length < 9) {
                    return 'Num\u00e9ro invalide';
                  }
                  return null;
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCountryField() {
    return _buildInputContainer(
      label: 'Pays de r\u00e9sidence',
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: LTCColors.border),
          color: LTCColors.surfaceLight,
        ),
        child: DropdownButtonFormField<String>(
          value: _selectedCountry,
          icon: const Icon(Icons.expand_more, color: LTCColors.textSecondary),
          dropdownColor: LTCColors.surfaceLight,
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.public, color: LTCColors.textSecondary, size: 22),
            border: InputBorder.none,
            contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          ),
          style: const TextStyle(
            color: LTCColors.textPrimary,
            fontSize: 15,
          ),
          items: _countries.entries.map((entry) {
            return DropdownMenuItem(
              value: entry.key,
              child: Text(
                entry.value,
                style: TextStyle(
                  color: entry.key.isEmpty ? LTCColors.textTertiary : LTCColors.textPrimary,
                ),
              ),
            );
          }).toList(),
          onChanged: (value) {
            setState(() => _selectedCountry = value ?? '');
          },
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'S\u00e9lectionnez votre pays';
            }
            return null;
          },
        ),
      ),
    );
  }

  Widget _buildTermsCheckbox() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 20,
          height: 20,
          child: Checkbox(
            value: _termsAccepted,
            onChanged: (value) {
              setState(() => _termsAccepted = value ?? false);
            },
            activeColor: LTCColors.gold,
            checkColor: LTCColors.background,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
            ),
            side: const BorderSide(color: LTCColors.textTertiary),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: GestureDetector(
            onTap: () {
              setState(() => _termsAccepted = !_termsAccepted);
            },
            child: const Text.rich(
              TextSpan(
                style: TextStyle(
                  fontSize: 12,
                  color: LTCColors.textSecondary,
                  height: 1.4,
                ),
                children: [
                  TextSpan(text: "J'accepte les "),
                  TextSpan(
                    text: "conditions d'utilisation",
                    style: TextStyle(
                      color: LTCColors.gold,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  TextSpan(text: ' et la '),
                  TextSpan(
                    text: 'politique de confidentialit\u00e9',
                    style: TextStyle(
                      color: LTCColors.gold,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  TextSpan(text: ' de Kash Pay.'),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
      decoration: const BoxDecoration(
        color: LTCColors.surface,
        border: Border(
          top: BorderSide(color: LTCColors.border),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Create account button
            Consumer<AuthProvider>(
              builder: (context, authProvider, _) {
                return SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [LTCColors.goldDark, LTCColors.gold],
                      ),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: LTCColors.gold.withValues(alpha: 0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ElevatedButton(
                      onPressed: authProvider.isLoading ? null : _handleRegister,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: authProvider.isLoading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                color: LTCColors.background,
                                strokeWidth: 2.5,
                              ),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text(
                                  'Cr\u00e9er mon compte',
                                  style: TextStyle(
                                    color: LTCColors.background,
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Icon(
                                  Icons.arrow_forward,
                                  color: LTCColors.background.withValues(alpha: 0.8),
                                  size: 16,
                                ),
                              ],
                            ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 16),
            // Login link
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Vous avez d\u00e9j\u00e0 un compte ? ',
                  style: TextStyle(
                    color: LTCColors.textSecondary,
                    fontSize: 14,
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: const Text(
                    'Se connecter',
                    style: TextStyle(
                      color: LTCColors.gold,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
