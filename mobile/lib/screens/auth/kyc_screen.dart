import 'package:flutter/material.dart';
import '../../widgets/custom_button.dart';
import '../../config/theme.dart';

/// KYC Screen - Placeholder for Phase 1
class KycScreen extends StatelessWidget {
  const KycScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Vérification KYC'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Icon
              Icon(
                Icons.verified_user_outlined,
                size: 100,
                color: LTCColors.accent,
              ),

              const SizedBox(height: 32),

              // Title
              Text(
                'Vérification d\'identité',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.displayMedium,
              ),

              const SizedBox(height: 16),

              // Description
              Text(
                'Pour utiliser nos services de cartes virtuelles, vous devez compléter la vérification KYC (Know Your Customer).',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: LTCColors.textSecondary,
                    ),
              ),

              const SizedBox(height: 32),

              // Info card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: LTCColors.info.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: LTCColors.info.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline, color: LTCColors.info, size: 20),
                        const SizedBox(width: 8),
                        const Text(
                          'Documents requis',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildRequirement('Pièce d\'identité (CNI, Passeport)'),
                    _buildRequirement('Selfie avec document'),
                    _buildRequirement('Justificatif de domicile'),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Placeholder note
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: LTCColors.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.construction, color: LTCColors.warning, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Phase 1: Le processus KYC complet sera implémenté en Phase 2',
                        style: TextStyle(
                          fontSize: 12,
                          color: LTCColors.warning,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // Continue button
              CustomButton(
                text: 'Continuer vers l\'application',
                onPressed: () {
                  Navigator.of(context).pushReplacementNamed('/main');
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRequirement(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(Icons.check_circle_outline, color: LTCColors.success, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}
