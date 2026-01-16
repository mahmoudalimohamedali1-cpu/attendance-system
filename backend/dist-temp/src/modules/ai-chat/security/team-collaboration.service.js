"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TeamCollaborationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamCollaborationService = void 0;
const common_1 = require("@nestjs/common");
let TeamCollaborationService = TeamCollaborationService_1 = class TeamCollaborationService {
    constructor() {
        this.logger = new common_1.Logger(TeamCollaborationService_1.name);
        this.teamMembers = [
            { id: '1', name: 'Ahmed Mohammed', nameAr: 'أحمد محمد', department: 'Engineering', departmentAr: 'الهندسة', role: 'Senior Developer', roleAr: 'مطور أول', skills: ['javascript', 'python', 'react'], email: 'ahmed@company.com', location: 'Riyadh', availability: 'available' },
            { id: '2', name: 'Sara Abdullah', nameAr: 'سارة عبدالله', department: 'HR', departmentAr: 'الموارد البشرية', role: 'HR Manager', roleAr: 'مدير موارد بشرية', skills: ['recruitment', 'training', 'labor_law'], email: 'sara@company.com', location: 'Riyadh', availability: 'busy' },
            { id: '3', name: 'Khalid Omar', nameAr: 'خالد عمر', department: 'Engineering', departmentAr: 'الهندسة', role: 'DevOps Engineer', roleAr: 'مهندس DevOps', skills: ['docker', 'kubernetes', 'aws'], email: 'khalid@company.com', location: 'Jeddah', availability: 'available' },
            { id: '4', name: 'Fatima Hassan', nameAr: 'فاطمة حسن', department: 'Finance', departmentAr: 'المالية', role: 'Accountant', roleAr: 'محاسب', skills: ['excel', 'sap', 'budgeting'], email: 'fatima@company.com', location: 'Riyadh', availability: 'away' },
            { id: '5', name: 'Mohammed Ali', nameAr: 'محمد علي', department: 'Sales', departmentAr: 'المبيعات', role: 'Sales Lead', roleAr: 'قائد مبيعات', skills: ['negotiation', 'crm', 'presentation'], email: 'mohammed@company.com', location: 'Dammam', availability: 'available' },
        ];
        this.requests = new Map();
        this.moodData = new Map();
    }
    findBySkill(skill) {
        const normalized = skill.toLowerCase();
        const skillNames = {
            javascript: 'جافاسكريبت',
            python: 'بايثون',
            react: 'رياكت',
            docker: 'دوكر',
            aws: 'AWS',
            excel: 'إكسل',
            recruitment: 'التوظيف',
            training: 'التدريب',
        };
        const experts = this.teamMembers.filter(m => m.skills.some(s => s.toLowerCase().includes(normalized)));
        return {
            skill: normalized,
            skillAr: skillNames[normalized] || skill,
            experts,
            learners: [],
        };
    }
    getTeamByDepartment(department) {
        return this.teamMembers.filter(m => m.department.toLowerCase().includes(department.toLowerCase()) ||
            m.departmentAr.includes(department));
    }
    checkAvailability(userId) {
        const member = this.teamMembers.find(m => m.id === userId);
        if (!member) {
            return { available: false, status: 'unknown', statusAr: 'غير معروف' };
        }
        const statusMap = {
            available: { available: true, statusAr: 'متاح' },
            busy: { available: false, statusAr: 'مشغول' },
            away: { available: false, statusAr: 'بعيد' },
            offline: { available: false, statusAr: 'غير متصل' },
        };
        const status = statusMap[member.availability];
        return {
            available: status.available,
            status: member.availability,
            statusAr: status.statusAr,
        };
    }
    requestCollaboration(fromUserId, fromUserName, toUserId, type, message) {
        const toMember = this.teamMembers.find(m => m.id === toUserId);
        if (!toMember) {
            return { success: false, message: '❌ الموظف غير موجود' };
        }
        const typeNames = {
            help: 'طلب مساعدة',
            meeting: 'طلب اجتماع',
            review: 'طلب مراجعة',
            mentoring: 'طلب إرشاد',
        };
        const requestId = `COLLAB-${Date.now().toString(36).toUpperCase()}`;
        const request = {
            id: requestId,
            fromUserId,
            fromUserName,
            toUserId,
            toUserName: toMember.nameAr,
            type,
            typeAr: typeNames[type],
            message,
            status: 'pending',
            createdAt: new Date(),
        };
        this.requests.set(requestId, request);
        return {
            success: true,
            request,
            message: `✅ تم إرسال ${typeNames[type]} إلى ${toMember.nameAr}`,
        };
    }
    submitMood(userId, mood) {
        const today = new Date().toISOString().split('T')[0];
        const todayMoods = this.moodData.get(today) || [];
        todayMoods.push(Math.min(5, Math.max(1, mood)));
        this.moodData.set(today, todayMoods);
        const moodEmojis = ['😢', '😕', '😐', '🙂', '😊'];
        return {
            success: true,
            message: `${moodEmojis[mood - 1]} شكراً لمشاركتك! تم تسجيل حالتك.`,
        };
    }
    getTeamMood() {
        const today = new Date().toISOString().split('T')[0];
        const moods = this.moodData.get(today) || [3, 4, 4, 3, 5, 4];
        const distribution = [1, 2, 3, 4, 5].map(level => ({
            mood: ['😢', '😕', '😐', '🙂', '😊'][level - 1],
            count: moods.filter(m => m === level).length,
            percentage: Math.round((moods.filter(m => m === level).length / moods.length) * 100),
        }));
        const average = moods.reduce((a, b) => a + b, 0) / moods.length;
        return {
            date: new Date(),
            responses: moods.length,
            averageMood: Math.round(average * 10) / 10,
            distribution,
            trend: average >= 3.5 ? 'improving' : average >= 2.5 ? 'stable' : 'declining',
        };
    }
    formatSkillSearch(result) {
        if (result.experts.length === 0) {
            return `❌ لم أجد خبراء في "${result.skillAr}"\n\nجرب: javascript, python, excel, recruitment`;
        }
        let message = `🎯 **خبراء ${result.skillAr}:**\n\n`;
        for (const expert of result.experts) {
            const availIcon = { available: '🟢', busy: '🟡', away: '🟠', offline: '⚫' }[expert.availability];
            message += `${availIcon} **${expert.nameAr}**\n`;
            message += `   📍 ${expert.departmentAr} | ${expert.roleAr}\n`;
            message += `   📧 ${expert.email}\n\n`;
        }
        return message;
    }
    formatTeamDirectory(department) {
        const members = department ? this.getTeamByDepartment(department) : this.teamMembers;
        if (members.length === 0) {
            return '❌ لم يتم العثور على موظفين';
        }
        let message = department ? `👥 **فريق ${department}:**\n\n` : '👥 **دليل الموظفين:**\n\n';
        for (const member of members) {
            const availIcon = { available: '🟢', busy: '🟡', away: '🟠', offline: '⚫' }[member.availability];
            message += `${availIcon} **${member.nameAr}** - ${member.roleAr}\n`;
            message += `   📍 ${member.location} | 📧 ${member.email}\n\n`;
        }
        return message;
    }
    formatTeamMood() {
        const mood = this.getTeamMood();
        const trendEmoji = { improving: '📈', stable: '➡️', declining: '📉' }[mood.trend];
        let message = `😊 **حالة الفريق اليوم:**\n\n`;
        message += `📊 المتوسط: ${mood.averageMood}/5\n`;
        message += `👥 المشاركين: ${mood.responses}\n`;
        message += `${trendEmoji} الاتجاه: ${mood.trend === 'improving' ? 'تحسن' : mood.trend === 'stable' ? 'مستقر' : 'انخفاض'}\n\n`;
        message += `**التوزيع:**\n`;
        for (const d of mood.distribution) {
            const bar = '█'.repeat(Math.ceil(d.percentage / 10));
            message += `${d.mood} ${bar} ${d.percentage}%\n`;
        }
        return message;
    }
};
exports.TeamCollaborationService = TeamCollaborationService;
exports.TeamCollaborationService = TeamCollaborationService = TeamCollaborationService_1 = __decorate([
    (0, common_1.Injectable)()
], TeamCollaborationService);
//# sourceMappingURL=team-collaboration.service.js.map