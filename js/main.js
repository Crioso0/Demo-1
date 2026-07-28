/* ------------------------------------------------------------------
   main.js — boot + the render loop
------------------------------------------------------------------- */
(function boot() {
  Save.load();

  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  UI.init(game);

  let last = performance.now();
  let hudTick = 0;

  function frame(now) {
    /* clamp so an alt-tab pause doesn't teleport a whole wave */
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const inGame = document.getElementById('screen-game').classList.contains('active');
    if (inGame) {
      game.update(dt);
      game.draw();

      hudTick -= dt;
      if (hudTick <= 0) {
        hudTick = 0.1;
        UI.syncHud();
        UI.syncShop();
        UI.syncInspect();
      }
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  /* expose for quick tinkering in the console during the demo */
  window.BB = { game, UI, Save };
})();
