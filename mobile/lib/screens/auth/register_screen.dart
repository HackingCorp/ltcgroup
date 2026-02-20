import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

/// Registration screen matching LTC Pay design
class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  String _selectedCountryCode = '🇨🇲 +237';
  String _selectedCountry = '';
  bool _termsAccepted = false;

  static const _headerColor = Color(0xFF1A365D);
  static const _primaryBlue = Color(0xFF258CF4);
  static const _primaryDark = Color(0xFF1A6AC9);

  static const _countryCodes = [
    '🇨🇲 +237',
    '🇫🇷 +33',
    '🇧🇪 +32',
    '🇨🇭 +41',
    '🇨🇦 +1',
    '🇸🇳 +221',
  ];

  static const _countries = {
    '': 'Sélectionnez votre pays',
    'CM': 'Cameroun',
    'FR': 'France',
    'BE': 'Belgique',
    'CH': 'Suisse',
    'CA': 'Canada',
    'CI': "Côte d'Ivoire",
    'SN': 'Sénégal',
  };

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_termsAccepted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Veuillez accepter les conditions d\'utilisation'),
          backgroundColor: Colors.red[700],
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
      // OTP-based registration flow: no password required at this stage.
      // The backend generates a temporary token; the user sets a PIN/password later.
      password: '',
      firstName: firstName,
      lastName: lastName,
    );

    if (!mounted) return;

    if (success) {
      Navigator.of(context).pushReplacementNamed('/kyc');
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.error ?? 'Erreur lors de l\'inscription'),
          backgroundColor: Colors.red[700],
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
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
      decoration: const BoxDecoration(
        color: _headerColor,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black26,
            blurRadius: 12,
            offset: Offset(0, 4),
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
                      child: Icon(
                        Icons.chevron_left,
                        color: Colors.white.withValues(alpha: 0.8),
                        size: 28,
                      ),
                    ),
                  ),
                  const Text(
                    'LTC PAY',
                    style: TextStyle(
                      color: Colors.white,
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
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Créez votre compte en quelques étapes.',
                style: TextStyle(
                  color: Colors.blue[200],
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
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: Colors.grey[700],
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
      hintStyle: TextStyle(color: Colors.grey[400]),
      prefixIcon: Icon(icon, color: Colors.grey[400], size: 22),
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: _primaryBlue, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.red[400]!),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.red[400]!, width: 2),
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
          color: Color(0xFF1E293B),
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
          color: Color(0xFF1E293B),
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
          if (!value.contains('@')) {
            return 'Email invalide';
          }
          return null;
        },
      ),
    );
  }

  Widget _buildPhoneField() {
    return _buildInputContainer(
      label: 'Numéro de téléphone',
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          color: Colors.white,
        ),
        child: Row(
          children: [
            // Country code selector
            Container(
              width: 100,
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
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedCountryCode,
                  isExpanded: true,
                  icon: Padding(
                    padding: const EdgeInsets.only(right: 4),
                    child: Icon(Icons.expand_more, size: 16, color: Colors.grey[500]),
                  ),
                  style: TextStyle(
                    color: Colors.grey[700],
                    fontSize: 13,
                  ),
                  padding: const EdgeInsets.only(left: 12),
                  items: _countryCodes.map((code) {
                    return DropdownMenuItem(
                      value: code,
                      child: Text(code, style: const TextStyle(fontSize: 13)),
                    );
                  }).toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => _selectedCountryCode = value);
                    }
                  },
                ),
              ),
            ),
            // Phone input
            Expanded(
              child: TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                style: const TextStyle(
                  color: Color(0xFF1E293B),
                  fontSize: 15,
                ),
                decoration: const InputDecoration(
                  hintText: '6 12 34 56 78',
                  hintStyle: TextStyle(color: Color(0xFFCBD5E1)),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
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
      ),
    );
  }

  Widget _buildCountryField() {
    return _buildInputContainer(
      label: 'Pays de résidence',
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          color: Colors.white,
        ),
        child: DropdownButtonFormField<String>(
          value: _selectedCountry,
          icon: Icon(Icons.expand_more, color: Colors.grey[500]),
          decoration: InputDecoration(
            prefixIcon: Icon(Icons.public, color: Colors.grey[400], size: 22),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          ),
          style: const TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 15,
          ),
          items: _countries.entries.map((entry) {
            return DropdownMenuItem(
              value: entry.key,
              child: Text(
                entry.value,
                style: TextStyle(
                  color: entry.key.isEmpty ? Colors.grey[400] : const Color(0xFF1E293B),
                ),
              ),
            );
          }).toList(),
          onChanged: (value) {
            setState(() => _selectedCountry = value ?? '');
          },
          validator: (value) {
            if (value == null || value.isEmpty) {
              return 'Sélectionnez votre pays';
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
            activeColor: _primaryBlue,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
            ),
            side: BorderSide(color: Colors.grey[300]!),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: GestureDetector(
            onTap: () {
              setState(() => _termsAccepted = !_termsAccepted);
            },
            child: Text.rich(
              TextSpan(
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  height: 1.4,
                ),
                children: const [
                  TextSpan(text: "J'accepte les "),
                  TextSpan(
                    text: "conditions d'utilisation",
                    style: TextStyle(
                      color: _primaryBlue,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  TextSpan(text: ' et la '),
                  TextSpan(
                    text: 'politique de confidentialité',
                    style: TextStyle(
                      color: _primaryBlue,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  TextSpan(text: ' de LTC Pay.'),
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
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(color: Colors.grey[100]!),
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
                                color: Colors.white,
                                strokeWidth: 2.5,
                              ),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text(
                                  'Créer mon compte',
                                  style: TextStyle(
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
              },
            ),
            const SizedBox(height: 16),
            // Login link
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Vous avez déjà un compte ? ',
                  style: TextStyle(
                    color: Colors.grey[500],
                    fontSize: 14,
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: const Text(
                    'Se connecter',
                    style: TextStyle(
                      color: _primaryBlue,
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
