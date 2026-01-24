/// Payslip data model
class PayslipModel {
  final String id;
  final int month;
  final int year;
  final String periodLabel;
  final double baseSalary;
  final double grossSalary;
  final double totalDeductions;
  final double netSalary;
  final String status;
  final List<PayslipLineModel> earnings;
  final List<PayslipLineModel> deductions;
  final List<CalculationTraceModel>? calculationTrace;

  PayslipModel({
    required this.id,
    required this.month,
    required this.year,
    required this.periodLabel,
    required this.baseSalary,
    required this.grossSalary,
    required this.totalDeductions,
    required this.netSalary,
    required this.status,
    required this.earnings,
    required this.deductions,
    this.calculationTrace,
  });

  factory PayslipModel.fromJson(Map<String, dynamic> json) {
    return PayslipModel(
      id: json['id'] ?? '',
      month: json['month'] ?? 1,
      year: json['year'] ?? 2026,
      periodLabel: json['periodLabel'] ?? '${json['month'] ?? 1}/${json['year'] ?? 2026}',
      baseSalary: (json['baseSalary'] ?? 0).toDouble(),
      grossSalary: (json['grossSalary'] ?? 0).toDouble(),
      totalDeductions: (json['totalDeductions'] ?? 0).toDouble(),
      netSalary: (json['netSalary'] ?? 0).toDouble(),
      status: json['status'] ?? 'DRAFT',
      earnings: (json['earnings'] as List<dynamic>?)
              ?.map((e) => PayslipLineModel.fromJson(e))
              .toList() ??
          [],
      deductions: (json['deductions'] as List<dynamic>?)
              ?.map((e) => PayslipLineModel.fromJson(e))
              .toList() ??
          [],
      calculationTrace: (json['calculationTrace'] as List<dynamic>?)
          ?.map((e) => CalculationTraceModel.fromJson(e))
          .toList(),
    );
  }
}

/// Payslip line (earning or deduction)
class PayslipLineModel {
  final String name;
  final double amount;
  final String? description;
  final String? sourceType;

  PayslipLineModel({
    required this.name,
    required this.amount,
    this.description,
    this.sourceType,
  });

  factory PayslipLineModel.fromJson(Map<String, dynamic> json) {
    return PayslipLineModel(
      name: json['name'] ?? json['descriptionAr'] ?? 'غير محدد',
      amount: (json['amount'] ?? 0).toDouble(),
      description: json['description'] ?? json['descriptionAr'],
      sourceType: json['sourceType'],
    );
  }
}

/// Calculation trace step
class CalculationTraceModel {
  final String step;
  final String description;
  final String formula;
  final double result;

  CalculationTraceModel({
    required this.step,
    required this.description,
    required this.formula,
    required this.result,
  });

  factory CalculationTraceModel.fromJson(Map<String, dynamic> json) {
    return CalculationTraceModel(
      step: json['step'] ?? '',
      description: json['description'] ?? '',
      formula: json['formula'] ?? '',
      result: (json['result'] ?? 0).toDouble(),
    );
  }
}
