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

/* Choisit la photo passée à comparer à `selDate` selon l'intervalle :
   'start' = la toute première ; '6m'/'3m'/'1m' = la plus proche de
   (date courante − N mois). `older` = photos antérieures, triées croissant. */
function jPickCompare(older, selDate, range) {
  if (!older || !older.length) return null;
  if (range === 'start') return older[0];
  const months = range === '6m' ? 6 : range === '3m' ? 3 : 1;
  const t = jParse(selDate); t.setMonth(t.getMonth() - months);
  const tms = t.getTime();
  let best = older[0], bd = Infinity;
  older.forEach((e) => { const d = Math.abs(jParse(e.date).getTime() - tms); if (d < bd) { bd = d; best = e; } });
  return best;
}

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
function LiveCamera({ pal, videoRef, live, error, nativeZoom, onPickFile }) {
  const { line, soft } = jFields(pal);
  const grid = pal.dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.5)';
  const lineAt = () => ({ position: 'absolute', background: grid });
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%', borderRadius: 28, overflow: 'hidden',
      background: jStripes(pal), border: `1px solid ${line}`
    }}>
      {/* flux caméra (miroir selfie). Zoom natif → pas de scale CSS ;
          sinon zoom ×2 logiciel via transform (aligné sur la capture). */}
      <video ref={videoRef} autoPlay playsInline muted style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        transform: nativeZoom ? 'scaleX(-1)' : 'scaleX(-1) scale(2)', transformOrigin: 'center',
        display: live ? 'block' : 'none'
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

/* ── Grande vue de la galerie + comparateur « versus » avant/après ──
   Photo passée en fond, photo actuelle au-dessus clippée à gauche de la
   barre. On saisit la barre blanche (à droite) et on la glisse vers la
   gauche pour révéler dynamiquement l'avant/après. Le sélecteur en haut
   à droite choisit la photo de comparaison. */
function VersusBigView({ pal, current, older, onDelete }) {
  const wrapRef = useRefJ(null);
  const [range, setRange] = useStateJ('start');
  const [pos, setPos] = useStateJ(1);          // 1 = barre à droite (= photo actuelle plein cadre)
  const [dragging, setDragging] = useStateJ(false);

  const compare = jPickCompare(older, current.date, range);
  // On repart de la droite quand on change de photo ou d'intervalle.
  useEffectJ(() => { setPos(1); }, [current.id, range]);

  const chip = {
    position: 'absolute', padding: '7px 12px', borderRadius: 14, font: '700 13px -apple-system, system-ui',
    color: '#fff', background: 'rgba(0,0,0,0.46)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    pointerEvents: 'none', whiteSpace: 'nowrap',
  };
  const delBtn = (
    <button onClick={onDelete} aria-label="Supprimer la photo" style={{
      position: 'absolute', right: 12, bottom: 12, width: 42, height: 42, borderRadius: 21, cursor: 'pointer', border: 'none', zIndex: 6,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.46)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'
    }}><SkareIcon name="trash" size={20} color="#fff" /></button>
  );

  // Pas de photo plus ancienne → vue simple (ni barre ni sélecteur).
  if (!compare) {
    return (
      <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 26, overflow: 'hidden' }}>
        <PhotoView img={current.img} date={current.date} pal={pal} rounded={0} />
        <div style={{ ...chip, left: 14, top: 14 }}>{jFmt(current.date)}</div>
        {delBtn}
      </div>
    );
  }

  const setFromClientX = (clientX) => {
    const el = wrapRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const p = (clientX - r.left) / r.width;
    setPos(Math.max(0, Math.min(1, p)));
  };
  const startDrag = (e) => {
    e.preventDefault(); setDragging(true); setFromClientX(e.clientX);
    const move = (ev) => { ev.preventDefault(); setFromClientX(ev.clientX); };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const idle = !dragging && pos > 0.985; // anime la barre pour inviter à la saisir
  const ranges = [['6m', '6 mois'], ['3m', '3 mois'], ['1m', '1 mois'], ['start', 'début']];

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 26, overflow: 'hidden', userSelect: 'none' }}>
      {/* fond : photo passée */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <PhotoView img={compare.img} date={compare.date} pal={pal} rounded={0} />
      </div>
      {/* dessus : photo actuelle, clippée à gauche de la barre */}
      <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 ${(1 - pos) * 100}% 0 0)`, WebkitClipPath: `inset(0 ${(1 - pos) * 100}% 0 0)` }}>
        <PhotoView img={current.img} date={current.date} pal={pal} rounded={0} />
      </div>

      {/* étiquettes de date */}
      <div style={{ ...chip, left: 14, top: 14 }}>{jFmt(current.date)}</div>
      <div style={{ ...chip, left: 14, bottom: 14, opacity: pos < 0.98 ? 1 : 0, transition: 'opacity .2s' }}>
        Avant · {jFmtShort(compare.date)}
      </div>

      {/* sélecteur VS (haut droite) */}
      <div style={{
        position: 'absolute', right: 12, top: 12, zIndex: 6, display: 'flex', alignItems: 'center', gap: 4,
        padding: 4, borderRadius: 14, background: 'rgba(0,0,0,0.46)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)'
      }}>
        <span style={{ font: '800 11px -apple-system, system-ui', letterSpacing: 0.5, color: 'rgba(255,255,255,0.7)', padding: '0 3px' }}>VS</span>
        {ranges.map(([k, lbl]) =>
          <button key={k} onClick={() => setRange(k)} style={{
            height: 28, padding: '0 9px', borderRadius: 10, border: 'none', cursor: 'pointer',
            font: '700 12px -apple-system, system-ui', WebkitTapHighlightColor: 'transparent',
            color: range === k ? pal.accentInk : '#fff',
            background: range === k ? pal.accent : 'transparent'
          }}>{lbl}</button>
        )}
      </div>

      {/* barre versus */}
      <div className={idle ? 'skare-vs-nudge' : undefined} style={{
        position: 'absolute', top: 0, bottom: 0, left: `${pos * 100}%`, width: 0, zIndex: 5,
        transition: dragging ? 'none' : 'left .25s ease'
      }}>
        {/* zone de saisie large (invisible) */}
        <div onPointerDown={startDrag} style={{ position: 'absolute', top: 0, bottom: 0, left: -20, width: 40, cursor: 'ew-resize', touchAction: 'none' }} />
        {/* ligne lumineuse */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: -1.5, width: 3, background: 'rgba(255,255,255,0.96)', boxShadow: '0 0 10px rgba(255,255,255,0.85), 0 0 2px rgba(0,0,0,0.35)', pointerEvents: 'none' }} />
        {/* poignée */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, transform: 'translate(-50%,-50%)', width: 38, height: 38, borderRadius: 19,
          background: 'rgba(255,255,255,0.96)', boxShadow: '0 0 12px rgba(255,255,255,0.7), 0 2px 8px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={pal.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 7 5.5 12l4 5" /><path d="M14.5 7l4 5-4 5" />
          </svg>
        </div>
      </div>

      {delBtn}
    </div>
  );
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
  const [nativeZoom, setNativeZoom] = useStateJ(false); // zoom ×2 fait par le capteur (sinon recadrage logiciel)

  // tri chronologique : date puis id (= timestamp de capture) pour départager
  // plusieurs photos prises le même jour.
  const sorted = [...journal].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id);
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
    setNativeZoom(false);
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
        const v = videoRef.current;
        if (v) {v.srcObject = stream;const p = v.play && v.play();if (p && p.catch) p.catch(() => {});}

        /* Zoom ×2 NATIF (capteur) si le hardware/navigateur le supporte
           → pleine qualité, pas de recadrage. Pris en charge par Chrome
           Android (MediaStreamTrack zoom) ; iOS/Safari ne l'expose pas
           encore → on retombe sur le recadrage logiciel ×2.
           On détermine le zoom AVANT d'afficher le flux pour éviter le
           saut visuel (« tilt ») entre l'état de repli ×2 et le natif. */
        let native = false;
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track && track.getCapabilities ? track.getCapabilities() : null;
          if (caps && caps.zoom && (caps.zoom.max || 1) >= 2) {
            await track.applyConstraints({ advanced: [{ zoom: Math.min(2, caps.zoom.max) }] });
            native = true;
          }
        } catch (zoomErr) {native = false;/* pas de zoom natif → recadrage logiciel */}
        if (cancelled) return;
        setNativeZoom(native);
        setCamLive(true); // on révèle le flux une fois le zoom fixé
      } catch (e) {
        if (cancelled) return;
        stopCamera();
        setCamError(e && e.name === 'NotAllowedError' ? 'denied' : 'unavailable');
      }
    })();
    return () => {cancelled = true;stopCamera();};
  }, [mode]);

  /* Capture une image du flux → Blob (jpeg) + miroir horizontal.
     - Zoom natif (capteur) : on capture la trame entière en pleine
       résolution (déjà zoomée par le hardware, aucune perte).
     - Sinon : recadrage logiciel centré 50 % (zoom ×2 de repli).
     Repli fichier si pas de flux exploitable. */
  const takePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) {openCamera();return;}
    const w = v.videoWidth, h = v.videoHeight;
    const sw = nativeZoom ? w : w / 2, sh = nativeZoom ? h : h / 2;
    const sx = nativeZoom ? 0 : w / 4, sy = nativeZoom ? 0 : h / 4;
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
      <style>{`@keyframes skareVsNudge{0%,100%{transform:translateX(0)}50%{transform:translateX(-9px)}}.skare-vs-nudge{animation:skareVsNudge 1.5s ease-in-out infinite}`}</style>
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
            {/* grande vue + comparateur versus */}
            <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
              {sel ?
              <VersusBigView pal={pal} current={sel} older={sorted.filter((e) => e.date < sel.date || (e.date === sel.date && e.id < sel.id))}
                onDelete={() => {const id = sel.id;const rest = sorted.filter((e) => e.id !== id);remove(id);setSelId(rest.length ? rest[rest.length - 1].id : null);if (!rest.length) setMode('capture');}} /> : null}
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
          <LiveCamera pal={pal} videoRef={videoRef} live={camLive} error={camError} nativeZoom={nativeZoom} onPickFile={openCamera} />}
          </div>}
      </div>

      {/* barre de contrôle */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 22px 30px', background: `linear-gradient(to top, ${pal.bgBot} 55%, transparent)` }}>
        {bottomBar}
      </div>
    </div>);

}

Object.assign(window, { JournalScreen });