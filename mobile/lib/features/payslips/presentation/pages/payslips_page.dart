import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/models/payslip_model.dart';
import '../../data/datasources/payslips_remote_datasource.dart';
import '../../data/repositories/payslips_repository_impl.dart';
import '../bloc/payslips_bloc.dart';
import 'payslip_details_page.dart';
import '../../../../core/di/injection_container.dart';
import '../../../../core/network/api_client.dart';

class PayslipsPage extends StatelessWidget {
  const PayslipsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final apiClient = sl<ApiClient>();
        final dataSource = PayslipsRemoteDataSourceImpl(apiClient);
        final repository = PayslipsRepositoryImpl(dataSource);
        return PayslipsBloc(repository)..add(LoadPayslips());
      },
      child: const _PayslipsView(),
    );
  }
}

class _PayslipsView extends StatelessWidget {
  const _PayslipsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('رواتبي'),
        centerTitle: true,
      ),
      body: BlocBuilder<PayslipsBloc, PayslipsState>(
        builder: (context, state) {
          if (state is PayslipsLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is PayslipsError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(
                    'حدث خطأ: ${state.message}',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      context.read<PayslipsBloc>().add(LoadPayslips());
                    },
                    child: const Text('إعادة المحاولة'),
                  ),
                ],
              ),
            );
          }

          if (state is PayslipsLoaded) {
            if (state.payslips.isEmpty) {
              return const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey),
                    SizedBox(height: 16),
                    Text('لا توجد كشوفات راتب'),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: () async {
                context.read<PayslipsBloc>().add(LoadPayslips());
              },
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.payslips.length,
                itemBuilder: (context, index) {
                  final payslip = state.payslips[index];
                  return _PayslipCard(payslip: payslip);
                },
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }
}

class _PayslipCard extends StatelessWidget {
  final PayslipModel payslip;

  const _PayslipCard({required this.payslip});

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'POSTED':
      case 'APPROVED':
        return Colors.green;
      case 'DRAFT':
        return Colors.orange;
      case 'CANCELLED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'POSTED':
        return 'معتمد';
      case 'APPROVED':
        return 'موافق عليه';
      case 'DRAFT':
        return 'مسودة';
      case 'CANCELLED':
        return 'ملغي';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => PayslipDetailsPage(payslip: payslip),
            ),
          );
        },
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    payslip.periodLabel,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(payslip.status).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _getStatusLabel(payslip.status),
                      style: TextStyle(
                        color: _getStatusColor(payslip.status),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Salary breakdown
              Row(
                children: [
                  Expanded(
                    child: _SalaryItem(
                      label: 'الإجمالي',
                      amount: payslip.grossSalary,
                      color: Colors.blue,
                    ),
                  ),
                  Expanded(
                    child: _SalaryItem(
                      label: 'الخصومات',
                      amount: payslip.totalDeductions,
                      color: Colors.red,
                    ),
                  ),
                  Expanded(
                    child: _SalaryItem(
                      label: 'الصافي',
                      amount: payslip.netSalary,
                      color: Colors.green,
                      isBold: true,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SalaryItem extends StatelessWidget {
  final String label;
  final double amount;
  final Color color;
  final bool isBold;

  const _SalaryItem({
    required this.label,
    required this.amount,
    required this.color,
    this.isBold = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(height: 4),
        Text(
          '${amount.toStringAsFixed(0)} ر.س',
          style: TextStyle(
            fontSize: 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            color: color,
          ),
        ),
      ],
    );
  }
}
