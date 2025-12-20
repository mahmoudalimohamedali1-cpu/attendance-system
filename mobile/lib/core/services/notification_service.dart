import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:logger/logger.dart';

class NotificationService {
  FirebaseMessaging? _firebaseMessaging;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  final Logger _logger = Logger();
  
  FirebaseMessaging? get firebaseMessaging {
    try {
      _firebaseMessaging ??= FirebaseMessaging.instance;
      return _firebaseMessaging;
    } catch (e) {
      _logger.e('Firebase not initialized: $e');
      return null;
    }
  }

  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Request permission
      await _requestPermission();
    } catch (e) {
      _logger.e('Error requesting notification permission: $e');
    }

    try {
      // Initialize local notifications
      await _initializeLocalNotifications();
    } catch (e) {
      _logger.e('Error initializing local notifications: $e');
    }

    try {
      // Configure Firebase messaging
      await _configureFirebaseMessaging();
    } catch (e) {
      _logger.e('Error configuring Firebase messaging: $e');
      // Continue without Firebase - app should still work
    }

    _isInitialized = true;
  }

  Future<void> _requestPermission() async {
    try {
      final messaging = firebaseMessaging;
      if (messaging == null) {
        _logger.w('Firebase not available, skipping permission request');
        return;
      }
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      _logger.i('Notification permission status: ${settings.authorizationStatus}');
    } catch (e) {
      _logger.e('Error requesting Firebase permission: $e');
      // Continue without Firebase permissions
    }
  }

  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channel for Android
    await _createNotificationChannel();
  }

  Future<void> _createNotificationChannel() async {
    const channel = AndroidNotificationChannel(
      'attendance_channel',
      'إشعارات الحضور',
      description: 'إشعارات نظام الحضور والانصراف',
      importance: Importance.high,
      playSound: true,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  Future<void> _configureFirebaseMessaging() async {
    try {
      final messaging = firebaseMessaging;
      if (messaging == null) {
        _logger.w('Firebase not initialized, skipping Firebase Messaging configuration');
        return;
      }
      // Foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

      // Background messages (when app is in background)
      FirebaseMessaging.onMessageOpenedApp.listen(_handleBackgroundMessage);

      // Handle initial message (when app is terminated)
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleBackgroundMessage(initialMessage);
      }
    } catch (e) {
      _logger.e('Firebase Messaging not available: $e');
      // Continue without Firebase - app should still work
    }
  }

  void _handleForegroundMessage(RemoteMessage message) {
    _logger.i('Foreground message received: ${message.notification?.title}');
    
    // Show local notification
    showLocalNotification(
      title: message.notification?.title ?? '',
      body: message.notification?.body ?? '',
      payload: message.data.toString(),
    );
  }

  void _handleBackgroundMessage(RemoteMessage message) {
    _logger.i('Background message opened: ${message.notification?.title}');
    // Navigate to appropriate screen based on message data
    // This should be handled by your navigation service
  }

  void _onNotificationTapped(NotificationResponse response) {
    _logger.i('Notification tapped: ${response.payload}');
    // Handle notification tap - navigate to appropriate screen
  }

  Future<String?> getFCMToken() async {
    try {
      final messaging = firebaseMessaging;
      if (messaging == null) {
        _logger.w('Firebase not available, cannot get FCM token');
        return null;
      }
      final token = await messaging.getToken();
      _logger.i('FCM Token: $token');
      return token;
    } catch (e) {
      _logger.e('Error getting FCM token: $e');
      return null;
    }
  }

  Future<void> subscribeToTopic(String topic) async {
    final messaging = firebaseMessaging;
    if (messaging == null) {
      _logger.w('Firebase not available, cannot subscribe to topic');
      return;
    }
    await messaging.subscribeToTopic(topic);
    _logger.i('Subscribed to topic: $topic');
  }

  Future<void> unsubscribeFromTopic(String topic) async {
    final messaging = firebaseMessaging;
    if (messaging == null) {
      _logger.w('Firebase not available, cannot unsubscribe from topic');
      return;
    }
    await messaging.unsubscribeFromTopic(topic);
    _logger.i('Unsubscribed from topic: $topic');
  }

  Future<void> showLocalNotification({
    required String title,
    required String body,
    String? payload,
    int id = 0,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'attendance_channel',
      'إشعارات الحضور',
      channelDescription: 'إشعارات نظام الحضور والانصراف',
      importance: Importance.high,
      priority: Priority.high,
      playSound: true,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      id,
      title,
      body,
      notificationDetails,
      payload: payload,
    );
  }

  Future<void> cancelNotification(int id) async {
    await _localNotifications.cancel(id);
  }

  Future<void> cancelAllNotifications() async {
    await _localNotifications.cancelAll();
  }
}

