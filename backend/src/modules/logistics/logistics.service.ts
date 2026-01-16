import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class LogisticsService {
    private readonly logger = new Logger(LogisticsService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ==================== الرحلات ====================

    async getTrips(companyId: string) {
        try {
            const trips = await (this.prisma as any).trip?.findMany?.({
                where: { companyId },
                orderBy: { tripDate: 'desc' },
                take: 100,
            });
            return trips || [];
        } catch (error) {
            this.logger.warn(`Error fetching trips: ${error.message}`);
            return [];
        }
    }

    async createTrip(companyId: string, data: any) {
        try {
            const trip = await (this.prisma as any).trip?.create?.({
                data: {
                    companyId,
                    driverId: data.driverId,
                    tripDate: new Date(data.tripDate),
                    scheduledStart: new Date(`${data.tripDate}T${data.scheduledStart}`),
                    distanceKm: data.distanceKm || 0,
                    delayMinutes: data.delayMinutes || 0,
                    status: 'COMPLETED',
                },
            });
            return trip;
        } catch (error) {
            this.logger.error(`Error creating trip: ${error.message}`);
            throw error;
        }
    }

    async deleteTrip(id: string) {
        try {
            await (this.prisma as any).trip?.delete?.({ where: { id } });
            return { success: true };
        } catch (error) {
            this.logger.error(`Error deleting trip: ${error.message}`);
            throw error;
        }
    }

    // ==================== التوصيلات ====================

    async getDeliveries(companyId: string) {
        try {
            const deliveries = await (this.prisma as any).delivery?.findMany?.({
                where: { companyId },
                orderBy: { deliveryDate: 'desc' },
                take: 100,
            });
            return deliveries || [];
        } catch (error) {
            this.logger.warn(`Error fetching deliveries: ${error.message}`);
            return [];
        }
    }

    async createDelivery(companyId: string, data: any) {
        try {
            const delivery = await (this.prisma as any).delivery?.create?.({
                data: {
                    companyId,
                    driverId: data.driverId,
                    deliveryDate: new Date(data.deliveryDate),
                    scheduledTime: new Date(data.deliveryDate),
                    actualTime: new Date(data.deliveryDate),
                    minutesEarly: data.minutesEarly || 0,
                    minutesLate: data.minutesLate || 0,
                    customerRating: data.customerRating || 5,
                    status: data.status || 'DELIVERED',
                },
            });
            return delivery;
        } catch (error) {
            this.logger.error(`Error creating delivery: ${error.message}`);
            throw error;
        }
    }

    async deleteDelivery(id: string) {
        try {
            await (this.prisma as any).delivery?.delete?.({ where: { id } });
            return { success: true };
        } catch (error) {
            this.logger.error(`Error deleting delivery: ${error.message}`);
            throw error;
        }
    }

    // ==================== الجرد ====================

    async getInventoryCounts(companyId: string) {
        try {
            const counts = await (this.prisma as any).inventoryCount?.findMany?.({
                where: { companyId },
                orderBy: { countDate: 'desc' },
                take: 100,
            });
            return counts || [];
        } catch (error) {
            this.logger.warn(`Error fetching inventory counts: ${error.message}`);
            return [];
        }
    }

    async createInventoryCount(companyId: string, data: any) {
        try {
            const accuracyRate = data.expectedItems > 0
                ? (data.actualItems / data.expectedItems) * 100
                : 100;

            const count = await (this.prisma as any).inventoryCount?.create?.({
                data: {
                    companyId,
                    conductedBy: data.conductedBy,
                    countDate: new Date(data.countDate),
                    expectedItems: data.expectedItems || 0,
                    actualItems: data.actualItems || 0,
                    accuracyRate,
                    variance: Math.abs((data.expectedItems || 0) - (data.actualItems || 0)),
                    damageValue: data.damageValue || 0,
                    damageReason: data.damageReason,
                },
            });
            return count;
        } catch (error) {
            this.logger.error(`Error creating inventory count: ${error.message}`);
            throw error;
        }
    }

    async deleteInventoryCount(id: string) {
        try {
            await (this.prisma as any).inventoryCount?.delete?.({ where: { id } });
            return { success: true };
        } catch (error) {
            this.logger.error(`Error deleting inventory count: ${error.message}`);
            throw error;
        }
    }

    // ==================== أداء السائقين ====================

    async getDriverPerformance(companyId: string, month: number, year: number) {
        try {
            const performance = await (this.prisma as any).driverPerformance?.findMany?.({
                where: { companyId, month, year },
            });
            return performance || [];
        } catch (error) {
            this.logger.warn(`Error fetching driver performance: ${error.message}`);
            return [];
        }
    }

    async calculateDriverPerformance(companyId: string, month: number, year: number) {
        try {
            // جلب جميع التوصيلات للشهر
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const deliveries = await (this.prisma as any).delivery?.findMany?.({
                where: {
                    companyId,
                    deliveryDate: { gte: startDate, lte: endDate },
                },
            }) || [];

            // جلب جميع الرحلات للشهر
            const trips = await (this.prisma as any).trip?.findMany?.({
                where: {
                    companyId,
                    tripDate: { gte: startDate, lte: endDate },
                },
            }) || [];

            // تجميع حسب السائق
            const driverStats = new Map<string, any>();

            for (const delivery of deliveries) {
                const driverId = delivery.driverId;
                if (!driverStats.has(driverId)) {
                    driverStats.set(driverId, {
                        completedDeliveries: 0,
                        failedDeliveries: 0,
                        totalRating: 0,
                        ratingCount: 0,
                    });
                }
                const stats = driverStats.get(driverId);
                if (delivery.status === 'DELIVERED') {
                    stats.completedDeliveries++;
                } else if (delivery.status === 'FAILED') {
                    stats.failedDeliveries++;
                }
                if (delivery.customerRating) {
                    stats.totalRating += Number(delivery.customerRating);
                    stats.ratingCount++;
                }
            }

            for (const trip of trips) {
                const driverId = trip.driverId;
                if (!driverStats.has(driverId)) {
                    driverStats.set(driverId, {
                        totalTrips: 0,
                        onTimeTrips: 0,
                        totalDistance: 0,
                    });
                }
                const stats = driverStats.get(driverId);
                stats.totalTrips = (stats.totalTrips || 0) + 1;
                if (trip.delayMinutes <= 0) {
                    stats.onTimeTrips = (stats.onTimeTrips || 0) + 1;
                }
                stats.totalDistance = (stats.totalDistance || 0) + Number(trip.distanceKm || 0);
            }

            // حفظ الإحصائيات
            const results = [];
            for (const [driverId, stats] of driverStats.entries()) {
                const totalDeliveries = (stats.completedDeliveries || 0) + (stats.failedDeliveries || 0);
                const onTimePercentage = stats.totalTrips > 0
                    ? ((stats.onTimeTrips || 0) / stats.totalTrips) * 100
                    : 100;
                const averageRating = stats.ratingCount > 0
                    ? stats.totalRating / stats.ratingCount
                    : 5;
                const returnRate = totalDeliveries > 0
                    ? ((stats.failedDeliveries || 0) / totalDeliveries) * 100
                    : 0;

                const perf = await (this.prisma as any).driverPerformance?.upsert?.({
                    where: {
                        companyId_driverId_month_year: {
                            companyId,
                            driverId,
                            month,
                            year,
                        },
                    },
                    update: {
                        totalTrips: stats.totalTrips || 0,
                        onTimeTrips: stats.onTimeTrips || 0,
                        onTimePercentage,
                        completedDeliveries: stats.completedDeliveries || 0,
                        failedDeliveries: stats.failedDeliveries || 0,
                        returnRate,
                        totalDistanceKm: stats.totalDistance || 0,
                        averageRating,
                    },
                    create: {
                        companyId,
                        driverId,
                        month,
                        year,
                        totalTrips: stats.totalTrips || 0,
                        onTimeTrips: stats.onTimeTrips || 0,
                        onTimePercentage,
                        completedDeliveries: stats.completedDeliveries || 0,
                        failedDeliveries: stats.failedDeliveries || 0,
                        returnRate,
                        totalDistanceKm: stats.totalDistance || 0,
                        averageRating,
                    },
                });
                results.push(perf);
            }

            return { calculated: results.length, results };
        } catch (error) {
            this.logger.error(`Error calculating driver performance: ${error.message}`);
            throw error;
        }
    }

    // ==================== إحصائيات اللوجستيات ====================

    async getStatistics(companyId: string, month: number, year: number) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            // جلب التوصيلات
            const deliveries = await (this.prisma as any).delivery?.findMany?.({
                where: {
                    companyId,
                    deliveryDate: { gte: startDate, lte: endDate },
                },
            }) || [];

            // جلب الرحلات
            const trips = await (this.prisma as any).trip?.findMany?.({
                where: {
                    companyId,
                    tripDate: { gte: startDate, lte: endDate },
                },
            }) || [];

            // جلب عمليات الجرد
            const inventoryCounts = await (this.prisma as any).inventoryCount?.findMany?.({
                where: {
                    companyId,
                    countDate: { gte: startDate, lte: endDate },
                },
            }) || [];

            // حساب الإحصائيات
            const totalDeliveries = deliveries.length;
            const completedDeliveries = deliveries.filter((d: any) => d.status === 'DELIVERED').length;
            const failedDeliveries = deliveries.filter((d: any) => d.status === 'FAILED').length;
            const deliverySuccessRate = totalDeliveries > 0
                ? Math.round((completedDeliveries / totalDeliveries) * 100)
                : 0;

            const totalTrips = trips.length;
            const onTimeTrips = trips.filter((t: any) => t.delayMinutes <= 0).length;
            const tripOnTimeRate = totalTrips > 0
                ? Math.round((onTimeTrips / totalTrips) * 100)
                : 0;

            const totalDistance = trips.reduce((sum: number, t: any) => sum + Number(t.distanceKm || 0), 0);
            const avgCustomerRating = deliveries.length > 0
                ? deliveries.reduce((sum: number, d: any) => sum + Number(d.customerRating || 0), 0) / deliveries.length
                : 0;

            const inventoryAccuracy = inventoryCounts.length > 0
                ? inventoryCounts.reduce((sum: number, c: any) => sum + Number(c.accuracyRate || 0), 0) / inventoryCounts.length
                : 100;

            return {
                period: { month, year },
                deliveries: {
                    total: totalDeliveries,
                    completed: completedDeliveries,
                    failed: failedDeliveries,
                    successRate: deliverySuccessRate,
                    avgCustomerRating: Math.round(avgCustomerRating * 10) / 10,
                },
                trips: {
                    total: totalTrips,
                    onTime: onTimeTrips,
                    delayed: totalTrips - onTimeTrips,
                    onTimeRate: tripOnTimeRate,
                    totalDistanceKm: Math.round(totalDistance),
                },
                inventory: {
                    totalCounts: inventoryCounts.length,
                    avgAccuracy: Math.round(inventoryAccuracy * 10) / 10,
                },
            };
        } catch (error) {
            this.logger.error(`Error getting logistics statistics: ${error.message}`);
            throw error;
        }
    }

    async getDashboard(companyId: string) {
        try {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            // إحصائيات الشهر الحالي
            const currentStats = await this.getStatistics(companyId, currentMonth, currentYear);

            // إحصائيات الشهر السابق للمقارنة
            const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
            const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
            const prevStats = await this.getStatistics(companyId, prevMonth, prevYear);

            // آخر التوصيلات
            const recentDeliveries = await (this.prisma as any).delivery?.findMany?.({
                where: { companyId },
                orderBy: { deliveryDate: 'desc' },
                take: 5,
            }) || [];

            // آخر الرحلات
            const recentTrips = await (this.prisma as any).trip?.findMany?.({
                where: { companyId },
                orderBy: { tripDate: 'desc' },
                take: 5,
            }) || [];

            // أفضل السائقين
            const topDrivers = await (this.prisma as any).driverPerformance?.findMany?.({
                where: { companyId, month: currentMonth, year: currentYear },
                orderBy: { averageRating: 'desc' },
                take: 5,
            }) || [];

            // حساب التغيرات
            const deliveryChange = prevStats.deliveries.total > 0
                ? Math.round(((currentStats.deliveries.total - prevStats.deliveries.total) / prevStats.deliveries.total) * 100)
                : 0;

            const tripChange = prevStats.trips.total > 0
                ? Math.round(((currentStats.trips.total - prevStats.trips.total) / prevStats.trips.total) * 100)
                : 0;

            return {
                currentPeriod: currentStats,
                comparison: {
                    deliveryChange,
                    tripChange,
                    successRateChange: currentStats.deliveries.successRate - prevStats.deliveries.successRate,
                    onTimeRateChange: currentStats.trips.onTimeRate - prevStats.trips.onTimeRate,
                },
                recentActivity: {
                    deliveries: recentDeliveries,
                    trips: recentTrips,
                },
                topDrivers,
            };
        } catch (error) {
            this.logger.error(`Error getting logistics dashboard: ${error.message}`);
            throw error;
        }
    }
}
