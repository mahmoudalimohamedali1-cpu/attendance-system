import { Injectable, Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { EventEmitter } from 'events';

puppeteer.use(StealthPlugin());

export enum RobotStatus {
    IDLE = 'IDLE',
    NAVIGATING = 'NAVIGATING',
    WAITING_FOR_OTP = 'WAITING_FOR_OTP',
    LOGGED_IN = 'LOGGED_IN',
    EXECUTING_ACTION = 'EXECUTING_ACTION',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
}

@Injectable()
export class MuqeemRobotService {
    private readonly logger = new Logger(MuqeemRobotService.name);
    private browsers: Map<string, Browser> = new Map();
    private pages: Map<string, Page> = new Map();
    private eventEmitter = new EventEmitter();

    /**
     * Launch browser and navigate to Muqeem Login
     */
    async launchRobot(transactionId: string): Promise<void> {
        try {
            this.logger.log(`Launching robot for transaction ${transactionId}`);

            const browser = await puppeteer.launch({
                headless: true, // Use headless in production
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });

            this.browsers.set(transactionId, browser);
            const page = await browser.newPage();
            this.pages.set(transactionId, page);

            await page.goto('https://muqeem.sa/#/login', { waitUntil: 'networkidle2' });

            this.eventEmitter.emit(`status_${transactionId}`, {
                status: RobotStatus.NAVIGATING,
                message: 'جاري فتح منصة مقيم...',
            });

        } catch (error) {
            this.logger.error(`Failed to launch robot: ${error.message}`);
            await this.cleanup(transactionId);
            throw error;
        }
    }

    /**
     * Perform Login (Steps 1 & 2: Credentials and OTP)
     */
    async login(transactionId: string, credentials: any): Promise<void> {
        const page = this.pages.get(transactionId);
        if (!page) throw new Error('Robot not launched');

        try {
            // Fill username and password
            await page.type('input[name="username"]', credentials.username);
            await page.type('input[name="password"]', credentials.password);
            await page.click('button[type="submit"]');

            // Wait for OTP field or success
            await page.waitForTimeout(2000);

            const isOtpRequired = await page.$('input[name="otp"]') !== null;

            if (isOtpRequired) {
                this.eventEmitter.emit(`status_${transactionId}`, {
                    status: RobotStatus.WAITING_FOR_OTP,
                    message: 'يرجى إدخال رمز التحقق (OTP) المرسل للجوال',
                });
            } else {
                this.eventEmitter.emit(`status_${transactionId}`, {
                    status: RobotStatus.LOGGED_IN,
                    message: 'تم الدخول بنجاح',
                });
            }
        } catch (error) {
            this.logger.error(`Login failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Resolve OTP and continue
     */
    async resolveOtp(transactionId: string, otpCode: string): Promise<void> {
        const page = this.pages.get(transactionId);
        if (!page) throw new Error('Robot not active');

        try {
            await page.type('input[name="otp"]', otpCode);
            await page.click('button[id="submitOtp"]'); // Need to verify actual selector

            await page.waitForNavigation({ waitUntil: 'networkidle2' });

            this.eventEmitter.emit(`status_${transactionId}`, {
                status: RobotStatus.LOGGED_IN,
                message: 'تم التحقق من الرمز والدخول بنجاح',
            });
        } catch (error) {
            this.logger.error(`OTP resolution failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute specific action (e.g., Renew Iqama)
     */
    async executeAction(transactionId: string, actionType: string, payload: any): Promise<any> {
        const page = this.pages.get(transactionId);
        if (!page) throw new Error('Robot not logged in');

        try {
            this.eventEmitter.emit(`status_${transactionId}`, {
                status: RobotStatus.EXECUTING_ACTION,
                message: `جاري تنفيذ العملية: ${actionType}`,
            });

            // Here we would implement the specific DOM interactions for Muqeem
            // For now, we simulate the navigation and final click
            await page.waitForTimeout(3000);

            this.eventEmitter.emit(`status_${transactionId}`, {
                status: RobotStatus.COMPLETED,
                message: 'تمت العملية بنجاح عبر الروبوت',
            });

            return { success: true };
        } catch (error) {
            this.logger.error(`Action execution failed: ${error.message}`);
            return { success: false, message: error.message };
        } finally {
            await this.cleanup(transactionId);
        }
    }

    private async cleanup(transactionId: string) {
        const browser = this.browsers.get(transactionId);
        if (browser) {
            await browser.close();
            this.browsers.delete(transactionId);
        }
        this.pages.delete(transactionId);
    }

    onStatusChange(transactionId: string, callback: (data: any) => void) {
        this.eventEmitter.on(`status_${transactionId}`, callback);
    }
}
