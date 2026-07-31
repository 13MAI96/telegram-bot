import { Injectable } from '@nestjs/common';
import { deflateSync } from 'zlib';
import { ExpenseCategoryDashboard } from 'src/shared/types/dashboard.types';

type Rgb = [number, number, number];

@Injectable()
export class PieChartImageService {
    private readonly width = 900;
    private readonly height = 560;
    private readonly colors: Rgb[] = [
        [36, 109, 140],
        [231, 111, 81],
        [42, 157, 143],
        [233, 196, 106],
        [137, 92, 78],
        [38, 70, 83],
        [244, 162, 97],
        [115, 147, 179],
    ];

    renderExpensePieChart(dashboard: ExpenseCategoryDashboard): Buffer {
        const image = new RasterImage(this.width, this.height, [250, 248, 243]);

        image.drawText(
            40,
            36,
            `GASTOS POR CATEGORIA ${dashboard.month.label}`,
            [31, 43, 46],
            3,
        );
        image.drawText(
            42,
            78,
            `TOTAL ${dashboard.total.toFixed(2)}`,
            [82, 82, 82],
            2,
        );

        this.drawPie(image, dashboard);
        this.drawLegend(image, dashboard);

        return image.toPng();
    }

    private drawPie(image: RasterImage, dashboard: ExpenseCategoryDashboard) {
        const centerX = 250;
        const centerY = 300;
        const radius = 170;
        let startAngle = -Math.PI / 2;

        dashboard.categories.forEach((category, index) => {
            const sweep = (category.amount / dashboard.total) * Math.PI * 2;
            image.fillPieSlice(
                centerX,
                centerY,
                radius,
                startAngle,
                startAngle + sweep,
                this.colors[index % this.colors.length],
            );
            startAngle += sweep;
        });

        image.strokeCircle(centerX, centerY, radius, [255, 255, 255], 3);
    }

    private drawLegend(
        image: RasterImage,
        dashboard: ExpenseCategoryDashboard,
    ) {
        const startX = 500;
        let y = 140;

        dashboard.categories.slice(0, 10).forEach((category, index) => {
            const color = this.colors[index % this.colors.length];
            image.fillRect(startX, y - 16, 24, 24, color);
            image.drawText(
                startX + 38,
                y - 14,
                this.sanitizeText(category.category),
                [31, 43, 46],
                2,
            );
            image.drawText(
                startX + 38,
                y + 10,
                `${category.amount.toFixed(2)} - ${category.percentage.toFixed(2)}%`,
                [92, 92, 92],
                2,
            );
            y += 58;
        });
    }

    private sanitizeText(value: string): string {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9 .,:%/_-]/g, '')
            .toUpperCase()
            .slice(0, 24);
    }
}

class RasterImage {
    private readonly data: Uint8Array;

    constructor(
        private readonly width: number,
        private readonly height: number,
        private readonly background: Rgb,
    ) {
        this.data = new Uint8Array(width * height * 4);
        this.clear(background);
    }

    clear(color: Rgb) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.setPixel(x, y, color);
            }
        }
    }

    fillRect(x: number, y: number, width: number, height: number, color: Rgb) {
        for (let yy = y; yy < y + height; yy++) {
            for (let xx = x; xx < x + width; xx++) {
                this.setPixel(xx, yy, color);
            }
        }
    }

    fillPieSlice(
        centerX: number,
        centerY: number,
        radius: number,
        startAngle: number,
        endAngle: number,
        color: Rgb,
    ) {
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > radius) {
                    continue;
                }

                const angle = this.normalizeAngle(Math.atan2(dy, dx));
                if (this.isAngleBetween(angle, startAngle, endAngle)) {
                    this.setPixel(x, y, color);
                }
            }
        }
    }

    strokeCircle(
        centerX: number,
        centerY: number,
        radius: number,
        color: Rgb,
        thickness: number,
    ) {
        for (
            let y = centerY - radius - thickness;
            y <= centerY + radius + thickness;
            y++
        ) {
            for (
                let x = centerX - radius - thickness;
                x <= centerX + radius + thickness;
                x++
            ) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (Math.abs(distance - radius) <= thickness) {
                    this.setPixel(x, y, color);
                }
            }
        }
    }

    drawText(x: number, y: number, text: string, color: Rgb, scale = 1) {
        let cursorX = x;
        text.toUpperCase()
            .split('')
            .forEach((char) => {
                const glyph = FONT[char] ?? FONT[' '];
                glyph.forEach((row, rowIndex) => {
                    row.split('').forEach((pixel, colIndex) => {
                        if (pixel === '1') {
                            this.fillRect(
                                cursorX + colIndex * scale,
                                y + rowIndex * scale,
                                scale,
                                scale,
                                color,
                            );
                        }
                    });
                });
                cursorX += (glyph[0].length + 1) * scale;
            });
    }

    toPng(): Buffer {
        const raw = Buffer.alloc((this.width * 4 + 1) * this.height);
        for (let y = 0; y < this.height; y++) {
            const rowStart = y * (this.width * 4 + 1);
            raw[rowStart] = 0;
            const sourceStart = y * this.width * 4;
            Buffer.from(this.data.buffer, sourceStart, this.width * 4).copy(
                raw,
                rowStart + 1,
            );
        }

        return Buffer.concat([
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
            this.chunk('IHDR', this.ihdr()),
            this.chunk('IDAT', deflateSync(raw)),
            this.chunk('IEND', Buffer.alloc(0)),
        ]);
    }

    private setPixel(x: number, y: number, color: Rgb) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return;
        }

        const offset = (y * this.width + x) * 4;
        this.data[offset] = color[0];
        this.data[offset + 1] = color[1];
        this.data[offset + 2] = color[2];
        this.data[offset + 3] = 255;
    }

    private ihdr(): Buffer {
        const buffer = Buffer.alloc(13);
        buffer.writeUInt32BE(this.width, 0);
        buffer.writeUInt32BE(this.height, 4);
        buffer[8] = 8;
        buffer[9] = 6;
        buffer[10] = 0;
        buffer[11] = 0;
        buffer[12] = 0;
        return buffer;
    }

    private chunk(type: string, data: Buffer): Buffer {
        const typeBuffer = Buffer.from(type);
        const length = Buffer.alloc(4);
        length.writeUInt32BE(data.length, 0);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
        return Buffer.concat([length, typeBuffer, data, crc]);
    }

    private normalizeAngle(angle: number): number {
        return angle < -Math.PI / 2 ? angle + Math.PI * 2 : angle;
    }

    private isAngleBetween(angle: number, start: number, end: number): boolean {
        const normalizedStart = this.normalizeAngle(start);
        const normalizedEnd = this.normalizeAngle(end);
        return normalizedStart <= normalizedEnd
            ? angle >= normalizedStart && angle <= normalizedEnd
            : angle >= normalizedStart || angle <= normalizedEnd;
    }
}

function crc32(buffer: Buffer): number {
    let crc = 0xffffffff;
    for (const byte of buffer) {
        crc ^= byte;
        for (let i = 0; i < 8; i++) {
            crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

const FONT: Record<string, string[]> = {
    ' ': ['000', '000', '000', '000', '000', '000', '000'],
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
    H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    I: ['111', '010', '010', '010', '010', '010', '111'],
    J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
    N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
    X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
    Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
    '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
    '1': ['010', '110', '010', '010', '010', '010', '111'],
    '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
    '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
    '4': ['10010', '10010', '10010', '11111', '00010', '00010', '00010'],
    '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
    '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
    '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
    '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
    '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
    '.': ['0', '0', '0', '0', '0', '0', '1'],
    ',': ['0', '0', '0', '0', '0', '1', '1'],
    ':': ['0', '1', '0', '0', '0', '1', '0'],
    '-': ['000', '000', '000', '111', '000', '000', '000'],
    '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
    '%': ['10001', '00010', '00100', '01000', '10001', '00000', '00000'],
    _: ['000', '000', '000', '000', '000', '000', '111'],
};
