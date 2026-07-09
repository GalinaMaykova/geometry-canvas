import { ctx } from './canvas.js';

export let namedPoints = [];

export function addNamedPoint(label, x, y) {
    namedPoints.push({ label, x, y });
    console.log('Добавлена точка ' + label + ': (' + x + ',' + y + ')');
}

export function removeLastNamedPoint() {
    if (namedPoints.length > 0) {
        const removed = namedPoints.pop();
        console.log('Удалена точка ' + removed.label + ': (' + removed.x + ',' + removed.y + ')');
        return removed;
    }
    return null;
}

export function clearNamedPoints() {
    namedPoints = [];
    console.log('Все именованные точки очищены');
}

export function drawNamedPoints() {
    ctx.save();
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let p of namedPoints) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.fillText(p.label, p.x + 14, p.y - 12);
    }
    ctx.restore();
}