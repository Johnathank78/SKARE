/* SKARE — Menu burger + Éditeur de routine (2 onglets, réordonnable). */
const { useState: useStateE, useRef: useRefE, useEffect: useEffectE } = React;

/* Crossfade fluide entre la palette matin et la palette soir lors
   d'un changement d'onglet. Anime toutes les couleurs (fonds, accent,
   texte) image par image avec un easing doux. */
function useAnimatedPalette(targetPal) {
  const [pal, setPal] = useStateE(targetPal);
  const fromRef = useRefE(targetPal);
  const rafRef = useRefE(null);
  const firstRef = useRefE(true);
  useEffectE(() => {
    if (firstRef.current) {firstRef.current = false;fromRef.current = targetPal;setPal(targetPal);return;}
    const from = fromRef.current,to = targetPal,start = performance.now(),dur = 850;
    cancelAnimationFrame(rafRef.current);
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 0.5 - Math.cos(Math.PI * t) / 2; // easeInOutSine — départ/arrivée très doux
      const cur = skareLerpPalette(from, to, e);
      fromRef.current = cur;
      setPal(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);else
      fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [targetPal]);
  return pal;
}

const EDIT_CFG = { intensity: 'moyen', contrast: 'doux', radius: 22 };

/* Durées proposées dans le sélecteur de minuteur (secondes). */
const SKARE_TIMER_PRESETS = [
{ v: null, label: 'Aucun' }, { v: 60, label: '1 min' }, { v: 120, label: '2 min' },
{ v: 180, label: '3 min' }, { v: 240, label: '4 min' }, { v: 300, label: '5 min' },
{ v: 360, label: '6 min' }, { v: 420, label: '7 min' }, { v: 480, label: '8 min' },
{ v: 600, label: '10 min' }];


function fieldColors(pal) {
  return {
    fieldBg: pal.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
    line: pal.dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)',
    soft: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)'
  };
}

/* ── Menu burger (extension sous le bouton, en haut à droite) ── */
function MenuSheet({ pal, onClose, onRoutine, onProducts, onJournal }) {
  const { line } = fieldColors(pal);
  const [shown, setShown] = useStateE(false);
  useEffectE(() => {const id = requestAnimationFrame(() => setShown(true));return () => cancelAnimationFrame(id);}, []);

  const item = (icon, title, onClick, first) =>
  <button onClick={onClick} style={{
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', cursor: 'pointer',
    padding: '14px 16px', border: 'none', borderTop: first ? 'none' : `1px solid ${line}`,
    background: 'transparent', WebkitTapHighlightColor: 'transparent', transition: 'background .15s'
  }}
  onMouseEnter={(e) => {e.currentTarget.style.background = pal.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';}}
  onMouseLeave={(e) => {e.currentTarget.style.background = 'transparent';}}>
      <div style={{
      width: 42, height: 42, borderRadius: 14, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.7)',
      border: `1px solid ${line}`
    }}>
        <SkareIcon name={icon} size={23} color={pal.accent} />
      </div>
      <span style={{ font: '700 17px -apple-system, system-ui', letterSpacing: -0.3, color: pal.text }}>{title}</span>
    </button>;


  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'absolute', top: 112, right: 22, width: 234, overflow: 'hidden',
        borderRadius: 22, border: `1px solid ${line}`,
        background: pal.dark ? 'rgba(28,32,58,0.82)' : 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(22px) saturate(180%)', WebkitBackdropFilter: 'blur(22px) saturate(180%)',
        boxShadow: `0 18px 50px ${pal.dark ? 'rgba(0,0,0,0.5)' : 'rgba(120,70,40,0.28)'}`,
        transformOrigin: 'top right',
        transform: shown ? 'scale(1) translateY(0)' : 'scale(0.86) translateY(-10px)',
        opacity: shown ? 1 : 0,
        transition: 'transform .26s cubic-bezier(.2,.9,.3,1.1), opacity .2s ease'
      }}>
        {item('edit', 'Ma routine', onRoutine, true)}
        {item('potion', 'Mes produits', onProducts, false)}
        {item('camera', 'Mon journal', onJournal, false)}
      </div>
    </div>);

}

/* ── Sélecteur d'icône : un bouton ; au clic une barre d'icônes
     glisse en place ; le choix referme la barre. ───────────── */
function IconPicker({ value, onChange, pal, line, soft }) {
  const icons = ['water', 'drop', 'cream', 'balm', 'sun', 'moon'];
  const [open, setOpen] = useStateE(false);
  const cell = (ic, cur, onClick) =>
  <button key={ic} onClick={onClick} style={{
    width: 38, height: 38, borderRadius: 11, flexShrink: 0, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: cur ? pal.accent : pal.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.045)',
    border: `1px solid ${cur ? pal.accent : line}`, WebkitTapHighlightColor: 'transparent',
    transition: 'background .15s, border-color .15s'
  }}><SkareIcon name={ic} size={21} color={cur ? pal.accentInk : pal.text} /></button>;

  return (
    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
      {/* voile de fermeture au clic extérieur */}
      {open &&
      <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 5 }} />}
      {/* barre coulissante */}
      <div style={{
        position: 'absolute', left: 0, top: -1, display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 6px', borderRadius: 17,
        background: pal.dark ? 'rgba(46,52,92,0.98)' : 'rgba(255,255,255,0.99)',
        backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${line}`, boxShadow: `0 12px 30px ${pal.dark ? 'rgba(0,0,0,0.5)' : 'rgba(120,70,40,0.22)'}`,
        maxWidth: open ? 360 : 0, opacity: open ? 1 : 0, overflow: 'hidden',
        pointerEvents: open ? 'auto' : 'none', zIndex: 6,
        transition: 'max-width .34s cubic-bezier(.2,.9,.3,1.05), opacity .2s ease'
      }}>
        {icons.map((ic) => cell(ic, ic === value, () => {onChange(ic);setOpen(false);}))}
      </div>
      {/* déclencheur */}
      <button onClick={() => setOpen((o) => !o)} aria-label="Choisir une icône" style={{
        width: 52, height: 52, borderRadius: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: pal.accent, border: `1px solid ${pal.accent}`,
        opacity: open ? 0 : 1, transition: 'opacity .14s ease',
        WebkitTapHighlightColor: 'transparent'
      }}><SkareIcon name={value} size={24} color={pal.accentInk} /></button>
    </div>);

}

/* ── Bouton-champ façon « select » (déclenche un sélecteur) ─── */
function FieldButton({ pal, line, fieldBg, onClick, placeholder, label, sub, kicker, height = 44 }) {
  const empty = !label;
  return (
    <button onClick={onClick} style={{
      width: '100%', boxSizing: 'border-box', minHeight: height, padding: sub ? '9px 12px 9px 14px' : '0 12px 0 14px',
      borderRadius: 13, border: `1.5px solid ${line}`, background: fieldBg, cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
      WebkitTapHighlightColor: 'transparent'
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {kicker &&
        <div style={{ font: '700 10px -apple-system, system-ui', letterSpacing: 1, textTransform: 'uppercase', color: pal.muted, marginBottom: 3 }}>{kicker}</div>}
        <div style={{
          font: '600 15px -apple-system, system-ui', color: empty ? pal.muted : pal.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
        }}>{label || placeholder}</div>
        {sub &&
        <div style={{ font: '500 12.5px -apple-system, system-ui', color: pal.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
      </div>
      <span style={{ flexShrink: 0, transform: 'rotate(90deg)', display: 'flex', opacity: 0.7 }}>
        <SkareIcon name="chevron" size={17} color={pal.muted} />
      </span>
    </button>);

}

/* ── Carte d'édition d'une étape ──────────────────────────── */
function EditorStep({ step, index, count, pal, onPatch, onRemove, onMove, onOpenSheet }) {
  const { fieldBg, line, soft } = fieldColors(pal);
  const [badge, setBadge] = useStateE('');
  const surface = skareGlass(pal, EDIT_CFG);
  const prod = SKARE_PRODUCTS.find((p) => p.id === step.productId || p.name === step.product);

  const navBtn = (icon, label, onClick, disabled) =>
  <button onClick={disabled ? undefined : onClick} aria-label={label} disabled={disabled} style={{
    width: 30, height: 44, flexShrink: 0, border: 'none', background: 'transparent',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.25 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent'
  }}><SkareIcon name={icon} size={20} color={pal.muted} /></button>;

  return (
    <div style={{ padding: 14, ...surface, position: 'relative' }}>
      {/* en-tête : icône + action (alignés à gauche) · réordonner + supprimer (à droite) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <IconPicker value={step.icon} onChange={(ic) => onPatch({ icon: ic })} pal={pal} line={line} soft={soft} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <FieldButton pal={pal} line={line} fieldBg={fieldBg} kicker="Action"
          label={step.action} placeholder="Choisir une action" onClick={() => onOpenSheet('action')} height={52} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0 }}>
          {navBtn('up', 'Monter', () => onMove(-1), index === 0)}
          {navBtn('down', 'Descendre', () => onMove(1), index === count - 1)}
          {navBtn('close', 'Supprimer', onRemove, false)}
        </div>
      </div>

      {/* produit / actif → sélecteur custom avec recherche */}
      <FieldButton pal={pal} line={line} fieldBg={fieldBg} kicker="Produit / actif"
      label={step.product} placeholder="Choisir dans mes produits…"
      sub={prod ? prod.note : null} onClick={() => onOpenSheet('product')} height={52} />

      {/* minuteur — chips inline (aucun overlay) */}
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
          <SkareIcon name="timer" size={15} color={pal.muted} />
          <span style={{ font: '700 11px -apple-system, system-ui', letterSpacing: 1, textTransform: 'uppercase', color: pal.muted }}>Minuteur</span>
        </div>
        <div className="skare-hscroll" style={{ display: 'flex', flexWrap: 'nowrap', gap: 7, overflowX: 'auto', margin: '0 -14px', padding: '2px 14px' }}>
          {SKARE_TIMER_PRESETS.map((p) => {
            const sel = (p.v || null) === (step.waitSeconds || null);
            return <button key={p.label} onClick={() => onPatch({ waitSeconds: p.v })} style={{
              flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 17, cursor: 'pointer',
              font: '600 14px -apple-system, system-ui', WebkitTapHighlightColor: 'transparent',
              color: sel ? pal.accentInk : pal.text,
              background: sel ? pal.accent : soft,
              border: `1px solid ${sel ? pal.accent : line}`
            }}>{p.label}</button>;
          })}
        </div>
      </div>

      {/* séparateur */}
      <div style={{ height: 1, background: line, margin: '12px 0 11px', opacity: 0.7 }} />

      {/* indications (tags) — en bas de la tuile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: step.badges.length ? 10 : 0 }}>
        <input style={{
          flex: 1, minWidth: 0, boxSizing: 'border-box', height: 40, padding: '0 13px',
          borderRadius: 13, border: `1.5px solid ${line}`, background: fieldBg,
          color: pal.text, font: '600 14px -apple-system, system-ui', outline: 'none'
        }} value={badge} placeholder="Ajouter une indication…"
        onChange={(e) => setBadge(e.target.value)}
        onKeyDown={(e) => {if (e.key === 'Enter' && badge.trim()) {onPatch({ badges: [...step.badges, badge.trim()] });setBadge('');}}} />
        <button onClick={() => {if (badge.trim()) {onPatch({ badges: [...step.badges, badge.trim()] });setBadge('');}}} aria-label="Ajouter l'indication" style={{
          width: 40, height: 40, borderRadius: 12, border: `1px solid ${line}`, flexShrink: 0,
          background: soft, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent'
        }}><SkareIcon name="plus" size={18} color={pal.text} /></button>
      </div>
      {step.badges.length > 0 &&
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {step.badges.map((b, i) =>
        <span key={i} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 5px 0 12px',
          borderRadius: 16, font: '600 13px -apple-system, system-ui', color: pal.text,
          background: soft, border: `1px solid ${line}`
        }}>
              {b}
              <button onClick={() => onPatch({ badges: step.badges.filter((_, j) => j !== i) })}
          aria-label="Retirer" style={{
            width: 22, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: pal.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'
          }}><SkareIcon name="close" size={12} color={pal.muted} /></button>
            </span>
        )}
        </div>}
    </div>);

}

/* ── Sélecteur en bottom-sheet (action / produit / minuteur) ─ */
function PickerSheet({ kind, step, pal, onPick, onClose }) {
  const { line, soft, fieldBg } = fieldColors(pal);
  const [shown, setShown] = useStateE(false);
  const [q, setQ] = useStateE('');
  const searchRef = useRefE(null);
  useEffectE(() => {const id = requestAnimationFrame(() => setShown(true));return () => cancelAnimationFrame(id);}, []);
  const close = () => {setShown(false);setTimeout(onClose, 230);};

  const title = kind === 'action' ? 'Action' : kind === 'product' ? 'Produit / actif' : 'Minuteur';
  const panelBg = pal.dark ? 'rgba(26,30,56,0.97)' : 'rgba(255,251,248,0.98)';

  const row = (selected, onClick, main, note) =>
  <button key={main + (note || '')} onClick={onClick} style={{
    width: '100%', boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 14,
    border: `1px solid ${selected ? pal.accent : line}`,
    background: selected ? pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.7)' : 'transparent',
    WebkitTapHighlightColor: 'transparent'
  }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '700 16px -apple-system, system-ui', color: pal.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{main}</div>
        {note && <div style={{ font: '500 13px -apple-system, system-ui', color: pal.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{note}</div>}
      </div>
      <span style={{
      width: 24, height: 24, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: selected ? pal.accent : 'transparent', border: selected ? 'none' : `2px solid ${line}`
    }}>{selected && <SkareIcon name="check" size={15} color={pal.accentInk} />}</span>
    </button>;

  let body;
  if (kind === 'action') {
    body = <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {SKARE_ACTIONS.map((a) => row(a === step.action, () => {onPick({ action: a });close();}, a))}
      </div>
      <div style={{ font: '500 12.5px -apple-system, system-ui', color: pal.muted, textAlign: 'center', paddingTop: 12 }}>
        L'action décrit le geste de cette étape.
      </div>
    </>;
  } else if (kind === 'product') {
    const qn = q.trim().toLowerCase();
    const list = SKARE_PRODUCTS.filter((p) => !qn || p.name.toLowerCase().includes(qn) || (p.note || '').toLowerCase().includes(qn));
    body = <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, height: 46, padding: '0 14px', marginBottom: 12,
        borderRadius: 14, border: `1.5px solid ${line}`, background: fieldBg
      }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={pal.muted} strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
        </svg>
        <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un actif…" style={{
          flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
          color: pal.text, font: '600 15px -apple-system, system-ui'
        }} />
        {q && <button onClick={() => setQ('')} aria-label="Effacer" style={{
          width: 26, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: pal.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'
        }}><SkareIcon name="close" size={13} color={pal.muted} /></button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flex: 1, minHeight: 0 }}>
        {list.map((p) => row(p.id === step.productId || p.name === step.product, () => {onPick({ product: p.name, productId: p.id });close();}, p.name, p.note))}
        {list.length === 0 &&
        <div style={{ textAlign: 'center', color: pal.muted, padding: '28px 0', font: '500 14px -apple-system, system-ui' }}>
            Aucun actif trouvé.
          </div>}
      </div>
      <div style={{ font: '500 12.5px -apple-system, system-ui', color: pal.muted, textAlign: 'center', paddingTop: 12 }}>
        Gérez vos actifs dans « Mes produits ».
      </div>
    </>;
  } else {// timer
    body = <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {SKARE_TIMER_PRESETS.map((p) => {
        const sel = (p.v || null) === (step.waitSeconds || null);
        return <button key={p.label} onClick={() => {onPick({ waitSeconds: p.v });close();}} style={{
          height: 56, borderRadius: 16, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
          font: '700 16px -apple-system, system-ui',
          color: sel ? pal.accentInk : pal.text,
          background: sel ? pal.accent : pal.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)',
          border: `1.5px solid ${sel ? pal.accent : line}`
        }}>{p.label}</button>;
      })}
    </div>;
  }

  return (
    <div onClick={close} style={{
      position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      background: shown ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0)', transition: 'background .25s',
      WebkitBackdropFilter: shown ? 'blur(2px)' : 'none', backdropFilter: shown ? 'blur(2px)' : 'none'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: panelBg, borderRadius: '26px 26px 0 0', borderTop: `1px solid ${line}`,
        backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: `0 -18px 50px ${pal.dark ? 'rgba(0,0,0,0.5)' : 'rgba(120,70,40,0.22)'}`,
        padding: '10px 18px max(22px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column',
        height: kind === 'timer' ? undefined : '70%', maxHeight: '78%',
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform .3s cubic-bezier(.2,.85,.3,1)'
      }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: line, margin: '0 auto 12px', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
          <h3 style={{ margin: 0, font: '800 21px -apple-system, system-ui', letterSpacing: -0.4, color: pal.text }}>{title}</h3>
          <button onClick={close} aria-label="Fermer" style={{
            marginLeft: 'auto', width: 34, height: 34, borderRadius: 17, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)'
          }}><SkareIcon name="close" size={18} color={pal.text} /></button>
        </div>
        {body}
      </div>
    </div>);

}

/* ── Éditeur plein écran ──────────────────────────────────── */
function RoutineEditor({ morningPal, eveningPal, initialTab, routines, setRoutines, onClose }) {
  const [tab, setTab] = useStateE(initialTab || 'morning');
  const pal = useAnimatedPalette(tab === 'morning' ? morningPal : eveningPal);
  const { line, soft } = fieldColors(pal);
  const list = routines[tab];

  const patch = (id, p) => setRoutines((prev) => ({
    ...prev, [tab]: prev[tab].map((s) => s.id === id ? { ...s, ...p } : s)
  }));
  const remove = (id) => setRoutines((prev) => ({ ...prev, [tab]: prev[tab].filter((s) => s.id !== id) }));
  const add = () => setRoutines((prev) => ({
    ...prev,
    [tab]: [...prev[tab], {
      id: Date.now(), routineId: tab === 'morning' ? 1 : 2, order: prev[tab].length,
      action: 'Appliquer', product: 'Nouveau produit', badges: [], waitSeconds: null,
      icon: 'drop', done: false
    }]
  }));

  /* ── Réordonnancement : appui long sur la poignée, puis swap live ── */
  const stepRefs = useRefE({});
  const tabRef = useRefE(tab);tabRef.current = tab;
  const listRef = useRefE(list);listRef.current = list;
  const baseRef = useRefE(0);
  const [dragId, setDragId] = useStateE(null);
  const [dragDY, setDragDY] = useStateE(0);
  const [sheet, setSheet] = useStateE(null); // { stepId, kind }
  const sheetStep = sheet ? list.find((s) => s.id === sheet.stepId) : null;

  const setRef = (id) => (el) => {if (el) stepRefs.current[id] = el;else delete stepRefs.current[id];};

  const swap = (id, dir) => setRoutines((prev) => {
    const arr = [...prev[tabRef.current]];
    const i = arr.findIndex((s) => s.id === id);const j = i + dir;
    if (j < 0 || j >= arr.length) return prev;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...prev, [tabRef.current]: arr };
  });

  const onHandleDown = (id, e) => {
    e.preventDefault();
    const startY = e.clientY;
    const GAP = 14;
    let active = false;
    const press = setTimeout(() => {
      active = true;
      const el = stepRefs.current[id];
      const r = el.getBoundingClientRect();
      baseRef.current = r.top + r.height / 2;
      setDragId(id);setDragDY(0);
      if (navigator.vibrate) navigator.vibrate(8);
    }, 200);

    const onMove = (ev) => {
      if (!active) {
        if (Math.abs(ev.clientY - startY) > 8) {clearTimeout(press);cleanup();}
        return;
      }
      ev.preventDefault();
      setDragDY(ev.clientY - baseRef.current);
      const arr = listRef.current; // ordre courant (jamais périmé)
      const idx = arr.findIndex((s) => s.id === id);
      if (idx > 0) {
        const pr = stepRefs.current[arr[idx - 1].id]?.getBoundingClientRect();
        if (pr && ev.clientY < pr.top + pr.height / 2) {
          baseRef.current -= pr.height + GAP; // recale pour rester collé au doigt
          swap(id, -1);return;
        }
      }
      if (idx < arr.length - 1) {
        const nr = stepRefs.current[arr[idx + 1].id]?.getBoundingClientRect();
        if (nr && ev.clientY > nr.top + nr.height / 2) {
          baseRef.current += nr.height + GAP;
          swap(id, 1);return;
        }
      }
    };
    const onUp = () => {clearTimeout(press);cleanup();setDragId(null);setDragDY(0);};
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const tabBtn = (key, lbl) =>
  <button onClick={() => setTab(key)} style={{
    flex: 1, height: 46, borderRadius: 14, border: 'none', cursor: 'pointer',
    font: '700 16px -apple-system, system-ui',
    color: tab === key ? pal.accentInk : pal.text,
    background: tab === key ? pal.accent : 'transparent',
    WebkitTapHighlightColor: 'transparent'
  }}>{lbl}</button>;


  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column',
      background: `linear-gradient(170deg, ${pal.bgTop}, ${pal.bgBot})`, color: pal.text
    }}>
      {/* top bar */}
      <div style={{ padding: '60px 18px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} aria-label="Fermer" style={{
          width: 46, height: 46, borderRadius: 23, border: `1px solid ${line}`,
          background: soft, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent'
        }}><SkareIcon name="close" size={22} color={pal.text} /></button>
        <h2 style={{ margin: 0, font: '800 24px -apple-system, system-ui', letterSpacing: -0.5, color: pal.text }}>
          Éditer la routine
        </h2>
      </div>

      {/* onglets */}
      <div style={{
        margin: '6px 18px 4px', padding: 5, borderRadius: 18, display: 'flex', gap: 4,
        background: soft, border: `1px solid ${line}`
      }}>
        {tabBtn('morning', 'Matin')}
        {tabBtn('evening', 'Soir')}
      </div>

      {/* liste éditable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 8px', display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
        {list.map((s, i) =>
        <div key={s.id} ref={setRef(s.id)} style={{
          transform: dragId === s.id ? `translateY(${dragDY}px) scale(1.025)` : 'none',
          zIndex: dragId === s.id ? 5 : 1, position: 'relative',
          boxShadow: dragId === s.id ? `0 22px 48px ${pal.dark ? 'rgba(0,0,0,0.55)' : 'rgba(120,70,40,0.3)'}` : 'none',
          opacity: dragId && dragId !== s.id ? 0.6 : 1,
          transition: dragId === s.id ? 'none' : 'transform .22s cubic-bezier(.2,.9,.3,1), box-shadow .2s, opacity .2s'
        }}>
          <EditorStep step={s} index={i} count={list.length} pal={pal}
          onPatch={(p) => patch(s.id, p)} onRemove={() => remove(s.id)} onMove={(dir) => swap(s.id, dir)}
          onOpenSheet={(kind) => setSheet({ stepId: s.id, kind })} />
        </div>
        )}
        {list.length === 0 &&
        <div style={{ textAlign: 'center', color: pal.muted, padding: 40, font: '500 15px -apple-system, system-ui' }}>
            Aucune étape — ajoutez un produit ci-dessous.
          </div>
        }
        <div style={{ height: 8 }} />
      </div>

      {/* ajouter un produit */}
      <div style={{ padding: '10px 18px 26px', background: `linear-gradient(to top, ${pal.bgBot} 60%, transparent)` }}>
        <button onClick={add} style={{
          width: '100%', height: 64, borderRadius: 32, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          font: '700 18px -apple-system, system-ui', color: pal.accentInk, background: pal.accent,
          boxShadow: `0 10px 30px ${pal.dark ? 'rgba(0,0,0,0.45)' : 'rgba(180,90,50,0.35)'}`,
          WebkitTapHighlightColor: 'transparent'
        }}>
          <SkareIcon name="plus" size={24} color={pal.accentInk} />Ajouter un produit
        </button>
      </div>

      {sheet && sheetStep &&
      <PickerSheet kind={sheet.kind} step={sheetStep} pal={pal}
      onPick={(p) => patch(sheet.stepId, p)} onClose={() => setSheet(null)} />}
    </div>);

}

Object.assign(window, { MenuSheet, RoutineEditor });