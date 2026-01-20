import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'dart:async';
import '../../../../core/theme/app_theme.dart';
import '../../../attendance/presentation/bloc/attendance_bloc.dart';

class CheckInOutPage extends StatefulWidget {
  const CheckInOutPage({super.key});

  @override
  State<CheckInOutPage> createState() => _CheckInOutPageState();
}

class _CheckInOutPageState extends State<CheckInOutPage> {
  final MapController _mapController = MapController();
  Position? _currentPosition;
  Timer? _clockTimer;
  DateTime _currentTime = DateTime.now();
  String? _selectedReminder;
  
  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    _startClock();
    context.read<AttendanceBloc>().add(GetTodayAttendanceEvent());
  }

  @override
  void dispose() {
    _clockTimer?.cancel();
    super.dispose();
  }

  void _startClock() {
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _currentTime = DateTime.now();
        });
      }
    });
  }

  Future<void> _getCurrentLocation() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      if (mounted) {
        setState(() {
          _currentPosition = position;
        });
        
        _mapController.move(
          LatLng(position.latitude, position.longitude),
          16,
        );
      }
    } catch (e) {
      debugPrint('Location error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final timeFormat = DateFormat('h:mm a', 'en');
    
    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF1A1A2E) : Colors.grey[100],
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, color: isDark ? Colors.white : Colors.black),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Check In/Out',
          style: TextStyle(
            color: isDark ? Colors.white : Colors.black,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(Icons.help_outline, color: isDark ? Colors.white : Colors.black),
            onPressed: () {
              // Show help dialog
            },
          ),
        ],
      ),
      body: BlocBuilder<AttendanceBloc, AttendanceState>(
        builder: (context, state) {
          final attendance = state is AttendanceLoaded ? state.todayAttendance : null;
          final hasCheckedIn = attendance?.checkInTime != null;
          final hasCheckedOut = attendance?.checkOutTime != null;
          
          return SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Column(
              children: [
                // Map Section - OpenStreetMap (FREE!)
                _buildMapSection(),
                
                const SizedBox(height: 24),
                
                // Current Time
                Text(
                  timeFormat.format(_currentTime),
                  style: TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : Colors.black,
                  ),
                ),
                
                const SizedBox(height: 12),
                
                // Status Info
                _buildStatusInfo(attendance, hasCheckedIn, hasCheckedOut, isDark),
                
                const SizedBox(height: 24),
                
                // Reminder Section
                if (hasCheckedIn && !hasCheckedOut)
                  _buildReminderSection(isDark),
                
                const SizedBox(height: 20),
                
                // Today's Time Card
                _buildTodayTimeCard(attendance, isDark),
                
                const SizedBox(height: 24),
                
                // Check In/Out Button
                _buildActionButton(hasCheckedIn, hasCheckedOut, isDark),
                
                const SizedBox(height: 40),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildMapSection() {
    final defaultLocation = LatLng(24.7136, 46.6753); // Riyadh default
    final currentLocation = _currentPosition != null
        ? LatLng(_currentPosition!.latitude, _currentPosition!.longitude)
        : defaultLocation;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      height: 180,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: FlutterMap(
        mapController: _mapController,
        options: MapOptions(
          initialCenter: currentLocation,
          initialZoom: 16,
        ),
        children: [
          // OpenStreetMap Tiles - FREE!
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.attendance.app',
          ),
          // Current Location Marker
          MarkerLayer(
            markers: [
              Marker(
                point: currentLocation,
                width: 50,
                height: 50,
                child: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 3),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.primaryColor.withValues(alpha: 0.4),
                        blurRadius: 10,
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.person,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusInfo(dynamic attendance, bool hasCheckedIn, bool hasCheckedOut, bool isDark) {
    if (!hasCheckedIn) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.grey.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(30),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.info_outline, size: 18, color: isDark ? Colors.white70 : Colors.grey[600]),
            const SizedBox(width: 8),
            Text(
              'لم تسجل حضور اليوم',
              style: TextStyle(
                color: isDark ? Colors.white70 : Colors.grey[600],
                fontSize: 14,
              ),
            ),
          ],
        ),
      );
    }
    
    final checkInTime = attendance?.checkInTime;
    final workingMinutes = attendance?.workingMinutes ?? 0;
    final hours = workingMinutes ~/ 60;
    final minutes = workingMinutes % 60;
    
    return Column(
      children: [
        // Status Row
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: hasCheckedOut 
                ? AppTheme.successColor.withValues(alpha: 0.15)
                : AppTheme.primaryColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(30),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                hasCheckedOut ? Icons.check_circle : Icons.schedule,
                size: 18,
                color: hasCheckedOut ? AppTheme.successColor : AppTheme.primaryColor,
              ),
              const SizedBox(width: 8),
              Text(
                hasCheckedOut
                    ? 'انتهى يوم العمل'
                    : 'مسجل حضور',
                style: TextStyle(
                  color: hasCheckedOut ? AppTheme.successColor : AppTheme.primaryColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        // Worked hours
        if (checkInTime != null)
          Text(
            'ساعات العمل: ${hours}h ${minutes}m',
            style: TextStyle(
              color: isDark ? Colors.white70 : Colors.grey[600],
              fontSize: 14,
            ),
          ),
      ],
    );
  }

  Widget _buildReminderSection(bool isDark) {
    final reminders = ['12:00 PM', '5:00 PM', '6:00 PM'];
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.08) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? null : [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.alarm, color: AppTheme.primaryColor, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  'تذكيرني لتسجيل الانصراف في...',
                  style: TextStyle(
                    color: isDark ? Colors.white : Colors.black87,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.more_horiz),
                onPressed: () {
                  _showCustomTimeDialog();
                },
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: reminders.map((time) {
              final isSelected = _selectedReminder == time;
              return Padding(
                padding: const EdgeInsets.only(left: 8),
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedReminder = isSelected ? null : time;
                    });
                    if (!isSelected) {
                      _setReminder(time);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected 
                          ? AppTheme.primaryColor 
                          : (isDark ? Colors.white.withValues(alpha: 0.1) : Colors.grey[100]),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected 
                            ? AppTheme.primaryColor 
                            : (isDark ? Colors.white24 : Colors.grey[300]!),
                      ),
                    ),
                    child: Text(
                      time,
                      style: TextStyle(
                        color: isSelected 
                            ? Colors.white 
                            : (isDark ? Colors.white70 : Colors.black87),
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                      ),
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildTodayTimeCard(dynamic attendance, bool isDark) {
    final checkInTime = attendance?.checkInTime;
    final checkOutTime = attendance?.checkOutTime;
    final timeFormat = DateFormat('h:mm a', 'en');
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? Colors.white.withValues(alpha: 0.08) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: isDark ? null : [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 15,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  gradient: AppTheme.primaryGradient,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.access_time, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 14),
              Text(
                'أوقات اليوم',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : Colors.black,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          // Timeline
          _buildTimelineItem(
            'تسجيل الحضور',
            checkInTime != null ? timeFormat.format(checkInTime) : '--:--',
            true,
            checkInTime != null,
            isDark,
          ),
          _buildTimelineDivider(isDark),
          _buildTimelineItem(
            'تسجيل الانصراف',
            checkOutTime != null ? timeFormat.format(checkOutTime) : '--:--',
            false,
            checkOutTime != null,
            isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineItem(String title, String time, bool isFirst, bool isCompleted, bool isDark) {
    return Row(
      children: [
        // Timeline dot
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isCompleted ? AppTheme.successColor : Colors.grey[400],
            border: Border.all(
              color: isCompleted ? AppTheme.successColor : Colors.grey[300]!,
              width: 2,
            ),
          ),
        ),
        const SizedBox(width: 16),
        // Content
        Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: TextStyle(
                  color: isDark ? Colors.white70 : Colors.grey[700],
                  fontSize: 15,
                ),
              ),
              Text(
                time,
                style: TextStyle(
                  color: isCompleted 
                      ? (isDark ? Colors.white : Colors.black)
                      : Colors.grey[400],
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTimelineDivider(bool isDark) {
    return Container(
      margin: const EdgeInsets.only(right: 6, top: 4, bottom: 4),
      width: 2,
      height: 30,
      color: isDark ? Colors.white24 : Colors.grey[300],
    );
  }

  Widget _buildActionButton(bool hasCheckedIn, bool hasCheckedOut, bool isDark) {
    if (hasCheckedOut) {
      return Container(
        margin: const EdgeInsets.symmetric(horizontal: 20),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppTheme.successColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.successColor.withValues(alpha: 0.3)),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.check_circle, color: AppTheme.successColor, size: 28),
            SizedBox(width: 12),
            Text(
              'انتهى يوم العمل - شكراً لك!',
              style: TextStyle(
                color: AppTheme.successColor,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      );
    }
    
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            if (hasCheckedIn) {
              context.read<AttendanceBloc>().add(CheckOutEvent());
            } else {
              context.read<AttendanceBloc>().add(CheckInEvent());
            }
          },
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 18),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: hasCheckedIn
                    ? [Colors.orange, Colors.deepOrange]
                    : [const Color(0xFF667eea), const Color(0xFF764ba2)],
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: (hasCheckedIn ? Colors.orange : const Color(0xFF667eea))
                      .withValues(alpha: 0.4),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  hasCheckedIn ? Icons.logout_rounded : Icons.login_rounded,
                  color: Colors.white,
                  size: 26,
                ),
                const SizedBox(width: 12),
                Text(
                  hasCheckedIn ? 'تسجيل انصراف' : 'تسجيل حضور',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showCustomTimeDialog() {
    TimeOfDay selectedTime = TimeOfDay.now();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('اختر وقت التذكير'),
        content: SizedBox(
          height: 200,
          child: Center(
            child: ElevatedButton(
              onPressed: () async {
                final time = await showTimePicker(
                  context: context,
                  initialTime: selectedTime,
                );
                if (time != null) {
                  Navigator.pop(context);
                  setState(() {
                    _selectedReminder = time.format(context);
                  });
                  _setReminder(_selectedReminder!);
                }
              },
              child: const Text('اختر الوقت'),
            ),
          ),
        ),
      ),
    );
  }

  void _setReminder(String time) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.alarm_on, color: Colors.white),
            const SizedBox(width: 12),
            Text('تم تعيين تذكير للانصراف في $time'),
          ],
        ),
        backgroundColor: AppTheme.successColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
    // TODO: Implement actual notification scheduling
  }
}
