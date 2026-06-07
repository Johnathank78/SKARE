/* SKARE — StepTimer : compte à rebours interactif (lancer / pause / reset).
   - Piloté par la carte (`started`) : la carte lance le minuteur au 1er
     clic, puis valide l'étape au 2e clic (`onComplete` à la fin du temps).
   - Compte à rebours basé sur l'HORLOGE MURALE (deadline absolue) plutôt
     que sur un décrément : robuste quand l'app passe en arrière-plan
     (setInterval throttlé). On recale aussi sur `visibilitychange`. */
const { useState: useStateT, useEffect: useEffectT, useRef: useRefT } = React;

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, '0')}`;
}

function StepTimer({ seconds, pal, started, onStart, onComplete }) {
  const [remaining, setRemaining] = useStateT(seconds);
  const [running, setRunning] = useStateT(false);
  const tick = useRefT(null);
  const deadlineRef = useRefT(null); // timestamp absolu de fin (ms)
  const firedRef = useRefT(false);   // onComplete déclenché une seule fois

  // Démarrage / arrêt piloté par la carte.
  useEffectT(() => {
    if (started) { firedRef.current = false; setRemaining(seconds); deadlineRef.current = null; setRunning(true); }
    else { setRunning(false); deadlineRef.current = null; setRemaining(seconds); }
  }, [started]);

  // Compte à rebours à l'horloge murale (résiste à l'arrière-plan).
  useEffectT(() => {
    if (!running) { deadlineRef.current = null; return undefined; }
    if (deadlineRef.current == null) deadlineRef.current = Date.now() + remaining * 1000;
    const update = () => {
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) { clearInterval(tick.current); setRunning(false); deadlineRef.current = null; }
    };
    tick.current = setInterval(update, 250);
    update();
    // Au retour de l'arrière-plan, on recale immédiatement le temps restant.
    const onVis = () => { if (document.visibilityState === 'visible') update(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(tick.current); document.removeEventListener('visibilitychange', onVis); };
  }, [running]);

  // Fin du minuteur → valide l'étape (une seule fois).
  useEffectT(() => {
    if (remaining === 0 && started && !firedRef.current) { firedRef.current = true; onComplete && onComplete(); }
  }, [remaining, started]);

  const done = remaining === 0;
  const pct = seconds ? 1 - remaining / seconds : 0;
  const stop = (e) => e.stopPropagation();
  const open = started;

  // Gabarit « chip » commun (invite à lancer + état terminé).
  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    height: 46, padding: '0 18px 0 14px', borderRadius: 23,
    border: `1.5px solid ${pal.dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.10)'}`,
    background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.42)',
    color: pal.text, font: '600 16px -apple-system, system-ui',
    WebkitTapHighlightColor: 'transparent',
  };

  // Minuteur terminé → on le réduit à son visuel d'origine, mais coche + « Terminé ».
  if (done) {
    return (
      <div style={chipStyle}>
        <SkareIcon name="check" size={20} color={pal.accent} />
        <span>Terminé</span>
      </div>
    );
  }

  // Chip fermé : invite à lancer le minuteur (clic = clic carte → onStart).
  if (!open) {
    return (
      <button onClick={(e) => { stop(e); onStart && onStart(); }} style={{ ...chipStyle, cursor: 'pointer' }}>
        <SkareIcon name="timer" size={20} color={pal.accent} />
        <span>Minuteur {fmtTime(seconds)}</span>
      </button>
    );
  }

  // Ouvert : minuteur en cours — anneau de progression + contrôles (compact)
  const ring = 58, sw = 5, r = ring / 2 - sw / 2 - 1;
  return (
    <div onClick={stop} style={{
      flex: '1 1 100%', width: '100%', boxSizing: 'border-box',
      display: 'flex', alignItems: 'center', gap: 14, marginTop: 4,
      padding: 12, borderRadius: 18,
      background: pal.dark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.34)',
      border: `1px solid ${pal.dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.6)'}`,
    }}>
      <div style={{ position: 'relative', width: ring, height: ring, flexShrink: 0 }}>
        <svg width={ring} height={ring} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={ring/2} cy={ring/2} r={r} fill="none"
            stroke={pal.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)'} strokeWidth={sw} />
          <circle cx={ring/2} cy={ring/2} r={r} fill="none"
            stroke={pal.accent} strokeWidth={sw} strokeLinecap="round"
            strokeDasharray={2 * Math.PI * r}
            strokeDashoffset={2 * Math.PI * r * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          font: '700 16px -apple-system, system-ui', color: pal.text,
        }}>
          {fmtTime(remaining)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
        <button onClick={() => setRunning((r2) => !r2)} aria-label={running ? 'Pause' : 'Reprendre'}
          style={ctrlStyle(pal, true)}>
          <SkareIcon name={running ? 'pause' : 'play'} size={22} color={pal.accentInk} />
        </button>
        <button onClick={() => { setRunning(false); deadlineRef.current = null; firedRef.current = false; setRemaining(seconds); }} aria-label="Réinitialiser"
          style={ctrlStyle(pal, false)}>
          <SkareIcon name="reset" size={20} color={pal.text} />
        </button>
      </div>
    </div>
  );
}

function ctrlStyle(pal, filled, size = 46) {
  return {
    width: size, height: size, borderRadius: size / 2, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: filled ? pal.accent : (pal.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)'),
    boxShadow: filled ? '0 6px 16px rgba(0,0,0,0.18)' : 'none',
    WebkitTapHighlightColor: 'transparent',
  };
}

Object.assign(window, { StepTimer, fmtSkareTime: fmtTime });
