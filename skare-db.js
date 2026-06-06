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

/* matin = routineId 1 · soir = routineId 2 */
const SKARE_ROUTINE_IDS = { morning: 1, evening: 2 };

/* ── Seed (premier lancement uniquement) ───────────────────── */
async function skareSeedIfNeeded() {
  const flag = await db.meta.get('seeded');
  if (flag && flag.value) return;
  await db.transaction('rw', db.products, db.myProducts, db.steps, db.journal, db.meta, async () => {
    await db.products.bulkPut(SKARE_PRODUCTS.map((p) => ({ ...p })));
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
  // Fusionne les produits persistés (seed + produits personnalisés créés
  // par l'utilisateur) dans le catalogue global lu par l'UI.
  try {
    const prods = await db.products.toArray();
    const known = new Set((window.SKARE_PRODUCTS || []).map((p) => p.id));
    prods.forEach((p) => { if (!known.has(p.id)) window.SKARE_PRODUCTS.push(p); });
  } catch (e) {/* catalogue déjà à jour */}
  return skareLoadState();
}

/* Crée/persiste un produit personnalisé et l'ajoute au catalogue global. */
async function skareAddProduct(prod) {
  await db.products.put({ ...prod });
  if (!(window.SKARE_PRODUCTS || []).some((p) => p.id === prod.id)) window.SKARE_PRODUCTS.push(prod);
  return prod;
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
    ROUTINE_IDS: SKARE_ROUTINE_IDS,
  },
});
