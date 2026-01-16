import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

export enum NitaqatBand {
    PLATINUM = 'PLATINUM',
    GREEN_HIGH = 'GREEN_HIGH',
    GREEN_MID = 'GREEN_MID',
    GREEN_LOW = 'GREEN_LOW',
    YELLOW = 'YELLOW',
    RED = 'RED',
}

export enum NitaqatColor {
    PLATINUM = 'PLATINUM',
    GREEN = 'GREEN',
    YELLOW = 'YELLOW',
    RED = 'RED',
}

interface NitaqatThreshold {
    minRate: number;
    maxRate: number;
    band: NitaqatBand;
    color: NitaqatColor;
}

// Thresholds by company size (simplified version)
const NITAQAT_THRESHOLDS: Record<string, NitaqatThreshold[]> = {
    SMALL: [
        { minRate: 40, maxRate: 100, band: NitaqatBand.PLATINUM, color: NitaqatColor.PLATINUM },
        { minRate: 26, maxRate: 39.99, band: NitaqatBand.GREEN_HIGH, color: NitaqatColor.GREEN },
        { minRate: 17, maxRate: 25.99, band: NitaqatBand.GREEN_MID, color: NitaqatColor.GREEN },
        { minRate: 10, maxRate: 16.99, band: NitaqatBand.GREEN_LOW, color: NitaqatColor.GREEN },
        { minRate: 6, maxRate: 9.99, band: NitaqatBand.YELLOW, color: NitaqatColor.YELLOW },
        { minRate: 0, maxRate: 5.99, band: NitaqatBand.RED, color: NitaqatColor.RED },
    ],
    MEDIUM: [
        { minRate: 40, maxRate: 100, band: NitaqatBand.PLATINUM, color: NitaqatColor.PLATINUM },
        { minRate: 30, maxRate: 39.99, band: NitaqatBand.GREEN_HIGH, color: NitaqatColor.GREEN },
        { minRate: 22, maxRate: 29.99, band: NitaqatBand.GREEN_MID, color: NitaqatColor.GREEN },
        { minRate: 14, maxRate: 21.99, band: NitaqatBand.GREEN_LOW, color: NitaqatColor.GREEN },
        { minRate: 8, maxRate: 13.99, band: NitaqatBand.YELLOW, color: NitaqatColor.YELLOW },
        { minRate: 0, maxRate: 7.99, band: NitaqatBand.RED, color: NitaqatColor.RED },
    ],
    LARGE: [
        { minRate: 40, maxRate: 100, band: NitaqatBand.PLATINUM, color: NitaqatColor.PLATINUM },
        { minRate: 34, maxRate: 39.99, band: NitaqatBand.GREEN_HIGH, color: NitaqatColor.GREEN },
        { minRate: 27, maxRate: 33.99, band: NitaqatBand.GREEN_MID, color: NitaqatColor.GREEN },
        { minRate: 20, maxRate: 26.99, band: NitaqatBand.GREEN_LOW, color: NitaqatColor.GREEN },
        { minRate: 12, maxRate: 19.99, band: NitaqatBand.YELLOW, color: NitaqatColor.YELLOW },
        { minRate: 0, maxRate: 11.99, band: NitaqatBand.RED, color: NitaqatColor.RED },
    ],
    GIANT: [
        { minRate: 40, maxRate: 100, band: NitaqatBand.PLATINUM, color: NitaqatColor.PLATINUM },
        { minRate: 35, maxRate: 39.99, band: NitaqatBand.GREEN_HIGH, color: NitaqatColor.GREEN },
        { minRate: 29, maxRate: 34.99, band: NitaqatBand.GREEN_MID, color: NitaqatColor.GREEN },
        { minRate: 23, maxRate: 28.99, band: NitaqatBand.GREEN_LOW, color: NitaqatColor.GREEN },
        { minRate: 15, maxRate: 22.99, band: NitaqatBand.YELLOW, color: NitaqatColor.YELLOW },
        { minRate: 0, maxRate: 14.99, band: NitaqatBand.RED, color: NitaqatColor.RED },
    ],
};

@Injectable()
export class NitaqatCalculatorService {
    private readonly logger = new Logger(NitaqatCalculatorService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get company size category based on employee count
     */
    getCompanySizeCategory(totalEmployees: number): string {
        if (totalEmployees <= 9) return 'SMALL';
        if (totalEmployees <= 49) return 'MEDIUM';
        if (totalEmployees <= 499) return 'LARGE';
        return 'GIANT';
    }

    /**
     * Calculate Nitaqat band based on saudization rate
     */
    async calculateNitaqatBand(
        companyId: string,
        totalEmployees: number,
        saudiEmployees: number,
    ) {
        const saudizationRate = totalEmployees > 0
            ? (saudiEmployees / totalEmployees) * 100
            : 0;

        const sizeCategory = this.getCompanySizeCategory(totalEmployees);
        const thresholds = NITAQAT_THRESHOLDS[sizeCategory];

        let currentBand = thresholds[thresholds.length - 1]; // Default to RED
        let targetThreshold = thresholds.find(t => t.color === NitaqatColor.GREEN);

        for (const threshold of thresholds) {
            if (saudizationRate >= threshold.minRate && saudizationRate <= threshold.maxRate) {
                currentBand = threshold;
                break;
            }
        }

        // Find the minimum green threshold for target
        const greenThresholds = thresholds.filter(t => t.color === NitaqatColor.GREEN);
        const minGreenThreshold = greenThresholds.length > 0
            ? greenThresholds[greenThresholds.length - 1]
            : thresholds[0];

        const targetRate = minGreenThreshold.minRate;
        const gapToTarget = Math.max(0, targetRate - saudizationRate);

        return {
            band: currentBand.band,
            color: currentBand.color,
            currentRate: Math.round(saudizationRate * 100) / 100,
            targetRate,
            gapToTarget: Math.round(gapToTarget * 100) / 100,
            sizeCategory,
            totalEmployees,
            saudiEmployees,
            nonSaudiEmployees: totalEmployees - saudiEmployees,
        };
    }

    /**
     * Calculate required Saudi employees to reach target band
     */
    calculateRequiredSaudis(
        totalEmployees: number,
        currentSaudis: number,
        targetBand: NitaqatBand = NitaqatBand.GREEN_LOW,
    ): number {
        const sizeCategory = this.getCompanySizeCategory(totalEmployees);
        const thresholds = NITAQAT_THRESHOLDS[sizeCategory];

        const targetThreshold = thresholds.find(t => t.band === targetBand);
        if (!targetThreshold) return 0;

        const requiredRate = targetThreshold.minRate;
        const requiredSaudis = Math.ceil((requiredRate * totalEmployees) / 100);

        return Math.max(0, requiredSaudis - currentSaudis);
    }

    /**
     * Simulate what happens with employee changes
     */
    simulateChange(
        totalEmployees: number,
        saudiEmployees: number,
        saudiHires: number = 0,
        saudiTerminations: number = 0,
        nonSaudiHires: number = 0,
        nonSaudiTerminations: number = 0,
    ) {
        const newSaudis = saudiEmployees + saudiHires - saudiTerminations;
        const newTotal = totalEmployees + saudiHires + nonSaudiHires - saudiTerminations - nonSaudiTerminations;

        const currentRate = totalEmployees > 0 ? (saudiEmployees / totalEmployees) * 100 : 0;
        const newRate = newTotal > 0 ? (newSaudis / newTotal) * 100 : 0;

        const sizeCategory = this.getCompanySizeCategory(newTotal);
        const thresholds = NITAQAT_THRESHOLDS[sizeCategory];

        let newBand = thresholds[thresholds.length - 1];
        for (const threshold of thresholds) {
            if (newRate >= threshold.minRate && newRate <= threshold.maxRate) {
                newBand = threshold;
                break;
            }
        }

        return {
            before: {
                totalEmployees,
                saudiEmployees,
                rate: Math.round(currentRate * 100) / 100,
            },
            after: {
                totalEmployees: newTotal,
                saudiEmployees: newSaudis,
                rate: Math.round(newRate * 100) / 100,
                band: newBand.band,
                color: newBand.color,
            },
            change: Math.round((newRate - currentRate) * 100) / 100,
        };
    }
}
