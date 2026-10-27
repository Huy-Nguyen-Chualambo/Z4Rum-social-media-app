export const SIZE = { width: 1000, height: 700 };
export const TABLES = [{ id: 'cafe-1', x: 180, y: 300 }, { id: 'cafe-2', x: 180, y: 410 }];
export const TREE_TRUNKS = [{ x: 50, y: 350 }, { x: 920, y: 340 }, { x: 240, y: 540 }, { x: 715, y: 600 }, { x: 50, y: 630 }, { x: 940, y: 630 }];
export const BLOCKS = [
  { x: 80, y: 65, w: 230, h: 130 },
  { x: 690, y: 65, w: 230, h: 130 },
  { x: 440, y: 300, w: 120, h: 100 },
  { x: 100, y: 475, w: 90, h: 40 },
  { x: 770, y: 475, w: 90, h: 40 },
];
export function walkable(x: number, y: number) {
  return Number.isFinite(x) && Number.isFinite(y) && x >= 20 && y >= 20 && x <= 980 && y <= 680 &&
    !BLOCKS.some(b => x > b.x - 14 && x < b.x + b.w + 14 && y > b.y - 14 && y < b.y + b.h + 14) &&
    !TREE_TRUNKS.some(t => Math.hypot(x-t.x, y-t.y) < 25);
}
export function step(x: number, y: number, dx: number, dy: number) {
  const length = Math.hypot(dx, dy);
  if (!length) return { x, y };
  const nx = x + dx / length * 10;
  const ny = y + dy / length * 10;
  const acceptedX = walkable(nx, y) ? nx : x;
  return { x: acceptedX, y: walkable(acceptedX, ny) ? ny : y };
}
export const QUESTIONS = [
  { text: 'Một phút có bao nhiêu giây?', options: ['30', '60', '90', '100'], answer: 1 },
  { text: 'Hành tinh nào gần Mặt Trời nhất?', options: ['Trái Đất', 'Sao Hỏa', 'Sao Thủy', 'Sao Kim'], answer: 2 },
  { text: '5 × 7 bằng bao nhiêu?', options: ['25', '30', '35', '40'], answer: 2 },
  { text: 'Thủ đô của Việt Nam là gì?', options: ['Huế', 'Đà Nẵng', 'TP.HCM', 'Hà Nội'], answer: 3 },
  { text: 'Tam giác có bao nhiêu cạnh?', options: ['3', '4', '5', '6'], answer: 0 },
];
