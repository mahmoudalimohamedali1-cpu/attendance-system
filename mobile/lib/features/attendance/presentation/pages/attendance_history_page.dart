import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/l10n/app_localizations.dart';
import '../bloc/attendance_bloc.dart';

class AttendanceHistoryPage extends StatefulWidget {
  const AttendanceHistoryPage({super.key});

  @override
  State<AttendanceHistoryPage> createState() => _AttendanceHistoryPageState();
}

class _AttendanceHistoryPageState extends State<AttendanceHistoryPage> {
  String _selectedStatus = 'all';

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  void _loadHistory() {
    context.read<AttendanceBloc>().add(GetAttendanceHistoryEvent(
      status: _selectedStatus == 'all' ? null : _selectedStatus,
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(context.tr('attendance_history')),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            onSelected: (value) {
              setState(() => _selectedStatus = value);
              _loadHistory();
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'all', child: Text('الكل')),
              const PopupMenuItem(value: 'PRESENT', child: Text('حاضر')),
              const PopupMenuItem(value: 'LATE', child: Text('متأخر')),
              const PopupMenuItem(value: 'ABSENT', child: Text('غائب')),
              const PopupMenuItem(value: 'ON_LEAVE', child: Text('إجازة')),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadHistory,
          ),
        ],
      ),
      body: BlocBuilder<AttendanceBloc, AttendanceState>(
        builder: (context, state) {
          if (state is AttendanceLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is AttendanceError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text('حدث خطأ: ${state.message}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadHistory,
                    child: const Text('إعادة المحاولة'),
                  ),
                ],
              ),
            );
          }

          if (state is AttendanceLoaded) {
            if (state.history.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.history, size: 64, color: Colors.grey[300]),
                    const SizedBox(height: 16),
                    Text(
                      'لا يوجد سجل حضور',
                      style: TextStyle(color: Colors.grey[600], fontSize: 16),
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: () async => _loadHistory(),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.history.length,
                itemBuilder: (context, index) {
                  final attendance = state.history[index];
                  return _AttendanceCard(attendance: attendance);
                },
              ),
            );
          }

          return const Center(child: Text('جاري التحميل...'));
        },
      ),
    );
  }
}

class _AttendanceCard extends StatelessWidget {
  final dynamic attendance;

  const _AttendanceCard({required this.attendance});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('EEEE، d MMMM', 'ar');
    final timeFormat = DateFormat('hh:mm a', 'ar');
    
    final date = attendance.date;
    final status = attendance.status ?? 'PRESENT';
    final checkInTime = attendance.checkInTime;
    final checkOutTime = attendance.checkOutTime;
    
    Color statusColor;
    String statusText;

    switch (status) {
      case 'PRESENT':
        statusColor = AppTheme.successColor;
        statusText = 'حاضر';
        break;
      case 'LATE':
        statusColor = AppTheme.warningColor;
        statusText = 'متأخر';
        break;
      case 'ABSENT':
        statusColor = AppTheme.errorColor;
        statusText = 'غائب';
        break;
      case 'ON_LEAVE':
        statusColor = AppTheme.infoColor;
        statusText = 'إجازة';
        break;
      case 'HOLIDAY':
        statusColor = Colors.purple;
        statusText = 'عطلة';
        break;
      default:
        statusColor = Colors.grey;
        statusText = status;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Date Circle
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    date.day.toString(),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: statusColor,
                    ),
                  ),
                  Text(
                    DateFormat('MMM', 'ar').format(date),
                    style: TextStyle(
                      fontSize: 10,
                      color: statusColor,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            
            // Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dateFormat.format(date),
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  if (checkInTime != null) ...[
                    Row(
                      children: [
                        _TimeChip(
                          icon: Icons.login,
                          label: timeFormat.format(checkInTime),
                          color: AppTheme.successColor,
                        ),
                        if (checkOutTime != null) ...[
                          const SizedBox(width: 8),
                          _TimeChip(
                            icon: Icons.logout,
                            label: timeFormat.format(checkOutTime),
                            color: AppTheme.primaryColor,
                          ),
                        ],
                      ],
                    ),
                  ] else if (status == 'ABSENT') ...[
                    Text(
                      'لم يتم تسجيل الحضور',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  ],
                ],
              ),
            ),
            
            // Status Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                statusText,
                style: TextStyle(
                  color: statusColor,
                  fontWeight: FontWeight.w500,
                  fontSize: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TimeChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _TimeChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}
