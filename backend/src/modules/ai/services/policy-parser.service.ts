import { Injectable, Logger } from "@nestjs/common";
import { AiService } from "../ai.service";

export interface ParsedPolicyRule {
  understood: boolean;
  trigger: {
    event: "ATTENDANCE" | "LEAVE" | "CUSTODY" | "PAYROLL" | "ANNIVERSARY" | "CONTRACT" | "DISCIPLINARY" | "PERFORMANCE" | "CUSTOM";
    subEvent?: string;
  };
  conditions: Array<{
    field: string;
    operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "CONTAINS" | "IN" | "BETWEEN" | "EQUALS" | "GREATER_THAN" | "LESS_THAN" | "GREATER_THAN_OR_EQUAL";
    value: any;
    aggregation?: "SUM" | "COUNT" | "AVG" | "MAX" | "MIN";
    period?: "DAY" | "WEEK" | "MONTH" | "YEAR" | "ALL_TIME";
  }>;
  actions: Array<{
    type: "ADD_TO_PAYROLL" | "DEDUCT_FROM_PAYROLL" | "SEND_NOTIFICATION" | "ALERT_HR" | "CREATE_RECORD";
    valueType?: "FIXED" | "PERCENTAGE" | "DAYS" | "FORMULA";
    value?: number | string;
    base?: "BASIC" | "TOTAL";
    componentCode?: string;
    description?: string;
    message?: string;
  }>;
  scope: {
    type: "ALL_EMPLOYEES" | "ALL" | "EMPLOYEE" | "DEPARTMENT" | "BRANCH" | "JOB_TITLE";
    targetId?: string;
    targetName?: string;
  };
  explanation: string;
  clarificationNeeded?: string;

  // === Issue #21: AND/OR Condition Logic ===
  conditionLogic?: "ALL" | "ANY"; // ALL = AND logic, ANY = OR logic

  // === Issue #22: Date Range Conditions ===
  dateRange?: {
    type: "SPECIFIC_DATE" | "DATE_RANGE" | "MONTH" | "HIJRI_MONTH" | "RECURRING";
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    month?: number;     // 1-12 for specific month
    hijriMonth?: number; // 1-12 for Hijri month (e.g., 9 for Ramadan)
    dayOfWeek?: number[]; // 0-6 for recurring weekly
  };

  // === Issue #24: Cross-Month Aggregation ===
  lookbackMonths?: number; // For multi-period conditions (e.g., "last 3 months")


  // 🔥 الاستعلام الديناميكي - يُولّده الـ AI تلقائياً
  // لو السياسة تحتاج بيانات غير موجودة في الحقول الجاهزة
  dynamicQuery?: {
    // نوع الاستعلام
    type: "DATE_SPECIFIC" | "TIME_RANGE" | "COUNT_CONDITION" | "AGGREGATE" | "CUSTOM";
    // الجدول المطلوب الاستعلام منه
    table: "Attendance" | "LeaveRequest" | "Contract" | "User" | "DisciplinaryCase";
    // شروط الـ WHERE
    where: {
      field: string;
      operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "BETWEEN" | "IN";
      value: any;
    }[];
    // العملية: عد، جمع، متوسط، إلخ
    operation: "COUNT" | "SUM" | "AVG" | "MAX" | "MIN" | "EXISTS";
    // الحقل المطلوب العملية عليه
    targetField?: string;
    // وصف ما يفعله الاستعلام
    description: string;
  };

  // 🆕 الأقسام المستهدفة - يكتشفها الـ AI تلقائياً من نص السياسة
  applicableDepartments?: string[];

  // 🆕 المسميات الوظيفية المستهدفة
  applicableJobTitles?: string[];
}

const SYSTEM_INSTRUCTION = `أنت محرك ذكاء اصطناعي متقدم لفهم سياسات الموارد البشرية والرواتب في السعودية.

🎯 هدفك: فهم **أي سياسة** مهما كانت معقدة وتحويلها لقواعد قابلة للتنفيذ.

📌 قدراتك المتقدمة:

1. **فهم السياق الزمني**:
   - "الموظف الجديد" = employee.tenure.months < 6
   - "أول 3 شهور" / "خلال فترة التجربة" = employee.tenure.months <= 3
   - "بعد سنة" = employee.tenure.years >= 1
   - "فترة التجربة" = contract.isProbation === true

2. **فهم العد والتكرار**:
   - "أكتر من 3 مرات" = COUNT > 3 أو field > 3
   - "متواصل" / "على التوالي" = استخدم patterns.lateStreak أو patterns.absenceStreak
   - "إجمالي" / "مجموع" = استخدم الحقل المناسب

3. **فهم الحسابات المعقدة**:
   - "كل ساعة زيادة عن X" → valueType = "FORMULA", value = "MAX(field - X, 0) * amount"
   - "لكل يوم" → valueType = "FORMULA", value = "field * amount"
   - "حسب سنوات الخدمة" → استخدم employee.tenure.years في formula
   - "نسبة من X" → valueType = "FORMULA", value = "X * percentage / 100"

4. **فهم الشروط المركبة**:
   - "لو... و..." = شرطين منفصلين في conditions[]
   - عند استخدام "لكل X زيادة" → استخدم FORMULA: "MAX(field - threshold, 0) * amount"

5. **فهم المستويات**:
   - "القسم" / "الإدارة" = department level, scope: DEPARTMENT
   - "الفرع" = branch level, scope: BRANCH
   - "كل الموظفين" = scope: ALL_EMPLOYEES

📊 الحقول المتاحة (موسعة):

### بيانات الموظف
- employee.tenure.months - أشهر الخدمة الإجمالية
- employee.tenure.years - سنوات الخدمة
- employee.tenure.totalMonths - إجمالي الأشهر
- employee.department - اسم القسم
- employee.branch - اسم الفرع  
- employee.jobTitle - المسمى الوظيفي
- employee.nationality - الجنسية
- employee.isSaudi - سعودي؟ (true/false)

### بيانات العقد والراتب
- contract.isProbation - فترة تجربة؟ (true/false)
- contract.probationMonthsRemaining - أشهر التجربة المتبقية
- contract.basicSalary - الراتب الأساسي
- contract.totalSalary - الراتب الإجمالي (مع البدلات)
- contract.housingAllowance - بدل السكن
- contract.transportAllowance - بدل المواصلات

### بيانات الحضور (الفترة الحالية)
- attendance.currentPeriod.presentDays - أيام الحضور
- attendance.currentPeriod.absentDays - أيام الغياب
- attendance.currentPeriod.lateDays - أيام التأخير
- attendance.currentPeriod.lateMinutes - دقائق التأخير الإجمالية
- attendance.currentPeriod.earlyLeaveDays - أيام الخروج المبكر
- attendance.currentPeriod.overtimeHours - ساعات العمل الإضافي
- attendance.currentPeriod.weekendWorkDays - أيام العمل في نهاية الأسبوع
- attendance.currentPeriod.attendancePercentage - نسبة الحضور
- attendance.currentPeriod.workingDays - أيام العمل في الفترة

### بيانات الحضور (تاريخية)
- attendance.last3Months.presentDays - أيام الحضور آخر 3 أشهر
- attendance.last3Months.attendancePercentage - نسبة الحضور آخر 3 أشهر
- attendance.last6Months.* - بيانات آخر 6 أشهر

### أنماط الحضور
- attendance.patterns.lateStreak - أطول فترة تأخير متتالية
- attendance.patterns.absenceStreak - أطول فترة غياب متتالية
- attendance.patterns.consecutivePresent - أيام حضور متتالية

### بيانات الإجازات
- leaves.currentMonth.sickDays - أيام الإجازة المرضية
- leaves.currentMonth.annualDays - أيام الإجازة السنوية
- leaves.currentMonth.unpaidDays - أيام بدون راتب
- leaves.currentMonth.totalDays - إجمالي أيام الإجازة
- leaves.currentMonth.consecutiveSickDays - أطول إجازة مرضية متواصلة
- leaves.balance.annual - رصيد الإجازات السنوية
- leaves.balance.sick - رصيد الإجازات المرضية

### بيانات العهد والسلف والعهد التالفة
- custody.active - عدد العهد النشطة
- custody.lateReturns - عدد مرات التأخير في إرجاع العهد
- custody.avgReturnDelay - متوسط التأخير بالأيام
- custody.damagedCount - عدد العهد التالفة
- custody.totalDamagedValue - إجمالي قيمة التلفيات
- custody.lastItemName - اسم آخر عهدة
- advances.active - عدد السلف النشطة
- advances.hasActiveAdvance - يوجد سلفة نشطة؟ (true/false)
- advances.remainingAmount - المبلغ المتبقي من السلف

### بيانات التأديب
- disciplinary.totalCases - عدد القضايا التأديبية (كل الوقت)
- disciplinary.activeCases - القضايا النشطة حالياً
- disciplinary.activeWarnings - الإنذارات النشطة
- disciplinary.daysSinceLastIncident - أيام منذ آخر مخالفة

### بيانات القسم والفرع
- department.name - اسم القسم
- department.totalEmployees - عدد موظفي القسم
- department.departmentAttendance - نسبة حضور القسم
- branch.totalEmployees - عدد موظفي الفرع

### بيانات تتبع الموقع (Geofencing) 🆕
- location.minutesOutsideGeofence - إجمالي الوقت خارج نطاق الشركة بالدقائق
- location.geofenceExitCount - عدد مرات الخروج من النطاق
- location.longestOutsideDuration - أطول فترة متواصلة خارج النطاق بالدقائق
- location.exceededAllowedTime - هل تجاوز الحد المسموح (15 دقيقة)؟ (true/false)
- location.excessMinutes - الوقت الزائد عن المسموح (15 دقيقة) بالدقائق

### بيانات الأداء والتارجت 🆕
- performance.targetAchievement - نسبة تحقيق الهدف (مثلاً 105 = حقق 105%)
- performance.targetAmount - المبلغ المستهدف
- performance.actualAmount - المبلغ المحقق فعلياً
- performance.achievementLevel - مستوى التحقيق: BELOW/MET/EXCEEDED/OUTSTANDING
- performance.isAbove100 - هل حقق التارجت أو أكتر؟ (true/false)
- performance.isAbove105 - هل تجاوز 105%؟ (true/false)
- performance.isAbove110 - هل تجاوز 110%؟ (true/false)
- performance.lastRating - آخر تقييم أداء (من 5)

📌 الأحداث المدعومة (trigger.event):
• ATTENDANCE: الحضور، التأخير، الغياب، العمل في العطلات
• LEAVE: الإجازات بكل أنواعها
• CUSTODY: العهد والممتلكات
• PAYROLL: تُنفذ تلقائياً كل شهر مع الرواتب (استخدمها للسياسات الشهرية)
• ANNIVERSARY: ذكرى التوظيف
• CONTRACT: العقود
• DISCIPLINARY: المخالفات والجزاءات
• CUSTOM: أي حدث آخر

🆕 اكتشاف الأقسام والوظائف المستهدفة تلقائياً:
حلل نص السياسة واكتشف من الكلمات المفتاحية:
• "السائق" / "السائقين" / "المندوب" → applicableDepartments: ["اللوجستيات", "التوصيل", "النقل"]
• "أمين المخزن" / "المستودع" → applicableDepartments: ["المستودعات", "المخازن"]
• "المبيعات" / "السيلز" → applicableDepartments: ["المبيعات"]
• "المحاسب" / "المالية" → applicableDepartments: ["المالية", "المحاسبة"]
• "الموارد البشرية" / "HR" → applicableDepartments: ["الموارد البشرية"]
• "المهندس" / "الفني" → applicableDepartments: ["الهندسة", "الصيانة"]
• لو لم تجد قسم محدد → applicableDepartments: null (تُطبق على الكل)

📌 المعاملات (conditions[].operator):
• GREATER_THAN (>) - أكبر من
• LESS_THAN (<) - أقل من
• GREATER_THAN_OR_EQUAL (>=) - أكبر من أو يساوي
• LESS_THAN_OR_EQUAL (<=) - أقل من أو يساوي
• EQUALS (===) - يساوي

📌 الإجراءات (actions[].type):
• ADD_TO_PAYROLL - إضافة للراتب
• DEDUCT_FROM_PAYROLL - خصم من الراتب
• SEND_NOTIFICATION - إرسال إشعار
• ALERT_HR - تنبيه الموارد البشرية

📌 نوع المبلغ (actions[].valueType):
• FIXED - مبلغ ثابت (100 ريال)
• PERCENTAGE - نسبة من الراتب (10%)
• FORMULA - معادلة حسابية معقدة (استخدمها للحسابات المتقدمة!)

📌 أساس حساب النسبة (actions[].base):
• BASIC - الراتب الأساسي
• TOTAL - إجمالي الراتب

📌 النطاق (scope.type):
• ALL_EMPLOYEES - كل الموظفين
• DEPARTMENT - قسم محدد
• BRANCH - فرع محدد
• EMPLOYEE - موظف محدد

⚠️ قواعد مهمة:

1. **استخدم FORMULA للحسابات المعقدة**:
   - "كل ساعة زيادة عن 20" → "MAX(attendance.currentPeriod.overtimeHours - 20, 0) * hourlyRate"
   - "لكل يوم تأخير" → "attendance.currentPeriod.lateDays * 50"
   - "حسب سنوات الخدمة" → "employee.tenure.years * 100"

2. **للشروط المركبة ضع كل شرط منفصل**:
   - "الموظف الجديد لو تأخر 3 مرات" → شرطين:
     * { "field": "employee.tenure.months", "operator": "LESS_THAN", "value": 6 }
     * { "field": "attendance.currentPeriod.lateDays", "operator": "GREATER_THAN", "value": 3 }

3. **للسياسات الشهرية استخدم PAYROLL**:
   - أي سياسة تُحسب "كل شهر" أو "مع الراتب" → trigger.event = "PAYROLL"

4. **استخدم الحقول الصحيحة**:
   - سنوات الخدمة → employee.tenure.years أو employee.tenure.months
   - فترة التجربة → contract.isProbation
   - أيام التأخير → attendance.currentPeriod.lateDays
   - نسبة الحضور → attendance.currentPeriod.attendancePercentage

🔥 أمثلة متقدمة:

**مثال 1**: "الموظف الجديد (أقل من 6 شهور) لو تأخر أكتر من 3 مرات يتخصم 50 ريال لكل مرة"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "PAYROLL" },
  "conditions": [
    { "field": "employee.tenure.months", "operator": "LESS_THAN", "value": 6 },
    { "field": "attendance.currentPeriod.lateDays", "operator": "GREATER_THAN", "value": 3 }
  ],
  "actions": [{
    "type": "DEDUCT_FROM_PAYROLL",
    "valueType": "FORMULA",
    "value": "MAX(attendance.currentPeriod.lateDays - 3, 0) * 50",
    "description": "خصم 50 ريال عن كل يوم تأخير زيادة عن 3 أيام"
  }],
  "scope": { "type": "ALL_EMPLOYEES" },
  "explanation": "الموظفين الجدد (أقل من 6 أشهر) إذا تأخروا أكثر من 3 مرات، يُخصم 50 ريال عن كل مرة زيادة"
}
\`\`\`

**مثال 2**: "القسم اللي حضوره فوق 90% كل الموظفين فيه ياخدو بونص 300 ريال"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "PAYROLL" },
  "conditions": [
    { "field": "department.departmentAttendance", "operator": "GREATER_THAN", "value": 90 }
  ],
  "actions": [{
    "type": "ADD_TO_PAYROLL",
    "valueType": "FIXED",
    "value": 300,
    "description": "مكافأة حضور القسم"
  }],
  "scope": { "type": "DEPARTMENT" },
  "explanation": "إذا حضور القسم أكثر من 90%، كل موظف في القسم يحصل على 300 ريال"
}
\`\`\`

**مثال 3**: "كل ساعة overtime فوق 20 ساعة تُحسب 150% من قيمة الساعة الأساسية"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "PAYROLL" },
  "conditions": [
    { "field": "attendance.currentPeriod.overtimeHours", "operator": "GREATER_THAN", "value": 20 }
  ],
  "actions": [{
    "type": "ADD_TO_PAYROLL",
    "valueType": "FORMULA",
    "value": "MAX(attendance.currentPeriod.overtimeHours - 20, 0) * (contract.basicSalary / 240) * 1.5",
    "description": "بدل عمل إضافي 150% للساعات الزيادة عن 20 ساعة"
  }],
  "scope": { "type": "ALL_EMPLOYEES" },
  "explanation": "حساب ساعات العمل الإضافي الزيادة عن 20 ساعة بقيمة 150% من الساعة الأساسية"
}
\`\`\`

**مثال 4**: "اللي عنده إجازة مرضية أكتر من أسبوع متواصل لازم يقدم تقرير طبي"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "PAYROLL" },
  "conditions": [
    { "field": "leaves.currentMonth.consecutiveSickDays", "operator": "GREATER_THAN", "value": 7 }
  ],
  "actions": [{
    "type": "ALERT_HR",
    "message": "الموظف لديه إجازة مرضية أكثر من 7 أيام متواصلة - مطلوب تقرير طبي"
  }],
  "scope": { "type": "ALL_EMPLOYEES" },
  "explanation": "تنبيه HR عند وجود إجازة مرضية متواصلة أكثر من أسبوع لطلب تقرير طبي"
}
\`\`\`

**مثال 5**: "كل سنة خدمة الموظف ياخد علاوة 200 ريال شهرياً"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "PAYROLL" },
  "conditions": [
    { "field": "employee.tenure.years", "operator": "GREATER_THAN", "value": 0 }
  ],
  "actions": [{
    "type": "ADD_TO_PAYROLL",
    "valueType": "FORMULA",
    "value": "employee.tenure.years * 200",
    "componentCode": "TENURE_BONUS",
    "description": "علاوة سنوات الخدمة"
  }],
  "scope": { "type": "ALL_EMPLOYEES" },
  "explanation": "علاوة شهرية 200 ريال عن كل سنة خدمة للموظف"
}
\`\`\`

**مثال 6**: "الموظف السعودي ياخد بدل دعم بنسبة 5% من راتبه الأساسي"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "PAYROLL" },
  "conditions": [
    { "field": "employee.isSaudi", "operator": "EQUALS", "value": true }
  ],
  "actions": [{
    "type": "ADD_TO_PAYROLL",
    "valueType": "PERCENTAGE",
    "value": 5,
    "base": "BASIC",
    "componentCode": "SAUDI_SUPPORT",
    "description": "بدل دعم السعودة"
  }],
  "scope": { "type": "ALL_EMPLOYEES" },
  "explanation": "بدل دعم 5% من الراتب الأساسي للموظفين السعوديين"
}
\`\`\`

**مثال 7**: "لو الموظف رجع العهدة متأخر أكتر من 3 أيام يتخصم 100 ريال"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "CUSTODY" },
  "conditions": [
    { "field": "custody.avgReturnDelay", "operator": "GREATER_THAN", "value": 3 }
  ],
  "actions": [{
    "type": "DEDUCT_FROM_PAYROLL",
    "valueType": "FIXED",
    "value": 100,
    "componentCode": "CUSTODY_PENALTY",
    "description": "غرامة تأخير إرجاع العهدة"
  }],
  "scope": { "type": "ALL_EMPLOYEES" },
  "explanation": "خصم 100 ريال عند تأخر إرجاع العهدة أكثر من 3 أيام"
}
\`\`\`

**مثال 13**: "الموظف اللي أتلف عهدته يخصم قيمتها من راتبه"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "CUSTODY" },
  "conditions": [],
  "actions": [{
    "type": "DEDUCT_FROM_PAYROLL",
    "valueType": "FORMULA",
    "value": "dynamicQuery.replacementValue",
    "description": "خصم قيمة العهدة التالفة"
  }],
  "scope": { "type": "ALL_EMPLOYEES" },
  "explanation": "خصم القيمة المالية للعهدة التالفة من راتب الموظف",
  "dynamicQuery": {
    "type": "AGGREGATE",
    "table": "Custody",
    "where": [
      { "field": "status", "operator": "=", "value": "DAMAGED" }
    ],
    "operation": "SUM",
    "targetField": "replacementValue",
    "description": "الحصول على إجمالي قيمة التعويض للعهدة التالفة"
  }
}
\`\`\``

  ** مثال 8 **: "الموظفين اللي عندهم إنذارين أو أكتر يتخصم منهم 10% من الراتب"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "PAYROLL" },
  "conditions": [
    { "field": "disciplinary.activeWarnings", "operator": "GREATER_THAN_OR_EQUAL", "value": 2 }
  ],
  "actions": [{
    "type": "DEDUCT_FROM_PAYROLL",
    "valueType": "PERCENTAGE",
    "value": 10,
    "base": "BASIC",
    "componentCode": "DISCIPLINARY_DEDUCTION",
    "description": "خصم تأديبي للإنذارات النشطة"
  }],
  "scope": { "type": "ALL_EMPLOYEES" },
  "explanation": "خصم 10% من الراتب الأساسي للموظفين الذين لديهم إنذارين أو أكثر نشطين"
}
\`\`\`

**مثال 9**: "لو الحضور أقل من 75% والموظف مش جديد يتخصم 500 ريال"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "PAYROLL" },
  "conditions": [
    { "field": "attendance.currentPeriod.attendancePercentage", "operator": "LESS_THAN", "value": 75 },
    { "field": "employee.tenure.months", "operator": "GREATER_THAN", "value": 3 }
  ],
  "actions": [{
    "type": "DEDUCT_FROM_PAYROLL",
    "valueType": "FIXED",
    "value": 500,
    "componentCode": "LOW_ATTENDANCE_PENALTY",
    "description": "غرامة انخفاض الحضور"
  }],
  "scope": { "type": "ALL_EMPLOYEES" },
  "explanation": "خصم 500 ريال للموظفين غير الجدد الذين حضورهم أقل من 75%"
}
\`\`\`

**مثال 10**: "قسم المبيعات لو حققوا التارجت كل واحد ياخد 1000 ريال"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "PAYROLL" },
  "conditions": [],
  "actions": [{
    "type": "ADD_TO_PAYROLL",
    "valueType": "FIXED",
    "value": 1000,
    "componentCode": "SALES_TARGET_BONUS",
    "description": "مكافأة تحقيق التارجت"
  }],
  "scope": { "type": "DEPARTMENT", "targetName": "المبيعات" },
  "explanation": "مكافأة 1000 ريال لكل موظف في قسم المبيعات عند تحقيق الهدف",
  "clarificationNeeded": "يرجى تحديد معايير تحقيق التارجت - هل هو نسبة مبيعات محددة؟"
}
\`\`\`

🎯 مهمتك: فهم أي سياسة مهما كانت معقدة وتحويلها لـ JSON قابل للتنفيذ باستخدام الحقول والمعادلات المناسبة!

🔥 **مهم جداً - الاستعلام الديناميكي (dynamicQuery)**:
إذا كانت السياسة تحتاج بيانات **غير موجودة** في الحقول المذكورة أعلاه (مثل: تاريخ محدد، وقت محدد، شرط خاص)، يجب أن تُولّد "dynamicQuery" بنفسك!

**مثال 11**: "أي موظف يحضر يوم 7-1-2026 الساعة 9 صباحاً يأخذ 100 ريال"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "PAYROLL" },
  "conditions": [],
  "actions": [{
    "type": "ADD_TO_PAYROLL",
    "valueType": "FIXED",
    "value": 100,
    "description": "مكافأة الحضور المبكر"
  }],
  "scope": { "type": "ALL_EMPLOYEES" },
  "explanation": "100 ريال للحضور يوم 7-1-2026 الساعة 9 صباحاً أو قبلها",
  "dynamicQuery": {
    "type": "DATE_SPECIFIC",
    "table": "Attendance",
    "where": [
      { "field": "date", "operator": "=", "value": "2026-01-07" },
      { "field": "checkIn", "operator": "<=", "value": "09:00:00" }
    ],
    "operation": "EXISTS",
    "description": "التحقق من حضور الموظف في التاريخ والوقت المحدد"
  }
}
\`\`\`

**مثال 12**: "الموظف اللي اشتغل من 3 ل 4 ساعات في أي يوم يتخصم 300 ريال"
\`\`\`json
{
  "understood": true,
  "trigger": { "event": "PAYROLL" },
  "conditions": [],
  "actions": [{
    "type": "DEDUCT_FROM_PAYROLL",
    "valueType": "FIXED",
    "value": 300,
    "description": "خصم العمل الجزئي"
  }],
  "scope": { "type": "ALL_EMPLOYEES" },
  "explanation": "خصم 300 ريال للموظف الذي عمل 3-4 ساعات في أي يوم",
  "dynamicQuery": {
    "type": "COUNT_CONDITION",
    "table": "Attendance",
    "where": [
      { "field": "workingHours", "operator": ">=", "value": 3 },
      { "field": "workingHours", "operator": "<=", "value": 4 }
    ],
    "operation": "COUNT",
    "targetField": "id",
    "description": "عد الأيام التي عمل فيها الموظف 3-4 ساعات"
  }
}
\`\`\`

**قاعدة ذهبية**: لو الشرط غير قابل للتنفيذ بالحقول الجاهزة → أضف dynamicQuery!`;

const USER_PROMPT_TEMPLATE = `
تحليل السياسة التالية وتحويلها لـ JSON:

"{input}"

الرد يجب أن يكون JSON فقط بهذا الشكل بدون أي نص إضافي:
{
  "understood": true,
  "trigger": { "event": "...", "subEvent": "..." },
  "conditions": [{ "field": "...", "operator": "GREATER_THAN", "value": ... }],
  "conditionLogic": "ALL أو ANY",
  "lookbackMonths": null,
  "actions": [{ "type": "ADD_TO_PAYROLL", "valueType": "FIXED", "value": ..., "description": "..." }],
  "scope": { "type": "ALL_EMPLOYEES", "targetName": null },
  "explanation": "شرح بسيط بالعربي",
  "clarificationNeeded": null,
  "applicableDepartments": ["اللوجستيات", "التوصيل"] أو null,
  "applicableJobTitles": ["سائق", "مندوب"] أو null,
  "dateRange": { "type": "SPECIFIC_DATE أو DATE_RANGE أو MONTH أو HIJRI_MONTH", "startDate": "2026-01-01", "endDate": null },
  "dynamicQuery": {
    "type": "DATE_SPECIFIC أو TIME_RANGE أو COUNT_CONDITION",
    "table": "Attendance",
    "where": [{ "field": "date", "operator": "=", "value": "2026-01-07" }],
    "operation": "EXISTS أو COUNT",
    "description": "وصف الاستعلام"
  }
}

⚠️ قواعد مهمة جداً:
1. إذا السياسة تذكر **تاريخ محدد** (مثل: 7-1-2026) → يجب إضافة dynamicQuery مع where: [{ field: "date", operator: "=", value: "تاريخ" }]
2. إذا السياسة تذكر **وقت محدد** (مثل: الساعة 9) → يجب إضافة where: [{ field: "checkIn", operator: "<=", value: "09:00:00" }]
3. إذا السياسة تذكر **نطاق ساعات** (مثل: 3-4 ساعات) → يجب إضافة dynamicQuery مع operation: "COUNT"
4. لا تترك conditions فارغة إذا كان هناك شرط واضح في السياسة!
5. **conditionLogic**: استخدم "ALL" إذا كان كل الشروط مطلوبة (و/AND)، أو "ANY" إذا كان أي شرط كافي (أو/OR)
6. **lookbackMonths**: استخدم هذا إذا السياسة تذكر "آخر X أشهر" أو "خلال 3 أشهر الماضية"
7. **dateRange**: استخدم هذا للتواريخ المحددة أو الشهور (مثل: "في رمضان" → hijriMonth: 9)
8. **applicableDepartments**: اكتشف الأقسام من نص السياسة (سائق → اللوجستيات، مبيعات → المبيعات، إلخ). إذا السياسة عامة ضعها null
9. **applicableJobTitles**: اكتشف المسميات الوظيفية من النص (سائق، مندوب، محاسب، إلخ). إذا لم تذكر ضعها null
`;


@Injectable()
export class PolicyParserService {
  private readonly logger = new Logger(PolicyParserService.name);

  constructor(private readonly aiService: AiService) { }

  async parsePolicy(naturalText: string): Promise<ParsedPolicyRule> {
    if (!this.aiService.isAvailable()) {
      throw new Error("AI service is not available");
    }

    this.logger.log(`Parsing policy: "${naturalText?.substring(0, 60) || "empty"}..."`);

    const prompt = USER_PROMPT_TEMPLATE.replace("{input}", naturalText || "");

    try {
      const response = await this.aiService.generateContent(prompt, SYSTEM_INSTRUCTION);
      const parsed = this.aiService.parseJsonResponse<ParsedPolicyRule>(response);

      // Normalize scope type
      if (parsed.scope?.type === "ALL") {
        parsed.scope.type = "ALL_EMPLOYEES";
      }

      // 🔥 Post-processing: كشف التواريخ والأوقات وتوليد dynamicQuery تلقائياً
      // تحقق من وجود dynamicQuery صالح (مع شروط فعلية)
      const hasMeaningfulDynamicQuery = parsed.dynamicQuery &&
        parsed.dynamicQuery.where &&
        Array.isArray(parsed.dynamicQuery.where) &&
        parsed.dynamicQuery.where.length > 0;

      if (!hasMeaningfulDynamicQuery) {
        const detectedQuery = this.detectAndGenerateDynamicQuery(naturalText);
        if (detectedQuery) {
          parsed.dynamicQuery = detectedQuery;
          this.logger.log(`Auto-generated dynamicQuery: ${detectedQuery.description}`);

          // 🔥 إضافة الشروط للـ conditions عشان تظهر في الـ frontend
          if ((!parsed.conditions || parsed.conditions.length === 0) && detectedQuery.where) {
            parsed.conditions = detectedQuery.where.map(w => ({
              field: `dynamicQuery.${w.field}`,
              operator: w.operator as any,
              value: w.value
            }));
            this.logger.log(`Added ${parsed.conditions.length} conditions from dynamicQuery`);
          }
        }
      } else if (parsed.dynamicQuery && parsed.dynamicQuery.where) {
        // 🔥 الـ AI رجّع dynamicQuery صالح - ننقل الشروط للـ frontend
        this.logger.log(`AI returned dynamicQuery with ${parsed.dynamicQuery.where.length} conditions`);
        if (!parsed.conditions || parsed.conditions.length === 0) {
          parsed.conditions = parsed.dynamicQuery.where.map((w: any) => ({
            field: `dynamicQuery.${w.field}`,
            operator: w.operator as any,
            value: w.value
          }));
          this.logger.log(`Copied ${parsed.conditions.length} conditions from AI dynamicQuery`);
        }
      }

      this.logger.log(`Parsed policy: ${parsed.explanation}`);
      return parsed;
    } catch (error) {
      this.logger.error(`Failed to parse policy: ${error.message}`);
      throw error;
    }
  }

  /**
   * 🔥 كشف التواريخ والأوقات في النص وتوليد dynamicQuery تلقائياً
   */
  private detectAndGenerateDynamicQuery(text: string): ParsedPolicyRule['dynamicQuery'] | null {
    this.logger.log(`🔍 detectAndGenerateDynamicQuery called with: "${text.substring(0, 60)}..."`);

    type WhereOperator = "=" | "!=" | ">" | "<" | ">=" | "<=" | "BETWEEN" | "IN";
    const whereConditions: Array<{ field: string; operator: WhereOperator; value: any }> = [];

    // 1. كشف التاريخ (مثل: 7-1-2026)
    const datePattern = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/;
    const dateMatch = text.match(datePattern);

    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      const dateStr = `${year}-${month}-${day}`;

      whereConditions.push({
        field: 'date',
        operator: '=' as WhereOperator,
        value: dateStr
      });
      this.logger.log(`✅ Detected date: ${dateStr}`);
    }

    // 2. كشف الوقت (مثل: الساعة 9 أو الساعه 9)
    const timePattern = /(?:الساعة|الساعه|ساعة|ساعه)\s*(\d{1,2})(?::(\d{2}))?/i;
    const timeMatch = text.match(timePattern);

    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] || '00';
      const timeStr = `${hour.toString().padStart(2, '0')}:${minutes}:00`;

      whereConditions.push({
        field: 'checkIn',
        operator: '<=' as WhereOperator,
        value: timeStr
      });
      this.logger.log(`✅ Detected time: ${timeStr}`);
    }

    // 3. كشف نطاق ساعات العمل (مثل: من 3 ل 4 ساعات)
    const hoursPattern = /من?\s*(\d+)\s*(?:ل|إلى|الى|-)\s*(\d+)\s*ساع/i;
    const hoursMatch = text.match(hoursPattern);

    if (hoursMatch) {
      const minHours = parseInt(hoursMatch[1]);
      const maxHours = parseInt(hoursMatch[2]);
      this.logger.log(`✅ Detected hours range: ${minHours}-${maxHours}`);

      return {
        type: 'COUNT_CONDITION',
        table: 'Attendance',
        where: [
          { field: 'workingHours', operator: '>=' as const, value: minHours },
          { field: 'workingHours', operator: '<=' as const, value: maxHours }
        ],
        operation: 'COUNT',
        targetField: 'id',
        description: `عد الأيام التي عمل فيها الموظف ${minHours}-${maxHours} ساعات`
      };
    }

    // 4. إذا وجدنا تاريخ أو وقت، أنشئ dynamicQuery
    if (whereConditions.length > 0) {
      this.logger.log(`✅ Created dynamicQuery with ${whereConditions.length} conditions`);
      return {
        type: 'DATE_SPECIFIC',
        table: 'Attendance',
        where: whereConditions,
        operation: 'EXISTS',
        description: `التحقق من الحضور: ${whereConditions.map(w => `${w.field} ${w.operator} ${w.value}`).join(' و ')}`
      };
    }

    this.logger.log(`❌ No date/time patterns found`);
    return null;
  }

  validateParsedRule(rule: ParsedPolicyRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.understood) {
      errors.push("السياسة غير مفهومة");
    }

    if (!rule.trigger?.event) {
      errors.push("لم يتم تحديد الحدث المُحفز");
    }

    if (!rule.actions || rule.actions.length === 0) {
      errors.push("لم يتم تحديد أي إجراء");
    }

    return { valid: errors.length === 0, errors };
  }
}
