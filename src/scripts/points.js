import { ctx } from './canvas.js';

export let namedPoints = [];

export function addNamedPoint(label, x, y) {
    namedPoints.push({ label, x, y });
}

export function removeLastNamedPoint() {
    return namedPoints.length > 0 ? namedPoints.pop() : null;
}

export function clearNamedPoints() {
    namedPoints = [];
}

export function drawNamedPoints() {
    if (!ctx) return;
    ctx.save();
    ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let p of namedPoints) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI); ctx.fillStyle = 'black'; ctx.fill();
        ctx.fillStyle = 'black'; ctx.fillText(p.label, p.x + 14, p.y - 12);
    }
    ctx.restore();
}