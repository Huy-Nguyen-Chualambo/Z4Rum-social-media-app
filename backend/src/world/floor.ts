import { randomInt } from 'node:crypto';

type Piece = { cell: number; alive: boolean; movedAt: number };
export class FloorGame {
  private phase: 'waiting' | 'running' | 'results' = 'waiting';
  private pieces = new Map<string, Piece>();
  private fallen = new Set<number>();
  private warning: number[] = [];
  private round = 0;
  private endsAt = 0;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private broadcast: (state: ReturnType<FloorGame['state']>) => void) {}

  state() {
    return { phase: this.phase, pieces: Object.fromEntries([...this.pieces].map(([id, p]) => [id, { cell: p.cell, alive: p.alive }])),
      fallen: [...this.fallen], warning: this.warning, round: this.round, endsAt: this.endsAt };
  }
  has(id: string) { return this.phase !== 'results' && this.pieces.has(id); }
  private emit() { this.broadcast(this.state()); }
  join(id: string) {
    if (this.phase === 'running') return;
    if (this.phase === 'results') {
      this.pieces.clear(); this.fallen.clear(); this.warning = []; this.round = 0; this.phase = 'waiting';
    }
    if (this.pieces.has(id) || this.pieces.size >= 6) return;
    this.pieces.set(id, { cell: this.pieces.size ? 35 : 0, alive: true, movedAt: 0 });
    if (this.pieces.size >= 2) { this.phase = 'running'; this.next(); }
    else this.emit();
  }
  move(id: string, value: unknown) {
    const piece = this.pieces.get(id);
    if (this.phase !== 'running' || !piece?.alive || typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= 36 || this.fallen.has(value) || Date.now()-piece.movedAt < 180) return;
    const distance = Math.abs(value%6-piece.cell%6) + Math.abs(Math.floor(value/6)-Math.floor(piece.cell/6));
    if (distance !== 1) return;
    piece.cell = value; piece.movedAt = Date.now(); this.emit();
  }
  leave(id: string) {
    if (!this.pieces.delete(id)) return;
    if (this.phase === 'running' && this.pieces.size < 2) this.finish();
    else this.emit();
  }
  private finish() {
    clearTimeout(this.timer); this.phase = 'results'; this.endsAt = 0; this.warning = []; this.emit();
  }
  private next() {
    if (this.round >= 8 || [...this.pieces.values()].filter(p => p.alive).length < 2) { this.finish(); return; }
    this.round++;
    const available = Array.from({ length: 36 }, (_, i) => i).filter(i => !this.fallen.has(i));
    this.warning = [];
    // Include occupied tiles so staying still cannot avoid elimination forever.
    for (const p of this.pieces.values()) if (p.alive && !this.warning.includes(p.cell)) this.warning.push(p.cell);
    while (this.warning.length < Math.min(4, available.length)) {
      const cell = available[randomInt(available.length)];
      if (!this.warning.includes(cell)) this.warning.push(cell);
    }
    this.endsAt = Date.now()+2500; this.emit();
    this.timer = setTimeout(() => {
      for (const cell of this.warning) this.fallen.add(cell);
      for (const p of this.pieces.values()) if (this.fallen.has(p.cell)) p.alive = false;
      this.warning = []; this.emit();
      if ([...this.pieces.values()].filter(p => p.alive).length < 2) this.finish();
      else this.timer = setTimeout(() => this.next(), 500);
    }, 2500);
  }
  dispose() { clearTimeout(this.timer); }
}
