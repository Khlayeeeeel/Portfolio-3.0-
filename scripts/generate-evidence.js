#!/usr/bin/env node
/**
 * Generates the three placeholder evidence frames without any dependency.
 *
 * evidence_01 is heavily blurred, evidence_02 is partially blurred and
 * evidence_03 is sharp: replace them with your own JPEGs (same file names) and
 * the evidence route will serve your files instead.
 *
 *   node scripts/generate-evidence.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const W = 640;
const H = 400;

// --- PNG encoding ----------------------------------------------------------
const CRC_TABLE = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c;
    }
    return table;
})();

function crc32(buffer) {
    let c = -1;
    for (let i = 0; i < buffer.length; i++) {
        c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ -1) >>> 0;
}

function chunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
    return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, rgb) {
    const stride = width * 3;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0; // filter: none
        rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }

    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // colour type: truecolour RGB

    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        chunk("IHDR", ihdr),
        chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
}

// --- Scene -----------------------------------------------------------------
const clampIndex = (value, min, max) => (value < min ? min : value > max ? max : value);

function makeScene() {
    const pixels = new Float64Array(W * H * 3);

    // Cold night gradient.
    for (let y = 0; y < H; y++) {
        const t = y / H;
        const v = 10 + 16 * (1 - t);
        for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 3;
            pixels[i] = v * 0.75;
            pixels[i + 1] = v * 0.8;
            pixels[i + 2] = v * 1.15;
        }
    }

    // Red glow behind the subject (the camera light).
    const glowX = W / 2;
    const glowY = H * 0.55;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const dx = (x - glowX) / 230;
            const dy = (y - glowY) / 250;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const glow = Math.max(0, 1 - distance) ** 2;
            const i = (y * W + x) * 3;
            pixels[i] += 165 * glow;
            pixels[i + 1] += 22 * glow;
            pixels[i + 2] += 34 * glow;
        }
    }

    // Silhouette: head + shoulders.
    const headX = W / 2;
    const headY = H * 0.36;
    const headRadius = 46;
    const shoulderTop = H * 0.5;

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let inside = false;
            const dx = x - headX;
            const dy = y - headY;
            if (dx * dx + dy * dy <= headRadius * headRadius) inside = true;
            if (y >= shoulderTop) {
                const halfWidth = 60 + (y - shoulderTop) * 0.92;
                if (Math.abs(x - headX) <= halfWidth) inside = true;
            }
            if (inside) {
                const i = (y * W + x) * 3;
                pixels[i] = 5;
                pixels[i + 1] = 5;
                pixels[i + 2] = 7;
            }
        }
    }

    return pixels;
}

function boxBlurHorizontal(src, radius) {
    const dst = new Float64Array(src.length);
    const windowSize = radius * 2 + 1;

    for (let y = 0; y < H; y++) {
        const row = y * W * 3;
        for (let c = 0; c < 3; c++) {
            let sum = 0;
            for (let k = -radius; k <= radius; k++) {
                sum += src[row + clampIndex(k, 0, W - 1) * 3 + c];
            }
            for (let x = 0; x < W; x++) {
                dst[row + x * 3 + c] = sum / windowSize;
                const outgoing = clampIndex(x - radius, 0, W - 1);
                const incoming = clampIndex(x + radius + 1, 0, W - 1);
                sum += src[row + incoming * 3 + c] - src[row + outgoing * 3 + c];
            }
        }
    }
    return dst;
}

function boxBlurVertical(src, radius) {
    const dst = new Float64Array(src.length);
    const windowSize = radius * 2 + 1;

    for (let x = 0; x < W; x++) {
        for (let c = 0; c < 3; c++) {
            let sum = 0;
            for (let k = -radius; k <= radius; k++) {
                sum += src[clampIndex(k, 0, H - 1) * W * 3 + x * 3 + c];
            }
            for (let y = 0; y < H; y++) {
                dst[y * W * 3 + x * 3 + c] = sum / windowSize;
                const outgoing = clampIndex(y - radius, 0, H - 1);
                const incoming = clampIndex(y + radius + 1, 0, H - 1);
                sum += src[incoming * W * 3 + x * 3 + c] - src[outgoing * W * 3 + x * 3 + c];
            }
        }
    }
    return dst;
}

function blur(src, radius, passes) {
    let data = src;
    for (let pass = 0; pass < passes; pass++) {
        data = boxBlurHorizontal(data, radius);
        data = boxBlurVertical(data, radius);
    }
    return data;
}

function finish(pixels) {
    const out = Buffer.alloc(W * H * 3);
    for (let y = 0; y < H; y++) {
        const scanline = y % 4 === 0 ? 0.9 : 1;
        for (let x = 0; x < W; x++) {
            const dx = (x - W / 2) / (W / 2);
            const dy = (y - H / 2) / (H / 2);
            const vignette = 1 - 0.4 * Math.min(1, Math.sqrt(dx * dx + dy * dy));
            const i = (y * W + x) * 3;
            for (let c = 0; c < 3; c++) {
                const value = pixels[i + c] * scanline * vignette;
                out[i + c] = value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
            }
        }
    }
    return out;
}

// --- Write the three frames ------------------------------------------------
const OUTPUTS = [
    { file: "evidence_01.png", radius: 14, passes: 3 },
    { file: "evidence_02.png", radius: 5, passes: 2 },
    { file: "evidence_03.png", radius: 0, passes: 0 },
];

const directory = path.join(__dirname, "..", "private-assets");
fs.mkdirSync(directory, { recursive: true });

const scene = makeScene();

for (const output of OUTPUTS) {
    const processed = output.radius > 0 ? blur(scene, output.radius, output.passes) : scene;
    const png = encodePng(W, H, finish(processed));
    const target = path.join(directory, output.file);
    fs.writeFileSync(target, png);
    console.log(`${output.file}: ${(png.length / 1024).toFixed(1)} KB`);
}
