import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../bloc/leaves_bloc.dart';

class CreateLeaveRequestPage extends StatefulWidget {
  const CreateLeaveRequestPage({super.key});

  @override
  State<CreateLeaveRequestPage> createState() => _CreateLeaveRequestPageState();
}

class _CreateLeaveRequestPageState extends State<CreateLeaveRequestPage> {
  final _formKey = GlobalKey<FormState>();
  String? _selectedType;
  DateTime? _startDate;
  DateTime? _endDate;
  final _reasonController = TextEditingController();

  final _leaveTypes = [
    {'value': 'ANNUAL', 'label': 'إجازة سنوية'},
    {'value': 'SICK', 'label': 'إجازة مرضية'},
    {'value': 'PERSONAL', 'label': 'إجازة شخصية'},
    {'value': 'EMERGENCY', 'label': 'إجازة طارئة'},
    {'value': 'EARLY_LEAVE', 'label': 'خروج مبكر'},
    {'value': 'OTHER', 'label': 'أخرى'},
  ];

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(bool isStartDate) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      locale: const Locale('ar'),
    );

    if (picked != null) {
      setState(() {
        if (isStartDate) {
          _startDate = picked;
          if (_endDate != null && _endDate!.isBefore(picked)) {
            _endDate = picked;
          }
        } else {
          _endDate = picked;
        }
      });
    }
  }

  bool _isSubmitting = false;

  void _submit() {
    if (_formKey.currentState?.validate() ?? false) {
      if (_startDate == null || _endDate == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('يرجى اختيار تاريخ البداية والنهاية'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
        return;
      }

      setState(() => _isSubmitting = true);

      // إرسال الطلب للسيرفر
      context.read<LeavesBloc>().add(CreateLeaveEvent({
        'type': _selectedType,
        'startDate': _startDate!.toIso8601String(),
        'endDate': _endDate!.toIso8601String(),
        'reason': _reasonController.text,
      }));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<LeavesBloc, LeavesState>(
      listener: (context, state) {
        if (state is LeavesLoaded) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('تم إرسال الطلب بنجاح - في انتظار الموافقة'),
              backgroundColor: AppTheme.successColor,
            ),
          );
          context.pop();
        } else if (state is LeavesError) {
          setState(() => _isSubmitting = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('فشل إرسال الطلب: ${state.message}'),
              backgroundColor: AppTheme.errorColor,
            ),
          );
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(context.tr('new_leave_request')),
        ),
        body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Leave Type
            DropdownButtonFormField<String>(
              value: _selectedType,
              decoration: InputDecoration(
                labelText: context.tr('leave_type'),
                prefixIcon: const Icon(Icons.category),
              ),
              items: _leaveTypes.map((type) {
                return DropdownMenuItem(
                  value: type['value'],
                  child: Text(type['label']!),
                );
              }).toList(),
              onChanged: (value) {
                setState(() => _selectedType = value);
              },
              validator: (value) {
                if (value == null) return 'يرجى اختيار نوع الإجازة';
                return null;
              },
            ),
            const SizedBox(height: 20),

            // Date Range
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(true),
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: context.tr('start_date'),
                        prefixIcon: const Icon(Icons.calendar_today),
                      ),
                      child: Text(
                        _startDate != null
                            ? DateFormat('d/M/yyyy').format(_startDate!)
                            : 'اختر التاريخ',
                        style: TextStyle(
                          color: _startDate != null ? null : Colors.grey,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(false),
                    child: InputDecorator(
                      decoration: InputDecoration(
                        labelText: context.tr('end_date'),
                        prefixIcon: const Icon(Icons.calendar_today),
                      ),
                      child: Text(
                        _endDate != null
                            ? DateFormat('d/M/yyyy').format(_endDate!)
                            : 'اختر التاريخ',
                        style: TextStyle(
                          color: _endDate != null ? null : Colors.grey,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Reason
            TextFormField(
              controller: _reasonController,
              decoration: InputDecoration(
                labelText: context.tr('reason'),
                prefixIcon: const Icon(Icons.description),
                alignLabelWithHint: true,
              ),
              maxLines: 4,
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'يرجى كتابة سبب الطلب';
                }
                if (value.length < 10) {
                  return 'يرجى كتابة سبب واضح (10 أحرف على الأقل)';
                }
                return null;
              },
            ),
            const SizedBox(height: 32),

            // Submit Button
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('إرسال الطلب'),
              ),
            ),
          ],
        ),
      ),
    ),
    );
  }
}

