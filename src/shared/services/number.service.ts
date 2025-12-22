import { Injectable } from '@nestjs/common'

@Injectable()
export class NumberService {
    public toNumber = (x: any) => {
        let str = this.normalizeNumberString(x)

        let number = parseFloat(str)
        if(isNaN(number)){
            number = 0
        }
    
        return Math.round(number*100)/100
    }

    private normalizeNumberString(value: string): string {
        if (!value) return value;

        const hasComma = value.includes(',');
        const hasDot = value.includes('.');

        // Caso 1: formato europeo → 1.234,56
        if (hasComma && hasDot) {
            return value.replace(/\./g, '').replace(',', '.');
        }

        // Caso 2: solo coma → 123,45
        if (hasComma && !hasDot) {
            return value.replace(',', '.');
        }

        // Caso 3: solo punto → 1234.56 (ya correcto)
        return value;
}

}