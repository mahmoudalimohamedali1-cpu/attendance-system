import { MudadStatus, WpsStatus } from '@prisma/client';
export declare class StateMachineService {
    validateMudadTransition(fromStatus: MudadStatus, toStatus: MudadStatus): void;
    validateWpsTransition(fromStatus: WpsStatus, toStatus: WpsStatus): void;
    getMudadAllowedTransitions(currentStatus: MudadStatus): MudadStatus[];
    getWpsAllowedTransitions(currentStatus: WpsStatus): WpsStatus[];
    isFinalMudadStatus(status: MudadStatus): boolean;
    isFinalWpsStatus(status: WpsStatus): boolean;
}
