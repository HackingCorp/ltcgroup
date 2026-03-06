import 'package:flutter/material.dart';
import '../../config/theme.dart';

class FaqScreen extends StatelessWidget {
  const FaqScreen({super.key});

  static const _faqs = [
    _FaqItem(
      question: "Comment creer une carte virtuelle ?",
      answer: "Depuis l'onglet Cartes, appuyez sur 'Nouvelle carte'. Choisissez le type (Visa/Mastercard) et le tier souhaite. Les frais de creation sont de \$5. Le solde de votre wallet sera debite automatiquement.",
    ),
    _FaqItem(
      question: "Comment recharger mon wallet ?",
      answer: "Allez dans le Dashboard, puis appuyez sur 'Recharger'. Choisissez le montant et le moyen de paiement (MTN Mobile Money ou Orange Money). Le montant sera converti en USD au taux du jour.",
    ),
    _FaqItem(
      question: "Comment transferer de l'argent vers ma carte ?",
      answer: "Depuis le Dashboard, appuyez sur 'Transferer'. Selectionnez la carte de destination et entrez le montant. Des frais de 2% sont appliques sur le transfert wallet vers carte.",
    ),
    _FaqItem(
      question: "Comment retirer de l'argent de mon wallet ?",
      answer: "Allez dans le Dashboard et appuyez sur 'Retrait'. Entrez le montant, le numero de telephone de reception et choisissez MTN ou Orange Money. Vous recevrez l'equivalent en monnaie locale.",
    ),
    _FaqItem(
      question: "Qu'est-ce que le KYC et pourquoi est-il necessaire ?",
      answer: "Le KYC (Know Your Customer) est une verification d'identite obligatoire. Sans KYC, vos limites de transaction sont reduites (\$500 par transaction, \$2,000 par mois). Apres verification, elles passent a \$10,000 par transaction et \$50,000 par mois.",
    ),
    _FaqItem(
      question: "Comment verifier mon identite (KYC) ?",
      answer: "Allez dans Profil > Limites > 'Verifier KYC'. Choisissez un type de document (passeport, carte d'identite, permis de conduire), prenez une photo recto/verso et un selfie. La verification prend generalement 24 a 48 heures.",
    ),
    _FaqItem(
      question: "Ma carte peut-elle etre bloquee ?",
      answer: "Oui. Vous pouvez geler temporairement votre carte (reversible) ou la bloquer definitivement depuis l'onglet Cartes. Une carte gelee peut etre degelee a tout moment. Le blocage est irreversible.",
    ),
    _FaqItem(
      question: "Quels sont les frais ?",
      answer: "Creation de carte : \$5. Transfert wallet vers carte : 2%. Les recharges et retraits wallet via Mobile Money sont sans frais cote Kash Pay (votre operateur peut appliquer ses propres frais).",
    ),
    _FaqItem(
      question: "Quels pays sont supportes ?",
      answer: "Kash Pay est disponible dans 18 pays africains dont le Cameroun, la Cote d'Ivoire, le Senegal, le Nigeria, le Kenya, le Ghana, et plus encore.",
    ),
    _FaqItem(
      question: "Comment securiser mon compte ?",
      answer: "Activez l'authentification biometrique (Face ID/Touch ID) depuis Profil > Securite. Utilisez un mot de passe fort avec majuscules, minuscules, chiffres et caracteres speciaux.",
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LTCColors.background,
      body: Column(
        children: [
          _buildHeader(context),
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 40),
              itemCount: _faqs.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) => _FaqTile(faq: _faqs[index]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.only(top: 8, left: 4, right: 4, bottom: 8),
        child: Row(
          children: [
            IconButton(
              onPressed: () => Navigator.of(context).pop(),
              icon: const Icon(Icons.chevron_left_rounded, size: 28, color: LTCColors.textPrimary),
            ),
            const Expanded(
              child: Text(
                'FAQ',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: LTCColors.textPrimary),
              ),
            ),
            const SizedBox(width: 48),
          ],
        ),
      ),
    );
  }
}

class _FaqTile extends StatefulWidget {
  final _FaqItem faq;
  const _FaqTile({required this.faq});

  @override
  State<_FaqTile> createState() => _FaqTileState();
}

class _FaqTileState extends State<_FaqTile> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: LTCColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _expanded ? LTCColors.gold.withValues(alpha: 0.3) : LTCColors.border),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: LTCColors.gold.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(Icons.help_outline_rounded, size: 16, color: LTCColors.gold),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        widget.faq.question,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: LTCColors.textPrimary,
                        ),
                      ),
                    ),
                    Icon(
                      _expanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                      color: LTCColors.textTertiary,
                      size: 24,
                    ),
                  ],
                ),
                if (_expanded) ...[
                  const SizedBox(height: 12),
                  const Divider(color: LTCColors.border, height: 1),
                  const SizedBox(height: 12),
                  Text(
                    widget.faq.answer,
                    style: const TextStyle(
                      fontSize: 13,
                      color: LTCColors.textSecondary,
                      height: 1.5,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _FaqItem {
  final String question;
  final String answer;
  const _FaqItem({required this.question, required this.answer});
}
