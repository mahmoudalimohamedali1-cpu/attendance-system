export declare enum HRInitialAction {
    REJECT = "REJECT",
    INFORMAL_NOTICE = "INFORMAL_NOTICE",
    INFORMAL_WARNING = "INFORMAL_WARNING",
    APPROVE_OFFICIAL = "APPROVE_OFFICIAL"
}
export declare class HRReviewDto {
    action: HRInitialAction;
    reason: string;
    hearingDatetime?: string;
    hearingLocation?: string;
}
