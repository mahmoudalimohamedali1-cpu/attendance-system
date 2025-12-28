import 'package:flutter/material.dart';
import '../cubit/disciplinary_cubit.dart';

/// حوار الرد على التحقيق أو القرار
class ResponseDialog extends StatefulWidget {
  final String caseId;
  final bool isInformal;
  final DisciplinaryCubit cubit;

  const ResponseDialog({
    super.key,
    required this.caseId,
    required this.isInformal,
    required this.cubit,
  });

  @override
  State<ResponseDialog> createState() => _ResponseDialogState();
}

class _ResponseDialogState extends State<ResponseDialog> {
  final _notesController = TextEditingController();
  bool _isLoading = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(
        widget.isInformal ? 'رفض التحقيق غير الرسمي' : 'تسجيل اعتراض',
        textAlign: TextAlign.center,
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            widget.isInformal
                ? 'سيتم إحالة القضية لجلسة استماع رسمية'
                : 'سيتم مراجعة اعتراضك من قبل الإدارة',
            style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _notesController,
            maxLines: 4,
            decoration: InputDecoration(
              labelText: widget.isInformal ? 'سبب الرفض (اختياري)' : 'أسباب الاعتراض',
              hintText: widget.isInformal
                  ? 'اكتب سبب رفضك هنا...'
                  : 'اشرح أسباب اعتراضك بالتفصيل...',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              alignLabelWithHint: true,
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _isLoading ? null : () => Navigator.pop(context),
          child: const Text('إلغاء'),
        ),
        ElevatedButton(
          onPressed: _isLoading ? null : _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: widget.isInformal ? Colors.red : Colors.orange,
            foregroundColor: Colors.white,
          ),
          child: _isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                )
              : Text(widget.isInformal ? 'تأكيد الرفض' : 'تأكيد الاعتراض'),
        ),
      ],
    );
  }

  Future<void> _submit() async {
    setState(() => _isLoading = true);

    try {
      if (widget.isInformal) {
        await widget.cubit.respondInformal(
          widget.caseId,
          accept: false,
          notes: _notesController.text.isNotEmpty ? _notesController.text : null,
        );
      } else {
        await widget.cubit.respondDecision(
          widget.caseId,
          accept: false,
          objectionNotes: _notesController.text.isNotEmpty ? _notesController.text : null,
        );
      }
      if (mounted) Navigator.pop(context);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
