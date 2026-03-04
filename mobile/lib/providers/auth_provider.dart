import 'dart:convert';
import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

/// Authentication state provider
class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();

  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  /// Extract a human-readable error message from an exception.
  String _extractError(Object e) {
    final raw = e.toString();
    // Strip the leading "Exception: " prefix if present
    final msg = raw.startsWith('Exception: ')
        ? raw.substring('Exception: '.length)
        : raw;
    // Try to parse as JSON (some errors come back as '{"detail":"..."}')
    try {
      final decoded = json.decode(msg);
      if (decoded is Map && decoded.containsKey('detail')) {
        final detail = decoded['detail'];
        if (detail is String) return detail;
        if (detail is List && detail.isNotEmpty) {
          return detail.map((d) => d['msg'] ?? d.toString()).join(', ');
        }
        return detail.toString();
      }
    } catch (_) {
      // Not JSON — just use the string as-is
    }
    return msg;
  }

  /// Initialize auth state (check if user is logged in)
  Future<void> initialize() async {
    // Wire up session-expired callback so any 401 triggers automatic logout
    ApiService.onSessionExpired = () => handleSessionExpired();

    _isLoading = true;
    notifyListeners();

    try {
      final isLoggedIn = await _authService.isLoggedIn()
          .timeout(const Duration(seconds: 3), onTimeout: () => false);
      if (isLoggedIn) {
        // Load cached user from secure storage for instant UI
        _user = await _authService.getCurrentUser();

        // Silently refresh the token in the background so upcoming API
        // calls don't hit a 401. If this fails the user still sees the
        // cached data and the normal retry/refresh logic will handle it.
        _silentRefreshAndSync();
      }
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Refresh token and sync user profile in background (fire-and-forget).
  void _silentRefreshAndSync() async {
    try {
      final apiService = ApiService();
      // Fetch fresh profile — this triggers token refresh on 401 automatically
      final freshUser = await apiService.getCurrentUser();
      _user = freshUser;
      notifyListeners();
    } catch (e) {
      // Log for debugging but don't disrupt user experience
      debugPrint('Silent refresh failed: $e');
      // If it's a session expiry, trigger logout
      if (e.toString().contains('Session expir')) {
        handleSessionExpired();
      }
    }
  }

  /// Login
  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _user = await _authService.login(email: email, password: password);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      final errorMessage = _extractError(e);
      _error = errorMessage;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Register
  Future<bool> register({
    required String email,
    required String phone,
    required String password,
    required String firstName,
    required String lastName,
    String countryCode = 'CM',
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _user = await _authService.register(
        email: email,
        phone: phone,
        password: password,
        firstName: firstName,
        lastName: lastName,
        countryCode: countryCode,
      );
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      final errorMessage = _extractError(e);
      _error = errorMessage;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Logout
  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _authService.logout();
      _user = null;
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Refresh user data from server (e.g. after KYC submission)
  Future<void> refreshUser() async {
    if (_user == null) return;
    try {
      final apiService = ApiService();
      _user = await apiService.getCurrentUser();
      notifyListeners();
    } catch (_) {
      // Silently ignore — user stays cached
    }
  }

  /// Poll AccountPE for updated KYC status (when PENDING after submission)
  /// Returns true if status changed, false if unchanged.
  /// Throws on network/API errors so the caller can show feedback.
  Future<bool> checkKycStatus() async {
    if (_user == null) return false;
    final apiService = ApiService();
    final result = await apiService.checkKycStatus();
    final newStatus = result['kyc_status'] as String?;
    if (newStatus != null && newStatus != _user!.kycStatus) {
      // Status changed — refresh full user data
      await refreshUser();
      return true;
    }
    return false;
  }

  /// Clear error
  void clearError() {
    _error = null;
    notifyListeners();
  }

  /// Handle session expiry (called on 401 errors)
  Future<void> handleSessionExpired() async {
    await logout();
  }
}
