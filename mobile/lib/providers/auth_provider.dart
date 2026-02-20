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

  /// Initialize auth state (check if user is logged in)
  Future<void> initialize() async {
    // Wire up session-expired callback so any 401 triggers automatic logout
    ApiService.onSessionExpired = () => handleSessionExpired();

    _isLoading = true;
    notifyListeners();

    try {
      final isLoggedIn = await _authService.isLoggedIn();
      if (isLoggedIn) {
        _user = await _authService.getCurrentUser();
      }
      _error = null;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
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
      // Extract error message from exception
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
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
      );
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      // Extract error message from exception
      final errorMessage = e.toString().replaceFirst('Exception: ', '');
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
