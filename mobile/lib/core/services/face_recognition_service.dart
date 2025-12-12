import 'dart:async';
import 'dart:io';
import 'dart:ui' show Size;
import 'package:camera/camera.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';
import 'package:logger/logger.dart';
import 'facenet_service.dart';

/// خدمة التعرف على الوجه المتكاملة
/// تستخدم:
/// 1. Google ML Kit - لاكتشاف الوجه والتحقق من الجودة
/// 2. FaceNet (TFLite) - لاستخراج Face Embedding بدقة 99%+
class FaceRecognitionService {
  static final FaceRecognitionService _instance = FaceRecognitionService._internal();
  factory FaceRecognitionService() => _instance;
  FaceRecognitionService._internal();

  final Logger _logger = Logger();
  final FaceNetService _faceNetService = FaceNetService();
  
  late FaceDetector _faceDetector;
  bool _isInitialized = false;
  
  // إعدادات اكتشاف الوجه - دقة عالية جداً
  final FaceDetectorOptions _options = FaceDetectorOptions(
    enableContours: true,
    enableLandmarks: true,
    enableClassification: true,
    enableTracking: true,
    minFaceSize: 0.25,
    performanceMode: FaceDetectorMode.accurate,
  );

  // ثوابت التحقق من الوجه
  static const double _minFaceArea = 15000;
  static const double _maxHeadAngle = 20.0;
  static const double _minEyeOpenProbability = 0.5;
  static const double _minQualityScore = 0.6;
  static const int _requiredLandmarksCount = 6;

  /// تهيئة الخدمة
  Future<void> initialize() async {
    if (_isInitialized) return;
    
    _faceDetector = FaceDetector(options: _options);
    await _faceNetService.initialize();
    _isInitialized = true;
    _logger.i('Face Recognition Service initialized with FaceNet');
  }

  /// إغلاق الخدمة وتحرير الموارد
  Future<void> dispose() async {
    if (_isInitialized) {
      await _faceDetector.close();
      _faceNetService.dispose();
      _isInitialized = false;
    }
  }

  /// اكتشاف الوجه واستخراج الـ embedding من مسار صورة
  Future<FaceDetectionResult> detectFacesFromPath(String imagePath) async {
    return await detectFacesFromFile(File(imagePath));
  }

  /// اكتشاف الوجه واستخراج الـ embedding من ملف صورة
  Future<FaceDetectionResult> detectFacesFromFile(File imageFile) async {
    if (!_isInitialized) await initialize();

    try {
      // 1. اكتشاف الوجه باستخدام ML Kit
      final inputImage = InputImage.fromFile(imageFile);
      final faces = await _faceDetector.processImage(inputImage);
      
      if (faces.isEmpty) {
        return FaceDetectionResult.noFace();
      }

      if (faces.length > 1) {
        return FaceDetectionResult.multipleFaces(faces.length);
      }

      final face = faces.first;
      
      // 2. التحقق من أن هذا وجه حقيقي
      final realFaceCheck = _checkRealFace(face);
      if (!realFaceCheck.isReal) {
        return FaceDetectionResult.notRealFace(realFaceCheck.message);
      }
      
      // 3. التحقق من جودة الوجه
      final qualityCheck = _checkFaceQuality(face);
      if (!qualityCheck.isGood) {
        return FaceDetectionResult.poorQuality(qualityCheck.message);
      }

      // 4. استخراج FaceNet embedding من الصورة الكاملة
      // نرسل الصورة الكاملة لأن DeepFace لديه كاشف الوجه الخاص به
      final embedding = await _faceNetService.getEmbedding(imageFile);
      
      if (embedding == null || !_faceNetService.isValidEmbedding(embedding)) {
        // محاولة ثانية: إرسال الصورة المقصوصة مع padding أكبر
        final bytes = await imageFile.readAsBytes();
        final fullImage = img.decodeImage(bytes);
        
        if (fullImage != null) {
          // قص الوجه مع padding كبير
          const padding = 80;
          final x = (face.boundingBox.left - padding).clamp(0, fullImage.width - 1).toInt();
          final y = (face.boundingBox.top - padding).clamp(0, fullImage.height - 1).toInt();
          final w = (face.boundingBox.width + padding * 2).clamp(1, fullImage.width - x).toInt();
          final h = (face.boundingBox.height + padding * 2).clamp(1, fullImage.height - y).toInt();
          
          final croppedFace = img.copyCrop(
            fullImage,
            x: x,
            y: y,
            width: w,
            height: h,
          );
          
          final croppedEmbedding = await _faceNetService.getEmbeddingFromCroppedFace(croppedFace);
          
          if (croppedEmbedding != null && _faceNetService.isValidEmbedding(croppedEmbedding)) {
            return FaceDetectionResult.success(
              face: face,
              embedding: croppedEmbedding,
              quality: qualityCheck.score,
            );
          }
        }
        
        return FaceDetectionResult.error('فشل في استخراج ملامح الوجه - تأكد من تشغيل خدمة التعرف على الوجه');
      }
      
      return FaceDetectionResult.success(
        face: face,
        embedding: embedding,
        quality: qualityCheck.score,
      );
    } catch (e) {
      _logger.e('Error detecting faces from file: $e');
      return FaceDetectionResult.error('خطأ في اكتشاف الوجه: $e');
    }
  }

  /// اكتشاف الوجوه في صورة من الكاميرا
  Future<FaceDetectionResult> detectFacesFromCamera(CameraImage cameraImage, CameraDescription camera) async {
    if (!_isInitialized) await initialize();

    try {
      final inputImage = _inputImageFromCameraImage(cameraImage, camera);
      if (inputImage == null) {
        return FaceDetectionResult.error('فشل تحويل الصورة');
      }

      final faces = await _faceDetector.processImage(inputImage);
      
      if (faces.isEmpty) {
        return FaceDetectionResult.noFace();
      }

      if (faces.length > 1) {
        return FaceDetectionResult.multipleFaces(faces.length);
      }

      final face = faces.first;
      
      // التحقق من جودة الوجه فقط (الـ embedding سيستخرج من الصورة النهائية)
      final qualityCheck = _checkFaceQuality(face);
      
      return FaceDetectionResult.success(
        face: face,
        embedding: [], // سيتم استخراجه لاحقاً من الصورة النهائية
        quality: qualityCheck.score,
      );
    } catch (e) {
      _logger.e('Error detecting faces from camera: $e');
      return FaceDetectionResult.error('خطأ في اكتشاف الوجه: $e');
    }
  }

  /// مقارنة وجهين باستخدام FaceNet
  FaceComparisonResult compareFaces(List<double> embedding1, List<double> embedding2) {
    if (embedding1.isEmpty || embedding2.isEmpty) {
      return FaceComparisonResult(
        isMatch: false,
        confidence: 0,
        error: 'بيانات الوجه غير صالحة',
      );
    }

    final result = _faceNetService.compareFaces(embedding1, embedding2);
    
    return FaceComparisonResult(
      isMatch: result.isMatch,
      confidence: result.similarity,
      distance: result.distance,
      similarity: result.similarity,
      threshold: result.threshold,
    );
  }

  /// التحقق من أن الوجه حقيقي وليس صورة
  RealFaceCheck _checkRealFace(Face face) {
    final issues = <String>[];
    
    // 1. التحقق من وجود العلامات الأساسية
    final requiredLandmarks = [
      FaceLandmarkType.leftEye,
      FaceLandmarkType.rightEye,
      FaceLandmarkType.noseBase,
      FaceLandmarkType.leftMouth,
      FaceLandmarkType.rightMouth,
      FaceLandmarkType.bottomMouth,
    ];
    
    int foundLandmarks = 0;
    for (final landmark in requiredLandmarks) {
      if (face.landmarks[landmark] != null) {
        foundLandmarks++;
      }
    }
    
    if (foundLandmarks < _requiredLandmarksCount) {
      issues.add('لم يتم اكتشاف ملامح الوجه ($foundLandmarks/$_requiredLandmarksCount)');
    }
    
    // 2. التحقق من وجود Contours
    final requiredContours = [
      FaceContourType.face,
      FaceContourType.leftEye,
      FaceContourType.rightEye,
    ];
    
    int foundContours = 0;
    for (final contour in requiredContours) {
      if (face.contours[contour] != null && face.contours[contour]!.points.isNotEmpty) {
        foundContours++;
      }
    }
    
    if (foundContours < 2) {
      issues.add('لم يتم اكتشاف خطوط الوجه بشكل كافٍ');
    }
    
    // 3. التحقق من حجم الوجه
    final faceArea = face.boundingBox.width * face.boundingBox.height;
    if (faceArea < _minFaceArea) {
      issues.add('الوجه بعيد جداً عن الكاميرا');
    }
    
    // 4. التحقق من فتح العينين
    final leftEyeOpen = face.leftEyeOpenProbability ?? 0;
    final rightEyeOpen = face.rightEyeOpenProbability ?? 0;
    
    if (leftEyeOpen < 0.3 && rightEyeOpen < 0.3) {
      issues.add('الرجاء فتح عينيك');
    }
    
    return RealFaceCheck(
      isReal: issues.isEmpty,
      message: issues.isEmpty ? 'وجه حقيقي' : issues.first,
      issues: issues,
    );
  }

  /// التحقق من جودة الوجه
  FaceQualityCheck _checkFaceQuality(Face face) {
    double score = 1.0;
    final issues = <String>[];

    // 1. حجم الوجه
    final faceArea = face.boundingBox.width * face.boundingBox.height;
    if (faceArea < _minFaceArea) {
      score -= 0.3;
      issues.add('الوجه بعيد جداً، اقترب من الكاميرا');
    } else if (faceArea < _minFaceArea * 1.5) {
      score -= 0.1;
    }

    // 2. زاوية الرأس
    final headX = (face.headEulerAngleX ?? 0).abs();
    final headY = (face.headEulerAngleY ?? 0).abs();
    final headZ = (face.headEulerAngleZ ?? 0).abs();

    if (headX > _maxHeadAngle || headY > _maxHeadAngle || headZ > _maxHeadAngle) {
      score -= 0.25;
      issues.add('الرجاء توجيه وجهك مباشرة للكاميرا');
    }

    // 3. فتح العينين
    final leftEye = face.leftEyeOpenProbability ?? 1.0;
    final rightEye = face.rightEyeOpenProbability ?? 1.0;
    
    if (leftEye < _minEyeOpenProbability || rightEye < _minEyeOpenProbability) {
      score -= 0.2;
      issues.add('الرجاء فتح عينيك');
    }

    // 4. وجود العلامات
    final requiredLandmarks = [
      FaceLandmarkType.leftEye,
      FaceLandmarkType.rightEye,
      FaceLandmarkType.noseBase,
    ];
    
    for (final landmark in requiredLandmarks) {
      if (face.landmarks[landmark] == null) {
        score -= 0.1;
      }
    }

    return FaceQualityCheck(
      isGood: score >= _minQualityScore && issues.isEmpty,
      score: score.clamp(0.0, 1.0),
      message: issues.isEmpty ? 'جودة ممتازة' : issues.first,
      issues: issues,
    );
  }

  /// تحويل صورة الكاميرا إلى InputImage
  InputImage? _inputImageFromCameraImage(CameraImage cameraImage, CameraDescription camera) {
    final rotation = _rotationIntToImageRotation(camera.sensorOrientation);
    if (rotation == null) return null;

    final format = InputImageFormatValue.fromRawValue(cameraImage.format.raw);
    if (format == null) return null;

    final plane = cameraImage.planes.first;

    return InputImage.fromBytes(
      bytes: plane.bytes,
      metadata: InputImageMetadata(
        size: Size(cameraImage.width.toDouble(), cameraImage.height.toDouble()),
        rotation: rotation,
        format: format,
        bytesPerRow: plane.bytesPerRow,
      ),
    );
  }

  InputImageRotation? _rotationIntToImageRotation(int rotation) {
    switch (rotation) {
      case 0:
        return InputImageRotation.rotation0deg;
      case 90:
        return InputImageRotation.rotation90deg;
      case 180:
        return InputImageRotation.rotation180deg;
      case 270:
        return InputImageRotation.rotation270deg;
      default:
        return null;
    }
  }

  /// حفظ صورة الوجه
  Future<String?> saveFaceImage(CameraImage cameraImage, String fileName) async {
    try {
      final directory = await getApplicationDocumentsDirectory();
      final path = '${directory.path}/faces/$fileName.jpg';
      
      final image = _convertYUV420ToImage(cameraImage);
      if (image == null) return null;
      
      final file = File(path);
      await file.parent.create(recursive: true);
      await file.writeAsBytes(img.encodeJpg(image, quality: 90));
      
      return path;
    } catch (e) {
      _logger.e('Error saving face image: $e');
      return null;
    }
  }

  /// تحويل YUV420 إلى صورة RGB
  img.Image? _convertYUV420ToImage(CameraImage cameraImage) {
    try {
      final width = cameraImage.width;
      final height = cameraImage.height;
      
      final yPlane = cameraImage.planes[0];
      final uPlane = cameraImage.planes[1];
      final vPlane = cameraImage.planes[2];
      
      final image = img.Image(width: width, height: height);
      
      for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
          final yIndex = y * yPlane.bytesPerRow + x;
          final uvIndex = (y ~/ 2) * uPlane.bytesPerRow + (x ~/ 2);
          
          final yValue = yPlane.bytes[yIndex];
          final uValue = uPlane.bytes[uvIndex];
          final vValue = vPlane.bytes[uvIndex];
          
          final r = (yValue + 1.402 * (vValue - 128)).clamp(0, 255).toInt();
          final g = (yValue - 0.344136 * (uValue - 128) - 0.714136 * (vValue - 128)).clamp(0, 255).toInt();
          final b = (yValue + 1.772 * (uValue - 128)).clamp(0, 255).toInt();
          
          image.setPixelRgba(x, y, r, g, b, 255);
        }
      }
      
      return image;
    } catch (e) {
      _logger.e('Error converting YUV420 to image: $e');
      return null;
    }
  }

  /// الحصول على حجم الـ embedding
  int get embeddingSize => _faceNetService.embeddingSize;
}

/// نتيجة اكتشاف الوجه
class FaceDetectionResult {
  final bool success;
  final Face? face;
  final List<double>? embedding;
  final double? quality;
  final String? error;
  final int? faceCount;
  final FaceDetectionStatus status;

  FaceDetectionResult._({
    required this.success,
    this.face,
    this.embedding,
    this.quality,
    this.error,
    this.faceCount,
    required this.status,
  });

  factory FaceDetectionResult.success({
    required Face face,
    required List<double> embedding,
    required double quality,
  }) {
    return FaceDetectionResult._(
      success: true,
      face: face,
      embedding: embedding,
      quality: quality,
      status: FaceDetectionStatus.success,
    );
  }

  factory FaceDetectionResult.noFace() {
    return FaceDetectionResult._(
      success: false,
      error: 'لم يتم اكتشاف وجه - تأكد من وضع وجهك داخل الإطار',
      status: FaceDetectionStatus.noFace,
    );
  }

  factory FaceDetectionResult.multipleFaces(int count) {
    return FaceDetectionResult._(
      success: false,
      error: 'تم اكتشاف أكثر من وجه ($count) - يجب وجود شخص واحد فقط',
      faceCount: count,
      status: FaceDetectionStatus.multipleFaces,
    );
  }

  factory FaceDetectionResult.poorQuality(String message) {
    return FaceDetectionResult._(
      success: false,
      error: message,
      status: FaceDetectionStatus.poorQuality,
    );
  }

  factory FaceDetectionResult.notRealFace(String message) {
    return FaceDetectionResult._(
      success: false,
      error: message,
      status: FaceDetectionStatus.notRealFace,
    );
  }

  factory FaceDetectionResult.error(String message) {
    return FaceDetectionResult._(
      success: false,
      error: message,
      status: FaceDetectionStatus.error,
    );
  }
}

enum FaceDetectionStatus {
  success,
  noFace,
  multipleFaces,
  poorQuality,
  notRealFace,
  error,
}

/// فحص جودة الوجه
class FaceQualityCheck {
  final bool isGood;
  final double score;
  final String message;
  final List<String> issues;

  FaceQualityCheck({
    required this.isGood,
    required this.score,
    required this.message,
    required this.issues,
  });
}

/// فحص الوجه الحقيقي
class RealFaceCheck {
  final bool isReal;
  final String message;
  final List<String> issues;

  RealFaceCheck({
    required this.isReal,
    required this.message,
    required this.issues,
  });
}

/// نتيجة مقارنة الوجوه
class FaceComparisonResult {
  final bool isMatch;
  final double confidence;
  final double? distance;
  final double? similarity;
  final double? threshold;
  final String? error;

  FaceComparisonResult({
    required this.isMatch,
    required this.confidence,
    this.distance,
    this.similarity,
    this.threshold,
    this.error,
  });
}
