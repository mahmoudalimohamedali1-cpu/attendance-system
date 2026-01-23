import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const users = await prisma.user.findMany({
            take: 2,
            select: { id: true, firstName: true, lastName: true },
            where: { salaryAssignments: { some: { isActive: true } } }
        });
        console.log('CANDIDATES:', JSON.stringify(users));
    } finally {
        await prisma.$disconnect();
    }
}

main();
