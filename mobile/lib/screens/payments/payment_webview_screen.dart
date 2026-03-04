import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../config/theme.dart';
import '../../providers/wallet_provider.dart';

/// WebView screen to display Payin/Swychr payment link.
///
/// When [transactionId] is provided, the screen will verify the payment
/// with the backend after detecting a Swychr success redirect, and only
/// close once the payment is confirmed (COMPLETED/FAILED).
///
/// Returns true on verified success, false on failure, null on user dismiss.
class PaymentWebViewScreen extends StatefulWidget {
  final String paymentUrl;
  final String? title;
  final String? transactionId;

  const PaymentWebViewScreen({
    super.key,
    required this.paymentUrl,
    this.title,
    this.transactionId,
  });

  @override
  State<PaymentWebViewScreen> createState() => _PaymentWebViewScreenState();
}

class _PaymentWebViewScreenState extends State<PaymentWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _hasError = false;
  bool _isVerifying = false;

  @override
  void initState() {
    super.initState();
    // Extract the initial payment URL host to whitelist it
    final initialUri = Uri.parse(widget.paymentUrl);
    final initialHost = initialUri.host.toLowerCase();

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
            if (error.isForMainFrame == true && mounted) {
              setState(() {
                _isLoading = false;
                _hasError = true;
              });
            }
          },
          onNavigationRequest: (request) {
            // Use strict URI parsing to prevent spoofed redirect URLs
            final uri = Uri.tryParse(request.url);
            if (uri == null) return NavigationDecision.prevent;

            final host = uri.host.toLowerCase();
            final path = uri.path.toLowerCase();
            final scheme = uri.scheme.toLowerCase();

            // Block non-HTTP(S) schemes (javascript:, data:, file:, etc.)
            if (scheme != 'https' && scheme != 'http') {
              debugPrint('WebView: blocked non-HTTP scheme: $scheme');
              return NavigationDecision.prevent;
            }

            // Only match exact swychrconnect.com domain (not substrings)
            final isSwychr = host == 'swychrconnect.com' ||
                host.endsWith('.swychrconnect.com');

            if (isSwychr) {
              // Detect success redirect → verify payment
              if (path.startsWith('/payment_success') ||
                  path.startsWith('/payment/success')) {
                debugPrint('Payin: payment success redirect detected');
                _onPaymentSuccessRedirect();
                return NavigationDecision.prevent;
              }

              // Detect failure redirect → close immediately
              if (path.startsWith('/payment_failed') ||
                  path.startsWith('/payment/failed')) {
                debugPrint('Payin: payment failure redirect detected');
                if (mounted) Navigator.of(context).pop('failed');
                return NavigationDecision.prevent;
              }
            }

            // Whitelist: allow the initial payment domain and known payment providers
            final isAllowed = host == initialHost ||
                host.endsWith('.$initialHost') ||
                isSwychr ||
                host.endsWith('.payin.cm') || host == 'payin.cm' ||
                host.endsWith('.e-nkap.cm') || host == 'e-nkap.cm' ||
                host.endsWith('.stripe.com') || host == 'stripe.com';

            if (!isAllowed) {
              debugPrint('WebView: blocked navigation to unauthorized domain: $host');
              return NavigationDecision.prevent;
            }

            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.paymentUrl));
  }

  /// Called when Swychr redirects to payment_success.
  /// If we have a transactionId, verify with backend before closing.
  void _onPaymentSuccessRedirect() {
    if (widget.transactionId == null) {
      // No transaction to verify — assume success
      if (mounted) Navigator.of(context).pop('completed');
      return;
    }
    _verifyPayment();
  }

  /// Verify payment with backend, show overlay, close when done.
  /// Returns: 'completed', 'failed', 'pending'
  Future<void> _verifyPayment() async {
    if (_isVerifying) return;
    setState(() => _isVerifying = true);

    try {
      final wp = Provider.of<WalletProvider>(context, listen: false);
      final result = await wp.verifyTopup(widget.transactionId!);
      if (!mounted) return;

      final status = result?['status'] as String?;

      if (status == 'COMPLETED') {
        wp.fetchBalance();
        Navigator.of(context).pop('completed');
      } else if (status == 'FAILED') {
        Navigator.of(context).pop('failed');
      } else {
        // Still PENDING after all retries
        Navigator.of(context).pop('pending');
      }
    } catch (e) {
      debugPrint('Verification error: $e');
      if (mounted) Navigator.of(context).pop('pending');
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !_isVerifying) {
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
          leading: _isVerifying
              ? const SizedBox.shrink()
              : IconButton(
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
            if (_isLoading && !_isVerifying)
              const Center(
                child: CircularProgressIndicator(color: LTCColors.gold),
              ),
            // Verification overlay — blocks interaction while verifying
            if (_isVerifying) _buildVerifyingOverlay(),
          ],
        ),
      ),
    );
  }

  Widget _buildVerifyingOverlay() {
    return Container(
      color: Colors.black.withValues(alpha: 0.8),
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: LTCColors.gold),
            SizedBox(height: 24),
            Text(
              'Verification du paiement...',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.w600,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Veuillez patienter, ne fermez pas l\'application',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 14,
              ),
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
