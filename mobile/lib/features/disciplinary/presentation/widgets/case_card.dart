import 'package:flutter/material.dart';
import '../../data/models/disciplinary_case_model.dart';

/// بطاقة عرض قضية جزاء
class DisciplinaryCaseCard extends StatelessWidget {
  final DisciplinaryCase caseItem;
  final VoidCallback onTap;

  const DisciplinaryCaseCard({
    super.key,
    required this.caseItem,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Status + Date
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildStatusBadge(),
                  Text(
                    _formatDate(caseItem.createdAt),
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Description
              Text(
                caseItem.description,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              
              // Violation Type
              if (caseItem.violationType != null) ...[
                Row(
                  children: [
                    Icon(Icons.warning_amber, size: 16, color: Colors.orange.shade700),
                    const SizedBox(width: 4),
                    Text(
                      _getViolationTypeArabic(caseItem.violationType!),
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.orange.shade700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
              
              // Footer: Penalty if exists
              if (caseItem.penaltyAmount != null && caseItem.penaltyAmount! > 0) ...[
                const Divider(),
                Row(
                  children: [
                    Icon(Icons.monetization_on, size: 16, color: Colors.red.shade600),
                    const SizedBox(width: 4),
                    Text(
                      'جزاء مالي: ${caseItem.penaltyAmount?.toStringAsFixed(0)} ريال',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.red.shade600,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
              
              // Action indicator
              if (_needsAction()) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade50,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.blue.shade200),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.pending_actions, size: 16, color: Colors.blue.shade700),
                      const SizedBox(width: 4),
                      Text(
                        'يتطلب ردك',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.blue.shade700,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: Color(caseItem.statusColor).withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        caseItem.statusArabic,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Color(caseItem.statusColor),
        ),
      ),
    );
  }

  bool _needsAction() {
    return caseItem.status == 'INFORMAL_SENT' || caseItem.status == 'DECISION_ISSUED';
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  String _getViolationTypeArabic(String type) {
    switch (type) {
      case 'TARDINESS':
        return 'تأخر';
      case 'ABSENCE':
        return 'غياب';
      case 'MISCONDUCT':
        return 'سوء سلوك';
      case 'NEGLIGENCE':
        return 'إهمال';
      case 'POLICY_VIOLATION':
        return 'مخالفة سياسة';
      case 'PERFORMANCE':
        return 'أداء ضعيف';
      default:
        return type;
    }
  }
}
