"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
let QueueModule = class QueueModule {
};
exports.QueueModule = QueueModule;
exports.QueueModule = QueueModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: 'BULLMQ_QUEUES',
                useFactory: (redis) => {
                    return {
                        payroll: new bullmq_1.Queue('payroll', { connection: redis }),
                        notifications: new bullmq_1.Queue('notifications', { connection: redis }),
                        reports: new bullmq_1.Queue('reports', { connection: redis }),
                    };
                },
                inject: ['REDIS_CLIENT'],
            },
        ],
        exports: ['BULLMQ_QUEUES'],
    })
], QueueModule);
//# sourceMappingURL=queue.module.js.map