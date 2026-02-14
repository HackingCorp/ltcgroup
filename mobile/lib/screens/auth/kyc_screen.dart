import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../widgets/custom_button.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../services/storage_service.dart';
import '../../config/api_config.dart';

class KycScreen extends StatefulWidget {
  const KycScreen({super.key});

  @override
  State<KycScreen> createState() => _KycScreenState();
}

class _KycScreenState extends State<KycScreen> {
  final ImagePicker _picker = ImagePicker();
  final ApiService _apiService = ApiService();

  int _currentStep = 0;
  String? _selectedDocumentType;
  XFile? _frontImage;
  XFile? _backImage;
  bool _isLoading = false;
  String? _errorMessage;
  String _kycStatus = 'PENDING'; // PENDING, APPROVED, REJECTED

  final Map<String, String> _documentTypes = {
    'passport': 'Passeport',
    'id_card': 'Carte d\'identité',
    'driver_license': 'Permis de conduire',
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vérification KYC'),
        automaticallyImplyLeading: _currentStep == 0,
      ),
      body: SafeArea(
        child: _currentStep == 0
            ? _buildStepOne()
            : _currentStep == 1
                ? _buildStepTwo()
                : _currentStep == 2
                    ? _buildStepThree()
                    : _buildStepFour(),
      ),
    );
  }

  // Step 1: Select document type
  Widget _buildStepOne() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Étape 1/4',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Type de document',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Sélectionnez le type de document que vous souhaitez soumettre',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey.shade600,
                ),
          ),
          const SizedBox(height: 32),
          ..._documentTypes.entries.map((entry) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: _buildDocumentTypeCard(entry.key, entry.value),
            );
          }),
          const Spacer(),
          CustomButton(
            text: 'Continuer',
            onPressed: _selectedDocumentType != null
                ? () {
                    setState(() {
                      _currentStep = 1;
                    });
                  }
                : null,
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentTypeCard(String type, String label) {
    final isSelected = _selectedDocumentType == type;
    IconData icon;

    switch (type) {
      case 'passport':
        icon = Icons.badge_outlined;
        break;
      case 'id_card':
        icon = Icons.credit_card;
        break;
      case 'driver_license':
        icon = Icons.directions_car_outlined;
        break;
      default:
        icon = Icons.document_scanner_outlined;
    }

    return InkWell(
      onTap: () {
        setState(() {
          _selectedDocumentType = type;
        });
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isSelected ? LTCTheme.gold.withOpacity(0.1) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? LTCTheme.gold : Colors.grey.shade300,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected ? LTCTheme.gold.withOpacity(0.2) : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                icon,
                color: isSelected ? LTCTheme.gold : Colors.grey.shade600,
                size: 32,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
              ),
            ),
            if (isSelected)
              Icon(
                Icons.check_circle,
                color: LTCTheme.gold,
              ),
          ],
        ),
      ),
    );
  }

  // Step 2: Take photos
  Widget _buildStepTwo() {
    final needsBackImage = _selectedDocumentType == 'id_card' || _selectedDocumentType == 'driver_license';

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Étape 2/4',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Prenez des photos',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Prenez une photo claire de votre document',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey.shade600,
                ),
          ),
          const SizedBox(height: 32),
          _buildPhotoCard('Recto du document', _frontImage, (source) => _pickImage(true, source)),
          if (needsBackImage) ...[
            const SizedBox(height: 16),
            _buildPhotoCard('Verso du document', _backImage, (source) => _pickImage(false, source)),
          ],
          const Spacer(),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    setState(() {
                      _currentStep = 0;
                    });
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    side: BorderSide(color: LTCTheme.gold),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text('Retour', style: TextStyle(color: LTCTheme.gold)),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: CustomButton(
                  text: 'Continuer',
                  onPressed: _frontImage != null && (!needsBackImage || _backImage != null)
                      ? () {
                          setState(() {
                            _currentStep = 2;
                          });
                        }
                      : null,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoCard(String label, XFile? image, Function(ImageSource) onTap) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
        ),
        const SizedBox(height: 12),
        if (image == null)
          Row(
            children: [
              Expanded(
                child: _buildImageSourceButton('Caméra', Icons.camera_alt, () => onTap(ImageSource.camera)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildImageSourceButton('Galerie', Icons.photo_library, () => onTap(ImageSource.gallery)),
              ),
            ],
          )
        else
          Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(
                  File(image.path),
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: IconButton(
                  icon: const Icon(Icons.close),
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.black54,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () {
                    setState(() {
                      if (label.contains('Recto')) {
                        _frontImage = null;
                      } else {
                        _backImage = null;
                      }
                    });
                  },
                ),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildImageSourceButton(String label, IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Column(
          children: [
            Icon(icon, size: 32, color: LTCTheme.gold),
            const SizedBox(height: 8),
            Text(label),
          ],
        ),
      ),
    );
  }

  Future<void> _pickImage(bool isFront, ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (image != null) {
        setState(() {
          if (isFront) {
            _frontImage = image;
          } else {
            _backImage = image;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors de la sélection de l\'image: $e')),
        );
      }
    }
  }

  // Step 3: Review photos
  Widget _buildStepThree() {
    final needsBackImage = _selectedDocumentType == 'id_card' || _selectedDocumentType == 'driver_license';

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Étape 3/4',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Vérifiez vos photos',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Assurez-vous que les photos sont claires et lisibles',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.grey.shade600,
                ),
          ),
          const SizedBox(height: 32),
          if (_frontImage != null) ...[
            Text(
              'Recto du document',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.file(
                File(_frontImage!.path),
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(height: 24),
          ],
          if (needsBackImage && _backImage != null) ...[
            Text(
              'Verso du document',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.file(
                File(_backImage!.path),
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
          ],
          const Spacer(),
          if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red),
                    const SizedBox(width: 12),
                    Expanded(child: Text(_errorMessage!, style: const TextStyle(color: Colors.red))),
                  ],
                ),
              ),
            ),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isLoading
                      ? null
                      : () {
                          setState(() {
                            _currentStep = 1;
                          });
                        },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    side: BorderSide(color: LTCTheme.gold),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text('Reprendre', style: TextStyle(color: LTCTheme.gold)),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: CustomButton(
                  text: _isLoading ? 'Envoi...' : 'Soumettre',
                  onPressed: _isLoading ? null : _submitKyc,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Step 4: Submission result
  Widget _buildStepFour() {
    Color statusColor;
    IconData statusIcon;
    String statusText;

    switch (_kycStatus) {
      case 'APPROVED':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        statusText = 'Approuvé';
        break;
      case 'REJECTED':
        statusColor = Colors.red;
        statusIcon = Icons.cancel;
        statusText = 'Rejeté';
        break;
      default:
        statusColor = Colors.orange;
        statusIcon = Icons.pending;
        statusText = 'En attente';
    }

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(
            statusIcon,
            size: 100,
            color: statusColor,
          ),
          const SizedBox(height: 32),
          Text(
            'Statut KYC',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: statusColor),
            ),
            child: Text(
              statusText,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: statusColor,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _kycStatus == 'PENDING'
                ? 'Votre demande a été soumise avec succès. Notre équipe examinera vos documents sous 24-48 heures.'
                : _kycStatus == 'APPROVED'
                    ? 'Félicitations ! Votre identité a été vérifiée. Vous pouvez maintenant utiliser tous nos services.'
                    : 'Votre demande a été rejetée. Veuillez soumettre de nouveaux documents.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey.shade600,
                ),
          ),
          const SizedBox(height: 48),
          CustomButton(
            text: 'Continuer',
            onPressed: () {
              Navigator.of(context).pushReplacementNamed('/main');
            },
          ),
        ],
      ),
    );
  }

  Future<void> _submitKyc() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Upload files to backend and get URLs
      String? documentUrl;

      if (_frontImagePath != null) {
        documentUrl = await _uploadFile(_frontImagePath!, 'front');
      }

      if (_backImagePath != null && _selectedDocumentType != 'PASSPORT') {
        await _uploadFile(_backImagePath!, 'back');
      }

      if (documentUrl == null) {
        throw Exception('Erreur lors de l\'upload des documents');
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
      throw Exception('Erreur lors de l\'upload du fichier');
    }
  }
}
