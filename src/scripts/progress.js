const PROGRESS_KEY = 'geometry-progress-v1';
const APP_STATE_KEY = 'geometry-app-state-v1';

export function loadProgress() {
    try { const raw = localStorage.getItem(PROGRESS_KEY); return raw ? JSON.parse(raw) : { completedLessons: [] }; }
    catch (e) { console.error('Ошибка загрузки прогресса:', e); return { completedLessons: [] }; }
}
export function saveProgress(progress) { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) { console.error('Ошибка сохранения прогресса:', e); } }
export function markLessonCompleted(lessonId) {
    const progress = loadProgress();
    if (!progress.completedLessons.includes(lessonId)) { progress.completedLessons.push(lessonId); saveProgress(progress); return true; }
    return false;
}
export function isLessonCompleted(lessonId) { const progress = loadProgress(); return progress.completedLessons.includes(lessonId); }
export function saveAppState(appState) { try { localStorage.setItem(APP_STATE_KEY, JSON.stringify(appState)); } catch (e) { console.error('Ошибка сохранения состояния холстов:', e); } }
export function loadAppState() {
    try { const raw = localStorage.getItem(APP_STATE_KEY); return raw ? JSON.parse(raw) : {}; }
    catch (e) { console.error('Ошибка загрузки состояния холстов:', e); return {}; }
}