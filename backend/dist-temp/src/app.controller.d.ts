export declare class AppController {
    getRoot(): {
        message: string;
        version: string;
        documentation: string;
        endpoints: {
            auth: string;
            users: string;
            attendance: string;
            branches: string;
            leaves: string;
            reports: string;
            notifications: string;
        };
    };
    getHealth(): {
        status: string;
        timestamp: string;
        uptime: number;
    };
}
