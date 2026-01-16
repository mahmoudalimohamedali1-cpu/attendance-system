"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var StatisticsDashboardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsDashboardService = void 0;
const common_1 = require("@nestjs/common");
let StatisticsDashboardService = StatisticsDashboardService_1 = class StatisticsDashboardService {
    constructor() {
        this.logger = new common_1.Logger(StatisticsDashboardService_1.name);
    }
    getDashboardStats() {
        const total = 150;
        const present = 120 + Math.floor(Math.random() * 20);
        const late = 5 + Math.floor(Math.random() * 5);
        const onLeave = 8 + Math.floor(Math.random() * 5);
        const absent = total - present - late - onLeave;
        return {
            attendance: {
                present,
                absent: Math.max(0, absent),
                late,
                onLeave,
                total,
                rate: Math.round((present / total) * 100),
            },
            leaves: {
                pending: 5 + Math.floor(Math.random() * 5),
                approved: 12 + Math.floor(Math.random() * 8),
                rejected: 2 + Math.floor(Math.random() * 3),
            },
            payroll: {
                totalSalaries: 1500000 + Math.floor(Math.random() * 200000),
                processed: 140 + Math.floor(Math.random() * 10),
                pending: 5 + Math.floor(Math.random() * 5),
            },
            tasks: {
                completed: 45 + Math.floor(Math.random() * 15),
                inProgress: 23 + Math.floor(Math.random() * 10),
                overdue: 3 + Math.floor(Math.random() * 3),
            },
        };
    }
    getKPIs() {
        return [
            { id: '1', name: 'Attendance Rate', nameAr: 'معدل الحضور', value: 94.5, target: 95, unit: '%', trend: 'up', change: 1.2, period: 'monthly' },
            { id: '2', name: 'Employee Satisfaction', nameAr: 'رضا الموظفين', value: 4.2, target: 4.5, unit: '/5', trend: 'stable', change: 0, period: 'quarterly' },
            { id: '3', name: 'Turnover Rate', nameAr: 'معدل الدوران', value: 8.5, target: 10, unit: '%', trend: 'down', change: -1.5, period: 'quarterly' },
            { id: '4', name: 'Training Hours', nameAr: 'ساعات التدريب', value: 24, target: 20, unit: 'hrs', trend: 'up', change: 4, period: 'monthly' },
            { id: '5', name: 'Goal Completion', nameAr: 'إنجاز الأهداف', value: 78, target: 80, unit: '%', trend: 'up', change: 5, period: 'monthly' },
            { id: '6', name: 'Average Overtime', nameAr: 'متوسط الوقت الإضافي', value: 12, target: 10, unit: 'hrs', trend: 'down', change: -2, period: 'monthly' },
        ];
    }
    getComparisons(period = 'month') {
        return [
            { metric: 'attendance', metricAr: 'الحضور', current: 94.5, previous: 93.2, change: 1.3, changePercent: 1.4, better: true },
            { metric: 'leaves', metricAr: 'الإجازات', current: 45, previous: 52, change: -7, changePercent: -13.5, better: true },
            { metric: 'overtime', metricAr: 'العمل الإضافي', current: 320, previous: 380, change: -60, changePercent: -15.8, better: true },
            { metric: 'late_arrivals', metricAr: 'التأخيرات', current: 28, previous: 35, change: -7, changePercent: -20, better: true },
            { metric: 'new_hires', metricAr: 'التعيينات', current: 8, previous: 5, change: 3, changePercent: 60, better: true },
            { metric: 'resignations', metricAr: 'الاستقالات', current: 3, previous: 2, change: 1, changePercent: 50, better: false },
        ];
    }
    getTrendData(metric, days = 30) {
        const points = [];
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const value = 80 + Math.random() * 20;
            points.push({ date, value });
            sum += value;
            min = Math.min(min, value);
            max = Math.max(max, value);
        }
        const metricNames = {
            attendance: 'الحضور',
            productivity: 'الإنتاجية',
            satisfaction: 'الرضا',
        };
        return {
            metric,
            metricAr: metricNames[metric] || metric,
            points,
            average: Math.round((sum / points.length) * 10) / 10,
            min: Math.round(min * 10) / 10,
            max: Math.round(max * 10) / 10,
        };
    }
    formatDashboardStats() {
        const stats = this.getDashboardStats();
        let message = `📊 **لوحة المعلومات المباشرة:**\n\n`;
        message += `**👥 الحضور:**\n`;
        message += `🟢 حاضر: ${stats.attendance.present}\n`;
        message += `🟡 متأخر: ${stats.attendance.late}\n`;
        message += `🟠 إجازة: ${stats.attendance.onLeave}\n`;
        message += `🔴 غائب: ${stats.attendance.absent}\n`;
        message += `📈 المعدل: ${stats.attendance.rate}%\n\n`;
        message += `**🏖️ الإجازات:**\n`;
        message += `⏳ معلقة: ${stats.leaves.pending}\n`;
        message += `✅ موافق عليها: ${stats.leaves.approved}\n\n`;
        message += `**📋 المهام:**\n`;
        message += `✅ مكتملة: ${stats.tasks.completed}\n`;
        message += `🔄 قيد التنفيذ: ${stats.tasks.inProgress}\n`;
        message += `⚠️ متأخرة: ${stats.tasks.overdue}`;
        return message;
    }
    formatKPIs() {
        const kpis = this.getKPIs();
        let message = `🎯 **مؤشرات الأداء الرئيسية:**\n\n`;
        for (const kpi of kpis) {
            const achieved = kpi.value >= kpi.target;
            const trendEmoji = { up: '📈', down: '📉', stable: '➡️' }[kpi.trend];
            const statusEmoji = achieved ? '✅' : '⚠️';
            message += `${statusEmoji} **${kpi.nameAr}**\n`;
            message += `   ${kpi.value}${kpi.unit} / ${kpi.target}${kpi.unit} ${trendEmoji}\n\n`;
        }
        return message;
    }
    formatComparisons() {
        const comparisons = this.getComparisons();
        let message = `📈 **مقارنة الشهر الحالي بالسابق:**\n\n`;
        for (const comp of comparisons) {
            const emoji = comp.better ? '✅' : '⚠️';
            const arrow = comp.change > 0 ? '↑' : comp.change < 0 ? '↓' : '→';
            message += `${emoji} **${comp.metricAr}**\n`;
            message += `   ${comp.current} ${arrow} ${Math.abs(comp.changePercent)}%\n\n`;
        }
        return message;
    }
    formatSparkline(data) {
        const normalized = data.points.slice(-10).map(p => {
            const range = data.max - data.min || 1;
            return Math.round(((p.value - data.min) / range) * 7);
        });
        const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        const sparkline = normalized.map(n => bars[n]).join('');
        return `📈 ${data.metricAr}: ${sparkline} (${data.average}%)`;
    }
};
exports.StatisticsDashboardService = StatisticsDashboardService;
exports.StatisticsDashboardService = StatisticsDashboardService = StatisticsDashboardService_1 = __decorate([
    (0, common_1.Injectable)()
], StatisticsDashboardService);
//# sourceMappingURL=statistics-dashboard.service.js.map