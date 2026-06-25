/* SKARE — Écran « Mes produits ».
   Recherche/ajout depuis le catalogue, date d'ouverture (calendrier),
   calcul de péremption (PAO), renouvellement (compteur) et suppression. */
const { useState: useStateP, useEffect: useEffectP } = React;

const PROD_CFG = { intensity: 'moyen', contrast: 'doux', radius: 22 };

const SK_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const SK_MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const SK_WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/* ── Couleurs de champs (local — propre à cet écran) ───────── */
function pFields(pal) {
  return {
    fieldBg: pal.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
    line: pal.dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)',
    soft: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)',
  };
}

/* ── Vignette produit ──────────────────────────────────────────
   En ligne + image disponible → photo du produit (layout un peu plus
   grand). Hors-ligne, sans image, ou erreur de chargement → repli sur
   l'icône (format « slim », même boîte que l'ancien rendu).

   Optimisations anti-jank (images = JPEG distants ~plusieurs centaines de Ko) :
   - `decoding="async"` : le décodage sort du thread principal → plus de
     blocage du scroll / de l'animation d'ouverture quand les images arrivent.
   - `fetchpriority="low"` : les vignettes ne saturent pas le réseau pendant
     le rendu initial.
   - icône de repli affichée EN FOND tant que l'image n'est pas décodée →
     pas de flash blanc, pas de saut de layout.
   - image en position absolue dans une boîte à taille fixe + fondu au load →
     zéro reflow pendant le chargement, apparition douce. */
/* Variante miniature plus légère du CDN YesStyle :
   .../M_p0212227403.jpg → .../S_p0212227403.jpg (≈3–4× plus petit).
   Ne touche que le préfixe du nom de fichier ; laisse intactes les URLs
   d'un autre format (produits perso, etc.). */
function skThumbSrc(url) {
  return typeof url === 'string' ? url.replace(/\/M_([^/]+)$/, '/S_$1') : url;
}

function ProductThumb({ prod, pal, iconSize = 52, imgSize = 60, glyph = 27, radius = 16 }) {
  const { line } = pFields(pal);
  const [status, setStatus] = useStateP('load'); // 'load' | 'ok' | 'err'
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const src = prod && skThumbSrc(prod.image);
  const showImg = online && src && status !== 'err';
  const fallback = <SkareIcon name={(prod && prod.icon) || 'potion'} size={glyph} color={pal.accent} />;

  const box = {
    position: 'relative', overflow: 'hidden', flexShrink: 0,
    width: showImg ? imgSize : iconSize, height: showImg ? imgSize : iconSize,
    borderRadius: radius, border: `1px solid ${line}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.6)'
  };

  if (!showImg) return <div style={box}>{fallback}</div>;
  return (
    <div style={box}>
      {status !== 'ok' && fallback}
      <img src={src} alt="" loading="lazy" decoding="async" fetchpriority="low"
        onLoad={() => setStatus('ok')} onError={() => setStatus('err')} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        background: pal.dark ? 'rgba(255,255,255,0.06)' : '#fff',
        opacity: status === 'ok' ? 1 : 0, transition: 'opacity .25s ease'
      }} />
    </div>
  );
}

/* Nom (marque + nom) : passe à la ligne, plafonné à 2 lignes (jamais inline,
   jamais plus de 2 lignes). `brand` rendu en accent pour relier visuellement
   marque et nom (la recherche les traite comme un tout). */
function ProductName({ pal, brand, name, size = 16 }) {
  return (
    <div style={{
      font: `700 ${size}px -apple-system, system-ui`, color: pal.text, lineHeight: 1.25,
      display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
      overflow: 'hidden', overflowWrap: 'anywhere'
    }}>
      {brand ? <span style={{ color: pal.accent, fontWeight: 800 }}>{brand} </span> : null}
      <span>{name}</span>
    </div>
  );
}

/* ── Dates ─────────────────────────────────────────────────── */
function skToYMD(d) { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function skTodayYMD() { return skToYMD(new Date()); }
function skParseYMD(s) { const a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); }
function skFmtDate(s) { const d = skParseYMD(s); return `${d.getDate()} ${SK_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`; }
function skMidnight(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }

/* Info de péremption à partir de la date d'ouverture + PAO (mois).
   Le calcul (exp/days) vient de skareExpiry (skare-data.js) ; on n'ajoute
   ici que le libellé et le ton d'affichage propres à cet écran. */
function skExpiry(openedAt, pao) {
  const info = skareExpiry(openedAt, pao);
  if (!info) return null;
  const { exp, days } = info;
  let label, tone;
  if (days < 0) {
    const a = Math.abs(days);
    label = a >= 30 ? `Périmé depuis ${Math.round(a / 30)} mois` : 'Périmé';
    tone = 'danger';
  } else if (days <= 31) {
    label = days <= 1 ? `Périme aujourd'hui` : `Périme dans ${days} j`;
    tone = 'warn';
  } else {
    const m = Math.round(days / 30.4);
    label = `Périme dans ${m} mois`;
    tone = 'ok';
  }
  return { exp, days, label, tone };
}
function skTone(tone, pal) {
  if (tone === 'danger') return { fg: 'oklch(0.64 0.17 25)', bg: 'oklch(0.64 0.17 25 / 0.15)' };
  if (tone === 'warn') return { fg: pal.dark ? 'oklch(0.82 0.13 75)' : 'oklch(0.62 0.13 68)', bg: 'oklch(0.72 0.13 70 / 0.16)' };
  return { fg: pal.muted, bg: pal.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' };
}

/* ── Calendrier (bottom-sheet) ─────────────────────────────── */
function DateSheet({ pal, value, onPick, onClose }) {
  const { line, soft, fieldBg } = pFields(pal);
  const [shown, setShown] = useStateP(false);
  const init = value ? skParseYMD(value) : new Date();
  const [view, setView] = useStateP(new Date(init.getFullYear(), init.getMonth(), 1));
  useEffectP(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  const close = () => { setShown(false); setTimeout(onClose, 230); };

  const today = skMidnight(new Date());
  const y = view.getFullYear(), m = view.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const firstIdx = (new Date(y, m, 1).getDay() + 6) % 7; // lundi en premier
  const cells = [];
  for (let i = 0; i < firstIdx; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // bornes : pas de navigation au-delà du mois courant (ouverture future impossible)
  const canNext = (y < today.getFullYear()) || (y === today.getFullYear() && m < today.getMonth());
  const panelBg = pal.dark ? 'rgba(26,30,56,0.97)' : 'rgba(255,251,248,0.98)';

  const nav = (dir, enabled) =>
    <button onClick={enabled ? () => setView(new Date(y, m + dir, 1)) : undefined} disabled={!enabled} aria-label={dir < 0 ? 'Mois précédent' : 'Mois suivant'} style={{
      width: 38, height: 38, borderRadius: 19, border: `1px solid ${line}`, background: soft,
      cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 1 : 0.3, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent'
    }}>
      <span style={{ transform: dir < 0 ? 'rotate(180deg)' : 'none', display: 'flex' }}>
        <SkareIcon name="chevron" size={18} color={pal.text} />
      </span>
    </button>;

  return (
    <div onClick={close} style={{
      position: 'absolute', inset: 0, zIndex: 110, pointerEvents: shown ? 'auto' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      background: shown ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)', transition: 'background .25s',
      WebkitBackdropFilter: shown ? 'blur(2px)' : 'none', backdropFilter: shown ? 'blur(2px)' : 'none'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: panelBg, borderRadius: '26px 26px 0 0', borderTop: `1px solid ${line}`,
        backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: `0 -18px 50px ${pal.dark ? 'rgba(0,0,0,0.5)' : 'rgba(120,70,40,0.22)'}`,
        padding: '10px 18px max(22px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column',
        transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: 'transform .3s cubic-bezier(.2,.85,.3,1)'
      }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: line, margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, font: '800 21px -apple-system, system-ui', letterSpacing: -0.4, color: pal.text }}>Date d'ouverture</h3>
          <button onClick={close} aria-label="Fermer" style={{
            marginLeft: 'auto', width: 34, height: 34, borderRadius: 17, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)'
          }}><SkareIcon name="close" size={18} color={pal.text} /></button>
        </div>

        {/* navigation mois */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {nav(-1, true)}
          <div style={{ flex: 1, textAlign: 'center', font: '700 17px -apple-system, system-ui', color: pal.text }}>
            {SK_MONTHS[m].charAt(0).toUpperCase() + SK_MONTHS[m].slice(1)} {y}
          </div>
          {nav(1, canNext)}
        </div>

        {/* jours de semaine */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {SK_WEEKDAYS.map((w, i) =>
            <div key={i} style={{ textAlign: 'center', font: '700 11px -apple-system, system-ui', color: pal.muted, padding: '4px 0' }}>{w}</div>
          )}
        </div>

        {/* grille des jours */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={'e' + i} />;
            const dateYMD = skToYMD(new Date(y, m, d));
            const future = skMidnight(new Date(y, m, d)) > today;
            const sel = dateYMD === value;
            const isToday = dateYMD === skTodayYMD();
            return (
              <button key={d} onClick={future ? undefined : () => { onPick(dateYMD); close(); }} disabled={future} style={{
                height: 42, borderRadius: 12, cursor: future ? 'default' : 'pointer', border: 'none',
                font: `${sel ? 700 : 600} 15px -apple-system, system-ui`, WebkitTapHighlightColor: 'transparent',
                color: future ? pal.muted : sel ? pal.accentInk : pal.text,
                opacity: future ? 0.3 : 1,
                background: sel ? pal.accent : isToday ? (pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)') : 'transparent'
              }}>{d}</button>
            );
          })}
        </div>

        {/* aujourd'hui */}
        <button onClick={() => { onPick(skTodayYMD()); close(); }} style={{
          marginTop: 14, height: 48, borderRadius: 16, border: `1px solid ${line}`, background: soft, cursor: 'pointer',
          font: '700 15px -apple-system, system-ui', color: pal.text, WebkitTapHighlightColor: 'transparent'
        }}>Ouvert aujourd'hui</button>
      </div>
    </div>
  );
}

/* ── Sheet d'ajout (recherche catalogue + création produit perso) ─ */
const SK_NEW_ICONS = ['water', 'drop', 'cream', 'balm', 'sun', 'moon', 'potion'];

function AddProductSheet({ pal, ownedIds, onAdd, onDeleteProduct, onProductsChanged, onClose }) {
  const { line, fieldBg, soft } = pFields(pal);
  const [shown, setShown] = useStateP(false);
  const [q, setQ] = useStateP('');
  const [tab, setTab] = useStateP('db');       // 'db' (catalogue scrapé) | 'mine' (saisies)
  const [creating, setCreating] = useStateP(false);
  const [editingId, setEditingId] = useStateP(null);
  // formulaire « nouveau produit »
  const [fBrand, setFBrand] = useStateP('');
  const [fName, setFName] = useStateP('');
  const [fNote, setFNote] = useStateP('');
  const [fActives, setFActives] = useStateP([]);
  const [fActiveInput, setFActiveInput] = useStateP('');
  const [fPao, setFPao] = useStateP(12);
  const [fIcon, setFIcon] = useStateP('drop');
  useEffectP(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  const close = () => { setShown(false); setTimeout(onClose, 230); };

  const qn = q.trim().toLowerCase();
  // Recherche combinée marque + nom (+ description) : chaque mot tapé doit
  // figurer quelque part dans « marque nom note » → « celimax retinal »
  // retrouve la marque ET un fragment du nom, traités comme un seul ensemble.
  const tokens = qn.split(/\s+/).filter(Boolean);
  const matches = (p) => {
    if (!tokens.length) return true;
    const hay = `${p.brand || ''} ${p.name || ''} ${p.note || ''}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  };
  const isCustom = (p) => SkareDB.isCustomProduct(p);
  // Plafond de rendu : le catalogue scrapé peut faire des dizaines de
  // milliers d'entrées (~26 Mo) → on ne rend jamais plus de CAP lignes.
  const CAP = 60;
  const dbAll = SKARE_PRODUCTS.filter((p) => !isCustom(p) && !ownedIds.has(p.id) && matches(p));
  const dbList = dbAll.slice(0, CAP);
  const mineList = SKARE_PRODUCTS.filter((p) => isCustom(p) && matches(p));
  const panelBg = pal.dark ? 'rgba(26,30,56,0.97)' : 'rgba(255,251,248,0.98)';

  const inp = { width: '100%', boxSizing: 'border-box', height: 46, padding: '0 14px', borderRadius: 14, border: `1.5px solid ${line}`, background: fieldBg, color: pal.text, font: '600 15px -apple-system, system-ui', outline: 'none' };
  const lbl = { display: 'block', font: '700 11px -apple-system, system-ui', letterSpacing: 1, textTransform: 'uppercase', color: pal.muted, marginBottom: 7 };
  const stepperBtn = { width: 40, height: 40, borderRadius: 12, border: `1px solid ${line}`, background: soft, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', flexShrink: 0 };

  const addActive = () => { const v = fActiveInput.trim(); if (v) { setFActives((a) => [...a, v]); setFActiveInput(''); } };
  const canCreate = fName.trim().length > 0;
  const resetForm = () => { setFBrand(''); setFName(''); setFNote(''); setFActives([]); setFActiveInput(''); setFPao(12); setFIcon('drop'); };
  const startCreate = () => { setEditingId(null); resetForm(); setCreating(true); };
  const startEdit = (p) => {
    setEditingId(p.id); setFBrand(p.brand || ''); setFName(p.name || ''); setFNote(p.note || '');
    setFActives(Array.isArray(p.actives) ? p.actives.slice() : []); setFActiveInput(''); setFPao(p.pao || 12); setFIcon(p.icon || 'drop'); setCreating(true);
  };
  const exitForm = () => { setCreating(false); setEditingId(null); };
  const saveProduct = () => {
    if (!canCreate) return;
    const base = { brand: fBrand.trim(), name: fName.trim(), note: fNote.trim(), icon: fIcon, pao: Number(fPao) || 12, actives: fActives, custom: true };
    if (editingId) {
      Promise.resolve(SkareDB.updateProduct({ id: editingId, ...base })).finally(() => { if (onProductsChanged) onProductsChanged(); exitForm(); });
    } else {
      const id = Date.now();
      Promise.resolve(SkareDB.addProduct({ id, ...base })).finally(() => { if (onProductsChanged) onProductsChanged(); onAdd(id); close(); });
    }
  };
  const deleteProduct = (id) => { Promise.resolve(onDeleteProduct ? onDeleteProduct(id) : SkareDB.removeProduct(id)).finally(() => { if (onProductsChanged) onProductsChanged(); }); };

  return (
    <div onClick={close} style={{
      position: 'absolute', inset: 0, zIndex: 110, pointerEvents: shown ? 'auto' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      background: shown ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)', transition: 'background .25s',
      WebkitBackdropFilter: shown ? 'blur(2px)' : 'none', backdropFilter: shown ? 'blur(2px)' : 'none'
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: panelBg, borderRadius: '26px 26px 0 0', borderTop: `1px solid ${line}`,
        backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        boxShadow: `0 -18px 50px ${pal.dark ? 'rgba(0,0,0,0.5)' : 'rgba(120,70,40,0.22)'}`,
        padding: '10px 18px max(22px, env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column',
        height: '74%', transform: shown ? 'translateY(0)' : 'translateY(100%)', transition: 'transform .3s cubic-bezier(.2,.85,.3,1)'
      }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: line, margin: '0 auto 12px', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14, flexShrink: 0 }}>
          {creating &&
          <button onClick={exitForm} aria-label="Retour" style={{
            width: 34, height: 34, borderRadius: 17, border: 'none', cursor: 'pointer', marginRight: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)'
          }}><span style={{ transform: 'rotate(180deg)', display: 'flex' }}><SkareIcon name="chevron" size={18} color={pal.text} /></span></button>}
          <h3 style={{ margin: 0, font: '800 21px -apple-system, system-ui', letterSpacing: -0.4, color: pal.text }}>{creating ? (editingId ? 'Modifier le produit' : 'Nouveau produit') : 'Ajouter un produit'}</h3>
          <button onClick={close} aria-label="Fermer" style={{
            marginLeft: 'auto', width: 34, height: 34, borderRadius: 17, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)'
          }}><SkareIcon name="close" size={18} color={pal.text} /></button>
        </div>

        {creating ?
        <>
          {/* ── Formulaire de création d'un produit personnalisé ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', flex: 1, minHeight: 0, paddingBottom: 4 }}>
            <div>
              <span style={lbl}>Marque</span>
              <input value={fBrand} onChange={(e) => setFBrand(e.target.value)} placeholder="Ex. celimax" style={inp} />
            </div>
            <div>
              <span style={lbl}>Nom</span>
              <input value={fName} onChange={(e) => setFName(e.target.value)} placeholder="Nom du produit" style={inp} />
            </div>
            <div>
              <span style={lbl}>Description</span>
              <input value={fNote} onChange={(e) => setFNote(e.target.value)} placeholder="Ex. Sérum apaisant sans parfum" style={inp} />
            </div>
            <div>
              <span style={lbl}>Actifs</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={fActiveInput} onChange={(e) => setFActiveInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addActive(); } }}
                placeholder="Ajouter un actif…" style={{ ...inp, flex: 1 }} />
                <button onClick={addActive} aria-label="Ajouter l'actif" style={{
                  width: 46, height: 46, flexShrink: 0, borderRadius: 14, border: `1px solid ${line}`, background: soft, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent'
                }}><SkareIcon name="plus" size={18} color={pal.text} /></button>
              </div>
              {fActives.length > 0 &&
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 9 }}>
                {fActives.map((a, i) =>
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 5px 0 12px',
                  borderRadius: 16, font: '600 13px -apple-system, system-ui', color: pal.text, background: soft, border: `1px solid ${line}`
                }}>{a}
                  <button onClick={() => setFActives((arr) => arr.filter((_, j) => j !== i))} aria-label="Retirer" style={{
                    width: 22, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: pal.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'
                  }}><SkareIcon name="close" size={12} color={pal.muted} /></button>
                </span>
                )}
              </div>}
            </div>
            <div>
              <span style={lbl}>Validité après ouverture</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => setFPao((p) => Math.max(1, (Number(p) || 1) - 1))} aria-label="Réduire" style={stepperBtn}><SkareIcon name="minus" size={18} color={pal.text} /></button>
                <span style={{ font: '800 16px -apple-system, system-ui', color: pal.text, minWidth: 74, textAlign: 'center' }}>{fPao} mois</span>
                <button onClick={() => setFPao((p) => Math.min(60, (Number(p) || 0) + 1))} aria-label="Augmenter" style={stepperBtn}><SkareIcon name="plus" size={18} color={pal.text} /></button>
              </div>
            </div>
            <div>
              <span style={lbl}>Icône</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {SK_NEW_ICONS.map((ic) =>
                <button key={ic} onClick={() => setFIcon(ic)} aria-label={ic} style={{
                  width: 44, height: 44, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: ic === fIcon ? pal.accent : (pal.dark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'),
                  border: `1px solid ${ic === fIcon ? pal.accent : line}`, WebkitTapHighlightColor: 'transparent'
                }}><SkareIcon name={ic} size={22} color={ic === fIcon ? pal.accentInk : pal.text} /></button>
                )}
              </div>
            </div>
          </div>
          <button onClick={saveProduct} disabled={!canCreate} style={{
            flexShrink: 0, marginTop: 12, width: '100%', height: 56, borderRadius: 28, border: 'none',
            cursor: canCreate ? 'pointer' : 'default', opacity: canCreate ? 1 : 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            font: '700 17px -apple-system, system-ui', color: pal.accentInk, background: pal.accent, WebkitTapHighlightColor: 'transparent'
          }}><SkareIcon name="check" size={20} color={pal.accentInk} />{editingId ? 'Enregistrer' : 'Créer et ajouter'}</button>
        </> :
        <>
          {/* ── Recherche + bouton « créer » ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexShrink: 0 }}>
            <div style={{
              flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, height: 46, padding: '0 14px',
              borderRadius: 14, border: `1.5px solid ${line}`, background: fieldBg
            }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={pal.muted} strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
              </svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un produit…" style={{
                flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
                color: pal.text, font: '600 15px -apple-system, system-ui'
              }} />
              {q && <button onClick={() => setQ('')} aria-label="Effacer" style={{
                width: 26, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: pal.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'
              }}><SkareIcon name="close" size={13} color={pal.muted} /></button>}
            </div>
            <button onClick={startCreate} aria-label="Créer un produit" style={{
              width: 46, height: 46, flexShrink: 0, borderRadius: 14, border: `1.5px solid ${pal.accent}`, background: pal.accent, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent'
            }}><SkareIcon name="plus" size={22} color={pal.accentInk} /></button>
          </div>

          {/* ── Onglets : catalogue scrapé / produits saisis à la main ── */}
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 14, background: soft, border: `1px solid ${line}`, marginBottom: 12, flexShrink: 0 }}>
            {[['db', 'Base de données'], ['mine', 'Mes saisies']].map(([k, lbl]) =>
              <button key={k} onClick={() => setTab(k)} style={{
                flex: 1, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
                font: '700 13.5px -apple-system, system-ui', WebkitTapHighlightColor: 'transparent',
                color: tab === k ? pal.accentInk : pal.text, background: tab === k ? pal.accent : 'transparent'
              }}>{lbl}</button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {tab === 'db' ? <>
              {dbList.map((p) =>
                <button key={p.id} onClick={() => { onAdd(p.id); close(); }} style={{
                  width: '100%', boxSizing: 'border-box', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 14,
                  border: `1px solid ${line}`, background: 'transparent', WebkitTapHighlightColor: 'transparent'
                }}>
                  <ProductThumb prod={p} pal={pal} iconSize={42} imgSize={50} glyph={22} radius={13} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <ProductName pal={pal} brand={p.brand} name={p.name} size={15.5} />
                    <div style={{ font: '500 13px -apple-system, system-ui', color: pal.muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[p.note, p.pao + ' mois après ouverture'].filter(Boolean).join(' · ')}</div>
                  </div>
                  <SkareIcon name="plus" size={20} color={pal.accent} />
                </button>
              )}
              {dbAll.length > CAP &&
                <div style={{ textAlign: 'center', color: pal.muted, padding: '14px 16px', font: '500 13px -apple-system, system-ui' }}>
                  {dbAll.length} résultats — affinez la recherche pour voir les autres.
                </div>}
              {dbAll.length === 0 &&
                <div style={{ textAlign: 'center', color: pal.muted, padding: '32px 16px', font: '500 14px -apple-system, system-ui' }}>
                  {qn ? 'Aucun produit trouvé.' : 'Catalogue indisponible.'}
                </div>}
            </> : <>
              {mineList.map((p) => {
                const owned = ownedIds.has(p.id);
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                    <button onClick={() => { if (!owned) { onAdd(p.id); close(); } }} style={{
                      flex: 1, minWidth: 0, boxSizing: 'border-box', textAlign: 'left', cursor: owned ? 'default' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 14,
                      border: `1px solid ${line}`, background: 'transparent', WebkitTapHighlightColor: 'transparent'
                    }}>
                      <ProductThumb prod={p} pal={pal} iconSize={42} imgSize={50} glyph={22} radius={13} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <ProductName pal={pal} brand={p.brand} name={p.name} size={15.5} />
                        <div style={{ font: '500 13px -apple-system, system-ui', color: pal.muted, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.note || ''}</div>
                      </div>
                      <SkareIcon name={owned ? 'check' : 'plus'} size={20} color={owned ? pal.muted : pal.accent} />
                    </button>
                    <button onClick={() => startEdit(p)} aria-label="Modifier" style={{
                      width: 44, flexShrink: 0, borderRadius: 13, border: `1px solid ${line}`, background: soft, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent'
                    }}><SkareIcon name="edit" size={18} color={pal.text} /></button>
                    <button onClick={() => deleteProduct(p.id)} aria-label="Supprimer" style={{
                      width: 44, flexShrink: 0, borderRadius: 13, border: `1px solid ${line}`, background: soft, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent'
                    }}><SkareIcon name="trash" size={18} color={pal.muted} /></button>
                  </div>
                );
              })}
              {mineList.length === 0 &&
                <div style={{ textAlign: 'center', color: pal.muted, padding: '32px 16px', font: '500 14px -apple-system, system-ui' }}>
                  {qn ? 'Aucune saisie trouvée.' : 'Aucun produit saisi.\nTouchez + pour en créer un.'}
                </div>}
            </>}
          </div>
        </>}
      </div>
    </div>
  );
}

/* ── Carte d'un produit possédé ────────────────────────────── */
function OwnedCard({ owned, prod, pal, onSetDate, onRenew, onRemove }) {
  const { line, soft, fieldBg } = pFields(pal);
  const surface = skareGlass(pal, PROD_CFG);
  const exp = prod ? skExpiry(owned.openedAt, prod.pao) : null;
  const tone = exp ? skTone(exp.tone, pal) : null;

  return (
    <div style={{ padding: 16, ...surface }}>
      {/* en-tête : vignette (image en ligne / icône sinon) + nom + compteur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <ProductThumb prod={prod} pal={pal} iconSize={52} imgSize={60} glyph={27} radius={16} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProductName pal={pal} brand={prod ? prod.brand : ''} name={prod ? prod.name : 'Produit'} size={18} />
          <div style={{ font: '500 13px -apple-system, system-ui', color: pal.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Tube n°{owned.count}{prod && prod.note ? ` · ${prod.note}` : ''}
          </div>
        </div>
      </div>

      {/* actifs principaux (inline scroll, repli/déplie au clic) */}
      {prod && prod.actives && prod.actives.length > 0 &&
        <div style={{ marginTop: 14 }}>
          <InlineScrollTags items={prod.actives} collapsedCount={3} wrapOnExpand
            renderItem={(a, i) => (
              <span key={i} title={a} style={{
                display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 12px', borderRadius: 15, flexShrink: 0,
                font: '600 13px -apple-system, system-ui', color: pal.text,
                background: soft, border: `1px solid ${line}`, whiteSpace: 'nowrap'
              }}>{a}</span>
            )}
            renderMore={(n) => (
              <span key="more" style={{
                display: 'inline-flex', alignItems: 'center', height: 30, padding: '0 12px', borderRadius: 15, flexShrink: 0,
                font: '600 13px -apple-system, system-ui', color: pal.muted,
                background: soft, border: `1px solid ${line}`, whiteSpace: 'nowrap'
              }}>+{n}</span>
            )} />
        </div>}

      {/* date d'ouverture */}
      <button onClick={onSetDate} style={{
        width: '100%', boxSizing: 'border-box', marginTop: 12, height: 48, padding: '0 14px', borderRadius: 14,
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left',
        background: owned.openedAt ? fieldBg : (pal.dark ? 'rgba(143,162,255,0.12)' : 'rgba(231,111,53,0.10)'),
        border: `1.5px solid ${owned.openedAt ? line : pal.accent}`, WebkitTapHighlightColor: 'transparent'
      }}>
        <SkareIcon name="calendar" size={19} color={owned.openedAt ? pal.muted : pal.accent} />
        <span style={{ flex: 1, font: '600 15px -apple-system, system-ui', color: owned.openedAt ? pal.text : pal.accent }}>
          {owned.openedAt ? `Ouvert le ${skFmtDate(owned.openedAt)}` : 'Définir la date d\u2019ouverture'}
        </span>
        <SkareIcon name="chevron" size={16} color={pal.muted} />
      </button>

      {/* péremption */}
      {exp &&
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '0 2px' }}>
          <span style={{ width: 9, height: 9, borderRadius: 5, flexShrink: 0, background: tone.fg }} />
          <span style={{ font: '700 13.5px -apple-system, system-ui', color: tone.fg }}>{exp.label}</span>
          <span style={{ font: '500 12.5px -apple-system, system-ui', color: pal.muted }}>· le {skFmtDate(skToYMD(exp.exp))}</span>
        </div>}

      {/* séparateur */}
      <div style={{ height: 1, background: line, margin: '14px 0 12px', opacity: 0.7 }} />

      {/* actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onRenew} style={{
          flex: 1, height: 46, borderRadius: 14, border: `1px solid ${line}`, background: soft, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          font: '700 14.5px -apple-system, system-ui', color: pal.text, WebkitTapHighlightColor: 'transparent'
        }}>
          <SkareIcon name="reset" size={18} color={pal.accent} />Terminé · renouveler
        </button>
        <button onClick={onRemove} aria-label="Supprimer" style={{
          width: 52, height: 46, borderRadius: 14, border: `1px solid ${line}`, background: soft, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent'
        }}><SkareIcon name="trash" size={19} color={pal.muted} /></button>
      </div>
    </div>
  );
}

/* ── Écran plein écran « Mes produits » ────────────────────── */
function MyProductsScreen({ pal, myProducts, setMyProducts, onClose }) {
  const { line, soft } = pFields(pal);
  const [sheet, setSheet] = useStateP(null); // 'add' | { date: ownedId }
  const ownedIds = new Set(myProducts.map((p) => p.productId));

  /* Auto-scroll vers le produit ajouté (longueur en hausse uniquement). */
  const listScrollRef = React.useRef(null);
  const prevLenRef = React.useRef(myProducts.length);
  useEffectP(() => {
    if (myProducts.length > prevLenRef.current) {
      const el = listScrollRef.current;
      if (el) requestAnimationFrame(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
    }
    prevLenRef.current = myProducts.length;
  }, [myProducts.length]);

  const addProduct = (productId) => setMyProducts((prev) => [...prev, { id: Date.now(), productId, openedAt: null, count: 1 }]);
  const removeOwned = (id) => setMyProducts((prev) => prev.filter((p) => p.id !== id));
  const setDate = (id, ymd) => setMyProducts((prev) => prev.map((p) => p.id === id ? { ...p, openedAt: ymd } : p));
  const renew = (id) => setMyProducts((prev) => prev.map((p) => p.id === id ? { ...p, count: p.count + 1, openedAt: skTodayYMD() } : p));

  /* Le catalogue (window.SKARE_PRODUCTS) est muté en place lors d'une
     édition/suppression de produit perso → on force un re-render pour que
     les listes (OwnedCard + sheet) reflètent le changement. */
  const [, setTick] = useStateP(0);
  const refreshProducts = () => setTick((n) => n + 1);
  /* Supprime la définition d'un produit perso ET les possédés qui le référencent. */
  const deleteCustomProduct = (productId) => {
    setMyProducts((prev) => prev.filter((p) => p.productId !== productId));
    return SkareDB.removeProduct(productId);
  };

  const dateOwned = sheet && sheet.date ? myProducts.find((p) => p.id === sheet.date) : null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column',
      background: `linear-gradient(170deg, ${pal.bgTop}, ${pal.bgBot})`, color: pal.text,
      fontFamily: '-apple-system, system-ui, sans-serif'
    }}>
      {/* top bar */}
      <div style={{ padding: '60px 18px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} aria-label="Fermer" style={{
          width: 46, height: 46, borderRadius: 23, border: `1px solid ${line}`, background: soft, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent'
        }}><SkareIcon name="close" size={22} color={pal.text} /></button>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, font: '800 24px -apple-system, system-ui', letterSpacing: -0.5, color: pal.text }}>Mes produits</h2>
          <div style={{ font: '600 13px -apple-system, system-ui', color: pal.muted, marginTop: 1 }}>
            {myProducts.length} actif{myProducts.length > 1 ? 's' : ''} suivi{myProducts.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* liste */}
      <div ref={listScrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 8px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {myProducts.map((o) =>
          <OwnedCard key={o.id} owned={o} prod={SKARE_PRODUCTS.find((p) => p.id === o.productId)} pal={pal}
            onSetDate={() => setSheet({ date: o.id })} onRenew={() => renew(o.id)} onRemove={() => removeOwned(o.id)} />
        )}
        {myProducts.length === 0 &&
          <div style={{ textAlign: 'center', color: pal.muted, padding: '48px 24px', font: '500 15px -apple-system, system-ui' }}>
            Aucun produit suivi.<br />Ajoutez vos actifs pour suivre leur ouverture et leur péremption.
          </div>}
        <div style={{ height: 8 }} />
      </div>

      {/* ajouter */}
      <div style={{ padding: '10px 18px 26px', background: `linear-gradient(to top, ${pal.bgBot} 60%, transparent)` }}>
        <button onClick={() => setSheet('add')} style={{
          width: '100%', height: 64, borderRadius: 32, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          font: '700 18px -apple-system, system-ui', color: pal.accentInk, background: pal.accent,
          boxShadow: `0 10px 30px ${pal.dark ? 'rgba(0,0,0,0.45)' : 'rgba(180,90,50,0.35)'}`, WebkitTapHighlightColor: 'transparent'
        }}><SkareIcon name="plus" size={24} color={pal.accentInk} />Ajouter un produit</button>
      </div>

      {sheet === 'add' &&
        <AddProductSheet pal={pal} ownedIds={ownedIds} onAdd={addProduct}
          onDeleteProduct={deleteCustomProduct} onProductsChanged={refreshProducts} onClose={() => setSheet(null)} />}
      {dateOwned &&
        <DateSheet pal={pal} value={dateOwned.openedAt} onPick={(ymd) => setDate(dateOwned.id, ymd)} onClose={() => setSheet(null)} />}
    </div>
  );
}

Object.assign(window, { MyProductsScreen, skThumbSrc });
