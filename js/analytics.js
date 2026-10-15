/* ==========================================================================
   ANALYTICS & ATTRIBUTION MODULE
   ========================================================================== */

window.CIEL_ANALYTICS = { ga4: 'G-QKXH3FNGHM', clarity: 'ylql6sp0kz' };

(function(){
  var cfg = window.CIEL_ANALYTICS;

  /* ── Google Analytics 4 ── */
  window.dataLayer = window.dataLayer || [];
  window.gtag = function(){ dataLayer.push(arguments); };
  if(cfg.ga4){
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + cfg.ga4;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', cfg.ga4, { send_page_view: true });
  }

  /* ── Microsoft Clarity — session recordings + heatmaps ── */
  if(cfg.clarity){
    (function(c,l,a,r,i,t,y){
      c[a] = c[a] || function(){ (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t,y);
    })(window, document, 'clarity', 'script', cfg.clarity);
  }
  if(!window.clarity) window.clarity = function(){};   /* no-op stub */
})();

window.CielTrack = (function(){
  var LABELS = {
    heroSection:'Hero', masterplan:'Masterplan', amenities:'Amenities',
    skydeck:'Skydeck', residences:'Residences', webverse:'Webverse',
    gallery:'Gallery', location:'Location',
    trust:'Trust', visit:'Book a Visit'
  };

  var spent = {};      // id -> accumulated ms
  var since = {};      // id -> ms timestamp of current visible run
  var landed = Date.now();

  function now(){ return Date.now(); }
  function begin(id){ if(!since[id]) since[id] = now(); }
  function end(id){
    if(!since[id]) return;
    spent[id] = (spent[id] || 0) + (now() - since[id]);
    since[id] = 0;
  }
  function endAll(){ Object.keys(since).forEach(end); }

  /* Attention is credited to whichever section sits under the middle of the
     viewport. An IntersectionObserver ratio would NOT work here: most of these
     sections are taller than the screen, so they can never reach a 50% ratio
     and would silently never be counted. The midpoint test is height-agnostic. */
  var seen = {};
  var current = null;

  /* Cached: this ran querySelectorAll on every animation frame, allocating a
     fresh NodeList each time, and the rect reads land right after the progress
     bar writes a style - a forced synchronous layout per frame. The section list
     does not change after load. */
  var sectionList = null;
  function currentSection(){
    var mid = innerHeight / 2, hit = null;
    var list = sectionList || (sectionList = document.querySelectorAll('section[id]'));
    for(var i = 0; i < list.length; i++){
      var r = list[i].getBoundingClientRect();
      if(r.top <= mid && r.bottom >= mid){ hit = list[i].id; break; }
    }
    return hit;
  }

  function sync(){
    if(document.hidden) return;
    var id = currentSection();
    if(id === current) return;
    if(current) end(current);
    current = id;
    if(id){
      begin(id);
      if(!seen[id]){                     /* first real view — a GA4 funnel step */
        seen[id] = 1;
        gtag('event', 'section_view', { section: LABELS[id] || id });
      }
    }
  }

  function start(){
    var ticking = false;
    addEventListener('scroll', function(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(function(){ ticking = false; sync(); });
    }, { passive: true });

    /* Catches sections that move under the midpoint without a scroll event
       (anchor jumps, resize, lazy content reflow). */
    setInterval(sync, 1000);
    addEventListener('resize', sync);

    /* Pause the clock when the tab loses focus, or a backgrounded tab would
       silently log hours of "attention" nobody actually gave. */
    document.addEventListener('visibilitychange', function(){
      if(document.hidden){ endAll(); current = null; flush(); }
      else sync();
    });

    /* pagehide fires reliably on mobile Safari, where unload does not. */
    addEventListener('pagehide', flush);
    sync();
  }

  /* Fires on every tab-hide, not just the first. An earlier version latched on a
     one-shot `sent` flag, which meant the first tab-switch — often seconds into
     the visit — locked in the numbers and the real end of the visit was never
     reported, so most sessions logged a few seconds of attention.

     Sending repeatedly means the events must be deltas, or a visitor who
     switches tabs five times would have their time counted five times over.
     section_time therefore reports only what accrued since the last flush, so
     SUM(seconds) in GA4 is the true total. visit_summary carries the running
     total instead, so read it with MAX(total_seconds) — or take the row with
     the highest flush_seq. */
  var reported = {};                   // section id -> seconds already sent
  var flushes  = 0;

  function flush(){
    endAll();
    var s = summary();
    var fresh = false;

    s.sections.forEach(function(x){
      var already = reported[x.name] || 0;
      var delta = x.seconds - already;
      if(delta < 1) return;            // nothing new worth a round trip
      reported[x.name] = x.seconds;
      fresh = true;
      gtag('event', 'section_time', { section: x.name, seconds: delta });
    });

    if(!fresh && flushes) return;      // idle re-hide, nothing changed
    flushes++;
    gtag('event', 'visit_summary', {
      total_seconds: s.totalSeconds,
      top_section: s.sections.length ? s.sections[0].name : 'none',
      flush_seq: flushes
    });
  }

  /* Snapshot of this visit, ranked by attention. */
  function summary(){
    var snap = {};
    Object.keys(spent).forEach(function(k){ snap[k] = spent[k]; });
    Object.keys(since).forEach(function(k){
      if(since[k]) snap[k] = (snap[k] || 0) + (now() - since[k]);
    });

    var list = Object.keys(snap)
      .map(function(id){ return { name: LABELS[id] || id, seconds: Math.round(snap[id]/1000) }; })
      .filter(function(x){ return x.seconds >= 2; })          // drop scroll-past noise
      .sort(function(a,b){ return b.seconds - a.seconds; });

    return { sections: list, totalSeconds: Math.round((now() - landed)/1000) };
  }

  /* Human-readable digest for the lead record, e.g.
     "Residences 74s · Location 41s · Amenities 22s" */
  function digest(n){
    return summary().sections.slice(0, n || 3)
      .map(function(x){ return x.name + ' ' + x.seconds + 's'; }).join(' · ') || 'no section engagement';
  }

  /* Where the visitor came from — UTM wins, then referrer, then direct. */
  function source(){
    var q = new URLSearchParams(location.search);
    var utm = ['utm_source','utm_medium','utm_campaign']
      .map(function(k){ return q.get(k); }).filter(Boolean).join(' / ');
    if(utm) return utm;
    if(q.get('gclid')) return 'Google Ads';
    if(q.get('fbclid')) return 'Meta Ads';
    if(document.referrer){
      try{ return 'referral: ' + new URL(document.referrer).hostname; }catch(e){}
    }
    return 'direct';
  }

  if(document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
  else start();

  return { summary: summary, digest: digest, source: source, flush: flush };
})();

window.CielAds = (function(){
  var KEY  = 'ciel_ads';
  var DAYS = 30;      /* attribution window — a click older than this no longer
                         gets the credit for a lead */

  /* Section (c) tests utm_source === 'adwords' to decide a lead came from
     Google Ads. A bare gclid counts here too, because Google's own auto-tagging
     sets gclid and NO utm_source, and those are Google Ads leads just the same.
     Flip this to true to follow the guide's literal rule instead. */
  var STRICT = false;

  /* PropFlo field  <-  first URL parameter that carries it. The bare names are
     what Google ValueTrack writes through a tracking template ({campaignid},
     {adgroupid}, {creative}…); the utm_* names cover Meta, email and any
     hand-built link. */
  var MAP = {
    ad_campaign_id  : ['campaignid', 'utm_campaign_id'],
    ad_campaign_name: ['campaignname', 'utm_campaign'],
    ad_set_id       : ['adgroupid', 'adsetid', 'utm_adgroup_id'],
    ad_set_name     : ['adgroupname', 'adsetname', 'utm_adgroup'],
    ad_id           : ['creative', 'adid', 'utm_ad_id'],
    ad_name         : ['adname', 'utm_ad'],
    ad_keyword      : ['keyword', 'utm_term'],
    ad_placement    : ['placement', 'utm_content'],
    ad_form_id      : ['formid'],
    ad_form_name    : ['formname']
  };

  var CLICK_IDS = ['gclid', 'wbraid', 'gbraid', 'fbclid', 'msclkid', 'ttclid'];

  /* Survives a blocked localStorage (private mode, strict tracking settings) —
     the attribution still holds for this page view, which is the one that
     matters since the form is on the same page. */
  var mem = null;

  /* ValueTrack {device} arrives as m/t/c. PropFlo wants the spelled-out word,
     and with no {device} in the URL this browser can answer for itself. */
  function device(raw){
    var v = String(raw || '').toLowerCase();
    if(v === 'm' || v === 'mobile') return 'mobile';
    if(v === 't' || v === 'tablet') return 'tablet';
    if(v === 'c' || v === 'computer' || v === 'desktop') return 'desktop';
    return innerWidth < 820 ? 'mobile' : 'desktop';
  }

  function medium(q){
    var m = q.get('utm_medium');
    if(m) return m;
    if(q.get('gclid') || q.get('wbraid') || q.get('gbraid') || q.get('msclkid')) return 'paid_search';
    if(q.get('fbclid') || q.get('ttclid')) return 'paid_social';
    return '';
  }

  function capture(){
    var q = new URLSearchParams(location.search), click = '', i;
    for(i = 0; i < CLICK_IDS.length; i++){
      var v = q.get(CLICK_IDS[i]);
      if(v){ click = v; break; }
    }
    var src = q.get('utm_source') || '';

    /* Not an ad click. Leave whatever is stored alone — someone who saw the ad
       on Monday and typed the URL from memory on Friday is still that campaign's
       lead, and wiping it here would hand the credit to nobody. */
    if(!click && !src) return;

    var params = {};
    Object.keys(MAP).forEach(function(field){
      for(var j = 0; j < MAP[field].length; j++){
        var val = q.get(MAP[field][j]);
        if(val){ params[field] = val; return; }
      }
    });
    if(click) params.ad_click_id = click;
    var med = medium(q);
    if(med) params.ad_medium = med;
    params.ad_device = device(q.get('device'));

    var rec = {
      at: Date.now(),
      google: String(src).toLowerCase() === 'adwords' ||
              (!STRICT && !!(q.get('gclid') || q.get('wbraid') || q.get('gbraid'))),
      params: params
    };

    /* Last click wins — the model both Google Ads and PropFlo report on. */
    mem = rec;
    try{ localStorage.setItem(KEY, JSON.stringify(rec)); }catch(e){}
  }

  function stored(){
    /* `mem` first, and only fall back to storage when it is empty. mem is set
       by capture() on this page view, so when both exist mem is the newer of
       the two — reading storage first would let a stale campaign win on a
       browser where setItem throws but getItem still works. */
    var rec = mem;
    if(!rec){
      try{
        var raw = localStorage.getItem(KEY);
        if(raw) rec = JSON.parse(raw);
      }catch(e){}
    }
    if(!rec || !rec.at) return null;
    if(Date.now() - rec.at > DAYS * 864e5){          /* stale click, no credit */
      try{ localStorage.removeItem(KEY); }catch(e){}
      mem = null;
      return null;
    }
    return rec;
  }

  capture();

  return {
    /* The ad_* block for the PropFlo payload; {} for organic traffic. */
    params: function(){
      var rec = stored();
      return rec ? rec.params : {};
    },

    /* True when this lead should be filed under the Google Ads source in
       PropFlo rather than the landing page. */
    isGoogleAds: function(){
      var rec = stored();
      return !!(rec && rec.google);
    },

    campaignName: function(){
      var rec = stored();
      return (rec && rec.params.ad_campaign_name) || '';
    }
  };
})();