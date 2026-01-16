import '../entities/task_entity.dart';

/// Abstract repository for tasks
abstract class TasksRepository {
  /// Get all tasks assigned to the current user
  Future<List<TaskEntity>> getMyTasks();

  /// Get a single task by ID
  Future<TaskEntity> getTaskById(String taskId);

  /// Update task status
  Future<TaskEntity> updateTaskStatus(String taskId, String newStatus);

  /// Add a comment to a task
  Future<void> addComment(String taskId, String content);
}
