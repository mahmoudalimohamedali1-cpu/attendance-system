import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../../../attendance/presentation/bloc/attendance_bloc.dart';

class TodayStatusCard extends StatelessWidget {
  const TodayStatusCard({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AttendanceBloc, AttendanceState>(
      builder: (context, state) {
        final attendance = state is AttendanceLoaded ? state.todayAttendance : null;

        String statusText = context.tr('not_checked_in');
        Color statusColor = Colors.grey;
        IconData statusIcon = Icons.pending_outlined;

        if (attendance != null) {
          if (attendance.checkOutTime != null) {
            statusText = context.tr('checked_out');
            statusColor = AppTheme.primaryColor;
            statusIcon = Icons.check_circle;
          } else if (attendance.checkInTime != null) {
            statusText = context.tr('checked_in');
            statusColor = AppTheme.successColor;
            statusIcon = Icons.login;

            if (attendance.status == 'LATE') {
              statusColor = AppTheme.warningColor;
              statusText = 'حاضر (متأخر ${attendance.lateMinutes} دقيقة)';
            }
          }
        }

        return Card(
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        statusIcon,
                        color: statusColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'حالة اليوم',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.grey[600],
                            ),
                          ),
                          Text(
                            statusText,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: statusColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                
                if (attendance != null && attendance.checkInTime != null) ...[
                  const Divider(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: _TimeItem(
                          title: 'وقت الحضور',
                          time: attendance.checkInTime!,
                          icon: Icons.login,
                          color: AppTheme.successColor,
                        ),
                      ),
                      if (attendance.checkOutTime != null)
                        Expanded(
                          child: _TimeItem(
                            title: 'وقت الانصراف',
                            time: attendance.checkOutTime!,
                            icon: Icons.logout,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                    ],
                  ),
                  
                  if (attendance.checkOutTime != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: AppTheme.infoColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.schedule,
                            size: 18,
                            color: AppTheme.infoColor,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'إجمالي ساعات العمل: ${_formatDuration(attendance.workingMinutes)}',
                            style: const TextStyle(
                              color: AppTheme.infoColor,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  String _formatDuration(int minutes) {
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    if (hours > 0) {
      return '$hours ساعة ${mins > 0 ? 'و $mins دقيقة' : ''}';
    }
    return '$mins دقيقة';
  }
}

class _TimeItem extends StatelessWidget {
  final String title;
  final DateTime time;
  final IconData icon;
  final Color color;

  const _TimeItem({
    required this.title,
    required this.time,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final timeFormat = DateFormat('hh:mm a', 'ar');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 4),
            Text(
              timeFormat.format(time),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

