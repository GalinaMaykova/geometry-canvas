/**
 * Модуль подсказок. Анализирует текущее состояние и возвращает сообщения.
 */

/**
 * Проверяет, пересекаются ли два отрезка.
 */
function segmentsIntersect(s1, s2) {
    const x1 = s1.x1, y1 = s1.y1, x2 = s1.x2, y2 = s1.y2;
    const x3 = s2.x1, y3 = s2.y1, x4 = s2.x2, y4 = s2.y2;
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return false;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Вычисляет точку пересечения двух отрезков (если есть).
 */
function getIntersectionPoint(s1, s2) {
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

/**
 * Проверяет, совпадает ли точка с серединой отрезка (допуск 2 пикселя).
 */
function isMidpoint(px, py, s) {
    const mx = (s.x1 + s.x2) / 2;
    const my = (s.y1 + s.y2) / 2;
    return Math.abs(px - mx) < 2 && Math.abs(py - my) < 2;
}

/**
 * Основная функция подсказки.
 * @param {Array} segments
 * @returns {{ result: string, analysis: string[] }}
 */
export function getHintMessage(segments) {
    const count = segments.length;

    if (count === 0) {
        return {
            result: 'Нарисуй отрезок, нажав на холст в начале и конце отрезка.',
            analysis: ['ℹ️ Холст пуст — начни с первого отрезка.']
        };
    }

    if (count === 1) {
        return {
            result: 'Написано отрезки. Отрезки — это больше чем один.',
            analysis: ['ℹ️ Один отрезок: нужно добавить ещё один, чтобы получить пересечение.']
        };
    }

    if (count === 2) {
        const [s1, s2] = segments;
        const intersectPt = getIntersectionPoint(s1, s2);
        if (!intersectPt) {
            return {
                result: 'Отрезки это хорошо, но они должны пересекаться.',
                analysis: ['❌ Два отрезка не пересекаются — построй их так, чтобы они пересеклись.']
            };
        }

        // Пересекаются. Проверяем, является ли точка пересечения серединой обоих
        const mid1 = isMidpoint(intersectPt.x, intersectPt.y, s1);
        const mid2 = isMidpoint(intersectPt.x, intersectPt.y, s2);

        if (mid1 && mid2) {
            return {
                result: 'Пересекаются в середине. Теперь расставь точки A, B, C, D, E.',
                analysis: ['✅ Пересечение в серединах обоих отрезков. Можно обозначать вершины.']
            };
        } else {
            return {
                result: 'Пересекаются не в середине.',
                analysis: ['ℹ️ Отрезки пересекаются, но не в своих серединах. Добейтесь пересечения в центре.']
            };
        }
    }

    // Больше двух отрезков — общая подсказка
    return {
        result: 'На холсте несколько отрезков. Продолжай строить чертёж.',
        analysis: ['ℹ️ Несколько отрезков построено.']
    };
}