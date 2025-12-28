import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get_it/get_it.dart';
import '../../../../core/network/api_client.dart';
import '../../data/datasources/disciplinary_remote_datasource.dart';
import '../../data/models/disciplinary_case_model.dart';
import '../cubit/disciplinary_cubit.dart';
import '../cubit/disciplinary_state.dart';
import '../widgets/case_card.dart';
import 'disciplinary_detail_page.dart';
import 'create_disciplinary_case_page.dart';
import '../../../../core/services/permissions_service.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

/// صفحة قضايا الجزاءات - تدعم الموظف والمدير والـ HR
class DisciplinaryListPage extends StatelessWidget {
  const DisciplinaryListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => DisciplinaryCubit(
        DisciplinaryRemoteDataSourceImpl(GetIt.I<ApiClient>()),
      ),
      child: const _DisciplinaryListView(),
    );
  }
}

class _DisciplinaryListView extends StatefulWidget {
  const _DisciplinaryListView();

  @override
  State<_DisciplinaryListView> createState() => _DisciplinaryListViewState();
}

class _DisciplinaryListViewState extends State<_DisciplinaryListView> {
  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    final authState = context.read<AuthBloc>().state;
    final cubit = context.read<DisciplinaryCubit>();

    if (authState is AuthAuthenticated) {
      final role = authState.user.role;
      final permissions = getPermissionsService();
      
      if (role == 'ADMIN' || permissions.hasPermission('DISC_VIEW_ALL')) {
        cubit.loadAllCases();
      } else if (role == 'MANAGER' || permissions.hasPermission('DISC_MANAGER_CREATE')) {
        cubit.loadManagerCases();
      } else {
        cubit.loadMyCases();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthBloc>().state;
    final permissions = getPermissionsService();
    bool canCreate = false;

    if (authState is AuthAuthenticated) {
      canCreate = authState.user.role == 'ADMIN' || 
                  authState.user.role == 'MANAGER' || 
                  permissions.hasPermission('DISC_MANAGER_CREATE');
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('الجزاءات والتحقيقات'),
        centerTitle: true,
        elevation: 0,
      ),
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              onPressed: () => _navigateToCreate(context),
              label: const Text('طلب تحقيق'),
              icon: const Icon(Icons.add),
              backgroundColor: Colors.red.shade700,
            )
          : null,
      body: BlocConsumer<DisciplinaryCubit, DisciplinaryState>(
        listener: (context, state) {
          if (state is DisciplinaryError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is DisciplinaryLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is DisciplinaryCasesLoaded) {
            if (state.cases.isEmpty) {
              return _buildEmptyState();
            }
            return RefreshIndicator(
              onRefresh: () async => _loadData(),
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
                itemCount: state.cases.length,
                itemBuilder: (context, index) {
                  final caseItem = state.cases[index];
                  return DisciplinaryCaseCard(
                    caseItem: caseItem,
                    onTap: () => _navigateToDetail(context, caseItem),
                  );
                },
              ),
            );
          }

          return _buildEmptyState();
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.gavel_outlined,
            size: 80,
            color: Colors.grey.shade400,
          ),
          const SizedBox(height: 16),
          Text(
            'لا توجد قضايا',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'ستظهر هنا أي تحقيقات أو جزاءات',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey.shade500,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadData,
            child: const Text('تحديث'),
          ),
        ],
      ),
    );
  }

  void _navigateToDetail(BuildContext context, DisciplinaryCase caseItem) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => DisciplinaryDetailPage(caseId: caseItem.id),
      ),
    );
  }

  void _navigateToCreate(BuildContext context) async {
    final result = await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const CreateDisciplinaryCasePage(),
      ),
    );
    
    if (result == true) {
      _loadData(); // تحديث القائمة بعد العودة بنجاح
    }
  }
}
