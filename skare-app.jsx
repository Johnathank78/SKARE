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
function CardsArea({ steps, pal, firstUndone, onToggle, startedTimers, onStartTimer, registerRef }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 22px 8px' }}>
      {steps.map((s, i) =>
      <div key={s.id} ref={(el) => registerRef(s.id, el)}>
          <StepCard step={s} index={i} pal={pal} cfg={CARD_CFG}
        done={s.done} isNext={i === firstUndone} onToggle={() => onToggle(s.id)}
        started={!!startedTimers[s.id]} onStartTimer={() => onStartTimer(s.id)} />
        </div>
      )}
    </div>);

}

/* ── Bouton de bas de page (fixe ; le contenu défile au-dessus) ──
   Si l'étape ciblée a un minuteur non lancé, le bouton le LANCE (comme un
   clic sur la carte) avec un libellé dynamique ; sinon il valide l'étape. */
function FloatingControls({ pal, total, allDone, nextStep, nextStarted, onAdvance, onStartTimer, onReset, onCreate }) {
  const empty = total === 0;
  const hasTimer = !!(nextStep && nextStep.waitSeconds);
  const launch = !empty && !allDone && hasTimer && !nextStarted;
  const onClick = empty ? onCreate : allDone ? onReset : launch ? () => onStartTimer(nextStep.id) : onAdvance;

  let content;
  if (empty) content = <><SkareIcon name="edit" size={24} color={pal.accentInk} />Créer ma routine</>;
  else if (allDone) content = <><SkareIcon name="reset" size={24} color={pal.accentInk} />Recommencer</>;
  else if (launch) content = <><SkareIcon name="timer" size={24} color={pal.accentInk} />Lancer le minuteur {fmtSkareTime(nextStep.waitSeconds)}</>;
  else content = <>Étape suivante<SkareIcon name="check" size={24} color={pal.accentInk} /></>;

  return (
    <div style={{
      flexShrink: 0, padding: '10px 18px 26px',
      background: `linear-gradient(to top, ${pal.bgBot} 60%, transparent)`
    }}>
      <button onClick={onClick} style={{
        width: '100%', height: 64, borderRadius: 32, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        font: '700 18px -apple-system, system-ui', color: pal.accentInk, background: pal.accent,
        boxShadow: `0 10px 30px ${pal.dark ? 'rgba(0,0,0,0.45)' : 'rgba(180,90,50,0.35)'}`,
        WebkitTapHighlightColor: 'transparent'
      }}>{content}</button>
    </div>);

}

/* ── Tuile « Photo de la semaine » (en amont de la routine) ──── */
function WeeklyPhotoTile({ pal, onClick }) {
  return (
    <div style={{ padding: '4px 22px 4px' }}>
      <button onClick={onClick} style={{
        width: '100%', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 16, padding: 18, borderRadius: 26,
        border: `1.5px solid ${pal.accent}`, background: pal.dark ? 'rgba(143,162,255,0.12)' : 'rgba(231,111,53,0.10)',
        WebkitTapHighlightColor: 'transparent'
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 17, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: pal.accent
        }}><SkareIcon name="camera" size={28} color={pal.accentInk} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: '800 18px -apple-system, system-ui', letterSpacing: -0.3, color: pal.text }}>Photo de la semaine</div>
          <div style={{ font: '500 13.5px -apple-system, system-ui', color: pal.muted, marginTop: 2 }}>Capture ta progression du jour</div>
        </div>
        <SkareIcon name="chevron" size={18} color={pal.accent} />
      </button>
    </div>);

}

/* ── Écran Home ────────────────────────────────────────────── */
function Screen({ period, pal, steps: allSteps, setRoutines, onMenu, onEditRoutine, onJournal, reminderDay, journal }) {
  // Rotation : une étape programmée « rien » aujourd'hui est masquée (repos).
  const steps = allSteps.filter((s) => skareActiveVariant(s, new Date()) !== null);
  const scrollRef = useRef(null);
  const cardRefs = useRef({});
  const registerRef = (id, el) => {if (el) cardRefs.current[id] = el;};

  // Minuteurs lancés par étape (id → true). Partagé carte ⇄ bouton de bas
  // de page pour qu'« Étape suivante » lance le minuteur de l'étape ciblée.
  const [startedTimers, setStartedTimers] = useState({});
  const startTimer = (id) => setStartedTimers((m) => ({ ...m, [id]: true }));
  const clearTimer = (id) => setStartedTimers((m) => { if (!m[id]) return m; const n = { ...m }; delete n[id]; return n; });

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
    // Défile vers la prochaine étape VISIBLE non cochée (ignore les repos).
    if (val) {const nxt = steps.find((s) => s.id !== id && !s.done);if (nxt) requestAnimationFrame(() => scrollToStep(nxt.id));}
    return { ...prev, [period]: list };
  });
  const toggle = (id) => {const cur = steps.find((s) => s.id === id);const val = !cur.done;markDone(id, val);if (!val) clearTimer(id);};
  const next = () => {if (firstUndone !== -1) markDone(steps[firstUndone].id, true);};
  const reset = () => {setRoutines((prev) => ({ ...prev, [period]: prev[period].map((s) => ({ ...s, done: false })) }));setStartedTimers({});};

  const nextStep = allDone ? null : steps[firstUndone];
  const nextStarted = nextStep ? !!startedTimers[nextStep.id] : false;
  const remindPhoto = skareShouldRemindPhoto(reminderDay, journal);

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: `linear-gradient(170deg, ${pal.bgTop}, ${pal.bgBot})`,
      color: pal.text, fontFamily: '-apple-system, system-ui, sans-serif'
    }}>
      <Header period={period} pal={pal} doneCount={doneCount} total={steps.length} onMenu={onMenu} />
      <div ref={scrollRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {remindPhoto && <WeeklyPhotoTile pal={pal} onClick={onJournal} />}
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
        <CardsArea steps={steps} pal={pal} firstUndone={firstUndone} onToggle={toggle}
          startedTimers={startedTimers} onStartTimer={startTimer} registerRef={registerRef} />}
      </div>
      <FloatingControls pal={pal} total={steps.length} allDone={allDone}
        nextStep={nextStep} nextStarted={nextStarted}
        onAdvance={next} onStartTimer={startTimer} onReset={reset} onCreate={onEditRoutine} />
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
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [reminderDay, setReminderDayState] = useState(0);   // jour de la photo hebdo (getDay)
  const [cameraZoom, setCameraZoomState] = useState(2);     // zoom photo mémorisé

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
      if (state.reminderDay != null) setReminderDayState(state.reminderDay);
      if (state.cameraZoom != null) setCameraZoomState(state.cameraZoom);
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
  const setReminderDay = (d) => { setReminderDayState(d); SkareDB.saveMeta('reminderDay', d).catch(() => {}); };
  const setCameraZoom = (z) => { setCameraZoomState(z); SkareDB.saveMeta('cameraZoom', z).catch(() => {}); };

  /* Cache image borné : on demande au Service Worker de ne garder QUE les
     vignettes des produits possédés (miroir de « Mes produits »). Le cache
     ne peut donc pas dériver — retirer un produit évince son image.
     On envoie les URLs déjà en variante S_ : exactement ce que <img> charge. */
  useEffect(() => {
    if (!ready || !('serviceWorker' in navigator)) return;
    const urls = myProducts
      .map((o) => SKARE_PRODUCTS.find((p) => p.id === o.productId))
      .map((p) => p && skThumbSrc(p.image))
      .filter((u) => typeof u === 'string' && /^https?:/.test(u));
    navigator.serviceWorker.ready
      .then((reg) => reg.active && reg.active.postMessage({ type: 'SYNC_IMAGES', urls }))
      .catch(() => {});
  }, [ready, myProducts]);

  /* Notification de péremption au lancement (une fois par session, et une
     seule fois par échéance — voir skareNotifyExpiries). Ne s'exécute que si
     l'utilisateur a déjà accordé la permission (jamais de prompt au démarrage). */
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (!ready || notifiedRef.current) return;
    notifiedRef.current = true;
    skareNotifyExpiries(myProducts);
  }, [ready]);

  const realPeriod = skarePeriodNow();
  const period = t.periodView === 'Matin' ? 'morning' : t.periodView === 'Soir' ? 'evening' : realPeriod;
  const morningPal = SKARE_MORNING_PALETTES[t.morningPalette] || SKARE_MORNING_PALETTES['Aube pêche'];
  const eveningPal = SKARE_EVENING_PALETTES[t.eveningPalette] || SKARE_EVENING_PALETTES['Bleu nuit'];
  const pal = period === 'morning' ? morningPal : eveningPal;

  /* Splash minimal tant que la base locale n'a pas répondu — calé sur le
     launch screen iOS (lotus sur crème #fff5ee) pour une transition sans
     rupture : plus d'écran gris foncé ni d'ancien logo « goutte ». */
  if (!ready || !routines) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff5ee'
      }}>
        <img src="icons/icon-512.png" alt="SKARE" width="120" height="120" style={{ display: 'block', width: 120, height: 120 }} />
      </div>);

  }

  const showToast = (m) => {setToast(m);clearTimeout(window.__skt);window.__skt = setTimeout(() => setToast(null), 1900);};

  /* Active les notifications locales. Sur iOS (PWA installée, 16.4+) cela
     enregistre l'app dans Réglages → Apps (et y expose ses permissions).
     100% local : aucun serveur, aucun réseau requis. */
  const enableReminders = () => {
    setMenuOpen(false);
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      showToast('Notifications non supportées'); return;
    }
    if (Notification.permission === 'denied') {
      showToast('Notifications bloquées (Réglages)'); return;
    }
    Notification.requestPermission().then((perm) => {
      if (perm !== 'granted') {showToast('Notifications refusées'); return;}
      navigator.serviceWorker.ready.then((reg) =>
        reg.showNotification('SKARE', {
          body: 'Rappels activés — à tout à l’heure pour ta routine ✨',
          icon: 'icons/icon-512.png', badge: 'icons/icon-512.png', tag: 'skare-reminder'
        })
      ).catch(() => {});
      showToast('Rappels activés ✨');
    }).catch(() => showToast('Notifications indisponibles'));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: pal.bgBot, fontFamily: '-apple-system, system-ui, sans-serif'
    }}>
      <Screen period={period} pal={pal} steps={routines[period]} setRoutines={setRoutines}
      onMenu={() => setMenuOpen(true)} onEditRoutine={() => setEditorOpen(true)}
      onJournal={() => setJournalOpen(true)} reminderDay={reminderDay} journal={journal} />

      {menuOpen &&
      <MenuSheet pal={pal} onClose={() => setMenuOpen(false)}
      onRoutine={() => {setMenuOpen(false);setEditorOpen(true);}}
      onProducts={() => {setMenuOpen(false);setProductsOpen(true);}}
      onJournal={() => {setMenuOpen(false);setJournalOpen(true);}}
      onNotifications={() => {setMenuOpen(false);setRemindersOpen(true);}} />
      }
      {remindersOpen &&
      <RemindersScreen pal={pal} myProducts={myProducts} journal={journal}
      onEnableNotifications={enableReminders}
      onOpenJournal={() => {setRemindersOpen(false);setJournalOpen(true);}}
      onClose={() => setRemindersOpen(false)} />
      }
      {productsOpen &&
      <MyProductsScreen pal={pal} myProducts={myProducts} setMyProducts={setMyProducts}
      onClose={() => setProductsOpen(false)} />
      }
      {journalOpen &&
      <JournalScreen pal={pal} journal={journal} setJournal={setJournal}
      reminderDay={reminderDay} setReminderDay={setReminderDay}
      cameraZoom={cameraZoom} setCameraZoom={setCameraZoom}
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