export let canvas, ctx, W, H;

export function initCanvas(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    W = canvas.width;
    H = canvas.height;
}

export function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}