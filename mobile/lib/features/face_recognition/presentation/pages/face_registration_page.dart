import 'dart:async';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../../../../core/services/face_recognition_service.dart';

/// صفحة تسجيل الوجه
/// تستخدم لتسجيل وجه الموظف لأول مرة
class FaceRegistrationPage extends StatefulWidget {
  final Function(List<double> embedding, String? imagePath)? onFaceRegistered;
  final bool isVerification;
  final List<double>? storedEmbedding;

  const FaceRegistrationPage({
    super.key,
    this.onFaceRegistered,
    this.isVerification = false,
    this.storedEmbedding,
  });

  @override
  State<FaceRegistrationPage> createState() => _FaceRegistrationPageState();
}

class _FaceRegistrationPageState extends State<FaceRegistrationPage> with WidgetsBindingObserver {
  CameraController? _cameraController;
  final FaceRecognitionService _faceService = FaceRecognitionService();
  
  bool _isInitialized = false;
  bool _isProcessing = false;
  bool _faceDetected = false;
  String _statusMessage = 'جاري التهيئة...';
  double _quality = 0;
  List<double>? _currentEmbedding;
  Timer? _detectionTimer;
  
  // ألوان الحالة
  Color _statusColor = Colors.grey;
  
  // إعدادات الواجهة
  final double _ovalWidth = 250;
  final double _ovalHeight = 330;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _detectionTimer?.cancel();
    _cameraController?.dispose();
    _faceService.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (_cameraController == null || !_cameraController!.value.isInitialized) {
      return;
    }

    if (state == AppLifecycleState.inactive) {
      _cameraController?.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _initializeCamera();
    }
  }

  Future<void> _initializeCamera() async {
    try {
      await _faceService.initialize();
      
      final cameras = await availableCameras();
      final frontCamera = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.front,
        orElse: () => cameras.first,
      );

      _cameraController = CameraController(
        frontCamera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.yuv420,
      );

      await _cameraController!.initialize();
      
      if (!mounted) return;

      setState(() {
        _isInitialized = true;
        _statusMessage = 'ضع وجهك داخل الإطار';
        _statusColor = Colors.blue;
      });

      // بدء الكشف المستمر
      _startFaceDetection();
    } catch (e) {
      setState(() {
        _statusMessage = 'خطأ في تهيئة الكاميرا: $e';
        _statusColor = Colors.red;
      });
    }
  }

  void _startFaceDetection() {
    _detectionTimer = Timer.periodic(const Duration(milliseconds: 500), (_) async {
      if (!_isProcessing && _cameraController != null && _cameraController!.value.isInitialized) {
        await _detectFace();
      }
    });
  }

  Future<void> _detectFace() async {
    if (_isProcessing) return;
    
    setState(() => _isProcessing = true);

    try {
      // التقاط صورة
      final image = await _cameraController!.takePicture();
      
      // اكتشاف الوجه باستخدام ML Kit الحقيقي
      final result = await _faceService.detectFacesFromPath(image.path);

      if (!mounted) return;

      if (result.success) {
        setState(() {
          _faceDetected = true;
          _quality = result.quality ?? 0;
          _currentEmbedding = result.embedding;
          _statusMessage = 'تم اكتشاف الوجه ✓ (جودة: ${(_quality * 100).toStringAsFixed(0)}%)';
          _statusColor = Colors.green;
        });
      } else {
        setState(() {
          _faceDetected = false;
          _quality = 0;
          _currentEmbedding = null;
          _statusMessage = result.error ?? 'لم يتم اكتشاف وجه';
          _statusColor = Colors.orange;
        });
      }
    } catch (e) {
      // تجاهل الأخطاء الطفيفة أثناء الكشف المستمر
      if (mounted) {
        setState(() {
          _statusMessage = 'خطأ في الكشف';
          _statusColor = Colors.red;
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  Future<void> _captureAndRegister() async {
    if (_currentEmbedding == null || !_faceDetected) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('الرجاء وضع وجهك داخل الإطار'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // التحقق من جودة الصورة قبل التسجيل
    if (_quality < 0.5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('جودة الصورة منخفضة، الرجاء إعادة الالتقاط'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isProcessing = true;
      _statusMessage = 'جاري التسجيل...';
    });

    try {
      // التقاط الصورة النهائية
      final image = await _cameraController!.takePicture();
      
      // التحقق مرة أخرى من الوجه في الصورة النهائية
      final finalResult = await _faceService.detectFacesFromPath(image.path);
      
      if (!finalResult.success) {
        if (mounted) {
          setState(() {
            _statusMessage = finalResult.error ?? 'فشل التحقق من الوجه';
            _statusColor = Colors.red;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(finalResult.error ?? 'فشل التحقق من الوجه'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }
      
      // إذا كان التحقق
      if (widget.isVerification && widget.storedEmbedding != null) {
        final comparisonResult = _faceService.compareFaces(
          widget.storedEmbedding!,
          finalResult.embedding!,
        );

        if (!mounted) return;

        if (comparisonResult.isMatch) {
          Navigator.pop(context, {
            'success': true,
            'confidence': comparisonResult.confidence,
            'embedding': finalResult.embedding,
          });
        } else {
          setState(() {
            _statusMessage = 'الوجه غير مطابق - الثقة: ${(comparisonResult.confidence * 100).toStringAsFixed(0)}%';
            _statusColor = Colors.red;
            _faceDetected = false;
          });
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('فشل التحقق - نسبة التطابق: ${(comparisonResult.confidence * 100).toStringAsFixed(0)}%'),
              backgroundColor: Colors.red,
            ),
          );
        }
      } else {
        // تسجيل الوجه
        if (widget.onFaceRegistered != null) {
          widget.onFaceRegistered!(finalResult.embedding!, image.path);
        }

        if (!mounted) return;

        Navigator.pop(context, {
          'success': true,
          'embedding': finalResult.embedding,
          'imagePath': image.path,
          'quality': finalResult.quality,
        });
      }
    } catch (e) {
      setState(() {
        _statusMessage = 'خطأ: $e';
        _statusColor = Colors.red;
      });
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          widget.isVerification ? 'التحقق من الوجه' : 'تسجيل الوجه',
          style: const TextStyle(color: Colors.white),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          // عرض الكاميرا
          if (_isInitialized && _cameraController != null)
            Positioned.fill(
              child: AspectRatio(
                aspectRatio: _cameraController!.value.aspectRatio,
                child: CameraPreview(_cameraController!),
              ),
            )
          else
            const Center(
              child: CircularProgressIndicator(color: Colors.white),
            ),

          // الإطار البيضاوي
          Positioned.fill(
            child: CustomPaint(
              painter: FaceOverlayPainter(
                ovalWidth: _ovalWidth,
                ovalHeight: _ovalHeight,
                borderColor: _faceDetected ? Colors.green : Colors.white,
                overlayColor: Colors.black.withOpacity(0.6),
              ),
            ),
          ),

          // مؤشر الجودة
          Positioned(
            top: 100,
            left: 0,
            right: 0,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: _statusColor.withOpacity(0.9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_faceDetected)
                      const Icon(Icons.check_circle, color: Colors.white, size: 20),
                    if (_isProcessing)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      ),
                    const SizedBox(width: 8),
                    Text(
                      _statusMessage,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // شريط الجودة
          if (_faceDetected)
            Positioned(
              top: 160,
              left: 50,
              right: 50,
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'جودة الصورة',
                        style: TextStyle(color: Colors.white70),
                      ),
                      Text(
                        '${(_quality * 100).toStringAsFixed(0)}%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    value: _quality,
                    backgroundColor: Colors.white24,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _quality > 0.7 ? Colors.green : _quality > 0.5 ? Colors.orange : Colors.red,
                    ),
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ],
              ),
            ),

          // التعليمات
          Positioned(
            bottom: 140,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  _buildInstruction(Icons.light_mode, 'تأكد من الإضاءة الجيدة'),
                  const SizedBox(height: 8),
                  _buildInstruction(Icons.face, 'وجه الكاميرا مباشرة'),
                  const SizedBox(height: 8),
                  _buildInstruction(Icons.visibility, 'افتح عينيك'),
                ],
              ),
            ),
          ),

          // زر التسجيل
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: GestureDetector(
                onTap: _faceDetected && !_isProcessing ? _captureAndRegister : null,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _faceDetected ? Colors.green : Colors.grey,
                    border: Border.all(color: Colors.white, width: 4),
                    boxShadow: _faceDetected
                        ? [
                            BoxShadow(
                              color: Colors.green.withOpacity(0.5),
                              blurRadius: 20,
                              spreadRadius: 5,
                            ),
                          ]
                        : null,
                  ),
                  child: Icon(
                    widget.isVerification ? Icons.check : Icons.camera_alt,
                    color: Colors.white,
                    size: 36,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInstruction(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, color: Colors.white70, size: 20),
        const SizedBox(width: 12),
        Text(
          text,
          style: const TextStyle(color: Colors.white70),
        ),
      ],
    );
  }
}

/// رسم الإطار البيضاوي
class FaceOverlayPainter extends CustomPainter {
  final double ovalWidth;
  final double ovalHeight;
  final Color borderColor;
  final Color overlayColor;

  FaceOverlayPainter({
    required this.ovalWidth,
    required this.ovalHeight,
    required this.borderColor,
    required this.overlayColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2 - 50);
    
    // رسم الخلفية الداكنة
    final backgroundPaint = Paint()
      ..color = overlayColor
      ..style = PaintingStyle.fill;

    final overlayPath = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height));

    final ovalPath = Path()
      ..addOval(Rect.fromCenter(
        center: center,
        width: ovalWidth,
        height: ovalHeight,
      ));

    final combinedPath = Path.combine(
      PathOperation.difference,
      overlayPath,
      ovalPath,
    );

    canvas.drawPath(combinedPath, backgroundPaint);

    // رسم حدود الإطار
    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    canvas.drawOval(
      Rect.fromCenter(
        center: center,
        width: ovalWidth,
        height: ovalHeight,
      ),
      borderPaint,
    );

    // رسم علامات الزوايا
    final cornerLength = 30.0;
    final cornerPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;

    final rect = Rect.fromCenter(
      center: center,
      width: ovalWidth,
      height: ovalHeight,
    );

    // الزاوية العلوية اليسرى
    canvas.drawLine(
      Offset(rect.left + 20, rect.top),
      Offset(rect.left + 20 + cornerLength, rect.top),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(rect.left, rect.top + 20),
      Offset(rect.left, rect.top + 20 + cornerLength),
      cornerPaint,
    );

    // الزاوية العلوية اليمنى
    canvas.drawLine(
      Offset(rect.right - 20 - cornerLength, rect.top),
      Offset(rect.right - 20, rect.top),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(rect.right, rect.top + 20),
      Offset(rect.right, rect.top + 20 + cornerLength),
      cornerPaint,
    );

    // الزاوية السفلية اليسرى
    canvas.drawLine(
      Offset(rect.left + 20, rect.bottom),
      Offset(rect.left + 20 + cornerLength, rect.bottom),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(rect.left, rect.bottom - 20 - cornerLength),
      Offset(rect.left, rect.bottom - 20),
      cornerPaint,
    );

    // الزاوية السفلية اليمنى
    canvas.drawLine(
      Offset(rect.right - 20 - cornerLength, rect.bottom),
      Offset(rect.right - 20, rect.bottom),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(rect.right, rect.bottom - 20 - cornerLength),
      Offset(rect.right, rect.bottom - 20),
      cornerPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

