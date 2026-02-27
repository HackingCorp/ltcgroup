import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../config/theme.dart';

/// WebView screen to display Payin/Swychr payment link.
///
/// Redirect behavior (from Payin API spec):
///   - Success + callback_url set → redirects to callback_url
///   - Success + no callback_url  → redirects to https://app.swychrconnect.com/payment_success
///   - Failure                    → redirects to https://app.swychrconnect.com/payment_failed
///
/// Returns true on success, false on failure, null on user dismiss.
class PaymentWebViewScreen extends StatefulWidget {
  final String paymentUrl;
  final String? title;

  const PaymentWebViewScreen({
    super.key,
    required this.paymentUrl,
    this.title,
  });

  @override
  State<PaymentWebViewScreen> createState() => _PaymentWebViewScreenState();
}

class _PaymentWebViewScreenState extends State<PaymentWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _isLoading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _isLoading = false);
          },
          onWebResourceError: (error) {
            debugPrint('WebView error: ${error.description}');
            // Only show error for main frame failures, not sub-resource errors
            if (error.isForMainFrame == true && mounted) {
              setState(() {
                _isLoading = false;
                _hasError = true;
              });
            }
          },
          onNavigationRequest: (request) {
            final url = request.url.toLowerCase();

            // Detect Swychr hosted UI redirect URLs (from Payin API spec)
            if (url.contains('swychrconnect.com/payment_success') ||
                url.contains('swychrconnect.com/payment/success')) {
              debugPrint('Payin: payment success redirect detected');
              if (mounted) Navigator.of(context).pop(true);
              return NavigationDecision.prevent;
            }

            if (url.contains('swychrconnect.com/payment_failed') ||
                url.contains('swychrconnect.com/payment/failed')) {
              debugPrint('Payin: payment failure redirect detected');
              if (mounted) Navigator.of(context).pop(false);
              return NavigationDecision.prevent;
            }

            // Allow all other navigation (payment form, OTP pages, etc.)
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.paymentUrl));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _showCloseConfirmation();
        }
      },
      child: Scaffold(
        backgroundColor: LTCColors.background,
        appBar: AppBar(
          backgroundColor: LTCColors.surface,
          foregroundColor: LTCColors.textPrimary,
          title: Text(
            widget.title ?? 'Paiement',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: LTCColors.textPrimary,
            ),
          ),
          centerTitle: true,
          leading: IconButton(
            icon: const Icon(Icons.close),
            onPressed: () => _showCloseConfirmation(),
          ),
        ),
        body: Stack(
          children: [
            if (_hasError)
              _buildErrorView()
            else
              WebViewWidget(controller: _controller),
            if (_isLoading)
              const Center(
                child: CircularProgressIndicator(color: LTCColors.gold),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 64,
              color: LTCColors.error.withValues(alpha: 0.7),
            ),
            const SizedBox(height: 16),
            const Text(
              'Impossible de charger la page de paiement',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: LTCColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Verifiez votre connexion internet et reessayez.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: LTCColors.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _hasError = false;
                  _isLoading = true;
                });
                _controller.loadRequest(Uri.parse(widget.paymentUrl));
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Reessayer'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showCloseConfirmation() async {
    final shouldClose = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: LTCColors.surface,
        title: const Text(
          'Annuler le paiement ?',
          style: TextStyle(color: LTCColors.textPrimary),
        ),
        content: const Text(
          'Si vous fermez cette page, votre paiement ne sera pas finalise.',
          style: TextStyle(color: LTCColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            style: TextButton.styleFrom(foregroundColor: LTCColors.gold),
            child: const Text('Continuer'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: LTCColors.error),
            child: const Text('Annuler'),
          ),
        ],
      ),
    );

    if (shouldClose == true && mounted) {
      Navigator.of(context).pop(null);
    }
  }
}
