/* ------------------------------------------------------------------
   save.js — tiny localStorage-backed profile (gems + unlocked heroes)
------------------------------------------------------------------- */
const SAVE_KEY = 'balloon-bastion-demo-v1';

const Save = {
  data: { gems: 0, heroes: ['ember'], bestRound: 0, seenHelp: false },

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

  recordRound(r) {
    if (r > this.data.bestRound) { this.data.bestRound = r; this.flush(); }
  },
};
