import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAdminPermissions() {
    console.log('🚀 Fixing admin permissions...');

    // 1. Find the admin user
    const adminEmail = 'admin@company.com';
    const adminUser = await prisma.user.findUnique({
        where: { email: adminEmail }
    });

    if (!adminUser) {
        console.error(`❌ Admin user with email ${adminEmail} not found!`);
        return;
    }

    console.log(`✅ Found admin user: ${adminUser.firstName} ${adminUser.lastName} (ID: ${adminUser.id})`);

    // 2. Get all permissions from the database
    const allPermissions = await prisma.permission.findMany();
    console.log(`📊 Found ${allPermissions.length} total permissions in the database.`);

    // 3. Connect all permissions to the admin user
    // We use set to overwrite or update existing permissions
    await prisma.user.update({
        where: { id: adminUser.id },
        data: {
            userPermissions: {
                deleteMany: {}, // Clear existing to avoid duplicates if necessary, or just upsert
                create: allPermissions.map(p => ({
                    permissionId: p.id
                }))
            }
        }
    });

    console.log(`✨ Successfully mapped all ${allPermissions.length} permissions to ${adminEmail}`);
}

fixAdminPermissions()
    .then(() => prisma.$disconnect())
    .catch((e) => {
        console.error('Error fixing permissions:', e);
        prisma.$disconnect();
        process.exit(1);
    });
