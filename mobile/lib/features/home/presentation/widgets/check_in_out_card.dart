import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:camera/camera.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../../core/services/face_recognition_service.dart';
import '../../../attendance/presentation/bloc/attendance_bloc.dart';

class CheckInOutCard extends StatefulWidget {
  const CheckInOutCard({super.key});

  @override
  State<CheckInOutCard> createState() => _CheckInOutCardState();
}

class _CheckInOutCardState extends State<CheckInOutCard> {
  // مفتاح لتخزين حالة تسجيل الوجه (يمكن استبداله بالتخزين المحلي)
  bool _hasFaceRegistered = false;
  List<double>? _storedFaceEmbedding;
  
  // حفظ آخر حالة حضور معروفة
  bool? _lastKnownCheckedIn;
  bool? _lastKnownCheckedOut;

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AttendanceBloc, AttendanceState>(
      listener: (context, state) {
        if (state is AttendanceCheckInSuccess) {
          // تحديث حالة تسجيل الوجه بعد نجاح الحضور
          setState(() {
            _hasFaceRegistered = true;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      state.isLate
                          ? 'تم تسجيل الحضور متأخراً (${state.lateMinutes} دقيقة)'
                          : context.tr('check_in_success'),
                    ),
                  ),
                ],
              ),
              backgroundColor:
                  state.isLate ? AppTheme.warningColor : AppTheme.successColor,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          );
        } else if (state is AttendanceCheckOutSuccess) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      state.isEarlyLeave
                          ? 'تم تسجيل الانصراف المبكر (${state.earlyLeaveMinutes} دقيقة)'
                          : context.tr('check_out_success'),
                    ),
                  ),
                ],
              ),
              backgroundColor: state.isEarlyLeave
                  ? AppTheme.warningColor
                  : AppTheme.successColor,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          );
        } else if (state is AttendanceError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.error, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(child: Text(state.message)),
                ],
              ),
              backgroundColor: AppTheme.errorColor,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          );
        }
      },
      builder: (context, state) {
        final isLoading = state is AttendanceLoading;
        
        // تحديد حالة الحضور
        bool hasCheckedIn;
        bool hasCheckedOut;
        
        if (state is AttendanceLoaded) {
          hasCheckedIn = state.todayAttendance?.checkInTime != null;
          hasCheckedOut = state.todayAttendance?.checkOutTime != null;
          _lastKnownCheckedIn = hasCheckedIn;
          _lastKnownCheckedOut = hasCheckedOut;
          // إذا سجّل حضور سابقاً اليوم، يعني الوجه مسجل
          if (hasCheckedIn && !_hasFaceRegistered) {
            _hasFaceRegistered = true;
          }
        } else if (state is AttendanceCheckInSuccess) {
          hasCheckedIn = true;
          hasCheckedOut = false;
          _lastKnownCheckedIn = true;
        } else if (state is AttendanceCheckOutSuccess) {
          hasCheckedIn = true;
          hasCheckedOut = true;
          _lastKnownCheckedOut = true;
        } else {
          // عند حدوث خطأ أو تحميل، استخدم آخر حالة
          hasCheckedIn = _lastKnownCheckedIn ?? false;
          hasCheckedOut = _lastKnownCheckedOut ?? false;
        }

        return Card(
          elevation: 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Row(
                  children: [
                    const Icon(
                      Icons.touch_app_outlined,
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'تسجيل الحضور والانصراف',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                
                Row(
                  children: [
                    // Check In Button
                    Expanded(
                      child: _ActionButton(
                        title: context.tr('check_in'),
                        icon: Icons.login_rounded,
                        color: AppTheme.successColor,
                        isEnabled: !hasCheckedIn && !isLoading,
                        isLoading: isLoading && !hasCheckedIn,
                        isDone: hasCheckedIn,
                        onPressed: () => _handleCheckIn(context),
                      ),
                    ),
                    const SizedBox(width: 16),
                    
                    // Check Out Button
                    Expanded(
                      child: _ActionButton(
                        title: context.tr('check_out'),
                        icon: Icons.logout_rounded,
                        color: AppTheme.errorColor,
                        isEnabled: hasCheckedIn && !hasCheckedOut && !isLoading,
                        isLoading: isLoading && hasCheckedIn,
                        isDone: hasCheckedOut,
                        onPressed: () => _handleCheckOut(context),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// معالجة تسجيل الحضور مع التعرف على الوجه
  Future<void> _handleCheckIn(BuildContext context) async {
    // فتح صفحة التعرف على الوجه
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (context) => FaceVerificationScreen(
          isRegistration: !_hasFaceRegistered,
          storedEmbedding: _storedFaceEmbedding,
          title: _hasFaceRegistered ? 'التحقق من الوجه' : 'تسجيل الوجه',
        ),
      ),
    );

    if (result != null && result['success'] == true && context.mounted) {
      final embedding = result['embedding'] as List<double>?;
      final imagePath = result['imagePath'] as String?;
      
      // تحويل الصورة لـ Base64
      String? faceImageBase64;
      if (imagePath != null) {
        try {
          final imageFile = File(imagePath);
          if (await imageFile.exists()) {
            final bytes = await imageFile.readAsBytes();
            faceImageBase64 = base64Encode(bytes);
          }
        } catch (e) {
          debugPrint('Error reading face image: $e');
        }
      }
      
      // حفظ الـ embedding محلياً إذا كان تسجيل جديد
      if (!_hasFaceRegistered && embedding != null) {
        setState(() {
          _hasFaceRegistered = true;
          _storedFaceEmbedding = embedding;
        });
      }
      
      // تسجيل الحضور مع إرسال الـ embedding والصورة للـ backend
      context.read<AttendanceBloc>().add(CheckInEvent(
        faceEmbedding: embedding,
        faceImage: faceImageBase64,
      ));
    }
  }

  /// معالجة تسجيل الانصراف مع التعرف على الوجه
  Future<void> _handleCheckOut(BuildContext context) async {
    // التحقق من الوجه قبل تسجيل الانصراف
    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (context) => FaceVerificationScreen(
          isRegistration: false,
          storedEmbedding: _storedFaceEmbedding,
          title: 'التحقق من الوجه للانصراف',
        ),
      ),
    );

    if (result != null && result['success'] == true && context.mounted) {
      final embedding = result['embedding'] as List<double>?;
      context.read<AttendanceBloc>().add(CheckOutEvent(faceEmbedding: embedding));
    }
  }
}

/// شاشة التحقق من الوجه / تسجيل الوجه
class FaceVerificationScreen extends StatefulWidget {
  final bool isRegistration;
  final List<double>? storedEmbedding;
  final String title;

  const FaceVerificationScreen({
    super.key,
    required this.isRegistration,
    this.storedEmbedding,
    required this.title,
  });

  @override
  State<FaceVerificationScreen> createState() => _FaceVerificationScreenState();
}

class _FaceVerificationScreenState extends State<FaceVerificationScreen> {
  CameraController? _cameraController;
  final FaceRecognitionService _faceService = FaceRecognitionService();
  
  bool _isInitialized = false;
  bool _isProcessing = false;
  bool _faceDetected = false;
  String _statusMessage = 'جاري تهيئة الكاميرا...';
  Color _statusColor = Colors.blue;
  List<double>? _currentEmbedding;
  String? _currentImagePath; // مسار الصورة الحالية
  double _quality = 0;
  int _attemptCount = 0;
  static const int _maxAttempts = 5;

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _faceService.dispose();
    super.dispose();
  }

  Future<void> _initializeCamera() async {
    try {
      await _faceService.initialize();
      
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() {
          _statusMessage = 'لا توجد كاميرا متاحة';
          _statusColor = Colors.red;
        });
        return;
      }

      // البحث عن الكاميرا الأمامية
      CameraDescription? frontCamera;
      for (final camera in cameras) {
        if (camera.lensDirection == CameraLensDirection.front) {
          frontCamera = camera;
          break;
        }
      }

      _cameraController = CameraController(
        frontCamera ?? cameras.first,
        ResolutionPreset.high, // استخدام دقة عالية للتعرف الأفضل
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _cameraController!.initialize();

      if (mounted) {
        setState(() {
          _isInitialized = true;
          _statusMessage = widget.isRegistration 
              ? 'ضع وجهك داخل الإطار لتسجيله'
              : 'ضع وجهك داخل الإطار للتحقق';
          _statusColor = Colors.blue;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _statusMessage = 'فشل في تشغيل الكاميرا: $e';
          _statusColor = Colors.red;
        });
      }
    }
  }

  Future<void> _captureAndProcess() async {
    if (!_isInitialized || _isProcessing) return;

    setState(() {
      _isProcessing = true;
      _statusMessage = 'جاري تحليل الوجه...';
      _statusColor = Colors.orange;
    });

    try {
      // التقاط الصورة
      final XFile image = await _cameraController!.takePicture();
      
      // استخدام ML Kit الحقيقي لاكتشاف الوجه
      final result = await _faceService.detectFacesFromPath(image.path);
      
      if (!mounted) return;

      if (!result.success) {
        _attemptCount++;
        setState(() {
          _faceDetected = false;
          _currentEmbedding = null;
          _statusMessage = result.error ?? 'فشل اكتشاف الوجه';
          _statusColor = Colors.red;
        });
        
        // عرض رسالة التحذير
        if (_attemptCount >= _maxAttempts) {
          _showMaxAttemptsWarning();
        }
        return;
      }

      // تم اكتشاف الوجه بنجاح
      final embedding = result.embedding!;
      final quality = result.quality ?? 0.0;
      
      setState(() {
        _faceDetected = true;
        _currentEmbedding = embedding;
        _currentImagePath = image.path; // حفظ مسار الصورة
        _quality = quality;
        _statusMessage = 'تم اكتشاف الوجه ✓ (جودة: ${(quality * 100).toStringAsFixed(0)}%)';
        _statusColor = Colors.green;
      });

      // إذا كان التحقق (وليس تسجيل جديد)
      if (!widget.isRegistration) {
        await _verifyFace(embedding, image.path);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _statusMessage = 'حدث خطأ: $e';
          _statusColor = Colors.red;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  Future<void> _verifyFace(List<double> currentEmbedding, String imagePath) async {
    // إرسال الـ embedding للـ backend للتحقق/التسجيل
    // الـ backend سيتعامل مع التحقق من الوجه أو تسجيله إذا لم يكن موجوداً
    setState(() {
      _statusMessage = 'تم التقاط الوجه بنجاح ✓';
      _statusColor = Colors.green;
    });
    
    await Future.delayed(const Duration(milliseconds: 500));
    
    if (mounted) {
      Navigator.pop(context, {
        'success': true,
        'embedding': currentEmbedding,
        'imagePath': imagePath,
      });
    }
  }

  void _showMaxAttemptsWarning() {
    if (!mounted) return;
    
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: Colors.orange),
            SizedBox(width: 8),
            Text('تحذير'),
          ],
        ),
        content: const Text(
          'لقد تجاوزت الحد الأقصى للمحاولات.\n'
          'تأكد من:\n'
          '• الإضاءة الجيدة\n'
          '• توجيه وجهك مباشرة للكاميرا\n'
          '• فتح عينيك\n'
          '• عدم وجود حاجز على الوجه',
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context);
            },
            child: const Text('إلغاء'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              setState(() {
                _attemptCount = 0;
              });
            },
            child: const Text('إعادة المحاولة'),
          ),
        ],
      ),
    );
  }

  void _confirmRegistration() {
    if (_currentEmbedding != null && _quality >= 0.5) {
      Navigator.pop(context, {
        'success': true,
        'embedding': _currentEmbedding,
        'quality': _quality,
        'imagePath': _currentImagePath, // إضافة مسار الصورة
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('جودة الصورة منخفضة، الرجاء إعادة الالتقاط'),
          backgroundColor: Colors.orange,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(widget.title, style: const TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          // Status bar
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            color: _statusColor.withOpacity(0.9),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (_isProcessing)
                  const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                else
                  Icon(
                    _faceDetected ? Icons.check_circle : Icons.face,
                    color: Colors.white,
                  ),
                const SizedBox(width: 10),
                Flexible(
                  child: Text(
                    _statusMessage,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
          
          // محاولات
          if (_attemptCount > 0)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
              color: Colors.black54,
              child: Text(
                'المحاولة $_attemptCount من $_maxAttempts',
                style: TextStyle(
                  color: _attemptCount >= _maxAttempts - 1 ? Colors.red : Colors.white70,
                  fontSize: 12,
                ),
              ),
            ),
          
          // Camera preview
          Expanded(
            child: _isInitialized && _cameraController != null
                ? Stack(
                    alignment: Alignment.center,
                    children: [
                      CameraPreview(_cameraController!),
                      // Face guide overlay
                      CustomPaint(
                        size: Size(
                          MediaQuery.of(context).size.width,
                          MediaQuery.of(context).size.height * 0.5,
                        ),
                        painter: _FaceGuidePainter(isDetected: _faceDetected),
                      ),
                      // Quality indicator
                      if (_faceDetected)
                        Positioned(
                          top: 20,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: _quality >= 0.7 ? Colors.green : _quality >= 0.5 ? Colors.orange : Colors.red,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  _quality >= 0.7 ? Icons.thumb_up : Icons.thumb_down,
                                  color: Colors.white,
                                  size: 16,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'جودة: ${(_quality * 100).toStringAsFixed(0)}%',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  )
                : Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const CircularProgressIndicator(color: Colors.white),
                        const SizedBox(height: 16),
                        Text(_statusMessage, style: const TextStyle(color: Colors.white)),
                      ],
                    ),
                  ),
          ),
          
          // Action buttons
          Container(
            padding: const EdgeInsets.all(20),
            color: Colors.black87,
            child: Column(
              children: [
                // Instructions
                const Padding(
                  padding: EdgeInsets.only(bottom: 16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _Instruction(icon: Icons.light_mode, text: 'إضاءة جيدة'),
                      _Instruction(icon: Icons.face, text: 'انظر للكاميرا'),
                      _Instruction(icon: Icons.visibility, text: 'افتح عينيك'),
                    ],
                  ),
                ),
                
                // Capture button
                if (!_faceDetected || !widget.isRegistration)
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isProcessing ? null : _captureAndProcess,
                      icon: _isProcessing
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(Icons.camera_alt),
                      label: Text(_isProcessing ? 'جاري تحليل الوجه...' : 'التقاط وتحليل'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                
                // Confirm button (for registration only)
                if (_faceDetected && widget.isRegistration) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _quality >= 0.5 ? _confirmRegistration : null,
                      icon: const Icon(Icons.check),
                      label: Text(_quality >= 0.5 ? 'تأكيد وتسجيل الحضور' : 'الجودة منخفضة - أعد الالتقاط'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: _quality >= 0.5 ? Colors.green : Colors.grey,
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _faceDetected = false;
                        _currentEmbedding = null;
                        _quality = 0;
                        _statusMessage = 'ضع وجهك داخل الإطار';
                        _statusColor = Colors.blue;
                      });
                    },
                    child: const Text('إعادة الالتقاط', style: TextStyle(color: Colors.white70)),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Instruction extends StatelessWidget {
  final IconData icon;
  final String text;
  
  const _Instruction({required this.icon, required this.text});
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: Colors.white54, size: 24),
        const SizedBox(height: 4),
        Text(text, style: const TextStyle(color: Colors.white54, fontSize: 11)),
      ],
    );
  }
}

class _FaceGuidePainter extends CustomPainter {
  final bool isDetected;
  
  _FaceGuidePainter({this.isDetected = false});
  
  @override
  void paint(Canvas canvas, Size size) {
    final color = isDetected ? Colors.green : Colors.white;
    final paint = Paint()
      ..color = color.withOpacity(0.8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;

    final center = Offset(size.width / 2, size.height / 2);
    final rect = Rect.fromCenter(center: center, width: size.width * 0.6, height: size.height * 0.7);

    canvas.drawOval(rect, paint);

    // Background overlay
    final bgPaint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;

    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addOval(rect);
    path.fillType = PathFillType.evenOdd;
    canvas.drawPath(path, bgPaint);
  }

  @override
  bool shouldRepaint(covariant _FaceGuidePainter oldDelegate) => 
      oldDelegate.isDetected != isDetected;
}

class _ActionButton extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final bool isEnabled;
  final bool isLoading;
  final bool isDone;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.title,
    required this.icon,
    required this.color,
    required this.isEnabled,
    required this.isLoading,
    required this.isDone,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 100,
      decoration: BoxDecoration(
        color: isDone
            ? Colors.grey[200]
            : isEnabled
                ? color.withOpacity(0.1)
                : Colors.grey[100],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDone
              ? Colors.grey[300]!
              : isEnabled
                  ? color.withOpacity(0.3)
                  : Colors.grey[200]!,
          width: 2,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isEnabled ? onPressed : null,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (isLoading)
                  SizedBox(
                    width: 32,
                    height: 32,
                    child: CircularProgressIndicator(
                      strokeWidth: 3,
                      valueColor: AlwaysStoppedAnimation<Color>(color),
                    ),
                  )
                else if (isDone)
                  const Icon(
                    Icons.check_circle,
                    size: 32,
                    color: Colors.grey,
                  )
                else
                  Icon(
                    icon,
                    size: 32,
                    color: isEnabled ? color : Colors.grey,
                  ),
                const SizedBox(height: 8),
                Text(
                  isDone ? 'تم' : title,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: isDone
                        ? Colors.grey
                        : isEnabled
                            ? color
                            : Colors.grey,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

