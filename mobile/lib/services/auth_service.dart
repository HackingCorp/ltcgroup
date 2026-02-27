import '../models/user.dart';
import 'api_service.dart';
import 'storage_service.dart';

/// Authentication service
class AuthService {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  /// Login user
  Future<User> login({
    required String email,
    required String password,
  }) async {
    // Call API
    final response = await _apiService.login(email, password);

    // Extract token
    final token = response['token'] as String;

    // Save token first
    await _storageService.saveToken(token);

    // Fetch user profile — if this fails, clear the token so we don't
    // leave a half-authenticated state.
    try {
      final user = await _apiService.getCurrentUser();
      await _storageService.saveUser(user);
      return user;
    } catch (e) {
      await _storageService.removeToken();
      rethrow;
    }
  }

  /// Register user
  Future<User> register({
    required String email,
    required String phone,
    required String password,
    required String firstName,
    required String lastName,
    String countryCode = 'CM',
  }) async {
    // Call API
    final response = await _apiService.register(
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      countryCode: countryCode,
    );

    // Extract token and user
    final token = response['token'] as String;
    final userJson = response['user'] as Map<String, dynamic>;
    final user = User.fromJson(userJson);

    // Save to local storage
    await _storageService.saveToken(token);
    await _storageService.saveUser(user);

    return user;
  }

  /// Logout user
  Future<void> logout() async {
    await _storageService.clearAll();
  }

  /// Get current user from storage
  Future<User?> getCurrentUser() async {
    return await _storageService.getUser();
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    return await _storageService.isLoggedIn();
  }

  /// Get auth token
  Future<String?> getToken() async {
    return await _storageService.getToken();
  }
}
