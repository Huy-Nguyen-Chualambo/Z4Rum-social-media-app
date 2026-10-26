"use client";

import { useEffect, useRef, useState } from 'react';
import RequireAuth from '../_components/RequireAuth';
import { useSocketStore } from '@/lib/store/useSocketStore';

type Player = { id: string; username: string; x: number; y: number; color: string; table?: string };
type Message = { id: string; from: string; username: string; text: string; scope?: string; at: number };
type Game = { phase: 'waiting' | 'question' | 'results'; round: string; participants: string[]; scores: Record<string, number>; endsAt: number; question: { text: string; options: string[]; number: number; total: number } | null };
type Floor = { phase: 'waiting' | 'running' | 'results'; pieces: Record<string, { cell: number; alive: boolean }>; fallen: number[]; warning: number[]; round: number; endsAt: number };
type Snapshot = { roomId: string; self: string; players: Record<string, Player>; game: Game; floor: Floor };
const initialGame: Game = { phase: 'waiting', round: '', participants: [], scores: {}, endsAt: 0, question: null };
const initialFloor: Floor = { phase: 'waiting', pieces: {}, fallen: [], warning: [], round: 0, endsAt: 0 };
const tables = [{ id: 'cafe-1', x: 180, y: 300 }, { id: 'cafe-2', x: 180, y: 410 }];
const directions = [{ label: '↑', dx: 0, dy: -1 }, { label: '←', dx: -1, dy: 0 }, { label: '↓', dx: 0, dy: 1 }, { label: '→', dx: 1, dy: 0 }];

export default function WorldPage() {
  const socket = useSocketStore(s => s.socket);
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [self, setSelf] = useState('');
  const [room, setRoom] = useState('');
  const [status, setStatus] = useState('Đang kết nối thế giới…');
  const [messages, setMessages] = useState<Message[]>([]);
  const [emotes, setEmotes] = useState<Record<string, { text: string; until: number }>>({});
  const [game, setGame] = useState<Game>(initialGame);
  const [floor, setFloor] = useState<Floor>(initialFloor);
  const [scope, setScope] = useState('nearby');
  const [notice, setNotice] = useState('');
  const [zoom, setZoom] = useState(false);
  const [text, setText] = useState('');
  const [answeredRound, setAnsweredRound] = useState('');
  const [now, setNow] = useState(0);
  const keys = useRef(new Set<string>());
  const touch = useRef({ dx: 0, dy: 0 });
  const me = players[self];
  const inLobby = Boolean(me && me.x >= 650 && me.y <= 300);
  const participating = game.participants.includes(self);
  const answered = answeredRound === game.round;
  const nearTable = me && tables.find(t => Math.hypot(me.x-t.x, me.y-t.y) <= 85);
  const floorMember = Boolean(floor.phase !== 'results' && floor.pieces[self]);
  const viewBox = zoom && me ? `${Math.max(0, Math.min(400, me.x-300))} ${Math.max(0, Math.min(280, me.y-210))} 600 420` : '0 0 1000 700';

  useEffect(() => {
    if (!socket) return;
    const join = () => { setStatus('Đang vào quảng trường…'); socket.emit('world:join', { roomId: new URLSearchParams(window.location.search).get('room') }); };
    const snapshot = (data: Snapshot) => {
      setPlayers(data.players); setSelf(data.self); setRoom(data.roomId); setGame(data.game); setFloor(data.floor); setStatus(''); setMessages([]); setEmotes({}); setAnsweredRound('');
    };
    const joined = ({ id, player }: { id: string; player: Player }) => setPlayers(p => ({ ...p, [id]: player }));
    const left = (id: string) => {
      setPlayers(p => { const next = { ...p }; delete next[id]; return next; });
      setEmotes(p => { const next = { ...p }; delete next[id]; return next; });
    };
    const moved = ({ id, x, y }: { id: string; x: number; y: number }) => setPlayers(p => p[id] ? { ...p, [id]: { ...p[id], x, y } } : p);
    const chat = (m: Message) => setMessages(previous => [...previous.slice(-39), m]);
    const emote = ({ id, emote: emoji }: { id: string; emote: string }) => setEmotes(p => ({ ...p, [id]: { text: emoji, until: Date.now() + 3500 } }));
    const gameUpdate = (value: Game) => setGame(value);
    const floorUpdate = (value: Floor) => setFloor(value);
    const showNotice = (value: string) => setNotice(value);
    const accepted = (round: string) => setAnsweredRound(round);
    const disconnected = () => { setStatus('Mất kết nối. Đang thử lại…'); setPlayers({}); setRoom(''); setGame(initialGame); setFloor(initialFloor); keys.current.clear(); touch.current = { dx: 0, dy: 0 }; };
    const error = (message: string) => { setStatus(message); setPlayers({}); setRoom(''); setGame(initialGame); setFloor(initialFloor); };
    socket.on('connect', join); socket.on('disconnect', disconnected);
    socket.on('world:snapshot', snapshot); socket.on('world:joined', joined); socket.on('world:left', left);
    socket.on('world:moved', moved); socket.on('world:chat', chat); socket.on('world:emote', emote);
    socket.on('world:game', gameUpdate); socket.on('world:quiz:accepted', accepted); socket.on('world:error', error);
    socket.on('world:floor', floorUpdate); socket.on('world:notice', showNotice);
    socket.on('connect_error', disconnected);
    if (socket.connected) join();
    return () => {
      socket.emit('world:leave');
      socket.off('connect', join); socket.off('disconnect', disconnected);
      socket.off('world:snapshot', snapshot); socket.off('world:joined', joined); socket.off('world:left', left);
      socket.off('world:moved', moved); socket.off('world:chat', chat); socket.off('world:emote', emote);
      socket.off('world:game', gameUpdate); socket.off('world:quiz:accepted', accepted); socket.off('world:error', error);
      socket.off('world:floor', floorUpdate); socket.off('world:notice', showNotice); socket.off('connect_error', disconnected);
    };
  }, [socket]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('input, textarea, button, [contenteditable=true]')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) {
        event.preventDefault(); keys.current.add(event.key);
      }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key);
    const clear = () => { keys.current.clear(); touch.current = { dx: 0, dy: 0 }; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    const tick = setInterval(() => {
      const k = keys.current;
      const dx = Number(k.has('ArrowRight') || k.has('d')) - Number(k.has('ArrowLeft') || k.has('a')) || touch.current.dx;
      const dy = Number(k.has('ArrowDown') || k.has('s')) - Number(k.has('ArrowUp') || k.has('w')) || touch.current.dy;
      if ((dx || dy) && socket?.connected) socket.emit('world:move', { dx, dy });
    }, 60);
    const clock = setInterval(() => setNow(Date.now()), 250);
    return () => { clearInterval(tick); clearInterval(clock); clear(); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, [socket]);

  return <div className="p-3 sm:p-5">
    <RequireAuth />
    <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-xs uppercase tracking-[.3em] text-emerald-400">Một góc thế giới của anh em</p><h1 className="text-3xl font-black">Z4world <span className="text-xs font-normal text-neutral-400">alpha</span></h1></div>
      <span className="rounded-full border border-emerald-800 px-3 py-1 text-xs text-emerald-300">{room ? `Sảnh ${room.split(':')[1]} · ${Object.keys(players).length}/20 người` : 'Đang kết nối'}</span>
    </header>
    <p className="mb-3 text-xs text-neutral-400">WASD / phím mũi tên hoặc nút cảm ứng để đi. Đứng gần nhau để trò chuyện. Đến cửa GAME CLUB để chơi quiz.</p>
    {status && <div role="status" className="mb-3 rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-sm text-amber-200">{status} <button className="underline" onClick={() => { if (socket?.connected) socket.emit('world:join'); else socket?.connect(); }}>Thử lại</button></div>}
    <div className="mb-3 flex flex-wrap gap-2 text-xs">
      <button className="rounded-lg border border-neutral-700 px-3 py-2" onClick={() => setZoom(v => !v)}>{zoom ? 'Xem toàn cảnh' : 'Theo chân nhân vật'}</button>
      <button disabled={!room} className="rounded-lg border border-neutral-700 px-3 py-2 disabled:opacity-40" onClick={async () => {
        const url = new URL('/z4world', window.location.origin); url.searchParams.set('room', room);
        try { await navigator.clipboard.writeText(url.toString()); setNotice('Đã chép link mời bạn vào cùng sảnh.'); }
        catch { setNotice(`Link mời: ${url.toString()}`); }
      }}>Mời bạn vào sảnh</button>
      {me?.table ? <button className="rounded-lg bg-amber-800 px-3 py-2" onClick={() => { socket?.emit('world:stand'); setScope('nearby'); }}>Đứng dậy</button> : nearTable && <button className="rounded-lg bg-amber-800 px-3 py-2" onClick={() => socket?.emit('world:sit', nearTable.id)}>Ngồi bàn cà phê</button>}
    </div>
    {notice && <p role="status" className="mb-3 break-words text-sm text-emerald-300">{notice} <button aria-label="Đóng thông báo" onClick={() => setNotice('')}>×</button></p>}
    <div className="overflow-hidden rounded-2xl border border-emerald-900 bg-[#b9d5a1] shadow-xl">
      <svg viewBox={viewBox} className="block w-full" role="img" aria-label="Bản đồ Z4world: quán cà phê bên trái, sảnh trò chơi bên phải, đài phun nước ở giữa">
        <defs>
          <pattern id="grass" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#b9d5a1"/><path d="M8 12l2-4 2 4M29 30l2-4 2 4" stroke="#a4c68c" fill="none"/></pattern>
          <pattern id="paving" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#e9d9b7"/><path d="M0 0H30V30" stroke="#d8c9a7" fill="none"/></pattern>
        </defs>
        <rect width="1000" height="700" fill="url(#grass)"/>
        <path d="M0 230H1000V285H0ZM320 0H390V700H320ZM610 0H675V700H610ZM0 560H1000V625H0Z" fill="url(#paving)"/>
        <rect x="300" y="275" width="400" height="230" rx="95" fill="url(#paving)"/>
        <g><rect x="80" y="65" width="230" height="130" rx="14" fill="#c88767"/><path d="M60 78L195 20 330 78Z" fill="#834f4e"/><rect x="155" y="114" width="80" height="65" rx="8" fill="#593f42"/><text x="195" y="103" textAnchor="middle" fill="#fff4d8" fontSize="18" fontWeight="bold">QUÁN HÓNG CHUYỆN</text><path d="M100 200h190" stroke="#fff0cf" strokeWidth="8"/></g>
        <g><rect x="690" y="65" width="230" height="130" rx="14" fill="#6266a9"/><path d="M675 70L805 18 935 70Z" fill="#414574"/><rect x="767" y="115" width="76" height="80" rx="10" fill="#282c57"/><text x="805" y="103" textAnchor="middle" fill="#f4dd85" fontSize="25" fontWeight="bold">GAME CLUB</text><text x="805" y="220" textAnchor="middle" fill="#354639" fontSize="15">↓ Vào hàng đợi ở đây ↓</text></g>
        <ellipse cx="500" cy="371" rx="70" ry="45" fill="#a7a39a"/><ellipse cx="500" cy="350" rx="60" ry="38" fill="#72c9d3"/><ellipse cx="500" cy="345" rx="40" ry="24" fill="#a2e4e8"/><path d="M500 345V302m-22 11q22-35 44 0" fill="none" stroke="#e2ffff" strokeWidth="8" strokeLinecap="round"/>
        {[{ x: 100, y: 475 }, { x: 770, y: 475 }].map(b => <g key={b.x}><rect x={b.x} y={b.y} width="90" height="40" rx="7" fill="#9c704f"/><path d={`M${b.x + 8} ${b.y + 12}h74m-74 12h74`} stroke="#c9996a" strokeWidth="5"/></g>)}
        {tables.map(t => <g key={t.id}><circle cx={t.x} cy={t.y} r="25" fill="#a57550" stroke="#e7c49a" strokeWidth="5"/><circle cx={t.x-40} cy={t.y} r="13" fill="#875a41"/><circle cx={t.x+40} cy={t.y} r="13" fill="#875a41"/><text x={t.x} y={t.y+52} textAnchor="middle" fontSize="12" fill="#375542">Bàn {t.id.slice(-1)}</text></g>)}
        {[{ x: 50, y: 350 }, { x: 920, y: 340 }, { x: 240, y: 540 }, { x: 715, y: 600 }, { x: 50, y: 630 }, { x: 940, y: 630 }].map(t => <g key={`${t.x}:${t.y}`}><rect x={t.x-5} y={t.y} width="10" height="33" rx="4" fill="#8b7154"/><circle cx={t.x} cy={t.y-12} r="28" fill="#60986a"/><circle cx={t.x-8} cy={t.y-23} r="19" fill="#7aaf75"/></g>)}
        <text x="500" y="555" textAnchor="middle" fill="#5d7960" fontSize="24" fontWeight="bold" letterSpacing="5">QUẢNG TRƯỜNG BẢNH</text>
        <text x="500" y="667" textAnchor="middle" fill="#5d7960" fontSize="15">CÔNG VIÊN ANH EM</text>
        {Object.entries(players).sort((a,b) => a[1].y-b[1].y).map(([id,p]) => {
          const bubble = [...messages].reverse().find(m => m.from === id && now - m.at < 5000);
          const emoji = emotes[id]?.until > now ? emotes[id].text : '';
          return <g key={id} data-player={id} data-x={p.x} data-y={p.y} data-username={p.username} style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: 'transform 60ms linear' }}>
            <ellipse cy="16" rx="16" ry="7" fill="#0003"/>
            {id === self && <ellipse cy="16" rx="21" ry="10" fill="none" stroke="#fff" strokeWidth="2"/>}
            <rect x="-12" y="-5" width="24" height={p.table ? 17 : 25} rx="10" fill={p.color}/><circle cy="-14" r="13" fill="#ffe0bd"/><path d="M-13-16q0-22 26 0" fill="#54413a"/><circle cx="-4" cy="-13" r="1.5"/><circle cx="4" cy="-13" r="1.5"/>
            <text y="39" textAnchor="middle" fontSize="13" fontWeight="bold" stroke="#fff" strokeWidth="3" paintOrder="stroke" fill="#334155">{p.username.slice(0,22)}{id === self ? ' · bạn' : ''}</text>
            {emoji && <text y="-42" textAnchor="middle" fontSize="27">{emoji}</text>}
            {bubble && <g><rect x="-100" y="-80" width="200" height="30" rx="12" fill="white"/><text y="-60" textAnchor="middle" fill="#334155" fontSize="12">{bubble.text.slice(0,28)}{bubble.text.length > 28 ? '…' : ''}</text></g>}
          </g>;
        })}
      </svg>
    </div>
    <div className="my-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex gap-2" aria-label="Điều khiển di chuyển">{directions.map(d => <button key={d.label} aria-label={`Di chuyển ${d.label}`} className="h-12 w-12 touch-none select-none rounded-xl border border-neutral-700 bg-neutral-800 text-xl active:bg-emerald-700" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); touch.current = d; }} onPointerUp={() => { touch.current = { dx: 0, dy: 0 }; }} onPointerCancel={() => { touch.current = { dx: 0, dy: 0 }; }} onLostPointerCapture={() => { touch.current = { dx: 0, dy: 0 }; }}>{d.label}</button>)}</div>
      <div className="flex gap-1">{['👋','❤️','😂','🎉'].map(e => <button key={e} aria-label={`Biểu cảm ${e}`} onClick={() => socket?.emit('world:emote', e)} className="h-11 w-11 rounded-xl bg-neutral-800 text-xl">{e}</button>)}</div>
    </div>
    <section className="mb-3 rounded-xl border border-violet-900 bg-violet-950/20 p-4">
      <div className="flex items-center justify-between gap-2"><h2 className="font-bold text-violet-300">Game Club · Đố vui anh em</h2><span className="text-xs text-neutral-400">{game.participants.length} người</span></div>
      {game.phase === 'question' && game.question ? <div className="mt-3">
        <p className="mb-2 text-xs text-neutral-400">Câu {game.question.number}/{game.question.total} · {Math.max(0, Math.ceil((game.endsAt-now)/1000))}s {participating ? '' : '· Bạn đang xem'}</p>
        <p className="mb-3 font-semibold">{game.question.text}</p>
        <div className="grid grid-cols-2 gap-2">{game.question.options.map((option,i) => <button key={i} disabled={!participating || answered || now >= game.endsAt} onClick={() => socket?.emit('world:quiz:answer', { round: game.round, answer: i })} className="rounded-lg border border-violet-700 p-3 text-left text-sm hover:bg-violet-900 disabled:opacity-50">{option}</button>)}</div>
        {answered && <p role="status" className="mt-2 text-sm text-emerald-300">Đã nhận đáp án. Chờ câu tiếp theo!</p>}
      </div> : <>
        {game.phase === 'results' && <ol className="my-3 space-y-1">{Object.entries(game.scores).sort((a,b) => b[1]-a[1]).map(([id,score],i) => <li key={id} className="text-sm">{i+1}. {players[id]?.username || 'Người chơi'} — {score} điểm</li>)}</ol>}
        <p className="my-2 text-sm text-neutral-400">5 câu hỏi, 12 giây/câu, 100 điểm/đáp án đúng. Hai người vào hàng đợi để bắt đầu.</p>
        <button disabled={!inLobby || floorMember || (game.phase === 'waiting' && participating)} onClick={() => socket?.emit('world:quiz:join')} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold disabled:opacity-40">{!inLobby ? 'Đi tới Game Club ở góc phải phía trên' : participating && game.phase === 'waiting' ? 'Đang chờ người chơi thứ hai…' : 'Tham gia quiz'}</button>
        {game.phase === 'waiting' && participating && <button className="ml-3 text-sm underline" onClick={() => socket?.emit('world:quiz:leave')}>Rời hàng đợi quiz</button>}
      </>}
    </section>
    <section className="mb-3 rounded-xl border border-amber-900 bg-amber-950/20 p-4">
      <h2 className="font-bold text-amber-300">Game Club · Sàn biến mất</h2>
      <p className="my-2 text-sm text-neutral-400">Chạm ô kề cạnh để di chuyển. Ô vàng sắp rơi, ô tối đã mất. Sống sót đến cuối để thắng!</p>
      {floor.phase === 'running' && <p className="mb-2 text-xs text-amber-200">Vòng {floor.round}/8 · {Math.max(0, Math.ceil((floor.endsAt-now)/1000))}s {floor.pieces[self]?.alive === false ? '· Bạn đã bị loại' : ''}</p>}
      <div className="grid max-w-xs grid-cols-6 gap-1" aria-label="Sàn biến mất">
        {Array.from({ length: 36 }, (_, cell) => {
          const mine = floor.pieces[self];
          const adjacent = mine && Math.abs(cell%6-mine.cell%6)+Math.abs(Math.floor(cell/6)-Math.floor(mine.cell/6)) === 1;
          const gone = floor.fallen.includes(cell);
          const occupants = Object.entries(floor.pieces).filter(([,p]) => p.cell === cell && p.alive);
          return <button key={cell} aria-label={`Ô ${cell+1}`} disabled={floor.phase !== 'running' || !mine?.alive || !adjacent || gone} onClick={() => socket?.emit('world:floor:move', cell)} className={`relative aspect-square min-h-9 rounded-md border text-xs ${gone ? 'border-neutral-900 bg-neutral-950' : floor.warning.includes(cell) ? 'border-amber-300 bg-amber-400 text-black' : 'border-emerald-700 bg-emerald-900'} ${adjacent && mine?.alive && !gone ? 'ring-1 ring-white/60' : ''}`}>
            {occupants.map(([id]) => <span key={id} title={players[id]?.username} style={{ color: players[id]?.color || 'white' }}>{id === self ? '★' : '●'}</span>)}
          </button>;
        })}
      </div>
      {floor.phase === 'results' && <p role="status" className="my-3 text-sm text-amber-200">Kết quả: {Object.entries(floor.pieces).filter(([,p]) => p.alive).map(([id]) => players[id]?.username || 'Người chơi').join(', ') || 'Không ai sống sót'}{Object.values(floor.pieces).some(p => p.alive) ? ' sống sót!' : '.'}</p>}
      {floor.phase !== 'running' && <button disabled={!inLobby || (game.phase !== 'results' && participating) || floorMember} onClick={() => socket?.emit('world:floor:join')} className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm disabled:opacity-40">{floorMember ? 'Đang chờ người chơi thứ hai…' : !inLobby ? 'Đến Game Club để tham gia' : 'Chơi sàn biến mất'}</button>}
      {floorMember && <button className="ml-3 mt-3 text-sm underline" onClick={() => socket?.emit('world:floor:leave')}>Rời sàn</button>}
    </section>
    <section className="rounded-xl border border-neutral-800 p-3">
      <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Trò chuyện {scope === 'table' && me?.table ? 'riêng tại bàn' : 'gần bạn'}</h2><select aria-label="Kênh trò chuyện" value={me?.table ? scope : 'nearby'} onChange={e => setScope(e.target.value)} className="rounded border border-neutral-700 bg-neutral-900 p-1 text-xs"><option value="nearby">Gần bạn</option>{me?.table && <option value="table">Riêng tại bàn</option>}</select></div>
      <div role="log" aria-live="polite" className="mb-3 flex max-h-36 flex-col overflow-y-auto text-sm">{messages.length ? messages.map(m => <p key={m.id} className="break-words py-1"><span className="font-semibold text-emerald-300">{m.scope === 'table' ? '[Bàn] ' : ''}{m.username}: </span>{m.text}</p>) : <p className="text-neutral-500">Lại gần một người và nói lời chào!</p>}</div>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (text.trim() && me) { socket?.emit('world:chat', { text: text.trim(), scope: me.table ? scope : 'nearby' }); setText(''); } }}>
        <input aria-label="Tin nhắn gần bạn" maxLength={200} value={text} onChange={e => setText(e.target.value)} onFocus={() => keys.current.clear()} placeholder="Nói gì đó với anh em…" className="min-w-0 flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"/>
        <button disabled={!me || !text.trim()} className="rounded-lg bg-emerald-700 px-4 text-sm disabled:opacity-40">Gửi</button>
      </form>
    </section>
  </div>;
}
