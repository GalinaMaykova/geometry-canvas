import { ctx } from './canvas.js';

// Массив именованных точек [{label: 'A', x: число, y: число}, ...]
export let namedPoints = [];

/**
 * Добавляет именованную точку с заданной буквой и координатами.
 * @param {string} label – буква точки (например 'A')
 * @param {number} x – координата X
 * @param {number} y – координата Y
 */
export function addNamedPoint(label, x, y) {
    namedPoints.push({ label, x, y });
    console.log('Добавлена точка ' + label + ': (' + x + ',' + y + ')');
}

/**
 * Удаляет последнюю добавленную именованную точку (используется при отмене действия).
 * @returns {Object|null} удалённая точка или null, если массив пуст
 */
export function removeLastNamedPoint() {
    if (namedPoints.length > 0) {
        const removed = namedPoints.pop();
        console.log('Удалена точка ' + removed.label + ': (' + removed.x + ',' + removed.y + ')');
        return removed;
    }
    return null;
}

/**
 * Полностью очищает список именованных точек.
 */
export function clearNamedPoints() {
    namedPoints = [];
    console.log('Все именованные точки очищены');
}

/**
 * Рисует все именованные точки: чёрные кружки и букву рядом.
 */
export function drawNamedPoints() {
    ctx.save();
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let p of namedPoints) {
        // Рисуем маленький чёрный круг в точке
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();
        // Подписываем букву чуть правее и выше
        ctx.fillStyle = 'black';
        ctx.fillText(p.label, p.x + 14, p.y - 12);
    }
    ctx.restore();
}