/* Minimal PJAX + global audio so music persists across internal navigation */
(function(){
  const AUDIO_ID = 'ambientAudio';
  const TOGGLE_ID = 'soundToggle';

  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  function sameOrigin(href){ try { const u = new URL(href, location.href); return u.origin === location.origin; } catch { return false; } }
  function isHash(href){ try { const u = new URL(href, location.href); return u.hash && (u.pathname === location.pathname) && !u.search; } catch { return false; } }

  function ensureAudio(){
    let audio = document.getElementById(AUDIO_ID);
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = AUDIO_ID;
      audio.preload = 'none';
      audio.loop = true;
      const src = document.createElement('source');
      src.src = 'media/audio.mp3';
      src.type = 'audio/mpeg';
      audio.appendChild(src);
      document.body.appendChild(audio);
    }
    return audio;
  }

  function getSoundPreference(){
    const saved = localStorage.getItem('soundEnabled');
    return saved === null ? true : saved === 'true';
  }

  function setSoundPreference(enabled){
    localStorage.setItem('soundEnabled', String(enabled));
  }

  function updateSoundButton(enabled){
    const btn = document.getElementById(TOGGLE_ID);
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(!!enabled));
    btn.textContent = enabled ? 'Sound On' : 'Sound Off';
    btn.setAttribute('aria-label', enabled ? 'Sound on' : 'Sound off');
  }

  function fadeVolume(audio, target, ms=300){
    const start = audio.volume;
    const steps = Math.max(1, Math.floor(ms / 50));
    let i = 0;
    const t = setInterval(()=>{
      i++;
      const v = start + (target - start) * (i/steps);
      audio.volume = Math.max(0, Math.min(1, v));
      if (i >= steps) { clearInterval(t); if (target === 0) audio.pause(); }
    }, 50);
  }

  function bindAudioControls(){
    // Avoid double-binding if index already manages audio
    if (window.__audioControllerActive) return;
    const btn = document.getElementById(TOGGLE_ID);
    if (!btn) return;
    const audio = ensureAudio();
    
    // Load saved preference
    const savedEnabled = getSoundPreference();
    audio.volume = savedEnabled ? 1 : 0;
    updateSoundButton(savedEnabled);
    
    // Auto-play if user previously enabled sound
    if (savedEnabled) {
      try { audio.play(); } catch(_){}
    }
    
    btn.addEventListener('click', ()=>{
      const enable = btn.getAttribute('aria-pressed') !== 'true';
      updateSoundButton(enable);
      setSoundPreference(enable);
      
      if (enable) {
        try { audio.play(); } catch(_){}
        fadeVolume(audio, 1, 400);
      } else {
        fadeVolume(audio, 0, 400);
      }
    }, { once: false });
  }

  function ensureHeroVideoLoaded(){
    const bg = document.getElementById('bgVideo');
    if (!bg || bg.dataset.loaded) return;
    const s = document.createElement('source');
    s.src = 'media/oceanvideo.mp4';
    s.type = 'video/mp4';
    bg.appendChild(s);
    bg.dataset.loaded = '1';
    bg.muted = true;
    const p = bg.play();
    if (p && typeof p.then === 'function') p.catch(()=>{});
  }

  function setBodyStage2(){
    document.body.classList.remove('stage-0','stage-1');
    document.body.classList.add('stage-2');
    const overlay = document.getElementById('blackOverlay');
    if (overlay) overlay.classList.add('is-hidden');
  }

  function updateAriaCurrent(url){
    const path = new URL(url, location.href).pathname.replace(/\/index\.html$/,'/');
    $all('.site-nav a').forEach(a=>{
      const aPath = new URL(a.getAttribute('href'), location.href).pathname.replace(/\/index\.html$/,'/');
      if (aPath === path) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
    });
  }

  function updateYear(){
    const y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }

  function initPageFeatures(root){
    updateYear();
    // Services estimator
    const est = root.querySelector('#estimator2');
    if (est) {
      const get = id => root.querySelector('#'+id);
      const hours = get('hours2'), locations = get('locations2'), deliverables = get('deliverables2');
      const out = get('estimateText2');
      const price = () => {
        const h = Number(hours.value), l = Number(locations.value), d = Number(deliverables.value);
        const base = 1200, hourly = 1500, perLoc = 800, perDel = 120;
        return Math.round((base + h*hourly + Math.max(0,l-1)*perLoc + d*perDel)/50)*50;
      };
      const update = () => { if (out) out.textContent = `Estimated: MXN $${price().toLocaleString('en-US')}`; };
      if (hours) hours.addEventListener('input', update);
      if (locations) locations.addEventListener('input', update);
      if (deliverables) deliverables.addEventListener('input', update);
      update();
      est.addEventListener('submit', (e)=>{ e.preventDefault(); const email = (root.querySelector('#email2')||{}).value?.trim?.()||''; if(!email) return alert('Please enter an email.'); alert('Thanks! Your estimate has been recorded.'); });
    }
    // Contact form
    const form = root.querySelector('#contactForm');
    if (form && !form.hasAttribute('data-managed')) {
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        const data = new FormData(form);
        if (!data.get('name') || !data.get('email')) { alert('Please provide your name and email.'); return; }
        alert('Thanks! We will get back to you shortly.');
      });
    }
  }

  async function loadPage(url, replaceState){
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // 1. Handle Stylesheets (<link rel="stylesheet">)
      // We need to load new stylesheets that aren't already in the current document
      const newLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
      const currentLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
      
      newLinks.forEach(link => {
        if (!currentLinks.includes(link.href)) {
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = link.href;
            document.head.appendChild(newLink);
        }
      });

      // 2. Handle Inline Styles (<style>)
      // Bring over any inline <style> from the new head (page-specific CSS)
      const newStyles = Array.from(doc.head ? doc.head.querySelectorAll('style') : []);
      newStyles.forEach(ns => {
        const text = ns.textContent || '';
        const exists = Array.from(document.head.querySelectorAll('style[data-pjax-style]')).some(s => s.textContent === text);
        if (!exists && text.trim()) {
          const s = document.createElement('style');
          s.setAttribute('data-pjax-style','');
          s.textContent = text;
          document.head.appendChild(s);
        }
      });

      // 3. Swap Content
      const newMain = doc.querySelector('#main');
      if (!newMain) { location.href = url; return; }
      const curMain = document.getElementById('main');
      if (!curMain) { location.href = url; return; }
      curMain.replaceWith(newMain);
      document.title = doc.title || document.title;
      updateAriaCurrent(url);
      
      if (!replaceState) history.pushState({}, '', url);
      window.scrollTo(0,0);
      
      // 4. Handle Scripts
      // We need to load external scripts and execute inline scripts
      // This is crucial for portfolio.js and sphere-gallery.js
      const newScripts = Array.from(doc.querySelectorAll('script'));
      const currentScripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
      
      for (const script of newScripts) {
          // Skip if it's the main app.js or already loaded
          if (script.src && currentScripts.includes(script.src)) continue;
          if (script.src && script.src.includes('app.js')) continue;
          
          if (script.src) {
              // External script: Load it sequentially
              await new Promise((resolve, reject) => {
                  const s = document.createElement('script');
                  s.src = script.src;
                  s.onload = resolve;
                  s.onerror = resolve; // Continue even if fails
                  document.body.appendChild(s);
              });
          } else {
              // Inline script: Execute it
              // We wrap in a try-catch to prevent one error stopping everything
              try {
                  // Use indirect eval to execute in global scope
                  (0, eval)(script.textContent);
              } catch (e) {
                  console.error('Script execution error:', e);
              }
          }
      }

      // 5. Re-initialize Global Modules
      // Explicitly check for known modules if they weren't triggered by inline scripts
      if (window.PortfolioParallax && typeof window.PortfolioParallax.init === 'function') {
          window.PortfolioParallax.init();
      }
      if (window.SphereGallery && typeof window.SphereGallery.init === 'function') {
          window.SphereGallery.init();
      }

      // If navigating to Home, ensure final stage and load video immediately
      const u = new URL(url, location.href);
      const toHome = /(?:^|\/)index\.html$/.test(u.pathname) || u.pathname === '/' || u.pathname === '';
      if (toHome) {
        setBodyStage2();
        ensureHeroVideoLoaded();
      }
      
      initPageFeatures(document);
      // Keep audio available across navigation
      ensureAudio();
    } catch (e) {
      console.error('PJAX Error:', e);
      // Fallback to hard navigation
      location.href = url;
    }
  }

  // Global link interceptor
  document.addEventListener('click', (e)=>{
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!sameOrigin(href) || isHash(href)) return;
    e.preventDefault();
    loadPage(href, false);
  }, { capture: true });

  window.addEventListener('popstate', ()=>{ loadPage(location.href, true); });

  // Init
  ensureAudio();
  bindAudioControls();
  initPageFeatures(document);
})();
