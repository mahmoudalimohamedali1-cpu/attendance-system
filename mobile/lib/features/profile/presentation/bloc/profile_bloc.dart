import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/network/api_client.dart';
import '../../../auth/domain/entities/user_entity.dart';
import 'profile_event.dart';
import 'profile_state.dart';

/// ProfileBloc manages the state of the employee profile feature.
///
/// It handles loading profile data, updating profile information,
/// managing documents, emergency contacts, and avatar updates.
class ProfileBloc extends Bloc<ProfileEvent, ProfileState> {
  final StorageService storageService;
  final ApiClient apiClient;

  // Cache for loaded data
  UserEntity? _cachedUser;
  List<ProfileDocument> _cachedDocuments = [];
  List<EmergencyContact> _cachedEmergencyContacts = [];

  ProfileBloc({
    required this.storageService,
    required this.apiClient,
  }) : super(const ProfileInitial()) {
    on<LoadProfileEvent>(_onLoadProfile);
    on<RefreshProfileEvent>(_onRefreshProfile);
    on<UpdateProfileEvent>(_onUpdateProfile);
    on<UpdateAvatarEvent>(_onUpdateAvatar);
    on<RemoveAvatarEvent>(_onRemoveAvatar);
    on<ChangePasswordEvent>(_onChangePassword);
    on<LoadDocumentsEvent>(_onLoadDocuments);
    on<UploadDocumentEvent>(_onUploadDocument);
    on<DeleteDocumentEvent>(_onDeleteDocument);
    on<LoadEmergencyContactsEvent>(_onLoadEmergencyContacts);
    on<AddEmergencyContactEvent>(_onAddEmergencyContact);
    on<UpdateEmergencyContactEvent>(_onUpdateEmergencyContact);
    on<DeleteEmergencyContactEvent>(_onDeleteEmergencyContact);
    on<ClearProfileErrorEvent>(_onClearError);
  }

  Future<void> _onLoadProfile(
    LoadProfileEvent event,
    Emitter<ProfileState> emit,
  ) async {
    emit(const ProfileLoading());

    try {
      final response = await apiClient.dio.get('/auth/me');

      if (response.statusCode == 200 && response.data != null) {
        final userData = response.data['data'] ?? response.data;
        _cachedUser = _parseUserEntity(userData);

        emit(ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ));
      } else {
        emit(const ProfileError(message: 'فشل في تحميل بيانات الملف الشخصي'));
      }
    } catch (e) {
      emit(ProfileError(message: _handleError(e)));
    }
  }

  Future<void> _onRefreshProfile(
    RefreshProfileEvent event,
    Emitter<ProfileState> emit,
  ) async {
    // Set updating flag if we have cached data
    if (_cachedUser != null) {
      emit(ProfileLoaded(
        user: _cachedUser!,
        documents: _cachedDocuments,
        emergencyContacts: _cachedEmergencyContacts,
        isUpdating: true,
      ));
    }

    try {
      final response = await apiClient.dio.get('/auth/me');

      if (response.statusCode == 200 && response.data != null) {
        final userData = response.data['data'] ?? response.data;
        _cachedUser = _parseUserEntity(userData);

        emit(ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ));
      } else {
        emit(ProfileError(
          message: 'فشل في تحديث بيانات الملف الشخصي',
          previousState: _cachedUser != null
              ? ProfileLoaded(
                  user: _cachedUser!,
                  documents: _cachedDocuments,
                  emergencyContacts: _cachedEmergencyContacts,
                )
              : null,
        ));
      }
    } catch (e) {
      emit(ProfileError(
        message: _handleError(e),
        previousState: _cachedUser != null
            ? ProfileLoaded(
                user: _cachedUser!,
                documents: _cachedDocuments,
                emergencyContacts: _cachedEmergencyContacts,
              )
            : null,
      ));
    }
  }

  Future<void> _onUpdateProfile(
    UpdateProfileEvent event,
    Emitter<ProfileState> emit,
  ) async {
    if (_cachedUser == null) {
      emit(const ProfileError(message: 'لا توجد بيانات للتحديث'));
      return;
    }

    emit(ProfileLoaded(
      user: _cachedUser!,
      documents: _cachedDocuments,
      emergencyContacts: _cachedEmergencyContacts,
      isUpdating: true,
    ));

    try {
      final updateData = <String, dynamic>{};
      if (event.firstName != null) updateData['firstName'] = event.firstName;
      if (event.lastName != null) updateData['lastName'] = event.lastName;
      if (event.phone != null) updateData['phone'] = event.phone;
      if (event.email != null) updateData['email'] = event.email;

      final response = await apiClient.dio.patch('/auth/profile', data: updateData);

      if (response.statusCode == 200 && response.data != null) {
        final userData = response.data['data'] ?? response.data;
        _cachedUser = _parseUserEntity(userData);

        emit(ProfileUpdateSuccess(
          message: 'تم تحديث الملف الشخصي بنجاح',
          user: _cachedUser!,
        ));

        emit(ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ));
      } else {
        emit(ProfileError(
          message: 'فشل في تحديث الملف الشخصي',
          previousState: ProfileLoaded(
            user: _cachedUser!,
            documents: _cachedDocuments,
            emergencyContacts: _cachedEmergencyContacts,
          ),
        ));
      }
    } catch (e) {
      emit(ProfileError(
        message: _handleError(e),
        previousState: ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ),
      ));
    }
  }

  Future<void> _onUpdateAvatar(
    UpdateAvatarEvent event,
    Emitter<ProfileState> emit,
  ) async {
    if (_cachedUser == null) {
      emit(const ProfileError(message: 'لا توجد بيانات للتحديث'));
      return;
    }

    emit(ProfileLoaded(
      user: _cachedUser!,
      documents: _cachedDocuments,
      emergencyContacts: _cachedEmergencyContacts,
      isUpdating: true,
    ));

    try {
      final formData = FormData.fromMap({
        'avatar': await MultipartFile.fromFile(
          event.imagePath,
          filename: event.imagePath.split('/').last,
        ),
      });

      final response = await apiClient.dio.post(
        '/auth/profile/avatar',
        data: formData,
      );

      if (response.statusCode == 200 && response.data != null) {
        final avatarUrl = response.data['avatarUrl'] ?? response.data['data']?['avatarUrl'];

        emit(AvatarUpdateSuccess(
          message: 'تم تحديث الصورة الشخصية بنجاح',
          avatarUrl: avatarUrl,
        ));

        // Refresh profile to get updated data
        add(const RefreshProfileEvent());
      } else {
        emit(ProfileError(
          message: 'فشل في تحديث الصورة الشخصية',
          previousState: ProfileLoaded(
            user: _cachedUser!,
            documents: _cachedDocuments,
            emergencyContacts: _cachedEmergencyContacts,
          ),
        ));
      }
    } catch (e) {
      emit(ProfileError(
        message: _handleError(e),
        previousState: ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ),
      ));
    }
  }

  Future<void> _onRemoveAvatar(
    RemoveAvatarEvent event,
    Emitter<ProfileState> emit,
  ) async {
    if (_cachedUser == null) {
      emit(const ProfileError(message: 'لا توجد بيانات للتحديث'));
      return;
    }

    emit(ProfileLoaded(
      user: _cachedUser!,
      documents: _cachedDocuments,
      emergencyContacts: _cachedEmergencyContacts,
      isUpdating: true,
    ));

    try {
      final response = await apiClient.dio.delete('/auth/profile/avatar');

      if (response.statusCode == 200) {
        emit(const AvatarUpdateSuccess(
          message: 'تم إزالة الصورة الشخصية بنجاح',
        ));

        // Refresh profile to get updated data
        add(const RefreshProfileEvent());
      } else {
        emit(ProfileError(
          message: 'فشل في إزالة الصورة الشخصية',
          previousState: ProfileLoaded(
            user: _cachedUser!,
            documents: _cachedDocuments,
            emergencyContacts: _cachedEmergencyContacts,
          ),
        ));
      }
    } catch (e) {
      emit(ProfileError(
        message: _handleError(e),
        previousState: ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ),
      ));
    }
  }

  Future<void> _onChangePassword(
    ChangePasswordEvent event,
    Emitter<ProfileState> emit,
  ) async {
    if (_cachedUser == null) {
      emit(const ProfileError(message: 'لا توجد بيانات للتحديث'));
      return;
    }

    emit(ProfileLoaded(
      user: _cachedUser!,
      documents: _cachedDocuments,
      emergencyContacts: _cachedEmergencyContacts,
      isUpdating: true,
    ));

    try {
      final response = await apiClient.dio.post('/auth/change-password', data: {
        'currentPassword': event.currentPassword,
        'newPassword': event.newPassword,
      });

      if (response.statusCode == 200) {
        emit(const PasswordChangeSuccess(
          message: 'تم تغيير كلمة المرور بنجاح',
        ));

        emit(ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ));
      } else {
        final errorMessage = response.data?['message'] ?? 'فشل في تغيير كلمة المرور';
        emit(ProfileError(
          message: errorMessage,
          previousState: ProfileLoaded(
            user: _cachedUser!,
            documents: _cachedDocuments,
            emergencyContacts: _cachedEmergencyContacts,
          ),
        ));
      }
    } catch (e) {
      emit(ProfileError(
        message: _handleError(e),
        previousState: ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ),
      ));
    }
  }

  Future<void> _onLoadDocuments(
    LoadDocumentsEvent event,
    Emitter<ProfileState> emit,
  ) async {
    try {
      final response = await apiClient.dio.get('/employee-profile/${event.userId}/documents');

      if (response.statusCode == 200 && response.data != null) {
        final data = response.data['data'];
        final documentsData = (data is Map ? data['documents'] : data) as List<dynamic>? ?? [];
        _cachedDocuments = documentsData
            .map((doc) => _parseProfileDocument(doc as Map<String, dynamic>))
            .toList();

        if (_cachedUser != null) {
          emit(ProfileLoaded(
            user: _cachedUser!,
            documents: _cachedDocuments,
            emergencyContacts: _cachedEmergencyContacts,
          ));
        }
      }
    } catch (e) {
      // Don't emit error for documents loading, just keep empty list
    }
  }

  Future<void> _onUploadDocument(
    UploadDocumentEvent event,
    Emitter<ProfileState> emit,
  ) async {
    if (_cachedUser == null) {
      emit(const ProfileError(message: 'لا توجد بيانات للتحديث'));
      return;
    }

    emit(ProfileLoaded(
      user: _cachedUser!,
      documents: _cachedDocuments,
      emergencyContacts: _cachedEmergencyContacts,
      isUpdating: true,
    ));

    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          event.filePath,
          filename: event.filePath.split('/').last,
        ),
        'type': event.documentType,
        if (event.title != null) 'title': event.title,
        if (event.expiryDate != null) 'expiryDate': event.expiryDate!.toIso8601String(),
      });

      final response = await apiClient.dio.post(
        '/employee-profile/${event.userId}/documents',
        data: formData,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final documentData = response.data['data'] ?? response.data;
        final newDocument = _parseProfileDocument(documentData as Map<String, dynamic>);
        _cachedDocuments = [..._cachedDocuments, newDocument];

        emit(DocumentUploadSuccess(
          message: 'تم رفع المستند بنجاح',
          document: newDocument,
        ));

        emit(ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ));
      } else {
        emit(ProfileError(
          message: 'فشل في رفع المستند',
          previousState: ProfileLoaded(
            user: _cachedUser!,
            documents: _cachedDocuments,
            emergencyContacts: _cachedEmergencyContacts,
          ),
        ));
      }
    } catch (e) {
      emit(ProfileError(
        message: _handleError(e),
        previousState: ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ),
      ));
    }
  }

  Future<void> _onDeleteDocument(
    DeleteDocumentEvent event,
    Emitter<ProfileState> emit,
  ) async {
    if (_cachedUser == null) {
      emit(const ProfileError(message: 'لا توجد بيانات للتحديث'));
      return;
    }

    emit(ProfileLoaded(
      user: _cachedUser!,
      documents: _cachedDocuments,
      emergencyContacts: _cachedEmergencyContacts,
      isUpdating: true,
    ));

    try {
      final response = await apiClient.dio.delete(
        '/employee-profile/${event.userId}/documents/${event.documentId}',
      );

      if (response.statusCode == 200) {
        _cachedDocuments = _cachedDocuments
            .where((doc) => doc.id != event.documentId)
            .toList();

        emit(const DocumentDeleteSuccess(message: 'تم حذف المستند بنجاح'));

        emit(ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ));
      } else {
        emit(ProfileError(
          message: 'فشل في حذف المستند',
          previousState: ProfileLoaded(
            user: _cachedUser!,
            documents: _cachedDocuments,
            emergencyContacts: _cachedEmergencyContacts,
          ),
        ));
      }
    } catch (e) {
      emit(ProfileError(
        message: _handleError(e),
        previousState: ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ),
      ));
    }
  }

  Future<void> _onLoadEmergencyContacts(
    LoadEmergencyContactsEvent event,
    Emitter<ProfileState> emit,
  ) async {
    try {
      final response = await apiClient.dio.get('/employee-profile/${event.userId}/emergency-contacts');

      if (response.statusCode == 200 && response.data != null) {
        final contactsData = response.data['data'] as List<dynamic>? ?? [];
        _cachedEmergencyContacts = contactsData
            .map((contact) => _parseEmergencyContact(contact as Map<String, dynamic>))
            .toList();

        if (_cachedUser != null) {
          emit(ProfileLoaded(
            user: _cachedUser!,
            documents: _cachedDocuments,
            emergencyContacts: _cachedEmergencyContacts,
          ));
        }
      }
    } catch (e) {
      // Don't emit error for contacts loading, just keep empty list
    }
  }

  Future<void> _onAddEmergencyContact(
    AddEmergencyContactEvent event,
    Emitter<ProfileState> emit,
  ) async {
    if (_cachedUser == null) {
      emit(const ProfileError(message: 'لا توجد بيانات للتحديث'));
      return;
    }

    if (_cachedEmergencyContacts.length >= 3) {
      emit(ProfileError(
        message: 'لا يمكن إضافة أكثر من 3 جهات اتصال للطوارئ',
        previousState: ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ),
      ));
      return;
    }

    emit(ProfileLoaded(
      user: _cachedUser!,
      documents: _cachedDocuments,
      emergencyContacts: _cachedEmergencyContacts,
      isUpdating: true,
    ));

    try {
      final response = await apiClient.dio.post(
        '/employee-profile/${event.userId}/emergency-contacts',
        data: {
          'name': event.name,
          'phone': event.phone,
          'relationship': event.relationship,
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final contactData = response.data['data'] ?? response.data;
        final newContact = _parseEmergencyContact(contactData as Map<String, dynamic>);
        _cachedEmergencyContacts = [..._cachedEmergencyContacts, newContact];

        emit(const EmergencyContactSuccess(
          message: 'تمت إضافة جهة اتصال الطوارئ بنجاح',
        ));

        emit(ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ));
      } else {
        emit(ProfileError(
          message: 'فشل في إضافة جهة اتصال الطوارئ',
          previousState: ProfileLoaded(
            user: _cachedUser!,
            documents: _cachedDocuments,
            emergencyContacts: _cachedEmergencyContacts,
          ),
        ));
      }
    } catch (e) {
      emit(ProfileError(
        message: _handleError(e),
        previousState: ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ),
      ));
    }
  }

  Future<void> _onUpdateEmergencyContact(
    UpdateEmergencyContactEvent event,
    Emitter<ProfileState> emit,
  ) async {
    if (_cachedUser == null) {
      emit(const ProfileError(message: 'لا توجد بيانات للتحديث'));
      return;
    }

    emit(ProfileLoaded(
      user: _cachedUser!,
      documents: _cachedDocuments,
      emergencyContacts: _cachedEmergencyContacts,
      isUpdating: true,
    ));

    try {
      final response = await apiClient.dio.patch(
        '/employee-profile/${event.userId}/emergency-contacts/${event.contactId}',
        data: {
          'name': event.name,
          'phone': event.phone,
          'relationship': event.relationship,
        },
      );

      if (response.statusCode == 200) {
        final contactData = response.data['data'] ?? response.data;
        final updatedContact = _parseEmergencyContact(contactData as Map<String, dynamic>);
        _cachedEmergencyContacts = _cachedEmergencyContacts
            .map((c) => c.id == event.contactId ? updatedContact : c)
            .toList();

        emit(const EmergencyContactSuccess(
          message: 'تم تحديث جهة اتصال الطوارئ بنجاح',
        ));

        emit(ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ));
      } else {
        emit(ProfileError(
          message: 'فشل في تحديث جهة اتصال الطوارئ',
          previousState: ProfileLoaded(
            user: _cachedUser!,
            documents: _cachedDocuments,
            emergencyContacts: _cachedEmergencyContacts,
          ),
        ));
      }
    } catch (e) {
      emit(ProfileError(
        message: _handleError(e),
        previousState: ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ),
      ));
    }
  }

  Future<void> _onDeleteEmergencyContact(
    DeleteEmergencyContactEvent event,
    Emitter<ProfileState> emit,
  ) async {
    if (_cachedUser == null) {
      emit(const ProfileError(message: 'لا توجد بيانات للتحديث'));
      return;
    }

    emit(ProfileLoaded(
      user: _cachedUser!,
      documents: _cachedDocuments,
      emergencyContacts: _cachedEmergencyContacts,
      isUpdating: true,
    ));

    try {
      final response = await apiClient.dio.delete(
        '/employee-profile/${event.userId}/emergency-contacts/${event.contactId}',
      );

      if (response.statusCode == 200) {
        _cachedEmergencyContacts = _cachedEmergencyContacts
            .where((c) => c.id != event.contactId)
            .toList();

        emit(const EmergencyContactSuccess(
          message: 'تم حذف جهة اتصال الطوارئ بنجاح',
        ));

        emit(ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ));
      } else {
        emit(ProfileError(
          message: 'فشل في حذف جهة اتصال الطوارئ',
          previousState: ProfileLoaded(
            user: _cachedUser!,
            documents: _cachedDocuments,
            emergencyContacts: _cachedEmergencyContacts,
          ),
        ));
      }
    } catch (e) {
      emit(ProfileError(
        message: _handleError(e),
        previousState: ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ),
      ));
    }
  }

  void _onClearError(
    ClearProfileErrorEvent event,
    Emitter<ProfileState> emit,
  ) {
    if (state is ProfileError) {
      final errorState = state as ProfileError;
      if (errorState.previousState != null) {
        emit(errorState.previousState!);
      } else if (_cachedUser != null) {
        emit(ProfileLoaded(
          user: _cachedUser!,
          documents: _cachedDocuments,
          emergencyContacts: _cachedEmergencyContacts,
        ));
      } else {
        emit(const ProfileInitial());
      }
    }
  }

  UserEntity _parseUserEntity(Map<String, dynamic> data) {
    return UserEntity(
      id: data['id'] ?? '',
      email: data['email'] ?? '',
      phone: data['phone'],
      firstName: data['firstName'] ?? '',
      lastName: data['lastName'] ?? '',
      avatar: data['avatar'],
      employeeCode: data['employeeCode'],
      jobTitle: data['jobTitle'],
      role: data['role'] ?? 'EMPLOYEE',
      status: data['status'] ?? 'ACTIVE',
      branch: data['branch'] != null
          ? BranchEntity(
              id: data['branch']['id'] ?? '',
              name: data['branch']['name'] ?? '',
              nameEn: data['branch']['nameEn'],
              latitude: (data['branch']['latitude'] ?? 0).toDouble(),
              longitude: (data['branch']['longitude'] ?? 0).toDouble(),
              geofenceRadius: data['branch']['geofenceRadius'] ?? 100,
              workStartTime: data['branch']['workStartTime'] ?? '09:00',
              workEndTime: data['branch']['workEndTime'] ?? '17:00',
            )
          : null,
      department: data['department'] != null
          ? DepartmentEntity(
              id: data['department']['id'] ?? '',
              name: data['department']['name'] ?? '',
              nameEn: data['department']['nameEn'],
            )
          : null,
      annualLeaveDays: data['annualLeaveDays'],
      usedLeaveDays: data['usedLeaveDays'],
      remainingLeaveDays: data['remainingLeaveDays'],
    );
  }

  ProfileDocument _parseProfileDocument(Map<String, dynamic> data) {
    final expiryDate = data['expiryDate'] != null
        ? DateTime.tryParse(data['expiryDate'].toString())
        : null;
    final now = DateTime.now();
    final isExpired = expiryDate != null && expiryDate.isBefore(now);
    final isExpiringSoon = expiryDate != null &&
        !isExpired &&
        expiryDate.difference(now).inDays <= 30;

    return ProfileDocument(
      id: data['id'] ?? '',
      title: data['title'] ?? data['documentType'] ?? '',
      documentType: data['documentType'] ?? '',
      fileUrl: data['fileUrl'] ?? data['url'],
      expiryDate: expiryDate,
      createdAt: DateTime.tryParse(data['createdAt']?.toString() ?? '') ?? DateTime.now(),
      isExpired: isExpired,
      isExpiringSoon: isExpiringSoon,
    );
  }

  EmergencyContact _parseEmergencyContact(Map<String, dynamic> data) {
    return EmergencyContact(
      id: data['id'] ?? '',
      name: data['name'] ?? '',
      phone: data['phone'] ?? '',
      relationship: data['relationship'] ?? '',
    );
  }

  String _handleError(dynamic error) {
    if (error is DioException) {
      if (error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout) {
        return 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.';
      }
      final statusCode = error.response?.statusCode;
      if (statusCode == 401) {
        return 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.';
      }
      if (statusCode == 403) {
        return 'ليس لديك صلاحية للقيام بهذا الإجراء.';
      }
      if (statusCode == 404) {
        return 'لم يتم العثور على البيانات المطلوبة.';
      }
      if (statusCode != null && statusCode >= 500) {
        return 'حدث خطأ في الخادم. يرجى المحاولة لاحقاً.';
      }
      final message = error.response?.data?['message'];
      if (message != null) {
        return message.toString();
      }
    }
    return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  }
}
