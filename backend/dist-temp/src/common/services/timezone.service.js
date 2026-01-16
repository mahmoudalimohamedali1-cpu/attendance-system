"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimezoneService = void 0;
const common_1 = require("@nestjs/common");
let TimezoneService = class TimezoneService {
    constructor() {
        this.DEFAULT_TIMEZONE = 'Asia/Riyadh';
    }
    getLocalToday(timezone) {
        const tz = timezone || this.DEFAULT_TIMEZONE;
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
        const parts = formatter.formatToParts(now);
        const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024');
        const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
        const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
        return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }
    getCurrentTimeMinutes(timezone) {
        const tz = timezone || this.DEFAULT_TIMEZONE;
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
        const timeStr = formatter.format(now);
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
    parseDate(dateStr, timezone) {
        const tz = timezone || this.DEFAULT_TIMEZONE;
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
    getYearRange(year) {
        return {
            startOfYear: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
            endOfYear: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
        };
    }
    getMonthRange(year, month) {
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        return { startDate, endDate };
    }
    async getCompanyTimezone(companyId) {
        return this.DEFAULT_TIMEZONE;
    }
    isValidTimezone(timezone) {
        try {
            Intl.DateTimeFormat(undefined, { timeZone: timezone });
            return true;
        }
        catch {
            return false;
        }
    }
    getSupportedTimezones() {
        return [
            'Asia/Riyadh',
            'Asia/Dubai',
            'Africa/Cairo',
            'Asia/Kuwait',
            'Asia/Bahrain',
            'Asia/Qatar',
            'Asia/Muscat',
            'Asia/Amman',
            'Asia/Beirut',
            'Europe/London',
            'America/New_York',
        ];
    }
};
exports.TimezoneService = TimezoneService;
exports.TimezoneService = TimezoneService = __decorate([
    (0, common_1.Injectable)()
], TimezoneService);
//# sourceMappingURL=timezone.service.js.map