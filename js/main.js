/* ==========================================================================
   CIEL BY DSR - MAIN INTERACTION & ANIMATION SCRIPT
   ========================================================================== */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Always start at the top on a fresh load/refresh, even if the URL has a #section hash */
if (window.location.hash) {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}
window.scrollTo(0, 0);
if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }

if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  /* Opening the on-screen keyboard fires a window resize, and ScrollTrigger
     answers a resize by re-measuring every trigger - including the pinned hero.
     On a phone that re-measure is visible as the page lurching up and down
     while you are typing. ignoreMobileResize tells ScrollTrigger to sit out the
     height-only viewport changes a mobile browser makes (keyboard, URL bar)
     and keep the measurements it already has. */
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ignoreMobileResize alone was not enough on Chrome for Android, which still
     re-measured while the keyboard was open. Drop 'resize' from the refresh
     triggers entirely on touch devices and refresh on orientationchange
     instead: a phone's width only really changes when it is turned, whereas
     its height changes constantly (keyboard, URL bar) and none of those
     warrant re-measuring a pinned section. Desktop keeps resize, where a
     window drag is a genuine layout change. */
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) {
    ScrollTrigger.config({
      autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load,orientationchange'
    });
  }
}

/* Progress bar */
const progressBar = document.getElementById('progressBar');
function updateProgress(){
  const h = document.documentElement;
  /* Guard the divide: a page shorter than the viewport gives 0, which would
     otherwise write scaleX(NaN) and leave the bar at its last value. */
  const span = h.scrollHeight - h.clientHeight;
  const pct = span > 0 ? h.scrollTop / span : 0;
  progressBar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, pct)) + ')';
}
window.addEventListener('scroll', updateProgress, { passive:true });
/* Also on load and resize: a scroll-only listener leaves the bar stale after
   the viewport changes, and wrong on a page restored mid-scroll. */
window.addEventListener('resize', updateProgress, { passive:true });
updateProgress();

/* Nav scroll state */
const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 30), { passive:true });

/* Mobile menu */
const menuToggle = document.getElementById('menuToggle');
const mobileNav = document.getElementById('mobileNav');
/* One helper so the drawer, the burger's X state and aria-expanded can never
   drift out of sync — the header button doubles as the close control. */
function setMenu(open){
  mobileNav.classList.toggle('open', open);
  menuToggle.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  lockScroll(open);
}
/* ── Scroll lock while the drawer is open ──
   The drawer is a fixed, full-viewport overlay, but a wheel turn or a touch-drag
   over it still scrolls the page underneath, so the menu reads as sliding around
   over a moving page. The gestures are blocked here rather than with the usual
   `overflow:hidden` on html/body: that swaps which element is the scroller,
   which forces ScrollTrigger to re-measure and drops the pinned hero. The drawer
   has no scrollable content of its own, so nothing legitimate is being blocked.
   Escape is untouched, so the keyboard can always back out. */
const SCROLL_KEYS = new Set(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Spacebar']);
function blockGesture(e){
  /* Let .mn-list (the index) scroll its own overflow on a short screen — overscroll-behavior
     stops that from chaining to the page at either end. Everything else, including
     a drag over a list that has nothing to scroll, is the page moving underneath. */
  const list = e.target && e.target.closest && e.target.closest('.mn-list');
  if(list && list.scrollHeight > list.clientHeight) return;
  e.preventDefault();
}
function blockScrollKeys(e){
  if(!SCROLL_KEYS.has(e.key)) return;
  if(e.target && e.target.closest && e.target.closest('input,textarea,select')) return;
  blockGesture(e);
}
function lockScroll(on){
  const bind = on ? 'addEventListener' : 'removeEventListener';
  window[bind]('wheel', blockGesture, { passive:false });
  window[bind]('touchmove', blockGesture, { passive:false });
  window[bind]('keydown', blockScrollKeys, { passive:false });
}
menuToggle.addEventListener('click', () => setMenu(!mobileNav.classList.contains('open')));
mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
/* Escape backs out without having to pick a destination. */
document.addEventListener('keydown', e => { if(e.key === 'Escape') setMenu(false); });
setMenu(false);

/* ---------- In-page anchor scrolling ----------
   This used to be `html{ scroll-behavior:smooth }`, which is a trap next to a
   ScrollTrigger pin: it smooths *every* scroll assignment, including the instant
   jumps ScrollTrigger makes to re-measure the page on refresh (a tab switch or a
   resize both trigger one). The measurement then lands mid-animation, so the
   hero pin records its start/end relative to wherever the visitor happened to be
   — deep negative numbers — and never re-engages. The hero is left unpinned and
   translated a screen and a bit down its spacer, showing an empty gap until the
   page is reloaded.

   Smoothing the navigation here instead keeps it on real clicks only, where the
   scroll is meant to animate. scrollIntoView rather than scrollTo, so the
   `section[id]{ scroll-margin-top:96px }` rule still clears the fixed header. */
document.addEventListener('click', e => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = e.target.closest('a[href^="#"]');
  if (!link || link.target === '_blank') return;
  const id = link.getAttribute('href').slice(1);
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  const behavior = reduced ? 'auto' : 'smooth';
  /* #top is <main>, which carries the same scroll-margin — go to the real top. */
  if (id === 'top') window.scrollTo({ top:0, behavior });
  else target.scrollIntoView({ behavior, block:'start' });
  history.replaceState(null, '', '#' + id);
});

/* Custom cursor */
if (!reduced && window.matchMedia('(hover:hover)').matches) {
  document.documentElement.classList.add('custom-cursor-active');
  const logo = document.getElementById('cursorLogo');
  let mx=0,my=0,rx=0,ry=0;
  window.addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; });
  function loop(){ rx += (mx-rx)*0.2; ry += (my-ry)*0.2; logo.style.left=rx+'px'; logo.style.top=ry+'px'; requestAnimationFrame(loop); }
  loop();
  document.addEventListener('mouseover', e => { if(e.target.closest('a,button,.hotspot')) logo.classList.add('grow'); });
  document.addEventListener('mouseout', e => { if(e.target.closest('a,button,.hotspot')) logo.classList.remove('grow'); });
}

/* ---------- Hero gate / loading screen ----------
   The gate leaves double as the site's loading screen: they stay shut until hero
   clip 1 has buffered enough to play without stalling, showing real progress off
   the video's own buffered ranges.

   Note this must NOT hang off window 'load' — that does not fire until every
   subresource is down, including the video itself, so the gate would sit shut
   for the whole download. We wait on the video's readyState instead, and always
   open on a hard deadline so a stalled network can never trap the visitor.

   Opening dispatches 'ciel:gateopen'. The video sequencer waits for that before
   starting clip 1, so playback begins from frame 0 on a visible hero rather than
   running unseen behind the curtain. */
window.CIEL_GATE_OPEN = false;
(function(){
  const heroSection = document.getElementById('heroSection');
  if(!heroSection) return;
  const loader = document.getElementById('heroLoader');
  const fill   = document.getElementById('heroLoaderFill');
  const label  = document.getElementById('heroLoaderLabel');
  const video  = document.querySelector('#heroPanel1 video');

  /* Buffer this many seconds before opening — enough runway that playback does
     not immediately stall, without waiting for the whole clip. */
  const BUFFER_TARGET = 4;
  /* Open regardless after this long, even on a slow connection. The poster
     carries the hero until the video catches up, so this is a ceiling on how
     long anyone stares at a loading screen, not a promise that video is ready. */
  const MAX_WAIT = 12000;

  let opened = false;
  let poll = null;

  function bufferedAhead(){
    if(!video || !video.buffered || !video.buffered.length) return 0;
    let end = 0;
    for(let i = 0; i < video.buffered.length; i++){
      end = Math.max(end, video.buffered.end(i));
    }
    return end;
  }

  function ready(){
    if(!video) return true;                 // nothing to wait for
    /* Deliberately NOT readyState >= 3 / the 'canplay' event: those mean only
       "enough to begin", often well under a second of footage, so the gate would
       open and the clip would immediately stall. Wait for real buffered runway,
       or readyState 4 (HAVE_ENOUGH_DATA) which is the browser's own promise that
       it can play through without stalling. */
    return bufferedAhead() >= BUFFER_TARGET || video.readyState >= 4;
  }

  function tick(){
    if(!fill) return;
    const target = video && video.duration
      ? Math.min(BUFFER_TARGET, video.duration)
      : BUFFER_TARGET;
    const pct = Math.max(0, Math.min(1, bufferedAhead() / target));
    fill.style.width = (pct * 100).toFixed(1) + '%';
    if(label && pct > 0) label.textContent = 'LOADING ' + Math.round(pct * 100) + '%';
    if(ready()) openGate();
  }

  function openGate(){
    if(opened) return;
    opened = true;
    clearInterval(poll);
    if(fill) fill.style.width = '100%';
    /* Only reset the scroll if nobody has moved. The page is fully scrollable
       while the loader is up - the gate leaves and the loader are positioned
       inside the hero, not over the document - and this fires on the 12s
       deadline as well as on buffer, so an unconditional reset threw anyone
       who had started reading back to the hero. */
    if(window.scrollY < 2) window.scrollTo(0, 0);
    setTimeout(function(){
      heroSection.classList.add('is-open');
      window.CIEL_GATE_OPEN = true;
      document.dispatchEvent(new CustomEvent('ciel:gateopen'));
      /* Drop the loader out of the layer stack once it has faded. */
      setTimeout(function(){ if(loader) loader.style.display = 'none'; }, 700);
    }, reduced ? 0 : 350);
  }

  if(reduced || !video){ openGate(); return; }

  video.addEventListener('loadeddata', tick);
  video.addEventListener('progress', tick);
  video.addEventListener('canplaythrough', openGate);
  /* If the clip 404s or the codec is unsupported, don't strand the visitor. */
  video.addEventListener('error', openGate);
  poll = setInterval(tick, 200);
  setTimeout(openGate, MAX_WAIT);
  tick();
})();

/* Webverse CTAs open a preview until the full experience is ready. */
const webverseSoonOverlay = document.getElementById('webverseSoonOverlay');
const webverseSoonClose = document.getElementById('webverseSoonClose');
let webverseSoonOpener = null;
function closeWebverseSoon(){
  if (!webverseSoonOverlay.classList.contains('open')) return;
  webverseSoonOverlay.classList.remove('open');
  webverseSoonOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (webverseSoonOpener) {
    (webverseSoonOpener.closest('.mobile-nav') ? menuToggle : webverseSoonOpener).focus();
  }
}
document.querySelectorAll('[data-webverse-soon]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    webverseSoonOpener = link;
    webverseSoonOverlay.classList.add('open');
    webverseSoonOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    webverseSoonClose.focus();
  });
});
webverseSoonClose.addEventListener('click', closeWebverseSoon);
document.getElementById('webverseSoonBack').addEventListener('click', closeWebverseSoon);
webverseSoonOverlay.addEventListener('click', e => { if (e.target === webverseSoonOverlay) closeWebverseSoon(); });
document.addEventListener('keydown', e => {
  if (!webverseSoonOverlay.classList.contains('open')) return;
  if (e.key === 'Escape') closeWebverseSoon();
  if (e.key === 'Tab') {
    /* Trap across whichever step is showing: close button to its last control. */
    const step = webverseSoonOverlay.querySelector('.wv-step:not([hidden])');
    const controls = step.querySelectorAll('input:not(.lead-hp), button');
    const last = controls[controls.length - 1];
    if (e.shiftKey && document.activeElement === webverseSoonClose) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); webverseSoonClose.focus(); }
  }
});

/* Webverse demo request. The thank-you says someone will call, so it only
   shows once the CRM has accepted the lead; a failure leaves the form up with
   the message (and sales number) CielLead returns. Once sent, reopening the
   dialog shows the thank-you again rather than inviting a duplicate lead. */
(function(){
  const form = document.getElementById('webverseForm');
  const nameEl = document.getElementById('wvName');
  const phoneEl = document.getElementById('wvPhone');
  const errEl = document.getElementById('wvErr');
  const submitBtn = document.getElementById('wvSubmit');

  function fail(el, msg){ el.classList.add('is-bad'); errEl.textContent = msg; el.focus(); }
  [nameEl, phoneEl].forEach(el => el.addEventListener('input', () => {
    el.classList.remove('is-bad'); errEl.textContent = '';
  }));

  function showThanks(){
    document.getElementById('webverseFormStep').hidden = true;
    document.getElementById('webverseThanksStep').hidden = false;
    document.getElementById('webverseSoonBack').focus();
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    /* Bot filled the honeypot: show the thank-you, save nothing. */
    if (window.CielLead.trap(form)) { showThanks(); return; }

    errEl.textContent = '';
    if (!nameEl.value.trim()) return fail(nameEl, 'Please enter your name.');
    const phone = window.CielLead.phone(phoneEl.value);
    if (!phone) return fail(phoneEl, 'Enter a valid 10-digit Indian mobile number.');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    window.CielLead.save({
      leadId: window.CielLead.newId(),
      name  : nameEl.value.trim(),
      phone : phone,
      source: 'Webverse demo request',
      notes : 'Asked for a Webverse demo from the website. Representative to call.'
    }).then(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Request Demo';
      form.reset();
      showThanks();
    }, err => {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Request Demo';
      errEl.textContent = err.message;
    });
  });
})();

/* Amenity descriptions are expanded for touch devices by the @media (hover:none)
   block in CSS — no JS toggle needed. */

const revealEls = document.querySelectorAll('.reveal, .split');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); } });
  }, { threshold:.15, rootMargin:'0px 0px -60px 0px' });
  revealEls.forEach(el => io.observe(el));
} else { revealEls.forEach(el => el.classList.add('is-visible')); }

/* Split-text wrap for hero h1.
   Wraps each word in its own span for the staggered entry. Walks text nodes
   rather than rewriting innerHTML, so inline markup inside the heading — the
   <em> on "the Ordinary." — survives the split. */
document.querySelectorAll('.split').forEach(el => {
  const texts = [];
  (function collect(node){
    node.childNodes.forEach(child => {
      if (child.nodeType === 3) texts.push(child); else collect(child);
    });
  })(el);

  let i = 0;
  texts.forEach(node => {
    const frag = document.createDocumentFragment();
    // Keep the separators so words stay spaced once spans go inline-block.
    node.textContent.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (!part.trim()){ frag.appendChild(document.createTextNode(part)); return; }
      const span = document.createElement('span');
      span.style.transitionDelay = (i++ * 0.06) + 's';
      span.textContent = part;
      frag.appendChild(span);
    });
    node.parentNode.replaceChild(frag, node);
  });
});
setTimeout(() => document.querySelectorAll('.split').forEach(el => el.classList.add('is-visible')), reduced ? 100 : 1500);

/* Masterplan hotspots */
const mpTitle = document.getElementById('mpTitle');
const mpSpecs = document.getElementById('mpSpecs');
const hotspots = document.querySelectorAll('.hotspot');
function activateHotspot(hs){
    hotspots.forEach(h => h.classList.remove('active'));
    hs.classList.add('active');
    mpTitle.textContent = hs.dataset.tower;
    mpSpecs.innerHTML =
      '<div><span class="lbl">Floors</span><b>'+hs.dataset.floors+'</b></div>'+
      '<div><span class="lbl">Units</span><b>'+hs.dataset.units+'</b></div>'+
      '<div><span class="lbl">Typology</span><b>'+hs.dataset.typology+'</b></div>'+
      '<div><span class="lbl">Status</span><b>'+hs.dataset.status+'</b></div>';
}
hotspots.forEach(hs => { hs.addEventListener('click', () => activateHotspot(hs)); });
document.querySelectorAll('.zone-item').forEach((zi, i) => {
  zi.addEventListener('click', () => { if(hotspots[i]) activateHotspot(hotspots[i]); });
});


/* Testimonial carousel — rotates on its own; the arrows still drive it manually
   and simply restart the clock so a click is never cut short mid-read. */
const slides = document.querySelectorAll('.t-slide'); let tIndex = 0;
function showSlide(i){ slides.forEach(s=>s.classList.remove('active')); tIndex=(i+slides.length)%slides.length; slides[tIndex].classList.add('active'); }
(function(){
  const wrap = document.querySelector('.testimonial-wrap');
  const prev = document.getElementById('tPrev'), next = document.getElementById('tNext');
  if(!wrap || !prev || !next) return;
  const DELAY = 7000;
  // Auto-motion is opt-out for anyone who asked the OS for reduced motion.
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let timer = null, hovering = false, focused = false;
  function stop(){ if(timer){ clearInterval(timer); timer = null; } }
  /* Every resume routes through here, so a reason to stay paused always wins.
     Restarting blind would let an arrow click re-arm the timer while the pointer
     is still resting on the carousel, and it would rotate out from under a
     visitor mid-sentence. */
  function start(){
    stop();
    if(still || hovering || focused || document.hidden || slides.length < 2) return;
    timer = setInterval(()=>showSlide(tIndex+1), DELAY);
  }
  prev.addEventListener('click', ()=>{ showSlide(tIndex-1); start(); });
  next.addEventListener('click', ()=>{ showSlide(tIndex+1); start(); });
  // Hold still while it's being read or tabbed through, and while the tab is hidden.
  wrap.addEventListener('pointerenter', ()=>{ hovering = true;  stop();  });
  wrap.addEventListener('pointerleave', ()=>{ hovering = false; start(); });
  wrap.addEventListener('focusin',      ()=>{ focused  = true;  stop();  });
  wrap.addEventListener('focusout',     ()=>{ focused  = false; start(); });
  document.addEventListener('visibilitychange', start);
  start();
})();

/* Collapse <details> panels on mobile only.
   Panels ship with the `open` attribute so their full text renders for search
   engines and for anyone without JS; this shuts them once we know the viewport
   is narrow, and reopens them if the viewport grows past the breakpoint. */
function collapseOnMobile(selector, query){
  var mq = window.matchMedia(query);
  var panels = document.querySelectorAll(selector);
  if(!panels.length) return;
  function sync(){ panels.forEach(function(d){ d.open = !mq.matches; }); }
  sync();
  /* addEventListener on a MediaQueryList is unsupported on older Safari. */
  if(mq.addEventListener) mq.addEventListener('change', sync);
  else if(mq.addListener) mq.addListener(sync);
}
/* Amenity index. The totals card is excluded — it stays open on every size
   because it holds the masterplan CTA. */
collapseOnMobile('.ac-grid > details:not(.ac-total)', '(max-width:620px)');
/* Construction specifications. */
collapseOnMobile('.const-grid > details', '(max-width:560px)');

/* ---------- LOCATION MAP ----------
   Pins the #locList places onto the brochure-style area map. Choosing a place
   (row or pin) draws a line out from CIEL to it and fills the readout. Until
   the visitor picks one, the map tours the places on its own while on screen.
   On All, only the chosen place shows its minutes; a category shows them all. */
(function(){
  const map = document.getElementById('locMap');
  const list = document.getElementById('locList');
  if (!map || !list) return;
  const wrap = document.getElementById('locWrap');
  const svg = map.querySelector('svg');
  const scroller = map.querySelector('.loc4-scroll');
  const readout = document.getElementById('locReadout');
  const rdTime = readout.querySelector('.rd-time');
  const tabsEl = document.getElementById('locTabs');
  const NS = 'http://www.w3.org/2000/svg';
  const home = svg.dataset.home.split(' ').map(Number);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CATS = {
    work   : { label:'Work',         icon:'<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M8 7V4h8v3M3 12h18"/>' },
    schools: { label:'Education',    icon:'<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>' },
    health : { label:'Healthcare',   icon:'<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>' },
    leisure: { label:'Leisure',      icon:'<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>' },
    travel : { label:'Connectivity', icon:'<path d="M2 13l20-8-6 16-3-7z"/><path d="M13 14l9-9"/>' }
  };

  function el(tag, attrs, parent){
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  const defs = el('defs', {}, svg);
  const glow = el('radialGradient', { id:'lmHomeGlow' }, defs);
  el('stop', { offset:'0%', 'stop-color':'#D4B978', 'stop-opacity':'.6' }, glow);
  el('stop', { offset:'100%', 'stop-color':'#D4B978', 'stop-opacity':'0' }, glow);
  const routeLayer = el('g', {}, svg);
  const pinLayer = el('g', {}, svg);
  /* CIEL on top of everything, with a slow sonar pulse. */
  el('circle', { class:'lm-pulse', cx:home[0], cy:home[1], r:90 }, svg);
  el('circle', { class:'lm-pulse p2', cx:home[0], cy:home[1], r:90 }, svg);
  el('circle', { class:'lm-home-glow', cx:home[0], cy:home[1], r:54 }, svg);
  /* The CIEL logo, centred on the plot; the header already loads this file. */
  const LOGO_W = 84, LOGO_H = LOGO_W * 659 / 886;
  el('image', { class:'lm-home-logo', href:'assets/logos/ciel_logo-trimmed.png', x:home[0] - LOGO_W / 2, y:home[1] - LOGO_H / 2, width:LOGO_W, height:LOGO_H }, svg);

  const LABEL = { r:[9, 4, 'start'], l:[-9, 4, 'end'], t:[0, -10, 'middle'], b:[0, 18, 'middle'] };
  const places = Array.from(list.querySelectorAll('.lm-row')).map(row => {
    const d = row.dataset, cat = CATS[d.cat] || CATS.work;
    const x = +d.x, y = +d.y, name = row.querySelector('.lm-name').textContent;
    row.querySelector('.lm-ico').innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + cat.icon + '</svg>';
    row.setAttribute('aria-pressed', 'false');
    const pin = el('g', { class:'lm-pin', transform:'translate(' + x + ' ' + y + ')' }, pinLayer);
    el('circle', { class:'pin-halo', r:14 }, pin);
    if ('offmap' in d){
      /* Beyond the edge: an arrow pointing on out, away from CIEL. Rotated on
         a wrapper, so the active-state scale on .pin-dot does not undo it. */
      const a = Math.atan2(y - home[1], x - home[0]) * 180 / Math.PI;
      const turn = el('g', { transform:'rotate(' + a.toFixed(1) + ')' }, pin);
      el('path', { class:'pin-dot', d:'M-6 -6L6 0L-6 6Z' }, turn);
    } else {
      el('circle', { class:'pin-dot', r:4.5 }, pin);
    }
    if (!('nolabel' in d)){
      const L = LABEL[d.side] || LABEL.r;
      /* Minutes go on a second line, so a label is no wider than its name;
         labels above the dot move up a line to make room. */
      const up = d.min && d.side === 't' ? -12 : 0;
      const label = el('text', { x:L[0], y:L[1] + up, 'text-anchor':L[2] }, pin);
      label.textContent = name;
      if (d.min) el('tspan', { class:'pin-min', x:L[0], dy:12 }, label).textContent = d.min + ' MIN';
    }
    const p = { row, pin, x, y, cat:d.cat, name, min:d.min || '', catText:row.querySelector('.lm-cat').textContent };
    pin.addEventListener('click', () => { stopTour(); select(p, true); });
    row.addEventListener('click', () => { stopTour(); select(p, false); });
    return p;
  });
  if (!places.length) return;

  /* Keep the chosen place in view: inside the list, and inside the swipeable
     map on phones. Both scroll only their own box, never the page. */
  function reveal(p, inList){
    if (inList){
      const li = p.row.parentElement;
      list.scrollTo({ top: li.offsetTop - (list.clientHeight - li.offsetHeight) / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (scroller.scrollWidth > scroller.clientWidth){
      const k = scroller.scrollWidth / 1030;
      scroller.scrollTo({ left: p.x * k - scroller.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  let active = null, carRaf = 0, filter = 'all';
  function showTime(){
    rdTime.hidden = !(active && active.min);
    if (active) rdTime.querySelector('b').textContent = active.min;
  }
  function select(p, inList){
    if (active === p) return;
    active = p;
    places.forEach(q => {
      q.pin.classList.toggle('is-active', q === p);
      q.row.setAttribute('aria-pressed', q === p ? 'true' : 'false');
    });
    /* Bring the active pin above its neighbours so its label is not covered. */
    pinLayer.appendChild(p.pin);
    routeLayer.textContent = '';
    cancelAnimationFrame(carRaf);
    const dx = p.x - home[0], dy = p.y - home[1];
    const qx = home[0] + dx / 2 - dy * .16, qy = home[1] + dy / 2 + dx * .16;
    const d = 'M' + home[0] + ' ' + home[1] + ' Q' + qx.toFixed(1) + ' ' + qy.toFixed(1) + ' ' + p.x + ' ' + p.y;
    el('path', { class:'lm-route-glow', d }, routeLayer);
    const path = el('path', { class:'lm-route', d }, routeLayer);
    const car = el('circle', { class:'lm-car', r:4, cx:home[0], cy:home[1] }, routeLayer);
    const total = path.getTotalLength();
    if (reduce){
      car.setAttribute('cx', p.x); car.setAttribute('cy', p.y);
    } else {
      const dur = Math.max(700, Math.min(1800, total * 3));
      path.style.strokeDasharray = total;
      path.style.strokeDashoffset = total;
      const t0 = performance.now();
      (function step(now){
        const k = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
        path.style.strokeDashoffset = total * (1 - e);
        const pt = path.getPointAtLength(total * e);
        car.setAttribute('cx', pt.x); car.setAttribute('cy', pt.y);
        if (k < 1) carRaf = requestAnimationFrame(step);
      })(t0);
    }
    readout.querySelector('.rd-cat').textContent = p.catText;
    readout.querySelector('.rd-name').textContent = p.name;
    showTime();
    readout.classList.add('show');
    reveal(p, inList);
  }

  /* Category pills: only for categories that have a place. */
  const visible = () => places.filter(p => filter === 'all' || p.cat === filter);
  const used = Object.keys(CATS).filter(k => places.some(p => p.cat === k));
  ['all'].concat(used).forEach(k => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = k === 'all' ? 'All' : CATS[k].label;
    b.setAttribute('aria-pressed', k === 'all' ? 'true' : 'false');
    b.addEventListener('click', () => {
      stopTour();
      filter = k;
      wrap.classList.toggle('is-all', k === 'all');
      tabsEl.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      places.forEach(p => {
        const on = k === 'all' || p.cat === k;
        p.row.parentElement.hidden = !on;
        p.pin.classList.toggle('is-dim', !on);
      });
      list.scrollTop = 0;
      const shown = visible();
      if (shown.length && shown.indexOf(active) < 0) select(shown[0], false);
      showTime();
    });
    tabsEl.appendChild(b);
  });
  if (used.length < 2) tabsEl.hidden = true;

  /* Self-guided tour while on screen, until the visitor takes over - which
     includes scrolling the list or swiping the map themselves. */
  let tour = 0, touring = !reduce;
  function stopTour(){ touring = false; clearInterval(tour); tour = 0; }
  ['wheel', 'touchstart', 'pointerdown'].forEach(ev => {
    list.addEventListener(ev, stopTour, { passive:true });
    scroller.addEventListener(ev, stopTour, { passive:true });
  });
  new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting){
        if (!active){
          /* Phones: start the swipeable map centred on CIEL. */
          if (scroller.scrollWidth > scroller.clientWidth){
            scroller.scrollLeft = home[0] * scroller.scrollWidth / 1030 - scroller.clientWidth / 2;
          }
          select(places[0], false);
        }
        if (touring && !tour){
          tour = setInterval(() => {
            const v = visible();
            select(v[(v.indexOf(active) + 1) % v.length], true);
          }, 3800);
        }
      } else if (tour){
        clearInterval(tour); tour = 0;
      }
    });
  }, { threshold:.35 }).observe(map);
})();

/* Construction section tabs */
(function(){
  const tabs = document.getElementById('ctTabs');
  if (!tabs) return;

  tabs.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      const panel = button.dataset.panel;
      tabs.querySelectorAll('button').forEach(tab => {
        const isActive = tab === button;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('.ct-panel').forEach(item => item.classList.toggle('active', item.id === 'panel-' + panel));
    });
  });
})();

/* Modal (video / image) */
const modalOverlay = document.getElementById('modalOverlay');
const modalVideo = document.getElementById('modalVideo');
const modalYoutube = document.getElementById('modalYoutube');
const modalImg = document.getElementById('modalImg');
const modalMediaFrame = document.getElementById('modalMediaFrame');
const modalGalleryPrev = document.getElementById('modalGalleryPrev');
const modalGalleryNext = document.getElementById('modalGalleryNext');
const modalGalleryCount = document.getElementById('modalGalleryCount');
const galleryItems = Array.from(document.querySelectorAll('#gallery .g-item[data-modal-image]'));
/* The monthly progress photos are their own ring: the arrows walk whichever
   grid the visitor opened from, never across from one set into the other.
   A residence card with more than one plan (data-plans="src|caption, ...")
   is a ring of its own, so the arrows flip between its East and West
   facings. A card with a single plan opens on its own with no arrows. */
const progressItems = Array.from(document.querySelectorAll('#panel-progress .cp-item[data-modal-image]'));
const planRings = new Map();
document.querySelectorAll('.res-unit[data-plans]').forEach(card => {
  const ring = card.dataset.plans.split(',').map(entry => {
    const [src, caption] = entry.trim().split('|');
    const plan = document.createElement('div');
    plan.className = 'res-unit';
    plan.dataset.src = src;
    if (caption) plan.dataset.caption = caption;
    return plan;
  });
  if (ring.length > 1) planRings.set(card, ring);
});
let activeRing = galleryItems;
let activeGalleryIndex = -1;
function setGalleryNavigation(index) {
  activeGalleryIndex = index;
  const isGalleryImage = index >= 0;
  modalGalleryPrev.classList.toggle('visible', isGalleryImage);
  modalGalleryNext.classList.toggle('visible', isGalleryImage);
  modalGalleryCount.classList.toggle('visible', isGalleryImage);
  const caption = isGalleryImage ? activeRing[index].dataset.caption : '';
  modalGalleryCount.textContent = isGalleryImage ? `${caption ? caption + ' · ' : ''}${index + 1} / ${activeRing.length}` : '';
}
function openModalImage(el, galleryIndex = -1) {
  modalVideo.style.display='none'; modalVideo.pause(); modalYoutube.style.display='none'; modalYoutube.removeAttribute('src'); modalImg.style.display='block';
  modalMediaFrame.classList.remove('is-placeholder');
  modalMediaFrame.setAttribute('data-label', el.dataset.src);
  modalImg.src = el.dataset.src;
  resetModalFrame();
  /* Floor plans (the residence cards) get the square 1080 frame; gallery
     photos keep the wide 16/9 one. */
  modalOverlay.classList.toggle('is-plan', el.classList.contains('res-unit'));
  /* ...and a portrait photo gets a portrait frame. Measured off the thumbnail's
     declared width/height rather than naturalWidth, which is still 0 for a lazy
     image the visitor has scrolled to but whose bytes have not arrived. */
  const thumb = el.querySelector('img');
  const thumbW = thumb ? (Number(thumb.getAttribute('width')) || thumb.naturalWidth) : 0;
  const thumbH = thumb ? (Number(thumb.getAttribute('height')) || thumb.naturalHeight) : 0;
  modalOverlay.classList.toggle('is-portrait', thumbH > thumbW);
  setGalleryNavigation(galleryIndex);
  modalOverlay.classList.add('open');
  lockPage(true);
}
/* ---------- Live-progress film: preview on hover ----------
   The tile's <video> is loaded to metadata only, so it sits on frame one as a
   poster. Hovering runs it; leaving rewinds, so the next hover starts from the
   top rather than wherever the pointer left off. Pointer devices only: there is
   no hover on touch, where the tap opens the full film anyway. */
(function(){
  const tile = document.querySelector('.cp-video');
  if (!tile) return;
  const clip = tile.querySelector('.cp-preview');
  if (!clip || reduced) return;
  if (window.matchMedia && !window.matchMedia('(hover:hover)').matches) return;
  tile.addEventListener('pointerenter', function(){
    tile.classList.add('is-previewing');
    const played = clip.play();
    if (played && played.catch) played.catch(function(){});
  });
  tile.addEventListener('pointerleave', function(){
    tile.classList.remove('is-previewing');
    clip.pause();
    try { clip.currentTime = 0; } catch(e){ /* metadata not in yet */ }
  });
})();

const modalBox = modalOverlay.querySelector('.modal-box');
/* The frame is 16:9 by default, but a site walkthrough shot on a phone is
   portrait - in a 16:9 box it shows as a sliver between two black bars. Take
   the real ratio off the decoded stream and size the frame to it, capping the
   width off the viewport height so a tall film cannot run past a short window. */
modalVideo.addEventListener('loadedmetadata', function(){
  if (!this.videoWidth || !this.videoHeight) return;
  const ratio = this.videoWidth / this.videoHeight;
  modalMediaFrame.style.aspectRatio = this.videoWidth + ' / ' + this.videoHeight;
  modalBox.style.maxWidth = 'min(1560px, ' + (88 * ratio).toFixed(1) + 'vh)';
});
/* Anything sized that way has to hand the frame back, or the next image opens
   in a box still shaped like the last film. */
function resetModalFrame(){
  modalMediaFrame.style.aspectRatio = '';
  modalBox.style.maxWidth = '';
}

function showGalleryImage(index) {
  const wrappedIndex = (index + activeRing.length) % activeRing.length;
  openModalImage(activeRing[wrappedIndex], wrappedIndex);
}
document.querySelectorAll('[data-modal-video]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    modalImg.style.display='none'; modalYoutube.style.display='none'; modalYoutube.removeAttribute('src'); modalVideo.style.display='block';
    modalMediaFrame.classList.remove('is-placeholder');
    modalMediaFrame.setAttribute('data-label', el.dataset.src);
    modalVideo.src = el.dataset.src;
    modalOverlay.classList.remove('is-plan', 'is-portrait');
    setGalleryNavigation(-1);
    modalOverlay.classList.add('open');
    lockPage(true);
  });
});
document.querySelectorAll('[data-modal-youtube]').forEach(el => {
  const preview = el.querySelector('.virtual-tour-preview');
  const videoId = el.dataset.modalYoutube;
  function stopPreview(){
    if (!preview) return;
    el.classList.remove('is-previewing');
    preview.removeAttribute('src');
  }
  if (preview) preview.addEventListener('load', () => {
    if (preview.getAttribute('src')) el.classList.add('is-previewing');
  });
  el.addEventListener('mouseenter', () => {
    if (!preview || !videoId || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    preview.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&mute=1&controls=0&loop=1&playlist=${encodeURIComponent(videoId)}&playsinline=1&rel=0&modestbranding=1`;
  });
  el.addEventListener('mouseleave', stopPreview);
  el.addEventListener('click', () => {
    if (!videoId) return;
    stopPreview();
    modalImg.style.display='none'; modalVideo.style.display='none'; modalVideo.pause(); modalYoutube.style.display='block';
    modalMediaFrame.classList.remove('is-placeholder');
    modalMediaFrame.setAttribute('data-label', 'CIEL Virtual Tour');
    modalYoutube.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0`;
    modalOverlay.classList.remove('is-plan', 'is-portrait');
    setGalleryNavigation(-1);
    modalOverlay.classList.add('open');
    lockPage(true);
  });
});
document.querySelectorAll('[data-modal-image]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    if (planRings.has(el)) {
      activeRing = planRings.get(el);
      openModalImage(activeRing[0], 0);
      return;
    }
    activeRing = progressItems.includes(el) ? progressItems : galleryItems;
    openModalImage(el, activeRing.indexOf(el));
  });
});
/* Every full-screen overlay locks the page behind it. Without this a wheel turn
   or a touch-drag over a fixed overlay scrolls the document underneath, so the
   overlay appears to slide over a moving page and closing it leaves the visitor
   somewhere else. body.style.overflow is what the apartment and clubhouse
   overlays already use, so all of them now behave the same way. */
function lockPage(on){ document.body.style.overflow = on ? 'hidden' : ''; }

function closeModal(){
  modalOverlay.classList.remove('open');
  lockPage(false);
  modalVideo.pause();
  modalYoutube.removeAttribute('src');
  /* Drop the source too, or the file keeps buffering in the background after
     the modal is closed. removeAttribute + load() is the safe way — setting
     src='' makes some browsers re-request the page URL. */
  modalVideo.removeAttribute('src');
  modalVideo.classList.remove('loaded');
  modalVideo.load();
  resetModalFrame();
  setGalleryNavigation(-1);
}
document.getElementById('modalClose').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
modalGalleryPrev.addEventListener('click', () => showGalleryImage(activeGalleryIndex - 1));
modalGalleryNext.addEventListener('click', () => showGalleryImage(activeGalleryIndex + 1));
window.addEventListener('keydown', e => {
  if (!modalOverlay.classList.contains('open')) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft' && activeGalleryIndex >= 0) showGalleryImage(activeGalleryIndex - 1);
  if (e.key === 'ArrowRight' && activeGalleryIndex >= 0) showGalleryImage(activeGalleryIndex + 1);
});

/* Sample apartment image gallery */
const apartmentRooms = [
  { name: 'Living', title: 'Living Room', marker: { x: 51, y: 22 }, images: [
    { src: 'assets/Sample%20Apartment/Living-1.webp', alt: 'Sample apartment living room' },
    { src: 'assets/Sample%20Apartment/Living-2.webp', alt: 'Sample apartment living room' }
  ] },
  { name: 'Dining', title: 'Dining Area', marker: { x: 52, y: 52 }, images: [
    { src: 'assets/Sample%20Apartment/Dining-1.webp', alt: 'Sample apartment dining area' },
    { src: 'assets/Sample%20Apartment/Dining-2.webp', alt: 'Sample apartment dining area' }
  ] },
  { name: 'Kitchen', title: 'Kitchen', marker: { x: 77, y: 66 }, images: [
    { src: 'assets/Sample%20Apartment/Kitchen-1.webp', alt: 'Sample apartment kitchen' },
    { src: 'assets/Sample%20Apartment/Kitchen-2.webp', alt: 'Sample apartment kitchen' }
  ] },
  { name: 'Master Bed', title: 'Master Bedroom', marker: { x: 24, y: 76 }, images: [
    { src: 'assets/Sample%20Apartment/Masterbed-1.webp', alt: 'Sample apartment master bedroom' },
    { src: 'assets/Sample%20Apartment/Masterbed-2.webp', alt: 'Sample apartment master bedroom' }
  ] },
  { name: 'Guest Bed', title: 'Guest Bedroom', marker: { x: 79, y: 27 }, images: [
    { src: 'assets/Sample%20Apartment/Guestbed-1.webp', alt: 'Sample apartment guest bedroom' },
    { src: 'assets/Sample%20Apartment/Guestbed-2.webp', alt: 'Sample apartment guest bedroom' }
  ] },
  { name: 'Children\'s Bed', title: 'Children\'s Bedroom', marker: { x: 24, y: 24 }, images: [
    { src: 'assets/Sample%20Apartment/childbed-1.webp', alt: 'Sample apartment children\'s bedroom' },
    { src: 'assets/Sample%20Apartment/Childbed-2.webp', alt: 'Sample apartment children\'s bedroom' }
  ] },
  { name: 'Balcony', title: 'Balcony', marker: { x: 52, y: 88 }, images: [
    { src: 'assets/Sample%20Apartment/Balcony-1.webp', alt: 'Sample apartment balcony' },
    { src: 'assets/Sample%20Apartment/Balcony-2.webp', alt: 'Sample apartment balcony' }
  ] }
];
const apartmentOverlay = document.getElementById('apartmentOverlay');
const apartmentTitle = document.getElementById('apartmentTitle');
const apartmentRoomButtons = document.getElementById('apartmentRooms');
const apartmentImage = document.getElementById('apartmentImage');
const apartmentPlanRoom = document.getElementById('apartmentPlanRoom');
const apartmentPlanMarker = document.getElementById('apartmentPlanMarker');
const apartmentViewButtons = document.querySelectorAll('.apartment-view');
/* Two places open this gallery: the Virtual Experiences card and the 360°
   Apartment button down in Residences. Focus has to return to whichever one
   was actually used, or a keyboard visitor is dropped back at the other end of
   the page. */
const apartmentOpeners = Array.prototype.slice.call(
  document.querySelectorAll('#sampleApartmentOpen, [data-open-apartment]'));
let apartmentOpener = apartmentOpeners[0] || null;
let apartmentRoomIndex = 0;
let apartmentViewIndex = 0;

function renderApartmentScene() {
  const room = apartmentRooms[apartmentRoomIndex];
  apartmentTitle.textContent = room.title;
  apartmentPlanRoom.textContent = room.title;
  apartmentPlanMarker.style.setProperty('--marker-x', `${room.marker.x}%`);
  apartmentPlanMarker.style.setProperty('--marker-y', `${room.marker.y}%`);
  apartmentPlanMarker.setAttribute('aria-label', `${room.title}: you are here on the residence plan`);
  const view = room.images[apartmentViewIndex];
  apartmentImage.src = view.src;
  apartmentImage.alt = view.alt;
  apartmentRoomButtons.querySelectorAll('.apartment-room').forEach((thumb, thumbIndex) => {
    const isActive = thumbIndex === apartmentRoomIndex;
    thumb.classList.toggle('active', isActive);
    thumb.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
  apartmentViewButtons.forEach((button, buttonIndex) => {
    const isActive = buttonIndex === apartmentViewIndex;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}
function showApartmentRoom(index) {
  apartmentRoomIndex = index;
  apartmentViewIndex = 0;
  renderApartmentScene();
}
function showApartmentView(index) {
  apartmentViewIndex = index;
  renderApartmentScene();
}
apartmentRooms.forEach((room, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'apartment-room';
  button.dataset.number = String(index + 1).padStart(2, '0');
  button.textContent = room.name;
  button.addEventListener('click', () => showApartmentRoom(index));
  apartmentRoomButtons.appendChild(button);
});
apartmentViewButtons.forEach((button, index) => {
  button.addEventListener('click', () => showApartmentView(index));
});
function openApartmentGallery(e) {
  if (e && e.currentTarget) apartmentOpener = e.currentTarget;
  showApartmentRoom(0);
  apartmentOverlay.classList.add('open');
  apartmentOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  document.getElementById('apartmentClose').focus();
}
function closeApartmentGallery() {
  apartmentOverlay.classList.remove('open');
  apartmentOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (apartmentOpener) apartmentOpener.focus();
}
apartmentOpeners.forEach(function(el){ el.addEventListener('click', openApartmentGallery); });
document.getElementById('apartmentClose').addEventListener('click', closeApartmentGallery);
apartmentOverlay.addEventListener('click', e => { if (e.target === apartmentOverlay) closeApartmentGallery(); });
window.addEventListener('keydown', e => {
  if (!apartmentOverlay.classList.contains('open')) return;
  if (e.key === 'Escape') closeApartmentGallery();
  if (e.key === 'ArrowLeft') showApartmentRoom((apartmentRoomIndex - 1 + apartmentRooms.length) % apartmentRooms.length);
  if (e.key === 'ArrowRight') showApartmentRoom((apartmentRoomIndex + 1) % apartmentRooms.length);
});
renderApartmentScene();


/* ---------- Clubhouse walkthrough ----------
   Five spaces, two camera views each, as 6-8s silent H.264 clips. Four of the
   masters are 4K and 3-6MB apiece, so nothing is preloaded: a clip is fetched
   only when it is picked, and both elements are emptied on close so an
   in-flight download for a space nobody is looking at any more stops.

   The clips carry no audio track, so `muted` costs nothing and is what buys
   autoplay under every mobile policy. `loop` because 6 seconds is too short to
   leave a visitor staring at a frozen last frame.

   Two <video> elements, not one. Swapping src on a single element blanks it
   while the new file loads, which reads as a flash on every view and space
   change; here the incoming clip loads in the idle element and is only faded
   up once it has data, over the outgoing frame.

   NOTE: Indoor_games_view1/2.mp4 are currently copies of the theatre clips,
   standing in until the real game-zone footage lands. The filenames are the
   final ones, so replacing the two files is the whole swap - no code change. */
const clubhouseSpaces = [
  { name: 'Theatre', title: 'Mini Theatre', poster: 'assets/renders/mini-theatre.webp',
    views: ['assets/ClubHouse/theater_view1.mp4', 'assets/ClubHouse/theater_view2.mp4'] },
  { name: 'Game Zone', title: 'Game Zone', poster: 'assets/renders/indoor-sports.webp',
    views: ['assets/ClubHouse/Indoor_games_view1.mp4', 'assets/ClubHouse/Indoor_games_view2.mp4'] },
  { name: 'Banquet Hall', title: 'Banquet Hall', poster: 'assets/renders/clubhouse-interior.webp',
    views: ['assets/ClubHouse/multipurpose_view1.mp4', 'assets/ClubHouse/multipurpose_view2.mp4'] },
  { name: 'Pool', title: 'Temperature-Controlled Pool', poster: 'assets/renders/terrace-pool.webp',
    views: ['assets/ClubHouse/temp_cool_view1.mp4', 'assets/ClubHouse/temp_cool_view2.mp4'] },
  { name: 'Terrace', title: 'Clubhouse Terrace', poster: 'assets/gallery/gallery-07-clubhouse-terrace.webp',
    views: ['assets/ClubHouse/terrace_panorama_view1.mp4', 'assets/ClubHouse/terrace_panorama_view2.mp4'] }
];
const clubhouseOverlay = document.getElementById('clubhouseOverlay');
const clubhouseMedia = document.getElementById('clubhouseMedia');
const clubhousePoster = document.getElementById('clubhousePoster');
const clubhouseClips = Array.prototype.slice.call(document.querySelectorAll('.clubhouse-clip'));
const clubhouseTitle = document.getElementById('clubhouseTitle');
const clubhouseSpaceButtons = document.getElementById('clubhouseSpaces');
const clubhouseViewButtons = document.querySelectorAll('.clubhouse-view');
const clubhouseOpenBtn = document.getElementById('clubhouseWalkOpen');
const CLUBHOUSE_FADE = 450;        // must match the .clubhouse-clip transition
let clubhouseSpaceIndex = 0;
let clubhouseViewIndex = 0;
let clubhouseFront = 0;            // which element is currently showing
let clubhouseTopZ = 1;
let clubhouseWanted = '';          // the clip the visitor last asked for

function clubhousePlay(el){
  try { el.currentTime = 0; } catch(e){ /* metadata not in yet */ }
  const played = el.play();
  if (played && played.catch) played.catch(function(){});   // autoplay may refuse
}

/* Fade `el` up over whatever is showing. Guarded on src, so a clip that
   finishes loading after the visitor has moved on is dropped rather than
   yanking the view back to a space they already left. */
function clubhouseReveal(el){
  if (el.getAttribute('src') !== clubhouseWanted) return;
  clubhouseSpaceButtons.classList.remove('is-loading');
  clubhouseMedia.classList.add('has-clip');   // drop the poster floor for good
  if (clubhouseClips[clubhouseFront] === el){ clubhousePlay(el); return; }
  const out = clubhouseClips[clubhouseFront];
  el.style.zIndex = ++clubhouseTopZ;                 // incoming always on top
  el.classList.add('is-showing');
  clubhousePlay(el);
  clubhouseFront = clubhouseClips.indexOf(el);
  /* Hold the outgoing frame underneath for the length of the dissolve; drop it
     only if it is still the back element by then. */
  clearTimeout(out.dissolveTimer);
  out.dissolveTimer = setTimeout(function(){
    if (clubhouseClips[clubhouseFront] === out) return;
    out.classList.remove('is-showing');
    out.pause();
  }, CLUBHOUSE_FADE + 70);
}

function clubhouseSwapTo(src){
  clubhouseWanted = src;
  clubhouseMedia.classList.remove('is-error');
  const front = clubhouseClips[clubhouseFront];
  if (front.getAttribute('src') === src){ clubhousePlay(front); return; }
  const back = clubhouseClips[1 - clubhouseFront];
  /* Flipping back to a clip the idle element still holds costs no network at
     all - just dissolve to it. Toggling View 1 / View 2 hits this constantly. */
  if (back.getAttribute('src') === src){
    if (back.readyState >= 2) clubhouseReveal(back);
    else clubhouseSpaceButtons.classList.add('is-loading');
    return;
  }
  clubhouseSpaceButtons.classList.add('is-loading');
  back.src = src;
  back.load();
}

function renderClubhouseScene(){
  const space = clubhouseSpaces[clubhouseSpaceIndex];
  clubhouseTitle.textContent = space.title;
  clubhousePoster.style.setProperty('--ch-poster', 'url("' + space.poster + '")');
  clubhouseSpaceButtons.querySelectorAll('.clubhouse-space').forEach((chip, chipIndex) => {
    const isActive = chipIndex === clubhouseSpaceIndex;
    chip.classList.toggle('active', isActive);
    chip.setAttribute('aria-current', isActive ? 'true' : 'false');
  });
  clubhouseViewButtons.forEach((button, buttonIndex) => {
    const isActive = buttonIndex === clubhouseViewIndex;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
  clubhouseSwapTo(space.views[clubhouseViewIndex]);
}
function showClubhouseSpace(index){
  clubhouseSpaceIndex = index;
  clubhouseViewIndex = 0;          // a new space always opens on its first view
  renderClubhouseScene();
}
function showClubhouseView(index){
  clubhouseViewIndex = index;
  renderClubhouseScene();
}
clubhouseClips.forEach(function(el){
  el.addEventListener('loadeddata', function(){ clubhouseReveal(el); });
  el.addEventListener('error', function(){
    /* An emptied element fires this on close too - that is not a broken clip. */
    if (!el.getAttribute('src')) return;
    if (el.getAttribute('src') !== clubhouseWanted) return;
    clubhouseSpaceButtons.classList.remove('is-loading');
    clubhouseMedia.classList.add('is-error');
  });
});
clubhouseSpaces.forEach((space, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'clubhouse-space';
  button.dataset.number = String(index + 1).padStart(2, '0');
  button.textContent = space.name;
  button.addEventListener('click', () => showClubhouseSpace(index));
  clubhouseSpaceButtons.appendChild(button);
});
clubhouseViewButtons.forEach((button, index) => {
  button.addEventListener('click', () => showClubhouseView(index));
});
function openClubhouseWalk(){
  clubhouseOverlay.classList.add('open');
  clubhouseOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  showClubhouseSpace(0);
  document.getElementById('clubhouseClose').focus();
  if (window.gtag) gtag('event', 'clubhouse_walk_open');
}
function closeClubhouseWalk(){
  clubhouseOverlay.classList.remove('open');
  clubhouseOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  clubhouseWanted = '';
  /* Pausing is not enough: the browser keeps pulling a 4K clip nobody can see.
     Dropping the src cancels the request - removeAttribute rather than ='', as
     an empty src resolves against the page URL and re-fetches the document. */
  clubhouseClips.forEach(function(el){
    clearTimeout(el.dissolveTimer);
    el.classList.remove('is-showing');
    el.pause();
    el.removeAttribute('src');
    el.load();
  });
  clubhouseFront = 0;
  clubhouseMedia.classList.remove('has-clip');
  clubhouseSpaceButtons.classList.remove('is-loading');
  clubhouseOpenBtn.focus();
}
clubhouseOpenBtn.addEventListener('click', openClubhouseWalk);
document.getElementById('clubhouseClose').addEventListener('click', closeClubhouseWalk);
clubhouseOverlay.addEventListener('click', e => { if (e.target === clubhouseOverlay) closeClubhouseWalk(); });
window.addEventListener('keydown', e => {
  if (!clubhouseOverlay.classList.contains('open')) return;
  if (e.key === 'Escape') closeClubhouseWalk();
  if (e.key === 'ArrowLeft') showClubhouseSpace((clubhouseSpaceIndex - 1 + clubhouseSpaces.length) % clubhouseSpaces.length);
  if (e.key === 'ArrowRight') showClubhouseSpace((clubhouseSpaceIndex + 1) % clubhouseSpaces.length);
});

/* Terrace views — four renders behind the named chips */
const panoOverlay = document.getElementById('panoOverlay');
const panoScenes = document.querySelectorAll('#panoScenes button');
const panoImage = document.getElementById('panoImage');
const panoViewerEl = document.getElementById('panoViewer');
const panoHint = document.getElementById('panoHint');
const panoOrder = ['skydeck', 'pool', 'lounge', 'bar'];   // chip order, for the arrow keys
let panoCurrent = panoOrder[0];

/* The four terrace views. Keyed by the data-scene on each chip, so the markup
   and this list cannot drift apart silently. Two of the renders are not in yet;
   their frames say so instead of going blank - drop the files in at these paths
   and nothing else has to change. */
const panoViews = {
  skydeck: { title: 'The Terrace',   src: 'assets/renders/terrace-fullscreen.webp',
             alt: 'CIEL clubhouse terrace, looking across the rooftop' },
  pool:    { title: 'Infinity Pool', src: 'assets/renders/terrace-pool.webp',
             alt: 'Infinity edge pool on the CIEL clubhouse terrace' },
  lounge:  { title: 'Lounge',        src: 'assets/renders/terrace-lounge.webp',
             alt: 'Sky lounge seating on the CIEL clubhouse terrace' },
  bar:     { title: 'Bar & Cellar',  src: 'assets/renders/terrace-bar.webp',
             alt: 'Bar and cellar on the CIEL clubhouse terrace' }
};

function showPanoView(sceneId){
  const view = panoViews[sceneId];
  if(!view) return;
  panoViewerEl.classList.remove('is-missing');
  panoImage.classList.remove('loaded');
  panoImage.alt = view.alt;
  panoImage.src = view.src;
  panoHint.textContent = view.title;
  panoCurrent = sceneId;
  panoScenes.forEach(function(b){
    const on = b.dataset.scene === sceneId;
    b.classList.toggle('active', on);
    b.setAttribute('aria-current', on ? 'true' : 'false');
  });
}
/* The shared .loaded pattern: the image is held at opacity 0 until it decodes,
   so switching views cross-fades rather than flashing the frame empty. */
panoImage.addEventListener('load', function(){ this.classList.add('loaded'); });
panoImage.addEventListener('error', function(){
  if(!this.getAttribute('src')) return;
  panoViewerEl.dataset.missing = 'Render not supplied yet \u2014 ' + this.getAttribute('src');
  panoViewerEl.classList.add('is-missing');
});

function openPano(){
  panoOverlay.classList.add('open');
  lockPage(true);
  showPanoView('skydeck');
}
function closePano(){
  panoOverlay.classList.remove('open');
  lockPage(false);
  /* Drop the source so a large render is not held decoded while nobody is
     looking at it, and so reopening fades in rather than showing the last view. */
  panoImage.removeAttribute('src');
  panoImage.classList.remove('loaded');
  panoViewerEl.classList.remove('is-missing');
}
document.querySelectorAll('[data-modal-pano]').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); openPano(); });
});
document.getElementById('panoClose').addEventListener('click', closePano);
panoOverlay.addEventListener('click', e => { if (e.target === panoOverlay) closePano(); });
window.addEventListener('keydown', e => {
  if (!panoOverlay.classList.contains('open')) return;
  if (e.key === 'Escape') closePano();
  const at = panoOrder.indexOf(panoCurrent);
  if (e.key === 'ArrowLeft')  showPanoView(panoOrder[(at - 1 + panoOrder.length) % panoOrder.length]);
  if (e.key === 'ArrowRight') showPanoView(panoOrder[(at + 1) % panoOrder.length]);
});
panoScenes.forEach(btn => {
  btn.addEventListener('click', () => showPanoView(btn.dataset.scene));
});


/* GSAP parallax + tower rise (if available) */
if (window.gsap && window.ScrollTrigger && !reduced) {
  gsap.utils.toArray('.signature .media-frame').forEach(el => {
    gsap.to(el, { yPercent: 12, ease:'none', scrollTrigger:{ trigger: el.closest('section'), start:'top bottom', end:'bottom top', scrub:true } });
  });

}

/* ---------- Hero video sequence ----------
   Clip 1 → 2 → 3, each playing exactly once (no `loop` on any of them).
   Two things can advance the sequence and they must not fight, so scroll
   position is the single source of truth:

     · The hero is pinned for three viewport-height "segments" — one per clip.
       Scroll position inside the pinned range decides which clip is showing,
       so scrolling moves to the next clip instead of leaving the hero.
     · When a clip finishes on its own, we don't switch the panel directly —
       we scroll to the next segment and let the same scroll handler do it.

   Because the section is pinned, scrolling through that range doesn't move the
   hero on screen at all; only the cross-dissolve is visible. Without GSAP (or
   under prefers-reduced-motion) it falls back to plain playback advancement. */
(function(){
  const panels = ['heroPanel1','heroPanel2','heroPanel3']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if(!panels.length) return;
  const vids = panels.map(p => p.querySelector('video')).filter(Boolean);
  if(vids.length !== panels.length) return;

  const LAST = vids.length - 1;
  const stage = panels[0].parentElement;   // .hero-media
  /* Scroll distance held per clip, in vh. This is the dial for how many scrolls
     it takes to move between videos: one viewport height (100) needed 2–3 wheel
     throws per clip, which felt sticky. 40vh lands at roughly one throw, or one
     swipe on touch. Raise it to linger, lower it to advance sooner. */
  const SEGMENT_VH = 40;
  let current = -1;
  let topZ = 10;
  let failed = 0;
  let heroST = null;          // the pin's ScrollTrigger, when GSAP is available
  let sweepTimer = null;

  function warm(i){
    const v = vids[i];
    if(v && v.preload !== 'auto'){ v.preload = 'auto'; v.load(); }
  }

  /* Fire the gold light-streak that crosses the seam between clips. */
  function sweep(){
    if(reduced || !stage) return;
    stage.classList.remove('is-switching');
    void stage.offsetWidth;               // reflow, so the animation replays
    stage.classList.add('is-switching');
    clearTimeout(sweepTimer);
    sweepTimer = setTimeout(function(){ stage.classList.remove('is-switching'); }, 1200);
  }

  function show(i){
    if(i === current) return;             // already showing — don't restart it
    const isFirst = current === -1;
    current = i;
    if(!isFirst) sweep();                 // no streak on the initial paint
    const panel = panels[i], vid = vids[i];
    panel.style.zIndex = ++topZ;          // incoming always sits on top
    panel.classList.add('is-active');
    /* The shared .media-frame rule keeps <video> at opacity:0 until 'loadeddata'
       fires. On a re-show that event won't fire again, so set it directly. */
    if(vid.readyState >= 2) vid.classList.add('loaded');
    try { vid.currentTime = 0; } catch(e){ /* metadata not in yet */ }
    const p = vid.play();
    if(p && p.catch) p.catch(function(){});   // autoplay policy may refuse

    panels.forEach(function(other, j){
      if(j === i) return;
      other.classList.remove('is-active');
      vids[j].pause();
    });

    warm(Math.min(i + 1, LAST));          // warm the next clip for a clean handoff
  }

  /* Scroll to the middle of a segment, so we land clear of the boundaries. */
  function goToSegment(i){
    const span = heroST.end - heroST.start;
    window.scrollTo({
      top: heroST.start + span * ((i + 0.5) / vids.length),
      behavior: reduced ? 'auto' : 'smooth'
    });
  }

  /* A clip ending only advances the scroll if the visitor is not driving it
     themselves. Without this, arriving at a segment by scrolling UP restarts
     that clip, and when it ends the handler scrolls FORWARD - so anyone heading
     back to the top gets pushed down again if they pause for a clip's length.
     Any scroll within the last moment counts as the visitor being in charge. */
  var lastUserScroll = 0;
  addEventListener('scroll', function(){ lastUserScroll = Date.now(); }, { passive:true });

  function onClipEnded(){
    if(failed >= vids.length) return;     // every clip is broken — stop
    if(current >= LAST) return;           // last clip holds on its final frame
    if(Date.now() - lastUserScroll < 900) return;   // they are steering, not idle
    /* Only take over the scroll while the hero is actually pinned — if the
       visitor has already scrolled past it, don't yank them back up. */
    if(heroST && heroST.isActive) goToSegment(current + 1);
    else if(!heroST) show(current + 1);
  }

  vids.forEach(function(v){
    v.removeAttribute('loop');            // belt and braces
    v.addEventListener('ended', onClipEnded);
    /* Don't dead-end the hero on a missing file — skip to the next clip. */
    v.addEventListener('error', function(){
      failed++;
      if(current < LAST) show(current + 1);
    });
  });

  if (window.gsap && window.ScrollTrigger && !reduced) {
    heroST = ScrollTrigger.create({
      trigger: '#heroSection',
      start: 'top top',
      end: '+=' + (vids.length * SEGMENT_VH) + '%',   // SEGMENT_VH per clip
      pin: true,
      anticipatePin: 1,
      onUpdate: function(self){
        // progress 0→1 maps onto clip 0→LAST; clamp so progress===1 stays in range
        show(Math.min(LAST, Math.floor(self.progress * vids.length)));
      }
    });
  }

  /* Start clip 1 only once the gate has opened, so it plays from frame 0 on a
     hero the visitor can actually see rather than running behind the curtain.
     The flag is checked as well as the event, because the gate may already have
     opened before this listener was attached. */
  function begin(){
    const v = vids[0];

    function buffered(){
      if(!v.buffered || !v.buffered.length) return 0;
      let end = 0;
      for(let i = 0; i < v.buffered.length; i++) end = Math.max(end, v.buffered.end(i));
      return end;
    }
    function enough(){ return v.readyState >= 4 || buffered() >= 3; }

    /* The gate also opens on a hard deadline, which can land before the clip has
       buffered. Starting playback then would stutter, so hold on the poster —
       it carries the slow Ken Burns drift, so the hero looks composed rather
       than broken — and hand over to video once there is real runway. */
    if(enough()){ show(0); return; }

    let started = false;
    function go(){
      if(started) return;
      started = true;
      v.removeEventListener('progress', onProgress);
      v.removeEventListener('canplaythrough', go);
      clearTimeout(giveUp);
      show(0);
    }
    function onProgress(){ if(enough()) go(); }

    v.addEventListener('progress', onProgress);
    v.addEventListener('canplaythrough', go);
    /* Last resort: play anyway rather than leaving a static hero forever. */
    const giveUp = setTimeout(go, 15000);
  }

  if(window.CIEL_GATE_OPEN) begin();
  else document.addEventListener('ciel:gateopen', begin, { once:true });
})();

/* EMI Calculator */
(function(){
  const loan=document.getElementById('emiLoan'), rate=document.getElementById('emiRate'),
        tenure=document.getElementById('emiTenure'), result=document.getElementById('emiResult'),
        loanVal=document.getElementById('emiLoanVal'), rateVal=document.getElementById('emiRateVal'),
        tenureVal=document.getElementById('emiTenureVal');
  function fmt(n){ return '₹'+Math.round(n).toLocaleString('en-IN'); }
  function crFmt(n){ return n>=10000000 ? '₹'+(n/10000000).toFixed(1)+' Cr' : n>=100000 ? '₹'+(n/100000).toFixed(1)+' L' : fmt(n); }
  function calc(){
    const P=+loan.value, r=(+rate.value/12)/100, n=+tenure.value*12;
    const emi = P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1);
    result.textContent = fmt(emi);
    loanVal.textContent = crFmt(P);
    rateVal.textContent = rate.value+'%';
    tenureVal.textContent = tenure.value+' yrs';
  }
  [loan,rate,tenure].forEach(el => el.addEventListener('input', calc));
  calc();
})();

/* Image scroll-reveal */
(function(){
  var sel='.am-card,.g-item,.band .media-frame,.signature .media-frame,.mp-stage';
  var els=Array.prototype.slice.call(document.querySelectorAll(sel));
  function showAll(){ els.forEach(function(e){ e.classList.add('uncover'); }); }
  if(!els.length) return;
  if(!('IntersectionObserver' in window) || reduced){ showAll(); return; }
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){ en.target.classList.add('uncover'); io.unobserve(en.target); }
    });
  },{ threshold:0, rootMargin:'0px 0px -5% 0px' });
  els.forEach(function(e){ io.observe(e); });
  /* No blanket timeout failsafe here: a timer that calls showAll() reveals
     everything below the fold before the visitor ever scrolls to it, which
     cancels the effect for most of the page. The IntersectionObserver support
     check above is the fallback. */
})();

/* ---------- Mouse-tracking tilt + glare (amenities & gallery) ---------- */
(function(){
  if(reduced) return;
  if(window.matchMedia && window.matchMedia('(hover:none)').matches) return;
  var MAX=7; /* max tilt in degrees */
  var cards=document.querySelectorAll('.am-card,.g-item');
  cards.forEach(function(card){
    var rect=null, raf=null;
    card.addEventListener('pointerenter', function(){
      rect=card.getBoundingClientRect();
      card.classList.remove('tilt-reset');
      card.classList.add('tilting','glare-on');
    });
    card.addEventListener('pointermove', function(e){
      if(!rect) rect=card.getBoundingClientRect();
      var px=(e.clientX-rect.left)/rect.width;
      var py=(e.clientY-rect.top)/rect.height;
      var rx=(0.5-py)*2*MAX;
      var ry=(px-0.5)*2*MAX;
      if(raf) cancelAnimationFrame(raf);
      raf=requestAnimationFrame(function(){
        card.style.transform='perspective(1000px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg)';
        card.style.setProperty('--gx',(px*100).toFixed(1)+'%');
        card.style.setProperty('--gy',(py*100).toFixed(1)+'%');
      });
    });
    card.addEventListener('pointerleave', function(){
      if(raf) cancelAnimationFrame(raf);
      card.classList.remove('tilting','glare-on');
      card.classList.add('tilt-reset');
      card.style.transform='';
      rect=null;
    });
  });
})();

/* On-screen keyboard: flag it on <body> so the bottom-fixed bars can move out
   of the way (see .kb-open in the sheet). Only the field types that actually
   raise a keyboard count - a range slider or a date picker does not. */
(function(){
  const TYPED = { text:1, email:1, tel:1, number:1, search:1, url:1, password:1 };
  const typed = el => el && (
    el.tagName === 'TEXTAREA' ||
    (el.tagName === 'INPUT' && TYPED[(el.type || 'text').toLowerCase()])
  );
  const set = on => document.body.classList.toggle('kb-open', on);

  document.addEventListener('focusin', e => { if(typed(e.target)) set(true); });
  /* Deferred: moving between two fields fires focusout before the next
     focusin, and hiding then re-showing the bar in between makes it flicker. */
  document.addEventListener('focusout', e => {
    if(!typed(e.target)) return;
    setTimeout(() => { if(!typed(document.activeElement)) set(false); }, 80);
  });
})();

/* Preferred Date — calendar-only picker (no manual typing) */
(function(){
  const d = document.getElementById('fdate');
  if(!d) return;

  // Bookable window: today through one year out.
  const pad = n => String(n).padStart(2,'0');
  const iso = dt => dt.getFullYear()+'-'+pad(dt.getMonth()+1)+'-'+pad(dt.getDate());
  const today = new Date();
  const maxDate = new Date(today.getFullYear()+1, today.getMonth(), today.getDate());
  d.min = iso(today);
  d.max = iso(maxDate);

  // min/max only mark the field :invalid - they do not stop a value landing
  // outside the range. Chrome's arrow keys walk the segments straight past min,
  // and some Android pickers let you tap a greyed-out day. So the value is
  // corrected the moment it changes, rather than leaving the visitor to find
  // out at submit that the date they picked was never allowed.
  const note = document.getElementById('formStatus');
  const say = msg => {
    if(!note) return;
    note.textContent = msg;
    note.classList.remove('is-err');
    note.classList.add('show');
    setTimeout(() => note.classList.remove('show'), 3500);
  };
  d.addEventListener('change', function(){
    if(!d.value) return;
    if(d.value < d.min){
      d.value = d.min;
      say('Site visits can be booked from today onwards — moved to the earliest date.');
    } else if(d.value > d.max){
      d.value = d.max;
      say('Visits can be booked up to a year ahead — moved to the latest date.');
    }
  });

  // Block typed entry — the value may only come from the calendar. Navigation
  // and clearing keys stay live so keyboard users aren't trapped in the field.
  const allowed = ['Tab','Escape','Enter',' ','Backspace','Delete',
                   'ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
  d.addEventListener('keydown', function(e){
    if(e.metaKey || e.ctrlKey || allowed.includes(e.key)) return;
    e.preventDefault();
  });

  // Firefox has no ::-webkit-calendar-picker-indicator, so the CSS full-field
  // overlay doesn't apply there — open the picker explicitly instead. Guarded
  // because showPicker() throws without user activation, and Chrome/Safari have
  // already opened natively by this point.
  const openPicker = function(){
    if(typeof d.showPicker !== 'function') return;
    try{ d.showPicker(); }catch(err){ /* no user activation, or already open */ }
  };
  const hasIndicatorOverlay = window.CSS && CSS.supports &&
    CSS.supports('selector(::-webkit-calendar-picker-indicator)');
  if(!hasIndicatorOverlay){
    d.addEventListener('click', openPicker);
  }
  // Space/Enter opens the calendar for keyboard users on every engine.
  d.addEventListener('keydown', function(e){
    if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openPicker(); }
  });
})();

/* Site visit request → PropFlo */
document.getElementById('visitForm').addEventListener('submit', function(e){
  e.preventDefault();
  const status = document.getElementById('formStatus');
  const phoneEl = document.getElementById('fphone');

  /* Bot filled the honeypot: look successful, write nothing. */
  if(window.CielLead.trap(this)){
    status.textContent = 'Request received — our team will call to confirm.';
    status.classList.remove('is-err'); status.classList.add('show'); this.reset();
    setTimeout(() => status.classList.remove('show'), 4000);
    return;
  }

  /* Same phone rule as the brochure form — a typo'd number is a dead lead. */
  const phone = window.CielLead.phone(phoneEl.value);
  if(!phone){
    status.textContent = 'Please enter a valid 10-digit Indian mobile number.';
    status.classList.add('is-err', 'show');
    phoneEl.focus();
    return;
  }

  /* The field carries min/max, but a native picker is not a guarantee: some
     Android date wheels let you land outside the range, and min is only ever
     advisory once the value is in hand. A visit booked for a past date is a
     wasted call, so the date is re-checked here - the one place every path
     through this form has to pass. Compared as YYYY-MM-DD strings, which sort
     correctly by date and avoid a timezone round-trip through Date(). */
  const dateEl = document.getElementById('fdate');
  if(dateEl && dateEl.value){
    const pad2 = n => String(n).padStart(2, '0');
    const now  = new Date();
    const today = now.getFullYear() + '-' + pad2(now.getMonth()+1) + '-' + pad2(now.getDate());
    if(dateEl.value < today){
      status.textContent = 'Please choose today or a later date for your visit.';
      status.classList.add('is-err', 'show');
      dateEl.focus();
      return;
    }
    if(dateEl.max && dateEl.value > dateEl.max){
      status.textContent = 'Please choose a date within the next year.';
      status.classList.add('is-err', 'show');
      dateEl.focus();
      return;
    }
  }

  /* "Our team will call to confirm" is only true once the lead is in the CRM,
     so the confirmation waits for the write. A form that confirmed regardless
     is how a run of leads can quietly go nowhere while the page looks fine. */
  const form = this;
  const submitBtn = form.querySelector('button[type="submit"], button:not([type])');
  if(submitBtn) submitBtn.disabled = true;
  status.textContent = 'Sending…';
  status.classList.remove('is-err'); status.classList.add('show');

  window.CielLead.save({
    leadId: window.CielLead.newId(),
    name  : document.getElementById('fname').value.trim(),
    phone : phone,
    email : document.getElementById('femail').value.trim(),
    source: 'Site visit request',
    notes : document.getElementById('ftype').value + ' · preferred date: ' +
            (document.getElementById('fdate').value || 'not specified')
  }).then(() => {
    if(submitBtn) submitBtn.disabled = false;
    status.textContent = 'Request received — our team will call to confirm.';
    status.classList.remove('is-err');
    status.classList.add('show'); form.reset();
    setTimeout(() => status.classList.remove('show'), 4000);
  }, err => {
    if(submitBtn) submitBtn.disabled = false;
    /* Left on screen, not timed out: it carries the number to call instead. */
    status.textContent = err.message;
    status.classList.add('is-err', 'show');
  });
});


/* --- Modal Leads Handler --- */

(function(){
  var overlay = document.getElementById('exitOverlay');
  var shown = false;
  function showExit(){
    if(shown) return;
    try{ if(sessionStorage.getItem('ciel_exit')==='1') return; }catch(e){}
    shown = true;
    overlay.classList.add('open');
    lockPage(true);
    try{ sessionStorage.setItem('ciel_exit','1'); }catch(e){}
  }
  function closeExit(){ overlay.classList.remove('open'); lockPage(false); }
  document.getElementById('exitClose').onclick = closeExit;
  overlay.addEventListener('click', function(e){ if(e.target===overlay) closeExit(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeExit(); });
  document.getElementById('exitVisitBtn').addEventListener('click', function(){ closeExit(); });

  // Desktop: mouse leaves viewport toward top (close/back button area)
  document.addEventListener('mouseout', function(e){
    if(e.clientY < 5 && e.relatedTarget === null) showExit();
  });

  // Mobile: scrolled 80%+ and starts scrolling back up
  var maxScroll = 0;
  var triggered = false;
  window.addEventListener('scroll', function(){
    var h = document.documentElement;
    var pct = h.scrollTop / (h.scrollHeight - h.clientHeight);
    if(pct > maxScroll) maxScroll = pct;
    if(!triggered && maxScroll > 0.8 && pct < maxScroll - 0.05){
      triggered = true;
      showExit();
    }
  }, {passive:true});
})();


/* --- Inline Scroll Leads Handler --- */

(function(){
  /* ══════════════════════════════════════════════════════════════════
     BROCHURE REQUEST

     No longer a gate and no longer a download. The visitor leaves their
     details, the lead goes to PropFlo, and the team sends the brochure
     themselves — so there is no OTP step, no SMS provider and no PDF handed
     over. /api/lead is the only route involved.

     The brochure CTAs are [data-gate-brochure] hooks rather than links to the
     PDF on purpose: with nothing to hand over, an href to the file would let
     anyone skip the form, and would serve the raw PDF outright if this script
     ever failed to run.

     Leads go through the shared window.CielLead sink (defined beside the site
     visit form) so every capture surface writes to one endpoint.
     ══════════════════════════════════════════════════════════════════ */
  var gate  = document.getElementById('gateOverlay');
  var steps = { 1:document.getElementById('gateStep1'), 2:document.getElementById('gateStep2') };
  var err1  = document.getElementById('gateErr1');
  var sendBtn = document.getElementById('gateSubmit');

  var lead = null;      // {leadId, name, phone, email} for the session

  function show(n){
    for(var k in steps) steps[k].classList.toggle('is-active', String(k)===String(n));
  }
  function busy(btn, on, label){
    btn.classList.toggle('is-busy', on);
    if(on){ btn.dataset.label = btn.textContent; btn.textContent = label; }
    else if(btn.dataset.label){ btn.textContent = btn.dataset.label; }
  }

  /* The old OTP gate set ciel_brochure=1 once a number was verified, and used
     it to hand the PDF straight over on the next visit. There is no PDF to hand
     over now and the form IS the point, so the flag is not read any more — and
     it is cleared here, because anyone who tested the old gate still has it set
     and would otherwise be shown the thank-you note forever, never able to
     submit again. */
  try{ localStorage.removeItem('ciel_brochure'); }catch(e){}

  function openGate(e){
    if(e) e.preventDefault();
    err1.textContent = '';
    show(1);
    gate.classList.add('open');
    lockPage(true);
  }
  function closeGate(){ gate.classList.remove('open'); lockPage(false); }

  /* One selector, so each element is bound exactly once. */
  document.querySelectorAll('[data-gate-brochure]').forEach(function(el){
    el.addEventListener('click', openGate);
  });
  document.getElementById('gateClose').onclick = closeGate;
  document.getElementById('gateDone').onclick  = closeGate;
  gate.addEventListener('click', function(e){ if(e.target===gate) closeGate(); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeGate(); });

  /* ── Submit → PropFlo → thank you ── */
  sendBtn.onclick = function(){
    if(sendBtn.classList.contains('is-busy')) return;
    var n = document.getElementById('gName'),
        p = document.getElementById('gPhone'),
        m = document.getElementById('gEmail');

    /* Bot filled the honeypot. Drop it silently, without advancing. */
    if(window.CielLead.trap(steps[1])) return;

    err1.textContent = '';
    var phone = window.CielLead.phone(p.value);   /* shared rule, one place */
    if(!n.value.trim()){ err1.textContent = 'Please enter your name.'; n.focus(); return; }
    if(!phone){ err1.textContent = 'Enter a valid 10-digit Indian mobile number.'; p.focus(); return; }
    if(m.value.trim() && !/^\S+@\S+\.\S+$/.test(m.value.trim())){ err1.textContent = 'That email address looks incomplete.'; m.focus(); return; }

    /* Same row for a resubmit on the same number; a genuinely different number
       is a different person, so that mints a fresh id. */
    var sameNumber = lead && lead.phone === phone;
    lead = {
      leadId: sameNumber ? lead.leadId : window.CielLead.newId(),
      name:n.value.trim(), phone:phone, email:m.value.trim()
    };

    /* The thank-you note is a promise that someone will call, so it waits for
       the CRM to actually accept the lead. If the write fails the visitor sees
       why — and the sales number — instead of a reassurance that is not true. */
    busy(sendBtn, true, 'Sending…');
    window.CielLead.save({
      leadId: lead.leadId,
      name  : lead.name, phone: lead.phone, email: lead.email,
      source: 'Brochure request',
      notes : 'Brochure requested from the website — team to send it'
    }).then(function(){
      busy(sendBtn, false);
      show(2);
    }, function(e){
      busy(sendBtn, false);
      err1.textContent = e.message;
    });
  };

  /* ── Inline 2-field micro-forms ──
     Curiosity captures mid-scroll. Validation plus the honeypot is the whole
     quality filter, same as the brochure form. */
  document.querySelectorAll('.lead-inline').forEach(function(box){
    var ins   = box.querySelectorAll('.lead-mini input:not(.lead-hp)');
    var nameEl = ins[0], phoneEl = ins[1];
    var errEl = box.querySelector('.lead-err');

    function fail(el, msg){
      el.classList.add('is-bad'); errEl.textContent = msg; el.focus();
    }
    [nameEl, phoneEl].forEach(function(el){
      el.addEventListener('input', function(){
        el.classList.remove('is-bad'); errEl.textContent = '';
      });
    });

    box.querySelector('button').addEventListener('click', function(){
      /* Bot filled the honeypot: show the thank-you, save nothing. */
      if(window.CielLead.trap(box)){ box.classList.add('sent'); return; }

      errEl.textContent = '';
      if(!nameEl.value.trim()) return fail(nameEl, 'Please enter your name.');

      var phone = window.CielLead.phone(phoneEl.value);
      if(!phone) return fail(phoneEl, 'Enter a valid 10-digit Indian mobile number.');

      /* Only flip to the thank-you state once the write has actually landed —
         otherwise the visitor is told they will be contacted and nobody has
         their number. The error slot is the one validation already uses. */
      var btn = box.querySelector('button');
      btn.disabled = true;
      window.CielLead.save({
        leadId: window.CielLead.newId(),
        name  : nameEl.value.trim(),
        phone : phone,
        source: 'Inline enquiry · ' + (box.dataset.lead || 'unknown')
      }).then(function(){
        btn.disabled = false;
        box.classList.add('sent');
      }, function(err){
        btn.disabled = false;
        errEl.textContent = err.message;
      });
    });
  });
})();


/* --- Cookie Consent Handler --- */

(function(){
  var bar = document.getElementById('cookieBar');
  try { if (localStorage.getItem('ciel_ck') === '1') { bar.style.display = 'none'; return; } } catch(e){}
  document.getElementById('cookieAccept').onclick = function(){
    bar.style.display = 'none';
    try { localStorage.setItem('ciel_ck', '1'); } catch(e){}
  };
})();


/* --- Explore-360 Ambient SVG Animation --- */

(function(){
  var cards = document.querySelectorAll('.web-card.explore-360');
  cards.forEach(function(card, ci){
    var stars = '';
    for(var i=0;i<16;i++){
      var x=(Math.random()*100).toFixed(1),
          y=(Math.random()*100).toFixed(1),
          r=(Math.random()*1.3+0.5).toFixed(2),
          d=(Math.random()*4).toFixed(2),
          dur=(3+Math.random()*3).toFixed(2);
      stars += '<circle class="wc-star" cx="'+x+'%" cy="'+y+'%" r="'+r+'" fill="#C8A96A" style="animation-delay:'+d+'s;animation-duration:'+dur+'s"/>';
    }
    var svg =
      '<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">'+
        '<defs>'+
          '<radialGradient id="wcg'+ci+'" cx="50%" cy="40%" r="60%">'+
            '<stop offset="0%" stop-color="#7848A8" stop-opacity="0.55"/>'+
            '<stop offset="100%" stop-color="#7848A8" stop-opacity="0"/>'+
          '</radialGradient>'+
          '<linearGradient id="wcs'+ci+'" x1="0" y1="0" x2="1" y2="0">'+
            '<stop offset="0%" stop-color="#C8A96A" stop-opacity="0"/>'+
            '<stop offset="50%" stop-color="#C8A96A" stop-opacity="0.10"/>'+
            '<stop offset="100%" stop-color="#C8A96A" stop-opacity="0"/>'+
          '</linearGradient>'+
        '</defs>'+
        '<ellipse class="wc-glow" cx="150" cy="165" rx="150" ry="160" fill="url(#wcg'+ci+')" style="animation-delay:'+(ci*0.6)+'s"/>'+
        stars+
        '<g class="wc-sweep" style="animation-delay:'+(ci*0.9)+'s"><rect x="0" y="-20" width="70" height="440" fill="url(#wcs'+ci+')" transform="skewX(-14)"/></g>'+
      '</svg>';
    var wrap = document.createElement('div');
    wrap.className = 'wc-anim';
    wrap.innerHTML = svg;
    card.insertBefore(wrap, card.firstChild);
  });
})();