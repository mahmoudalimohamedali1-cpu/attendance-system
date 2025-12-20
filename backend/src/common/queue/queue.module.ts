import { Module, Global } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

@Global()
@Module({
    providers: [
        {
            provide: 'BULLMQ_QUEUES',
            useFactory: (redis: Redis) => {
                // تعريف القوائم المشتركة
                return {
                    payroll: new Queue('payroll', { connection: redis }),
                    notifications: new Queue('notifications', { connection: redis }),
                    reports: new Queue('reports', { connection: redis }),
                };
            },
            inject: ['REDIS_CLIENT'],
        },
    ],
    exports: ['BULLMQ_QUEUES'],
})
export class QueueModule { }
