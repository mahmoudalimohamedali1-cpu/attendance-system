import { Test, TestingModule } from '@nestjs/testing';
import { FormulaSecurityService } from './formula-security.service';

describe('FormulaSecurityService', () => {
    let service: FormulaSecurityService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [FormulaSecurityService],
        }).compile();

        service = module.get<FormulaSecurityService>(FormulaSecurityService);
    });

    describe('analyze', () => {
        describe('Safe formulas', () => {
            it('should accept simple arithmetic', () => {
                const result = service.analyze('BASIC * 0.09');
                expect(result.isSecure).toBe(true);
                expect(result.threats.length).toBe(0);
            });

            it('should accept formulas with functions', () => {
                const result = service.analyze('MAX(BASIC, 1500) * 0.09');
                expect(result.isSecure).toBe(true);
            });

            it('should accept IF conditions', () => {
                const result = service.analyze('IF(BASIC > 5000, BASIC * 0.1, 500)');
                expect(result.isSecure).toBe(true);
            });

            it('should accept nested functions', () => {
                const result = service.analyze('ROUND(MAX(BASIC * 0.09, MIN(TOTAL, 45000) * 0.09), 2)');
                expect(result.isSecure).toBe(true);
            });

            it('should accept complex payroll formula', () => {
                const result = service.analyze(
                    'IF(GOSI_BASE > 45000, 45000 * 0.0975, GOSI_BASE * 0.0975)'
                );
                expect(result.isSecure).toBe(true);
            });
        });

        describe('Critical threats - Code execution', () => {
            it('should block eval()', () => {
                const result = service.analyze('eval("alert(1)")');
                expect(result.isSecure).toBe(false);
                expect(result.threats.some(t => t.severity === 'CRITICAL')).toBe(true);
                expect(result.threats.some(t => t.description.includes('Eval'))).toBe(true);
            });

            it('should block Function constructor', () => {
                const result = service.analyze('Function("return 1")()');
                expect(result.isSecure).toBe(false);
                expect(result.threats.some(t => t.severity === 'CRITICAL')).toBe(true);
            });

            it('should block new Function', () => {
                const result = service.analyze('new Function("return 1")');
                expect(result.isSecure).toBe(false);
                expect(result.threats.some(t => t.severity === 'CRITICAL')).toBe(true);
            });

            it('should block require()', () => {
                const result = service.analyze('require("child_process")');
                expect(result.isSecure).toBe(false);
                expect(result.threats.some(t => t.severity === 'CRITICAL')).toBe(true);
            });

            it('should block import()', () => {
                const result = service.analyze('import("./malicious")');
                expect(result.isSecure).toBe(false);
                expect(result.threats.some(t => t.severity === 'CRITICAL')).toBe(true);
            });

            it('should block exec()', () => {
                const result = service.analyze('exec("rm -rf /")');
                expect(result.isSecure).toBe(false);
                expect(result.threats.some(t => t.severity === 'CRITICAL')).toBe(true);
            });

            it('should block spawn()', () => {
                const result = service.analyze('spawn("bash")');
                expect(result.isSecure).toBe(false);
                expect(result.threats.some(t => t.severity === 'CRITICAL')).toBe(true);
            });

            it('should block child_process access', () => {
                const result = service.analyze('child_process.exec("ls")');
                expect(result.isSecure).toBe(false);
            });

            it('should block fs access', () => {
                const result = service.analyze('fs.readFileSync("/etc/passwd")');
                expect(result.isSecure).toBe(false);
            });
        });

        describe('High threats - Prototype pollution', () => {
            it('should block __proto__ access', () => {
                const result = service.analyze('obj.__proto__.polluted = true');
                expect(result.isSecure).toBe(false);
                expect(result.threats.some(t => t.severity === 'HIGH')).toBe(true);
            });

            it('should block prototype access', () => {
                const result = service.analyze('Object.prototype.polluted = true');
                expect(result.isSecure).toBe(false);
            });

            it('should block constructor access', () => {
                const result = service.analyze('obj.constructor("alert(1)")');
                expect(result.isSecure).toBe(false);
            });

            it('should block Object.assign abuse', () => {
                const result = service.analyze('Object.assign({}, malicious)');
                expect(result.isSecure).toBe(false);
            });

            it('should block Reflect API', () => {
                const result = service.analyze('Reflect.get(obj, "secret")');
                expect(result.isSecure).toBe(false);
            });

            it('should block Proxy', () => {
                const result = service.analyze('new Proxy({}, handler)');
                expect(result.isSecure).toBe(false);
            });

            it('should block with statement', () => {
                const result = service.analyze('with(obj) { x = 1 }');
                expect(result.isSecure).toBe(false);
            });

            it('should block bracket constructor access', () => {
                const result = service.analyze('obj["constructor"]("code")');
                expect(result.isSecure).toBe(false);
            });
        });

        describe('Medium threats - Global objects (flagged as INJECTION)', () => {
            // Note: Medium threats are flagged but may not block execution on their own
            // They indicate potential issues but need context to determine severity

            it('should flag window access', () => {
                const result = service.analyze('window.location');
                // Should detect window keyword
                expect(result.threats.some(t =>
                    t.type === 'INJECTION' && t.description.includes('Window')
                )).toBe(true);
            });

            it('should flag document access', () => {
                const result = service.analyze('document.cookie');
                // Should detect document keyword
                expect(result.threats.some(t =>
                    t.type === 'INJECTION' && t.description.includes('Document')
                )).toBe(true);
            });

            it('should flag global access', () => {
                const result = service.analyze('global.process');
                // Should detect global keyword
                expect(result.threats.some(t =>
                    t.type === 'INJECTION' && t.description.includes('Global')
                )).toBe(true);
            });

            it('should flag process access', () => {
                const result = service.analyze('process.env.SECRET');
                // Should detect process keyword
                expect(result.threats.some(t =>
                    t.type === 'INJECTION' && t.description.includes('Process')
                )).toBe(true);
            });

            it('should flag this keyword', () => {
                const result = service.analyze('this.constructor');
                // Should detect this keyword
                expect(result.threats.some(t =>
                    t.type === 'INJECTION' && t.description.includes('This')
                )).toBe(true);
            });

            it('should flag setTimeout', () => {
                const result = service.analyze('setTimeout(malicious, 0)');
                // Medium threat
                expect(result.threats.some(t =>
                    t.type === 'INJECTION' && t.description.includes('SetTimeout')
                )).toBe(true);
            });

            it('should flag setInterval', () => {
                const result = service.analyze('setInterval(malicious, 1000)');
                // Medium threat
                expect(result.threats.some(t =>
                    t.type === 'INJECTION' && t.description.includes('SetInterval')
                )).toBe(true);
            });

            it('should block fetch', () => {
                const result = service.analyze('fetch("http://evil.com")');
                expect(result.isSecure).toBe(false);
            });

            it('should flag XMLHttpRequest', () => {
                const result = service.analyze('new XMLHttpRequest()');
                // Should detect XMLHttpRequest
                expect(result.threats.some(t =>
                    t.type === 'INJECTION' && t.description.includes('XMLHttpRequest')
                )).toBe(true);
            });

            it('should block WebSocket', () => {
                const result = service.analyze('new WebSocket("ws://evil.com")');
                expect(result.isSecure).toBe(false);
            });

            it('should block Buffer access', () => {
                const result = service.analyze('Buffer.from("data")');
                expect(result.isSecure).toBe(false);
            });
        });

        describe('Resource abuse', () => {
            it('should flag formulas exceeding length limit', () => {
                const longFormula = 'A'.repeat(2500);
                const result = service.analyze(longFormula);
                expect(result.threats.some(t => t.type === 'RESOURCE_ABUSE')).toBe(true);
            });

            it('should flag deep nesting', () => {
                const deepNesting = '('.repeat(25) + 'BASIC' + ')'.repeat(25);
                const result = service.analyze(deepNesting);
                expect(result.complexity.depth).toBe(25);
                expect(result.threats.some(t => t.description.includes('Nesting'))).toBe(true);
            });
        });

        describe('Invalid characters', () => {
            it('should block semicolons', () => {
                const result = service.analyze('BASIC; alert(1)');
                expect(result.isSecure).toBe(false);
                expect(result.threats.some(t => t.type === 'INVALID_CHARS')).toBe(true);
            });

            it('should block curly braces', () => {
                const result = service.analyze('BASIC + { x: 1 }');
                expect(result.isSecure).toBe(false);
            });

            it('should block square brackets (standalone)', () => {
                const result = service.analyze('arr[0]');
                expect(result.isSecure).toBe(false);
            });

            it('should block backslash', () => {
                const result = service.analyze('BASIC + \\n');
                expect(result.isSecure).toBe(false);
            });
        });
    });

    describe('isSecure (quick check)', () => {
        it('should return true for safe formulas', () => {
            expect(service.isSecure('BASIC * 0.09')).toBe(true);
            expect(service.isSecure('MAX(BASIC, 1500)')).toBe(true);
            expect(service.isSecure('IF(BASIC > 5000, 500, 0)')).toBe(true);
        });

        it('should return false for dangerous formulas', () => {
            expect(service.isSecure('eval("1")')).toBe(false);
            expect(service.isSecure('Function("return 1")')).toBe(false);
            expect(service.isSecure('__proto__')).toBe(false);
        });

        it('should return false for empty/invalid input', () => {
            expect(service.isSecure('')).toBe(false);
            expect(service.isSecure(null as any)).toBe(false);
            expect(service.isSecure(undefined as any)).toBe(false);
        });
    });

    describe('sanitize', () => {
        it('should remove extra whitespace', () => {
            const result = service.sanitize('BASIC   *    0.09');
            expect(result).toBe('BASIC * 0.09');
        });

        it('should convert to uppercase', () => {
            const result = service.sanitize('basic * rate');
            expect(result).toBe('BASIC * RATE');
        });

        it('should convert Arabic comma', () => {
            const result = service.sanitize('MAX(BASIC، 1500)');
            expect(result).toBe('MAX(BASIC, 1500)');
        });

        it('should convert Arabic numerals', () => {
            const result = service.sanitize('BASIC * ٠.٠٩');
            expect(result).toBe('BASIC * 0.09');
        });

        it('should remove invisible characters', () => {
            const result = service.sanitize('BASIC\x00\x01 * 0.09');
            expect(result).toBe('BASIC * 0.09');
        });
    });

    describe('analyzeComplexity', () => {
        it('should calculate correct length', () => {
            const result = service.analyzeComplexity('BASIC * 0.09');
            expect(result.length).toBe(12);
        });

        it('should calculate correct depth', () => {
            const result = service.analyzeComplexity('MAX(MIN(BASIC, 5000), 1000)');
            expect(result.depth).toBe(2);
        });

        it('should count operators', () => {
            const result = service.analyzeComplexity('BASIC + HOUSING - DEDUCTIONS * 0.5');
            expect(result.operatorCount).toBe(3); // +, -, *
        });

        it('should count functions', () => {
            const result = service.analyzeComplexity('MAX(MIN(ROUND(BASIC, 2), 5000), 1000)');
            expect(result.functionCount).toBe(3);
        });

        it('should calculate risk score', () => {
            const simple = service.analyzeComplexity('BASIC * 0.09');
            const complex = service.analyzeComplexity(
                'IF(MAX(MIN(ROUND(BASIC + HOUSING + TRANSPORT, 2), 45000), 1500) > 5000, ' +
                'ROUND(MAX(BASIC, 1500) * 0.09, 2), ' +
                'ROUND(MIN(BASIC, 1500) * 0.05, 2))'
            );

            expect(complex.riskScore).toBeGreaterThan(simple.riskScore);
        });
    });

    describe('getAllowedFunctions', () => {
        it('should return list of allowed functions', () => {
            const functions = service.getAllowedFunctions();
            expect(functions).toContain('MIN');
            expect(functions).toContain('MAX');
            expect(functions).toContain('ROUND');
            expect(functions).toContain('IF');
            expect(functions).toContain('ABS');
        });
    });

    describe('isAllowedFunction', () => {
        it('should return true for allowed functions', () => {
            expect(service.isAllowedFunction('MIN')).toBe(true);
            expect(service.isAllowedFunction('max')).toBe(true);
            expect(service.isAllowedFunction('ROUND')).toBe(true);
        });

        it('should return false for disallowed functions', () => {
            expect(service.isAllowedFunction('eval')).toBe(false);
            expect(service.isAllowedFunction('require')).toBe(false);
            expect(service.isAllowedFunction('exec')).toBe(false);
        });
    });

    describe('Audit logging', () => {
        it('should create audit entry on analyze', () => {
            const result = service.analyze('BASIC * 0.09', { companyId: 'company-1' });
            expect(result.auditId).toBeDefined();

            const logs = service.getAuditLog({ companyId: 'company-1', limit: 1 });
            expect(logs.length).toBe(1);
            expect(logs[0].formula).toBe('BASIC * 0.09');
        });

        it('should log blocked formulas', () => {
            service.analyze('eval("malicious")', { companyId: 'company-2' });

            const logs = service.getAuditLog({ companyId: 'company-2', onlyBlocked: true });
            expect(logs.length).toBe(1);
            expect(logs[0].result).toBe('BLOCKED');
        });

        it('should track execution results', () => {
            const result = service.analyze('BASIC * 0.09');
            service.logExecutionResult(result.auditId, 'SUCCESS', 5);

            const logs = service.getAuditLog({ limit: 1 });
            expect(logs[0].result).toBe('SUCCESS');
            expect(logs[0].executionTimeMs).toBe(5);
        });
    });

    describe('getSecurityStats', () => {
        beforeEach(() => {
            // Clear previous audit logs by analyzing several formulas
            service.analyze('BASIC * 0.09', { companyId: 'test-company' });
            service.analyze('eval("bad")', { companyId: 'test-company' });
            service.analyze('MAX(BASIC, 1000)', { companyId: 'test-company' });
        });

        it('should return correct stats for company', () => {
            const stats = service.getSecurityStats('test-company');
            expect(stats.totalAnalyzed).toBeGreaterThanOrEqual(3);
            expect(stats.blocked).toBeGreaterThanOrEqual(1);
            expect(stats.passed).toBeGreaterThanOrEqual(2);
        });

        it('should count critical threats', () => {
            const stats = service.getSecurityStats('test-company');
            expect(stats.criticalThreats).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Real-world attack patterns', () => {
        it('should block template literal injection', () => {
            const result = service.analyze('`${process.env.SECRET}`');
            expect(result.isSecure).toBe(false);
        });

        it('should block hex escape sequence', () => {
            const result = service.analyze('\\x65\\x76\\x61\\x6c');
            expect(result.isSecure).toBe(false);
        });

        it('should block unicode escape', () => {
            const result = service.analyze('\\u0065\\u0076\\u0061\\u006c');
            expect(result.isSecure).toBe(false);
        });

        it('should flag self reference', () => {
            const result = service.analyze('self.constructor');
            // Should detect self and constructor keywords
            expect(result.threats.some(t =>
                t.type === 'INJECTION' && t.description.includes('Self')
            )).toBe(true);
        });

        it('should flag globalThis', () => {
            const result = service.analyze('globalThis.eval');
            // Should detect globalThis keyword
            expect(result.threats.some(t =>
                t.type === 'INJECTION' && t.description.includes('GlobalThis')
            )).toBe(true);
        });

        it('should block bind/call/apply', () => {
            expect(service.analyze('fn.bind(obj)').threats.length).toBeGreaterThan(0);
            expect(service.analyze('fn.call(obj)').threats.length).toBeGreaterThan(0);
            expect(service.analyze('fn.apply(obj, [])').threats.length).toBeGreaterThan(0);
        });
    });
});
