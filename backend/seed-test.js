const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function seed() {
    const prisma = new PrismaClient();

    try {
        // Create company
        const company = await prisma.company.upsert({
            where: { id: 'test-company-id' },
            update: {},
            create: {
                id: 'test-company-id',
                name: 'Test Company',
                email: 'test@company.com',
            }
        });
        console.log('Company created:', company.id);

        // Create test user (password: test123)
        const hashedPassword = await bcrypt.hash('test123', 10);
        const user = await prisma.user.upsert({
            where: { id: 'test-user-id' },
            update: {},
            create: {
                id: 'test-user-id',
                email: 'test@test.com',
                password: hashedPassword,
                firstName: 'Test',
                lastName: 'User',
                phone: '0500000000',
                role: 'ADMIN',
                status: 'ACTIVE',
                companyId: company.id,
            }
        });

        console.log('User created:', user.email);
        console.log('Login with: test@test.com / test123');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
