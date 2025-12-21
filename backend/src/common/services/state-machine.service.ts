import { Injectable, BadRequestException } from '@nestjs/common';
import { MudadStatus, WpsStatus } from '@prisma/client';

/**
 * State Machine for Mudad/WPS Status Transitions
 * يمنع transitions الغلط ويضمن workflow صحيح
 */

// Valid transitions for Mudad
const MUDAD_TRANSITIONS: Record<MudadStatus, MudadStatus[]> = {
    PENDING: ['PREPARED'],
    PREPARED: ['SUBMITTED', 'PENDING'], // can go back to pending
    SUBMITTED: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: [], // final state - no transitions allowed
    REJECTED: ['RESUBMITTED'],
    RESUBMITTED: ['ACCEPTED', 'REJECTED'],
    RESUBMIT_REQUIRED: ['PREPARED', 'SUBMITTED'], // can recover after file hash changed
};

// Valid transitions for WPS
const WPS_TRANSITIONS: Record<WpsStatus, WpsStatus[]> = {
    GENERATED: ['DOWNLOADED', 'FAILED'],
    DOWNLOADED: ['SUBMITTED', 'GENERATED'], // can regenerate
    SUBMITTED: ['PROCESSING', 'FAILED'],
    PROCESSING: ['PROCESSED', 'FAILED'],
    PROCESSED: [], // final state
    FAILED: ['GENERATED'], // can retry
};

@Injectable()
export class StateMachineService {

    /**
     * Validate Mudad status transition
     */
    validateMudadTransition(fromStatus: MudadStatus, toStatus: MudadStatus): void {
        const allowedTransitions = MUDAD_TRANSITIONS[fromStatus];

        if (!allowedTransitions || !allowedTransitions.includes(toStatus)) {
            throw new BadRequestException(
                `لا يمكن تغيير الحالة من "${fromStatus}" إلى "${toStatus}". ` +
                `التحويلات المسموحة: ${allowedTransitions?.join(', ') || 'لا يوجد'}`
            );
        }
    }

    /**
     * Validate WPS status transition
     */
    validateWpsTransition(fromStatus: WpsStatus, toStatus: WpsStatus): void {
        const allowedTransitions = WPS_TRANSITIONS[fromStatus];

        if (!allowedTransitions || !allowedTransitions.includes(toStatus)) {
            throw new BadRequestException(
                `لا يمكن تغيير الحالة من "${fromStatus}" إلى "${toStatus}". ` +
                `التحويلات المسموحة: ${allowedTransitions?.join(', ') || 'لا يوجد'}`
            );
        }
    }

    /**
     * Get allowed transitions for Mudad status
     */
    getMudadAllowedTransitions(currentStatus: MudadStatus): MudadStatus[] {
        return MUDAD_TRANSITIONS[currentStatus] || [];
    }

    /**
     * Get allowed transitions for WPS status
     */
    getWpsAllowedTransitions(currentStatus: WpsStatus): WpsStatus[] {
        return WPS_TRANSITIONS[currentStatus] || [];
    }

    /**
     * Check if status is final (no more transitions)
     */
    isFinalMudadStatus(status: MudadStatus): boolean {
        return MUDAD_TRANSITIONS[status]?.length === 0;
    }

    isFinalWpsStatus(status: WpsStatus): boolean {
        return WPS_TRANSITIONS[status]?.length === 0;
    }
}
