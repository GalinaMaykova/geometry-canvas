// Управление линиями
import { ctx } from './canvas.js';

// Массив линий
export let lines = [];

// Добавить линию
export function addLine(x1, y1, x2, y2) {
    lines.push({ x1, y1, x2, y2 });
}

// Отрисовать все линии
export function drawAllLines() {
    ctx.save();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    for (let line of lines) {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
    }
    ctx.restore();
}

// Очистить все линии
export function clearLines() {
    lines = [];
}