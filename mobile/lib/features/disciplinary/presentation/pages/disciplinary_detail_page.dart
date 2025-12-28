import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import '../../../../core/network/api_client.dart';
import '../../data/datasources/disciplinary_remote_datasource.dart';
import '../../data/models/disciplinary_case_model.dart';
import '../cubit/disciplinary_cubit.dart';
import '../cubit/disciplinary_state.dart';
import '../widgets/response_dialog.dart';
import '../widgets/schedule_hearing_dialog.dart';
import '../widgets/issue_decision_dialog.dart';
import '../../../../core/services/permissions_service.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

/// صفحة تفاصيل قضية الجزاء
class DisciplinaryDetailPage extends StatelessWidget {
  final String caseId;

  const DisciplinaryDetailPage({super.key, required this.caseId});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => DisciplinaryCubit(
        DisciplinaryRemoteDataSourceImpl(GetIt.I<ApiClient>()),
      )..loadCaseDetails(caseId),
      child: _DisciplinaryDetailView(caseId: caseId),
    );
  }
}

class _DisciplinaryDetailView extends StatelessWidget {
  final String caseId;

  const _DisciplinaryDetailView({required this.caseId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('تفاصيل القضية'),
        centerTitle: true,
        elevation: 0,
      ),
      body: BlocConsumer<DisciplinaryCubit, DisciplinaryState>(
        listener: (context, state) {
          if (state is DisciplinaryError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          }
          if (state is DisciplinaryActionSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.green),
            );
          }
        },
        builder: (context, state) {
          if (state is DisciplinaryLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is DisciplinaryCaseDetailLoaded) {
            return _buildContent(context, state.caseDetails);
          }

          return const Center(child: Text('فشل في تحميل البيانات'));
        },
      ),
    );
  }

  Widget _buildContent(BuildContext context, DisciplinaryCase caseDetails) {
    return RefreshIndicator(
      onRefresh: () => context.read<DisciplinaryCubit>().loadCaseDetails(caseId),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Card
            _buildStatusCard(caseDetails),
            const SizedBox(height: 16),

            // Description Card
            _buildInfoCard(
              title: 'تفاصيل المخالفة',
              icon: Icons.description,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(caseDetails.description, style: const TextStyle(fontSize: 15)),
                  if (caseDetails.violationType != null) ...[
                    const SizedBox(height: 12),
                    _buildInfoRow('نوع المخالفة', _getViolationTypeArabic(caseDetails.violationType!)),
                  ],
                  if (caseDetails.incidentDate != null) ...[
                    const SizedBox(height: 8),
                    _buildInfoRow('تاريخ الحادثة', _formatDate(caseDetails.incidentDate!)),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Decision Card (if exists)
            if (caseDetails.decisionType != null) ...[
              _buildDecisionCard(caseDetails),
              const SizedBox(height: 16),
            ],

            // Timeline
            _buildTimelineCard(caseDetails),
            const SizedBox(height: 16),

            // Action Buttons
            _buildActionButtons(context, caseDetails),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard(DisciplinaryCase caseDetails) {
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              Color(caseDetails.statusColor).withOpacity(0.1),
              Color(caseDetails.statusColor).withOpacity(0.05),
            ],
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          children: [
            Icon(
              Icons.gavel,
              size: 48,
              color: Color(caseDetails.statusColor),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Color(caseDetails.statusColor).withOpacity(0.2),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                caseDetails.statusArabic,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Color(caseDetails.statusColor),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'رقم القضية: ${caseDetails.id.substring(0, 8)}',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDecisionCard(DisciplinaryCase caseDetails) {
    return _buildInfoCard(
      title: 'القرار',
      icon: Icons.assignment_turned_in,
      iconColor: Colors.purple,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildInfoRow('نوع القرار', _getDecisionTypeArabic(caseDetails.decisionType!)),
          if (caseDetails.decisionNotes != null) ...[
            const SizedBox(height: 8),
            Text(
              caseDetails.decisionNotes!,
              style: TextStyle(fontSize: 14, color: Colors.grey.shade700),
            ),
          ],
          if (caseDetails.penaltyAmount != null && caseDetails.penaltyAmount! > 0) ...[
            const Divider(height: 24),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(Icons.money_off, color: Colors.red.shade700),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('الجزاء المالي', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    Text(
                      '${caseDetails.penaltyAmount?.toStringAsFixed(0)} ريال',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.red.shade700,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildTimelineCard(DisciplinaryCase caseDetails) {
    final events = caseDetails.events ?? [];
    if (events.isEmpty) return const SizedBox.shrink();

    return _buildInfoCard(
      title: 'سجل الأحداث',
      icon: Icons.timeline,
      child: Column(
        children: events.asMap().entries.map((entry) {
          final index = entry.key;
          final event = entry.value;
          final isLast = index == events.length - 1;

          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: isLast ? Colors.blue : Colors.grey.shade400,
                      shape: BoxShape.circle,
                    ),
                  ),
                  if (!isLast)
                    Container(
                      width: 2,
                      height: 50,
                      color: Colors.grey.shade300,
                    ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        event.actionArabic,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatDateTime(event.createdAt),
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                      if (event.notes != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          event.notes!,
                          style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, DisciplinaryCase caseDetails) {
    final cubit = context.read<DisciplinaryCubit>();
    final authState = context.read<AuthBloc>().state;
    final permissions = getPermissionsService();
    
    if (authState is! AuthAuthenticated) return const SizedBox.shrink();
    
    final user = authState.user;
    final isAdmin = user.role == 'ADMIN';
    final isHR = user.role == 'HR' || isAdmin || permissions.hasPermission('DISC_HR_REVIEW');

    // --- إجراءات الموظف ---
    
    // الرد على التحقيق غير الرسمي
    if (caseDetails.status == 'INFORMAL_SENT' && user.id == caseDetails.accusedId) {
      return _buildEmployeeInformalActions(context, cubit);
    }

    // الرد على القرار
    if (caseDetails.status == 'DECISION_ISSUED' && user.id == caseDetails.accusedId) {
      return _buildEmployeeDecisionActions(context, cubit);
    }

    // --- إجراءات الـ HR ---
    if (isHR) {
      // مراجعة الطلب الجديد (Submit to HR)
      if (caseDetails.status == 'SUBMITTED_TO_HR') {
        return _buildHRReviewActions(context, cubit);
      }

      // جدولة جلسة (Investigation Opened)
      if (caseDetails.status == 'OFFICIAL_INVESTIGATION_OPENED' || 
          caseDetails.status == 'FINALIZED_CONTINUE_INVESTIGATION') {
        return _buildHRScheduleActions(context, cubit);
      }

      // إصدار قرار (Hearing Scheduled / In Progress)
      if (caseDetails.status == 'HEARING_SCHEDULED' || 
          caseDetails.status == 'INVESTIGATION_IN_PROGRESS') {
        return _buildHRIssueDecisionActions(context, cubit);
      }

      // مراجعة الاعتراض (Employee Objected)
      if (caseDetails.status == 'EMPLOYEE_OBJECTED') {
        return _buildHRObjectionReviewActions(context, cubit);
      }

      // الاعتماد النهائي (Awaiting Finalization / Decision Accepted)
      if (caseDetails.status == 'AWAITING_HR_DECISION' || 
          caseDetails.status == 'DECISION_ACCEPTED') {
        return _buildHRFinalizeActions(context, cubit);
      }
    }

    return const SizedBox.shrink();
  }

  Widget _buildEmployeeInformalActions(BuildContext context, DisciplinaryCubit cubit) {
    return Column(
      children: [
        const Text('هل تقبل التحقيق غير الرسمي؟', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _buildActionButton('قبول', Colors.green, Icons.check, () => cubit.respondInformal(caseId, accept: true))),
            const SizedBox(width: 12),
            Expanded(child: _buildActionBtnOutlined('رفض', Colors.red, Icons.close, () => _showResponseDialog(context, false, isInformal: true))),
          ],
        ),
      ],
    );
  }

  Widget _buildEmployeeDecisionActions(BuildContext context, DisciplinaryCubit cubit) {
    return Column(
      children: [
        const Text('هل تقبل القرار الصادر؟', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _buildActionButton('قبول', Colors.green, Icons.check, () => cubit.respondDecision(caseId, accept: true))),
            const SizedBox(width: 12),
            Expanded(child: _buildActionBtnOutlined('اعتراض', Colors.orange, Icons.report_problem, () => _showResponseDialog(context, false, isInformal: false))),
          ],
        ),
      ],
    );
  }

  Widget _buildHRReviewActions(BuildContext context, DisciplinaryCubit cubit) {
    return Row(
      children: [
        Expanded(child: _buildActionButton('فتح تحقيق رسمي', Colors.blue, Icons.gavel, () => cubit.hrReview(caseId, approve: true))),
        const SizedBox(width: 12),
        Expanded(child: _buildActionBtnOutlined('رفض الطلب', Colors.red, Icons.delete_outline, () => cubit.hrReview(caseId, approve: false))),
      ],
    );
  }

  Widget _buildHRScheduleActions(BuildContext context, DisciplinaryCubit cubit) {
    return _buildActionButton('جدولة جلسة استماع', Colors.purple, Icons.calendar_month, () => _showScheduleDialog(context, cubit));
  }

  Widget _buildHRIssueDecisionActions(BuildContext context, DisciplinaryCubit cubit) {
    return _buildActionButton('إصدار القرار النهائي', Colors.deepOrange, Icons.assignment_turned_in, () => _showIssueDecisionDialog(context, cubit));
  }

  Widget _buildHRObjectionReviewActions(BuildContext context, DisciplinaryCubit cubit) {
    return Row(
      children: [
        Expanded(child: _buildActionButton('قبول الاعتراض (تحقيق جديد)', Colors.blue, Icons.refresh, () => cubit.hrReview(caseId, approve: true))),
        const SizedBox(width: 12),
        Expanded(child: _buildActionBtnOutlined('رفض الاعتراض (تأكيد)', Colors.red, Icons.check_circle_outline, () => cubit.hrReview(caseId, approve: false))),
      ],
    );
  }

  Widget _buildHRFinalizeActions(BuildContext context, DisciplinaryCubit cubit) {
    return _buildActionButton('تم الاعتماد النهائي وإغلاق الملف', Colors.green.shade700, Icons.lock_outline, () => cubit.finalizeCase(caseId));
  }

  Widget _buildActionButton(String label, Color color, IconData icon, VoidCallback onPressed) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon),
      label: Text(label),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  Widget _buildActionBtnOutlined(String label, Color color, IconData icon, VoidCallback onPressed) {
    return OutlinedButton.icon(
      onPressed: onPressed,
      icon: Icon(icon),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        side: BorderSide(color: color),
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _showScheduleDialog(BuildContext context, DisciplinaryCubit cubit) {
    showDialog(
      context: context,
      builder: (_) => ScheduleHearingDialog(caseId: caseId, cubit: cubit),
    );
  }

  void _showIssueDecisionDialog(BuildContext context, DisciplinaryCubit cubit) {
    showDialog(
      context: context,
      builder: (_) => IssueDecisionDialog(caseId: caseId, cubit: cubit),
    );
  }


  void _showResponseDialog(BuildContext context, bool accept, {required bool isInformal}) {
    showDialog(
      context: context,
      builder: (_) => ResponseDialog(
        caseId: caseId,
        isInformal: isInformal,
        cubit: context.read<DisciplinaryCubit>(),
      ),
    );
  }

  Widget _buildInfoCard({
    required String title,
    required IconData icon,
    Color? iconColor,
    required Widget child,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon, size: 20, color: iconColor ?? Colors.blue),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            child,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: Colors.grey.shade600)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
      ],
    );
  }

  String _formatDate(DateTime date) => '${date.day}/${date.month}/${date.year}';
  String _formatDateTime(DateTime date) => '${date.day}/${date.month}/${date.year} - ${date.hour}:${date.minute.toString().padLeft(2, '0')}';

  String _getViolationTypeArabic(String type) {
    const types = {
      'TARDINESS': 'تأخر',
      'ABSENCE': 'غياب',
      'MISCONDUCT': 'سوء سلوك',
      'NEGLIGENCE': 'إهمال',
      'POLICY_VIOLATION': 'مخالفة سياسة',
      'PERFORMANCE': 'أداء ضعيف',
    };
    return types[type] ?? type;
  }

  String _getDecisionTypeArabic(String type) {
    const types = {
      'VERBAL_WARNING': 'إنذار شفهي',
      'WRITTEN_WARNING': 'إنذار كتابي',
      'SALARY_DEDUCTION': 'خصم من الراتب',
      'SUSPENSION': 'إيقاف عن العمل',
      'TERMINATION': 'إنهاء الخدمة',
      'DISMISSAL': 'فصل',
    };
    return types[type] ?? type;
  }
}
