import '../../domain/entities/task_entity.dart';
import '../../domain/repositories/tasks_repository.dart';
import '../datasources/tasks_remote_datasource.dart';

/// Implementation of TasksRepository
class TasksRepositoryImpl implements TasksRepository {
  final TasksRemoteDataSource _remoteDataSource;

  TasksRepositoryImpl(this._remoteDataSource);

  @override
  Future<List<TaskEntity>> getMyTasks() async {
    return await _remoteDataSource.getMyTasks();
  }

  @override
  Future<TaskEntity> getTaskById(String taskId) async {
    return await _remoteDataSource.getTaskById(taskId);
  }

  @override
  Future<TaskEntity> updateTaskStatus(String taskId, String newStatus) async {
    return await _remoteDataSource.updateTaskStatus(taskId, newStatus);
  }

  @override
  Future<void> addComment(String taskId, String content) async {
    return await _remoteDataSource.addComment(taskId, content);
  }
}
