import { EosService } from './eos.service';
import { CalculateEosDto } from './dto/calculate-eos.dto';
export declare class EosController {
    private readonly service;
    constructor(service: EosService);
    calculateEos(userId: string, dto: CalculateEosDto): Promise<import("./dto/calculate-eos.dto").EosBreakdown>;
}
