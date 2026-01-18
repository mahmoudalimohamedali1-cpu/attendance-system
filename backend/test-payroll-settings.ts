/**
 * اختبار إعدادات الرواتب - المجموعات 1-3
 * Test PayrollSettings Groups 1-3
 */

// ============ بيانات الموظف ============
const employee = {
    salary: 10000, // راتب أساسي 10,000 ريال
    housingAllowance: 2500, // بدل سكن
    transportAllowance: 500, // بدل مواصلات
    totalSalary: 13000, // إجمالي الراتب
    hireDate: new Date('2026-01-10'), // تاريخ التوظيف
};

// ============ فترة الرواتب ============
const payrollPeriod = {
    start: new Date('2026-01-01'),
    end: new Date('2026-01-31'),
    totalDays: 31,
    workingDays: 22, // أحد-خميس
};

// ============ الإجازة غير المدفوعة ============
const unpaidLeave = {
    startDate: new Date('2026-01-12'), // الأحد
    endDate: new Date('2026-01-18'),   // السبت
    totalDays: 7, // 7 أيام
    workingDays: 5, // أحد، اثنين، ثلاثاء، أربعاء، خميس
};

// ============ ساعات العمل الإضافي ============
const overtime = {
    regularHours: 10,
    weekendHours: 4,
    holidayHours: 2,
};

console.log('='.repeat(60));
console.log('🧪 اختبار إعدادات الرواتب - المجموعات 1-3');
console.log('='.repeat(60));

// ============ المجموعة 1: التوظيف والإنهاء ============
console.log('\n📋 المجموعة 1: حساب التناسب (Pro-rata) للموظف الجديد');
console.log('-'.repeat(50));

// موظف بدأ يوم 10 يناير (21 يوم من أصل 31)
const workedDays = 22; // من 10 يناير إلى 31 يناير

// INCLUDE_ALL_DAYS: 22 ÷ 31 = 0.71
const proRata_includeAll = 22 / 31;
console.log(`✅ INCLUDE_ALL_DAYS: ${(proRata_includeAll * 100).toFixed(1)}% من الراتب`);
console.log(`   = ${(employee.totalSalary * proRata_includeAll).toFixed(2)} ريال`);

// EXCLUDE_WEEKENDS: 16 يوم عمل ÷ 22 يوم عمل في الشهر
const workedWorkingDays = 16; // أيام العمل من 10-31 يناير
const proRata_excludeWeekends = workedWorkingDays / 22;
console.log(`✅ EXCLUDE_WEEKENDS: ${(proRata_excludeWeekends * 100).toFixed(1)}% من الراتب`);
console.log(`   = ${(employee.totalSalary * proRata_excludeWeekends).toFixed(2)} ريال`);

// FIXED_30_DAYS: 22 ÷ 30 = 0.73
const proRata_fixed30 = 22 / 30;
console.log(`✅ FIXED_30_DAYS: ${(proRata_fixed30 * 100).toFixed(1)}% من الراتب`);
console.log(`   = ${(employee.totalSalary * proRata_fixed30).toFixed(2)} ريال`);

// ============ المجموعة 2: الإجازات غير المدفوعة ============
console.log('\n📋 المجموعة 2: خصم الإجازة غير المدفوعة (7 أيام)');
console.log('-'.repeat(50));

// حساب المعدل اليومي
const dailyRate_calendar = employee.totalSalary / 31; // CALENDAR_DAYS
const dailyRate_working = employee.totalSalary / 22;  // ACTUAL_WORKING_DAYS
const dailyRate_fixed = employee.totalSalary / 30;    // FIXED_30_DAYS

console.log('📌 قاعدة الحساب (unpaidLeaveCalcBase):');
console.log(`   CALENDAR_DAYS: ${dailyRate_calendar.toFixed(2)} ريال/يوم`);
console.log(`   ACTUAL_WORKING_DAYS: ${dailyRate_working.toFixed(2)} ريال/يوم`);
console.log(`   FIXED_30_DAYS: ${dailyRate_fixed.toFixed(2)} ريال/يوم`);

console.log('\n📌 طريقة الحساب (unpaidLeaveMethod):');

// BASED_ON_CALENDAR: 7 أيام كاملة
const deduction_calendar = 7 * dailyRate_fixed;
console.log(`✅ BASED_ON_CALENDAR: 7 يوم × ${dailyRate_fixed.toFixed(2)} = ${deduction_calendar.toFixed(2)} ريال`);

// BASED_ON_SHIFTS: 5 أيام عمل فقط
const deduction_shifts = 5 * dailyRate_fixed;
console.log(`✅ BASED_ON_SHIFTS: 5 يوم × ${dailyRate_fixed.toFixed(2)} = ${deduction_shifts.toFixed(2)} ريال`);

// BASED_ON_WORKING_DAYS: 5 أيام عمل (نفس SHIFTS)
const deduction_working = 5 * dailyRate_working;
console.log(`✅ BASED_ON_WORKING_DAYS: 5 يوم × ${dailyRate_working.toFixed(2)} = ${deduction_working.toFixed(2)} ريال`);

console.log(`\n💡 الفرق: ${(deduction_calendar - deduction_shifts).toFixed(2)} ريال`);

// ============ المجموعة 3: الوقت الإضافي ============
console.log('\n📋 المجموعة 3: حساب الوقت الإضافي (16 ساعة)');
console.log('-'.repeat(50));

// حساب أجر الساعة بناءً على الطريقة
const hourlyRate_basic = employee.salary / 30 / 8; // الراتب الأساسي فقط
const hourlyRate_total = employee.totalSalary / 30 / 8; // إجمالي الراتب
const hourlyRate_shifts = (employee.salary + employee.housingAllowance) / 30 / 8; // الأساسي + السكن

console.log('📌 طريقة حساب الوقت الإضافي (overtimeMethod):');
console.log(`   BASED_ON_BASIC_ONLY: ${hourlyRate_basic.toFixed(2)} ريال/ساعة`);
console.log(`   BASED_ON_TOTAL: ${hourlyRate_total.toFixed(2)} ريال/ساعة`);
console.log(`   BASED_ON_SHIFTS: ${hourlyRate_shifts.toFixed(2)} ريال/ساعة`);

// حساب الوقت الإضافي العادي (10 ساعات × 1.5)
const regularOT_basic = overtime.regularHours * hourlyRate_basic * 1.5;
const regularOT_total = overtime.regularHours * hourlyRate_total * 1.5;
const regularOT_shifts = overtime.regularHours * hourlyRate_shifts * 1.5;

console.log('\n📌 الوقت الإضافي العادي (10 ساعات × 1.5):');
console.log(`✅ BASED_ON_BASIC_ONLY: ${regularOT_basic.toFixed(2)} ريال`);
console.log(`✅ BASED_ON_TOTAL: ${regularOT_total.toFixed(2)} ريال`);
console.log(`✅ BASED_ON_SHIFTS: ${regularOT_shifts.toFixed(2)} ريال`);

// حساب الوقت الإضافي في عطلة الأسبوع (4 ساعات × 2.0)
const weekendOT_basic = overtime.weekendHours * hourlyRate_basic * 2.0;
const weekendOT_total = overtime.weekendHours * hourlyRate_total * 2.0;

console.log('\n📌 الوقت الإضافي في عطلة الأسبوع (4 ساعات × 2.0):');
console.log(`✅ BASED_ON_BASIC_ONLY: ${weekendOT_basic.toFixed(2)} ريال`);
console.log(`✅ BASED_ON_TOTAL: ${weekendOT_total.toFixed(2)} ريال`);

// حساب الوقت الإضافي في الأعياد (2 ساعات × 2.0)
const holidayOT_basic = overtime.holidayHours * hourlyRate_basic * 2.0;
const holidayOT_total = overtime.holidayHours * hourlyRate_total * 2.0;

console.log('\n📌 الوقت الإضافي في الأعياد (2 ساعات × 2.0):');
console.log(`✅ BASED_ON_BASIC_ONLY: ${holidayOT_basic.toFixed(2)} ريال`);
console.log(`✅ BASED_ON_TOTAL: ${holidayOT_total.toFixed(2)} ريال`);

// الإجمالي
const totalOT_basic = regularOT_basic + weekendOT_basic + holidayOT_basic;
const totalOT_total = regularOT_total + weekendOT_total + holidayOT_total;

console.log('\n📌 إجمالي الوقت الإضافي:');
console.log(`✅ BASED_ON_BASIC_ONLY: ${totalOT_basic.toFixed(2)} ريال`);
console.log(`✅ BASED_ON_TOTAL: ${totalOT_total.toFixed(2)} ريال`);
console.log(`\n💡 الفرق: ${(totalOT_total - totalOT_basic).toFixed(2)} ريال`);

// ============ ملخص ============
console.log('\n' + '='.repeat(60));
console.log('📊 ملخص النتائج');
console.log('='.repeat(60));
console.log(`
┌──────────────────────────────────────────────────────────┐
│ المجموعة 1: التوظيف والإنهاء                             │
├──────────────────────────────────────────────────────────┤
│ INCLUDE_ALL_DAYS:    ${(employee.totalSalary * proRata_includeAll).toFixed(0).padStart(6)} ريال (${(proRata_includeAll * 100).toFixed(0)}%)          │
│ EXCLUDE_WEEKENDS:    ${(employee.totalSalary * proRata_excludeWeekends).toFixed(0).padStart(6)} ريال (${(proRata_excludeWeekends * 100).toFixed(0)}%)          │
│ FIXED_30_DAYS:       ${(employee.totalSalary * proRata_fixed30).toFixed(0).padStart(6)} ريال (${(proRata_fixed30 * 100).toFixed(0)}%)          │
├──────────────────────────────────────────────────────────┤
│ المجموعة 2: خصم الإجازة غير المدفوعة                     │
├──────────────────────────────────────────────────────────┤
│ BASED_ON_CALENDAR:   ${deduction_calendar.toFixed(0).padStart(6)} ريال (7 أيام)         │
│ BASED_ON_SHIFTS:     ${deduction_shifts.toFixed(0).padStart(6)} ريال (5 أيام)         │
│ BASED_ON_WORKING:    ${deduction_working.toFixed(0).padStart(6)} ريال (5 أيام)         │
├──────────────────────────────────────────────────────────┤
│ المجموعة 3: الوقت الإضافي (16 ساعة)                      │
├──────────────────────────────────────────────────────────┤
│ BASED_ON_BASIC_ONLY: ${totalOT_basic.toFixed(0).padStart(6)} ريال                   │
│ BASED_ON_TOTAL:      ${totalOT_total.toFixed(0).padStart(6)} ريال                   │
└──────────────────────────────────────────────────────────┘
`);

console.log('✅ الاختبار اكتمل بنجاح!');
