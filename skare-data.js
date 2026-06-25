/* ────────────────────────────────────────────────────────────────
   SKARE — Modèle de données + thème
   Plain JS (pas de JSX). Exposé sur window pour les autres scripts.

   ───────────────────────────────────────────────────────────────
   SEED DE LA BASE DEXIE (voir skare-db.js)
   ───────────────────────────────────────────────────────────────
   Ce fichier reste la SOURCE DE VÉRITÉ du premier remplissage. Au
   premier lancement, skare-db.js recopie les constantes SKARE_* dans
   IndexedDB (Dexie), puis pose meta.seeded = true ; ensuite la base
   fait foi et chaque mutation y est ré-écrite (write-through).

   Schéma réellement implémenté (skare-db.js) :
     const db = new Dexie('skare');
     db.version(1).stores({
       products:   'id, name',              // catalogue (SKARE_PRODUCTS)
       myProducts: 'id, productId',         // possédés (SKARE_MY_PRODUCTS)
       steps:      'id, routineId, order',  // étapes (SKARE_STEPS aplati)
       journal:    'id, date',              // photos (img = Blob)
       meta:       'key'                    // seeded, schemaVersion…
     });

   Chaque STEP suit exactement la forme des objets ci-dessous (matin =
   routineId 1, soir = routineId 2) :
     { id, routineId, order, action, product, productId,
       badges:[], waitSeconds:number|null, icon, done:false }
   ──────────────────────────────────────────────────────────────── */

/* Liste d'actions proposées dans l'éditeur (sélecteur « Action »). */
const SKARE_ACTIONS = [
  'Démaquiller', 'Nettoyer', 'Exfolier', 'Tonifier', 'Appliquer',
  'Traiter', 'Hydrater', 'Nourrir', 'Protéger', 'Masser', 'Vaporiser', 'Masquer',
];

/* Catalogue d'actifs (db produit). `pao` = Period After Opening en mois
   (sert au calcul de péremption une fois la date d'ouverture renseignée).

   VIDE ici : le catalogue est alimenté par products.json (source unique,
   finale). skare-db.js l'importe une fois dans IndexedDB puis remplit ce
   tableau au démarrage (en ne gardant que les clés du modèle SKARE).
   Forme d'une entrée : { id, brand, name, note, icon, pao, actives:[] } */
const SKARE_PRODUCTS = [];

/* « Mes produits » — actifs réellement possédés par l'utilisateur.
   VIDE au premier lancement : l'utilisateur ajoute ses propres produits
   depuis le catalogue. Forme d'un élément :
     { id, productId, openedAt: 'YYYY-MM-DD'|null, count } */
const SKARE_MY_PRODUCTS = [];

/* Étapes de routine. VIDE au premier lancement : l'utilisateur crée sa
   routine via l'éditeur (matin = routineId 1, soir = routineId 2).
   Forme d'une étape :
     { id, routineId, order, action, product, productId,
       badges:[], waitSeconds:number|null, icon, done:false } */
const SKARE_STEPS = {
  morning: [],
  evening: [],
};

/* ── Heure → période ─────────────────────────────────────────── */
function skarePeriodNow() {
  const h = new Date().getHours();
  return (h >= 5 && h < 18) ? 'morning' : 'evening';
}

function skareGreeting(period) {
  return period === 'morning' ? 'Routine du Matin' : 'Routine du Soir';
}

function skareDateLabel() {
  const d = new Date();
  const s = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── Rappel « photo de la semaine » ──────────────────────────────
   reminderDay = index getDay() (0=dimanche … 6=samedi). La tuile
   apparaît le jour choisi, une fois par semaine (tant qu'aucune photo
   n'a été prise dans les 7 derniers jours). */
const SKARE_WEEKDAYS_FULL = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
function skareHasPhotoThisWeek(journal) {
  if (!journal || !journal.length) return false;
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const since = t0.getTime() - 6 * 86400000; // 7 derniers jours, aujourd'hui inclus
  return journal.some((e) => {
    const a = (e.date || '').split('-').map(Number);
    if (a.length < 3) return false;
    return new Date(a[0], a[1] - 1, a[2]).getTime() >= since;
  });
}
function skareShouldRemindPhoto(reminderDay, journal) {
  if (reminderDay == null || reminderDay < 0) return false;
  if (new Date().getDay() !== reminderDay) return false;
  return !skareHasPhotoThisWeek(journal);
}

/* ── Rotation d'actifs (variantes d'étape) ──────────────────────
   Une étape peut porter plusieurs variantes (produits) ; la variante
   active dépend du jour. Rétro-compatible : une étape sans `variants`
   = une seule variante (le produit de l'étape). Une variante ne change
   que le produit + l'icône ; action/minuteur/indications restent à
   l'étape. La rotation est résolue le jour J, de façon transparente
   à l'accueil :
     rotation = { mode:'weekly', weeks:N, anchor:'YYYY-MM-DD', weekly:[id ×7N (Lun..Dim × N sem.)] }
              | { mode:'cycle',  cycle:{ length:N, anchor:'YYYY-MM-DD', slots:[id ×N] } }
   En hebdo, `weeks` (1..4) = nb de semaines qui s'alternent ; `anchor` (utile
   seulement si weeks>1) fixe la semaine n°1 (semaine contenant l'ancre).
   Rétro-compat : un `weekly` de longueur 7 sans `weeks` = 1 semaine, sans ancre. */
function skareTodayYMD() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function skareStepVariants(step) {
  if (step && step.variants && step.variants.length) return step.variants;
  return [{ id: 'v' + (step ? step.id : 0), productId: step ? step.productId : null,
    product: step ? step.product : '', icon: step ? step.icon : 'drop' }];
}
function skareMidnightTs(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
/* Créneau « rien » dans une rotation : ce jour-là, aucune variante n'est
   appliquée → l'étape est masquée de la routine (jour de repos). Permet
   aussi de PROGRAMMER un produit unique (certains jours seulement). */
const SKARE_EMPTY_SLOT = '__none__';
/* Index de semaine (0-based) d'une date dans un cycle hebdo de `weeks`
   semaines, calé sur le lundi de la semaine contenant `anchorYMD`. */
function skareWeekIndex(date, anchorYMD, weeks) {
  if (!weeks || weeks <= 1) return 0;
  const toMonday = (x) => { const m = new Date(x); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return skareMidnightTs(m); };
  const ap = (anchorYMD || skareTodayYMD()).split('-').map(Number);
  const anchorTs = toMonday(new Date(ap[0], ap[1] - 1, ap[2]));
  const diffWeeks = Math.round((toMonday(date) - anchorTs) / (7 * 86400000));
  return ((diffWeeks % weeks) + weeks) % weeks;
}
function skareActiveVariant(step, date) {
  const vs = skareStepVariants(step);
  const r = step && step.rotation;
  // Pas de rotation = produit unique, toujours actif. Une rotation peut
  // exister même avec une seule variante (programmation on/off).
  if (!r) return vs[0];
  const byId = (id) => id === SKARE_EMPTY_SLOT ? null : (vs.find((v) => v.id === id) || vs[0]);
  const d = date || new Date();
  if (r.mode === 'weekly' && r.weekly) {
    const weeks = r.weeks || Math.max(1, Math.round(r.weekly.length / 7));
    const dow = (new Date(d).getDay() + 6) % 7;     // 0 = lundi … 6 = dimanche
    const wi = skareWeekIndex(d, r.anchor, weeks);
    return byId(r.weekly[wi * 7 + dow]);
  }
  if (r.mode === 'cycle' && r.cycle && r.cycle.length) {
    const c = r.cycle, ap = (c.anchor || skareTodayYMD()).split('-').map(Number);
    const anchorTs = skareMidnightTs(new Date(ap[0], ap[1] - 1, ap[2]));
    const n = Math.floor((skareMidnightTs(d) - anchorTs) / 86400000);
    return byId(c.slots[((n % c.length) + c.length) % c.length]);
  }
  return vs[0];
}
function skareRotationSummary(step) {
  const r = step && step.rotation;
  if (!r) return null;
  if (r.mode === 'cycle' && r.cycle) return 'Cycle ' + r.cycle.length + ' j';
  const weeks = r.weeks || (r.weekly ? Math.max(1, Math.round(r.weekly.length / 7)) : 1);
  return weeks > 1 ? ('Hebdo ' + weeks + ' sem.') : 'Hebdo';
}
function skareVariantSchedule(step, variantId) {
  const r = step && step.rotation;
  if (!r) return 'Toujours';
  if (r.mode === 'weekly' && r.weekly) {
    const weeks = r.weeks || Math.max(1, Math.round(r.weekly.length / 7));
    const total = weeks * 7;
    const n = r.weekly.filter((id) => id === variantId).length;
    if (n === 0) return 'Jamais';
    if (n === total) return 'Tous les jours';
    if (weeks === 1) {
      const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
      return r.weekly.map((id, i) => id === variantId ? days[i] : null).filter(Boolean).join('·');
    }
    return n + 'j/' + total;
  }
  if (r.mode === 'cycle' && r.cycle) {
    const n = r.cycle.slots.filter((id) => id === variantId).length;
    return n + 'j/' + r.cycle.length;
  }
  return '';
}

/* ── Péremption (PAO) ─────────────────────────────────────────
   À partir d'une date d'ouverture (YYYY-MM-DD) et du PAO (mois), renvoie
   { exp:Date, expYMD, days } — days = jours avant péremption (négatif si
   déjà périmé). null si données incomplètes. Source unique partagée par
   « Mes produits » (skExpiry) et la section « Rappels ». */
function skareExpiry(openedAt, pao) {
  if (!openedAt || !pao) return null;
  const a = openedAt.split('-').map(Number);
  if (a.length < 3) return null;
  const exp = new Date(a[0], a[1] - 1, a[2]);
  exp.setMonth(exp.getMonth() + pao);
  const days = Math.round((skareMidnightTs(exp) - skareMidnightTs(new Date())) / 86400000);
  const p = (n) => String(n).padStart(2, '0');
  const expYMD = `${exp.getFullYear()}-${p(exp.getMonth() + 1)}-${p(exp.getDate())}`;
  return { exp, expYMD, days };
}

/* ── Palettes (fonds pleins/unis, glass posé dessus) ─────────── */
const SKARE_MORNING_PALETTES = {
  'Aube pêche':       { bgTop: '#FFE6CC', bgBot: '#FFC9A0', accent: '#E76F35', accentInk: '#FFFFFF', text: '#3E2616', muted: 'rgba(62,38,22,0.55)', dark: false },
  'Abricot vif':      { bgTop: '#FFD9B0', bgBot: '#FFB07A', accent: '#D9531E', accentInk: '#FFFFFF', text: '#43210F', muted: 'rgba(67,33,15,0.55)', dark: false },
  'Rosée corail':     { bgTop: '#FFE0D6', bgBot: '#FFB9AE', accent: '#E25563', accentInk: '#FFFFFF', text: '#46211F', muted: 'rgba(70,33,31,0.55)', dark: false },
};
const SKARE_EVENING_PALETTES = {
  'Bleu nuit':        { bgTop: '#222B5C', bgBot: '#121737', accent: '#8FA2FF', accentInk: '#10142F', text: '#ECEFFF', muted: 'rgba(236,239,255,0.62)', dark: true },
  'Violet profond':   { bgTop: '#2E1E54', bgBot: '#190F33', accent: '#B79BFF', accentInk: '#1C1038', text: '#F0EAFF', muted: 'rgba(240,234,255,0.62)', dark: true },
  'Ardoise nuit':     { bgTop: '#1C3040', bgBot: '#101D29', accent: '#6FD6CE', accentInk: '#0C1B1C', text: '#E7F4F4', muted: 'rgba(231,244,244,0.62)', dark: true },
};

/* ── Interpolation de palettes (crossfade matin ⇄ soir) ──────── */
function skareParseColor(c) {
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  const p = m[1].split(',').map((s) => parseFloat(s.trim()));
  return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
}
function skareLerpColor(a, b, t) {
  const ca = skareParseColor(a), cb = skareParseColor(b);
  const v = ca.map((x, i) => x + (cb[i] - x) * t);
  return `rgba(${Math.round(v[0])},${Math.round(v[1])},${Math.round(v[2])},${+v[3].toFixed(3)})`;
}
function skareLerpPalette(a, b, t) {
  return {
    bgTop: skareLerpColor(a.bgTop, b.bgTop, t),
    bgBot: skareLerpColor(a.bgBot, b.bgBot, t),
    accent: skareLerpColor(a.accent, b.accent, t),
    accentInk: skareLerpColor(a.accentInk, b.accentInk, t),
    text: skareLerpColor(a.text, b.text, t),
    muted: skareLerpColor(a.muted, b.muted, t),
    dark: t < 0.5 ? a.dark : b.dark,
  };
}

/* « Mon journal » — photos de progression. VIDE au premier lancement :
   l'utilisateur prend ses propres selfies. Forme d'une entrée :
     { id, date:'YYYY-MM-DD', img: Blob|null } */
const SKARE_JOURNAL = [];

Object.assign(window, {
  SKARE_PRODUCTS, SKARE_STEPS, SKARE_ACTIONS, SKARE_MY_PRODUCTS, SKARE_JOURNAL,
  SKARE_MORNING_PALETTES, SKARE_EVENING_PALETTES,
  skarePeriodNow, skareGreeting, skareDateLabel,
  SKARE_WEEKDAYS_FULL, skareHasPhotoThisWeek, skareShouldRemindPhoto,
  skareLerpPalette,
  skareTodayYMD, skareStepVariants, skareActiveVariant, skareWeekIndex,
  skareRotationSummary, skareVariantSchedule, SKARE_EMPTY_SLOT,
  skareExpiry,
});
