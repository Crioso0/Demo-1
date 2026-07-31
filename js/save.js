/* ------------------------------------------------------------------
   save.js — tiny localStorage-backed profile (gems + unlocked heroes)
------------------------------------------------------------------- */
const SAVE_KEY = 'balloon-bastion-demo-v1';

const Save = {
  data: { gems: 0, heroes: ['ember'], bestRound: 0, seenHelp: false, levels: 0, stars: {},
          mastery: {} },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed };
      }
    } catch (e) {
      /* corrupted or unavailable storage — fall back to a fresh profile */
      console.warn('save unavailable, running in memory only', e);
    }
    // the starter hero can never be missing
    if (!this.data.heroes.includes('ember')) this.data.heroes.unshift('ember');
    // profiles written before mastery existed simply start at zero
    if (!this.data.mastery) this.data.mastery = {};
    return this.data;
  },

  flush() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch (e) { /* private mode: keep playing without persistence */ }
  },

  get gems() { return this.data.gems; },
  addGems(n) { this.data.gems += n; this.flush(); return this.data.gems; },
  spendGems(n) {
    if (this.data.gems < n) return false;
    this.data.gems -= n; this.flush(); return true;
  },

  owns(id) { return this.data.heroes.includes(id); },
  ownedHeroes() { return HEROES.filter((h) => this.owns(h.id)); },
  lockedHeroes() { return HEROES.filter((h) => !this.owns(h.id)); },
  unlock(id) {
    if (this.owns(id)) return false;
    this.data.heroes.push(id); this.flush(); return true;
  },

  /* ---- hero mastery ---- */
  masteryOf(id) { return (this.data.mastery && this.data.mastery[id]) || 0; },
  rankOf(id) { return masteryRank(this.masteryOf(id)); },
  /** pay a squad for a cleared mission; returns what each hero gained */
  awardMastery(ids, missionNo, stars) {
    const gain = masteryGain(missionNo, stars);
    const out = [];
    for (const id of ids || []) {
      if (!HERO_BY_ID[id]) continue;
      const before = this.masteryOf(id);
      const after = Math.min(MASTERY_MAX, before + gain);
      this.data.mastery[id] = after;
      out.push({ id, gain: after - before, rankUp: masteryRank(after) > masteryRank(before),
                 rank: masteryRank(after) });
    }
    if (out.length) this.flush();
    return out;
  },

  recordRound(r) {
    if (r > this.data.bestRound) { this.data.bestRound = r; this.flush(); }
  },

  /* ---- campaign progress ---- */
  clearedLevels() { return this.data.levels || 0; },
  starsOn(n) { return (this.data.stars && this.data.stars[n]) || 0; },
  totalStars() {
    return Object.values(this.data.stars || {}).reduce((a, b) => a + b, 0);
  },

  /** every mission in a chapter three-starred? that is what opens the next city */
  chapterMastered(chapterId) {
    return LEVELS.filter((l) => l.chapter === chapterId).every((l) => this.starsOn(l.n) >= 3);
  },
  chapterUnlocked(chapterId) {
    const idx = CHAPTERS.findIndex((c) => c.id === chapterId);
    if (idx <= 0) return true;
    return this.chapterMastered(CHAPTERS[idx - 1].id);
  },

  isUnlocked(n) {
    const lv = LEVEL_BY_N[n];
    if (!lv) return false;
    if (!this.chapterUnlocked(lv.chapter)) return false;
    if (lv.mission === 1) return true;              // first mission of an open city
    return this.starsOn(n - 1) >= 1;                // otherwise clear the one before
  },

  clearLevel(n, stars) {
    if (n > this.clearedLevels()) this.data.levels = n;
    if (!this.data.stars) this.data.stars = {};
    if (stars > this.starsOn(n)) this.data.stars[n] = stars;
    this.flush();
  },
  campaignComplete() {
    return LEVELS.every((l) => this.starsOn(l.n) >= 1);
  },
};
