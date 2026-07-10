export const lessons = {
    'lesson1-1': {
        title: 'Занятие 1. Знакомство с редактором',
        intro: '<h2>Введение</h2><p>Здесь вы научитесь пользоваться редактором: рисовать отрезки, проверять пересечения и получать подсказки.</p>',
        tasks: [
            { id: 'lesson1-1-task1', title: 'Задание 1. Два отрезка', taskConfigId: 'task1-1' },
            { id: 'lesson1-1-task2', title: 'Задание 2. Треугольник', taskConfigId: 'task1-2' }
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

function mergeSegments(segments) {
    if (segments.length === 0) return [];
    const groups = []; const used = new Array(segments.length).fill(false);
    for (let i = 0; i < segments.length; i++) {
        if (used[i]) continue;
        const seg = segments[i]; const group = [seg]; used[i] = true;
        const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
        for (let j = i + 1; j < segments.length; j++) {
            if (used[j]) continue;
            const other = segments[j];
            const otherAngle = Math.atan2(other.y2 - other.y1, other.x2 - other.x1);
            if (Math.abs(angle - otherAngle) < 0.001 || Math.abs(angle - otherAngle + Math.PI) < 0.001 || Math.abs(angle - otherAngle - Math.PI) < 0.001) {
                const dist = distancePointToLine(seg.x1, seg.y1, other.x1, other.y1, other.x2, other.y2);
                if (dist < 2) { group.push(other); used[j] = true; }
            }
        }
        groups.push(group);
    }
    const merged = [];
    for (const group of groups) {
        if (group.length === 1) { merged.push({ ...group[0] }); continue; }
        let points = [];
        for (const seg of group) { points.push({ x: seg.x1, y: seg.y1 }); points.push({ x: seg.x2, y: seg.y2 }); }
        const dx = group[0].x2 - group[0].x1; const dy = group[0].y2 - group[0].y1;
        const len = Math.sqrt(dx*dx + dy*dy) || 1; const ux = dx / len; const uy = dy / len;
        points.sort((a, b) => { const projA = a.x * ux + a.y * uy; const projB = b.x * ux + b.y * uy; return projA - projB; });
        const filtered = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const last = filtered[filtered.length - 1];
            if (Math.hypot(points[i].x - last.x, points[i].y - last.y) > 2) filtered.push(points[i]);
        }
        if (filtered.length >= 2) merged.push({ x1: filtered[0].x, y1: filtered[0].y, x2: filtered[filtered.length - 1].x, y2: filtered[filtered.length - 1].y });
        else merged.push({ ...group[0] });
    }
    return merged;
}
function distancePointToLine(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1; const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len === 0) return Math.hypot(px - x1, py - y1);
    return Math.abs((py - y1)*dx - (px - x1)*dy) / len;
}

export const tasks = {
    'task1-1': {
        letters: ['A', 'B', 'C', 'D'],
        check(segments, namedPoints) {
            const merged = mergeSegments(segments);
            if (merged.length !== 2) return { result: 'Должно получиться ровно два отрезка.', analysis: ['❌ После объединения осталось ' + merged.length + ' отрезков.'] };
            const [s1, s2] = merged;
            const intersect = (function() {
                const denom = (s1.x1 - s1.x2)*(s2.y1 - s2.y2) - (s1.y1 - s1.y2)*(s2.x1 - s2.x2);
                if (Math.abs(denom) < 1e-10) return false;
                const t = ((s1.x1 - s2.x1)*(s2.y1 - s2.y2) - (s1.y1 - s2.y1)*(s2.x1 - s2.x2)) / denom;
                const u = -((s1.x1 - s1.x2)*(s1.y1 - s2.y1) - (s1.y1 - s1.y2)*(s1.x1 - s2.x1)) / denom;
                return t >= 0 && t <= 1 && u >= 0 && u <= 1;
            })();
            if (!intersect) return { result: 'Отрезки не пересекаются.', analysis: ['❌ Отрезки должны пересекаться.'] };
            if (!namedPoints || namedPoints.length !== 4) return { result: 'Расставьте точки A, B, C, D.', analysis: ['❌ Должно быть 4 именованные точки.'] };
            const labels = namedPoints.map(p => p.label).sort().join(',');
            if (labels !== 'A,B,C,D') return { result: 'Используйте точки A, B, C, D.', analysis: ['❌ Ожидаются точки A, B, C, D.'] };
            const getLabel = (x, y) => { for (let np of namedPoints) if (Math.abs(np.x - x) < 1 && Math.abs(np.y - y) < 1) return np.label; return null; };
            const ends1 = [getLabel(s1.x1, s1.y1), getLabel(s1.x2, s1.y2)].sort().join(',');
            const ends2 = [getLabel(s2.x1, s2.y1), getLabel(s2.x2, s2.y2)].sort().join(',');
            const validPairs = ['A,B', 'C,D'];
            if (!validPairs.includes(ends1) || !validPairs.includes(ends2) || ends1 === ends2) return { result: 'Точки A,B должны быть на одном отрезке, C,D – на другом.', analysis: ['❌ Неправильное распределение точек.'] };
            return { result: '✅ Задача выполнена!', analysis: ['✅ Два пересекающихся отрезка с правильными точками.'] };
        },
        hint(segments) {
            const merged = mergeSegments(segments);
            if (merged.length === 0) return { result: 'Нарисуйте первый отрезок.', analysis: ['ℹ️ Начните с первого отрезка.'] };
            if (merged.length === 1) return { result: 'Нарисуйте второй отрезок.', analysis: ['ℹ️ Добавьте ещё один отрезок.'] };
            if (merged.length >= 2) {
                const [s1, s2] = merged;
                const intersect = (function() {
                    const denom = (s1.x1 - s1.x2)*(s2.y1 - s2.y2) - (s1.y1 - s1.y2)*(s2.x1 - s2.x2);
                    if (Math.abs(denom) < 1e-10) return false;
                    const t = ((s1.x1 - s2.x1)*(s2.y1 - s2.y2) - (s1.y1 - s2.y1)*(s2.x1 - s2.x2)) / denom;
                    const u = -((s1.x1 - s1.x2)*(s1.y1 - s2.y1) - (s1.y1 - s1.y2)*(s1.x1 - s2.x1)) / denom;
                    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
                })();
                if (!intersect) return { result: 'Отрезки не пересекаются.', analysis: ['❌ Два отрезка не пересекаются.'] };
                return { result: 'Отлично! Теперь нажмите «Точки» и расставьте A, B, C, D.', analysis: ['✅ Осталось обозначить вершины.'] };
            }
            return { result: 'Оставьте только два отрезка.', analysis: ['⚠️ Слишком много отрезков.'] };
        }
    },
    'task1-2': {
        letters: ['A', 'B', 'C'],
        check(segments, namedPoints) {
            if (segments.length !== 3) return { result: 'Должно быть ровно три отрезка.', analysis: ['❌ Количество отрезков не равно трём.'] };
            const points = new Map();
            for (let seg of segments) {
                const key1 = seg.x1 + ',' + seg.y1; const key2 = seg.x2 + ',' + seg.y2;
                points.set(key1, (points.get(key1) || 0) + 1); points.set(key2, (points.get(key2) || 0) + 1);
            }
            let isValid = true;
            for (let count of points.values()) if (count !== 2) { isValid = false; break; }
            if (!isValid) return { result: 'Отрезки не образуют треугольник.', analysis: ['❌ Концы отрезков должны попарно совпадать.'] };
            if (!namedPoints || namedPoints.length !== 3) return { result: 'Расставьте точки A, B, C.', analysis: ['❌ Нужно поставить три именованные точки.'] };
            const labels = namedPoints.map(p => p.label).sort().join(',');
            if (labels !== 'A,B,C') return { result: 'Используйте точки A, B, C.', analysis: ['❌ Ожидаются точки A, B, C.'] };
            return { result: '✅ Треугольник ABC построен!', analysis: ['✅ Треугольник с вершинами A, B, C.'] };
        },
        hint(segments) {
            if (segments.length < 3) return { result: 'Постройте три отрезка.', analysis: ['ℹ️ Нужно три отрезка.'] };
            if (segments.length > 3) return { result: 'Оставьте только три отрезка.', analysis: ['⚠️ Слишком много отрезков.'] };
            const points = new Map();
            for (let seg of segments) {
                const key1 = seg.x1 + ',' + seg.y1; const key2 = seg.x2 + ',' + seg.y2;
                points.set(key1, (points.get(key1) || 0) + 1); points.set(key2, (points.get(key2) || 0) + 1);
            }
            if (points.size !== 3) return { result: 'Три отрезка должны иметь общие концы.', analysis: ['ℹ️ Должно быть три уникальные точки.'] };
            return { result: 'Отлично! Теперь нажмите «Точки» и расставьте A, B, C.', analysis: ['✅ Осталось обозначить вершины.'] };
        }
    }
};