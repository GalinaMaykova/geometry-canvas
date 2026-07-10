import { ctx } from './canvas.js';
export let segments = [];
export function addSegment(x1, y1, x2, y2) { segments.push({ x1, y1, x2, y2 }); }
export function removeLastSegment() { return segments.length > 0 ? segments.pop() : null; }
export function clearSegments() { segments = []; }
export function drawAllSegments() {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 2;
    for (let seg of segments) { ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke(); }
    ctx.restore();
}