import '../../../../core/network/api_client.dart';
import '../../../../core/error/exceptions.dart';
import '../models/attendance_model.dart';

abstract class AttendanceRemoteDataSource {
  Future<CheckInResponseModel> checkIn({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    List<double>? faceEmbedding,
    String? faceImage,
  });

  Future<CheckOutResponseModel> checkOut({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    String? notes,
    List<double>? faceEmbedding,
    String? faceImage,
  });

  Future<TodayAttendanceResponseModel> getTodayAttendance();

  Future<AttendanceHistoryResponseModel> getAttendanceHistory({
    DateTime? startDate,
    DateTime? endDate,
    String? status,
    int page = 1,
    int limit = 30,
  });

  Future<MonthlyStatsResponseModel> getMonthlyStats({
    required int year,
    required int month,
  });
}

class AttendanceRemoteDataSourceImpl implements AttendanceRemoteDataSource {
  final ApiClient _apiClient;

  AttendanceRemoteDataSourceImpl(this._apiClient);

  @override
  Future<CheckInResponseModel> checkIn({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    List<double>? faceEmbedding,
    String? faceImage,
  }) async {
    try {
      final response = await _apiClient.checkIn({
        'latitude': latitude,
        'longitude': longitude,
        'isMockLocation': isMockLocation,
        'deviceInfo': deviceInfo,
        if (faceEmbedding != null) 'faceEmbedding': faceEmbedding,
        if (faceImage != null) 'faceImage': faceImage,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        return CheckInResponseModel.fromJson(response.data);
      }

      throw ServerException(
        message: response.data['message'] ?? 'فشل تسجيل الحضور',
        statusCode: response.statusCode,
      );
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException(message: 'فشل تسجيل الحضور: ${e.toString()}');
    }
  }

  @override
  Future<CheckOutResponseModel> checkOut({
    required double latitude,
    required double longitude,
    required bool isMockLocation,
    String? deviceInfo,
    String? notes,
    List<double>? faceEmbedding,
    String? faceImage,
  }) async {
    try {
      final response = await _apiClient.checkOut({
        'latitude': latitude,
        'longitude': longitude,
        'isMockLocation': isMockLocation,
        'deviceInfo': deviceInfo,
        'notes': notes,
        if (faceEmbedding != null) 'faceEmbedding': faceEmbedding,
        if (faceImage != null) 'faceImage': faceImage,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        return CheckOutResponseModel.fromJson(response.data);
      }

      throw ServerException(
        message: response.data['message'] ?? 'فشل تسجيل الانصراف',
        statusCode: response.statusCode,
      );
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException(message: 'فشل تسجيل الانصراف: ${e.toString()}');
    }
  }

  @override
  Future<TodayAttendanceResponseModel> getTodayAttendance() async {
    try {
      final response = await _apiClient.getTodayAttendance();

      if (response.statusCode == 200) {
        return TodayAttendanceResponseModel.fromJson(response.data);
      }

      throw ServerException(
        message: response.data['message'] ?? 'فشل جلب بيانات الحضور',
      );
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException(message: 'فشل جلب بيانات الحضور');
    }
  }

  @override
  Future<AttendanceHistoryResponseModel> getAttendanceHistory({
    DateTime? startDate,
    DateTime? endDate,
    String? status,
    int page = 1,
    int limit = 30,
  }) async {
    try {
      final params = <String, dynamic>{
        'page': page,
        'limit': limit,
      };

      if (startDate != null) params['startDate'] = startDate.toIso8601String();
      if (endDate != null) params['endDate'] = endDate.toIso8601String();
      if (status != null) params['status'] = status;

      final response = await _apiClient.getAttendanceHistory(params);

      if (response.statusCode == 200) {
        return AttendanceHistoryResponseModel.fromJson(response.data);
      }

      throw ServerException(
        message: response.data['message'] ?? 'فشل جلب سجل الحضور',
      );
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException(message: 'فشل جلب سجل الحضور');
    }
  }

  @override
  Future<MonthlyStatsResponseModel> getMonthlyStats({
    required int year,
    required int month,
  }) async {
    try {
      final response = await _apiClient.getMonthlyStats(year, month);

      if (response.statusCode == 200) {
        return MonthlyStatsResponseModel.fromJson(response.data);
      }

      throw ServerException(
        message: response.data['message'] ?? 'فشل جلب الإحصائيات',
      );
    } catch (e) {
      if (e is ServerException) rethrow;
      throw ServerException(message: 'فشل جلب الإحصائيات');
    }
  }
}

