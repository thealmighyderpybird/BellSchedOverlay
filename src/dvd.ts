import { BrowserWindow, screen } from 'electron';

let x: number, y: number;
let xSpeed = 5, ySpeed = 5;
let DVDWindowInterval: any;

export const enableDVDMode = (window: BrowserWindow) => {
    const pos = window.getPosition();
    x = pos[0]; y = pos[1];
    DVDWindowInterval = setInterval(() => updateWindowPosition(window), 16);
}

export const disableDVDMode = () => {
    clearInterval(DVDWindowInterval);
}

const updateWindowPosition = (window: BrowserWindow) => {
    const currentSize = window.getSize();
    window.setSize(currentSize[0], currentSize[1]);

    const newPos = newPosition(window);
    window.setPosition(newPos[0], newPos[1]);

    window.setSize(currentSize[0], currentSize[1]);
}

const newPosition = (window: BrowserWindow) => {
    const currentScreen = screen.getDisplayNearestPoint({ x, y });
    const { width, height } = currentScreen.workAreaSize;
    const { x: screenX, y: screenY } = currentScreen.workArea;
    x += xSpeed;
    y += ySpeed;

    if (x <= screenX || x + window.getSize()[0] >= screenX + width) xSpeed *= -1;
    if (y <= screenY || y + window.getSize()[1] >= screenY + height) ySpeed *= -1;

    return [ x, y ];
}