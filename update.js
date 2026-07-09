const fs = require('fs');
const path = require('path');

// Скрипт теперь лежит прямо в проекте, поэтому __dirname — корень проекта
const PROJECT_DIR = __dirname;

const files = {
    // canvas.js
    'src/scripts/canvas.js':
`export const canvas = document.getElementById('canvas');
export const ctx = canvas.getContext('2d');
export const W = canvas.width;
export const H = canvas.height;

export function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}`,

    // grid.js
    'src/scripts/grid.js':
`import { ctx, W, H } from './canvas.js';

export const GRID_SIZE = 30;

export function snapToGrid(coord) {
    return Math.round(coord / GRID_SIZE) * GRID_SIZE;
}

export function isInsideCanvas(x, y) {
    return x >= 0 && x <= W && y >= 0 && y <= H;
}

export function drawGrid() {
    ctx.save();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let y = 0; y <= H; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }
    ctx.restore();
}`,

    // possiblePoints.js
    'src/scripts/possiblePoints.js':
`import { ctx } from './canvas.js';

export let possiblePoints = [];
let nextId = 1;

export function clearPossiblePoints() {
    possiblePoints = [];
    nextId = 1;
}

function addPossiblePoint(x, y, tolerance = 1) {
    for (let p of possiblePoints) {
        if (Math.abs(p.x - x) < tolerance && Math.abs(p.y - y) < tolerance) {
            return;
        }
    }
    possiblePoints.push({ id: 'T' + nextId, x, y });
    nextId++;
}

export function updatePossiblePoints(segments) {
    clearPossiblePoints();
    for (let seg of segments) {
        addPossiblePoint(seg.x1, seg.y1);
        addPossiblePoint(seg.x2, seg.y2);
    }
    for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
            const p = segmentIntersection(segments[i], segments[j]);
            if (p) {
                addPossiblePoint(p.x, p.y);
            }
        }
    }
    possiblePoints.sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));
}

function segmentIntersection(s1, s2) {
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

export function findClosestPossiblePoint(x, y, maxDist = 25) {
    let best = null, bestDist = Infinity;
    for (let p of possiblePoints) {
        const dx = p.x - x, dy = p.y - y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < bestDist && dist <= maxDist) {
            bestDist = dist;
            best = p;
        }
    }
    return best;
}

export function drawPossiblePoints() {
    ctx.save();
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    for (let p of possiblePoints) {
        const s = 4;
        ctx.beginPath();
        ctx.moveTo(p.x - s, p.y - s);
        ctx.lineTo(p.x + s, p.y + s);
        ctx.moveTo(p.x + s, p.y - s);
        ctx.lineTo(p.x - s, p.y + s);
        ctx.stroke();
        ctx.fillStyle = '#888';
        ctx.font = '10px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(p.id, p.x + 6, p.y - 2);
    }
    ctx.restore();
}`,

    // points.js
    'src/scripts/points.js':
`import { ctx } from './canvas.js';

export let namedPoints = [];

export function addNamedPoint(label, x, y) {
    namedPoints.push({ label, x, y });
    console.log('Добавлена точка ' + label + ': (' + x + ',' + y + ')');
}

export function removeLastNamedPoint() {
    if (namedPoints.length > 0) {
        const removed = namedPoints.pop();
        console.log('Удалена точка ' + removed.label + ': (' + removed.x + ',' + removed.y + ')');
        return removed;
    }
    return null;
}

export function clearNamedPoints() {
    namedPoints = [];
    console.log('Все именованные точки очищены');
}

export function drawNamedPoints() {
    ctx.save();
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let p of namedPoints) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'black';
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.fillText(p.label, p.x + 14, p.y - 12);
    }
    ctx.restore();
}`,

    // segments.js
    'src/scripts/segments.js':
`import { ctx } from './canvas.js';

export let segments = [];

export function addSegment(x1, y1, x2, y2) {
    segments.push({ x1, y1, x2, y2 });
    console.log('Добавлен отрезок: (' + x1 + ',' + y1 + ') → (' + x2 + ',' + y2 + ')');
}

export function removeLastSegment() {
    if (segments.length > 0) {
        const removed = segments.pop();
        console.log('Удалён отрезок: (' + removed.x1 + ',' + removed.y1 + ') → (' + removed.x2 + ',' + removed.y2 + ')');
        return removed;
    }
    return null;
}

export function clearSegments() {
    segments = [];
    console.log('Все отрезки очищены');
}

export function drawAllSegments() {
    ctx.save();
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    for (let seg of segments) {
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
    }
    ctx.restore();
}`,

    // ui.js (с защитой)
    'src/scripts/ui.js':
`import { canvas } from './canvas.js';

export const statusEl = document.getElementById('status');
export const clearBtn = document.getElementById('clearBtn');
export const undoBtn = document.getElementById('undoBtn');
export const checkBtn = document.getElementById('checkBtn');
export const hintBtn = document.getElementById('hintBtn');
export const hintBar = document.getElementById('hintBar');

export const possiblePointLog = document.getElementById('possiblePointLog');
export const pointLogList = document.getElementById('pointLogList');
export const segmentLogList = document.getElementById('segmentLogList');
export const derivedSegmentLog = document.getElementById('derivedSegmentLog');
export const analysisLog = document.getElementById('analysisLog');
export const resultArea = document.getElementById('resultArea');

export const pointBtns = document.querySelectorAll('.point-btn');

export function setStatus(text) {
    statusEl.innerHTML = text;
}

export function updatePossiblePointLog(possiblePoints) {
    possiblePointLog.innerHTML = '';
    if (possiblePoints.length === 0) {
        possiblePointLog.innerHTML = '<li class="empty-log">Пока нет возможных точек</li>';
        return;
    }
    for (let p of possiblePoints) {
        const li = document.createElement('li');
        li.textContent = p.id + ' (' + Math.round(p.x) + ', ' + Math.round(p.y) + ')';
        possiblePointLog.appendChild(li);
    }
}

export function addNamedPointLog(label, x, y) {
    const empty = pointLogList.querySelector('.empty-log');
    if (empty) empty.remove();
    const li = document.createElement('li');
    const now = new Date();
    const time = now.toLocaleTimeString();
    li.textContent = '[' + time + '] ' + label + ' (' + Math.round(x) + ', ' + Math.round(y) + ')';
    pointLogList.appendChild(li);
    pointLogList.scrollTop = pointLogList.scrollHeight;
}

export function removeLastNamedPointLog() {
    const items = pointLogList.querySelectorAll('li:not(.empty-log)');
    if (items.length > 0) {
        items[items.length - 1].remove();
    }
    if (pointLogList.querySelectorAll('li:not(.empty-log)').length === 0) {
        pointLogList.innerHTML = '<li class="empty-log">Пока нет точек</li>';
    }
}

export function clearNamedPointLog() {
    pointLogList.innerHTML = '<li class="empty-log">Пока нет точек</li>';
}

export function updateSegmentLog(segments, getPointInfoFn) {
    segmentLogList.innerHTML = '';
    if (segments.length === 0) {
        segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>';
        return;
    }
    for (let seg of segments) {
        const p1 = getPointInfoFn(seg.x1, seg.y1);
        const p2 = getPointInfoFn(seg.x2, seg.y2);
        const name1 = p1.letter ? p1.tId + '(' + p1.letter + ')' : p1.tId;
        const name2 = p2.letter ? p2.tId + '(' + p2.letter + ')' : p2.tId;
        const li = document.createElement('li');
        li.textContent = name1 + '-' + name2 + '  (' + Math.round(seg.x1) + ',' + Math.round(seg.y1) + ') → (' + Math.round(seg.x2) + ',' + Math.round(seg.y2) + ')';
        segmentLogList.appendChild(li);
    }
}

export function removeLastSegmentLog() {
    const items = segmentLogList.querySelectorAll('li:not(.empty-log)');
    if (items.length > 0) {
        items[items.length - 1].remove();
    }
    if (segmentLogList.querySelectorAll('li:not(.empty-log)').length === 0) {
        segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>';
    }
}

export function updateDerivedSegmentLog(derivedSegments) {
    if (!derivedSegmentLog) return;
    if (!Array.isArray(derivedSegments)) {
        console.warn('updateDerivedSegmentLog: передан не массив, заменён на []', derivedSegments);
        derivedSegments = [];
    }
    derivedSegmentLog.innerHTML = '';
    if (derivedSegments.length === 0) {
        derivedSegmentLog.innerHTML = '<li class="empty-log">Пока нет производных отрезков</li>';
        return;
    }
    for (let seg of derivedSegments) {
        const li = document.createElement('li');
        li.textContent = seg.name1 + '-' + seg.name2 + '  (' + Math.round(seg.x1) + ',' + Math.round(seg.y1) + ') → (' + Math.round(seg.x2) + ',' + Math.round(seg.y2) + ')';
        derivedSegmentLog.appendChild(li);
    }
}

export function clearSegmentLog() {
    segmentLogList.innerHTML = '<li class="empty-log">Пока нет отрезков</li>';
    if (derivedSegmentLog) {
        derivedSegmentLog.innerHTML = '<li class="empty-log">Пока нет производных отрезков</li>';
    }
}

export function setAnalysis(items) {
    analysisLog.innerHTML = '';
    if (!items || items.length === 0) {
        analysisLog.innerHTML = '<li class="empty-log">Нет данных для анализа</li>';
        return;
    }
    for (let item of items) {
        const li = document.createElement('li');
        li.textContent = item;
        analysisLog.appendChild(li);
    }
}

export function setResult(text) {
    resultArea.textContent = text;
}

export function clearAnalysis() {
    analysisLog.innerHTML = '';
    resultArea.textContent = '';
}

export function getActivePointBtn() {
    return document.querySelector('.point-btn.active');
}

export function setActivePointBtn(label) {
    pointBtns.forEach(btn => btn.classList.remove('active'));
    if (label) {
        const btn = document.querySelector('.point-btn[data-label="' + label + '"]');
        if (btn) btn.classList.add('active');
    }
}

export function disablePointBtn(label) {
    const btn = document.querySelector('.point-btn[data-label="' + label + '"]');
    if (btn) {
        btn.disabled = true;
        btn.classList.remove('active');
    }
}

export function enablePointBtn(label) {
    const btn = document.querySelector('.point-btn[data-label="' + label + '"]');
    if (btn) btn.disabled = false;
}

export function resetAllButtons() {
    pointBtns.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('active');
    });
}

export function onCanvasClick(handler) {
    canvas.addEventListener('click', handler);
}

export function onClearClick(handler) {
    clearBtn.addEventListener('click', handler);
}

export function onUndoClick(handler) {
    undoBtn.addEventListener('click', handler);
}

export function onCheckClick(handler) {
    checkBtn.addEventListener('click', handler);
}

export function onHintClick(handler) {
    hintBtn.addEventListener('click', handler);
}

export function startHintTimer(duration, onTick, onComplete) {
    let remaining = duration;
    hintBtn.disabled = true;
    hintBtn.textContent = '💡 Подсказка (' + remaining + ')';
    hintBar.style.width = '0%';

    const interval = setInterval(() => {
        remaining--;
        const progress = ((duration - remaining) / duration) * 100;
        hintBar.style.width = progress + '%';
        hintBtn.textContent = '💡 Подсказка (' + remaining + ')';

        if (remaining <= 0) {
            clearInterval(interval);
            hintBtn.disabled = false;
            hintBtn.textContent = '💡 Подсказка';
            hintBar.style.width = '100%';
            if (onComplete) onComplete();
        }
        if (onTick) onTick(remaining);
    }, 1000);
}`,

    // hints.js
    'src/scripts/hints.js':
`export function getHintMessage(segments) {
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
        const intersectPt = (function() {
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
        })();

        if (!intersectPt) {
            return {
                result: 'Отрезки это хорошо, но они должны пересекаться.',
                analysis: ['❌ Два отрезка не пересекаются — построй их так, чтобы они пересеклись.']
            };
        }

        function isMidpoint(px, py, seg) {
            const mx = (seg.x1 + seg.x2) / 2;
            const my = (seg.y1 + seg.y2) / 2;
            return Math.abs(px - mx) < 2 && Math.abs(py - my) < 2;
        }

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

    return {
        result: 'На холсте несколько отрезков. Продолжай строить чертёж.',
        analysis: ['ℹ️ Несколько отрезков построено.']
    };
}`,

    // main.js
    'src/scripts/main.js':
`import { canvas, ctx, W, H, getMousePos } from './canvas.js';
import { drawGrid, snapToGrid, isInsideCanvas } from './grid.js';
import {
    possiblePoints,
    updatePossiblePoints,
    findClosestPossiblePoint,
    drawPossiblePoints,
    clearPossiblePoints
} from './possiblePoints.js';
import {
    namedPoints,
    addNamedPoint,
    removeLastNamedPoint,
    clearNamedPoints,
    drawNamedPoints
} from './points.js';
import {
    segments,
    addSegment,
    removeLastSegment,
    clearSegments,
    drawAllSegments
} from './segments.js';
import {
    statusEl, clearBtn, undoBtn, checkBtn, hintBtn, hintBar,
    setStatus,
    updatePossiblePointLog,
    addNamedPointLog, removeLastNamedPointLog, clearNamedPointLog,
    updateSegmentLog, removeLastSegmentLog, clearSegmentLog, updateDerivedSegmentLog,
    setAnalysis, setResult, clearAnalysis,
    getActivePointBtn, setActivePointBtn, disablePointBtn, enablePointBtn, resetAllButtons,
    onCanvasClick, onClearClick, onUndoClick, onCheckClick, onHintClick,
    startHintTimer
} from './ui.js';
import { getHintMessage } from './hints.js';

console.log('🚀 main.js загружен!');

let startPoint = null;
let endPoint = null;
let actionHistory = [];
let activeLabel = null;

function getPointNameByCoord(x, y, tol = 1) {
    for (let np of namedPoints) {
        if (Math.abs(np.x - x) < tol && Math.abs(np.y - y) < tol) {
            return np.label;
        }
    }
    for (let pp of possiblePoints) {
        if (Math.abs(pp.x - x) < tol && Math.abs(pp.y - y) < tol) {
            return pp.id;
        }
    }
    return '?';
}

function getPointFullName(x, y) {
    let tId = '?';
    let letter = null;
    for (let pp of possiblePoints) {
        if (Math.abs(pp.x - x) < 1 && Math.abs(pp.y - y) < 1) {
            tId = pp.id;
            break;
        }
    }
    for (let np of namedPoints) {
        if (Math.abs(np.x - x) < 1 && Math.abs(np.y - y) < 1) {
            letter = np.label;
            break;
        }
    }
    return { tId, letter };
}

function isPointOnSegment(p, seg) {
    const { x1, y1, x2, y2 } = seg;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx*dx + dy*dy;
    if (lengthSq === 0) return Math.abs(p.x - x1) < 1 && Math.abs(p.y - y1) < 1;
    const t = ((p.x - x1)*dx + (p.y - y1)*dy) / lengthSq;
    if (t < -0.001 || t > 1.001) return false;
    const projX = x1 + t*dx;
    const projY = y1 + t*dy;
    const dist = Math.sqrt((p.x - projX)*(p.x - projX) + (p.y - projY)*(p.y - projY));
    return dist < 2;
}

function getDerivedSegments() {
    try {
        const derived = [];
        if (!segments || !possiblePoints) return derived;
        for (let seg of segments) {
            const pointsOnSeg = [];
            for (let p of possiblePoints) {
                if (isPointOnSegment(p, seg)) {
                    pointsOnSeg.push({ x: p.x, y: p.y, id: p.id });
                }
            }
            const unique = [];
            const seen = new Set();
            for (let p of pointsOnSeg) {
                const key = p.x + ',' + p.y;
                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(p);
                }
            }
            const dx = seg.x2 - seg.x1;
            const dy = seg.y2 - seg.y1;
            unique.sort((a, b) => {
                const tA = (dx !== 0) ? (a.x - seg.x1) / dx : (a.y - seg.y1) / dy;
                const tB = (dx !== 0) ? (b.x - seg.x1) / dx : (b.y - seg.y1) / dy;
                return tA - tB;
            });
            for (let i = 0; i < unique.length - 1; i++) {
                const p1 = unique[i];
                const p2 = unique[i+1];
                const full1 = getPointFullName(p1.x, p1.y);
                const full2 = getPointFullName(p2.x, p2.y);
                const name1 = full1.letter ? full1.tId + '(' + full1.letter + ')' : full1.tId;
                const name2 = full2.letter ? full2.tId + '(' + full2.letter + ')' : full2.tId;
                derived.push({
                    x1: p1.x, y1: p1.y,
                    x2: p2.x, y2: p2.y,
                    name1: name1,
                    name2: name2
                });
            }
        }
        return derived;
    } catch (e) {
        console.error('Ошибка в getDerivedSegments:', e);
        return [];
    }
}

function segLength(s) {
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    return Math.sqrt(dx*dx + dy*dy);
}

function segAngle(s) {
    let ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180 / Math.PI;
    if (ang < 0) ang += 180;
    return ang;
}

function angleBetweenSegments(s1, s2) {
    const dx1 = s1.x2 - s1.x1;
    const dy1 = s1.y2 - s1.y1;
    const dx2 = s2.x2 - s2.x1;
    const dy2 = s2.y2 - s2.y1;
    const dot = dx1*dx2 + dy1*dy2;
    const norm1 = Math.sqrt(dx1*dx1 + dy1*dy1);
    const norm2 = Math.sqrt(dx2*dx2 + dy2*dy2);
    if (norm1 < 0.001 || norm2 < 0.001) return 0;
    const cosA = Math.max(-1, Math.min(1, dot / (norm1 * norm2)));
    return Math.acos(cosA) * 180 / Math.PI;
}

function isParallel(s1, s2) {
    const a1 = segAngle(s1);
    const a2 = segAngle(s2);
    const diff = Math.abs(a1 - a2) % 180;
    return diff < 0.1 || diff > 179.9;
}

function performAnalysis() {
    const lines = [];
    const derived = getDerivedSegments();

    const intersecting = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i+1; j < segments.length; j++) {
            const p = segmentIntersection(segments[i], segments[j]);
            if (p) {
                const name1 = getPointFullName(segments[i].x1, segments[i].y1).tId + getPointFullName(segments[i].x2, segments[i].y2).tId;
                const name2 = getPointFullName(segments[j].x1, segments[j].y1).tId + getPointFullName(segments[j].x2, segments[j].y2).tId;
                intersecting.push(name1 + ' и ' + name2);
            }
        }
    }
    if (intersecting.length > 0) {
        lines.push('✅ Пересекающиеся отрезки: ' + intersecting.join(', '));
    } else {
        lines.push('❌ Пересекающихся отрезков нет');
    }

    const equalGroups = [];
    const visited = new Array(segments.length).fill(false);
    for (let i = 0; i < segments.length; i++) {
        if (visited[i]) continue;
        const lenI = segLength(segments[i]);
        const group = [i];
        for (let j = i+1; j < segments.length; j++) {
            if (visited[j]) continue;
            if (Math.abs(segLength(segments[j]) - lenI) < 1) {
                group.push(j);
                visited[j] = true;
            }
        }
        if (group.length > 1) {
            visited[i] = true;
            const names = group.map(idx => {
                const s = segments[idx];
                return getPointFullName(s.x1, s.y1).tId + getPointFullName(s.x2, s.y2).tId;
            });
            equalGroups.push(names.join(', ') + ' (длина ' + lenI.toFixed(1) + ')');
        }
    }
    if (equalGroups.length > 0) {
        lines.push('✅ Равные отрезки: ' + equalGroups.join('; '));
    } else {
        lines.push('❌ Равных отрезков нет');
    }

    const angleSet = new Set();
    for (let p of possiblePoints) {
        const incident = derived.filter(s => (Math.abs(s.x1 - p.x) < 1 && Math.abs(s.y1 - p.y) < 1) || (Math.abs(s.x2 - p.x) < 1 && Math.abs(s.y2 - p.y) < 1));
        for (let i = 0; i < incident.length; i++) {
            for (let j = i+1; j < incident.length; j++) {
                const s1 = incident[i];
                const s2 = incident[j];
                const v1 = (Math.abs(s1.x1 - p.x) < 1 && Math.abs(s1.y1 - p.y) < 1) ? {x: s1.x2, y: s1.y2} : {x: s1.x1, y: s1.y1};
                const v2 = (Math.abs(s2.x1 - p.x) < 1 && Math.abs(s2.y1 - p.y) < 1) ? {x: s2.x2, y: s2.y2} : {x: s2.x1, y: s2.y1};
                const name1 = getPointFullName(v1.x, v1.y).tId;
                const name2 = getPointFullName(v2.x, v2.y).tId;
                const centerName = getPointFullName(p.x, p.y).tId;
                const ang = angleBetweenSegments(
                    {x1: p.x, y1: p.y, x2: v1.x, y2: v1.y},
                    {x1: p.x, y1: p.y, x2: v2.x, y2: v2.y}
                );
                const parts = [name1, name2].sort();
                const key = centerName + '|' + parts[0] + '|' + parts[1];
                if (!angleSet.has(key)) {
                    angleSet.add(key);
                    lines.push('📐 Угол <' + name1 + centerName + name2 + ' = ' + ang.toFixed(1) + '°');
                }
            }
        }
    }
    if (angleSet.size === 0) {
        lines.push('❌ Углы не обнаружены');
    }

    const pointIncidence = new Map();
    for (let s of derived) {
        const id1 = getPointFullName(s.x1, s.y1).tId;
        const id2 = getPointFullName(s.x2, s.y2).tId;
        pointIncidence.set(id1, (pointIncidence.get(id1) || 0) + 1);
        pointIncidence.set(id2, (pointIncidence.get(id2) || 0) + 1);
    }
    const commonPoints = [];
    for (let [id, count] of pointIncidence.entries()) {
        if (count > 1) commonPoints.push(id + ' (' + count + ' отр.)');
    }
    if (commonPoints.length > 0) {
        lines.push('✅ Общие точки: ' + commonPoints.join(', '));
    } else {
        lines.push('❌ Общих точек нет');
    }

    const parallelPairs = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i+1; j < segments.length; j++) {
            if (isParallel(segments[i], segments[j])) {
                const name1 = getPointFullName(segments[i].x1, segments[i].y1).tId + getPointFullName(segments[i].x2, segments[i].y2).tId;
                const name2 = getPointFullName(segments[j].x1, segments[j].y1).tId + getPointFullName(segments[j].x2, segments[j].y2).tId;
                parallelPairs.push(name1 + ' || ' + name2);
            }
        }
    }
    if (parallelPairs.length > 0) {
        lines.push('✅ Параллельные отрезки: ' + parallelPairs.join(', '));
    } else {
        lines.push('❌ Параллельных отрезков нет');
    }

    const perpPairs = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i+1; j < segments.length; j++) {
            const ang = angleBetweenSegments(segments[i], segments[j]);
            if (Math.abs(ang - 90) < 0.1) {
                const name1 = getPointFullName(segments[i].x1, segments[i].y1).tId + getPointFullName(segments[i].x2, segments[i].y2).tId;
                const name2 = getPointFullName(segments[j].x1, segments[j].y1).tId + getPointFullName(segments[j].x2, segments[j].y2).tId;
                perpPairs.push(name1 + ' ⊥ ' + name2);
            }
        }
    }
    if (perpPairs.length > 0) {
        lines.push('✅ Перпендикулярные отрезки (90°): ' + perpPairs.join(', '));
    } else {
        lines.push('❌ Перпендикулярных отрезков (90°) нет');
    }

    const approxPerpPairs = [];
    for (let i = 0; i < segments.length; i++) {
        for (let j = i+1; j < segments.length; j++) {
            const ang = angleBetweenSegments(segments[i], segments[j]);
            if (ang >= 85 && ang <= 95) {
                const name1 = getPointFullName(segments[i].x1, segments[i].y1).tId + getPointFullName(segments[i].x2, segments[i].y2).tId;
                const name2 = getPointFullName(segments[j].x1, segments[j].y1).tId + getPointFullName(segments[j].x2, segments[j].y2).tId;
                approxPerpPairs.push(name1 + ' ∠ ' + name2 + ' (' + ang.toFixed(1) + '°)');
            }
        }
    }
    if (approxPerpPairs.length > 0) {
        lines.push('✅ Примерно перпендикулярные отрезки (85°–95°): ' + approxPerpPairs.join(', '));
    } else {
        lines.push('❌ Примерно перпендикулярных отрезков (85°–95°) нет');
    }

    return lines;
}

function segmentIntersection(s1, s2) {
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

// ---- Отрисовка ----
function render() {
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawAllSegments();
    drawPossiblePoints();
    drawNamedPoints();
    drawTempSegment();
    drawMarkers();
}

function drawTempSegment() {
    if (startPoint && endPoint) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
        ctx.restore();
    }
}

function drawMarkers() {
    ctx.save();
    ctx.fillStyle = '#e74c3c';
    if (startPoint) {
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
    if (endPoint) {
        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
    ctx.restore();
}

function refreshPossiblePoints() {
    updatePossiblePoints(segments);
    updatePossiblePointLog(possiblePoints);
}

function refreshAllLogs() {
    updateSegmentLog(segments, getPointFullName);
    let derived = [];
    try {
        const result = getDerivedSegments();
        if (Array.isArray(result)) {
            derived = result;
        } else {
            console.warn('getDerivedSegments вернул не массив:', result);
        }
    } catch (e) {
        console.error('Ошибка при получении производных отрезков:', e);
    }
    updateDerivedSegmentLog(derived);
}

function handleCanvasClick(e) {
    const pos = getMousePos(e);
    const x = pos.x, y = pos.y;

    const activeBtn = getActivePointBtn();
    if (activeBtn) {
        const label = activeBtn.dataset.label;
        if (namedPoints.some(p => p.label === label)) {
            setStatus('Точка ' + label + ' уже стоит! Выбери другую кнопку.');
            return;
        }
        const closest = findClosestPossiblePoint(x, y, 30);
        if (!closest) {
            setStatus('Рядом нет возможной точки (Т1, Т2, ...). Попробуй ещё раз.');
            return;
        }
        addNamedPoint(label, closest.x, closest.y);
        addNamedPointLog(label, closest.x, closest.y);
        disablePointBtn(label);
        setActivePointBtn(null);
        activeLabel = null;
        actionHistory.push({ type: 'point', label, x: closest.x, y: closest.y });
        setStatus('Точка ' + label + ' поставлена в ' + closest.id + ' ✅');
        render();
        refreshAllLogs();
        return;
    }

    const snapX = snapToGrid(x);
    const snapY = snapToGrid(y);
    if (!isInsideCanvas(snapX, snapY)) {
        setStatus('Кликни внутри серого поля 😊');
        return;
    }

    if (!startPoint) {
        startPoint = { x: snapX, y: snapY };
        setStatus('Отлично! Теперь кликни в любое место, чтобы выбрать конец отрезка ✏️');
        render();
        return;
    }

    if (startPoint && !endPoint) {
        if (startPoint.x === snapX && startPoint.y === snapY) {
            setStatus('Ты выбрал ту же точку. Начни сначала 🔄');
            startPoint = null;
            render();
            return;
        }
        endPoint = { x: snapX, y: snapY };
        setStatus('Ура! Отрезок готов 🎉');
        addSegment(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
        actionHistory.push({
            type: 'segment',
            x1: startPoint.x, y1: startPoint.y,
            x2: endPoint.x, y2: endPoint.y
        });
        startPoint = null;
        endPoint = null;
        refreshPossiblePoints();
        render();
        refreshAllLogs();
        setStatus('Кликни в любое место, чтобы начать новый отрезок ✨');
        return;
    }

    startPoint = null;
    endPoint = null;
    render();
    setStatus('Начнём заново. Кликни, чтобы выбрать начало отрезка');
}

document.querySelectorAll('.point-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const label = btn.dataset.label;
        if (btn.disabled) return;
        if (btn.classList.contains('active')) {
            btn.classList.remove('active');
            setActivePointBtn(null);
            activeLabel = null;
            setStatus('Выбор точки отменён');
        } else {
            document.querySelectorAll('.point-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeLabel = label;
            setStatus('Выбрана точка ' + label + '. Кликни на холсте рядом с возможной точкой (Т1, Т2, ...).');
        }
    });
});

function handleClear() {
    clearSegments();
    clearNamedPoints();
    clearPossiblePoints();
    clearSegmentLog();
    clearNamedPointLog();
    clearAnalysis();
    updatePossiblePointLog([]);
    startPoint = null;
    endPoint = null;
    resetAllButtons();
    setActivePointBtn(null);
    activeLabel = null;
    actionHistory = [];
    setStatus('Всё стёрто! Кликни в любое место, чтобы начать 🧹');
    render();
}

function handleUndo() {
    if (startPoint) {
        startPoint = null;
        endPoint = null;
        setStatus('Начальная точка сброшена. Начни сначала 🔄');
        render();
        return;
    }
    if (actionHistory.length === 0) {
        setStatus('Нет действий для отмены 🙈');
        return;
    }
    const lastAction = actionHistory.pop();
    if (lastAction.type === 'point') {
        const removed = removeLastNamedPoint();
        if (removed) {
            removeLastNamedPointLog();
            enablePointBtn(removed.label);
            setStatus('Точка ' + removed.label + ' удалена ↩️');
            setActivePointBtn(null);
            activeLabel = null;
            render();
            refreshAllLogs();
        }
    } else if (lastAction.type === 'segment') {
        const removed = removeLastSegment();
        if (removed) {
            removeLastSegmentLog();
            refreshPossiblePoints();
            render();
            refreshAllLogs();
            setStatus('Последний отрезок удалён ↩️');
        }
    }
}

function handleCheck() {
    const analysis = performAnalysis();
    setAnalysis(analysis);
    setResult('Анализ завершён');
    setStatus('✅ Анализ обновлён');
}

function handleHint() {
    const { result, analysis } = getHintMessage(segments);
    setResult(result);
    setAnalysis(analysis);
    setStatus('💡 Подсказка обновлена');
}

function initHintTimer() {
    startHintTimer(2,
        (remaining) => {},
        () => { console.log('Подсказка доступна'); }
    );
}

onCanvasClick(handleCanvasClick);
onClearClick(handleClear);
onUndoClick(handleUndo);
onCheckClick(handleCheck);
onHintClick(handleHint);

render();
refreshPossiblePoints();
refreshAllLogs();

setStatus('🎨 <b>Как рисовать отрезок:</b><br>Кликни два раза на узлы сетки (начало и конец).<br><br>📍 <b>Как поставить точку:</b><br>Нажми кнопку с буквой (A–E), потом кликни<br>на нужное место рядом с Т1, Т2...');

initHintTimer();`
};

// Запись файлов
console.log('🔄 Обновление скриптов в проекте (update.js внутри geometry-canvas)');
for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(PROJECT_DIR, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('✅ ' + filePath);
}

console.log('\n🎉 Готово! Теперь можно коммитить и пушить:');
console.log('  git add .');
console.log('  git commit -m "Обновление скриптов (update.js в корне проекта)"');
console.log('  git push');