/* SKARE — StepCard : grosse carte Liquid Glass, badges, hitbox de validation. */

/* Recette glass paramétrable (intensité / contraste / arrondi). */
function skareGlass(pal, cfg) {
  const blur = cfg.intensity === 'subtil' ? 14 : cfg.intensity === 'moyen' ? 22 : 32;
  let tint, shine, line, shadow;
  if (pal.dark) {
    const base = cfg.contrast === 'fort' ? 0.16 : 0.10;
    const bump = cfg.intensity === 'intense' ? 0.05 : cfg.intensity === 'moyen' ? 0.02 : 0;
    tint = `rgba(255,255,255,${(base + bump).toFixed(3)})`;
    shine = 'inset 1px 1px 0 rgba(255,255,255,0.22), inset -1px -1px 0 rgba(255,255,255,0.06)';
    line = `1px solid rgba(255,255,255,${cfg.contrast === 'fort' ? 0.22 : 0.14})`;
    shadow = '0 10px 30px rgba(0,0,0,0.30)';
  } else {
    const base = cfg.contrast === 'fort' ? 0.50 : 0.34;
    const bump = cfg.intensity === 'intense' ? 0.10 : cfg.intensity === 'moyen' ? 0.04 : 0;
    tint = `rgba(255,255,255,${Math.min(0.72, base + bump).toFixed(3)})`;
    shine = 'inset 1.5px 1.5px 0 rgba(255,255,255,0.85), inset -1px -1px 0 rgba(255,255,255,0.45)';
    line = `1px solid rgba(255,255,255,${cfg.contrast === 'fort' ? 0.85 : 0.6})`;
    shadow = '0 10px 28px rgba(120,70,40,0.14)';
  }
  return {
    background: tint,
    backdropFilter: `blur(${blur}px) saturate(180%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(180%)`,
    border: line,
    boxShadow: `${shine}, ${shadow}`,
    borderRadius: cfg.radius,
  };
}

function Badge({ label, pal }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 14px',
      borderRadius: 17, font: '600 14px -apple-system, system-ui', color: pal.text,
      background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.5)',
      border: `1px solid ${pal.dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.7)'}`,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function StepCard({ step, index, pal, cfg, done, isNext, onToggle, compact }) {
  const surface = skareGlass(pal, cfg);
  // Rotation transparente : on affiche le produit/icône actif du jour.
  const active = skareActiveVariant(step, new Date());

  /* Comportement du clic avec minuteur :
       1er clic → lance le minuteur · 2e clic → valide l'étape
       fin du minuteur → valide l'étape · (sur une étape déjà faite → annule) */
  const hasTimer = !!step.waitSeconds;
  const [timerStarted, setTimerStarted] = React.useState(false);
  // Si l'étape repasse en « non fait » (reset / annulation), on remet le minuteur à zéro.
  React.useEffect(() => { if (!done) setTimerStarted(false); }, [done]);

  const handleClick = () => {
    if (!hasTimer) { onToggle(); return; }
    if (done) { onToggle(); return; }                       // annule la validation
    if (!timerStarted) { setTimerStarted(true); return; }   // 1er clic : lance le minuteur
    onToggle();                                              // 2e clic : valide l'étape
  };
  const completeStep = () => { if (!done) onToggle(); };

  return (
    <div
      onClick={handleClick}
      role="button"
      aria-pressed={done}
      style={{
        position: 'relative', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        padding: compact ? 18 : 22, ...surface,
        outline: isNext && !done ? `2px solid ${pal.accent}` : 'none',
        outlineOffset: isNext && !done ? -2 : 0,
        opacity: done ? 0.6 : 1,
        transition: 'opacity .25s ease, transform .15s ease, outline-color .2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* icône actif */}
        <div style={{
          width: 58, height: 58, borderRadius: 19, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)',
          border: `1px solid ${pal.dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.7)'}`,
          color: pal.accent,
        }}>
          <SkareIcon name={active.icon} size={30} color={pal.accent} />
        </div>

        {/* texte */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <div style={{
            font: '700 12px -apple-system, system-ui', letterSpacing: 1.2,
            textTransform: 'uppercase', color: pal.muted, marginBottom: 4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            Étape {index + 1} · {step.action}
          </div>
          <div style={{
            font: '700 26px/1.1 -apple-system, system-ui', color: pal.text,
            letterSpacing: -0.4, textWrap: 'balance',
            textDecoration: done ? `line-through ${pal.muted}` : 'none',
            display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
            overflow: 'hidden',
          }}>
            {active.product}
          </div>
        </div>

        {/* hitbox de validation géante */}
        <div style={{
          width: 56, height: 56, borderRadius: 28, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: done ? pal.accent : 'transparent',
          border: done ? 'none' : `2.5px solid ${pal.dark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.18)'}`,
          transition: 'background .2s',
        }}>
          {done && <SkareIcon name="check" size={28} color={pal.accentInk} />}
        </div>
      </div>

      {/* badges + minuteur */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginTop: 16 }}>
        {step.badges.map((b) => <Badge key={b} label={b} pal={pal} />)}
        {hasTimer ? <StepTimer seconds={step.waitSeconds} pal={pal} started={timerStarted}
          onStart={() => setTimerStarted(true)} onComplete={completeStep} /> : null}
      </div>
    </div>
  );
}

Object.assign(window, { StepCard, skareGlass, SkareBadge: Badge });
