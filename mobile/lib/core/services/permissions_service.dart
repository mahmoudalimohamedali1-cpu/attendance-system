import 'package:flutter/foundation.dart';
import '../network/api_client.dart';
import '../di/injection.dart';

/// Permission entity representing a user's permission
class UserPermissionEntity {
  final String id;
  final String permissionCode;
  final String scope;

  const UserPermissionEntity({
    required this.id,
    required this.permissionCode,
    required this.scope,
  });

  factory UserPermissionEntity.fromJson(Map<String, dynamic> json) {
    return UserPermissionEntity(
      id: json['id'] ?? '',
      permissionCode: json['permission']?['code'] ?? '',
      scope: json['scope'] ?? '',
    );
  }
}

/// Service for managing user permissions
class PermissionsService {
  final ApiClient _apiClient;

  PermissionsService(this._apiClient);

  /// Cache of permission codes
  List<String> _permissionCodes = [];

  /// Get cached permission codes
  List<String> get permissionCodes => _permissionCodes;

  /// Check if user has a specific permission
  bool hasPermission(String permissionCode) {
    return _permissionCodes.contains(permissionCode);
  }

  /// Check if user has any of the specified permissions
  bool hasAnyPermission(List<String> permissionCodes) {
    return permissionCodes.any((code) => _permissionCodes.contains(code));
  }

  /// Fetch user's permissions from API and cache them
  /// جلب الصلاحيات من الخادم
  Future<void> loadPermissions() async {
    try {
      final response = await _apiClient.getMyPermissions();
      final List<dynamic> data = response.data ?? [];
      
      _permissionCodes = data
          .map((json) => UserPermissionEntity.fromJson(json).permissionCode)
          .where((code) => code.isNotEmpty)
          .toList();
      
      debugPrint('✅ Fetched ${_permissionCodes.length} permissions: $_permissionCodes');
    } catch (e) {
      debugPrint('❌ Failed to fetch permissions: $e');
      _permissionCodes = [];
    }
  }

  /// Alias for loadPermissions (للتوافق مع AuthBloc)
  Future<void> fetchMyPermissions() => loadPermissions();

  /// Clear cached permissions (on logout)
  void clearPermissions() {
    _permissionCodes = [];
  }
}

/// Global permissions service instance
PermissionsService? _permissionsServiceInstance;

PermissionsService getPermissionsService() {
  if (_permissionsServiceInstance == null) {
    try {
      final apiClient = getIt<ApiClient>();
      _permissionsServiceInstance = PermissionsService(apiClient);
    } catch (e) {
      debugPrint('❌ Failed to create PermissionsService: $e');
      rethrow;
    }
  }
  return _permissionsServiceInstance!;
}
