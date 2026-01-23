const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findFirst({
    where: { salaryAssignments: { some: { isActive: true } } },
    include: { salaryAssignments: { where: { isActive: true } } }
}).then(u => {
    console.log('NAME:', u.firstName, u.lastName);
    console.log('ID:', u.id);
    console.log('SALARY:', u.salaryAssignments[0].baseSalary);
    process.exit(0);
});
