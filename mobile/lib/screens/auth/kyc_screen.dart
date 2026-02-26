import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:math' as math;
import '../../services/api_service.dart';

class KycScreen extends StatefulWidget {
  const KycScreen({super.key});

  @override
  State<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends State<KycScreen> with TickerProviderStateMixin {
  final ImagePicker _picker = ImagePicker();
  final ApiService _apiService = ApiService();

  // Step: 0=docType, 1=personalInfo, 2=idScan, 3=selfie, 4=verifying, 5=result
  int _currentStep = 0;
  String? _selectedDocumentType;
  XFile? _frontImage;
  XFile? _backImage;
  XFile? _selfieImage;
  bool _isLoading = false;
  String? _errorMessage;
  String _kycStatus = 'PENDING';
  String? _verificationMethod;

  // Personal info fields
  final _dobController = TextEditingController();
  final _addressController = TextEditingController();
  final _streetController = TextEditingController();
  final _cityController = TextEditingController();
  final _postalCodeController = TextEditingController();
  final _idNumberController = TextEditingController();
  final _idExpiryController = TextEditingController();
  String _selectedGender = 'M';
  DateTime? _selectedDob;
  DateTime? _selectedIdExpiry;

  // Verification progress
  int _verifyStep = 0; // 0=uploading, 1=liveness, 2=faceMatch, 3=ocr, 4=done
  final List<String> _verifyLabels = [
    'Upload des documents...',
    'Verification de vitalite...',
    'Comparaison faciale...',
    'Analyse du document...',
    'Finalisation...',
  ];

  late final AnimationController _scanController;
  late final AnimationController _pulseController;

  static const _primaryBlue = Color(0xFF258CF4);

  final Map<String, Map<String, dynamic>> _documentTypes = {
    'id_card': {
      'label': "Carte Nationale d'Identite",
      'subtitle': 'Format carte ou papier',
      'icon': Icons.badge_outlined,
    },
    'passport': {
      'label': 'Passeport',
      'subtitle': 'Tous les pays acceptes',
      'icon': Icons.menu_book_outlined,
    },
    'driver_license': {
      'label': 'Permis de conduire',
      'subtitle': 'Format europeen',
      'icon': Icons.directions_car_outlined,
    },
  };

  @override
  void initState() {
    super.initState();
    _scanController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _scanController.dispose();
    _pulseController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _postalCodeController.dispose();
    _idNumberController.dispose();
    _idExpiryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    switch (_currentStep) {
      case 0:
        return _buildStep0DocumentSelect();
      case 1:
        return _buildStep1PersonalInfo();
      case 2:
        return _buildStep2IdScan();
      case 3:
        return _buildStep3Selfie();
      case 4:
        return _buildStep4Verifying();
      default:
        return _buildStep5Result();
    }
  }

  // ─── Step 0: Document Type Selection ───

  Widget _buildStep0DocumentSelect() {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            _buildNavBar(
              title: "Verification d'identite",
              onBack: () => Navigator.of(context).pop(),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 24),
                    _buildProgressBar(step: 1, total: 4),
                    const SizedBox(height: 32),
                    const Text(
                      'Choisissez votre document',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Selectionnez le type de document que vous souhaitez scanner pour verifier votre identite.',
                      style: TextStyle(fontSize: 14, color: Colors.grey[500], height: 1.5),
                    ),
                    const SizedBox(height: 24),
                    ..._documentTypes.entries.map((entry) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: _buildDocumentCard(
                          type: entry.key,
                          label: entry.value['label'] as String,
                          subtitle: entry.value['subtitle'] as String,
                          icon: entry.value['icon'] as IconData,
                        ),
                      );
                    }),
                    const Spacer(),
                    Center(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.lock_outlined, size: 18, color: Colors.grey[400]),
                          const SizedBox(width: 8),
                          Text(
                            'Vos donnees sont cryptees et securisees',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey[400]),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
            _buildStickyButton(
              text: 'Continuer',
              onPressed: _selectedDocumentType != null
                  ? () => setState(() => _currentStep = 1)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDocumentCard({
    required String type,
    required String label,
    required String subtitle,
    required IconData icon,
  }) {
    final isSelected = _selectedDocumentType == type;
    return GestureDetector(
      onTap: () => setState(() => _selectedDocumentType = type),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? _primaryBlue.withValues(alpha: 0.05) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? _primaryBlue : const Color(0xFFE5E7EB),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 48, height: 48,
              decoration: BoxDecoration(
                color: isSelected ? _primaryBlue.withValues(alpha: 0.1) : const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: _primaryBlue, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                  const SizedBox(height: 2),
                  Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                ],
              ),
            ),
            Container(
              width: 24, height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? _primaryBlue : Colors.transparent,
                border: Border.all(color: isSelected ? _primaryBlue : const Color(0xFFD1D5DB), width: 2),
              ),
              child: isSelected ? const Center(child: Icon(Icons.circle, color: Colors.white, size: 10)) : null,
            ),
          ],
        ),
      ),
    );
  }

  // ─── Step 1: Personal Info ───

  Widget _buildStep1PersonalInfo() {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            _buildNavBar(
              title: 'Informations personnelles',
              onBack: () => setState(() => _currentStep = 0),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 24),
                    _buildProgressBar(step: 2, total: 4),
                    const SizedBox(height: 24),
                    const Text(
                      'Vos informations',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Ces informations sont necessaires pour la verification de votre identite.',
                      style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                    ),
                    const SizedBox(height: 24),

                    // Date of birth
                    _buildFormLabel('Date de naissance'),
                    GestureDetector(
                      onTap: _pickDob,
                      child: AbsorbPointer(
                        child: _buildTextField(
                          controller: _dobController,
                          hint: 'JJ/MM/AAAA',
                          icon: Icons.calendar_today,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Gender
                    _buildFormLabel('Genre'),
                    Row(
                      children: [
                        _buildGenderChip('M', 'Masculin'),
                        const SizedBox(width: 12),
                        _buildGenderChip('F', 'Feminin'),
                        const SizedBox(width: 12),
                        _buildGenderChip('OTHER', 'Autre'),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Address
                    _buildFormLabel('Adresse'),
                    _buildTextField(controller: _addressController, hint: 'Adresse complete'),
                    const SizedBox(height: 16),

                    // Street
                    _buildFormLabel('Rue'),
                    _buildTextField(controller: _streetController, hint: 'Nom de la rue'),
                    const SizedBox(height: 16),

                    // City + Postal code
                    Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildFormLabel('Ville'),
                              _buildTextField(controller: _cityController, hint: 'Ville'),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildFormLabel('Code postal'),
                              _buildTextField(controller: _postalCodeController, hint: '00000'),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // ID number
                    _buildFormLabel('Numero de piece'),
                    _buildTextField(controller: _idNumberController, hint: 'Numero du document'),
                    const SizedBox(height: 16),

                    // ID expiry
                    _buildFormLabel("Date d'expiration"),
                    GestureDetector(
                      onTap: _pickIdExpiry,
                      child: AbsorbPointer(
                        child: _buildTextField(
                          controller: _idExpiryController,
                          hint: 'JJ/MM/AAAA',
                          icon: Icons.calendar_today,
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
            _buildStickyButton(
              text: 'Continuer',
              onPressed: _isPersonalInfoValid()
                  ? () => setState(() => _currentStep = 2)
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  bool _isPersonalInfoValid() {
    return _selectedDob != null &&
        _addressController.text.isNotEmpty &&
        _streetController.text.isNotEmpty &&
        _cityController.text.isNotEmpty &&
        _postalCodeController.text.isNotEmpty &&
        _idNumberController.text.isNotEmpty &&
        _selectedIdExpiry != null;
  }

  Widget _buildFormLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF374151)),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    IconData? icon,
  }) {
    return TextField(
      controller: controller,
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey[400]),
        suffixIcon: icon != null ? Icon(icon, color: Colors.grey[400], size: 20) : null,
        filled: true,
        fillColor: const Color(0xFFF9FAFB),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: _primaryBlue, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }

  Widget _buildGenderChip(String value, String label) {
    final isSelected = _selectedGender == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedGender = value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? _primaryBlue.withValues(alpha: 0.1) : const Color(0xFFF9FAFB),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? _primaryBlue : const Color(0xFFE5E7EB),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: isSelected ? _primaryBlue : const Color(0xFF6B7280),
          ),
        ),
      ),
    );
  }

  Future<void> _pickDob() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 25),
      firstDate: DateTime(1920),
      lastDate: DateTime(now.year - 16),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(primary: _primaryBlue),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _selectedDob = picked;
        _dobController.text = '${picked.day.toString().padLeft(2, '0')}/${picked.month.toString().padLeft(2, '0')}/${picked.year}';
      });
    }
  }

  Future<void> _pickIdExpiry() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year + 2),
      firstDate: now,
      lastDate: DateTime(now.year + 20),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(primary: _primaryBlue),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        _selectedIdExpiry = picked;
        _idExpiryController.text = '${picked.day.toString().padLeft(2, '0')}/${picked.month.toString().padLeft(2, '0')}/${picked.year}';
      });
    }
  }

  // ─── Step 2: ID Document Scan ───

  Widget _buildStep2IdScan() {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildCircleButton(
                        icon: Icons.chevron_left,
                        onTap: () => setState(() => _currentStep = 1),
                      ),
                      _buildCircleButton(icon: Icons.flash_off, onTap: () {}),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                _buildDarkProgressBar(step: 3, total: 4),
                const Spacer(),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 32),
                  child: Text(
                    "Placez votre piece d'identite dans le cadre",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20, fontWeight: FontWeight.w600, color: Colors.white,
                      shadows: [Shadow(color: Colors.black54, blurRadius: 8)],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                _buildScanFrame(),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _frontImage == null ? 'Recto' : 'Verso',
                    style: TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w500,
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ),
                const Spacer(),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 48),
                  child: Text(
                    "Assurez-vous que l'image est nette et sans reflets.",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.6)),
                  ),
                ),
                const SizedBox(height: 24),
                _buildCameraControls(
                  onShutter: () => _pickIdImage(ImageSource.camera),
                  onGallery: () => _pickIdImage(ImageSource.gallery),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScanFrame() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: AspectRatio(
        aspectRatio: 1.58,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withValues(alpha: 0.3), width: 2),
            color: Colors.white.withValues(alpha: 0.05),
          ),
          child: Stack(
            children: [
              ..._buildCornerBrackets(),
              AnimatedBuilder(
                animation: _scanController,
                builder: (context, _) {
                  return Positioned(
                    left: 0, right: 0,
                    top: _scanController.value * 180,
                    child: Container(
                      height: 2,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(colors: [
                          _primaryBlue.withValues(alpha: 0.0),
                          _primaryBlue.withValues(alpha: 0.8),
                          _primaryBlue.withValues(alpha: 0.0),
                        ]),
                      ),
                    ),
                  );
                },
              ),
              Center(child: Icon(Icons.crop_free, size: 56, color: Colors.white.withValues(alpha: 0.15))),
              if (_frontImage != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.file(File(_frontImage!.path), fit: BoxFit.cover, width: double.infinity, height: double.infinity),
                ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildCornerBrackets() {
    const color = _primaryBlue;
    return [
      Positioned(top: 0, left: 0, child: Container(width: 32, height: 32, decoration: const BoxDecoration(border: Border(top: BorderSide(color: color, width: 4), left: BorderSide(color: color, width: 4)), borderRadius: BorderRadius.only(topLeft: Radius.circular(8))))),
      Positioned(top: 0, right: 0, child: Container(width: 32, height: 32, decoration: const BoxDecoration(border: Border(top: BorderSide(color: color, width: 4), right: BorderSide(color: color, width: 4)), borderRadius: BorderRadius.only(topRight: Radius.circular(8))))),
      Positioned(bottom: 0, left: 0, child: Container(width: 32, height: 32, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: color, width: 4), left: BorderSide(color: color, width: 4)), borderRadius: BorderRadius.only(bottomLeft: Radius.circular(8))))),
      Positioned(bottom: 0, right: 0, child: Container(width: 32, height: 32, decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: color, width: 4), right: BorderSide(color: color, width: 4)), borderRadius: BorderRadius.only(bottomRight: Radius.circular(8))))),
    ];
  }

  Future<void> _pickIdImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source, maxWidth: 1920, maxHeight: 1080, imageQuality: 85,
      );
      if (image == null) return;

      if (_frontImage == null) {
        setState(() => _frontImage = image);
        final needsBack = _selectedDocumentType == 'id_card' || _selectedDocumentType == 'driver_license';
        if (needsBack && _backImage == null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Recto capture. Prenez maintenant le verso.'),
              backgroundColor: _primaryBlue,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        } else {
          setState(() => _currentStep = 3);
        }
      } else {
        setState(() {
          _backImage = image;
          _currentStep = 3;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    }
  }

  // ─── Step 3: Selfie / Liveness ───

  Widget _buildStep3Selfie() {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildNavCircleButton(icon: Icons.chevron_left, onTap: () => setState(() => _currentStep = 2)),
                      Text('Etape 4 sur 4', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.grey[500])),
                      _buildNavCircleButton(icon: Icons.close, onTap: () => Navigator.of(context).pop()),
                    ],
                  ),
                  const SizedBox(height: 24),
                  _buildProgressBar(step: 4, total: 4),
                ],
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildSelfieFrame(),
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.light_mode, color: Color(0xFFF59E0B), size: 16),
                          const SizedBox(width: 8),
                          Text('Eclairage optimal detecte', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey[600])),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: Column(
                children: [
                  const Text('Verification de vitalite', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  const SizedBox(height: 8),
                  Text('Regardez la camera et souriez', style: TextStyle(fontSize: 16, color: Colors.grey[500])),
                  const SizedBox(height: 24),
                  GestureDetector(
                    onTap: _isLoading ? null : _takeSelfie,
                    child: Container(
                      width: 72, height: 72,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 4),
                      ),
                      child: Center(
                        child: Container(
                          width: 56, height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _isLoading ? Colors.grey : _primaryBlue,
                          ),
                          child: _isLoading
                              ? const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5)))
                              : null,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.lock, size: 14, color: Colors.grey[400]),
                      const SizedBox(width: 6),
                      Text('Crypte de bout en bout', style: TextStyle(fontSize: 12, color: Colors.grey[400])),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelfieFrame() {
    return SizedBox(
      width: 240, height: 240,
      child: Stack(
        alignment: Alignment.center,
        children: [
          AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              final scale = 1.0 + (_pulseController.value * 0.02);
              final opacity = 1.0 - (_pulseController.value * 0.5);
              return Transform.scale(
                scale: scale,
                child: Opacity(
                  opacity: opacity,
                  child: Container(
                    width: 240, height: 240,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: _primaryBlue.withValues(alpha: 0.2), width: 2),
                    ),
                  ),
                ),
              );
            },
          ),
          AnimatedBuilder(
            animation: _scanController,
            builder: (context, child) {
              return Transform.rotate(
                angle: _scanController.value * 2 * math.pi,
                child: CustomPaint(
                  size: const Size(230, 230),
                  painter: _DashedCirclePainter(color: _primaryBlue.withValues(alpha: 0.3)),
                ),
              );
            },
          ),
          Container(
            width: 210, height: 210,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF0F172A),
              border: Border.all(color: Colors.white, width: 4),
              boxShadow: [BoxShadow(color: _primaryBlue.withValues(alpha: 0.3), blurRadius: 16)],
            ),
            child: ClipOval(
              child: _selfieImage != null
                  ? Image.file(File(_selfieImage!.path), fit: BoxFit.cover)
                  : Icon(Icons.face, size: 80, color: Colors.white.withValues(alpha: 0.15)),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _takeSelfie() async {
    try {
      final XFile? image = await _picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        maxWidth: 1080, maxHeight: 1080, imageQuality: 85,
      );
      if (image == null) return;
      setState(() => _selfieImage = image);
      await _submitKyc();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Erreur: $e')));
      }
    }
  }

  // ─── Step 4: Verification Progress ───

  Widget _buildStep4Verifying() {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Animated spinner
              SizedBox(
                width: 80, height: 80,
                child: CircularProgressIndicator(
                  strokeWidth: 4,
                  color: _primaryBlue,
                  backgroundColor: _primaryBlue.withValues(alpha: 0.1),
                ),
              ),
              const SizedBox(height: 32),
              const Text(
                'Verification en cours...',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 12),
              Text(
                'Veuillez patienter pendant que nous verifions votre identite.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: Colors.grey[500], height: 1.5),
              ),
              const SizedBox(height: 40),

              // Step checklist
              ...List.generate(_verifyLabels.length, (i) {
                final isDone = i < _verifyStep;
                final isCurrent = i == _verifyStep;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Row(
                    children: [
                      Container(
                        width: 28, height: 28,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isDone
                              ? const Color(0xFF22C55E)
                              : isCurrent
                                  ? _primaryBlue
                                  : const Color(0xFFF3F4F6),
                        ),
                        child: Center(
                          child: isDone
                              ? const Icon(Icons.check, color: Colors.white, size: 16)
                              : isCurrent
                                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                  : Text('${i + 1}', style: TextStyle(fontSize: 12, color: Colors.grey[400])),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        _verifyLabels[i],
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isCurrent ? FontWeight.w600 : FontWeight.w400,
                          color: isDone
                              ? const Color(0xFF22C55E)
                              : isCurrent
                                  ? const Color(0xFF0F172A)
                                  : Colors.grey[400],
                        ),
                      ),
                    ],
                  ),
                );
              }),

              const Spacer(),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.shield_outlined, size: 16, color: Colors.grey[400]),
                  const SizedBox(width: 8),
                  Text('Verification securisee par IA', style: TextStyle(fontSize: 12, color: Colors.grey[400])),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Step 5: Result ───

  Widget _buildStep5Result() {
    Color statusColor;
    IconData statusIcon;
    String statusText;
    String statusMessage;

    switch (_kycStatus) {
      case 'APPROVED':
        statusColor = const Color(0xFF22C55E);
        statusIcon = Icons.check_circle;
        statusText = 'Approuve';
        statusMessage = 'Votre identite a ete verifiee automatiquement. Vous pouvez utiliser tous les services.';
        break;
      case 'REJECTED':
        statusColor = const Color(0xFFEF4444);
        statusIcon = Icons.cancel;
        statusText = 'Rejete';
        statusMessage = 'Votre demande a ete rejetee. Veuillez soumettre de nouveaux documents.';
        break;
      default:
        statusColor = const Color(0xFFF59E0B);
        statusIcon = Icons.pending;
        if (_verificationMethod == 'manual_review') {
          statusText = 'En cours d\'examen';
          statusMessage = 'Votre demande est en cours d\'examen par notre equipe. Delai: 24-48h.';
        } else {
          statusText = 'En attente de verification';
          statusMessage = 'Votre demande a ete soumise. Notre equipe examinera vos documents sous 24-48 heures.';
        }
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              Icon(statusIcon, size: 96, color: statusColor),
              const SizedBox(height: 32),
              Text(
                statusText,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 16),
              Text(
                statusMessage,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, color: Colors.grey[500], height: 1.5),
              ),
              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red, size: 20),
                      const SizedBox(width: 12),
                      Expanded(child: Text(_errorMessage!, style: const TextStyle(color: Colors.red, fontSize: 13))),
                    ],
                  ),
                ),
              ],
              const Spacer(),
              SizedBox(
                width: double.infinity, height: 56,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pushReplacementNamed('/main'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                    textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  child: const Text('Continuer'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── Submit KYC ───

  Future<void> _submitKyc() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _currentStep = 4; // Show verification progress
      _verifyStep = 0;
    });

    try {
      // Step 0: Upload files
      String? frontUrl;
      String? backUrl;
      String? selfieUrl;

      if (_frontImage != null) {
        frontUrl = await _apiService.uploadKycFile(
          filePath: _frontImage!.path,
          documentType: _selectedDocumentType!,
          side: 'front',
        );
      }

      if (_backImage != null) {
        backUrl = await _apiService.uploadKycFile(
          filePath: _backImage!.path,
          documentType: _selectedDocumentType!,
          side: 'back',
        );
      }

      // Upload selfie (this was the missing critical bug)
      if (_selfieImage != null) {
        selfieUrl = await _apiService.uploadKycFile(
          filePath: _selfieImage!.path,
          documentType: _selectedDocumentType!,
          side: 'selfie',
        );
      }

      if (frontUrl == null || selfieUrl == null) {
        throw Exception("Erreur lors de l'upload des documents");
      }

      if (mounted) setState(() => _verifyStep = 1);

      // Step 1-4: Submit KYC (backend runs liveness, face match, OCR)
      final result = await _apiService.submitKyc(
        dob: '${_selectedDob!.year}-${_selectedDob!.month.toString().padLeft(2, '0')}-${_selectedDob!.day.toString().padLeft(2, '0')}',
        gender: _selectedGender,
        address: _addressController.text,
        street: _streetController.text,
        city: _cityController.text,
        postalCode: _postalCodeController.text,
        documentType: _selectedDocumentType!,
        idProofNo: _idNumberController.text,
        idProofExpiry: '${_selectedIdExpiry!.year}-${_selectedIdExpiry!.month.toString().padLeft(2, '0')}-${_selectedIdExpiry!.day.toString().padLeft(2, '0')}',
        documentFrontUrl: frontUrl,
        documentBackUrl: backUrl,
        selfieUrl: selfieUrl,
      );

      // Animate through remaining verification steps
      for (int i = 2; i <= 4; i++) {
        if (mounted) {
          setState(() => _verifyStep = i);
          await Future.delayed(const Duration(milliseconds: 500));
        }
      }

      final status = result['kyc_status'] ?? 'PENDING';
      final method = result['kyc_verification_method'];

      setState(() {
        _isLoading = false;
        _kycStatus = status;
        _verificationMethod = method;
        _currentStep = 5; // Show result
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
        _kycStatus = 'PENDING';
        _currentStep = 5;
      });
    }
  }

  // ─── Shared Widgets ───

  Widget _buildNavBar({required String title, required VoidCallback onBack}) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.grey[100]!))),
      child: Row(
        children: [
          IconButton(icon: const Icon(Icons.chevron_left, color: _primaryBlue), onPressed: onBack),
          Expanded(
            child: Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
          ),
          const SizedBox(width: 48),
        ],
      ),
    );
  }

  Widget _buildProgressBar({required int step, required int total}) {
    final percent = ((step / total) * 100).round();
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Etape $step sur $total', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: _primaryBlue)),
            Text('$percent%', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.grey[500])),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: step / total,
            backgroundColor: const Color(0xFFF3F4F6),
            valueColor: const AlwaysStoppedAnimation<Color>(_primaryBlue),
            minHeight: 8,
          ),
        ),
      ],
    );
  }

  Widget _buildDarkProgressBar({required int step, required int total}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: List.generate(total, (i) {
          final isCompleted = i < step - 1;
          final isCurrent = i == step - 1;
          return Expanded(
            child: Container(
              margin: EdgeInsets.only(right: i < total - 1 ? 8 : 0),
              height: 6,
              decoration: BoxDecoration(
                color: isCurrent
                    ? _primaryBlue
                    : isCompleted
                        ? Colors.white.withValues(alpha: 0.5)
                        : Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildStickyButton({required String text, VoidCallback? onPressed}) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        border: Border(top: BorderSide(color: Colors.grey[100]!)),
      ),
      child: SizedBox(
        width: double.infinity, height: 52,
        child: ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: _primaryBlue,
            disabledBackgroundColor: _primaryBlue.withValues(alpha: 0.4),
            foregroundColor: Colors.white,
            disabledForegroundColor: Colors.white70,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0,
            textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
          ),
          child: Text(text),
        ),
      ),
    );
  }

  Widget _buildCircleButton({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44, height: 44,
        decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.1)),
        child: Icon(icon, color: Colors.white, size: 24),
      ),
    );
  }

  Widget _buildNavCircleButton({required IconData icon, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40, height: 40,
        decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.transparent, border: Border.all(color: Colors.transparent)),
        child: Icon(icon, color: Colors.grey[600], size: 24),
      ),
    );
  }

  Widget _buildCameraControls({required VoidCallback onShutter, required VoidCallback onGallery}) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          GestureDetector(
            onTap: onGallery,
            child: Container(
              width: 52, height: 52,
              decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.1)),
              child: const Icon(Icons.photo_library, color: Colors.white, size: 24),
            ),
          ),
          const SizedBox(width: 32),
          GestureDetector(
            onTap: onShutter,
            child: Container(
              width: 80, height: 80,
              decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 4)),
              child: Center(child: Container(width: 64, height: 64, decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white))),
            ),
          ),
          const SizedBox(width: 32),
          GestureDetector(
            onTap: () {},
            child: Container(
              width: 52, height: 52,
              decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withValues(alpha: 0.1)),
              child: const Icon(Icons.help_outline, color: Colors.white, size: 24),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Dashed Circle Painter ───

class _DashedCirclePainter extends CustomPainter {
  final Color color;
  _DashedCirclePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    const dashCount = 24;
    const dashArc = (2 * math.pi) / dashCount;
    const gapRatio = 0.6;

    for (int i = 0; i < dashCount; i++) {
      final startAngle = i * dashArc;
      const sweepAngle = dashArc * (1 - gapRatio);
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle, sweepAngle, false, paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
