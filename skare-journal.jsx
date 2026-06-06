/* SKARE — « Mon journal » : appareil photo de progression.
   Capture (déclencheur ouvre l'appareil/galerie du téléphone) → review
   (valider ✓ / refuser ✗) → entrée datée. Mode galerie : grande vue +
   pellicule + suppression. */
const { useState: useStateJ, useRef: useRefJ, useEffect: useEffectJ } = React;

const J_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
function jParse(s) {const a = s.split('-').map(Number);return new Date(a[0], a[1] - 1, a[2]);}
function jFmt(s) {const d = jParse(s);return `${d.getDate()} ${J_MONTHS[d.getMonth()]} ${d.getFullYear()}`;}
function jFmtShort(s) {const d = jParse(s);return `${d.getDate()} ${J_MONTHS[d.getMonth()]}`;}
function jToday() {const d = new Date();const p = (n) => String(n).padStart(2, '0');return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;}

function jFields(pal) {
  return {
    line: pal.dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)',
    soft: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)'
  };
}
function jStripes(pal) {
  const a = pal.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const b = pal.dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)';
  return `repeating-linear-gradient(135deg, ${a}, ${a} 11px, ${b} 11px, ${b} 22px)`;
}

/* Rendu d'une photo (image réelle ou placeholder rayé + date). */
function PhotoView({ img, date, pal, rounded = 24, showLabel = true }) {
  if (img) {
    return <img src={img} alt={date ? jFmt(date) : 'photo'} style={{
      width: '100%', height: '100%', objectFit: 'cover', borderRadius: rounded, display: 'block'
    }} />;
  }
  return (
    <div style={{
      width: '100%', height: '100%', borderRadius: rounded, background: jStripes(pal),
      display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
    }}>
      {showLabel &&
      <div style={{
        font: '600 11px ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: 0.5,
        color: pal.muted, textTransform: 'uppercase', textAlign: 'center', padding: 8
      }}>selfie<br />{date ? jFmtShort(date) : ''}</div>}
    </div>);

}

/* Caméra live (mode capture) : flux getUserMedia + guides (grille des
   tiers, repère visage). 100% local — aucun réseau, seul un contexte
   sécurisé est requis (HTTPS/localhost, déjà exigé par la PWA). Repli
   sur le sélecteur de fichier si la caméra est indisponible (permission
   refusée, contexte non sécurisé, pas de caméra). */
function LiveCamera({ pal, videoRef, live, error, onPickFile }) {
  const { line, soft } = jFields(pal);
  const grid = pal.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)';
  const lineAt = () => ({ position: 'absolute', background: grid });
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden',
      background: jStripes(pal), border: `1px solid ${line}`
    }}>
      {/* flux caméra (miroir pour un aperçu selfie naturel + zoom ×2) */}
      <video ref={videoRef} autoPlay playsInline muted style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        transform: 'scaleX(-1) scale(2)', transformOrigin: 'center', display: live ? 'block' : 'none'
      }} />

      {/* grille des tiers */}
      <div style={{ ...lineAt(), left: '33.33%', top: 0, bottom: 0, width: 1 }} />
      <div style={{ ...lineAt(), left: '66.66%', top: 0, bottom: 0, width: 1 }} />
      <div style={{ ...lineAt(), top: '33.33%', left: 0, right: 0, height: 1 }} />
      <div style={{ ...lineAt(), top: '66.66%', left: 0, right: 0, height: 1 }} />
      {/* repère visage */}
      <div style={{
        position: 'absolute', left: '50%', top: '46%', transform: 'translate(-50%,-50%)',
        width: '56%', height: '70%', borderRadius: '50%',
        border: `2px dashed ${pal.dark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.30)'}`
      }} />

      {/* libellé (caméra active) */}
      {live &&
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 16, textAlign: 'center',
        font: '600 11px ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: 1,
        color: pal.muted, textTransform: 'uppercase'
      }}>Aperçu caméra</div>}

      {/* état : démarrage / indisponible (+ repli fichier) */}
      {!live &&
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center'
      }}>
        <SkareIcon name="camera" size={34} color={pal.muted} />
        <div style={{ font: '600 14px -apple-system, system-ui', color: pal.text, maxWidth: 240 }}>
          {error === 'denied' ? 'Accès à la caméra refusé' :
          error ? 'Caméra indisponible sur cet appareil' :
          'Démarrage de la caméra…'}
        </div>
        {error &&
        <button onClick={onPickFile} style={{
          height: 42, padding: '0 18px', borderRadius: 21, cursor: 'pointer',
          border: `1px solid ${line}`, background: soft, color: pal.text,
          font: '700 14px -apple-system, system-ui', WebkitTapHighlightColor: 'transparent'
        }}>Choisir une photo</button>}
      </div>}
    </div>);

}

/* ── Écran « Mon journal » ─────────────────────────────────── */
function JournalScreen({ pal, journal, setJournal, onClose }) {
  const { line, soft } = jFields(pal);
  const [mode, setMode] = useStateJ('capture'); // capture | review | gallery
  const [draft, setDraft] = useStateJ(null); // object URL en attente de validation
  const draftBlobRef = useRefJ(null);        // Blob/File original du brouillon
  const [selId, setSelId] = useStateJ(journal.length ? journal[journal.length - 1].id : null);
  const [pressed, setPressed] = useStateJ(false);
  const fileRef = useRefJ(null);
  const videoRef = useRefJ(null);
  const streamRef = useRefJ(null);
  const [camLive, setCamLive] = useStateJ(false);
  const [camError, setCamError] = useStateJ(null); // null | 'denied' | 'unavailable'

  const sorted = [...journal].sort((a, b) => a.date < b.date ? -1 : 1);
  const latest = sorted[sorted.length - 1];
  const sel = sorted.find((e) => e.id === selId) || latest;

  const openCamera = () => {if (fileRef.current) fileRef.current.click();};
  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    if (draft) URL.revokeObjectURL(draft); // brouillon précédent éventuel
    draftBlobRef.current = f;              // Blob conservé pour la persistance
    setDraft(URL.createObjectURL(f));      // aperçu sans base64
    setMode('review');
  };
  const validate = () => {
    const id = Date.now();
    const blob = draftBlobRef.current;
    // le brouillon (object URL) devient l'image affichée de l'entrée ;
    // `blob` est ré-écrit en base par le setter write-through.
    setJournal((prev) => [...prev, { id, date: jToday(), img: draft, blob }]);
    draftBlobRef.current = null;
    setDraft(null);setSelId(id);setMode('capture');
  };
  const reject = () => {
    if (draft) URL.revokeObjectURL(draft);
    draftBlobRef.current = null;setDraft(null);setMode('capture');
  };
  const remove = (id) => setJournal((prev) => {
    const target = prev.find((e) => e.id === id);
    if (target && target.img) URL.revokeObjectURL(target.img); // évite les fuites
    return prev.filter((e) => e.id !== id);
  });

  /* ── Caméra live (getUserMedia — local, fonctionne hors-ligne) ── */
  const stopCamera = () => {
    const s = streamRef.current;
    if (s) {s.getTracks().forEach((t) => t.stop());streamRef.current = null;}
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamLive(false);
  };
  /* La caméra ne tourne qu'en mode capture ; on l'arrête en review,
     en galerie et à la fermeture (démontage) pour libérer le capteur. */
  useEffectJ(() => {
    if (mode !== 'capture') {stopCamera();return undefined;}
    let cancelled = false;
    (async () => {
      setCamError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw { name: 'unsupported' };
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancelled) {stream.getTracks().forEach((t) => t.stop());return;}
        streamRef.current = stream;
        setCamLive(true);
        const v = videoRef.current;
        if (v) {v.srcObject = stream;const p = v.play && v.play();if (p && p.catch) p.catch(() => {});}
      } catch (e) {
        if (cancelled) return;
        stopCamera();
        setCamError(e && e.name === 'NotAllowedError' ? 'denied' : 'unavailable');
      }
    })();
    return () => {cancelled = true;stopCamera();};
  }, [mode]);

  /* Capture une image du flux → Blob (jpeg). Zoom ×2 (recadrage centré
     50 %) + miroir horizontal, pour coller exactement à l'aperçu.
     Repli fichier si pas de flux exploitable. */
  const takePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) {openCamera();return;}
    const w = v.videoWidth, h = v.videoHeight;
    const sw = w / 2, sh = h / 2, sx = w / 4, sy = h / 4; // zone centrale (zoom ×2)
    const canvas = document.createElement('canvas');
    canvas.width = sw;canvas.height = sh;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width, 0);ctx.scale(-1, 1); // miroir
    ctx.drawImage(v, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) {openCamera();return;}
      if (draft) URL.revokeObjectURL(draft);
      draftBlobRef.current = blob;
      setDraft(URL.createObjectURL(blob));
      setMode('review');
    }, 'image/jpeg', 0.92);
  };

  /* ── boutons ronds ── */
  const roundBtn = (icon, label, onClick, opts = {}) =>
  <button onClick={onClick} aria-label={label} style={{
    width: opts.size || 64, height: opts.size || 64, borderRadius: 999, cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: opts.bg || soft, border: opts.border || `1px solid ${line}`,
    boxShadow: opts.shadow || 'none', WebkitTapHighlightColor: 'transparent', transition: 'transform .12s'
  }}><SkareIcon name={icon} size={opts.icon || 26} color={opts.color || pal.text} /></button>;

  /* ── barre du bas selon le mode ── */
  let bottomBar;
  if (mode === 'review') {
    bottomBar =
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: 6 }}>
          {roundBtn('close', 'Refuser', reject, { size: 66, icon: 28, color: 'oklch(0.64 0.17 25)', border: `1.5px solid oklch(0.64 0.17 25 / 0.5)`, bg: 'oklch(0.64 0.17 25 / 0.12)' })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {roundBtn('check', 'Valider', validate, { size: 78, icon: 34, color: pal.accentInk, bg: pal.accent, border: `1px solid ${pal.accent}`, shadow: `0 10px 26px ${pal.dark ? 'rgba(0,0,0,0.45)' : 'rgba(180,90,50,0.35)'}` })}
        </div>
        <div />
      </div>;

  } else if (mode === 'gallery') {
    bottomBar =
    <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={() => setMode('capture')} style={{
        height: 58, padding: '0 26px', borderRadius: 29, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 10, border: 'none',
        font: '700 16px -apple-system, system-ui', color: pal.accentInk, background: pal.accent,
        boxShadow: `0 10px 26px ${pal.dark ? 'rgba(0,0,0,0.45)' : 'rgba(180,90,50,0.35)'}`, WebkitTapHighlightColor: 'transparent'
      }}><SkareIcon name="camera" size={22} color={pal.accentInk} />Reprendre une photo</button>
      </div>;

  } else {// capture
    bottomBar =
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        {/* galerie (bas gauche) */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: 6 }}>
          <div style={{ position: 'relative', width: 58, height: 58, flexShrink: 0 }}>
            <button onClick={() => journal.length && setMode('gallery')} aria-label="Galerie" disabled={!journal.length} style={{
            width: 58, height: 58, borderRadius: 16, padding: 0, overflow: 'hidden', cursor: journal.length ? 'pointer' : 'default',
            border: `2px solid ${pal.dark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)'}`, display: 'block',
            background: soft, opacity: journal.length ? 1 : 0.4, WebkitTapHighlightColor: 'transparent'
          }}>
              {latest ? <PhotoView img={latest.img} date={latest.date} pal={pal} rounded={0} showLabel={false} /> :
            <SkareIcon name="camera" size={22} color={pal.muted} />}
            </button>
            {journal.length > 0 &&
          <span style={{
            position: 'absolute', right: -6, top: -6, minWidth: 22, height: 22, padding: '0 5px', borderRadius: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2,
            font: '800 12px -apple-system, system-ui', color: pal.accentInk, background: pal.accent, border: `2px solid ${pal.bgBot}`
          }}>{journal.length}</span>}
          </div>
        </div>
        {/* déclencheur (centre) */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => (camLive ? takePhoto() : openCamera())} onPointerDown={() => setPressed(true)} onPointerUp={() => setPressed(false)} onPointerLeave={() => setPressed(false)}
        aria-label="Prendre une photo" style={{
          width: 78, height: 78, borderRadius: 999, cursor: 'pointer', padding: 0,
          border: `4px solid ${pal.dark ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.95)'}`,
          background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: pressed ? 'scale(0.92)' : 'scale(1)', transition: 'transform .12s', WebkitTapHighlightColor: 'transparent'
        }}>
            <span style={{ width: 60, height: 60, borderRadius: 999, background: pal.dark ? '#fff' : '#fff', boxShadow: `inset 0 0 0 2px ${pal.bgBot}` }} />
          </button>
        </div>
        <div />
      </div>;

  }

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column',
      background: `linear-gradient(170deg, ${pal.bgTop}, ${pal.bgBot})`, color: pal.text,
      fontFamily: '-apple-system, system-ui, sans-serif'
    }}>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: 'none' }} />

      {/* top bar */}
      <div style={{ padding: '60px 18px 8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} aria-label="Fermer" style={{
          width: 46, height: 46, borderRadius: 23, border: `1px solid ${line}`, background: soft, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent'
        }}><SkareIcon name="close" size={22} color={pal.text} /></button>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, font: '800 24px -apple-system, system-ui', letterSpacing: -0.5, color: pal.text }}>Mon journal</h2>
          <div style={{ font: '600 13px -apple-system, system-ui', color: pal.muted, marginTop: 1 }}>
            {mode === 'review' ? 'Valider ou reprendre la photo' :
            journal.length ? `${journal.length} photo${journal.length > 1 ? 's' : ''} · depuis le ${jFmtShort(sorted[0].date)}` :
            'Prends ton premier selfie du matin'}
          </div>
        </div>
      </div>

      {/* zone centrale */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', padding: '12px 18px 150px', display: 'flex', flexDirection: 'column' }}>
        {mode === 'gallery' ?
        <>
            {/* grande vue */}
            <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
              {sel ?
            <>
                  <PhotoView img={sel.img} date={sel.date} pal={pal} rounded={26} />
                  <div style={{
                position: 'absolute', left: 14, top: 14, padding: '8px 14px', borderRadius: 16,
                font: '700 14px -apple-system, system-ui', color: '#fff',
                background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'
              }}>{jFmt(sel.date)}</div>
                  <button onClick={() => {const id = sel.id;const rest = sorted.filter((e) => e.id !== id);remove(id);setSelId(rest.length ? rest[rest.length - 1].id : null);if (!rest.length) setMode('capture');}}
              aria-label="Supprimer la photo" style={{
                position: 'absolute', right: 12, top: 12, width: 42, height: 42, borderRadius: 21, cursor: 'pointer', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'
              }}><SkareIcon name="trash" size={20} color="#fff" /></button>
                </> : null}
            </div>
            {/* pellicule */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 2px 2px', margin: '0 -2px', flexShrink: 0 }}>
              {sorted.map((e) =>
            <button key={e.id} onClick={() => setSelId(e.id)} style={{
              width: 56, height: 72, borderRadius: 12, flexShrink: 0, padding: 0, overflow: 'hidden', cursor: 'pointer',
              border: `2px solid ${e.id === sel.id ? pal.accent : 'transparent'}`, background: soft, WebkitTapHighlightColor: 'transparent'
            }}><PhotoView img={e.img} date={e.date} pal={pal} rounded={0} showLabel={false} /></button>
            )}
            </div>
          </> :
        <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {mode === 'review' ?
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <PhotoView img={draft} date={jToday()} pal={pal} rounded={28} />
                <div style={{
              position: 'absolute', left: 14, top: 14, padding: '8px 14px', borderRadius: 16,
              font: '700 14px -apple-system, system-ui', color: '#fff',
              background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'
            }}>{jFmt(jToday())}</div>
              </div> :
          <LiveCamera pal={pal} videoRef={videoRef} live={camLive} error={camError} onPickFile={openCamera} />}
          </div>}
      </div>

      {/* barre de contrôle */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 22px 30px', background: `linear-gradient(to top, ${pal.bgBot} 55%, transparent)` }}>
        {bottomBar}
      </div>
    </div>);

}

Object.assign(window, { JournalScreen });