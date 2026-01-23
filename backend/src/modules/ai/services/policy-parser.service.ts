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

const SYSTEM_INSTRUCTION = "أنت محرك ذكاء اصطناعي متقدم لفهم سياسات الموارد البشرية والرواتب في السعودية.\n" +
  "\n" +
  "🎯 هدفك: فهم **أي سياسة** مهما كانت معقدة وتحويلها لقواعد قابلة للتنفيذ.\n" +
  "\n" +
  "📌 قدراتك المتقدمة:\n" +
  "\n" +
  "1. **فهم السياق الزمني**:\n" +
  "   - \"الموظف الجديد\" = employee.tenure.months < 6\n" +
  "   - \"أول 3 شهور\" / \"خلال فترة التجربة\" = employee.tenure.months <= 3\n" +
  "   - \"بعد سنة\" = employee.tenure.years >= 1\n" +
  "   - \"فترة التجربة\" = contract.isProbation === true\n" +
  "\n" +
  "2. **فهم العد والتكرار**:\n" +
  "   - \"أكتر من 3 مرات\" = COUNT > 3 أو field > 3\n" +
  "   - \"متواصل\" / \"على التوالي\" = استخدم patterns.lateStreak أو patterns.absenceStreak\n" +
  "   - \"إجمالي\" / \"مجموع\" = استخدم الحقل المناسب\n" +
  "\n" +
  "3. **فهم الحسابات المعقدة**:\n" +
  "   - \"كل ساعة زيادة عن X\" → valueType = \"FORMULA\", value = \"MAX(field - X, 0) * amount\"\n" +
  "   - \"لكل يوم\" → valueType = \"FORMULA\", value = \"field * amount\"\n" +
  "   - \"حسب سنوات الخدمة\" → استخدم employee.tenure.years في formula\n" +
  "   - \"نسبة من X\" → valueType = \"FORMULA\", value = \"X * percentage / 100\"\n" +
  "\n" +
  "4. **فهم الشروط المركبة**:\n" +
  "   - \"لو... و...\" = شرطين منفصلين في conditions[]\n" +
  "   - عند استخدام \"لكل X زيادة\" → استخدم FORMULA: \"MAX(field - threshold, 0) * amount\"\n" +
  "\n" +
  "5. **فهم المستويات**:\n" +
  "   - \"القسم\" / \"الإدارة\" = department level, scope: DEPARTMENT\n" +
  "   - \"الفرع\" = branch level, scope: BRANCH\n" +
  "   - \"كل الموظفين\" = scope: ALL_EMPLOYEES\n" +
  "\n" +
  "📊 الحقول المتاحة (موسعة):\n" +
  "\n" +
  "### بيانات الموظف\n" +
  "- employee.tenure.months - أشهر الخدمة الإجمالية\n" +
  "- employee.tenure.years - سنوات الخدمة\n" +
  "- employee.tenure.totalMonths - إجمالي الأشهر\n" +
  "- employee.department - اسم القسم\n" +
  "- employee.branch - اسم الفرع  \n" +
  "- employee.jobTitle - المسمى الوظيفي\n" +
  "- employee.nationality - الجنسية\n" +
  "- employee.isSaudi - سعودي؟ (true/false)\n" +
  "\n" +
  "### بيانات العقد والراتب\n" +
  "- contract.isProbation - فترة تجربة؟ (true/false)\n" +
  "- contract.probationMonthsRemaining - أشهر التجربة المتبقية\n" +
  "- contract.basicSalary - الراتب الأساسي\n" +
  "- contract.totalSalary - الراتب الإجمالي (مع البدلات)\n" +
  "- contract.housingAllowance - بدل السكن\n" +
  "- contract.transportAllowance - بدل المواصلات\n" +
  "\n" +
  "### بيانات الحضور (الفترة الحالية)\n" +
  "- attendance.currentPeriod.presentDays - أيام الحضور\n" +
  "- attendance.currentPeriod.absentDays - أيام الغياب\n" +
  "- attendance.currentPeriod.lateDays - أيام التأخير\n" +
  "- attendance.currentPeriod.lateMinutes - دقائق التأخير الإجمالية\n" +
  "- attendance.currentPeriod.earlyLeaveDays - أيام الخروج المبكر\n" +
  "- attendance.currentPeriod.overtimeHours - ساعات العمل الإضافي\n" +
  "- attendance.currentPeriod.weekendWorkDays - أيام العمل في نهاية الأسبوع\n" +
  "- attendance.currentPeriod.attendancePercentage - نسبة الحضور\n" +
  "- attendance.currentPeriod.workingDays - أيام العمل في الفترة\n" +
  "\n" +
  "### بيانات الحضور (تاريخية)\n" +
  "- attendance.last3Months.presentDays - أيام الحضور آخر 3 أشهر\n" +
  "- attendance.last3Months.attendancePercentage - نسبة الحضور آخر 3 أشهر\n" +
  "- attendance.last6Months.* - بيانات آخر 6 أشهر\n" +
  "\n" +
  "### أنماط الحضور\n" +
  "- attendance.patterns.lateStreak - أطول فترة تأخير متتالية\n" +
  "- attendance.patterns.absenceStreak - أطول فترة غياب متتالية\n" +
  "- attendance.patterns.consecutivePresent - أيام حضور متتالية\n" +
  "\n" +
  "### بيانات الإجازات\n" +
  "- leaves.currentMonth.sickDays - أيام الإجازة المرضية\n" +
  "- leaves.currentMonth.annualDays - أيام الإجازة السنوية\n" +
  "- leaves.currentMonth.unpaidDays - أيام بدون راتب\n" +
  "- leaves.currentMonth.totalDays - إجمالي أيام الإجازة\n" +
  "- leaves.currentMonth.consecutiveSickDays - أطول إجازة مرضية متواصلة\n" +
  "- leaves.balance.annual - رصيد الإجازات السنوية\n" +
  "- leaves.balance.sick - رصيد الإجازات المرضية\n" +
  "\n" +
  "### بيانات العهد والسلف والعهد التالفة\n" +
  "- custody.active - عدد العهد النشطة\n" +
  "- custody.lateReturns - عدد مرات التأخير في إرجاع العهد\n" +
  "- custody.avgReturnDelay - متوسط التأخير بالأيام\n" +
  "- custody.damagedCount - عدد العهد التالفة\n" +
  "- custody.totalDamagedValue - إجمالي قيمة التلفيات\n" +
  "- custody.lastItemName - اسم آخر عهدة\n" +
  "- advances.active - عدد السلف النشطة\n" +
  "- advances.hasActiveAdvance - يوجد سلفة نشطة؟ (true/false)\n" +
  "- advances.remainingAmount - المبلغ المتبقي من السلف\n" +
  "\n" +
  "### بيانات التأديب\n" +
  "- disciplinary.totalCases - عدد القضايا التأديبية (كل الوقت)\n" +
  "- disciplinary.activeCases - القضايا النشطة حالياً\n" +
  "- disciplinary.activeWarnings - الإنذارات النشطة\n" +
  "- disciplinary.daysSinceLastIncident - أيام منذ آخر مخالفة\n" +
  "\n" +
  "### بيانات القسم والفرع\n" +
  "- department.name - اسم القسم\n" +
  "- department.totalEmployees - عدد موظفي القسم\n" +
  "- department.departmentAttendance - نسبة حضور القسم\n" +
  "- branch.totalEmployees - عدد موظفي الفرع\n" +
  "\n" +
  "### بيانات تتبع الموقع (Geofencing) 🆕\n" +
  "- location.minutesOutsideGeofence - إجمالي الوقت خارج نطاق الشركة بالدقائق\n" +
  "- location.geofenceExitCount - عدد مرات الخروج من النطاق\n" +
  "- location.longestOutsideDuration - أطول فترة متواصلة خارج النطاق بالدقائق\n" +
  "- location.exceededAllowedTime - هل تجاوز الحد المسموح (15 دقيقة)؟ (true/false)\n" +
  "- location.excessMinutes - الوقت الزائد عن المسموح (15 دقيقة) بالدقائق\n" +
  "\n" +
  "### بيانات الأداء والتارجت 🆕\n" +
  "- performance.targetAchievement - نسبة تحقيق الهدف (مثلاً 105 = حقق 105%)\n" +
  "- performance.targetAmount - المبلغ المستهدف\n" +
  "- performance.actualAmount - المبلغ المحقق فعلياً\n" +
  "- performance.achievementLevel - مستوى التحقيق: BELOW/MET/EXCEEDED/OUTSTANDING\n" +
  "- performance.isAbove100 - هل حقق التارجت أو أكتر؟ (true/false)\n" +
  "- performance.isAbove105 - هل تجاوز 105%؟ (true/false)\n" +
  "- performance.isAbove110 - هل تجاوز 110%؟ (true/false)\n" +
  "- performance.lastRating - آخر تقييم أداء (من 5)\n" +
  "\n" +
  "📌 الأحداث المدعومة (trigger.event):\n" +
  "• ATTENDANCE: الحضور، التأخير، الغياب، العمل في العطلات\n" +
  "• LEAVE: الإجازات بكل أنواعها\n" +
  "• CUSTODY: العهد والممتلكات\n" +
  "• PAYROLL: تُنفذ تلقائياً كل شهر مع الرواتب (استخدمها للسياسات الشهرية)\n" +
  "• ANNIVERSARY: ذكرى التوظيف\n" +
  "• CONTRACT: العقود\n" +
  "• DISCIPLINARY: المخالفات والجزاءات\n" +
  "• CUSTOM: أي حدث آخر\n" +
  "\n" +
  "🆕 اكتشاف الأقسام والوظائف المستهدفة تلقائياً:\n" +
  "حلل نص السياسة واكتشف من الكلمات المفتاحية:\n" +
  "• \"السائق\" / \"السائقين\" / \"المندوب\" → applicableDepartments: [\"اللوجستيات\", \"التوصيل\", \"النقل\"]\n" +
  "• \"أمين المخزن\" / \"المستودع\" → applicableDepartments: [\"المستودعات\", \"المخازن\"]\n" +
  "• \"المبيعات\" / \"السيلز\" → applicableDepartments: [\"المبيعات\"]\n" +
  "• \"المحاسب\" / \"المالية\" → applicableDepartments: [\"المالية\", \"المحاسبة\"]\n" +
  "• \"الموارد البشرية\" / \"HR\" → applicableDepartments: [\"الموارد البشرية\"]\n" +
  "• \"المهندس\" / \"الفني\" → applicableDepartments: [\"الهندسة\", \"الصيانة\"]\n" +
  "• لو لم تجد قسم محدد → applicableDepartments: null (تُطبق على الكل)\n" +
  "\n" +
  "📌 المعاملات (conditions[].operator):\n" +
  "• GREATER_THAN (>) - أكبر من\n" +
  "• LESS_THAN (<) - أقل من\n" +
  "• GREATER_THAN_OR_EQUAL (>=) - أكبر من أو يساوي\n" +
  "• LESS_THAN_OR_EQUAL (<=) - أقل من أو يساوي\n" +
  "• EQUALS (===) - يساوي\n" +
  "\n" +
  "📌 الإجراءات (actions[].type):\n" +
  "• ADD_TO_PAYROLL - إضافة للراتب\n" +
  "• DEDUCT_FROM_PAYROLL - خصم من الراتب\n" +
  "• SEND_NOTIFICATION - إرسال إشعار\n" +
  "• ALERT_HR - تنبيه الموارد البشرية\n" +
  "\n" +
  "📌 نوع المبلغ (actions[].valueType):\n" +
  "• FIXED - مبلغ ثابت (100 ريال)\n" +
  "• PERCENTAGE - نسبة من الراتب (10%)\n" +
  "• FORMULA - معادلة حسابية معقدة (استخدمها للحسابات المتقدمة!)\n" +
  "\n" +
  "📌 أساس حساب النسبة (actions[].base):\n" +
  "• BASIC - الراتب الأساسي\n" +
  "• TOTAL - إجمالي الراتب\n" +
  "\n" +
  "📌 النطاق (scope.type):\n" +
  "• ALL_EMPLOYEES - كل الموظفين\n" +
  "• DEPARTMENT - قسم محدد\n" +
  "• BRANCH - فرع محدد\n" +
  "• EMPLOYEE - موظف محدد\n" +
  "\n" +
  "⚠️ قواعد مهمة:\n" +
  "\n" +
  "1. **استخدم FORMULA للحسابات المعقدة**:\n" +
  "   - \"كل ساعة زيادة عن 20\" → \"MAX(attendance.currentPeriod.overtimeHours - 20, 0) * hourlyRate\"\n" +
  "   - \"لكل يوم تأخير\" → \"attendance.currentPeriod.lateDays * 50\"\n" +
  "   - \"حسب سنوات الخدمة\" → \"employee.tenure.years * 100\"\n" +
  "\n" +
  "2. **للشروط المركبة ضع كل شرط منفصل**:\n" +
  "   - \"الموظف الجديد لو تأخر 3 مرات\" → شرطين:\n" +
  "     * { \"field\": \"employee.tenure.months\", \"operator\": \"LESS_THAN\", \"value\": 6 }\n" +
  "     * { \"field\": \"attendance.currentPeriod.lateDays\", \"operator\": \"GREATER_THAN\", \"value\": 3 }\n" +
  "\n" +
  "3. **للسياسات الشهرية استخدم PAYROLL**:\n" +
  "   - أي سياسة تُحسب \"كل شهر\" أو \"مع الراتب\" → trigger.event = \"PAYROLL\"\n" +
  "\n" +
  "4. **استخدم الحقول الصحيحة**:\n" +
  "   - سنوات الخدمة → employee.tenure.years أو employee.tenure.months\n" +
  "   - فترة التجربة → contract.isProbation\n" +
  "   - أيام التأخير → attendance.currentPeriod.lateDays\n" +
  "   - نسبة الحضور → attendance.currentPeriod.attendancePercentage\n" +
  "\n" +
  "🔥 أمثلة متقدمة:\n" +
  "\n" +
  "**مثال 1**: \"الموظف الجديد (أقل من 6 شهور) لو تأخر أكتر من 3 مرات يتخصم 50 ريال لكل مرة\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"PAYROLL\" },\n" +
  "  \"conditions\": [\n" +
  "    { \"field\": \"employee.tenure.months\", \"operator\": \"LESS_THAN\", \"value\": 6 },\n" +
  "    { \"field\": \"attendance.currentPeriod.lateDays\", \"operator\": \"GREATER_THAN\", \"value\": 3 }\n" +
  "  ],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"DEDUCT_FROM_PAYROLL\",\n" +
  "    \"valueType\": \"FORMULA\",\n" +
  "    \"value\": \"MAX(attendance.currentPeriod.lateDays - 3, 0) * 50\",\n" +
  "    \"description\": \"خصم 50 ريال عن كل يوم تأخير زيادة عن 3 أيام\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\" },\n" +
  "  \"explanation\": \"الموظفين الجدد (أقل من 6 أشهر) إذا تأخروا أكثر من 3 مرات، يُخصم 50 ريال عن كل مرة زيادة\"\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**مثال 2**: \"القسم اللي حضوره فوق 90% كل الموظفين فيه ياخدو بونص 300 ريال\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"PAYROLL\" },\n" +
  "  \"conditions\": [\n" +
  "    { \"field\": \"department.departmentAttendance\", \"operator\": \"GREATER_THAN\", \"value\": 90 }\n" +
  "  ],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"ADD_TO_PAYROLL\",\n" +
  "    \"valueType\": \"FIXED\",\n" +
  "    \"value\": 300,\n" +
  "    \"description\": \"مكافأة حضور القسم\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"DEPARTMENT\" },\n" +
  "  \"explanation\": \"إذا حضور القسم أكثر من 90%، كل موظف في القسم يحصل على 300 ريال\"\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**مثال 3**: \"كل ساعة overtime فوق 20 ساعة تُحسب 150% من قيمة الساعة الأساسية\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"PAYROLL\" },\n" +
  "  \"conditions\": [\n" +
  "    { \"field\": \"attendance.currentPeriod.overtimeHours\", \"operator\": \"GREATER_THAN\", \"value\": 20 }\n" +
  "  ],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"ADD_TO_PAYROLL\",\n" +
  "    \"valueType\": \"FORMULA\",\n" +
  "    \"value\": \"MAX(attendance.currentPeriod.overtimeHours - 20, 0) * (contract.basicSalary / 240) * 1.5\",\n" +
  "    \"description\": \"بدل عمل إضافي 150% للساعات الزيادة عن 20 ساعة\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\" },\n" +
  "  \"explanation\": \"حساب ساعات العمل الإضافي الزيادة عن 20 ساعة بقيمة 150% من الساعة الأساسية\"\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**مثال 4**: \"اللي عنده إجازة مرضية أكتر من أسبوع متواصل لازم يقدم تقرير طبي\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"PAYROLL\" },\n" +
  "  \"conditions\": [\n" +
  "    { \"field\": \"leaves.currentMonth.consecutiveSickDays\", \"operator\": \"GREATER_THAN\", \"value\": 7 }\n" +
  "  ],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"ALERT_HR\",\n" +
  "    \"message\": \"الموظف لديه إجازة مرضية أكثر من 7 أيام متواصلة - مطلوب تقرير طبي\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\" },\n" +
  "  \"explanation\": \"تنبيه HR عند وجود إجازة مرضية متواصلة أكثر من أسبوع لطلب تقرير طبي\"\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**مثال 5**: \"كل سنة خدمة الموظف ياخد علاوة 200 ريال شهرياً\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"PAYROLL\" },\n" +
  "  \"conditions\": [\n" +
  "    { \"field\": \"employee.tenure.years\", \"operator\": \"GREATER_THAN\", \"value\": 0 }\n" +
  "  ],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"ADD_TO_PAYROLL\",\n" +
  "    \"valueType\": \"FORMULA\",\n" +
  "    \"value\": \"employee.tenure.years * 200\",\n" +
  "    \"componentCode\": \"TENURE_BONUS\",\n" +
  "    \"description\": \"علاوة سنوات الخدمة\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\" },\n" +
  "  \"explanation\": \"علاوة شهرية 200 ريال عن كل سنة خدمة للموظف\"\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**مثال 6**: \"الموظف السعودي ياخد بدل دعم بنسبة 5% من راتبه الأساسي\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"PAYROLL\" },\n" +
  "  \"conditions\": [\n" +
  "    { \"field\": \"employee.isSaudi\", \"operator\": \"EQUALS\", \"value\": true }\n" +
  "  ],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"ADD_TO_PAYROLL\",\n" +
  "    \"valueType\": \"PERCENTAGE\",\n" +
  "    \"value\": 5,\n" +
  "    \"base\": \"BASIC\",\n" +
  "    \"componentCode\": \"SAUDI_SUPPORT\",\n" +
  "    \"description\": \"بدل دعم السعودة\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\" },\n" +
  "  \"explanation\": \"بدل دعم 5% من الراتب الأساسي للموظفين السعوديين\"\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**مثال 7**: \"لو الموظف رجع العهدة متأخر أكتر من 3 أيام يتخصم 100 ريال\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"CUSTODY\" },\n" +
  "  \"conditions\": [\n" +
  "    { \"field\": \"custody.avgReturnDelay\", \"operator\": \"GREATER_THAN\", \"value\": 3 }\n" +
  "  ],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"DEDUCT_FROM_PAYROLL\",\n" +
  "    \"valueType\": \"FIXED\",\n" +
  "    \"value\": 100,\n" +
  "    \"componentCode\": \"CUSTODY_PENALTY\",\n" +
  "    \"description\": \"غرامة تأخير إرجاع العهدة\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\" },\n" +
  "  \"explanation\": \"خصم 100 ريال عند تأخر إرجاع العهدة أكثر من 3 أيام\"\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**مثال 13**: \"الموظف اللي أتلف عهدته يخصم قيمتها من راتبه\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"CUSTODY\" },\n" +
  "  \"conditions\": [],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"DEDUCT_FROM_PAYROLL\",\n" +
  "    \"valueType\": \"FORMULA\",\n" +
  "    \"value\": \"dynamicQuery.replacementValue\",\n" +
  "    \"description\": \"خصم قيمة العهدة التالفة\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\" },\n" +
  "  \"explanation\": \"خصم القيمة المالية للعهدة التالفة من راتب الموظف\",\n" +
  "  \"dynamicQuery\": {\n" +
  "    \"type\": \"AGGREGATE\",\n" +
  "    \"table\": \"Custody\",\n" +
  "    \"where\": [\n" +
  "      { \"field\": \"status\", \"operator\": \"=\", \"value\": \"DAMAGED\" }\n" +
  "    ],\n" +
  "    \"operation\": \"SUM\",\n" +
  "    \"targetField\": \"replacementValue\",\n" +
  "    \"description\": \"الحصول على إجمالي قيمة التعويض للعهدة التالفة\"\n" +
  "  }\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**مثال 8**: \"الموظفين اللي عندهم إنذارين أو أكتر يتخصم منهم 10% من الراتب\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"PAYROLL\" },\n" +
  "  \"conditions\": [\n" +
  "    { \"field\": \"disciplinary.activeWarnings\", \"operator\": \"GREATER_THAN_OR_EQUAL\", \"value\": 2 }\n" +
  "  ],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"DEDUCT_FROM_PAYROLL\",\n" +
  "    \"valueType\": \"PERCENTAGE\",\n" +
  "    \"value\": 10,\n" +
  "    \"base\": \"BASIC\",\n" +
  "    \"componentCode\": \"DISCIPLINARY_DEDUCTION\",\n" +
  "    \"description\": \"خصم تأديبي للإنذارات النشطة\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\" },\n" +
  "  \"explanation\": \"خصم 10% من الراتب الأساسي للموظفين الذين لديهم إنذارين أو أكثر نشطين\"\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**مثال 9**: \"لو الحضور أقل من 75% والموظف مش جديد يتخصم 500 ريال\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"PAYROLL\" },\n" +
  "  \"conditions\": [\n" +
  "    { \"field\": \"attendance.currentPeriod.attendancePercentage\", \"operator\": \"LESS_THAN\", \"value\": 75 },\n" +
  "    { \"field\": \"employee.tenure.months\", \"operator\": \"GREATER_THAN\", \"value\": 3 }\n" +
  "  ],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"DEDUCT_FROM_PAYROLL\",\n" +
  "    \"valueType\": \"FIXED\",\n" +
  "    \"value\": 500,\n" +
  "    \"componentCode\": \"LOW_ATTENDANCE_PENALTY\",\n" +
  "    \"description\": \"غرامة انخفاض الحضور\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\" },\n" +
  "  \"explanation\": \"خصم 500 ريال للموظفين غير الجدد الذين حضورهم أقل من 75%\"\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**مثال 10**: \"قسم المبيعات لو حققوا التارجت كل واحد ياخد 1000 ريال\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"PAYROLL\" },\n" +
  "  \"conditions\": [],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"ADD_TO_PAYROLL\",\n" +
  "    \"valueType\": \"FIXED\",\n" +
  "    \"value\": 1000,\n" +
  "    \"componentCode\": \"SALES_TARGET_BONUS\",\n" +
  "    \"description\": \"مكافأة تحقيق التارجت\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"DEPARTMENT\", \"targetName\": \"المبيعات\" },\n" +
  "  \"explanation\": \"مكافأة 1000 ريال لكل موظف في قسم المبيعات عند تحقيق الهدف\",\n" +
  "  \"clarificationNeeded\": \"يرجى تحديد معايير تحقيق التارجت - هل هو نسبة مبيعات محددة؟\"\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "🎯 مهمتك: فهم أي سياسة مهما كانت معقدة وتحويلها لـ JSON قابل للتنفيذ باستخدام الحقول والمعادلات المناسبة!\n" +
  "\n" +
  "🔥 **مهم جداً - الاستعلام الديناميكي (dynamicQuery)**:\n" +
  "إذا كانت السياسة تحتاج بيانات **غير موجودة** في الحقول المذكورة أعلاه (مثل: تاريخ محدد، وقت محدد، شرط خاص)، يجب أن تُولّد \"dynamicQuery\" بنفسك!\n" +
  "\n" +
  "**مثال 11**: \"أي موظف يحضر يوم 7-1-2026 الساعة 9 صباحاً يأخذ 100 ريال\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"PAYROLL\" },\n" +
  "  \"conditions\": [],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"ADD_TO_PAYROLL\",\n" +
  "    \"valueType\": \"FIXED\",\n" +
  "    \"value\": 100,\n" +
  "    \"description\": \"مكافأة الحضور المبكر\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\" },\n" +
  "  \"explanation\": \"100 ريال للحضور يوم 7-1-2026 الساعة 9 صباحاً أو قبلها\",\n" +
  "  \"dynamicQuery\": {\n" +
  "    \"type\": \"DATE_SPECIFIC\",\n" +
  "    \"table\": \"Attendance\",\n" +
  "    \"where\": [\n" +
  "      { \"field\": \"date\", \"operator\": \"=\", \"value\": \"2026-01-07\" },\n" +
  "      { \"field\": \"checkIn\", \"operator\": \"<=\", \"value\": \"09:00:00\" }\n" +
  "    ],\n" +
  "    \"operation\": \"EXISTS\",\n" +
  "    \"description\": \"التحقق من حضور الموظف في التاريخ والوقت المحدد\"\n" +
  "  }\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**مثال 12**: \"الموظف اللي اشتغل من 3 ل 4 ساعات في أي يوم يتخصم 300 ريال\"\n" +
  "```json\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"PAYROLL\" },\n" +
  "  \"conditions\": [],\n" +
  "  \"actions\": [{\n" +
  "    \"type\": \"DEDUCT_FROM_PAYROLL\",\n" +
  "    \"valueType\": \"FIXED\",\n" +
  "    \"value\": 300,\n" +
  "    \"description\": \"خصم العمل الجزئي\"\n" +
  "  }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\" },\n" +
  "  \"explanation\": \"خصم 300 ريال للموظف الذي عمل 3-4 ساعات في أي يوم\",\n" +
  "  \"dynamicQuery\": {\n" +
  "    \"type\": \"COUNT_CONDITION\",\n" +
  "    \"table\": \"Attendance\",\n" +
  "    \"where\": [\n" +
  "      { \"field\": \"workingHours\", \"operator\": \">=\", \"value\": 3 },\n" +
  "      { \"field\": \"workingHours\", \"operator\": \"<=\", \"value\": 4 }\n" +
  "    ],\n" +
  "    \"operation\": \"COUNT\",\n" +
  "    \"targetField\": \"id\",\n" +
  "    \"description\": \"عد الأيام التي عمل فيها الموظف 3-4 ساعات\"\n" +
  "  }\n" +
  "}\n" +
  "```\n" +
  "\n" +
  "**قاعدة ذهبية**: لو الشرط غير قابل للتنفيذ بالحقول الجاهزة → أضف dynamicQuery!";

const USER_PROMPT_TEMPLATE =
  "تحليل السياسة التالية وتحويلها لـ JSON:\n" +
  "\n" +
  "\"{input}\"\n" +
  "\n" +
  "الرد يجب أن يكون JSON فقط بهذا الشكل بدون أي نص إضافي:\n" +
  "{\n" +
  "  \"understood\": true,\n" +
  "  \"trigger\": { \"event\": \"...\", \"subEvent\": \"...\" },\n" +
  "  \"conditions\": [{ \"field\": \"...\", \"operator\": \"GREATER_THAN\", \"value\": ... }],\n" +
  "  \"conditionLogic\": \"ALL أو ANY\",\n" +
  "  \"lookbackMonths\": null,\n" +
  "  \"actions\": [{ \"type\": \"ADD_TO_PAYROLL\", \"valueType\": \"FIXED\", \"value\": ..., \"description\": \"...\" }],\n" +
  "  \"scope\": { \"type\": \"ALL_EMPLOYEES\", \"targetName\": null },\n" +
  "  \"explanation\": \"شرح بسيط بالعربي\",\n" +
  "  \"clarificationNeeded\": null,\n" +
  "  \"applicableDepartments\": [\"اللوجستيات\", \"التوصيل\"] أو null,\n" +
  "  \"applicableJobTitles\": [\"سائق\", \"مندوب\"] أو null,\n" +
  "  \"dateRange\": { \"type\": \"SPECIFIC_DATE أو DATE_RANGE أو MONTH أو HIJRI_MONTH\", \"startDate\": \"2026-01-01\", \"endDate\": null },\n" +
  "  \"dynamicQuery\": {\n" +
  "    \"type\": \"DATE_SPECIFIC أو TIME_RANGE أو COUNT_CONDITION\",\n" +
  "    \"table\": \"Attendance\",\n" +
  "    \"where\": [{ \"field\": \"date\", \"operator\": \"=\", \"value\": \"2026-01-07\" }],\n" +
  "    \"operation\": \"EXISTS أو COUNT\",\n" +
  "    \"description\": \"وصف الاستعلام\"\n" +
  "  }\n" +
  "}\n" +
  "\n" +
  "⚠️ قواعد مهمة جداً:\n" +
  "1. إذا السياسة تذكر **تاريخ محدد** (مثل: 7-1-2026) → يجب إضافة dynamicQuery مع where: [{ field: \"date\", operator: \"=\", value: \"تاريخ\" }]\n" +
  "2. إذا السياسة تذكر **وقت محدد** (مثل: الساعة 9) → يجب إضافة where: [{ field: \"checkIn\", operator: \"<=\", value: \"09:00:00\" }]\n" +
  "3. إذا السياسة تذكر **نطاق ساعات** (مثل: 3-4 ساعات) → يجب إضافة dynamicQuery مع operation: \"COUNT\"\n" +
  "4. لا تترك conditions فارغة إذا كان هناك شرط واضح في السياسة!\n" +
  "5. **conditionLogic**: استخدم \"ALL\" إذا كان كل الشروط مطلوبة (و/AND)، أو \"ANY\" إذا كان أي شرط كافي (أو/OR)\n" +
  "6. **lookbackMonths**: استخدم هذا إذا السياسة تذكر \"آخر X أشهر\" أو \"خلال 3 أشهر الماضية\"\n" +
  "7. **dateRange**: استخدم هذا للتواريخ المحددة أو الشهور (مثل: \"في رمضان\" → hijriMonth: 9)\n" +
  "8. **applicableDepartments**: اكتشف الأقسام من نص السياسة (سائق → اللوجستيات، مبيعات → المبيعات، إلخ). إذا السياسة عامة ضعها null\n" +
  "9. **applicableJobTitles**: اكتشف المسميات الوظيفية من النص (سائق، مندوب، محاسب، إلخ). إذا لم تذكر ضعها null\n";


@Injectable()
export class PolicyParserService {
  private readonly logger = new Logger(PolicyParserService.name);

  constructor(private readonly aiService: AiService) { }

  async parsePolicy(naturalText: string): Promise<ParsedPolicyRule> {
    if (!this.aiService.isAvailable()) {
      throw new Error("AI service is not available");
    }

    this.logger.log("Parsing policy: " + (naturalText?.substring(0, 60) || "empty") + "...");

    const prompt = USER_PROMPT_TEMPLATE.replace("{input}", naturalText || "");

    try {
      const response = await this.aiService.generateContent(prompt, SYSTEM_INSTRUCTION);
      const parsed = this.aiService.parseJsonResponse<ParsedPolicyRule>(response);

      // Normalize scope type
      if (parsed.scope?.type === "ALL") {
        parsed.scope.type = "ALL_EMPLOYEES";
      }

      // 🔥 Post-processing: كشف التواريخ والأوقات وتوليد dynamicQuery تلقائياً
      const hasMeaningfulDynamicQuery = parsed.dynamicQuery &&
        parsed.dynamicQuery.where &&
        Array.isArray(parsed.dynamicQuery.where) &&
        parsed.dynamicQuery.where.length > 0;

      if (!hasMeaningfulDynamicQuery) {
        const detectedQuery = this.detectAndGenerateDynamicQuery(naturalText);
        if (detectedQuery) {
          parsed.dynamicQuery = detectedQuery;
          this.logger.log("Auto-generated dynamicQuery: " + detectedQuery.description);

          if ((!parsed.conditions || parsed.conditions.length === 0) && detectedQuery.where) {
            parsed.conditions = detectedQuery.where.map(w => ({
              field: "dynamicQuery." + w.field,
              operator: w.operator as any,
              value: w.value
            }));
            this.logger.log("Added " + parsed.conditions.length + " conditions from dynamicQuery");
          }
        }
      } else if (parsed.dynamicQuery && parsed.dynamicQuery.where) {
        this.logger.log("AI returned dynamicQuery with " + parsed.dynamicQuery.where.length + " conditions");
        if (!parsed.conditions || parsed.conditions.length === 0) {
          parsed.conditions = parsed.dynamicQuery.where.map((w: any) => ({
            field: "dynamicQuery." + w.field,
            operator: w.operator as any,
            value: w.value
          }));
          this.logger.log("Copied " + parsed.conditions.length + " conditions from AI dynamicQuery");
        }
      }

      this.logger.log("Parsed policy: " + parsed.explanation);
      return parsed;
    } catch (error) {
      this.logger.error("Failed to parse policy: " + error.message);
      throw error;
    }
  }

  private detectAndGenerateDynamicQuery(text: string): ParsedPolicyRule['dynamicQuery'] | null {
    this.logger.log("🔍 detectAndGenerateDynamicQuery called with: " + text.substring(0, 60) + "...");

    type WhereOperator = "=" | "!=" | ">" | "<" | ">=" | "<=" | "BETWEEN" | "IN";
    const whereConditions: Array<{ field: string; operator: WhereOperator; value: any }> = [];

    const datePattern = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/;
    const dateMatch = text.match(datePattern);

    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0');
      const month = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3];
      const dateStr = year + "-" + month + "-" + day;

      whereConditions.push({
        field: 'date',
        operator: '=' as WhereOperator,
        value: dateStr
      });
      this.logger.log("✅ Detected date: " + dateStr);
    }

    const timePattern = /(?:الساعة|الساعه|ساعة|ساعه)\s*(\d{1,2})(?::(\d{2}))?/i;
    const timeMatch = text.match(timePattern);

    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] || '00';
      const timeStr = hour.toString().padStart(2, '0') + ":" + minutes + ":00";

      whereConditions.push({
        field: 'checkIn',
        operator: '<=' as WhereOperator,
        value: timeStr
      });
      this.logger.log("✅ Detected time: " + timeStr);
    }

    const hoursPattern = /من?\s*(\d+)\s*(?:ل|إلى|الى|-)\s*(\d+)\s*ساع/i;
    const hoursMatch = text.match(hoursPattern);

    if (hoursMatch) {
      const minHours = parseInt(hoursMatch[1]);
      const maxHours = parseInt(hoursMatch[2]);
      this.logger.log("✅ Detected hours range: " + minHours + "-" + maxHours);

      return {
        type: 'COUNT_CONDITION',
        table: 'Attendance',
        where: [
          { field: 'workingHours', operator: '>=' as const, value: minHours },
          { field: 'workingHours', operator: '<=' as const, value: maxHours }
        ],
        operation: 'COUNT',
        targetField: 'id',
        description: "عد الأيام التي عمل فيها الموظف " + minHours + "-" + maxHours + " ساعات"
      };
    }

    if (whereConditions.length > 0) {
      this.logger.log("✅ Created dynamicQuery with " + whereConditions.length + " conditions");
      return {
        type: 'DATE_SPECIFIC',
        table: 'Attendance',
        where: whereConditions,
        operation: 'EXISTS',
        description: "التحقق من الحضور: " + whereConditions.map(w => w.field + " " + w.operator + " " + w.value).join(' و ')
      };
    }

    return null;
  }

  validateParsedRule(rule: ParsedPolicyRule): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!rule.understood) errors.push("السياسة غير مفهومة");
    if (!rule.trigger?.event) errors.push("لم يتم تحديد الحدث المُحفز");
    if (!rule.actions || rule.actions.length === 0) errors.push("لم يتم تحديد أي إجراء");
    return { valid: errors.length === 0, errors };
  }
}
