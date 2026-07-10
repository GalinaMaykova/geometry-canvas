import { ctx } from './canvas.js';

export let possiblePoints = [];
let nextId = 1;

export function clearPossiblePoints() {
    possiblePoints = [];
    nextId = 1;
}

function addPossiblePoint(x, y, tolerance = 1) {
    for (let p of possiblePoints) {
        if (Math.abs(p.x - x) < tolerance && Math.abs(p.y - y) < tolerance) return;
    }
    possiblePoints.push({ id: 'T' + nextId, x, y });
    nextId++;
}

export function updatePossiblePoints(segments) {
    clearPossiblePoints();
    for (let seg of segments) {
        addPossiblePoint(seg.x1, seg.y1);
        addPossiblePoint(seg.x2, seg.y2);
    }
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            const p = segmentIntersection(segments[i], segments[j]);
            if (p) addPossiblePoint(p.x, p.y);
        }
    }
    possiblePoints.sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));
}

function segmentIntersection(s1, s2) {
    const x1 = s1.x1, y1 = s1.y1, x2 = s1.x2, y2 = s1.y2;
    const x3 = s2.x1, y3 = s2.y1, x4 = s2.x2, y4 = s2.y2;
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        return { x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) };
    }
    return null;
}

export function findClosestPossiblePoint(x, y, maxDist = 25) {
    let best = null, bestDist = Infinity;
    for (let p of possiblePoints) {
        const dx = p.x - x, dy = p.y - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < bestDist && dist <= maxDist) { bestDist = dist; best = p; }
    }
    return best;
}

export function drawPossiblePoints() {
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1;
    for (let p of possiblePoints) {
        const s = 4;
        ctx.beginPath(); ctx.moveTo(p.x - s, p.y - s); ctx.lineTo(p.x + s, p.y + s);
        ctx.moveTo(p.x + s, p.y - s); ctx.lineTo(p.x - s, p.y + s); ctx.stroke();
        ctx.fillStyle = '#888'; ctx.font = '10px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText(p.id, p.x + 6, p.y - 2);
    }
    ctx.restore();
}