/**
 * Конфигурация задач.
 * Каждая задача содержит:
 * - id: идентификатор (task1, task2)
 * - check: функция проверки чертежа, принимает segments и possiblePoints, возвращает { result, analysis }
 * - hint: функция подсказки, принимает segments, возвращает { result, analysis }
 */
import { segments as getSegments, possiblePoints as getPossiblePoints } from './segments.js?no-cache'; // маленький хак, чтобы не было конфликтов с именами

export const tasks = {
    task1: {
        check(segments) {
            const count = segments.length;
            const analysis = [];
            let result = '';

            if (count < 2) {
                result = 'Нарисуйте два отрезка.';
                analysis.push('❌ Недостаточно отрезков (нужно 2).');
            } else if (count === 2) {
                const [s1, s2] = segments;
                const intersect = (function() {
                    const x1 = s1.x1, y1 = s1.y1, x2 = s1.x2, y2 = s1.y2;
                    const x3 = s2.x1, y3 = s2.y1, x4 = s2.x2, y4 = s2.y2;
                    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
                    if (Math.abs(denom) < 1e-10) return false;
                    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
                    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
                    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
                })();
                if (intersect) {
                    result = '✅ Отрезки пересекаются. Задача выполнена!';
                    analysis.push('✅ Два отрезка пересекаются.');
                } else {
                    result = 'Отрезки не пересекаются. Попробуйте сделать их пересекающимися.';
                    analysis.push('❌ Отрезки не пересекаются.');
                }
            } else {
                result = 'На холсте больше двух отрезков. Оставьте только два.';
                analysis.push('⚠️ Слишком много отрезков (ожидается 2).');
            }
            return { result, analysis };
        },

        hint(segments) {
            const count = segments.length;
            if (count === 0) {
                return {
                    result: 'Нарисуйте первый отрезок, кликнув по холсту дважды.',
                    analysis: ['ℹ️ Начните с первого отрезка.']
                };
            } else if (count === 1) {
                return {
                    result: 'Нарисуйте второй отрезок.',
                    analysis: ['ℹ️ Добавьте ещё один отрезок.']
                };
            } else if (count === 2) {
                const [s1, s2] = segments;
                const intersect = (function() {
                    const x1 = s1.x1, y1 = s1.y1, x2 = s1.x2, y2 = s1.y2;
                    const x3 = s2.x1, y3 = s2.y1, x4 = s2.x2, y4 = s2.y2;
                    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
                    if (Math.abs(denom) < 1e-10) return false;
                    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
                    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
                    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
                })();
                if (!intersect) {
                    return {
                        result: 'Отрезки не пересекаются. Попробуйте расположить их крест-накрест.',
                        analysis: ['❌ Два отрезка не пересекаются.']
                    };
                } else {
                    return {
                        result: 'Отлично! Отрезки пересекаются. Задача решена!',
                        analysis: ['✅ Два отрезка пересекаются. Можно переходить к следующей задаче.']
                    };
                }
            } else {
                return {
                    result: 'Оставьте только два отрезка.',
                    analysis: ['⚠️ Слишком много отрезков.']
                };
            }
        }
    },

    task2: {
        // Для task2 используются те же функции, что и раньше: performAnalysis и getHintMessage из main.js
        // Но мы разместим их в отдельных модулях или прямо здесь. Оставим как ссылки, чтобы main.js вызывал свои.
        // Для удобства просто продублируем старые функции в этом модуле.
        // (В реальном коде лучше вынести в отдельные файлы, но пока так)
    }
};