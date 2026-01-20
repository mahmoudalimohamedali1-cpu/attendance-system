import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../data/datasources/custody_remote_datasource.dart';
import '../../../../core/di/injection.dart';

class SignCustodyPage extends StatefulWidget {
  final CustodyAssignmentModel assignment;
  
  const SignCustodyPage({super.key, required this.assignment});

  @override
  State<SignCustodyPage> createState() => _SignCustodyPageState();
}

class _SignCustodyPageState extends State<SignCustodyPage> {
  bool _loading = false;
  final List<Offset> _signaturePoints = [];
  late CustodyRemoteDataSource _datasource;

  @override
  void initState() {
    super.initState();
    final dio = getIt<Dio>();
    _datasource = CustodyRemoteDataSource(dio);
  }
  
  Future<void> _submit() async {
    if (_signaturePoints.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('يرجى التوقيع أولاً'), backgroundColor: Colors.red),
      );
      return;
    }

    setState(() => _loading = true);
    try {
      // Convert signature points to base64 or store as-is
      final signatureData = _signaturePoints.map((p) => '${p.dx},${p.dy}').join('|');
      await _datasource.signAssignment(widget.assignment.id, signatureData);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('تم التوقيع بنجاح ✅'), backgroundColor: Colors.green),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('فشل في التوقيع: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _clearSignature() {
    setState(() => _signaturePoints.clear());
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.assignment.custodyItem;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('✍️ توقيع استلام العهدة'),
        actions: [
          IconButton(
            icon: const Icon(Icons.clear),
            onPressed: _clearSignature,
            tooltip: 'مسح التوقيع',
          ),
        ],
      ),
      body: Column(
        children: [
          // Item Info Card
          Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item?.name ?? 'العهدة',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text('كود: ${item?.code ?? '-'}'),
                  if (item?.serialNumber != null) Text('S/N: ${item!.serialNumber}'),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.orange.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.orange, size: 20),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'بالتوقيع أدناه، أقر باستلام هذه العهدة وأتعهد بالحفاظ عليها',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Signature Pad
          Expanded(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300, width: 2),
                borderRadius: BorderRadius.circular(12),
                color: Colors.white,
              ),
              child: Stack(
                children: [
                  // Signature canvas
                  GestureDetector(
                    onPanUpdate: (details) {
                      setState(() {
                        _signaturePoints.add(details.localPosition);
                      });
                    },
                    onPanEnd: (details) {
                      _signaturePoints.add(Offset.infinite); // Break point
                    },
                    child: CustomPaint(
                      painter: _SignaturePainter(_signaturePoints),
                      size: Size.infinite,
                    ),
                  ),
                  // Placeholder text
                  if (_signaturePoints.isEmpty)
                    const Center(
                      child: Text(
                        'وقّع هنا',
                        style: TextStyle(
                          color: Colors.grey,
                          fontSize: 24,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Submit Button
          Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                ),
                child: _loading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('تأكيد التوقيع والاستلام', style: TextStyle(fontSize: 16)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SignaturePainter extends CustomPainter {
  final List<Offset> points;
  
  _SignaturePainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..strokeCap = StrokeCap.round
      ..strokeWidth = 3.0;

    for (int i = 0; i < points.length - 1; i++) {
      if (points[i] != Offset.infinite && points[i + 1] != Offset.infinite) {
        canvas.drawLine(points[i], points[i + 1], paint);
      }
    }
  }

  @override
  bool shouldRepaint(_SignaturePainter oldDelegate) => true;
}
