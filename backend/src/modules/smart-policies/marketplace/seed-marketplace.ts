/**
 * 🌱 Policy Marketplace Seeder
 * سكربت لملء سوق السياسات بالبيانات الجاهزة
 * 
 * التشغيل:
 * npx ts-node src/modules/smart-policies/marketplace/seed-marketplace.ts
 */

import { PrismaClient } from '@prisma/client';
import { ALL_POLICIES, POLICY_STATS } from './data';
import { PolicyGeneratorService } from './policy-generator.service';

const prisma = new PrismaClient();

async function seedMarketplace() {
    console.log('🌱 بدء ملء سوق السياسات...\n');
    console.log(`📊 إحصائيات السياسات:`);
    console.log(`   - إجمالي السياسات: ${POLICY_STATS.total}`);
    console.log(`   - متوسط التقييم: ${POLICY_STATS.avgRating.toFixed(1)}`);
    console.log(`   - متوسط الشعبية: ${POLICY_STATS.avgPopularity.toFixed(0)}%\n`);

    const generator = new PolicyGeneratorService();
    let successCount = 0;
    let errorCount = 0;

    for (const template of ALL_POLICIES) {
        try {
            // توليد السياسة
            const generated = generator.generateFromTemplate(template);
            
            // التحقق من الصلاحية
            if (!generated.isValid) {
                console.log(`⚠️  ${template.id}: فشل الاختبارات`);
                errorCount++;
                continue;
            }

            // حفظ في قاعدة البيانات
            await prisma.smartPolicyTemplate.upsert({
                where: { id: template.id },
                create: {
                    id: template.id,
                    category: template.category,
                    name: template.nameAr,
                    nameEn: template.nameEn,
                    description: template.descriptionAr,
                    originalText: template.descriptionAr,
                    parsedRule: generated.parsedRule,
                    legalCompliance: {
                        reference: template.legalReference,
                        laborLawArticle: template.laborLawArticle,
                    },
                    laborLawArticles: template.laborLawArticle ? [template.laborLawArticle] : [],
                    usageCount: Math.floor(Math.random() * 500) + 100,
                    rating: template.rating,
                    ratingCount: Math.floor(Math.random() * 100) + 20,
                    isPublic: true,
                    isSystemTemplate: true,
                },
                update: {
                    name: template.nameAr,
                    nameEn: template.nameEn,
                    description: template.descriptionAr,
                    parsedRule: generated.parsedRule,
                    rating: template.rating,
                },
            });

            successCount++;
            console.log(`✅ ${template.id}: ${template.nameAr}`);

        } catch (error: any) {
            console.log(`❌ ${template.id}: ${error.message}`);
            errorCount++;
        }
    }

    console.log('\n========================================');
    console.log(`🎉 اكتمل ملء سوق السياسات!`);
    console.log(`   ✅ نجح: ${successCount}`);
    console.log(`   ❌ فشل: ${errorCount}`);
    console.log(`   📊 النسبة: ${((successCount / ALL_POLICIES.length) * 100).toFixed(1)}%`);
    console.log('========================================\n');
}

// تشغيل
seedMarketplace()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
