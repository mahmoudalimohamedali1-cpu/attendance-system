// lib/features/raises/presentation/pages/raises_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../domain/entities/raise_request.dart';
import '../bloc/raises_bloc.dart';

class RaisesPage extends StatefulWidget {
  const RaisesPage({super.key});

  @override
  State<RaisesPage> createState() => _RaisesPageState();
}

class _RaisesPageState extends State<RaisesPage> {
  @override
  void initState() {
    super.initState();
    context.read<RaisesBloc>().add(LoadRaisesEvent());
  }

  String _getTypeLabel(RaiseType type) {
    switch (type) {
      case RaiseType.salaryIncrease:
        return 'زيادة راتب';
      case RaiseType.annualLeaveBonus:
        return 'بدل إجازة سنوية';
      case RaiseType.businessTrip:
        return 'رحلة عمل';
      case RaiseType.bonus:
        return 'مكافأة';
      case RaiseType.allowance:
        return 'بدل';
      case RaiseType.other:
        return 'أخرى';
    }
  }

  String _getStatusLabel(RaiseStatus status) {
    switch (status) {
      case RaiseStatus.pending:
        return 'قيد المراجعة';
      case RaiseStatus.mgrApproved:
        return 'موافقة المدير';
      case RaiseStatus.mgrRejected:
        return 'رفض المدير';
      case RaiseStatus.approved:
        return 'موافق عليه';
      case RaiseStatus.rejected:
        return 'مرفوض';
      case RaiseStatus.delayed:
        return 'مؤجل';
      case RaiseStatus.cancelled:
        return 'ملغي';
    }
  }

  Color _getStatusColor(RaiseStatus status) {
    switch (status) {
      case RaiseStatus.pending:
        return Colors.orange;
      case RaiseStatus.mgrApproved:
        return Colors.blue;
      case RaiseStatus.approved:
        return Colors.green;
      case RaiseStatus.rejected:
      case RaiseStatus.mgrRejected:
        return Colors.red;
      case RaiseStatus.delayed:
        return Colors.purple;
      case RaiseStatus.cancelled:
        return Colors.grey;
    }
  }

  IconData _getTypeIcon(RaiseType type) {
    switch (type) {
      case RaiseType.salaryIncrease:
        return Icons.trending_up;
      case RaiseType.annualLeaveBonus:
        return Icons.beach_access;
      case RaiseType.businessTrip:
        return Icons.flight;
      case RaiseType.bonus:
        return Icons.star;
      case RaiseType.allowance:
        return Icons.account_balance_wallet;
      case RaiseType.other:
        return Icons.more_horiz;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('طلبات الزيادة'),
        centerTitle: true,
      ),
      body: BlocConsumer<RaisesBloc, RaisesState>(
        listener: (context, state) {
          if (state is RaiseCreated) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('تم إرسال الطلب بنجاح'),
                backgroundColor: Colors.green,
              ),
            );
          } else if (state is RaiseCreateError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is RaisesLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is RaisesError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(state.message, style: const TextStyle(color: Colors.red)),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.read<RaisesBloc>().add(LoadRaisesEvent()),
                    child: const Text('إعادة المحاولة'),
                  ),
                ],
              ),
            );
          }

          if (state is RaisesLoaded) {
            final requests = state.requests;

            if (requests.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.monetization_on_outlined, size: 80, color: Colors.grey.shade400),
                    const SizedBox(height: 16),
                    Text(
                      'لا توجد طلبات زيادة',
                      style: TextStyle(fontSize: 18, color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () => context.push('/raises/new'),
                      icon: const Icon(Icons.add),
                      label: const Text('تقديم طلب جديد'),
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: () async {
                context.read<RaisesBloc>().add(LoadRaisesEvent());
              },
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: requests.length,
                itemBuilder: (context, index) {
                  final request = requests[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: _getStatusColor(request.status).withOpacity(0.2),
                        child: Icon(
                          _getTypeIcon(request.type),
                          color: _getStatusColor(request.status),
                        ),
                      ),
                      title: Text(
                        _getTypeLabel(request.type),
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 4),
                          Text(
                            '${NumberFormat('#,###').format(request.amount)} ر.س',
                            style: const TextStyle(
                              color: Colors.green,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'لشهر ${DateFormat('MMMM yyyy', 'ar').format(request.effectiveMonth)}',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: _getStatusColor(request.status).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _getStatusLabel(request.status),
                          style: TextStyle(
                            color: _getStatusColor(request.status),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      isThreeLine: true,
                    ),
                  );
                },
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/raises/new'),
        icon: const Icon(Icons.add),
        label: const Text('طلب جديد'),
      ),
    );
  }
}
