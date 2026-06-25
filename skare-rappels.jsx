/* SKARE — Section « Rappels » : centralise toutes les notifications de l'app.
   Pour l'instant un seul type : les péremptions à venir (≤ 7 jours, périmés
   inclus). Tuiles simples : icône carrée à gauche + 2 lignes (titre / détail).
   Toutes les couleurs viennent de la palette active (jour/nuit). */
const { useState: useStateRem } = React;

/* Ton d'un rappel → couleurs (calé sur skTone de « Mes produits »). */
function skRemTone(tone, pal) {
  if (tone === 'danger') return { fg: 'oklch(0.64 0.17 25)', bg: 'oklch(0.64 0.17 25 / 0.18)' };
  if (tone === 'warn') return { fg: pal.dark ? 'oklch(0.82 0.13 75)' : 'oklch(0.62 0.13 68)', bg: 'oklch(0.72 0.13 70 / 0.18)' };
  return { fg: pal.accent, bg: pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.6)' };
}

/* Nombre de mois entiers écoulés entre une date YMD et `to` (Date). */
function skMonthsSince(fromYMD, to) {
  const a = fromYMD.split('-').map(Number);
  if (a.length < 3) return 0;
  const from = new Date(a[0], a[1] - 1, a[2]);
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m--; // pas encore atteint l'anniversaire mensuel
  return m;
}

/* Rappel « compare ta progression » : si une photo du journal est assez
   ancienne, propose de comparer le visage actuel à il y a 6, 3 ou 1 mois.
   On ne propose QUE le palier le plus ancien atteint (pas les trois). */
function skareCompareReminder(journal) {
  if (!journal || !journal.length) return null;
  let oldest = null;
  journal.forEach((e) => { if (e && e.date && (!oldest || e.date < oldest)) oldest = e.date; });
  if (!oldest) return null;
  const months = skMonthsSince(oldest, new Date());
  const m = months >= 6 ? 6 : months >= 3 ? 3 : months >= 1 ? 1 : 0;
  if (!m) return null;
  return { kind: 'compare', key: 'compare:' + m, icon: 'camera', tone: 'neutral',
    title: 'Compare ta progression', detail: `Ton visage d'il y a ${m} mois`, sort: 1e6 };
}

/* Construit la liste des rappels.
   Chaque rappel : { kind, key, icon, tone, title, detail, sort }.
   `within` = horizon en jours pour les péremptions (défaut 7 = « 1 semaine
   à l'avance »). Les alertes (péremptions) passent avant les rappels positifs
   (progression), via `sort`. */
function skareReminders(myProducts, journal, within = 7) {
  const out = [];
  (myProducts || []).forEach((o) => {
    const prod = (window.SKARE_PRODUCTS || []).find((p) => p.id === o.productId);
    if (!prod) return;
    const info = skareExpiry(o.openedAt, prod.pao);
    if (!info || info.days > within) return;
    const name = [prod.brand, prod.name].filter(Boolean).join(' ') || 'Produit';
    let detail, tone;
    if (info.days < 0) { detail = 'Périmé — à remplacer'; tone = 'danger'; }
    else if (info.days === 0) { detail = "Périme aujourd'hui"; tone = 'warn'; }
    else if (info.days === 1) { detail = 'Périme demain'; tone = 'warn'; }
    else { detail = `Périme dans ${info.days} jours`; tone = 'warn'; }
    out.push({ kind: 'expiry', key: `${o.id}:${info.expYMD}`, icon: prod.icon || 'potion', tone, title: name, detail, sort: info.days });
  });
  const cmp = skareCompareReminder(journal);
  if (cmp) out.push(cmp);
  out.sort((a, b) => a.sort - b.sort);
  return out;
}

/* ── Tuile de rappel : icône carrée à gauche, titre + détail (2 lignes).
     Devient cliquable (chevron) si `onClick` est fourni. ── */
function ReminderTile({ pal, icon, title, detail, tone, onClick }) {
  const t = skRemTone(tone, pal);
  const line = pal.dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick || undefined} style={{
      width: '100%', boxSizing: 'border-box', textAlign: 'left', cursor: onClick ? 'pointer' : 'default',
      display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20,
      background: pal.dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)', border: `1px solid ${line}`,
      WebkitTapHighlightColor: 'transparent'
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: 15, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg
      }}><SkareIcon name={icon} size={26} color={t.fg} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: '700 16px -apple-system, system-ui', letterSpacing: -0.2, color: pal.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        <div style={{ font: '600 13.5px -apple-system, system-ui', color: t.fg, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail}</div>
      </div>
      {onClick && <SkareIcon name="chevron" size={18} color={pal.muted} />}
    </Tag>
  );
}

/* ── Écran plein écran « Rappels » ─────────────────────────────── */
function RemindersScreen({ pal, myProducts, journal, onEnableNotifications, onOpenJournal, onClose }) {
  const line = pal.dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)';
  const soft = pal.dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.55)';
  const reminders = skareReminders(myProducts, journal, 7);
  const notifSupported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
  const notifOn = notifSupported && Notification.permission === 'granted';

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
          <h2 style={{ margin: 0, font: '800 24px -apple-system, system-ui', letterSpacing: -0.5, color: pal.text }}>Rappels</h2>
          <div style={{ font: '600 13px -apple-system, system-ui', color: pal.muted, marginTop: 1 }}>
            {reminders.length === 0 ? 'Tout est à jour' : `${reminders.length} rappel${reminders.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* liste */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 18px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* activer les notifications (tant que la permission n'est pas accordée) */}
        {notifSupported && !notifOn &&
          <button onClick={onEnableNotifications} style={{
            width: '100%', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20,
            border: `1.5px solid ${pal.accent}`, background: pal.dark ? 'rgba(143,162,255,0.12)' : 'rgba(231,111,53,0.10)',
            WebkitTapHighlightColor: 'transparent'
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: 15, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: pal.accent
            }}><SkareIcon name="bell" size={26} color={pal.accentInk} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '700 16px -apple-system, system-ui', letterSpacing: -0.2, color: pal.text }}>Activer les notifications</div>
              <div style={{ font: '600 13.5px -apple-system, system-ui', color: pal.muted, marginTop: 3 }}>Sois prévenu·e quand un produit va périmer</div>
            </div>
            <SkareIcon name="chevron" size={18} color={pal.accent} />
          </button>}

        {reminders.map((r) =>
          <ReminderTile key={r.key} pal={pal} icon={r.icon} title={r.title} detail={r.detail} tone={r.tone}
            onClick={r.kind === 'compare' ? onOpenJournal : null} />
        )}

        {reminders.length === 0 &&
          <div style={{ textAlign: 'center', color: pal.muted, padding: '44px 24px', font: '500 15px/1.5 -apple-system, system-ui' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: soft, border: `1px solid ${line}`
            }}><SkareIcon name="bell" size={30} color={pal.accent} /></div>
            Aucun rappel pour le moment.<br />Les péremptions à venir s'afficheront ici.
          </div>}
      </div>
    </div>
  );
}

/* Notification locale au lancement : produits périmant sous 3 jours (inclus,
   périmés compris). Une SEULE fois par échéance : la clé `ownedId:expYMD` est
   mémorisée dans meta.expiryNotified (renouveler un produit change sa date de
   péremption → nouvelle clé → re-notifié le moment venu). 100% local. */
async function skareNotifyExpiries(myProducts) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (!('serviceWorker' in navigator)) return;

    const soon = [];
    (myProducts || []).forEach((o) => {
      const prod = (window.SKARE_PRODUCTS || []).find((p) => p.id === o.productId);
      if (!prod) return;
      const info = skareExpiry(o.openedAt, prod.pao);
      if (!info || info.days > 3) return;
      soon.push({ key: `${o.id}:${info.expYMD}`, name: [prod.brand, prod.name].filter(Boolean).join(' ') || 'Un produit', days: info.days });
    });
    if (!soon.length) return;

    const prev = (await SkareDB.getMeta('expiryNotified')) || [];
    const seen = new Set(prev);
    const fresh = soon.filter((s) => !seen.has(s.key));
    if (!fresh.length) return;

    const reg = await navigator.serviceWorker.ready;
    let title, body;
    if (fresh.length === 1) {
      const f = fresh[0];
      title = f.days < 0 ? 'Produit périmé' : 'Produit bientôt périmé';
      body = f.days < 0 ? `${f.name} est périmé.`
        : f.days === 0 ? `${f.name} périme aujourd'hui.`
        : f.days === 1 ? `${f.name} périme demain.`
        : `${f.name} périme dans ${f.days} jours.`;
    } else {
      title = `${fresh.length} produits vont bientôt être périmés`;
      body = 'Ouvre SKARE › Rappels pour les voir.';
    }
    await reg.showNotification(title, {
      body, icon: 'icons/icon-512.png', badge: 'icons/icon-512.png', tag: 'skare-expiry'
    });

    // Mémorise les échéances notifiées, borné aux produits encore possédés.
    const ownedIds = new Set((myProducts || []).map((o) => String(o.id)));
    const merged = Array.from(new Set([...prev, ...fresh.map((s) => s.key)])).filter((k) => ownedIds.has(k.split(':')[0]));
    await SkareDB.saveMeta('expiryNotified', merged);
  } catch (e) { console.warn('SKARE — notif péremption', e); }
}

Object.assign(window, { RemindersScreen, ReminderTile, skareReminders, skareNotifyExpiries });
