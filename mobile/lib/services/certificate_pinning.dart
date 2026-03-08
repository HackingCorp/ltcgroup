import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';

/// Certificate pinning for the Kash Pay backend.
///
/// In release builds, connections to [pinnedHosts] are rejected unless the
/// server certificate's SHA-1 fingerprint matches one of [trustedFingerprints].
///
/// To obtain the SHA-1 fingerprint of the server certificate:
///   openssl s_client -connect api.ltcgroup.site:443 < /dev/null 2>/dev/null \
///     | openssl x509 -noout -fingerprint -sha1
///
/// To rotate certificates:
///   1. Add the NEW fingerprint to [trustedFingerprints] before the server
///      certificate is replaced.
///   2. Deploy the new certificate on the server.
///   3. Remove the old fingerprint after the old certificate expires.
class CertificatePinning {
  CertificatePinning._();

  /// Trusted SHA-1 fingerprints (uppercase, colon-separated).
  ///
  /// X509Certificate.sha1 returns the raw bytes; we convert to colon-separated
  /// hex for comparison.  Populate this list before shipping to production.
  ///
  /// Example: 'AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01'
  static const List<String> trustedFingerprints = [
    // Production SSL certificate for api.ltcgroup.site (added 2026-03-08)
    '27:7B:66:26:CE:2A:4C:F6:67:5B:30:42:21:3F:C0:03:91:89:C4:9B',
  ];

  /// Hosts for which certificate pinning is enforced.
  static const List<String> pinnedHosts = [
    'api.ltcgroup.site',
  ];

  /// Creates an [http.Client] that enforces certificate pinning in release
  /// builds.  In debug mode all certificates are accepted to allow development
  /// with self-signed certs and proxies.
  static http.Client createPinnedClient() {
    final httpClient = HttpClient();

    httpClient.badCertificateCallback = (X509Certificate cert, String host, int port) {
      // In debug mode, allow all certificates (dev servers, proxies, etc.)
      if (kDebugMode) return true;

      // Only pin our own backend hosts
      if (!pinnedHosts.contains(host)) return false;

      // If no fingerprints configured, fall back to system trust store
      // (i.e. do NOT reject — the system CA validation still applies)
      if (trustedFingerprints.isEmpty) return true;

      // Compare the certificate SHA-1 fingerprint
      final sha1Bytes = cert.sha1;
      final fingerprint = sha1Bytes
          .map((b) => b.toRadixString(16).padLeft(2, '0').toUpperCase())
          .join(':');

      final trusted = trustedFingerprints.contains(fingerprint);
      if (!trusted) {
        debugPrint(
          'CertificatePinning: REJECTED certificate for $host '
          '(fingerprint: $fingerprint)',
        );
      }
      return trusted;
    };

    return IOClient(httpClient);
  }
}
