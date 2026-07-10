// ===== taskConfig.js – конфигурация уроков и проверка заданий =====
// Здесь описаны все уроки, их введения и задания.
// Также содержатся функции проверки (check) и подсказки (hint) для каждого задания.

/**
 * Структура уроков.
 * Каждый урок имеет:
 *   - title: название урока
 *   - intro: HTML-текст введения (показывается при выборе «Введение»)
 *   - tasks: массив заданий, каждое из которых ссылается на taskConfigId
 */
export const lessons = {
    // Урок 1
    'lesson1-1': {
        title: 'Занятие 1. Знакомство с редактором',
        intro: '<h2>Введение</h2><p>Здесь вы научитесь пользоваться редактором: рисовать отрезки, проверять пересечения и получать подсказки.</p>',
        tasks: [
            { id: 'lesson1-1-task1', title: 'Задание 1. Два отрезка', taskConfigId: 'task1-1' },
            { id: 'lesson1-1-task2', title: 'Задание 2. Треугольник', taskConfigId: 'task1-2' }
        ]
    },
    // Урок 2 (заглушка, можно будет наполнить позже)
    'lesson1-2': {
        title: 'Занятие 2. Самостоятельный чертёж',
        intro: '<h2>Введение</h2><p>Теперь попробуйте самостоятельно нарисовать чертёж по описанию.</p>',
        tasks: [
            { id: 'lesson1-2-task1', title: 'Задание 1. Пересекающиеся отрезки', taskConfigId: 'task1-1' },
            { id: 'lesson1-2-task2', title: 'Задание 2. Ещё один чертёж', taskConfigId: 'task1-1' }
        ]
    }
};

// ---------- Вспомогательные функции для работы с отрезками ----------

/**
 * Объединяет отрезки, лежащие на одной прямой и соприкасающиеся (или перекрывающиеся).
 * Это нужно, чтобы считать несколько маленьких отрезков на одной прямой одним большим.
 * @param {Array} segments – массив отрезков [{x1,y1,x2,y2}, ...]
 * @returns {Array} – массив объединённых отрезков
 */
function mergeSegments(segments) {
    if (segments.length === 0) return [];

    // Группируем отрезки по прямым, на которых они лежат
    const groups = [];
    const used = new Array(segments.length).fill(false);  // флаги, чтобы не обрабатывать повторно

    for (let i = 0; i < segments.length; i++) {
        if (used[i]) continue;
        const seg = segments[i];
        const group = [seg];
        used[i] = true;

        // Вычисляем угол наклона первого отрезка
        const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);

        // Ищем другие отрезки с таким же углом и лежащие на той же прямой
        for (let j = i + 1; j < segments.length; j++) {
            if (used[j]) continue;
            const other = segments[j];
            const otherAngle = Math.atan2(other.y2 - other.y1, other.x2 - other.x1);

            // Проверяем, что угол почти одинаковый (допуск ~0.001 радиан)
            if (Math.abs(angle - otherAngle) < 0.001 ||
                Math.abs(angle - otherAngle + Math.PI) < 0.001 ||
                Math.abs(angle - otherAngle - Math.PI) < 0.001) {

                // Проверяем расстояние от точки первого отрезка до прямой второго отрезка
                const dist = distancePointToLine(seg.x1, seg.y1, other.x1, other.y1, other.x2, other.y2);
                if (dist < 2) {   // если расстояние мало – отрезки на одной прямой
                    group.push(other);
                    used[j] = true;
                }
            }
        }
        groups.push(group);
    }

    // В каждой группе объединяем отрезки
    const merged = [];
    for (const group of groups) {
        if (group.length === 1) {
            // Если отрезок один – просто копируем его
            merged.push({ ...group[0] });
            continue;
        }

        // Собираем все точки всех отрезков группы
        let points = [];
        for (const seg of group) {
            points.push({ x: seg.x1, y: seg.y1 });
            points.push({ x: seg.x2, y: seg.y2 });
        }

        // Сортируем точки вдоль прямой (по проекции на направление)
        const dx = group[0].x2 - group[0].x1;
        const dy = group[0].y2 - group[0].y1;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;   // длина первого отрезка
        const ux = dx / len;   // единичный вектор направления
        const uy = dy / len;

        points.sort((a, b) => {
            const projA = a.x * ux + a.y * uy;
            const projB = b.x * ux + b.y * uy;
            return projA - projB;
        });

        // Убираем дублирующиеся точки (очень близкие)
        const filtered = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const last = filtered[filtered.length - 1];
            if (Math.hypot(points[i].x - last.x, points[i].y - last.y) > 2) {
                filtered.push(points[i]);
            }
        }

        // Создаём итоговый отрезок от самой левой до самой правой точки
        if (filtered.length >= 2) {
            merged.push({
                x1: filtered[0].x, y1: filtered[0].y,
                x2: filtered[filtered.length - 1].x, y2: filtered[filtered.length - 1].y
            });
        } else {
            // Если все точки слились (вырожденный случай) – оставляем первый отрезок
            merged.push({ ...group[0] });
        }
    }
    return merged;
}

/**
 * Вычисляет расстояние от точки (px,py) до прямой, заданной двумя точками (x1,y1)-(x2,y2).
 * @returns {number} расстояние в пикселях
 */
function distancePointToLine(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return Math.hypot(px - x1, py - y1);  // отрезок вырожден в точку
    return Math.abs((py - y1) * dx - (px - x1) * dy) / len;
}

// ---------- Конфигурация заданий ----------
export const tasks = {
    // Задание 1: «Два отрезка» (требует точки A, B, C, D)
    'task1-1': {
        // Буквы, доступные для расстановки
        letters: ['A', 'B', 'C', 'D'],

        /**
         * Проверяет, правильно ли выполнено задание.
         * @param {Array} segments – массив отрезков
         * @param {Array} namedPoints – массив именованных точек
         * @returns {{result: string, analysis: string[]}}
         */
        check(segments, namedPoints) {
            // 1. Объединяем отрезки на одной прямой
            const merged = mergeSegments(segments);
            if (merged.length !== 2) {
                return {
                    result: 'Должно получиться ровно два отрезка.',
                    analysis: ['❌ После объединения отрезков на одной прямой должно остаться два отрезка. Сейчас их ' + merged.length + '.']
                };
            }

            const [s1, s2] = merged;

            // 2. Проверяем, пересекаются ли два итоговых отрезка
            const intersect = (function () {
                const denom = (s1.x1 - s1.x2) * (s2.y1 - s2.y2) - (s1.y1 - s1.y2) * (s2.x1 - s2.x2);
                if (Math.abs(denom) < 1e-10) return false;   // параллельны
                const t = ((s1.x1 - s2.x1) * (s2.y1 - s2.y2) - (s1.y1 - s2.y1) * (s2.x1 - s2.x2)) / denom;
                const u = -((s1.x1 - s1.x2) * (s1.y1 - s2.y1) - (s1.y1 - s1.y2) * (s1.x1 - s2.x1)) / denom;
                return t >= 0 && t <= 1 && u >= 0 && u <= 1;
            })();

            if (!intersect) {
                return { result: 'Отрезки не пересекаются.', analysis: ['❌ Отрезки должны пересекаться.'] };
            }

            // 3. Проверяем, что расставлены ровно 4 точки с нужными буквами
            if (!namedPoints || namedPoints.length !== 4) {
                return { result: 'Расставьте точки A, B, C, D.', analysis: ['❌ Должно быть 4 именованные точки.'] };
            }
            const labels = namedPoints.map(p => p.label).sort().join(',');
            if (labels !== 'A,B,C,D') {
                return { result: 'Используйте точки A, B, C, D.', analysis: ['❌ Ожидаются точки A, B, C, D.'] };
            }

            // 4. Проверяем, что точки A и B находятся на одном отрезке, а C и D – на другом
            const getLabel = (x, y) => {
                for (let np of namedPoints) if (Math.abs(np.x - x) < 1 && Math.abs(np.y - y) < 1) return np.label;
                return null;
            };
            const ends1 = [getLabel(s1.x1, s1.y1), getLabel(s1.x2, s1.y2)].sort().join(',');
            const ends2 = [getLabel(s2.x1, s2.y1), getLabel(s2.x2, s2.y2)].sort().join(',');
            const validPairs = ['A,B', 'C,D'];

            if (!validPairs.includes(ends1) || !validPairs.includes(ends2) || ends1 === ends2) {
                return { result: 'Точки A,B должны быть на одном отрезке, C,D – на другом.', analysis: ['❌ Неправильное распределение точек.'] };
            }

            // Всё верно!
            return { result: '✅ Задача выполнена! Отрезки AB и CD пересекаются.', analysis: ['✅ Два пересекающихся отрезка с правильными точками.'] };
        },

        /**
         * Даёт подсказку в зависимости от текущего состояния чертежа.
         * @param {Array} segments – массив отрезков
         * @returns {{result: string, analysis: string[]}}
         */
        hint(segments) {
            const merged = mergeSegments(segments);
            if (merged.length === 0) {
                return { result: 'Нарисуйте первый отрезок.', analysis: ['ℹ️ Начните с первого отрезка.'] };
            }
            if (merged.length === 1) {
                return { result: 'Нарисуйте второй отрезок.', analysis: ['ℹ️ Добавьте ещё один отрезок.'] };
            }
            if (merged.length >= 2) {
                const [s1, s2] = merged;
                const intersect = (function () {
                    const denom = (s1.x1 - s1.x2) * (s2.y1 - s2.y2) - (s1.y1 - s1.y2) * (s2.x1 - s2.x2);
                    if (Math.abs(denom) < 1e-10) return false;
                    const t = ((s1.x1 - s2.x1) * (s2.y1 - s2.y2) - (s1.y1 - s2.y1) * (s2.x1 - s2.x2)) / denom;
                    const u = -((s1.x1 - s1.x2) * (s1.y1 - s2.y1) - (s1.y1 - s1.y2) * (s1.x1 - s2.x1)) / denom;
                    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
                })();
                if (!intersect) {
                    return { result: 'Отрезки не пересекаются.', analysis: ['❌ Два отрезка не пересекаются.'] };
                }
                return { result: 'Отлично! Теперь нажмите «Точки» и расставьте A, B, C, D по концам отрезков.', analysis: ['✅ Осталось только обозначить вершины.'] };
            }
            return { result: 'Оставьте только два отрезка.', analysis: ['⚠️ Слишком много отрезков.'] };
        }
    },

    // Задание 2: «Треугольник» (требует 3 отрезка и точки A, B, C)
    'task1-2': {
        letters: ['A', 'B', 'C'],

        check(segments, namedPoints) {
            // 1. Должно быть ровно три отрезка
            if (segments.length !== 3) {
                return { result: 'Должно быть ровно три отрезка.', analysis: ['❌ Количество отрезков не равно трём.'] };
            }

            // 2. Проверяем, что концы отрезков попарно совпадают (замкнутый контур)
            const points = new Map();   // ключ "x,y" → количество вхождений
            for (let seg of segments) {
                const key1 = seg.x1 + ',' + seg.y1;
                const key2 = seg.x2 + ',' + seg.y2;
                points.set(key1, (points.get(key1) || 0) + 1);
                points.set(key2, (points.get(key2) || 0) + 1);
            }
            let isValid = true;
            for (let count of points.values()) {
                if (count !== 2) { isValid = false; break; }  // каждая вершина должна встречаться ровно 2 раза
            }
            if (!isValid) {
                return { result: 'Отрезки не образуют треугольник.', analysis: ['❌ Концы отрезков должны попарно совпадать.'] };
            }

            // 3. Должны быть точки A, B, C
            if (!namedPoints || namedPoints.length !== 3) {
                return { result: 'Расставьте точки A, B, C.', analysis: ['❌ Нужно поставить три именованные точки.'] };
            }
            const labels = namedPoints.map(p => p.label).sort().join(',');
            if (labels !== 'A,B,C') {
                return { result: 'Используйте точки A, B, C.', analysis: ['❌ Ожидаются точки A, B, C.'] };
            }

            return { result: '✅ Треугольник ABC построен!', analysis: ['✅ Треугольник с вершинами A, B, C.'] };
        },

        hint(segments) {
            if (segments.length < 3) {
                return { result: 'Постройте три отрезка, соединяющие три точки.', analysis: ['ℹ️ Нужно три отрезка.'] };
            }
            if (segments.length > 3) {
                return { result: 'Оставьте только три отрезка.', analysis: ['⚠️ Слишком много отрезков.'] };
            }
            // Проверяем, что три отрезка образуют замкнутый контур
            const points = new Map();
            for (let seg of segments) {
                const key1 = seg.x1 + ',' + seg.y1;
                const key2 = seg.x2 + ',' + seg.y2;
                points.set(key1, (points.get(key1) || 0) + 1);
                points.set(key2, (points.get(key2) || 0) + 1);
            }
            if (points.size !== 3) {
                return { result: 'Три отрезка должны иметь общие концы.', analysis: ['ℹ️ Должно быть три уникальные точки.'] };
            }
            return { result: 'Отлично! Теперь нажмите «Точки» и расставьте A, B, C по вершинам.', analysis: ['✅ Осталось только обозначить вершины.'] };
        }
    }
};