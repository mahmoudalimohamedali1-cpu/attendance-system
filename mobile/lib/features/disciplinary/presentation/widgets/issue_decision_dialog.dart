import 'package:flutter/material.dart';
import '../cubit/disciplinary_cubit.dart';

class IssueDecisionDialog extends StatefulWidget {
  final String caseId;
  final DisciplinaryCubit cubit;

  const IssueDecisionDialog({
    super.key,
    required this.caseId,
    required this.cubit,
  });

  @override
  State<IssueDecisionDialog> createState() => _IssueDecisionDialogState();
}

class _IssueDecisionDialogState extends State<IssueDecisionDialog> {
  String _decisionType = 'WRITTEN_WARNING';
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();

  @override
  void dispose() {
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('إصدار القرار النهائي', textAlign: TextAlign.center),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              initialValue: _decisionType,
              decoration: const InputDecoration(labelText: 'نوع القرار', border: OutlineInputBorder()),
              items: const [
                DropdownMenuItem(value: 'VERBAL_WARNING', child: Text('إنذار شفهي')),
                DropdownMenuItem(value: 'WRITTEN_WARNING', child: Text('إنذار كتابي')),
                DropdownMenuItem(value: 'SALARY_DEDUCTION', child: Text('خصم من الراتب')),
                DropdownMenuItem(value: 'SUSPENSION', child: Text('إيقاف مؤقت')),
                DropdownMenuItem(value: 'TERMINATION', child: Text('إنهاء خدمة')),
              ],
              onChanged: (val) => setState(() => _decisionType = val!),
            ),
            if (_decisionType == 'SALARY_DEDUCTION') ...[
              const SizedBox(height: 12),
              TextField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'قيمة الخصم (بالريال)',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.money_off),
                ),
              ),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _notesController,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'ملاحظات وتبرير القرار',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('إلغاء'),
        ),
        ElevatedButton(
          onPressed: () {
            final data = {
              'decisionType': _decisionType,
              'notes': _notesController.text,
              if (_amountController.text.isNotEmpty) 
                'penaltyAmount': double.tryParse(_amountController.text),
            };
            widget.cubit.issueDecision(widget.caseId, data);
            Navigator.pop(context);
          },
          style: ElevatedButton.styleFrom(backgroundColor: Colors.deepOrange, foregroundColor: Colors.white),
          child: const Text('إصدار القرار'),
        ),
      ],
    );
  }
}
