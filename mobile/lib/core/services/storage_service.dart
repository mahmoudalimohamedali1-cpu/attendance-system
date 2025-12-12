import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  final SharedPreferences _prefs;
  final FlutterSecureStorage _secureStorage;

  StorageService(this._prefs, this._secureStorage);

  // Secure storage keys
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userDataKey = 'user_data';

  // Preferences keys
  static const String _themeKey = 'theme_mode';
  static const String _localeKey = 'locale';
  static const String _rememberMeKey = 'remember_me';
  static const String _lastEmailKey = 'last_email';

  // ============ Secure Storage Methods ============

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _secureStorage.write(key: _accessTokenKey, value: accessToken);
    await _secureStorage.write(key: _refreshTokenKey, value: refreshToken);
  }

  Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: _accessTokenKey);
  }

  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  Future<void> clearTokens() async {
    await _secureStorage.delete(key: _accessTokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
  }

  Future<void> saveUserData(String userData) async {
    await _secureStorage.write(key: _userDataKey, value: userData);
  }

  Future<String?> getUserData() async {
    return await _secureStorage.read(key: _userDataKey);
  }

  Future<void> clearUserData() async {
    await _secureStorage.delete(key: _userDataKey);
  }

  Future<void> clearAll() async {
    await _secureStorage.deleteAll();
  }

  // ============ Shared Preferences Methods ============

  // Theme
  Future<void> setThemeMode(String mode) async {
    await _prefs.setString(_themeKey, mode);
  }

  String getThemeMode() {
    return _prefs.getString(_themeKey) ?? 'system';
  }

  // Locale
  Future<void> setLocale(String locale) async {
    await _prefs.setString(_localeKey, locale);
  }

  String getLocale() {
    return _prefs.getString(_localeKey) ?? 'ar';
  }

  // Remember Me
  Future<void> setRememberMe(bool value) async {
    await _prefs.setBool(_rememberMeKey, value);
  }

  bool getRememberMe() {
    return _prefs.getBool(_rememberMeKey) ?? false;
  }

  // Last Email
  Future<void> setLastEmail(String email) async {
    await _prefs.setString(_lastEmailKey, email);
  }

  String? getLastEmail() {
    return _prefs.getString(_lastEmailKey);
  }

  // Generic methods
  Future<void> setString(String key, String value) async {
    await _prefs.setString(key, value);
  }

  String? getString(String key) {
    return _prefs.getString(key);
  }

  Future<void> setBool(String key, bool value) async {
    await _prefs.setBool(key, value);
  }

  bool? getBool(String key) {
    return _prefs.getBool(key);
  }

  Future<void> remove(String key) async {
    await _prefs.remove(key);
  }
}

