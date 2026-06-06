/* SKARE — StepTimer : compte à rebours interactif (lancer / pause / reset). */
const { useState: useStateT, useEffect: useEffectT, useRef: useRefT } = React;

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

function StepTimer({ seconds, pal, glass }) {
  const [remaining, setRemaining] = useStateT(seconds);
  const [running, setRunning] = useStateT(false);
  const [open, setOpen] = useStateT(false);
  const tick = useRefT(null);

  useEffectT(() => {
    if (running) {
      tick.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) { clearInterval(tick.current); setRunning(false); return 0; }
          return r - 1;
        });
      }, 1000);
      return () => clearInterval(tick.current);
    }
  }, [running]);

  const done = remaining === 0;
  const pct = 1 - remaining / seconds;

  const stop = (e) => e.stopPropagation();

  // Chip fermé : invite à lancer le minuteur
  if (!open) {
    return (
      <button
        onClick={(e) => { stop(e); setOpen(true); setRunning(true); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          height: 46, padding: '0 18px 0 14px', borderRadius: 23,
          border: `1.5px solid ${pal.dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.10)'}`,
          background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.42)',
          color: pal.text, font: '600 16px -apple-system, system-ui', cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <SkareIcon name="timer" size={20} color={pal.accent} />
        <span>Minuteur {fmtTime(seconds)}</span>
      </button>
    );
  }

  // Ouvert : pleine largeur de la carte — anneau de progression + contrôles géants
  const ring = 92;
  return (
    <div onClick={stop} style={{
      flex: '1 1 100%', width: '100%', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', gap: 18, marginTop: 4,
      padding: 16, borderRadius: 24,
      background: pal.dark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.34)',
      border: `1px solid ${pal.dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.6)'}`,
    }}>
      <div style={{ position: 'relative', width: ring, height: ring, flexShrink: 0 }}>
        <svg width={ring} height={ring} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={ring/2} cy={ring/2} r={ring/2 - 6} fill="none"
            stroke={pal.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'} strokeWidth="6" />
          <circle cx={ring/2} cy={ring/2} r={ring/2 - 6} fill="none"
            stroke={done ? pal.accent : pal.accent} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * (ring/2 - 6)}
            strokeDashoffset={2 * Math.PI * (ring/2 - 6) * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          font: `700 ${done ? 15 : 22}px -apple-system, system-ui`, color: pal.text,
        }}>
          {done ? 'Terminé' : fmtTime(remaining)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
        {!done && (
          <button onClick={() => setRunning((r) => !r)} aria-label={running ? 'Pause' : 'Reprendre'}
            style={ctrlStyle(pal, true)}>
            <SkareIcon name={running ? 'pause' : 'play'} size={26} color={pal.accentInk} />
          </button>
        )}
        <button onClick={() => { setRunning(false); setRemaining(seconds); }} aria-label="Réinitialiser"
          style={ctrlStyle(pal, false)}>
          <SkareIcon name="reset" size={24} color={pal.text} />
        </button>
      </div>
    </div>
  );
}

function ctrlStyle(pal, filled) {
  return {
    width: 60, height: 60, borderRadius: 30, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: filled ? pal.accent : (pal.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)'),
    boxShadow: filled ? '0 6px 16px rgba(0,0,0,0.18)' : 'none',
    WebkitTapHighlightColor: 'transparent',
  };
}

Object.assign(window, { StepTimer, fmtSkareTime: fmtTime });
