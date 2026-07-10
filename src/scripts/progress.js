// ===== progress.js – сохранение прогресса и состояния холстов =====
// Всё хранится в localStorage браузера, поэтому работает даже после перезагрузки страницы.
// Если данные повреждены, мы автоматически создаём чистый объект, чтобы приложение не падало.

// Ключи для хранения данных в localStorage
const PROGRESS_KEY = 'geometry-progress-v1';     // для списка выполненных заданий
const APP_STATE_KEY = 'geometry-app-state-v1';    // для состояния холстов (отрезки, точки)

// ---------- Работа с прогрессом (галочки "пройдено") ----------

/**
 * Загружает прогресс из localStorage.
 * @returns {{completedLessons: string[]}} – объект с массивом id выполненных заданий
 */
export function loadProgress() {
    try {
        const raw = localStorage.getItem(PROGRESS_KEY);
        // Если данных нет, возвращаем объект с пустым массивом
        if (!raw) return { completedLessons: [] };
        const parsed = JSON.parse(raw);
        // Дополнительная проверка: если вдруг там не массив, сбрасываем
        if (!parsed || !Array.isArray(parsed.completedLessons)) {
            return { completedLessons: [] };
        }
        return parsed;
    } catch (e) {
        console.error('Ошибка загрузки прогресса:', e);
        return { completedLessons: [] };
    }
}

/**
 * Сохраняет прогресс в localStorage.
 * @param {{completedLessons: string[]}} progress – объект с массивом id выполненных заданий
 */
export function saveProgress(progress) {
    try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch (e) {
        console.error('Ошибка сохранения прогресса:', e);
    }
}

/**
 * Отмечает урок как пройденный (добавляет его id в список).
 * @param {string} lessonId – идентификатор задания (например 'lesson1-1-task1')
 * @returns {boolean} – true, если урок был успешно добавлен (не был отмечен ранее)
 */
export function markLessonCompleted(lessonId) {
    const progress = loadProgress();
    if (!progress.completedLessons.includes(lessonId)) {
        progress.completedLessons.push(lessonId);
        saveProgress(progress);
        return true;
    }
    return false;
}

/**
 * Проверяет, пройден ли урок.
 * @param {string} lessonId – идентификатор задания
 * @returns {boolean}
 */
export function isLessonCompleted(lessonId) {
    const progress = loadProgress();
    return progress.completedLessons.includes(lessonId);
}

// ---------- Работа с состоянием холстов ----------

/**
 * Сохраняет состояние всех холстов.
 * @param {Object} appState
 */
export function saveAppState(appState) {
    try {
        if (!appState || typeof appState !== 'object') return;
        localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState));
    } catch (e) {
        console.error('Ошибка сохранения состояния холстов:', e);
    }
}

/**
 * Загружает состояние холстов.
 * @returns {Object|null} – объект с состояниями, либо null, если данные повреждены
 */
export function loadAppState() {
    try {
        const raw = localStorage.getItem(APP_STATE_KEY);
        // Ключа нет – это нормально (первый запуск), возвращаем пустой объект
        if (raw === null) return {};

        const parsed = JSON.parse(raw);
        // Если после парсинга получился не объект – данные повреждены
        if (!parsed || typeof parsed !== 'object') {
            // НЕ удаляем ключ, чтобы ошибка повторялась при каждой загрузке,
            // пока пользователь явно не очистит localStorage
            return null;
        }
        return parsed;
    } catch (e) {
        console.error('Ошибка загрузки состояния холстов:', e);
        return null;   // ошибка парсинга – тоже повреждение
    }
}