import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import '../../domain/entities/task_entity.dart';
import '../bloc/tasks_bloc.dart';

/// Task Details page - shows full task info with status update and comments
class TaskDetailsPage extends StatefulWidget {
  final String taskId;

  const TaskDetailsPage({super.key, required this.taskId});

  @override
  State<TaskDetailsPage> createState() => _TaskDetailsPageState();
}

class _TaskDetailsPageState extends State<TaskDetailsPage> {
  final TextEditingController _commentController = TextEditingController();

  @override
  void initState() {
    super.initState();
    context.read<TasksBloc>().add(LoadTaskDetails(widget.taskId));
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('تفاصيل المهمة'),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      body: BlocConsumer<TasksBloc, TasksState>(
        listener: (context, state) {
          if (state is TaskUpdated) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Colors.green,
              ),
            );
            // Reload task details
            context.read<TasksBloc>().add(LoadTaskDetails(widget.taskId));
          }
          if (state is TasksError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: Colors.red,
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is TaskDetailLoading || state is TaskUpdating) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is TaskDetailLoaded) {
            return _buildTaskDetails(state.task);
          }

          if (state is TasksError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                  const SizedBox(height: 16),
                  Text(state.message),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => context.read<TasksBloc>().add(LoadTaskDetails(widget.taskId)),
                    child: const Text('إعادة المحاولة'),
                  ),
                ],
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildTaskDetails(TaskEntity task) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title and priority
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(task.priorityIcon, style: const TextStyle(fontSize: 24)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          task.title,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (task.description != null && task.description!.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      task.description!,
                      style: TextStyle(color: Colors.grey[600], fontSize: 15),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Status section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.flag, size: 20),
                      SizedBox(width: 8),
                      Text('الحالة', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _StatusButton(
                        status: 'TODO',
                        label: 'للعمل',
                        isSelected: task.status == 'TODO',
                        onTap: () => _updateStatus('TODO'),
                      ),
                      _StatusButton(
                        status: 'IN_PROGRESS',
                        label: 'جاري العمل',
                        isSelected: task.status == 'IN_PROGRESS',
                        onTap: () => _updateStatus('IN_PROGRESS'),
                      ),
                      _StatusButton(
                        status: 'IN_REVIEW',
                        label: 'قيد المراجعة',
                        isSelected: task.status == 'IN_REVIEW',
                        onTap: () => _updateStatus('IN_REVIEW'),
                      ),
                      _StatusButton(
                        status: 'COMPLETED',
                        label: 'مكتمل',
                        isSelected: task.status == 'COMPLETED',
                        onTap: () => _updateStatus('COMPLETED'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Info section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _InfoRow(
                    icon: Icons.calendar_today,
                    label: 'تاريخ الاستحقاق',
                    value: task.dueDate != null
                        ? '${task.dueDate!.day}/${task.dueDate!.month}/${task.dueDate!.year}'
                        : 'غير محدد',
                  ),
                  const Divider(),
                  _InfoRow(
                    icon: Icons.person,
                    label: 'المُكلَّف',
                    value: task.assigneeName ?? 'غير محدد',
                  ),
                  const Divider(),
                  _InfoRow(
                    icon: Icons.person_outline,
                    label: 'المنشئ',
                    value: task.createdByName ?? 'غير محدد',
                  ),
                  if (task.categoryName != null) ...[
                    const Divider(),
                    _InfoRow(
                      icon: Icons.folder,
                      label: 'التصنيف',
                      value: task.categoryName!,
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Comments section
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.comment, size: 20),
                      SizedBox(width: 8),
                      Text('إضافة تعليق', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _commentController,
                    decoration: InputDecoration(
                      hintText: 'اكتب تعليقك هنا...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.send),
                        onPressed: _addComment,
                      ),
                    ),
                    maxLines: 3,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _updateStatus(String newStatus) {
    context.read<TasksBloc>().add(UpdateTaskStatus(widget.taskId, newStatus));
  }

  void _addComment() {
    final content = _commentController.text.trim();
    if (content.isEmpty) return;

    context.read<TasksBloc>().add(AddTaskComment(widget.taskId, content));
    _commentController.clear();
  }
}

class _StatusButton extends StatelessWidget {
  final String status;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _StatusButton({
    required this.status,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case 'TODO':
        color = Colors.blue;
        break;
      case 'IN_PROGRESS':
        color = Colors.orange;
        break;
      case 'IN_REVIEW':
        color = Colors.purple;
        break;
      case 'COMPLETED':
        color = Colors.green;
        break;
      default:
        color = Colors.grey;
    }

    return GestureDetector(
      onTap: isSelected ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? color : color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color, width: isSelected ? 0 : 1),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : color,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Text(label, style: TextStyle(color: Colors.grey[600])),
          const Spacer(),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}
