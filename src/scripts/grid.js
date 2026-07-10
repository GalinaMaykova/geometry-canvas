import { ctx, W, H } from './canvas.js';
export const GRID_SIZE = 30;
export function snapToGrid(coord) { return Math.round(coord / GRID_SIZE) * GRID_SIZE; }
export function isInsideCanvas(x, y) { return x >= 0 && x <= W && y >= 0 && y <= H; }
export function drawGrid() {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += GRID_SIZE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
}