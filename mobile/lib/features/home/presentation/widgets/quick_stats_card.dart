import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../attendance/presentation/bloc/attendance_bloc.dart';

class QuickStatsCard extends StatelessWidget {
  const QuickStatsCard({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AttendanceBloc, AttendanceState>(
      builder: (context, state) {
        // Default values
        int presentDays = 0;
        int lateDays = 0;
        int absentDays = 0;

        if (state is AttendanceLoaded && state.stats != null) {
          presentDays = state.stats!.presentDays;
          lateDays = state.stats!.lateDays;
          absentDays = state.stats!.absentDays;
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
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'إحصائيات هذا الشهر',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () {
                        final now = DateTime.now();
                        context.push('/attendance/stats/${now.year}/${now.month}');
                      },
                      icon: const Icon(Icons.arrow_back_ios, size: 16),
                      label: const Text('التفاصيل'),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _StatItem(
                        title: 'أيام الحضور',
                        value: presentDays.toString(),
                        icon: Icons.check_circle_outline,
                        color: AppTheme.successColor,
                      ),
                    ),
                    Expanded(
                      child: _StatItem(
                        title: 'التأخيرات',
                        value: lateDays.toString(),
                        icon: Icons.schedule,
                        color: AppTheme.warningColor,
                      ),
                    ),
                    Expanded(
                      child: _StatItem(
                        title: 'الغياب',
                        value: absentDays.toString(),
                        icon: Icons.cancel_outlined,
                        color: AppTheme.errorColor,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _StatItem extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatItem({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          title,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[600],
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
