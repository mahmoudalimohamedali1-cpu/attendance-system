import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';

class MonthlyStatsPage extends StatelessWidget {
  final int year;
  final int month;

  const MonthlyStatsPage({
    super.key,
    required this.year,
    required this.month,
  });

  @override
  Widget build(BuildContext context) {
    final monthName = DateFormat('MMMM yyyy', 'ar').format(DateTime(year, month));

    return Scaffold(
      appBar: AppBar(
        title: Text('إحصائيات $monthName'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSummaryCard(context),
            const SizedBox(height: 20),
            _buildDetailedStats(context),
            const SizedBox(height: 20),
            _buildWorkingHoursCard(context),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ملخص الشهر',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: _SummaryItem(
                    icon: Icons.check_circle,
                    label: 'أيام الحضور',
                    value: '20',
                    color: AppTheme.successColor,
                  ),
                ),
                Expanded(
                  child: _SummaryItem(
                    icon: Icons.schedule,
                    label: 'التأخيرات',
                    value: '2',
                    color: AppTheme.warningColor,
                  ),
                ),
                Expanded(
                  child: _SummaryItem(
                    icon: Icons.cancel,
                    label: 'الغياب',
                    value: '0',
                    color: AppTheme.errorColor,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailedStats(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'تفاصيل الحضور',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _DetailRow(
              label: 'إجمالي أيام العمل',
              value: '22 يوم',
              icon: Icons.calendar_month,
            ),
            _DetailRow(
              label: 'أيام الحضور',
              value: '20 يوم',
              icon: Icons.check,
              color: AppTheme.successColor,
            ),
            _DetailRow(
              label: 'أيام التأخير',
              value: '2 يوم',
              icon: Icons.schedule,
              color: AppTheme.warningColor,
            ),
            _DetailRow(
              label: 'أيام الغياب',
              value: '0 يوم',
              icon: Icons.cancel,
              color: AppTheme.errorColor,
            ),
            _DetailRow(
              label: 'أيام الإجازة',
              value: '0 يوم',
              icon: Icons.beach_access,
              color: AppTheme.infoColor,
            ),
            _DetailRow(
              label: 'العمل من المنزل',
              value: '2 يوم',
              icon: Icons.home,
              color: AppTheme.primaryColor,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkingHoursCard(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ساعات العمل',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _DetailRow(
              label: 'إجمالي ساعات العمل',
              value: '160 ساعة',
              icon: Icons.access_time,
            ),
            _DetailRow(
              label: 'دقائق التأخير',
              value: '25 دقيقة',
              icon: Icons.timer_off,
              color: AppTheme.warningColor,
            ),
            _DetailRow(
              label: 'الساعات الإضافية',
              value: '5 ساعات',
              icon: Icons.add_circle,
              color: AppTheme.successColor,
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _SummaryItem({
    required this.icon,
    required this.label,
    required this.value,
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
          child: Icon(icon, color: color, size: 28),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Colors.grey[600],
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color? color;

  const _DetailRow({
    required this.label,
    required this.value,
    required this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color ?? Colors.grey),
          const SizedBox(width: 12),
          Expanded(child: Text(label)),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

