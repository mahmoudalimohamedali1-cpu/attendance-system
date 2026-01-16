"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PolicyParserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyParserService = void 0;
const common_1 = require("@nestjs/common");
const ai_service_1 = require("../ai.service");
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

### بيانات العهد والسلف
- custody.active - عدد العهد النشطة
- custody.lateReturns - عدد مرات التأخير في إرجاع العهد
- custody.avgReturnDelay - متوسط التأخير بالأيام
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
  "trigger": { "event": "CUSTODY", "subEvent": "RETURN_LATE" },
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

**مثال 8**: "الموظفين اللي عندهم إنذارين أو أكتر يتخصم منهم 10% من الراتب"
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
`;
let PolicyParserService = PolicyParserService_1 = class PolicyParserService {
    constructor(aiService) {
        this.aiService = aiService;
        this.logger = new common_1.Logger(PolicyParserService_1.name);
    }
    async parsePolicy(naturalText) {
        if (!this.aiService.isAvailable()) {
            throw new Error("AI service is not available");
        }
        this.logger.log(`Parsing policy: "${naturalText?.substring(0, 60) || "empty"}..."`);
        const prompt = USER_PROMPT_TEMPLATE.replace("{input}", naturalText || "");
        try {
            const response = await this.aiService.generateContent(prompt, SYSTEM_INSTRUCTION);
            const parsed = this.aiService.parseJsonResponse(response);
            if (parsed.scope?.type === "ALL") {
                parsed.scope.type = "ALL_EMPLOYEES";
            }
            const hasMeaningfulDynamicQuery = parsed.dynamicQuery &&
                parsed.dynamicQuery.where &&
                Array.isArray(parsed.dynamicQuery.where) &&
                parsed.dynamicQuery.where.length > 0;
            if (!hasMeaningfulDynamicQuery) {
                const detectedQuery = this.detectAndGenerateDynamicQuery(naturalText);
                if (detectedQuery) {
                    parsed.dynamicQuery = detectedQuery;
                    this.logger.log(`Auto-generated dynamicQuery: ${detectedQuery.description}`);
                    if ((!parsed.conditions || parsed.conditions.length === 0) && detectedQuery.where) {
                        parsed.conditions = detectedQuery.where.map(w => ({
                            field: `dynamicQuery.${w.field}`,
                            operator: w.operator,
                            value: w.value
                        }));
                        this.logger.log(`Added ${parsed.conditions.length} conditions from dynamicQuery`);
                    }
                }
            }
            else if (parsed.dynamicQuery && parsed.dynamicQuery.where) {
                this.logger.log(`AI returned dynamicQuery with ${parsed.dynamicQuery.where.length} conditions`);
                if (!parsed.conditions || parsed.conditions.length === 0) {
                    parsed.conditions = parsed.dynamicQuery.where.map((w) => ({
                        field: `dynamicQuery.${w.field}`,
                        operator: w.operator,
                        value: w.value
                    }));
                    this.logger.log(`Copied ${parsed.conditions.length} conditions from AI dynamicQuery`);
                }
            }
            this.logger.log(`Parsed policy: ${parsed.explanation}`);
            return parsed;
        }
        catch (error) {
            this.logger.error(`Failed to parse policy: ${error.message}`);
            throw error;
        }
    }
    detectAndGenerateDynamicQuery(text) {
        this.logger.log(`🔍 detectAndGenerateDynamicQuery called with: "${text.substring(0, 60)}..."`);
        const whereConditions = [];
        const datePattern = /(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/;
        const dateMatch = text.match(datePattern);
        if (dateMatch) {
            const day = dateMatch[1].padStart(2, '0');
            const month = dateMatch[2].padStart(2, '0');
            const year = dateMatch[3];
            const dateStr = `${year}-${month}-${day}`;
            whereConditions.push({
                field: 'date',
                operator: '=',
                value: dateStr
            });
            this.logger.log(`✅ Detected date: ${dateStr}`);
        }
        const timePattern = /(?:الساعة|الساعه|ساعة|ساعه)\s*(\d{1,2})(?::(\d{2}))?/i;
        const timeMatch = text.match(timePattern);
        if (timeMatch) {
            const hour = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] || '00';
            const timeStr = `${hour.toString().padStart(2, '0')}:${minutes}:00`;
            whereConditions.push({
                field: 'checkIn',
                operator: '<=',
                value: timeStr
            });
            this.logger.log(`✅ Detected time: ${timeStr}`);
        }
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
                    { field: 'workingHours', operator: '>=', value: minHours },
                    { field: 'workingHours', operator: '<=', value: maxHours }
                ],
                operation: 'COUNT',
                targetField: 'id',
                description: `عد الأيام التي عمل فيها الموظف ${minHours}-${maxHours} ساعات`
            };
        }
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
    validateParsedRule(rule) {
        const errors = [];
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
};
exports.PolicyParserService = PolicyParserService;
exports.PolicyParserService = PolicyParserService = PolicyParserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], PolicyParserService);
//# sourceMappingURL=policy-parser.service.js.map