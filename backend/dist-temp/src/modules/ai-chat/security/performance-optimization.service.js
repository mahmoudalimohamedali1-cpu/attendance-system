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
var PerformanceOptimizationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceOptimizationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../common/prisma/prisma.service");
let PerformanceOptimizationService = PerformanceOptimizationService_1 = class PerformanceOptimizationService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(PerformanceOptimizationService_1.name);
        this.queryCache = new Map();
        this.QUERY_CACHE_TTL = 60 * 1000;
        this.MAX_CACHE_ENTRIES = 500;
        this.aiQueue = [];
        this.aiConcurrency = 0;
        this.MAX_AI_CONCURRENCY = 3;
        this.cleanupInterval = setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
    }
    onModuleDestroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
    async getCachedOrExecute(key, queryFn, ttl = this.QUERY_CACHE_TTL) {
        const cacheKey = this.hashKey(key);
        const cached = this.queryCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data;
        }
        const data = await queryFn();
        if (this.queryCache.size >= this.MAX_CACHE_ENTRIES) {
            const oldestKey = this.queryCache.keys().next().value;
            if (oldestKey)
                this.queryCache.delete(oldestKey);
        }
        this.queryCache.set(cacheKey, { data, timestamp: Date.now(), ttl });
        return data;
    }
    invalidateCache(pattern) {
        if (!pattern) {
            const count = this.queryCache.size;
            this.queryCache.clear();
            return count;
        }
        let count = 0;
        for (const key of this.queryCache.keys()) {
            if (key.includes(pattern)) {
                this.queryCache.delete(key);
                count++;
            }
        }
        return count;
    }
    cleanupCache() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.queryCache) {
            if (now - entry.timestamp > entry.ttl) {
                this.queryCache.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
        }
    }
    parsePagination(params) {
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 20));
        const skip = params.skip ?? (page - 1) * limit;
        const take = params.take ?? limit;
        return { skip, take, page, limit };
    }
    createPaginatedResult(data, total, pagination) {
        return {
            data,
            total,
            page: pagination.page,
            limit: pagination.limit,
            hasMore: pagination.page * pagination.limit < total,
        };
    }
    async getPaginatedEmployees(companyId, params, filters) {
        const { skip, take, page, limit } = this.parsePagination(params);
        const where = { companyId };
        if (filters?.department)
            where.departmentId = filters.department;
        if (filters?.status)
            where.status = filters.status;
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { employeeCode: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const cacheKey = `employees:${companyId}:${JSON.stringify({ skip, take, filters })}`;
        return this.getCachedOrExecute(cacheKey, async () => {
            const [data, total] = await Promise.all([
                this.prisma.user.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.user.count({ where }),
            ]);
            const slimmedData = this.slimEmployeeResponses(data);
            return this.createPaginatedResult(slimmedData, total, { page, limit });
        });
    }
    async parallelExecute(items, processor, concurrency = 5) {
        const results = [];
        const executing = [];
        for (const item of items) {
            const promise = processor(item).then(result => {
                results.push(result);
            });
            executing.push(promise);
            if (executing.length >= concurrency) {
                await Promise.race(executing);
                const completed = executing.filter(p => p.then(() => false).catch(() => false));
                executing.splice(0, completed.length);
            }
        }
        await Promise.all(executing);
        return results;
    }
    async batchProcess(items, batchSize, processor) {
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            await processor(batch);
        }
    }
    async queueAIRequest(fn, priority = 0) {
        return new Promise((resolve, reject) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            this.aiQueue.push({ id, resolve, reject, fn, priority });
            this.aiQueue.sort((a, b) => b.priority - a.priority);
            this.processAIQueue();
        });
    }
    async processAIQueue() {
        if (this.aiConcurrency >= this.MAX_AI_CONCURRENCY || this.aiQueue.length === 0) {
            return;
        }
        const request = this.aiQueue.shift();
        if (!request)
            return;
        this.aiConcurrency++;
        try {
            const result = await request.fn();
            request.resolve(result);
        }
        catch (error) {
            request.reject(error);
        }
        finally {
            this.aiConcurrency--;
            this.processAIQueue();
        }
    }
    hashKey(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
    getCacheStats() {
        return {
            size: this.queryCache.size,
            maxSize: this.MAX_CACHE_ENTRIES,
            aiQueueLength: this.aiQueue.length,
            aiConcurrency: this.aiConcurrency,
        };
    }
    async cleanupOldBackups(directory, maxAgeDays = 7) {
        this.logger.log(`Cleanup requested for ${directory}, max age: ${maxAgeDays} days`);
        return 0;
    }
    slimEmployeeResponse(employee) {
        if (!employee)
            return null;
        return {
            id: employee.id,
            name: employee.name,
            email: employee.email,
            employeeCode: employee.employeeCode,
            phone: employee.phone,
            department: employee.department?.name,
            jobTitle: employee.jobTitle?.name,
            status: employee.status,
        };
    }
    slimEmployeeResponses(employees) {
        return employees.map(e => this.slimEmployeeResponse(e));
    }
};
exports.PerformanceOptimizationService = PerformanceOptimizationService;
exports.PerformanceOptimizationService = PerformanceOptimizationService = PerformanceOptimizationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PerformanceOptimizationService);
//# sourceMappingURL=performance-optimization.service.js.map