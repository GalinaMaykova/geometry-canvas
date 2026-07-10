import { ctx, W, H } from './canvas.js';

// Размер одной клетки сетки (30 пикселей)
export const GRID_SIZE = 30;

/**
 * Привязывает координату к ближайшему узлу сетки.
 * @param {number} coord – исходная координата (например, координата клика)
 * @returns {number} – координата, кратная GRID_SIZE
 */
export function snapToGrid(coord) {
    return Math.round(coord / GRID_SIZE) * GRID_SIZE;
}

/**
 * Проверяет, находится ли точка внутри холста.
 * @param {number} x – координата X
 * @param {number} y – координата Y
 * @returns {boolean} – true, если точка внутри
 */
export function isInsideCanvas(x, y) {
    return x >= 0 && x <= W && y >= 0 && y <= H;
}

/**
 * Рисует серую сетку на холсте.
 * Вызывается при каждой перерисовке.
 */
export function drawGrid() {
    if (!ctx) return;   // если контекст ещё не инициализирован – выходим
    ctx.save();         // сохраняем текущее состояние контекста
    ctx.strokeStyle = '#ddd';   // светло-серые линии
    ctx.lineWidth = 1;
    // Вертикальные линии
    for (let x = 0; x <= W; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    // Горизонтальные линии
    for (let y = 0; y <= H; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
    ctx.restore();      // восстанавливаем сохранённое состояние
}