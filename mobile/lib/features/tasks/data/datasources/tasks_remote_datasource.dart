import '../../../../core/network/api_client.dart';
import '../../domain/entities/task_entity.dart';

/// Remote data source for tasks API calls
class TasksRemoteDataSource {
  final ApiClient _apiClient;

  TasksRemoteDataSource(this._apiClient);

  /// Get all tasks assigned to current user
  Future<List<TaskEntity>> getMyTasks() async {
    try {
      final response = await _apiClient.dio.get('/tasks/my-tasks');
      
      if (response.statusCode == 200) {
        final List<dynamic> data = response.data is List 
            ? response.data 
            : response.data['data'] ?? [];
        return data.map((json) => TaskEntity.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load tasks: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching tasks: $e');
    }
  }

  /// Get single task by ID
  Future<TaskEntity> getTaskById(String taskId) async {
    try {
      final response = await _apiClient.dio.get('/tasks/$taskId');
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = response.data is Map<String, dynamic>
            ? response.data
            : response.data['data'];
        return TaskEntity.fromJson(data);
      } else {
        throw Exception('Failed to load task: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching task: $e');
    }
  }

  /// Update task status
  Future<TaskEntity> updateTaskStatus(String taskId, String newStatus) async {
    try {
      final response = await _apiClient.dio.patch(
        '/tasks/$taskId',
        data: {'status': newStatus},
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = response.data is Map<String, dynamic>
            ? response.data
            : response.data['data'];
        return TaskEntity.fromJson(data);
      } else {
        throw Exception('Failed to update task: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error updating task: $e');
    }
  }

  /// Add comment to task
  Future<void> addComment(String taskId, String content) async {
    try {
      final response = await _apiClient.dio.post(
        '/tasks/$taskId/comments',
        data: {'content': content},
      );
      
      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception('Failed to add comment: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error adding comment: $e');
    }
  }
}
