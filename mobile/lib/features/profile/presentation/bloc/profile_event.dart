import 'package:equatable/equatable.dart';

/// Base class for all profile events
abstract class ProfileEvent extends Equatable {
  const ProfileEvent();

  @override
  List<Object?> get props => [];
}

/// Event to load profile data
class LoadProfileEvent extends ProfileEvent {
  const LoadProfileEvent();
}

/// Event to refresh profile data
class RefreshProfileEvent extends ProfileEvent {
  const RefreshProfileEvent();
}

/// Event to update profile information
class UpdateProfileEvent extends ProfileEvent {
  final String? firstName;
  final String? lastName;
  final String? phone;
  final String? email;

  const UpdateProfileEvent({
    this.firstName,
    this.lastName,
    this.phone,
    this.email,
  });

  @override
  List<Object?> get props => [firstName, lastName, phone, email];
}

/// Event to update profile avatar
class UpdateAvatarEvent extends ProfileEvent {
  final String imagePath;

  const UpdateAvatarEvent({required this.imagePath});

  @override
  List<Object?> get props => [imagePath];
}

/// Event to remove profile avatar
class RemoveAvatarEvent extends ProfileEvent {
  const RemoveAvatarEvent();
}

/// Event to change password
class ChangePasswordEvent extends ProfileEvent {
  final String currentPassword;
  final String newPassword;

  const ChangePasswordEvent({
    required this.currentPassword,
    required this.newPassword,
  });

  @override
  List<Object?> get props => [currentPassword, newPassword];
}

/// Event to load profile documents
class LoadDocumentsEvent extends ProfileEvent {
  const LoadDocumentsEvent();
}

/// Event to upload a document
class UploadDocumentEvent extends ProfileEvent {
  final String filePath;
  final String documentType;
  final String? title;
  final DateTime? expiryDate;

  const UploadDocumentEvent({
    required this.filePath,
    required this.documentType,
    this.title,
    this.expiryDate,
  });

  @override
  List<Object?> get props => [filePath, documentType, title, expiryDate];
}

/// Event to delete a document
class DeleteDocumentEvent extends ProfileEvent {
  final String documentId;

  const DeleteDocumentEvent({required this.documentId});

  @override
  List<Object?> get props => [documentId];
}

/// Event to load emergency contacts
class LoadEmergencyContactsEvent extends ProfileEvent {
  const LoadEmergencyContactsEvent();
}

/// Event to add emergency contact
class AddEmergencyContactEvent extends ProfileEvent {
  final String name;
  final String phone;
  final String relationship;

  const AddEmergencyContactEvent({
    required this.name,
    required this.phone,
    required this.relationship,
  });

  @override
  List<Object?> get props => [name, phone, relationship];
}

/// Event to update emergency contact
class UpdateEmergencyContactEvent extends ProfileEvent {
  final String contactId;
  final String name;
  final String phone;
  final String relationship;

  const UpdateEmergencyContactEvent({
    required this.contactId,
    required this.name,
    required this.phone,
    required this.relationship,
  });

  @override
  List<Object?> get props => [contactId, name, phone, relationship];
}

/// Event to delete emergency contact
class DeleteEmergencyContactEvent extends ProfileEvent {
  final String contactId;

  const DeleteEmergencyContactEvent({required this.contactId});

  @override
  List<Object?> get props => [contactId];
}

/// Event to clear any profile error state
class ClearProfileErrorEvent extends ProfileEvent {
  const ClearProfileErrorEvent();
}
