import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/di/injection.dart';
import '../../../../core/network/api_client.dart';

class MonthlyReportPage extends StatefulWidget {
  const MonthlyReportPage({super.key});

  @override
  State<MonthlyReportPage> createState() => _MonthlyReportPageState();
}

class _MonthlyReportPageState extends State<MonthlyReportPage> {
  Map<String, dynamic>? _stats;
  bool _loading = true;
  String? _error;
  int _selectedMonth = DateTime.now().month;
  int _selectedYear = DateTime.now().year;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() => _loading = true);
    try {
      final apiClient = getIt<ApiClient>();
      final response = await apiClient.dio.get(
        '/attendance/my-monthly-stats',
        queryParameters: {
          'month': _selectedMonth,
          'year': _selectedYear,
        },
      );
      if (response.statusCode == 200) {
        setState(() {
          _stats = response.data;
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('تقرير الحضور الشهري'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadStats,
          ),
        ],
      ),
      body: Column(
        children: [
          // Month Selector
          Container(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () {
                    setState(() {
                      if (_selectedMonth == 1) {
                        _selectedMonth = 12;
                        _selectedYear--;
                      } else {
                        _selectedMonth--;
                      }
                    });
                    _loadStats();
                  },
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${_getMonthName(_selectedMonth)} $_selectedYear',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () {
                    final now = DateTime.now();
                    if (_selectedYear < now.year || (_selectedYear == now.year && _selectedMonth < now.month)) {
                      setState(() {
                        if (_selectedMonth == 12) {
                          _selectedMonth = 1;
                          _selectedYear++;
                        } else {
                          _selectedMonth++;
                        }
                      });
                      _loadStats();
                    }
                  },
                ),
              ],
            ),
          ),
          // Stats Content
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.error_outline, size: 64, color: Colors.red),
                            const SizedBox(height: 16),
                            Text(_error!),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: _loadStats,
                              child: const Text('إعادة المحاولة'),
                            ),
                          ],
                        ),
                      )
                    : _buildStatsContent(),
          ),
        ],
      ),
    );
  }

  Widget _buildStatsContent() {
    if (_stats == null) {
      return const Center(child: Text('لا توجد بيانات'));
    }

    final presentDays = _stats!['presentDays'] ?? 0;
    final absentDays = _stats!['absentDays'] ?? 0;
    final lateDays = _stats!['lateDays'] ?? 0;
    final earlyLeaveDays = _stats!['earlyLeaveDays'] ?? 0;
    final leaveDays = _stats!['leaveDays'] ?? 0;
    final wfhDays = _stats!['wfhDays'] ?? 0;
    final totalWorkingHours = _stats!['totalWorkingHours'] ?? 0;
    final totalLateMinutes = _stats!['totalLateMinutes'] ?? 0;
    final totalOvertimeMinutes = _stats!['totalOvertimeMinutes'] ?? 0;
    final workingDays = _stats!['workingDays'] ?? 22;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Attendance Overview Card
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const Text(
                    'نظرة عامة',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 20),
                  // Progress Ring
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 150,
                        height: 150,
                        child: CircularProgressIndicator(
                          value: workingDays > 0 ? presentDays / workingDays : 0,
                          strokeWidth: 12,
                          backgroundColor: Colors.grey[200],
                          valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.successColor),
                        ),
                      ),
                      Column(
                        children: [
                          Text(
                            '$presentDays',
                            style: const TextStyle(
                              fontSize: 36,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.successColor,
                            ),
                          ),
                          Text(
                            'من $workingDays يوم',
                            style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'نسبة الحضور: ${workingDays > 0 ? ((presentDays / workingDays) * 100).toStringAsFixed(1) : 0}%',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Stats Grid
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.4,
            children: [
              _StatCard(
                icon: Icons.check_circle,
                label: 'أيام الحضور',
                value: '$presentDays',
                color: AppTheme.successColor,
              ),
              _StatCard(
                icon: Icons.cancel,
                label: 'أيام الغياب',
                value: '$absentDays',
                color: AppTheme.errorColor,
              ),
              _StatCard(
                icon: Icons.schedule,
                label: 'أيام التأخير',
                value: '$lateDays',
                color: AppTheme.warningColor,
              ),
              _StatCard(
                icon: Icons.exit_to_app,
                label: 'انصراف مبكر',
                value: '$earlyLeaveDays',
                color: Colors.orange,
              ),
              _StatCard(
                icon: Icons.beach_access,
                label: 'أيام الإجازة',
                value: '$leaveDays',
                color: Colors.purple,
              ),
              _StatCard(
                icon: Icons.home_work,
                label: 'عمل من المنزل',
                value: '$wfhDays',
                color: Colors.teal,
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Time Stats
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'إحصائيات الوقت',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  _TimeStatRow(
                    icon: Icons.access_time,
                    label: 'إجمالي ساعات العمل',
                    value: _formatHours(totalWorkingHours),
                    color: AppTheme.primaryColor,
                  ),
                  const Divider(),
                  _TimeStatRow(
                    icon: Icons.timer_off,
                    label: 'إجمالي دقائق التأخير',
                    value: '$totalLateMinutes دقيقة',
                    color: AppTheme.warningColor,
                  ),
                  const Divider(),
                  _TimeStatRow(
                    icon: Icons.more_time,
                    label: 'إجمالي الساعات الإضافية',
                    value: _formatMinutes(totalOvertimeMinutes),
                    color: AppTheme.successColor,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getMonthName(int month) {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[month - 1];
  }

  String _formatHours(dynamic hours) {
    if (hours is int) {
      return '$hours ساعة';
    } else if (hours is double) {
      return '${hours.toStringAsFixed(1)} ساعة';
    }
    return '$hours ساعة';
  }

  String _formatMinutes(int minutes) {
    if (minutes >= 60) {
      final hours = minutes ~/ 60;
      final mins = minutes % 60;
      return '$hours س $mins د';
    }
    return '$minutes دقيقة';
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _TimeStatRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _TimeStatRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Text(label, style: const TextStyle(fontSize: 14)),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
