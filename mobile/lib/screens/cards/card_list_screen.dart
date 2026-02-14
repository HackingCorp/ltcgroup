import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/cards_provider.dart';
import '../../widgets/card_widget.dart';
import '../../widgets/loading_indicator.dart';
import '../../config/theme.dart';

class CardListScreen extends StatefulWidget {
  const CardListScreen({super.key});

  @override
  State<CardListScreen> createState() => _CardListScreenState();
}

class _CardListScreenState extends State<CardListScreen> {
  @override
  void initState() {
    super.initState();
    _loadCards();
  }

  Future<void> _loadCards() async {
    final cardsProvider = Provider.of<CardsProvider>(context, listen: false);
    await cardsProvider.fetchCards();
  }

  Future<void> _handleRefresh() async {
    await _loadCards();
  }

  @override
  Widget build(BuildContext context) {
    final cardsProvider = Provider.of<CardsProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes cartes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_card),
            onPressed: () {
              Navigator.of(context).pushNamed('/purchase-card');
            },
          ),
        ],
      ),
      body: cardsProvider.isLoading && cardsProvider.cards.isEmpty
          ? const LoadingIndicator(message: 'Chargement des cartes...')
          : RefreshIndicator(
              onRefresh: _handleRefresh,
              child: cardsProvider.cards.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: cardsProvider.cards.length,
                      itemBuilder: (context, index) {
                        final card = cardsProvider.cards[index];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: CardWidget(
                            card: card,
                            onTap: () {
                              Navigator.of(context).pushNamed(
                                '/card-detail',
                                arguments: card.id,
                              );
                            },
                          ),
                        );
                      },
                    ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.of(context).pushNamed('/purchase-card');
        },
        backgroundColor: LTCColors.accent,
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle carte'),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.credit_card_off,
              size: 100,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 24),
            const Text(
              'Aucune carte disponible',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: LTCColors.textPrimary,
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Commencez par acheter votre première carte virtuelle',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: LTCColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
