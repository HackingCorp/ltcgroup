import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../models/user.dart';

/// Storage service for local persistence
class StorageService {
  static const String _keyToken = 'auth_token';
  static const String _keyUser = 'user_data';
  static const String _keyBiometricEnabled = 'biometric_enabled';
  static const String _keyOnboardingSeen = 'onboarding_seen';
  static const String _keyPushEnabled = 'push_enabled';
  static const String _keyEmailEnabled = 'email_enabled';
  static const String _keySmsEnabled = 'sms_enabled';

  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  /// Save authentication token (secure)
  Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _keyToken, value: token);
  }

  /// Get authentication token (secure)
  Future<String?> getToken() async {
    return await _secureStorage.read(key: _keyToken);
  }

  /// Remove authentication token (secure)
  Future<void> removeToken() async {
    await _secureStorage.delete(key: _keyToken);
  }

  /// Save user data
  Future<void> saveUser(User user) async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = json.encode(user.toJson());
    await prefs.setString(_keyUser, userJson);
  }

  /// Get user data
  Future<User?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(_keyUser);
    if (userJson == null) return null;

    final userMap = json.decode(userJson) as Map<String, dynamic>;
    return User.fromJson(userMap);
  }

  /// Remove user data
  Future<void> removeUser() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyUser);
  }

  /// Clear all stored data
  Future<void> clearAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    await _secureStorage.deleteAll();
  }

  /// Save biometric preference
  Future<void> setBiometricEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyBiometricEnabled, enabled);
  }

  /// Get biometric preference
  Future<bool> isBiometricEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyBiometricEnabled) ?? false;
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  /// Check if onboarding has been seen
  Future<bool> isOnboardingSeen() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyOnboardingSeen) ?? false;
  }

  /// Mark onboarding as seen
  Future<void> setOnboardingSeen() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyOnboardingSeen, true);
  }

  /// Save push notification preference
  Future<void> setPushEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyPushEnabled, enabled);
  }

  /// Get push notification preference
  Future<bool> isPushEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyPushEnabled) ?? true;
  }

  /// Save email notification preference
  Future<void> setEmailEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyEmailEnabled, enabled);
  }

  /// Get email notification preference
  Future<bool> isEmailEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyEmailEnabled) ?? true;
  }

  /// Save SMS notification preference
  Future<void> setSmsEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keySmsEnabled, enabled);
  }

  /// Get SMS notification preference
  Future<bool> isSmsEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keySmsEnabled) ?? false;
  }
}
