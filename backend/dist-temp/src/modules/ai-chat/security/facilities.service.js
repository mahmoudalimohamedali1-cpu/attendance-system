"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FacilitiesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacilitiesService = void 0;
const common_1 = require("@nestjs/common");
let FacilitiesService = FacilitiesService_1 = class FacilitiesService {
    constructor() {
        this.logger = new common_1.Logger(FacilitiesService_1.name);
        this.rooms = [
            { id: '1', name: 'Innovation Hub', nameAr: 'مركز الابتكار', floor: 1, capacity: 20, amenities: ['projector', 'whiteboard', 'video_conf'], available: true },
            { id: '2', name: 'Executive Suite', nameAr: 'قاعة التنفيذيين', floor: 3, capacity: 12, amenities: ['projector', 'video_conf', 'catering'], available: true },
            { id: '3', name: 'Focus Room A', nameAr: 'غرفة التركيز أ', floor: 2, capacity: 4, amenities: ['whiteboard'], available: true },
            { id: '4', name: 'Training Center', nameAr: 'مركز التدريب', floor: 1, capacity: 50, amenities: ['projector', 'microphone', 'recording'], available: false },
            { id: '5', name: 'Brainstorm Lab', nameAr: 'معمل العصف الذهني', floor: 2, capacity: 8, amenities: ['whiteboard', 'sticky_notes', 'screens'], available: true },
        ];
        this.bookings = new Map();
        this.deskReservations = new Map();
        this.facilityRequests = new Map();
    }
    getAvailableRooms(capacity, floor) {
        let rooms = this.rooms.filter(r => r.available);
        if (capacity) {
            rooms = rooms.filter(r => r.capacity >= capacity);
        }
        if (floor) {
            rooms = rooms.filter(r => r.floor === floor);
        }
        return rooms;
    }
    bookRoom(roomId, userId, userName, title, start, end, attendees) {
        const room = this.rooms.find(r => r.id === roomId);
        if (!room) {
            return { success: false, message: '❌ الغرفة غير موجودة' };
        }
        if (!room.available) {
            return { success: false, message: '❌ الغرفة غير متاحة' };
        }
        if (attendees > room.capacity) {
            return { success: false, message: `❌ السعة القصوى ${room.capacity} شخص` };
        }
        const id = `BOOK-${Date.now().toString(36).toUpperCase()}`;
        const booking = {
            id,
            roomId,
            roomName: room.nameAr,
            userId,
            userName,
            title,
            start,
            end,
            attendees,
            status: 'confirmed',
        };
        this.bookings.set(id, booking);
        return { success: true, booking, message: `✅ تم حجز ${room.nameAr}` };
    }
    getParkingStatus() {
        const spots = [
            { id: '1', zone: 'A', number: 'A-01', type: 'regular', typeAr: 'عادي', assigned: true },
            { id: '2', zone: 'A', number: 'A-02', type: 'regular', typeAr: 'عادي', assigned: false },
            { id: '3', zone: 'B', number: 'B-01', type: 'vip', typeAr: 'VIP', assigned: true },
            { id: '4', zone: 'B', number: 'B-02', type: 'ev', typeAr: 'سيارات كهربائية', assigned: false },
            { id: '5', zone: 'C', number: 'C-01', type: 'accessible', typeAr: 'ذوي الاحتياجات', assigned: false },
        ];
        const available = spots.filter(s => !s.assigned).length;
        const zones = ['A', 'B', 'C'].map(zone => ({
            zone,
            available: spots.filter(s => s.zone === zone && !s.assigned).length,
        }));
        return { available, total: spots.length, zones };
    }
    reserveDesk(userId, deskNumber, floor, date) {
        const id = `DESK-${Date.now().toString(36).toUpperCase()}`;
        const reservation = {
            id,
            deskNumber,
            floor,
            userId,
            date,
            status: 'reserved',
        };
        this.deskReservations.set(id, reservation);
        return {
            success: true,
            reservation,
            message: `✅ تم حجز المكتب ${deskNumber} - الطابق ${floor}`,
        };
    }
    submitRequest(userId, type, description, location, priority) {
        const id = `REQ-${Date.now().toString(36).toUpperCase()}`;
        const typeNames = {
            maintenance: 'صيانة',
            cleaning: 'نظافة',
            supplies: 'مستلزمات',
            it: 'تقنية معلومات',
            security: 'أمن',
        };
        const request = {
            id,
            userId,
            type,
            typeAr: typeNames[type],
            description,
            location,
            priority,
            status: 'open',
            createdAt: new Date(),
        };
        this.facilityRequests.set(id, request);
        return request;
    }
    formatAvailableRooms(capacity) {
        const rooms = this.getAvailableRooms(capacity);
        if (rooms.length === 0) {
            return '❌ لا توجد غرف متاحة حالياً';
        }
        let message = '🏢 **الغرف المتاحة:**\n\n';
        for (const room of rooms) {
            message += `📍 **${room.nameAr}**\n`;
            message += `   الطابق: ${room.floor} | السعة: ${room.capacity} شخص\n`;
            message += `   المرافق: ${room.amenities.join(', ')}\n\n`;
        }
        message += '💡 قل "احجز [اسم الغرفة]" للحجز';
        return message;
    }
    formatBooking(booking) {
        const dateStr = booking.start.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'short' });
        const timeStr = `${booking.start.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} - ${booking.end.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`;
        let message = `✅ **تم تأكيد الحجز #${booking.id}**\n\n`;
        message += `📍 الغرفة: ${booking.roomName}\n`;
        message += `📅 التاريخ: ${dateStr}\n`;
        message += `⏰ الوقت: ${timeStr}\n`;
        message += `👥 الحضور: ${booking.attendees}\n`;
        message += `📋 الموضوع: ${booking.title}`;
        return message;
    }
    formatParkingStatus() {
        const status = this.getParkingStatus();
        let message = `🚗 **حالة المواقف:**\n\n`;
        message += `📊 المتاحة: ${status.available}/${status.total}\n\n`;
        for (const zone of status.zones) {
            const bar = '█'.repeat(zone.available) + '░'.repeat(5 - zone.available);
            message += `المنطقة ${zone.zone}: ${bar} ${zone.available} متاحة\n`;
        }
        return message;
    }
};
exports.FacilitiesService = FacilitiesService;
exports.FacilitiesService = FacilitiesService = FacilitiesService_1 = __decorate([
    (0, common_1.Injectable)()
], FacilitiesService);
//# sourceMappingURL=facilities.service.js.map