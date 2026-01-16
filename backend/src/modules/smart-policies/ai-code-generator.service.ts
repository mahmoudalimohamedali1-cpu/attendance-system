import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 📝 AI Code Generator Service
 * يولد ملفات TypeScript تلقائياً (Services, Controllers, Modules)
 */
@Injectable()
export class AiCodeGeneratorService {
    private readonly logger = new Logger(AiCodeGeneratorService.name);
    private readonly srcPath = path.join(process.cwd(), 'src', 'modules');

    /**
     * 🔧 توليد Service جديد
     */
    generateService(modelName: string, fields: string[]): string {
        const serviceName = `${modelName}Service`;
        const fileName = `${this.toKebabCase(modelName)}.service.ts`;

        const serviceCode = `import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ${serviceName} {
    private readonly logger = new Logger(${serviceName}.name);

    constructor(private prisma: PrismaService) {}

    async findAll(userId: string) {
        return this.prisma.${this.toCamelCase(modelName)}.findMany({
            where: { userId }
        });
    }

    async findOne(id: string) {
        return this.prisma.${this.toCamelCase(modelName)}.findUnique({
            where: { id }
        });
    }

    async create(userId: string, data: any) {
        return this.prisma.${this.toCamelCase(modelName)}.create({
            data: { ...data, userId }
        });
    }

    async update(id: string, data: any) {
        return this.prisma.${this.toCamelCase(modelName)}.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        return this.prisma.${this.toCamelCase(modelName)}.delete({
            where: { id }
        });
    }

    // 🔥 Custom methods for policy context
    async getForPolicyContext(userId: string) {
        const records = await this.findAll(userId);
        return {
            count: records.length,
            hasActive: records.some((r: any) => r.status === 'ACTIVE'),
            records
        };
    }
}
`;

        this.logger.log(`📝 Generated service: ${serviceName}`);
        return serviceCode;
    }

    /**
     * 🎮 توليد Controller جديد
     */
    generateController(modelName: string): string {
        const controllerName = `${modelName}Controller`;
        const serviceName = `${modelName}Service`;
        const routePath = this.toKebabCase(modelName);

        const controllerCode = `import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ${serviceName} } from './${this.toKebabCase(modelName)}.service';

@ApiTags('${modelName}')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/${routePath}')
export class ${controllerName} {
    constructor(private readonly service: ${serviceName}) {}

    @Get()
    @ApiOperation({ summary: 'Get all ${modelName} records for current user' })
    async findAll(@Request() req: any) {
        return this.service.findAll(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get ${modelName} by ID' })
    async findOne(@Param('id') id: string) {
        return this.service.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create new ${modelName}' })
    async create(@Request() req: any, @Body() data: any) {
        return this.service.create(req.user.id, data);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update ${modelName}' })
    async update(@Param('id') id: string, @Body() data: any) {
        return this.service.update(id, data);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete ${modelName}' })
    async delete(@Param('id') id: string) {
        return this.service.delete(id);
    }
}
`;

        this.logger.log(`🎮 Generated controller: ${controllerName}`);
        return controllerCode;
    }

    /**
     * 📦 توليد Module جديد
     */
    generateModule(modelName: string): string {
        const moduleName = `${modelName}Module`;
        const serviceName = `${modelName}Service`;
        const controllerName = `${modelName}Controller`;

        const moduleCode = `import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ${serviceName} } from './${this.toKebabCase(modelName)}.service';
import { ${controllerName} } from './${this.toKebabCase(modelName)}.controller';

@Module({
    imports: [PrismaModule],
    controllers: [${controllerName}],
    providers: [${serviceName}],
    exports: [${serviceName}],
})
export class ${moduleName} {}
`;

        this.logger.log(`📦 Generated module: ${moduleName}`);
        return moduleCode;
    }

    /**
     * 📂 إنشاء ملفات الـ Module كاملة
     */
    async createModuleFiles(modelName: string, fields: string[]): Promise<{
        success: boolean;
        createdFiles: string[];
        message: string;
    }> {
        const modulePath = path.join(this.srcPath, this.toKebabCase(modelName));
        const createdFiles: string[] = [];

        try {
            // إنشاء المجلد
            if (!fs.existsSync(modulePath)) {
                fs.mkdirSync(modulePath, { recursive: true });
            }

            // إنشاء الملفات
            const files = [
                { name: `${this.toKebabCase(modelName)}.service.ts`, content: this.generateService(modelName, fields) },
                { name: `${this.toKebabCase(modelName)}.controller.ts`, content: this.generateController(modelName) },
                { name: `${this.toKebabCase(modelName)}.module.ts`, content: this.generateModule(modelName) },
            ];

            for (const file of files) {
                const filePath = path.join(modulePath, file.name);
                fs.writeFileSync(filePath, file.content);
                createdFiles.push(filePath);
                this.logger.log(`✅ Created: ${file.name}`);
            }

            return {
                success: true,
                createdFiles,
                message: `Created ${createdFiles.length} files for ${modelName} module`
            };

        } catch (error) {
            this.logger.error(`Failed to create module files: ${error.message}`);
            return {
                success: false,
                createdFiles,
                message: error.message
            };
        }
    }

    /**
     * 🔄 تحديث app.module.ts
     */
    async updateAppModule(modelName: string): Promise<{ success: boolean; message: string }> {
        const appModulePath = path.join(process.cwd(), 'src', 'app.module.ts');

        try {
            let content = fs.readFileSync(appModulePath, 'utf-8');
            const moduleName = `${modelName}Module`;
            const importPath = `./modules/${this.toKebabCase(modelName)}/${this.toKebabCase(modelName)}.module`;

            // إضافة الـ import
            const importStatement = `import { ${moduleName} } from '${importPath}';\n`;
            if (!content.includes(moduleName)) {
                content = importStatement + content;
            }

            // إضافة للـ imports array
            const importsMatch = content.match(/imports:\s*\[([\s\S]*?)\]/);
            if (importsMatch && !importsMatch[1].includes(moduleName)) {
                const newImports = importsMatch[1].trim() + `,\n        ${moduleName}`;
                content = content.replace(importsMatch[0], `imports: [${newImports}]`);
            }

            fs.writeFileSync(appModulePath, content);
            this.logger.log(`✅ Updated app.module.ts with ${moduleName}`);

            return { success: true, message: `Added ${moduleName} to app.module.ts` };

        } catch (error) {
            this.logger.error(`Failed to update app.module: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * 🔥 إنشاء module كامل وتسجيله
     */
    async createAndRegisterModule(modelName: string, fields: string[]): Promise<{
        success: boolean;
        message: string;
    }> {
        // 1. إنشاء الملفات
        const filesResult = await this.createModuleFiles(modelName, fields);
        if (!filesResult.success) {
            return { success: false, message: filesResult.message };
        }

        // 2. تحديث app.module
        const appModuleResult = await this.updateAppModule(modelName);
        if (!appModuleResult.success) {
            return { success: false, message: appModuleResult.message };
        }

        return {
            success: true,
            message: `Successfully created and registered ${modelName} module with ${filesResult.createdFiles.length} files`
        };
    }

    // Helper methods
    private toKebabCase(str: string): string {
        return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    }

    private toCamelCase(str: string): string {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    // ============================================
    // 🎨 FRONTEND GENERATION METHODS
    // ============================================

    private readonly frontendPath = path.join(process.cwd(), '..', 'web-admin', 'src');

    /**
     * 🎨 توليد Frontend Service
     */
    generateFrontendService(modelName: string): string {
        const serviceName = `${this.toCamelCase(modelName)}Service`;
        const routePath = this.toKebabCase(modelName);

        return `import { api } from './api.service';

interface ${modelName} {
    id: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    [key: string]: any;
}

class ${modelName}Service {
    private readonly baseUrl = '/${routePath}';

    async getAll(): Promise<${modelName}[]> {
        return await api.get(this.baseUrl);
    }

    async getById(id: string): Promise<${modelName}> {
        return await api.get(\`\${this.baseUrl}/\${id}\`);
    }

    async create(data: Partial<${modelName}>): Promise<${modelName}> {
        return await api.post(this.baseUrl, data);
    }

    async update(id: string, data: Partial<${modelName}>): Promise<${modelName}> {
        return await api.put(\`\${this.baseUrl}/\${id}\`, data);
    }

    async delete(id: string): Promise<void> {
        return await api.delete(\`\${this.baseUrl}/\${id}\`);
    }
}

export const ${serviceName} = new ${modelName}Service();
`;
    }

    /**
     * 🎨 توليد Frontend Page (React Component)
     */
    generateFrontendPage(modelName: string, fields: string[]): string {
        const serviceName = `${this.toCamelCase(modelName)}Service`;
        const titleArabic = this.getArabicTitle(modelName);

        return `import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Box, Button, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Snackbar, Alert, CircularProgress, Chip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { ${serviceName} } from '../../services/${this.toKebabCase(modelName)}.service';

export default function ${modelName}Page() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editItem, setEditItem] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    const fetchData = async () => {
        setLoading(true);
        try {
            const result = await ${serviceName}.getAll();
            setData(result);
        } catch (error) {
            console.error('Error fetching data:', error);
            setSnackbar({ open: true, message: 'فشل في جلب البيانات', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async () => {
        try {
            if (editItem) {
                await ${serviceName}.update(editItem.id, formData);
                setSnackbar({ open: true, message: 'تم التحديث بنجاح', severity: 'success' });
            } else {
                await ${serviceName}.create(formData);
                setSnackbar({ open: true, message: 'تم الإضافة بنجاح', severity: 'success' });
            }
            setDialogOpen(false);
            setFormData({});
            setEditItem(null);
            fetchData();
        } catch (error) {
            setSnackbar({ open: true, message: 'حدث خطأ', severity: 'error' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        try {
            await ${serviceName}.delete(id);
            setSnackbar({ open: true, message: 'تم الحذف بنجاح', severity: 'success' });
            fetchData();
        } catch (error) {
            setSnackbar({ open: true, message: 'فشل في الحذف', severity: 'error' });
        }
    };

    const handleEdit = (item: any) => {
        setEditItem(item);
        setFormData(item);
        setDialogOpen(true);
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">📊 ${titleArabic}</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData}>تحديث</Button>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditItem(null); setFormData({}); setDialogOpen(true); }}>
                        إضافة جديد
                    </Button>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'primary.main' }}>
                                <TableCell sx={{ color: 'white' }}>#</TableCell>
${fields.map(f => `                                <TableCell sx={{ color: 'white' }}>${f}</TableCell>`).join('\n')}
                                <TableCell sx={{ color: 'white' }}>الإجراءات</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.map((row, index) => (
                                <TableRow key={row.id}>
                                    <TableCell>{index + 1}</TableCell>
${fields.map(f => `                                    <TableCell>{row.${f}}</TableCell>`).join('\n')}
                                    <TableCell>
                                        <IconButton color="primary" onClick={() => handleEdit(row)}><EditIcon /></IconButton>
                                        <IconButton color="error" onClick={() => handleDelete(row.id)}><DeleteIcon /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editItem ? 'تعديل' : 'إضافة جديد'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
${fields.map(f => `                        <TextField label="${f}" value={formData.${f} || ''} onChange={(e) => setFormData({ ...formData, ${f}: e.target.value })} fullWidth />`).join('\n')}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
                    <Button variant="contained" onClick={handleSubmit}>حفظ</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
            </Snackbar>
        </Container>
    );
}
`;
    }

    /**
     * 📂 إنشاء ملفات Frontend
     */
    async createFrontendFiles(modelName: string, fields: string[]): Promise<{
        success: boolean;
        createdFiles: string[];
        message: string;
    }> {
        const createdFiles: string[] = [];

        try {
            // 1. إنشاء Service
            const servicePath = path.join(this.frontendPath, 'services', `${this.toKebabCase(modelName)}.service.ts`);
            fs.writeFileSync(servicePath, this.generateFrontendService(modelName));
            createdFiles.push(servicePath);
            this.logger.log(`✅ Created frontend service: ${servicePath}`);

            // 2. إنشاء Page
            const pagesPath = path.join(this.frontendPath, 'pages', this.toKebabCase(modelName));
            if (!fs.existsSync(pagesPath)) {
                fs.mkdirSync(pagesPath, { recursive: true });
            }
            const pagePath = path.join(pagesPath, `${modelName}Page.tsx`);
            fs.writeFileSync(pagePath, this.generateFrontendPage(modelName, fields));
            createdFiles.push(pagePath);
            this.logger.log(`✅ Created frontend page: ${pagePath}`);

            // 3. Update Router (App.tsx)
            await this.updateFrontendRouter(modelName);

            // 4. Update Sidebar (MainLayout.tsx)
            await this.updateSidebar(modelName);

            return {
                success: true,
                createdFiles,
                message: `Created ${createdFiles.length} frontend files for ${modelName}`
            };

        } catch (error) {
            this.logger.error(`Failed to create frontend files: ${error.message}`);
            return {
                success: false,
                createdFiles,
                message: error.message
            };
        }
    }

    /**
     * 🔄 تحديث Router - يضيف الـ lazy import والـ route
     */
    async updateFrontendRouter(modelName: string): Promise<{ success: boolean; message: string }> {
        const appPath = path.join(this.frontendPath, 'App.tsx');

        try {
            if (!fs.existsSync(appPath)) {
                this.logger.warn('App.tsx not found, skipping router update');
                return { success: true, message: 'App.tsx not found, skipped' };
            }

            let content = fs.readFileSync(appPath, 'utf-8');
            const pageName = `${modelName}Page`;
            const routePath = this.toKebabCase(modelName);
            const importPath = `./pages/${routePath}/${pageName}`;

            // Check if already added
            if (content.includes(`const ${pageName} =`)) {
                this.logger.log(`${pageName} already exists in App.tsx`);
                return { success: true, message: `${pageName} already exists` };
            }

            // 1. Add lazy import after TasksPage import
            const lazyImport = `const ${pageName} = lazy(() => import('${importPath}'));`;
            const tasksPagePattern = /const TasksPage = lazy\([^)]+\)\);/;
            const tasksMatch = content.match(tasksPagePattern);

            if (tasksMatch) {
                const insertPos = tasksMatch.index! + tasksMatch[0].length;
                content = content.slice(0, insertPos) + '\n' + lazyImport + content.slice(insertPos);
            } else {
                // Fallback: add before PageLoader
                const pageLoaderMatch = content.indexOf('// Loading component');
                if (pageLoaderMatch > 0) {
                    content = content.slice(0, pageLoaderMatch) + lazyImport + '\n\n' + content.slice(pageLoaderMatch);
                }
            }

            // 2. Add route before custody route
            const routeElement = `          <Route path="${routePath}" element={
            <Suspense fallback={<PageLoader />}>
              <${pageName} />
            </Suspense>
          } />`;

            const custodyPattern = /<Route path="custody">/;
            const custodyMatch = content.match(custodyPattern);

            if (custodyMatch) {
                const insertPos = custodyMatch.index!;
                content = content.slice(0, insertPos) + routeElement + '\n          ' + content.slice(insertPos);
            }

            fs.writeFileSync(appPath, content);
            this.logger.log(`✅ Updated App.tsx with ${pageName} lazy import and route`);

            return { success: true, message: `Added ${pageName} route successfully` };

        } catch (error) {
            this.logger.error(`Failed to update router: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * 🔥 إنشاء كل شيء (Backend + Frontend) مع Auto-Rebuild!
     */
    async createFullStack(modelName: string, fields: string[]): Promise<{
        success: boolean;
        message: string;
        backend: { success: boolean; message: string };
        frontend: { success: boolean; message: string };
        rebuild: { backend: boolean; frontend: boolean };
    }> {
        // 1. Backend
        const backendResult = await this.createAndRegisterModule(modelName, fields);

        // 2. Frontend
        const frontendResult = await this.createFrontendFiles(modelName, fields);

        // 3. Auto-Rebuild
        const rebuildResult = { backend: false, frontend: false };

        if (backendResult.success) {
            this.logger.log('🔄 Starting Backend Auto-Rebuild...');
            const backendRebuild = await this.rebuildBackend();
            rebuildResult.backend = backendRebuild.success;
        }

        if (frontendResult.success) {
            this.logger.log('🔄 Starting Frontend Auto-Rebuild...');
            const frontendRebuild = await this.rebuildFrontend();
            rebuildResult.frontend = frontendRebuild.success;
        }

        return {
            success: backendResult.success && frontendResult.success,
            message: `Backend: ${backendResult.message}, Frontend: ${frontendResult.message}`,
            backend: backendResult,
            frontend: frontendResult,
            rebuild: rebuildResult
        };
    }

    private getArabicTitle(modelName: string): string {
        const translations: Record<string, string> = {
            'VehicleMileage': 'تتبع الكيلومترات',
            'SalesCommission': 'عمولات المبيعات',
            'Training': 'التدريب',
        };
        return translations[modelName] || modelName;
    }

    // ============================================
    // 🔄 AUTO-REBUILD METHODS
    // ============================================

    /**
     * 🔧 إعادة بناء الـ Backend - يشتغل في الـ Background!
     */
    async rebuildBackend(): Promise<{ success: boolean; message: string }> {
        const { exec } = require('child_process');
        const backendPath = process.cwd();

        this.logger.log('🔧 Starting Background Backend Rebuild...');

        // 🔥 نشغل الـ rebuild في الـ background من غير ما نستنى!
        // ده يمنع الـ 502 error لأن الـ response بترجع فوراً
        setImmediate(() => {
            exec('npx prisma generate && npx prisma db push --accept-data-loss && npm run build && pm2 restart attendance-backend',
                { cwd: backendPath, timeout: 300000 },
                (error: any, stdout: string, stderr: string) => {
                    if (error) {
                        this.logger.error(`❌ Background rebuild failed: ${stderr || error.message}`);
                    } else {
                        this.logger.log('✅ Background rebuild completed successfully!');
                    }
                }
            );
        });

        // نرجع فوراً - الـ rebuild بيحصل في الـ background
        return {
            success: true,
            message: '🚀 Rebuild started in background. System will restart automatically in ~30 seconds.'
        };
    }

    /**
     * 📋 تحديث Sidebar - يضيف item جديد للـ MainLayout
     */
    async updateSidebar(modelName: string): Promise<{ success: boolean; message: string }> {
        const layoutPath = path.join(this.frontendPath, 'components', 'layout', 'MainLayout.tsx');

        try {
            if (!fs.existsSync(layoutPath)) {
                this.logger.warn('MainLayout.tsx not found, skipping sidebar update');
                return { success: true, message: 'MainLayout.tsx not found, skipped' };
            }

            let content = fs.readFileSync(layoutPath, 'utf-8');
            const routePath = this.toKebabCase(modelName);
            const titleArabic = this.getArabicTitle(modelName);

            // Check if already added
            if (content.includes(`path: '/${routePath}'`)) {
                this.logger.log(`${modelName} already exists in sidebar`);
                return { success: true, message: `${modelName} already exists in sidebar` };
            }

            // Add new menu item before "// Settings" section
            const newMenuItem = `  { text: '${titleArabic}', icon: <AutoAwesome />, path: '/${routePath}', requiredRole: 'ADMIN' },`;

            const settingsPattern = /\/\/ Settings/;
            const settingsMatch = content.match(settingsPattern);

            if (settingsMatch) {
                const insertPos = settingsMatch.index!;
                content = content.slice(0, insertPos) + '\n  ' + newMenuItem + '\n\n  ' + content.slice(insertPos);
                fs.writeFileSync(layoutPath, content);
                this.logger.log(`✅ Added ${modelName} to sidebar menu`);
            }

            return { success: true, message: `Added ${modelName} to sidebar` };

        } catch (error) {
            this.logger.error(`Failed to update sidebar: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * 🎨 إعادة بناء الـ Frontend
     */
    async rebuildFrontend(): Promise<{ success: boolean; message: string }> {
        const { exec } = require('child_process');
        const frontendPath = path.join(process.cwd(), '..', 'web-admin');

        return new Promise((resolve) => {
            this.logger.log('🎨 Rebuilding Frontend...');

            exec('npm run build',
                { cwd: frontendPath, timeout: 180000 },
                (error: any, stdout: string, stderr: string) => {
                    if (error) {
                        this.logger.error(`Frontend rebuild failed: ${stderr}`);
                        resolve({ success: false, message: stderr || error.message });
                    } else {
                        this.logger.log('✅ Frontend rebuilt successfully!');
                        resolve({ success: true, message: 'Frontend rebuilt and deployed' });
                    }
                }
            );
        });
    }
}
