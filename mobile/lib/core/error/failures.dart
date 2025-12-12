import 'package:equatable/equatable.dart';

abstract class Failure extends Equatable {
  final String message;

  const Failure(this.message);

  @override
  List<Object?> get props => [message];
}

class ServerFailure extends Failure {
  final int? statusCode;

  const ServerFailure(super.message, {this.statusCode});
}

class CacheFailure extends Failure {
  const CacheFailure(super.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'لا يوجد اتصال بالإنترنت']);
}

class AuthFailure extends Failure {
  const AuthFailure(super.message);
}

class ValidationFailure extends Failure {
  final Map<String, dynamic>? errors;

  const ValidationFailure(super.message, {this.errors});
}

class LocationFailure extends Failure {
  const LocationFailure(super.message);
}

class GeofenceFailure extends Failure {
  final double distance;

  const GeofenceFailure(super.message, {this.distance = 0});
}

class MockLocationFailure extends Failure {
  const MockLocationFailure([super.message = 'تم رصد استخدام موقع وهمي']);
}

