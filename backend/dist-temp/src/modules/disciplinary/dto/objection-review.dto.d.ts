export declare enum HRObjectionAction {
    CANCEL = "CANCEL",
    CONTINUE = "CONTINUE",
    CONFIRM = "CONFIRM"
}
export declare class ObjectionReviewDto {
    action: HRObjectionAction;
    reason: string;
}
