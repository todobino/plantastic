
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isWeekend = (d: Date) => {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  return day === 0 || day === 6;
};

export const ROW_HEIGHT = 40; // height of a task row in pixels
export const BAR_HEIGHT = 28; // height of a task bar
export const CATEGORY_BAR_HEIGHT = 28;
export const BAR_TOP_MARGIN = (ROW_HEIGHT - BAR_HEIGHT) / 2;
export const MONTH_ROW_HEIGHT = 48;
export const DAY_ROW_HEIGHT = 48;
export const HEADER_HEIGHT = MONTH_ROW_HEIGHT + DAY_ROW_HEIGHT;

export function hexToRgba(hex: string, alpha: number) {
    let r = 0, g = 0, b = 0;
    // 3 digits
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } 
    // 6 digits
    else if (hex.length === 7) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
