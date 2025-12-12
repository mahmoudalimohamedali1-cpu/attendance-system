import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';

import '../../../../core/services/device_service.dart';

/// صفحة تحديث بيانات الحضور (الوجه والجهاز)
class UpdateDataPage extends StatefulWidget {
  const UpdateDataPage({super.key});

  @override
  State<UpdateDataPage> createState() => _UpdateDataPageState();
}

class _UpdateDataPageState extends State<UpdateDataPage> {
  final DeviceService _deviceService = DeviceService();
  final TextEditingController _reasonController = TextEditingController();
  
  UpdateType _selectedType = UpdateType.both;
  DeviceInfo? _deviceInfo;
  String? _capturedFaceImage;
  List<double>? _faceEmbedding;
  double? _faceQuality;
  bool _isLoading = false;
  bool _isCapturingFace = false;

  @override
  void initState() {
    super.initState();
    _loadDeviceInfo();
  }

  Future<void> _loadDeviceInfo() async {
    try {
      final info = await _deviceService.getDeviceInfo();
      setState(() => _deviceInfo = info);
    } catch (e) {
      _showError('فشل في الحصول على معلومات الجهاز');
    }
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('تحديث بيانات الحضور'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // بطاقة المعلومات
            _buildInfoCard(),
            const SizedBox(height: 16),
            
            // اختيار نوع التحديث
            _buildTypeSelector(),
            const SizedBox(height: 16),
            
            // سبب التحديث
            _buildReasonInput(),
            const SizedBox(height: 24),
            
            // قسم الوجه
            if (_selectedType != UpdateType.deviceOnly)
              _buildFaceSection(),
            
            // قسم الجهاز
            if (_selectedType != UpdateType.faceOnly)
              _buildDeviceSection(),
            
            const SizedBox(height: 24),
            
            // زر الإرسال
            _buildSubmitButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard() {
    return Card(
      color: Colors.blue.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(Icons.info_outline, color: Colors.blue.shade700),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'قم بتحديث بياناتك إذا غيّرت هاتفك أو تريد تحديث صورة الوجه. سيتم مراجعة طلبك من قبل المسؤول.',
                style: TextStyle(color: Colors.blue.shade800),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeSelector() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'نوع التحديث',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: UpdateType.values.map((type) {
                final isSelected = _selectedType == type;
                return ChoiceChip(
                  label: Text(_getTypeLabel(type)),
                  selected: isSelected,
                  onSelected: (selected) {
                    if (selected) setState(() => _selectedType = type);
                  },
                  selectedColor: Theme.of(context).primaryColor,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : null,
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReasonInput() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'سبب التحديث',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _reasonController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'مثال: تغيير الهاتف الجوال / تحديث صورة الوجه...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFaceSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.face, color: Colors.deepPurple),
                const SizedBox(width: 8),
                const Text(
                  'صورة الوجه الجديدة',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const Spacer(),
                if (_capturedFaceImage != null)
                  const Icon(Icons.check_circle, color: Colors.green),
              ],
            ),
            const SizedBox(height: 16),
            
            if (_capturedFaceImage != null) ...[
              // عرض الصورة الملتقطة
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(
                  File(_capturedFaceImage!),
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _openFaceCamera,
                      icon: const Icon(Icons.refresh),
                      label: const Text('إعادة التقاط'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton(
                    onPressed: () => setState(() {
                      _capturedFaceImage = null;
                      _faceEmbedding = null;
                    }),
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                  ),
                ],
              ),
            ] else ...[
              // زر التقاط الصورة
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isCapturingFace ? null : _openFaceCamera,
                  icon: _isCapturingFace 
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.camera_alt),
                  label: Text(_isCapturingFace ? 'جاري الفتح...' : 'التقاط صورة الوجه'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDeviceSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.phone_android, color: Colors.teal),
                const SizedBox(width: 8),
                const Text(
                  'بيانات الجهاز الحالي',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                const Spacer(),
                if (_deviceInfo != null)
                  const Icon(Icons.check_circle, color: Colors.green),
              ],
            ),
            const SizedBox(height: 16),
            
            if (_deviceInfo == null)
              const Center(child: CircularProgressIndicator())
            else
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    _buildDeviceRow(
                      Icons.smartphone,
                      'الجهاز',
                      _deviceInfo!.displayName,
                    ),
                    const Divider(),
                    _buildDeviceRow(
                      Icons.perm_device_information,
                      'الموديل',
                      _deviceInfo!.deviceModel,
                    ),
                    const Divider(),
                    _buildDeviceRow(
                      Icons.android,
                      'نظام التشغيل',
                      _deviceInfo!.osVersion,
                    ),
                    const Divider(),
                    _buildDeviceRow(
                      Icons.fingerprint,
                      'معرف الجهاز',
                      _deviceInfo!.deviceId.substring(0, 16) + '...',
                    ),
                  ],
                ),
              ),
            
            const SizedBox(height: 12),
            Text(
              'سيتم إرسال هذه البيانات تلقائياً مع طلب التحديث',
              style: TextStyle(
                color: Colors.grey.shade600,
                fontSize: 12,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDeviceRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey.shade600),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w500)),
          Expanded(
            child: Text(
              value,
              style: TextStyle(color: Colors.grey.shade700),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton() {
    final canSubmit = _validateData();
    
    return ElevatedButton(
      onPressed: canSubmit && !_isLoading ? _submitRequest : null,
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 16),
        backgroundColor: Theme.of(context).primaryColor,
      ),
      child: _isLoading
        ? const SizedBox(
            width: 24,
            height: 24,
            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
          )
        : const Text(
            'إرسال طلب التحديث',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
    );
  }

  bool _validateData() {
    // التحقق من البيانات حسب النوع
    switch (_selectedType) {
      case UpdateType.faceOnly:
        return _capturedFaceImage != null;
      case UpdateType.deviceOnly:
        return _deviceInfo != null;
      case UpdateType.both:
      case UpdateType.deviceChange:
        return _capturedFaceImage != null && _deviceInfo != null;
    }
  }

  String _getTypeLabel(UpdateType type) {
    switch (type) {
      case UpdateType.faceOnly:
        return 'الوجه فقط';
      case UpdateType.deviceOnly:
        return 'الجهاز فقط';
      case UpdateType.both:
        return 'الوجه والجهاز';
      case UpdateType.deviceChange:
        return 'تغيير الموبايل';
    }
  }

  Future<void> _openFaceCamera() async {
    setState(() => _isCapturingFace = true);
    
    try {
      // فتح صفحة التقاط الوجه
      final result = await Navigator.push<Map<String, dynamic>>(
        context,
        MaterialPageRoute(
          builder: (context) => const FaceCaptureScreen(),
        ),
      );
      
      if (result != null) {
        setState(() {
          _capturedFaceImage = result['imagePath'];
          _faceEmbedding = result['embedding'];
          _faceQuality = result['quality'];
        });
      }
    } catch (e) {
      _showError('فشل في التقاط صورة الوجه');
    } finally {
      setState(() => _isCapturingFace = false);
    }
  }

  Future<void> _submitRequest() async {
    if (!_validateData()) return;
    
    setState(() => _isLoading = true);
    
    try {
      // TODO: Call API to submit request
      final requestData = {
        'requestType': _getApiRequestType(_selectedType),
        'reason': _reasonController.text,
        
        // Face data
        if (_faceEmbedding != null) 'newFaceEmbedding': _faceEmbedding,
        if (_capturedFaceImage != null) 'newFaceImage': _capturedFaceImage, // Should be base64
        if (_faceQuality != null) 'faceImageQuality': _faceQuality,
        
        // Device data
        if (_deviceInfo != null) ...{
          'newDeviceId': _deviceInfo!.deviceId,
          'newDeviceFingerprint': _deviceInfo!.fingerprint,
          'newDeviceName': _deviceInfo!.deviceName,
          'newDeviceModel': _deviceInfo!.deviceModel,
          'newDeviceBrand': _deviceInfo!.deviceBrand,
          'newDevicePlatform': _deviceInfo!.platform,
          'newDeviceOsVersion': _deviceInfo!.osVersion,
          'newDeviceAppVersion': _deviceInfo!.appVersion,
        },
      };
      
      // Simulate API call
      await Future.delayed(const Duration(seconds: 2));
      
      if (mounted) {
        _showSuccess('تم إرسال طلب التحديث بنجاح');
        Navigator.pop(context, true);
      }
    } catch (e) {
      _showError('فشل في إرسال الطلب: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _getApiRequestType(UpdateType type) {
    switch (type) {
      case UpdateType.faceOnly:
        return 'FACE_UPDATE';
      case UpdateType.deviceOnly:
        return 'DEVICE_UPDATE';
      case UpdateType.both:
        return 'BOTH';
      case UpdateType.deviceChange:
        return 'DEVICE_CHANGE';
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
      ),
    );
  }
}

enum UpdateType {
  faceOnly,
  deviceOnly,
  both,
  deviceChange,
}

/// شاشة التقاط صورة الوجه
class FaceCaptureScreen extends StatefulWidget {
  const FaceCaptureScreen({super.key});

  @override
  State<FaceCaptureScreen> createState() => _FaceCaptureScreenState();
}

class _FaceCaptureScreenState extends State<FaceCaptureScreen> {
  CameraController? _cameraController;
  bool _isInitialized = false;
  bool _isCapturing = false;
  String _statusMessage = 'جاري تهيئة الكاميرا...';
  bool _faceDetected = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      
      if (cameras.isEmpty) {
        setState(() => _statusMessage = 'لا توجد كاميرا متاحة');
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
      
      // استخدام أي كاميرا متاحة إذا لم توجد كاميرا أمامية
      final selectedCamera = frontCamera ?? cameras.first;

      _cameraController = CameraController(
        selectedCamera,
        ResolutionPreset.medium, // استخدام medium للأداء الأفضل
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _cameraController!.initialize();
      
      if (mounted) {
        setState(() {
          _isInitialized = true;
          _statusMessage = 'ضع وجهك داخل الإطار';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _statusMessage = 'فشل في تشغيل الكاميرا: $e');
        // لا نغلق الصفحة مباشرة، نعطي المستخدم فرصة للمحاولة مرة أخرى
      }
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('التقاط صورة الوجه', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          // Status message
          Container(
            padding: const EdgeInsets.all(12),
            color: _faceDetected ? Colors.green.withOpacity(0.8) : Colors.blue.withOpacity(0.8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (_isCapturing)
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                else
                  Icon(
                    _faceDetected ? Icons.check_circle : Icons.info_outline,
                    color: Colors.white,
                    size: 20,
                  ),
                const SizedBox(width: 8),
                Text(
                  _statusMessage,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          
          Expanded(
            child: _isInitialized && _cameraController != null
              ? Stack(
                  alignment: Alignment.center,
                  children: [
                    // عرض الكاميرا
                    ClipRect(
                      child: Transform.scale(
                        scale: 1.0,
                        child: Center(
                          child: CameraPreview(_cameraController!),
                        ),
                      ),
                    ),
                    // Face guide overlay
                    CustomPaint(
                      size: Size(MediaQuery.of(context).size.width, MediaQuery.of(context).size.height * 0.6),
                      painter: FaceGuidePainter(isDetected: _faceDetected),
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
                      const SizedBox(height: 16),
                      if (!_isInitialized)
                        ElevatedButton(
                          onPressed: _initCamera,
                          child: const Text('إعادة المحاولة'),
                        ),
                    ],
                  ),
                ),
          ),
          
          // Instructions and capture button
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.black87,
            child: Column(
              children: [
                const Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _InstructionItem(icon: Icons.light_mode, text: 'إضاءة جيدة'),
                    _InstructionItem(icon: Icons.face, text: 'انظر للكاميرا'),
                    _InstructionItem(icon: Icons.visibility, text: 'افتح عينيك'),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: (_isCapturing || !_isInitialized) ? null : _captureImage,
                    icon: _isCapturing
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.camera_alt, size: 24),
                    label: Text(
                      _isCapturing ? 'جاري المعالجة...' : 'التقاط الصورة',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _captureImage() async {
    if (_cameraController == null || !_isInitialized || _isCapturing) return;
    
    setState(() {
      _isCapturing = true;
      _statusMessage = 'جاري التقاط الصورة...';
    });
    
    try {
      // التقاط الصورة
      final XFile image = await _cameraController!.takePicture();
      
      setState(() => _statusMessage = 'تم التقاط الصورة بنجاح');
      
      // إرجاع الصورة مع embedding وهمي للتجربة
      // في الإنتاج، يجب استخدام ML Kit لاستخراج الـ embedding الحقيقي
      if (mounted) {
        Navigator.pop(context, {
          'imagePath': image.path,
          'embedding': List.generate(128, (i) => (i * 0.01) - 0.5), // قيم تجريبية
          'quality': 0.9,
        });
      }
    } catch (e) {
      setState(() => _statusMessage = 'فشل في التقاط الصورة');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('فشل في التقاط الصورة: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isCapturing = false);
    }
  }
}

class _InstructionItem extends StatelessWidget {
  final IconData icon;
  final String text;
  
  const _InstructionItem({required this.icon, required this.text});
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: Colors.white70, size: 24),
        const SizedBox(height: 4),
        Text(text, style: const TextStyle(color: Colors.white70, fontSize: 12)),
      ],
    );
  }
}

/// رسم إطار الوجه البيضاوي
class FaceGuidePainter extends CustomPainter {
  final bool isDetected;
  
  FaceGuidePainter({this.isDetected = false});
  
  @override
  void paint(Canvas canvas, Size size) {
    final borderColor = isDetected ? Colors.green : Colors.white;
    
    final paint = Paint()
      ..color = borderColor.withOpacity(0.8)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;

    final center = Offset(size.width / 2, size.height / 2);
    final rect = Rect.fromCenter(
      center: center,
      width: size.width * 0.6,
      height: size.height * 0.7,
    );

    // رسم الإطار البيضاوي
    canvas.drawOval(rect, paint);
    
    // رسم الخلفية الداكنة خارج الإطار
    final backgroundPaint = Paint()
      ..color = Colors.black.withOpacity(0.5)
      ..style = PaintingStyle.fill;
    
    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addOval(rect);
    path.fillType = PathFillType.evenOdd;
    canvas.drawPath(path, backgroundPaint);
    
    // رسم علامات الزوايا
    final cornerPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    
    final cornerLength = 25.0;
    
    // الزاوية العلوية اليسرى
    canvas.drawLine(
      Offset(rect.left + 10, rect.top + 30),
      Offset(rect.left + 10, rect.top + 30 + cornerLength),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(rect.left + 30, rect.top + 10),
      Offset(rect.left + 30 + cornerLength, rect.top + 10),
      cornerPaint,
    );
    
    // الزاوية العلوية اليمنى
    canvas.drawLine(
      Offset(rect.right - 10, rect.top + 30),
      Offset(rect.right - 10, rect.top + 30 + cornerLength),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(rect.right - 30 - cornerLength, rect.top + 10),
      Offset(rect.right - 30, rect.top + 10),
      cornerPaint,
    );
    
    // الزاوية السفلية اليسرى
    canvas.drawLine(
      Offset(rect.left + 10, rect.bottom - 30 - cornerLength),
      Offset(rect.left + 10, rect.bottom - 30),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(rect.left + 30, rect.bottom - 10),
      Offset(rect.left + 30 + cornerLength, rect.bottom - 10),
      cornerPaint,
    );
    
    // الزاوية السفلية اليمنى
    canvas.drawLine(
      Offset(rect.right - 10, rect.bottom - 30 - cornerLength),
      Offset(rect.right - 10, rect.bottom - 30),
      cornerPaint,
    );
    canvas.drawLine(
      Offset(rect.right - 30 - cornerLength, rect.bottom - 10),
      Offset(rect.right - 30, rect.bottom - 10),
      cornerPaint,
    );
  }

  @override
  bool shouldRepaint(covariant FaceGuidePainter oldDelegate) => 
      oldDelegate.isDetected != isDetected;
}

