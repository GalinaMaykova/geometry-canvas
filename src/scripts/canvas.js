export const canvas = document.getElementById('canvas');
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
}