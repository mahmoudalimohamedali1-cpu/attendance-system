import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      password: adminPassword,
      firstName: 'مدير',
      lastName: 'النظام',
      employeeCode: 'EMP00001',
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '+966500000001',
      jobTitle: 'مدير النظام',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Create main branch
  const mainBranch = await prisma.branch.upsert({
    where: { id: 'main-branch-id' },
    update: {},
    create: {
      id: 'main-branch-id',
      name: 'الفرع الرئيسي',
      nameEn: 'Main Branch',
      address: 'الرياض، المملكة العربية السعودية',
      latitude: 24.7136,
      longitude: 46.6753,
      geofenceRadius: 50000, // 50 كم للتجربة
      timezone: 'Asia/Riyadh',
      workStartTime: '09:00',
      workEndTime: '17:00',
      lateGracePeriod: 10,
      earlyCheckInPeriod: 15,
      workingDays: '0,1,2,3,4',
    },
  });
  console.log('✅ Main branch created:', mainBranch.name);

  // Create work schedules for main branch
  const days = [
    { dayOfWeek: 0, name: 'الأحد', isWorking: true },
    { dayOfWeek: 1, name: 'الإثنين', isWorking: true },
    { dayOfWeek: 2, name: 'الثلاثاء', isWorking: true },
    { dayOfWeek: 3, name: 'الأربعاء', isWorking: true },
    { dayOfWeek: 4, name: 'الخميس', isWorking: true },
    { dayOfWeek: 5, name: 'الجمعة', isWorking: false },
    { dayOfWeek: 6, name: 'السبت', isWorking: false },
  ];

  for (const day of days) {
    await prisma.workSchedule.upsert({
      where: {
        branchId_dayOfWeek: {
          branchId: mainBranch.id,
          dayOfWeek: day.dayOfWeek,
        },
      },
      update: {},
      create: {
        branchId: mainBranch.id,
        dayOfWeek: day.dayOfWeek,
        workStartTime: '09:00',
        workEndTime: '17:00',
        isWorkingDay: day.isWorking,
      },
    });
  }
  console.log('✅ Work schedules created');

  // Create IT department
  const itDepartment = await prisma.department.upsert({
    where: { id: 'it-dept-id' },
    update: {},
    create: {
      id: 'it-dept-id',
      name: 'قسم تقنية المعلومات',
      nameEn: 'IT Department',
      branchId: mainBranch.id,
    },
  });
  console.log('✅ IT Department created');

  // Create HR department
  const hrDepartment = await prisma.department.upsert({
    where: { id: 'hr-dept-id' },
    update: {},
    create: {
      id: 'hr-dept-id',
      name: 'قسم الموارد البشرية',
      nameEn: 'HR Department',
      branchId: mainBranch.id,
    },
  });
  console.log('✅ HR Department created');

  // Create manager user
  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: {
      email: 'manager@company.com',
      password: managerPassword,
      firstName: 'أحمد',
      lastName: 'المدير',
      employeeCode: 'EMP00002',
      role: 'MANAGER',
      status: 'ACTIVE',
      phone: '+966500000002',
      jobTitle: 'مدير قسم تقنية المعلومات',
      branchId: mainBranch.id,
      departmentId: itDepartment.id,
    },
  });
  console.log('✅ Manager user created:', manager.email);

  // Create employee users
  const employeePassword = await bcrypt.hash('employee123', 10);
  
  const employees = [
    {
      email: 'employee1@company.com',
      firstName: 'محمد',
      lastName: 'الموظف',
      phone: '+966500000003',
      jobTitle: 'مطور برمجيات',
      departmentId: itDepartment.id,
    },
    {
      email: 'employee2@company.com',
      firstName: 'فاطمة',
      lastName: 'الموظفة',
      phone: '+966500000004',
      jobTitle: 'مصممة واجهات',
      departmentId: itDepartment.id,
    },
    {
      email: 'employee3@company.com',
      firstName: 'عبدالله',
      lastName: 'العامل',
      phone: '+966500000005',
      jobTitle: 'أخصائي موارد بشرية',
      departmentId: hrDepartment.id,
    },
  ];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        password: employeePassword,
        firstName: emp.firstName,
        lastName: emp.lastName,
        employeeCode: `EMP0000${i + 3}`,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        phone: emp.phone,
        jobTitle: emp.jobTitle,
        branchId: mainBranch.id,
        departmentId: emp.departmentId,
        managerId: manager.id,
        salary: 8000 + (i * 500),
      },
    });
    console.log('✅ Employee created:', emp.email);
  }

  // Create system settings
  const settings = [
    { key: 'company_name', value: 'شركة نظام الحضور', description: 'اسم الشركة' },
    { key: 'company_name_en', value: 'Attendance System Company', description: 'اسم الشركة بالإنجليزية' },
    { key: 'default_timezone', value: 'Asia/Riyadh', description: 'المنطقة الزمنية الافتراضية' },
    { key: 'default_language', value: 'ar', description: 'اللغة الافتراضية' },
    { key: 'late_deduction_percentage', value: '1', description: 'نسبة خصم التأخير (%)' },
    { key: 'absent_deduction_days', value: '1', description: 'خصم الغياب بالأيام' },
    { key: 'overtime_rate', value: '1.5', description: 'معامل الساعات الإضافية' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log('✅ System settings created');

  // Create some holidays
  const holidays = [
    { name: 'عيد الفطر', nameEn: 'Eid al-Fitr', date: new Date('2024-04-10'), isRecurring: false },
    { name: 'عيد الأضحى', nameEn: 'Eid al-Adha', date: new Date('2024-06-16'), isRecurring: false },
    { name: 'اليوم الوطني', nameEn: 'National Day', date: new Date('2024-09-23'), isRecurring: true },
  ];

  for (const holiday of holidays) {
    await prisma.holiday.upsert({
      where: { id: holiday.name },
      update: {},
      create: {
        id: holiday.name,
        ...holiday,
      },
    });
  }
  console.log('✅ Holidays created');

  console.log('🎉 Seeding completed!');
  console.log('\n📋 Test accounts:');
  console.log('  Admin: admin@company.com / admin123');
  console.log('  Manager: manager@company.com / manager123');
  console.log('  Employee: employee1@company.com / employee123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

