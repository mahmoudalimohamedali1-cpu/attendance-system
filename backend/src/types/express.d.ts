// @ts-nocheck
/**
 * Express type declarations to fix TS2503 namespace errors
 */
declare namespace Express {
    export namespace Multer {
        export interface File {
            fieldname: string;
            originalname: string;
            encoding: string;
            mimetype: string;
            size: number;
            destination: string;
            filename: string;
            path: string;
            buffer: Buffer;
        }
    }
}

export { };
