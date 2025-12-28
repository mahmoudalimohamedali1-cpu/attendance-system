import 'package:flutter/material.dart';
import '../cubit/disciplinary_cubit.dart';

class ScheduleHearingDialog extends StatefulWidget {
  final String caseId;
  final DisciplinaryCubit cubit;

  const ScheduleHearingDialog({
    super.key,
    required this.caseId,
    required this.cubit,
  });

  @override
  State<ScheduleHearingDialog> createState() => _ScheduleHearingDialogState();
}

class _ScheduleHearingDialogState extends State<ScheduleHearingDialog> {
  DateTime _hearingDate = DateTime.now().add(const Duration(days: 1));
  TimeOfDay _hearingTime = const TimeOfDay(hour: 10, minute: 0);
  final _locationController = TextEditingController();

  @override
  void dispose() {
    _locationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('جدولة جلسة استماع', textAlign: TextAlign.center),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('التاريخ'),
              subtitle: Text('${_hearingDate.year}/${_hearingDate.month}/${_hearingDate.day}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _hearingDate,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 30)),
                );
                if (picked != null) setState(() => _hearingDate = picked);
              },
            ),
            ListTile(
              title: const Text('الوقت'),
              subtitle: Text(_hearingTime.format(context)),
              trailing: const Icon(Icons.access_time),
              onTap: () async {
                final picked = await showTimePicker(
                  context: context,
                  initialTime: _hearingTime,
                );
                if (picked != null) setState(() => _hearingTime = picked);
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _locationController,
              decoration: const InputDecoration(
                labelText: 'مكان الجلسة (أو رابط الاجتماع)',
                border: OutlineInputBorder(),
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
            final scheduledAt = DateTime(
              _hearingDate.year,
              _hearingDate.month,
              _hearingDate.day,
              _hearingTime.hour,
              _hearingTime.minute,
            );
            widget.cubit.scheduleHearing(
              widget.caseId,
              scheduledAt: scheduledAt,
              location: _locationController.text,
            );
            Navigator.pop(context);
          },
          style: ElevatedButton.styleFrom(backgroundColor: Colors.purple, foregroundColor: Colors.white),
          child: const Text('حفظ وجدولة'),
        ),
      ],
    );
  }
}
