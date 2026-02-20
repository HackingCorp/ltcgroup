import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert';
import 'dart:math' as math;
import 'package:http/http.dart' as http;
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../config/api_config.dart';

class KycScreen extends StatefulWidget {
  const KycScreen({super.key});

  @override
  State<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends State<KycScreen> with TickerProviderStateMixin {
  final ImagePicker _picker = ImagePicker();
  final ApiService _apiService = ApiService();

  int _currentStep = 0;
  String? _selectedDocumentType;
  XFile? _frontImage;
  XFile? _backImage;
  XFile? _selfieImage;
  bool _isLoading = false;
  String? _errorMessage;
  String _kycStatus = 'PENDING';

  late final AnimationController _scanController;
  late final AnimationController _pulseController;

  static const _primaryBlue = Color(0xFF258CF4);

  final Map<String, Map<String, dynamic>> _documentTypes = {
    'id_card': {
      'label': "Carte Nationale d'Identité",
      'subtitle': 'Format carte ou papier',
      'icon': Icons.badge_outlined,
    },
    'passport': {
      'label': 'Passeport',
      'subtitle': 'Tous les pays acceptés',
      'icon': Icons.menu_book_outlined,
    },
    'driver_license': {
      'label': 'Permis de conduire',
      'subtitle': 'Format européen',
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    switch (_currentStep) {
      case 0:
        return _buildStep1DocumentSelect();
      case 1:
        return _buildStep2IdScan();
      case 2:
        return _buildStep3Selfie();
      default:
        return _buildStep4Result();
    }
  }

  // ─── Step 1: Document Type Selection ───

  Widget _buildStep1DocumentSelect() {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // Nav bar
            _buildNavBar(
              title: "Vérification d'identité",
              onBack: () => Navigator.of(context).pop(),
            ),

            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 24),
                    // Progress
                    _buildProgressBar(step: 1, total: 3),
                    const SizedBox(height: 32),

                    // Header
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
                      'Nous avons besoin de vérifier votre identité pour sécuriser votre compte LTC Pay. Veuillez sélectionner le type de document que vous souhaitez scanner.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[500],
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Document cards
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

                    // Trust badge
                    Center(
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.lock_outlined, size: 18, color: Colors.grey[400]),
                          const SizedBox(width: 8),
                          Text(
                            'Vos données sont cryptées et sécurisées',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey[400],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),

            // Sticky button
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
          boxShadow: [
            BoxShadow(
              color: isSelected
                  ? _primaryBlue.withValues(alpha: 0.08)
                  : Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            // Icon container
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isSelected
                    ? _primaryBlue.withValues(alpha: 0.1)
                    : const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: _primaryBlue, size: 24),
            ),
            const SizedBox(width: 16),
            // Text
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
            // Radio indicator
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? _primaryBlue : Colors.transparent,
                border: Border.all(
                  color: isSelected ? _primaryBlue : const Color(0xFFD1D5DB),
                  width: 2,
                ),
              ),
              child: isSelected
                  ? const Center(
                      child: Icon(Icons.circle, color: Colors.white, size: 10),
                    )
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  // ─── Step 2: ID Document Scan ───

  Widget _buildStep2IdScan() {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Dark overlay with scanning UI
          SafeArea(
            child: Column(
              children: [
                // Top bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildCircleButton(
                        icon: Icons.chevron_left,
                        onTap: () => setState(() => _currentStep = 0),
                      ),
                      _buildCircleButton(
                        icon: Icons.flash_off,
                        onTap: () {},
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Progress bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          // Step 1: completed
                          Expanded(
                            child: Container(
                              height: 6,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Step 2: active
                          Expanded(
                            child: Container(
                              height: 6,
                              decoration: BoxDecoration(
                                color: _primaryBlue,
                                borderRadius: BorderRadius.circular(3),
                                boxShadow: [
                                  BoxShadow(
                                    color: _primaryBlue.withValues(alpha: 0.6),
                                    blurRadius: 10,
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Step 3: pending
                          Expanded(
                            child: Container(
                              height: 6,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Info Perso.',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Colors.white.withValues(alpha: 0.8),
                            ),
                          ),
                          const Text(
                            'Scan ID',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: _primaryBlue,
                            ),
                          ),
                          Text(
                            'Selfie',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Colors.white.withValues(alpha: 0.4),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                // Instruction
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 32),
                  child: Text(
                    "Placez votre pièce d'identité dans le cadre",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                      shadows: [
                        Shadow(color: Colors.black54, blurRadius: 8),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // Scanning frame
                _buildScanFrame(),

                const SizedBox(height: 16),

                // Recto / Verso pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.3),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Recto / Verso',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.white.withValues(alpha: 0.8),
                      letterSpacing: 0.5,
                    ),
                  ),
                ),

                const Spacer(),

                // Bottom hint
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 48),
                  child: Text(
                    "Assurez-vous que l'image est nette et sans reflets.",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withValues(alpha: 0.6),
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                // Shutter + gallery + help buttons
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
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.3),
              width: 2,
            ),
            color: Colors.white.withValues(alpha: 0.05),
          ),
          child: Stack(
            children: [
              // Corner brackets
              ..._buildCornerBrackets(),

              // Scan line
              AnimatedBuilder(
                animation: _scanController,
                builder: (context, _) {
                  return Positioned(
                    left: 0,
                    right: 0,
                    top: _scanController.value * 180,
                    child: Container(
                      height: 2,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            _primaryBlue.withValues(alpha: 0.0),
                            _primaryBlue.withValues(alpha: 0.8),
                            _primaryBlue.withValues(alpha: 0.0),
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: _primaryBlue.withValues(alpha: 0.6),
                            blurRadius: 12,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),

              // Center hint icon
              Center(
                child: Icon(
                  Icons.crop_free,
                  size: 56,
                  color: Colors.white.withValues(alpha: 0.15),
                ),
              ),

              // Show captured front image if available
              if (_frontImage != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: Image.file(
                    File(_frontImage!.path),
                    fit: BoxFit.cover,
                    width: double.infinity,
                    height: double.infinity,
                  ),
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
      // Top-left
      Positioned(
        top: 0, left: 0,
        child: Container(
          width: 32, height: 32,
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: color, width: 4),
              left: BorderSide(color: color, width: 4),
            ),
            borderRadius: BorderRadius.only(topLeft: Radius.circular(8)),
          ),
        ),
      ),
      // Top-right
      Positioned(
        top: 0, right: 0,
        child: Container(
          width: 32, height: 32,
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: color, width: 4),
              right: BorderSide(color: color, width: 4),
            ),
            borderRadius: BorderRadius.only(topRight: Radius.circular(8)),
          ),
        ),
      ),
      // Bottom-left
      Positioned(
        bottom: 0, left: 0,
        child: Container(
          width: 32, height: 32,
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: color, width: 4),
              left: BorderSide(color: color, width: 4),
            ),
            borderRadius: BorderRadius.only(bottomLeft: Radius.circular(8)),
          ),
        ),
      ),
      // Bottom-right
      Positioned(
        bottom: 0, right: 0,
        child: Container(
          width: 32, height: 32,
          decoration: const BoxDecoration(
            border: Border(
              bottom: BorderSide(color: color, width: 4),
              right: BorderSide(color: color, width: 4),
            ),
            borderRadius: BorderRadius.only(bottomRight: Radius.circular(8)),
          ),
        ),
      ),
    ];
  }

  Future<void> _pickIdImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );
      if (image == null) return;

      if (_frontImage == null) {
        setState(() => _frontImage = image);
        // If document needs back, show message
        final needsBack = _selectedDocumentType == 'id_card' ||
            _selectedDocumentType == 'driver_license';
        if (needsBack && _backImage == null && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Recto capturé. Prenez maintenant le verso.'),
              backgroundColor: _primaryBlue,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        } else {
          // Passport only needs front, advance
          setState(() => _currentStep = 2);
        }
      } else {
        setState(() {
          _backImage = image;
          _currentStep = 2;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
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
            // Nav + Progress
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildNavCircleButton(
                        icon: Icons.chevron_left,
                        onTap: () => setState(() => _currentStep = 1),
                      ),
                      Text(
                        'Étape 3 sur 3',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: Colors.grey[500],
                        ),
                      ),
                      _buildNavCircleButton(
                        icon: Icons.close,
                        onTap: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Progress bar
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 6,
                          decoration: BoxDecoration(
                            color: _primaryBlue.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          height: 6,
                          decoration: BoxDecoration(
                            color: _primaryBlue.withValues(alpha: 0.3),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          height: 6,
                          decoration: BoxDecoration(
                            color: _primaryBlue,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Camera area
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Circular camera frame
                    _buildSelfieFrame(),

                    const SizedBox(height: 24),

                    // Lighting tip
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
                          Text(
                            'Éclairage optimal détecté',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Bottom instructions + capture button
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
              child: Column(
                children: [
                  const Text(
                    'Vérification de vitalité',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Regardez la caméra et souriez',
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.grey[500],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Shutter button
                  GestureDetector(
                    onTap: _isLoading ? null : _takeSelfie,
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: const Color(0xFFE2E8F0),
                          width: 4,
                        ),
                      ),
                      child: Center(
                        child: Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _isLoading ? Colors.grey : _primaryBlue,
                            boxShadow: [
                              BoxShadow(
                                color: _primaryBlue.withValues(alpha: 0.3),
                                blurRadius: 12,
                              ),
                            ],
                          ),
                          child: _isLoading
                              ? const Center(
                                  child: SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2.5,
                                    ),
                                  ),
                                )
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
                      Text(
                        'Crypté de bout en bout',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[400],
                        ),
                      ),
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
      width: 240,
      height: 240,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // Outer pulsating ring
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
                    width: 240,
                    height: 240,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: _primaryBlue.withValues(alpha: 0.2),
                        width: 2,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),

          // Spinning dashed circle (decorative)
          AnimatedBuilder(
            animation: _scanController,
            builder: (context, child) {
              return Transform.rotate(
                angle: _scanController.value * 2 * math.pi,
                child: CustomPaint(
                  size: const Size(230, 230),
                  painter: _DashedCirclePainter(
                    color: _primaryBlue.withValues(alpha: 0.3),
                  ),
                ),
              );
            },
          ),

          // Camera viewport circle
          Container(
            width: 210,
            height: 210,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF0F172A),
              border: Border.all(color: Colors.white, width: 4),
              boxShadow: [
                BoxShadow(
                  color: _primaryBlue.withValues(alpha: 0.3),
                  blurRadius: 16,
                ),
              ],
            ),
            child: ClipOval(
              child: _selfieImage != null
                  ? Image.file(
                      File(_selfieImage!.path),
                      fit: BoxFit.cover,
                    )
                  : Stack(
                      alignment: Alignment.center,
                      children: [
                        // Face guide silhouette
                        Icon(
                          Icons.face,
                          size: 80,
                          color: Colors.white.withValues(alpha: 0.15),
                        ),
                        // Scan line
                        AnimatedBuilder(
                          animation: _scanController,
                          builder: (context, _) {
                            return Positioned(
                              top: _scanController.value * 200,
                              left: 0,
                              right: 0,
                              child: Container(
                                height: 2,
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      _primaryBlue.withValues(alpha: 0.0),
                                      _primaryBlue.withValues(alpha: 0.5),
                                      _primaryBlue.withValues(alpha: 0.0),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
            ),
          ),

          // Active dots
          Positioned(
            top: 0,
            child: Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _primaryBlue,
                boxShadow: [
                  BoxShadow(
                    color: _primaryBlue.withValues(alpha: 0.8),
                    blurRadius: 8,
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: 0,
            child: Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _primaryBlue,
                boxShadow: [
                  BoxShadow(
                    color: _primaryBlue.withValues(alpha: 0.8),
                    blurRadius: 8,
                  ),
                ],
              ),
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
        maxWidth: 1080,
        maxHeight: 1080,
        imageQuality: 85,
      );
      if (image == null) return;

      setState(() => _selfieImage = image);

      // Submit KYC
      await _submitKyc();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur: $e')),
        );
      }
    }
  }

  // ─── Step 4: Result ───

  Widget _buildStep4Result() {
    Color statusColor;
    IconData statusIcon;
    String statusText;
    String statusMessage;

    switch (_kycStatus) {
      case 'APPROVED':
        statusColor = const Color(0xFF22C55E);
        statusIcon = Icons.check_circle;
        statusText = 'Approuvé';
        statusMessage =
            'Félicitations ! Votre identité a été vérifiée. Vous pouvez maintenant utiliser tous nos services.';
        break;
      case 'REJECTED':
        statusColor = const Color(0xFFEF4444);
        statusIcon = Icons.cancel;
        statusText = 'Rejeté';
        statusMessage =
            'Votre demande a été rejetée. Veuillez soumettre de nouveaux documents.';
        break;
      default:
        statusColor = const Color(0xFFF59E0B);
        statusIcon = Icons.pending;
        statusText = 'En attente de vérification';
        statusMessage =
            'Votre demande a été soumise avec succès. Notre équipe examinera vos documents sous 24-48 heures.';
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
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                statusMessage,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  color: Colors.grey[500],
                  height: 1.5,
                ),
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
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Colors.red, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const Spacer(),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacementNamed('/main');
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 0,
                    textStyle: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                    ),
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
    });

    try {
      String? documentUrl;

      if (_frontImage != null) {
        documentUrl = await _uploadFile(_frontImage!.path, 'front');
      }

      if (_backImage != null && _selectedDocumentType != 'passport') {
        await _uploadFile(_backImage!.path, 'back');
      }

      if (documentUrl == null) {
        throw Exception("Erreur lors de l'upload des documents");
      }

      await _apiService.submitKyc(
        documentUrl: documentUrl,
        documentType: _selectedDocumentType!,
      );

      setState(() {
        _isLoading = false;
        _kycStatus = 'PENDING';
        _currentStep = 3;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
        _kycStatus = 'PENDING';
        _currentStep = 3;
      });
    }
  }

  Future<String> _uploadFile(String filePath, String side) async {
    final uri = Uri.parse('${ApiConfig.baseUrl}/uploads/kyc');
    final token = await StorageService().getToken();

    final request = http.MultipartRequest('POST', uri)
      ..headers['Authorization'] = 'Bearer $token'
      ..fields['document_type'] = _selectedDocumentType!
      ..fields['side'] = side
      ..files.add(await http.MultipartFile.fromPath('file', filePath));

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = json.decode(response.body);
      return data['url'] as String;
    } else {
      throw Exception("Erreur lors de l'upload du fichier");
    }
  }

  // ─── Shared Widgets ───

  Widget _buildNavBar({
    required String title,
    required VoidCallback onBack,
  }) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey[100]!)),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.chevron_left, color: _primaryBlue),
            onPressed: onBack,
          ),
          Expanded(
            child: Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Color(0xFF0F172A),
              ),
            ),
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
            Text(
              'Étape $step sur $total',
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: _primaryBlue,
              ),
            ),
            Text(
              '$percent%',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: Colors.grey[500],
              ),
            ),
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

  Widget _buildStickyButton({
    required String text,
    VoidCallback? onPressed,
  }) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.9),
        border: Border(top: BorderSide(color: Colors.grey[100]!)),
      ),
      child: SizedBox(
        width: double.infinity,
        height: 52,
        child: ElevatedButton(
          onPressed: onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: _primaryBlue,
            disabledBackgroundColor: _primaryBlue.withValues(alpha: 0.4),
            foregroundColor: Colors.white,
            disabledForegroundColor: Colors.white70,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            elevation: 0,
            shadowColor: _primaryBlue.withValues(alpha: 0.3),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
          child: Text(text),
        ),
      ),
    );
  }

  Widget _buildCircleButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withValues(alpha: 0.1),
        ),
        child: Icon(icon, color: Colors.white, size: 24),
      ),
    );
  }

  Widget _buildNavCircleButton({
    required IconData icon,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.transparent,
          border: Border.all(color: Colors.transparent),
        ),
        child: Icon(icon, color: Colors.grey[600], size: 24),
      ),
    );
  }

  Widget _buildCameraControls({
    required VoidCallback onShutter,
    required VoidCallback onGallery,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Gallery button
          GestureDetector(
            onTap: onGallery,
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.1),
              ),
              child: const Icon(
                Icons.photo_library,
                color: Colors.white,
                size: 24,
              ),
            ),
          ),

          const SizedBox(width: 32),

          // Shutter button
          GestureDetector(
            onTap: onShutter,
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 4),
              ),
              child: Center(
                child: Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ),

          const SizedBox(width: 32),

          // Help button
          GestureDetector(
            onTap: () {},
            child: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.1),
              ),
              child: const Icon(
                Icons.help_outline,
                color: Colors.white,
                size: 24,
              ),
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
        startAngle,
        sweepAngle,
        false,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
