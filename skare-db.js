/* ────────────────────────────────────────────────────────────────
   SKARE — Couche de données locale (Dexie.js / IndexedDB)
   Plain JS (pas de JSX). Exposé sur window (SkareDB) comme skare-data.js.

   Persistance hors-ligne de tout ce que l'utilisateur fait :
   routine (étapes + coches), produits possédés, journal photo.

   skare-data.js reste la SOURCE DE VÉRITÉ du seed initial : au premier
   lancement on recopie les constantes SKARE_* dans la base, puis on
   pose meta.seeded = true. Ensuite la base fait foi.

   Schéma (voir DELIVERABLES) :
     products:   'id, name'              catalogue d'actifs (SKARE_PRODUCTS)
     myProducts: 'id, productId'         produits possédés (SKARE_MY_PRODUCTS)
     steps:      'id, routineId, order'  étapes (SKARE_STEPS matin+soir aplati)
     journal:    'id, date'              photos (img = Blob, pas de dataURL)
     meta:       'key'                   état appli (seeded, schemaVersion…)

   Les images du journal sont stockées en Blob (champ `img`), jamais en
   base64, pour garder la base petite et rapide. L'UI les affiche via
   URL.createObjectURL (révoqué proprement côté composant).
   ──────────────────────────────────────────────────────────────── */

const db = new Dexie('skare');
db.version(1).stores({
  products: 'id, name',
  myProducts: 'id, productId',
  steps: 'id, routineId, order',
  journal: 'id, date',
  meta: 'key',
});
/* v2 : table `catalog` = cache local du catalogue (products.json importé une
   fois), pour ne pas re-parser le gros JSON (~25 Mo) à chaque démarrage. */
db.version(2).stores({ catalog: 'id' });

/* matin = routineId 1 · soir = routineId 2 */
const SKARE_ROUTINE_IDS = { morning: 1, evening: 2 };

/* Clés conservées du catalogue (on ignore price/image/url/inci/origin). */
const SKARE_CATALOG_KEEP = ['id', 'brand', 'name', 'note', 'icon', 'pao', 'actives'];
function skareStripCatalog(p) {
  const o = {};
  SKARE_CATALOG_KEEP.forEach((k) => { if (p[k] !== undefined) o[k] = p[k]; });
  if (!Array.isArray(o.actives)) o.actives = [];
  return o;
}

/* Version du catalogue importé. Bump si products.json change → réimport. */
const SKARE_CATALOG_VERSION = 1;
/* Importe products.json (source unique) UNE fois dans IndexedDB, réduit aux
   clés du modèle SKARE. Aux lancements suivants on lit le cache `catalog`. */
async function skareImportCatalogIfNeeded() {
  const v = await db.meta.get('catalogVersion');
  if (v && v.value === SKARE_CATALOG_VERSION) return;
  const res = await fetch('products.json', { cache: 'force-cache' });
  if (!res.ok) throw new Error('products.json ' + res.status);
  const data = await res.json();
  const lean = (Array.isArray(data) ? data : []).map(skareStripCatalog);
  await db.transaction('rw', db.catalog, db.meta, async () => {
    await db.catalog.clear();
    await db.catalog.bulkPut(lean);
    await db.meta.put({ key: 'catalogVersion', value: SKARE_CATALOG_VERSION });
  });
}

/* ── Seed (premier lancement uniquement) ─────────────────────
   Le catalogue ne vit PLUS en base (il vient du scrap, rechargé à chaque
   démarrage). On ne sème donc plus db.products ; db.products ne contiendra
   que les produits personnalisés créés par l'utilisateur. */
async function skareSeedIfNeeded() {
  const flag = await db.meta.get('seeded');
  if (flag && flag.value) return;
  await db.transaction('rw', db.myProducts, db.steps, db.journal, db.meta, async () => {
    await db.myProducts.bulkPut(SKARE_MY_PRODUCTS.map((p) => ({ ...p })));
    const flat = [...SKARE_STEPS.morning, ...SKARE_STEPS.evening].map((s) => ({ ...s }));
    await db.steps.bulkPut(flat);
    await db.journal.bulkPut(SKARE_JOURNAL.map((j) => ({ id: j.id, date: j.date, img: j.img || null })));
    await db.meta.put({ key: 'seeded', value: true });
    await db.meta.put({ key: 'schemaVersion', value: 1 });
  });
}

/* ── Lecture de l'état initial (hydratation de l'app) ───────── */
async function skareLoadState() {
  const [myProducts, steps, journal] = await Promise.all([
    db.myProducts.toArray(),
    db.steps.toArray(),
    db.journal.toArray(),
  ]);
  const byRoutine = (rid) => steps.filter((s) => s.routineId === rid).sort((a, b) => a.order - b.order);
  return {
    routines: { morning: byRoutine(1), evening: byRoutine(2) },
    myProducts,
    journal, // { id, date, img: Blob|null } — le composant fabrique les object URLs
  };
}

/* Ouvre la base, seed si besoin, renvoie l'état complet. */
async function skareInit() {
  await db.open();
  await skareSeedIfNeeded();

  // Catalogue = products.json (source unique), importé une fois en base puis
  // relu depuis le cache `catalog`. On MUTE le tableau partagé
  // window.SKARE_PRODUCTS en place (les autres scripts gardent la même réf).
  try { await skareImportCatalogIfNeeded(); }
  catch (e) { console.warn('SKARE — import catalogue', e); }
  try {
    const cat = await db.catalog.toArray();
    window.SKARE_PRODUCTS.length = 0;
    cat.forEach((p) => window.SKARE_PRODUCTS.push(p));
  } catch (e) { console.warn('SKARE — lecture catalogue', e); }

  // Migration unique : retire UNIQUEMENT les anciens produits factices semés
  // en base (ids 1..12). Les produits perso créés à la main ont un id =
  // Date.now() (~13 chiffres) et sont donc CONSERVÉS.
  try {
    const migrated = await db.meta.get('catalogExternal');
    if (!migrated || !migrated.value) {
      await db.products.bulkDelete([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      await db.meta.put({ key: 'catalogExternal', value: true });
    }
  } catch (e) {/* ignore */}

  // Réinitialise les coches au changement de jour → routine « fraîche »
  // chaque matin (les étapes ne restent pas cochées d'un jour à l'autre).
  try {
    const today = window.skareTodayYMD ? window.skareTodayYMD() : new Date().toISOString().slice(0, 10);
    const ld = await db.meta.get('lastDay');
    if (!ld || ld.value !== today) {
      await db.steps.toCollection().modify({ done: false });
      await db.meta.put({ key: 'lastDay', value: today });
    }
  } catch (e) {/* ignore */}

  // Ajoute les produits personnalisés persistés au catalogue courant
  // (marqués `custom: true` pour les distinguer du catalogue scrapé).
  try {
    const custom = await db.products.toArray();
    const known = new Set(window.SKARE_PRODUCTS.map((p) => p.id));
    custom.forEach((p) => { p.custom = true; if (!known.has(p.id)) window.SKARE_PRODUCTS.push(p); });
  } catch (e) {/* catalogue déjà à jour */}

  return skareLoadState();
}

/* Un produit « saisi à la main » (vs catalogue scrapé) : marqué custom, ou
   id de type timestamp (Date.now) pour les anciens créés avant le flag. */
function skareIsCustomProduct(p) {
  return !!(p && (p.custom === true || (typeof p.id === 'number' && p.id > 1e12)));
}

/* Crée/persiste un produit personnalisé et l'ajoute au catalogue global. */
async function skareAddProduct(prod) {
  const p = { ...prod, custom: true };
  await db.products.put(p);
  const cat = window.SKARE_PRODUCTS || [];
  const i = cat.findIndex((x) => x.id === p.id);
  if (i >= 0) cat[i] = p; else cat.push(p);
  return p;
}

/* Met à jour un produit personnalisé (persistance + catalogue en place). */
async function skareUpdateProduct(prod) {
  const p = { ...prod, custom: true };
  await db.products.put(p);
  const cat = window.SKARE_PRODUCTS || [];
  const i = cat.findIndex((x) => x.id === p.id);
  if (i >= 0) cat[i] = p; else cat.push(p);
  return p;
}

/* Supprime un produit personnalisé (base + catalogue en place). */
async function skareRemoveProduct(id) {
  await db.products.delete(id);
  const cat = window.SKARE_PRODUCTS || [];
  const i = cat.findIndex((x) => x.id === id);
  if (i >= 0) cat.splice(i, 1);
}

/* ── Écriture « write-through » (par table) ─────────────────────
   Les tables sont petites ; on réécrit la table concernée à chaque
   mutation, ce qui garde `order` contigu et évite toute désync.
   L'app fait la mise à jour optimiste de l'état React puis appelle
   ces fonctions dans le même handler. ──────────────────────────── */

/* Aplati matin+soir et réindexe `order` (0..n) par routine. */
async function skareSaveRoutines(routines) {
  const flat = [];
  ['morning', 'evening'].forEach((period) => {
    const rid = SKARE_ROUTINE_IDS[period];
    (routines[period] || []).forEach((s, i) => {
      flat.push({ ...s, routineId: rid, order: i });
    });
  });
  await db.transaction('rw', db.steps, async () => {
    await db.steps.clear();
    await db.steps.bulkPut(flat);
  });
}

async function skareSaveMyProducts(list) {
  await db.transaction('rw', db.myProducts, async () => {
    await db.myProducts.clear();
    await db.myProducts.bulkPut((list || []).map((p) => ({ ...p })));
  });
}

/* Le journal en mémoire porte `blob` (Blob original) à côté de `img`
   (object URL d'affichage). On ne persiste que id/date/Blob. */
async function skareSaveJournal(list) {
  await db.transaction('rw', db.journal, async () => {
    await db.journal.clear();
    await db.journal.bulkPut((list || []).map((e) => ({
      id: e.id, date: e.date, img: e.blob || null,
    })));
  });
}

Object.assign(window, {
  SkareDB: {
    db,
    init: skareInit,
    loadState: skareLoadState,
    saveRoutines: skareSaveRoutines,
    saveMyProducts: skareSaveMyProducts,
    saveJournal: skareSaveJournal,
    addProduct: skareAddProduct,
    updateProduct: skareUpdateProduct,
    removeProduct: skareRemoveProduct,
    isCustomProduct: skareIsCustomProduct,
    ROUTINE_IDS: SKARE_ROUTINE_IDS,
  },
});
