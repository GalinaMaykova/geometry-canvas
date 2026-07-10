export const lessons = {
    'lesson1-1': {
        title: 'Занятие 1. Знакомство с редактором',
        intro: '<h2>Введение</h2><p>Здесь вы научитесь пользоваться редактором: рисовать отрезки, проверять пересечения и получать подсказки.</p>',
        tasks: [
            { id: 'lesson1-1-task1', title: 'Задание 1. Первый чертёж', taskConfigId: 'task1-1' },
            { id: 'lesson1-1-task2', title: 'Задание 2. Второй чертёж', taskConfigId: 'task1-1' }
        ]
    },
    'lesson1-2': {
        title: 'Занятие 2. Самостоятельный чертёж',
        intro: '<h2>Введение</h2><p>Теперь попробуйте самостоятельно нарисовать чертёж по описанию.</p>',
        tasks: [
            { id: 'lesson1-2-task1', title: 'Задание 1. Пересекающиеся отрезки', taskConfigId: 'task1-1' },
            { id: 'lesson1-2-task2', title: 'Задание 2. Ещё один чертёж', taskConfigId: 'task1-1' }
        ]
    }
};

export const tasks = {
    'task1-1': {
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
                    const denom = (s1.x1 - s1.x2)*(s2.y1 - s2.y2) - (s1.y1 - s1.y2)*(s2.x1 - s2.x2);
                    if (Math.abs(denom) < 1e-10) return false;
                    const t = ((s1.x1 - s2.x1)*(s2.y1 - s2.y2) - (s1.y1 - s2.y1)*(s2.x1 - s2.x2)) / denom;
                    const u = -((s1.x1 - s1.x2)*(s1.y1 - s2.y1) - (s1.y1 - s1.y2)*(s1.x1 - s2.x1)) / denom;
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
                result = 'Оставьте только два отрезка.';
                analysis.push('⚠️ Слишком много отрезков (ожидается 2).');
            }
            return { result, analysis };
        },
        hint(segments) {
            const count = segments.length;
            if (count === 0) return { result: 'Нарисуйте первый отрезок, кликнув по холсту дважды.', analysis: ['ℹ️ Начните с первого отрезка.'] };
            if (count === 1) return { result: 'Нарисуйте второй отрезок.', analysis: ['ℹ️ Добавьте ещё один отрезок.'] };
            if (count === 2) {
                const [s1, s2] = segments;
                const intersect = (function() {
                    const denom = (s1.x1 - s1.x2)*(s2.y1 - s2.y2) - (s1.y1 - s1.y2)*(s2.x1 - s2.x2);
                    if (Math.abs(denom) < 1e-10) return false;
                    const t = ((s1.x1 - s2.x1)*(s2.y1 - s2.y2) - (s1.y1 - s2.y1)*(s2.x1 - s2.x2)) / denom;
                    const u = -((s1.x1 - s1.x2)*(s1.y1 - s2.y1) - (s1.y1 - s1.y2)*(s1.x1 - s2.x1)) / denom;
                    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
                })();
                if (!intersect) return { result: 'Отрезки не пересекаются. Попробуйте расположить их крест-накрест.', analysis: ['❌ Два отрезка не пересекаются.'] };
                return { result: 'Отлично! Отрезки пересекаются. Задача решена!', analysis: ['✅ Два отрезка пересекаются.'] };
            }
            return { result: 'Оставьте только два отрезка.', analysis: ['⚠️ Слишком много отрезков.'] };
        }
    }
};