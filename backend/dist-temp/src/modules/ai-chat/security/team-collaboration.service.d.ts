export interface TeamMember {
    id: string;
    name: string;
    nameAr: string;
    department: string;
    departmentAr: string;
    role: string;
    roleAr: string;
    skills: string[];
    email: string;
    phone?: string;
    location: string;
    availability: 'available' | 'busy' | 'away' | 'offline';
    statusMessage?: string;
}
export interface SkillSearch {
    skill: string;
    skillAr: string;
    experts: TeamMember[];
    learners: TeamMember[];
}
export interface TeamMood {
    date: Date;
    responses: number;
    averageMood: number;
    distribution: {
        mood: string;
        count: number;
        percentage: number;
    }[];
    trend: 'improving' | 'stable' | 'declining';
}
export interface CollaborationRequest {
    id: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    type: 'help' | 'meeting' | 'review' | 'mentoring';
    typeAr: string;
    message: string;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: Date;
}
export declare class TeamCollaborationService {
    private readonly logger;
    private readonly teamMembers;
    private requests;
    private moodData;
    findBySkill(skill: string): SkillSearch;
    getTeamByDepartment(department: string): TeamMember[];
    checkAvailability(userId: string): {
        available: boolean;
        status: string;
        statusAr: string;
    };
    requestCollaboration(fromUserId: string, fromUserName: string, toUserId: string, type: CollaborationRequest['type'], message: string): {
        success: boolean;
        request?: CollaborationRequest;
        message: string;
    };
    submitMood(userId: string, mood: number): {
        success: boolean;
        message: string;
    };
    getTeamMood(): TeamMood;
    formatSkillSearch(result: SkillSearch): string;
    formatTeamDirectory(department?: string): string;
    formatTeamMood(): string;
}
