/* ==========================================================================
   LEAD CAPTURE & VALIDATION MODULE
   ========================================================================== */

window.CielLead = (function(){
            var ENDPOINT = '/api/lead';
            var reported = {};   /* leadIds already counted as a GA4 conversion */

            /* Two retries on a failed write, backing off, and only for the
               failures a retry can actually fix: a network drop or a 5xx. A 400
               (bad number) or 429 (throttled) will fail again just as fast.
               PropFlo refusals are logged server-side as well — see
               functions/api/lead.js — so an outage leaves a recoverable trail.

               Returns a promise so a caller can tell whether the lead actually
               landed. It resolves only once the route has accepted the write,
               and rejects with the message the route wrote for the visitor —
               which carries the sales number to call when the CRM is down.
               A form that showed "thanks" regardless is how a fortnight of
               leads can quietly go nowhere, so the brochure form waits for
               this; the mid-scroll captures still fire and forget. */
            var GENERIC = 'We could not record your details just now. Please call us on +91 99999 99999.';

            function post(payload, attempt){
              attempt = attempt || 0;
              var sent;
              try{
                sent = fetch(ENDPOINT, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                  keepalive: true
                });
              }catch(e){
                return Promise.reject(new Error(GENERIC));
              }
              return sent.then(function(r){
                if(r.ok) return true;
                return r.json().catch(function(){ return null; }).then(function(d){
                  /* The visitor gets one wording for every failure; the console
                     says which failure it actually was, because they are fixed in
                     very different places. A status with no JSON body means the
                     route is not there at all — which is what a plain static
                     preview of index.html looks like, since /api/* needs the
                     Worker to be running. */
                  console.error('[lead] /api/lead answered ' + r.status +
                    (d && d.message ? ' — ' + d.message
                                    : ' with no JSON body. Is the Worker running? A static ' +
                                      'preview of index.html has no /api/* route — use npm run dev.'));
                  var err = new Error((d && d.message) || GENERIC);
                  err.retryable = r.status >= 500;
                  throw err;
                });
              }, function(){
                console.error('[lead] /api/lead unreachable — the request never completed.');
                var err = new Error('Network error. Please check your connection and try again.');
                err.retryable = true;
                throw err;
              }).catch(function(e){
                if(e.retryable && attempt < 2){
                  return new Promise(function(done){ setTimeout(done, 1500 * (attempt + 1)); })
                           .then(function(){ return post(payload, attempt + 1); });
                }
                throw e;
              });
            }

            return {
              endpoint: ENDPOINT,

              /* Single phone rule for all four capture surfaces. Accepts what
                 people actually type (+91 98..., 0 98..., spaces, dashes) and
                 returns E.164, or '' when it isn't a real Indian mobile.
                 Indian mobiles start 6-9, so a 10-digit "91..." is invalid and
                 the country-code strip is guarded by length. */
              phone: function(raw){
                var d = String(raw || '').replace(/\D/g, '');
                if(d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
                if(d.length === 11 && d.charAt(0) === '0')   d = d.slice(1);
                return /^[6-9]\d{9}$/.test(d) ? '+91' + d : '';
              },

              /* Honeypot: bots fill every field they find, humans never see it.
                 Returns true when the trap inside `scope` was touched. */
              trap: function(scope){
                var hp = scope && scope.querySelector('.lead-hp');
                return !!(hp && hp.value);
              },

              /* Stable id for a lead. PropFlo's open API only creates leads —
                 it has no upsert — so this id rides along in `description` as
                 the thing that proves two records are one person. */
              newId: function(){
                return Date.now().toString(36) + '-' +
                       Math.random().toString(36).slice(2, 8);
              },

              /* Returns the post() promise. Callers that care whether the
                 write landed (the brochure form) wait on it; the rest attach a
                 no-op catch and carry on, because a CRM outage must not block a
                 mid-scroll capture. /api/lead is same-origin, so there is no
                 CORS preflight and — unlike the old opaque no-cors write to
                 Apps Script — a real status code comes back, which is what
                 makes both the retry and the waiting possible. keepalive keeps
                 the request in flight if the visitor leaves on submit. */
              save: function(lead){
                if(!lead) return;

                var t = window.CielTrack, ads = window.CielAds;

                /* Tag the Clarity recording with the phone number so sales can
                   search Clarity for this exact lead and watch their session. */
                try{
                  if(window.clarity && lead.phone){
                    window.clarity('identify', lead.phone);
                    window.clarity('set', 'lead_source', lead.source || 'Website');
                  }
                }catch(e){}

                /* One generate_lead per person, not per write — a resubmit on
                   the same number must not count as two conversions. */
                if(!lead.leadId || !reported[lead.leadId]){
                  if(lead.leadId) reported[lead.leadId] = 1;
                  try{ gtag('event', 'generate_lead', { lead_source: lead.source || 'Website' }); }catch(e){}
                }

                return post({
                  leadId: lead.leadId || '',
                  name: lead.name || '', phone: lead.phone || '', email: lead.email || '',
                  source: lead.source || 'Website', notes: lead.notes || '',
                  page: location.pathname,
                  at: new Date().toISOString(),
                  /* Behavioural context — what this person actually looked at.
                     PropFlo has one free-text field where the sheet had eleven
                     columns, so /api/lead folds all of this into `description`. */
                  channel  : t ? t.source() : '',
                  timeOnSite: t ? t.summary().totalSeconds : '',
                  interest : t ? t.digest(3) : '',
                  device   : (innerWidth < 820 ? 'Mobile' : 'Desktop') + ' · ' + screen.width + 'x' + screen.height,
                  gaClientId: (document.cookie.match(/_ga=GA\d\.\d\.(\d+\.\d+)/) || [])[1] || '',
                  /* Campaign attribution — decides which PropFlo source the lead
                     is filed under, and which ad gets the credit for it. */
                  campaignName: ads ? ads.campaignName() : '',
                  googleAds   : ads ? ads.isGoogleAds() : false,
                  ad          : ads ? ads.params() : {}
                }, 0);
              }
            };
          })();