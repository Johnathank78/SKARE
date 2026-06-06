/* SKARE — App principale : Home, auto-scroll, menu burger, éditeur, Tweaks. */
const { useState, useEffect, useRef } = React;

const CARD_CFG = { intensity: 'moyen', contrast: 'doux', radius: 30 };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "periodView": "Auto",
  "morningPalette": "Aube pêche",
  "eveningPalette": "Bleu nuit"
} /*EDITMODE-END*/;

function PeriodGlyph({ period, color }) {
  return <SkareIcon name={period === 'morning' ? 'sun' : 'moon'} size={26} color={color} />;
}

/* ── Header contextuel + burger ────────────────────────────── */
function Header({ period, pal, doneCount, total, onMenu }) {
  const pct = total ? doneCount / total : 0;
  return (
    <div style={{ padding: '58px 22px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <PeriodGlyph period={period} color={pal.accent} />
        <span style={{ font: '600 14px -apple-system, system-ui', color: pal.muted, letterSpacing: 0.2 }}>
          {skareDateLabel()}
        </span>
        <button onClick={onMenu} aria-label="Menu" style={{
          marginLeft: 'auto', width: 46, height: 46, borderRadius: 23, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(14px) saturate(180%)', WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          border: `1px solid ${pal.dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.7)'}`,
          WebkitTapHighlightColor: 'transparent'
        }}><SkareIcon name="menu" size={24} color={pal.text} /></button>
      </div>
      <h1 style={{ margin: 0, font: '800 34px/1.05 -apple-system, system-ui', letterSpacing: -0.8, color: pal.text }}>
        {skareGreeting(period)}
      </h1>
      {total > 0 &&
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <div style={{
          flex: 1, height: 8, borderRadius: 4, overflow: 'hidden',
          background: pal.dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.5)'
        }}>
          <div style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 4, background: pal.accent, transition: 'width .35s ease' }} />
        </div>
        <span style={{ font: '700 14px -apple-system, system-ui', color: pal.text, minWidth: 42, textAlign: 'right' }}>
          {doneCount}/{total}
        </span>
      </div>}
    </div>);

}

/* ── Liste des cartes (refs pour auto-scroll) ──────────────── */
function CardsArea({ steps, pal, firstUndone, onToggle, registerRef }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 22px 8px' }}>
      {steps.map((s, i) =>
      <div key={s.id} ref={(el) => registerRef(s.id, el)}>
          <StepCard step={s} index={i} pal={pal} cfg={CARD_CFG}
        done={s.done} isNext={i === firstUndone} onToggle={() => onToggle(s.id)} />
        </div>
      )}
    </div>);

}

/* ── Bouton de bas de page (fixe ; le contenu défile au-dessus) ── */
function FloatingControls({ pal, total, allDone, onNext, onReset, onCreate }) {
  const empty = total === 0;
  const onClick = empty ? onCreate : allDone ? onReset : onNext;
  return (
    <div style={{
      flexShrink: 0, padding: '12px 18px 26px',
      background: `linear-gradient(to top, ${pal.bgBot} 60%, transparent)`
    }}>
      <button onClick={onClick} style={{
        width: '100%', height: 72, borderRadius: 36, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        font: '700 19px -apple-system, system-ui', color: pal.accentInk, background: pal.accent,
        boxShadow: `0 10px 30px ${pal.dark ? 'rgba(0,0,0,0.45)' : 'rgba(180,90,50,0.35)'}`,
        WebkitTapHighlightColor: 'transparent'
      }}>
        {empty ?
        <><SkareIcon name="edit" size={24} color={pal.accentInk} />Créer ma routine</> :
        allDone ?
        <><SkareIcon name="reset" size={24} color={pal.accentInk} />Recommencer</> :
        <>Étape suivante<SkareIcon name="check" size={24} color={pal.accentInk} /></>}
      </button>
    </div>);

}

/* ── Écran Home ────────────────────────────────────────────── */
function Screen({ period, pal, steps, setRoutines, onMenu, onEditRoutine }) {
  const scrollRef = useRef(null);
  const cardRefs = useRef({});
  const registerRef = (id, el) => {if (el) cardRefs.current[id] = el;};

  const firstUndone = steps.findIndex((s) => !s.done);
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = firstUndone === -1;
  const empty = steps.length === 0;

  const scrollToStep = (id) => {
    const el = cardRefs.current[id],sc = scrollRef.current;
    if (el && sc) sc.scrollTo({ top: Math.max(0, el.offsetTop - 12), behavior: 'smooth' });
  };
  const markDone = (id, val) => setRoutines((prev) => {
    const list = prev[period].map((s) => s.id === id ? { ...s, done: val } : s);
    if (val) {const nxt = list.find((s) => !s.done);if (nxt) requestAnimationFrame(() => scrollToStep(nxt.id));}
    return { ...prev, [period]: list };
  });
  const toggle = (id) => {const cur = steps.find((s) => s.id === id);markDone(id, !cur.done);};
  const next = () => {if (firstUndone !== -1) markDone(steps[firstUndone].id, true);};
  const reset = () => setRoutines((prev) => ({ ...prev, [period]: prev[period].map((s) => ({ ...s, done: false })) }));

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: `linear-gradient(170deg, ${pal.bgTop}, ${pal.bgBot})`,
      color: pal.text, fontFamily: '-apple-system, system-ui, sans-serif'
    }}>
      <Header period={period} pal={pal} doneCount={doneCount} total={steps.length} onMenu={onMenu} />
      <div ref={scrollRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {empty ?
        <div style={{
          minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', padding: '24px 30px 50px', gap: 16
        }}>
          <div style={{
            width: 76, height: 76, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)',
            border: `1px solid ${pal.dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.7)'}`
          }}><SkareIcon name="edit" size={34} color={pal.accent} /></div>
          <div style={{ font: '800 23px -apple-system, system-ui', letterSpacing: -0.4, color: pal.text }}>
            Aucune routine {period === 'morning' ? 'du matin' : 'du soir'}
          </div>
          <div style={{ font: '500 15px/1.5 -apple-system, system-ui', color: pal.muted, maxWidth: 280 }}>
            Crée tes étapes pour suivre ta routine et cocher chaque produit au fil de l’eau.
          </div>
        </div> :
        <CardsArea steps={steps} pal={pal} firstUndone={firstUndone} onToggle={toggle} registerRef={registerRef} />}
      </div>
      <FloatingControls pal={pal} total={steps.length} allDone={allDone} onNext={next} onReset={reset} onCreate={onEditRoutine} />
    </div>);

}

/* ── Racine : plein écran (réel appareil) + overlays + Tweaks ── */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [ready, setReady] = useState(false);
  const [routines, setRoutinesState] = useState(null);
  const [myProducts, setMyProductsState] = useState([]);
  const [journal, setJournalState] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [toast, setToast] = useState(null);

  /* Hydratation asynchrone depuis la base locale (Dexie/IndexedDB).
     skare-data.js reste le seed ; ensuite la base fait foi. Les photos
     du journal arrivent en Blob → on fabrique des object URLs pour l'UI
     (et on garde le Blob pour la ré-écriture). */
  useEffect(() => {
    let alive = true;
    SkareDB.init().then((state) => {
      if (!alive) return;
      setRoutinesState(state.routines);
      setMyProductsState(state.myProducts);
      setJournalState(state.journal.map((e) => ({
        id: e.id, date: e.date, blob: e.img || null,
        img: e.img ? URL.createObjectURL(e.img) : null,
      })));
      setReady(true);
    }).catch((err) => {
      console.error('SKARE — échec d’ouverture de la base, repli mémoire', err);
      if (!alive) return;
      setRoutinesState({
        morning: SKARE_STEPS.morning.map((s) => ({ ...s })),
        evening: SKARE_STEPS.evening.map((s) => ({ ...s })),
      });
      setMyProductsState(SKARE_MY_PRODUCTS.map((p) => ({ ...p })));
      setJournalState(SKARE_JOURNAL.map((p) => ({ ...p, blob: null, img: p.img || null })));
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  /* Setters « write-through » : on garde la mise à jour optimiste de
     l'état React, puis on persiste la table concernée dans Dexie. */
  const setRoutines = (updater) => setRoutinesState((prev) => {
    const next = typeof updater === 'function' ? updater(prev) : updater;
    if (next) SkareDB.saveRoutines(next).catch((e) => console.warn('SKARE — save routines', e));
    return next;
  });
  const setMyProducts = (updater) => setMyProductsState((prev) => {
    const next = typeof updater === 'function' ? updater(prev) : updater;
    SkareDB.saveMyProducts(next).catch((e) => console.warn('SKARE — save produits', e));
    return next;
  });
  const setJournal = (updater) => setJournalState((prev) => {
    const next = typeof updater === 'function' ? updater(prev) : updater;
    SkareDB.saveJournal(next).catch((e) => console.warn('SKARE — save journal', e));
    return next;
  });

  const realPeriod = skarePeriodNow();
  const period = t.periodView === 'Matin' ? 'morning' : t.periodView === 'Soir' ? 'evening' : realPeriod;
  const morningPal = SKARE_MORNING_PALETTES[t.morningPalette] || SKARE_MORNING_PALETTES['Aube pêche'];
  const eveningPal = SKARE_EVENING_PALETTES[t.eveningPalette] || SKARE_EVENING_PALETTES['Bleu nuit'];
  const pal = period === 'morning' ? morningPal : eveningPal;

  /* Splash minimal tant que la base locale n'a pas répondu. */
  if (!ready || !routines) {
    return (
      <div style={{
        minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(120% 120% at 50% 0%, #2a2a30, #161618)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: 0.9 }}>
          <SkareIcon name="drop" size={30} color="#E76F35" />
          <span style={{ font: '800 28px -apple-system, system-ui', letterSpacing: 4, color: 'rgba(255,255,255,0.82)' }}>SKARE</span>
        </div>
      </div>);

  }

  const showToast = (m) => {setToast(m);clearTimeout(window.__skt);window.__skt = setTimeout(() => setToast(null), 1900);};

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: pal.bgBot, fontFamily: '-apple-system, system-ui, sans-serif'
    }}>
      <Screen period={period} pal={pal} steps={routines[period]} setRoutines={setRoutines}
      onMenu={() => setMenuOpen(true)} onEditRoutine={() => setEditorOpen(true)} />

      {menuOpen &&
      <MenuSheet pal={pal} onClose={() => setMenuOpen(false)}
      onRoutine={() => {setMenuOpen(false);setEditorOpen(true);}}
      onProducts={() => {setMenuOpen(false);setProductsOpen(true);}}
      onJournal={() => {setMenuOpen(false);setJournalOpen(true);}} />
      }
      {productsOpen &&
      <MyProductsScreen pal={pal} myProducts={myProducts} setMyProducts={setMyProducts}
      onClose={() => setProductsOpen(false)} />
      }
      {journalOpen &&
      <JournalScreen pal={pal} journal={journal} setJournal={setJournal}
      onClose={() => setJournalOpen(false)} />
      }
      {editorOpen &&
      <RoutineEditor morningPal={morningPal} eveningPal={eveningPal} initialTab={period}
      routines={routines} setRoutines={setRoutines} myProducts={myProducts} onClose={() => setEditorOpen(false)} />
      }

      <div style={{
        position: 'absolute', bottom: 130, left: '50%', transform: 'translateX(-50%)', zIndex: 95,
        padding: '12px 20px', borderRadius: 22, font: '600 14px -apple-system, system-ui',
        color: pal.dark ? '#0f1330' : '#fff', background: pal.dark ? 'rgba(240,242,255,0.94)' : 'rgba(40,28,20,0.9)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        opacity: toast ? 1 : 0, transition: 'opacity .25s', pointerEvents: 'none', whiteSpace: 'nowrap'
      }}>{toast}</div>

      <TweaksPanel>
        <TweakSection label="Aperçu du thème" />
        <TweakRadio label="Moment" value={t.periodView}
        options={['Auto', 'Matin', 'Soir']}
        onChange={(v) => setTweak('periodView', v)} />

        <TweakSection label="Palettes" />
        <TweakSelect label="Matin" value={t.morningPalette}
        options={Object.keys(SKARE_MORNING_PALETTES)}
        onChange={(v) => setTweak('morningPalette', v)} />
        <TweakSelect label="Soir" value={t.eveningPalette}
        options={Object.keys(SKARE_EVENING_PALETTES)}
        onChange={(v) => setTweak('eveningPalette', v)} />
      </TweaksPanel>
    </div>);

}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);