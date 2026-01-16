import { PrismaService } from '../../common/prisma/prisma.service';
export declare class SchemaDiscoveryService {
    private readonly prisma;
    private readonly logger;
    private cachedSchema;
    private lastCacheTime;
    private readonly CACHE_DURATION;
    private readonly schemaPath;
    constructor(prisma: PrismaService);
    invalidateCache(): void;
    private readDynamicSchema;
    private mapPrismaType;
    getAllTables(): Promise<string[]>;
    getSearchableFields(): Promise<Array<{
        path: string;
        type: string;
        table: string;
        description: string;
    }>>;
    getCompactSchema(): Promise<string>;
    parseFieldPath(fieldPath: string): {
        table: string;
        field: string;
    };
}
