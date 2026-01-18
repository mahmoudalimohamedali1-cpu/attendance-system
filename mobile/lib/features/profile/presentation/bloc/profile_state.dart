import 'package:equatable/equatable.dart';
import '../../../auth/domain/entities/user_entity.dart';

/// Represents an employee document
class ProfileDocument extends Equatable {
  final String id;
  final String title;
  final String documentType;
  final String? fileUrl;
  final DateTime? expiryDate;
  final DateTime createdAt;
  final bool isExpired;
  final bool isExpiringSoon;

  const ProfileDocument({
    required this.id,
    required this.title,
    required this.documentType,
    this.fileUrl,
    this.expiryDate,
    required this.createdAt,
    this.isExpired = false,
    this.isExpiringSoon = false,
  });

  @override
  List<Object?> get props => [
        id,
        title,
        documentType,
        fileUrl,
        expiryDate,
        createdAt,
        isExpired,
        isExpiringSoon,
      ];
}

/// Represents an emergency contact
class EmergencyContact extends Equatable {
  final String id;
  final String name;
  final String phone;
  final String relationship;

  const EmergencyContact({
    required this.id,
    required this.name,
    required this.phone,
    required this.relationship,
  });

  @override
  List<Object?> get props => [id, name, phone, relationship];
}

/// Base class for all profile states
abstract class ProfileState extends Equatable {
  const ProfileState();

  @override
  List<Object?> get props => [];
}

/// Initial state when profile bloc is first created
class ProfileInitial extends ProfileState {
  const ProfileInitial();
}

/// State when profile data is being loaded
class ProfileLoading extends ProfileState {
  const ProfileLoading();
}

/// State when profile data is loaded successfully
class ProfileLoaded extends ProfileState {
  final UserEntity user;
  final List<ProfileDocument> documents;
  final List<EmergencyContact> emergencyContacts;
  final bool isUpdating;

  const ProfileLoaded({
    required this.user,
    this.documents = const [],
    this.emergencyContacts = const [],
    this.isUpdating = false,
  });

  @override
  List<Object?> get props => [user, documents, emergencyContacts, isUpdating];

  ProfileLoaded copyWith({
    UserEntity? user,
    List<ProfileDocument>? documents,
    List<EmergencyContact>? emergencyContacts,
    bool? isUpdating,
  }) {
    return ProfileLoaded(
      user: user ?? this.user,
      documents: documents ?? this.documents,
      emergencyContacts: emergencyContacts ?? this.emergencyContacts,
      isUpdating: isUpdating ?? this.isUpdating,
    );
  }
}

/// State when profile update is successful
class ProfileUpdateSuccess extends ProfileState {
  final String message;
  final UserEntity user;

  const ProfileUpdateSuccess({
    required this.message,
    required this.user,
  });

  @override
  List<Object?> get props => [message, user];
}

/// State when avatar update is successful
class AvatarUpdateSuccess extends ProfileState {
  final String message;
  final String? avatarUrl;

  const AvatarUpdateSuccess({
    required this.message,
    this.avatarUrl,
  });

  @override
  List<Object?> get props => [message, avatarUrl];
}

/// State when password change is successful
class PasswordChangeSuccess extends ProfileState {
  final String message;

  const PasswordChangeSuccess({required this.message});

  @override
  List<Object?> get props => [message];
}

/// State when document upload is successful
class DocumentUploadSuccess extends ProfileState {
  final String message;
  final ProfileDocument document;

  const DocumentUploadSuccess({
    required this.message,
    required this.document,
  });

  @override
  List<Object?> get props => [message, document];
}

/// State when document delete is successful
class DocumentDeleteSuccess extends ProfileState {
  final String message;

  const DocumentDeleteSuccess({required this.message});

  @override
  List<Object?> get props => [message];
}

/// State when emergency contact operation is successful
class EmergencyContactSuccess extends ProfileState {
  final String message;

  const EmergencyContactSuccess({required this.message});

  @override
  List<Object?> get props => [message];
}

/// State when an error occurs
class ProfileError extends ProfileState {
  final String message;
  final ProfileState? previousState;

  const ProfileError({
    required this.message,
    this.previousState,
  });

  @override
  List<Object?> get props => [message, previousState];
}
