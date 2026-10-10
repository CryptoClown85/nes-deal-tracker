(function(){
  "use strict";
  var KEY = "nes-collection-v1";
  var G = window.NES_GAMES || [], BYID = {};
  G.forEach(function(g){ BYID[g.id] = g; });
  function loadLocal(){ try { var o = JSON.parse(localStorage.getItem(KEY) || "{}"); return (o && o.games) || {}; } catch(e){ return {}; } }
  var local = loadLocal(), hasLocal = Object.keys(local).length > 0;
  var pub = null, pubMeta = {};      // published collection (my_collection.json) = default on every device
  var src = "pub", own = {};
  var PUBE = {};                      // published entries by id (variant titles, e.g. a German-language version)
  function ve(g){ return src==="pub" && own[g.id] && PUBE[g.id] && PUBE[g.id].variant ? PUBE[g.id] : null; }
  var EX = [], EXID = {};             // extra owned items (e.g. graded carts) from my_collection.json "extras": shown next to their game, not counted as games
  /* shelf state: Show / Sort per shelf, remembered per device (default Owned, A–Z) */
  var SH = {
    bb: {key:"nes-bbshelf-v2", el:"shelf", pre:"bb-", def:{show:"own", sort:"az"}, games:function(g){ return g.bb; }, alt:"NES black box (NTSC art)",
         empty:{own:"No black box games owned yet.", miss:"All 30 black box games owned – nothing missing!", sale:"No black box games for sale (complete in box) right now.", all:"No black box games."}},
    cs: {key:"nes-classicshelf-v1", el:"cshelf", pre:"cs-", def:{show:"own", sort:"az"}, games:function(g){ return !g.bb; }, alt:"PAL box", search:true,
         empty:{own:"No other games owned yet.", miss:"Every other game owned – nothing missing!", sale:"No other games for sale (complete in box) right now.", all:"No games."}}
  };
  try { localStorage.removeItem("nes-bbshelf-v1"); localStorage.removeItem("nes-azlist-v1"); localStorage.removeItem("nes-azlist-v2"); } catch(e){}
  Object.keys(SH).forEach(function(k){ var c = SH[k]; c.st = {show:c.def.show, sort:c.def.sort}; c.q = "";
    try { var sv = JSON.parse(localStorage.getItem(c.key)||"null");
      if (sv) { if (/^(all|own|miss|sale)$/.test(sv.show)) c.st.show = sv.show; if (/^(az|val|cheap|rel)$/.test(sv.sort)) c.st.sort = sv.sort; } } catch(e){} });
  var live = {};                      // key -> {n, best, bestCib}
  var liveLoaded = false, wtype = "all";
  var $ = function(id){ return document.getElementById(id); };
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function eur(v){ return v==null ? "–" : "€" + Math.round(v).toLocaleString("nl-NL"); }
  function sortKey(t){ return t.toLowerCase().replace(/^(the|a) /,""); }
  function letter(t){ var c = sortKey(t).charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : "#"; }
  function norm(s){ return String(s||"").toLowerCase().replace(/&/g," and ").replace(/\b(the|a|an|of|in)\b/g," ").replace(/[^a-z0-9]+/g,""); }
  var VAL = {games:{}, graded:{}, method:{}};   // valuation.json: per owned game careful (median) / good (P70) / PriceCharting, from real sold prices
  function full(s){ return s==="C" || s==="S"; }   // complete copy owned (CIB or factory sealed): no upgrade listings
  var CONDN = {C:"CIB", S:"Sealed", L:"loose"};
  function vals(g){   // value of an owned game in its condition; falls back to the PriceCharting value when there is no valuation row
    var s = own[g.id]; if (!s) return null;
    var v = VAL.games[g.id];
    if (v && v.condition === CONDN[s]) return v;
    var pc = s==="C" ? g.b : s==="L" ? g.l : (v && v.pc) || g.b;
    return {careful:pc, good:pc, pc:pc, n:0, few:true, fallback:true};
  }
  function value(g){ var v = vals(g); return v ? v.pc : 0; }
  var MK = {marktplaats:"Marktplaats", tradera:"Tradera", ebay:"eBay.com", ebay_de:"eBay.de", ebay_it:"eBay.it", ebay_uk:"eBay.co.uk", "2dehands":"2dehands"};

  function hash(s){ var h=2166136261; for (var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function sprite(id){
    var h = hash(id), r = "", y, x;
    for (y=0;y<8;y++) for (x=0;x<4;x++) { h = Math.imul(h ^ (h>>>15), 2246822507)>>>0; if ((h & 7) < 4 || (y>2&&y<6&&x>1)) {
      r += '<rect x="'+x+'" y="'+y+'" width="1" height="1"/><rect x="'+(7-x)+'" y="'+y+'" width="1" height="1"/>'; } }
    return "url('data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">'+r+'</svg>') + "')";
  }
  var HUES = ["#d42020","#ffd23f","#2f8cff","#38b85a","#ff8a1c","#c04bff","#25c7c7","#ff5aa5"];

  function liveFor(g){   // merge listings matched by PriceCharting URL and by title (same listing counted once)
    var a = live[g.u], b = live["t:"+norm(g.pt)];
    if (!a || !b || a===b) return a || b || null;
    var seen = {}, all = [];
    a.all.concat(b.all).forEach(function(x){ if (!seen[x.key]) { seen[x.key]=1; all.push(x); } });
    var cib = all.filter(function(x){ return x.condition==="CIB"; });
    var by = function(p,q){ return p.eur.total-q.eur.total; };
    return {n:all.length, nCib:cib.length, cib:cib, all:all, best:all.slice().sort(by)[0], bestCib:cib.slice().sort(by)[0]||null};
  }
  function saleTag(g, cls){
    var L = liveFor(g);
    if (!L || full(own[g.id])) return "";
    if (!L.bestCib) return "";   // shelves: complete-in-box listings only
    var x = L.bestCib;
    // small yellow pill inside the title plate (tap the plate/box: the popup lists the CIB listings with links)
    return '<span class="'+cls+'" title="'+L.nCib+' CIB listing'+(L.nCib>1?'s':'')+' for sale, cheapest '+eur(x.eur.total)+' incl. shipping">FOR SALE '+eur(x.eur.total)+'</span>';
  }
  var ARTOV = window.NES_ART_OVERRIDES || {};   // per-game picture swaps (art_overrides.js)
  function art(g){ return ARTOV[g.id] ? ARTOV[g.id].src : g.bb ? "boxart/blackbox/"+g.id+".jpg" : "boxart/hi/"+g.id+".jpg"; }  // black box = NTSC original scan; others = PAL (360px)
  function thumb(g, cls){   // small box-art thumbnail (lazy) or retro placeholder
    if (g.bb) return '<img class="'+cls+'" src="'+art(g)+'" alt="" loading="lazy" decoding="async" width="252" height="360">';
    if (ARTOV[g.id]) return '<img class="'+cls+'" src="'+art(g)+'" alt="" loading="lazy" decoding="async" width="252" height="360">';
    if (g.im) return '<img class="'+cls+'" src="'+art(g)+'" alt="" loading="lazy" decoding="async" width="'+(g.iw||40)+'" height="'+(g.ih||56)+'">';
    return '<span class="'+cls+' ph" style="--hue:'+HUES[hash(g.id)%HUES.length]+'" aria-hidden="true">'+esc(g.t.replace(/^(the|a) /i,"").charAt(0))+'</span>';
  }
  function tile(g, k){
    var s = own[g.id] || "M", c = SH[k];
    var lab = s==="C" ? "CIB" : s==="S" ? "SEALED" : s==="L" ? "LOOSE" : "MISSING";
    var tag = s==="C" ? "" : s==="S" ? '<span class="pill sl">SEALED</span>' : s==="L" ? '<span class="pill loose">LOOSE</span>' : saleTag(g, "pill fs");   // no CIB badge on the shelves
    return '<div class="slot '+s+'" id="'+c.pre+g.id+'" data-l="'+letter(g.t)+'"><div class="stand"><div class="pbox '+s+'" data-bb="'+g.id+'" role="button" tabindex="0" aria-haspopup="dialog" aria-label="'+esc(g.t)+' – '+lab+' – details" title="'+esc(g.t)+' – '+lab+'">'+
      '<img src="'+art(g)+'" alt="'+esc(g.t)+' – '+c.alt+'" loading="lazy" decoding="async" width="252" height="360">'+
      '</div></div>'+
      '<span class="cap" data-bb="'+g.id+'" title="'+esc(ve(g) ? ve(g).title : g.t)+'"><span class="ctw"><span class="ct">'+esc(g.t)+'</span></span><span class="pills">'+tag+'</span></span></div>';
  }
  function tileX(x, k){   // graded slab etc.: same shelf slot, slab-shaped art, no box
    var c = SH[k], g = BYID[x.base] || {t:x.title};
    return '<div class="slot C xslot" id="'+c.pre+x.id+'" data-l="'+letter(g.t)+'"><div class="stand"><div class="pbox C slab" data-bb="'+x.id+'" role="button" tabindex="0" aria-haspopup="dialog" aria-label="'+esc(x.title)+' – owned extra – details" title="'+esc(x.title)+'">'+
      '<img src="'+esc(x.image)+'" alt="'+esc(x.title)+' – graded slab photo" loading="lazy" decoding="async" width="360" height="360">'+
      '</div></div><span class="cap" data-bb="'+x.id+'" title="'+esc(x.title)+'"><span class="ctw"><span class="ct">'+esc(x.short||x.title)+'</span></span><span class="pills"><span class="pill gr">Graded</span></span></span></div>';
  }
  function withExtras(list){   // put each extra right after its game, whatever the filter/sort (only where that game is shown)
    if (!EX.length) return list.map(function(g){ return {g:g}; });
    var out = [];
    list.forEach(function(g){ out.push({g:g}); EX.forEach(function(x){ if (x.base===g.id) out.push({x:x}); }); });
    return out;
  }
  function vclass(v){ return v==="Good buy"?"good":v==="Fair"?"fair":v==="Overpriced"?"over":"unclear"; }
  function pct(x){ return x==null ? "" : (x>0?"+":x<0?"−":"±")+Math.abs(Math.round(x*100))+"%"; }
  function wanted(){
    var miss = G.filter(function(g){ return g.bb && !own[g.id]; });
    $("wbb-cnt").textContent = "("+miss.length+")";
    $("w-bb").innerHTML = miss.map(function(g){
      var L = liveFor(g), x = L && L.bestCib;
      return '<a href="#bb-'+g.id+'" class="'+(x?"":"none")+'">'+thumb(g,"wt")+'<span>'+esc(g.t)+'<b>'+(x ? "CIB for sale "+eur(x.eur.total) : liveLoaded ? "value CIB "+eur(g.b) : "…")+'</b></span></a>';
    }).join("") || '<p class="note">All 30 black box games owned!</p>';
    if (!liveLoaded) return;
    var deals = [];
    G.forEach(function(g){ if (full(own[g.id])) return; var L = liveFor(g); if (!L) return;
      var c = L.cib.filter(function(x){ return wtype==="all" || (wtype==="auction" ? x.sale_type==="auction" : x.sale_type!=="auction"); })
        .sort(function(a,b){ return a.eur.total-b.eur.total; })[0];
      if (c) deals.push({g:g, x:c}); });
    deals.sort(function(a,b){ return a.x.eur.total - b.x.eur.total; });
    $("w-cnt").textContent = deals.length + " missing games with a CIB copy";
    $("w-deals").innerHTML = deals.slice(0, 8).map(function(d){
      var x = d.x, auc = x.sale_type==="auction";
      return '<a class="deal" href="'+esc(x.url)+'" target="_blank" rel="noopener">'+thumb(d.g,"th")+'<div class="nm"><b>'+esc(d.g.t)+(d.g.bb?' <span class="tb">BLACK BOX</span>':'')+'</b>'+
        '<small>'+(MK[x.marketplace]||x.marketplace)+(auc?' · auction (current bid)':'')+' · '+esc(x.title)+'</small></div>'+
        '<div class="pr"><b>'+eur(x.eur.total)+'</b><span class="vb '+vclass(x.verdict)+'">'+esc(x.verdict)+(x.pct!=null?' '+pct(x.pct):'')+'</span></div></a>';
    }).join("") || '<p class="note">No CIB listings for missing games right now.</p>';
  }
  /* ---------- black box shelf: filters, sort, detail popup ---------- */
  function forSale(g){ var L = !full(own[g.id]) && liveFor(g); return L && L.bestCib ? L : null; }   // CIB listings only
  function cheapest(g){ var L = forSale(g); return L ? L.bestCib : null; }
  function bbIs(g, show){ var s = own[g.id];
    return show==="own" ? !!s : show==="miss" ? !s : show==="sale" ? !!forSale(g) : true; }
  function matchQ(g, q){ return !q || (g.t+" "+(g.a||[]).join(" ")+" "+(g.p||"")).toLowerCase().indexOf(q) >= 0; }
  function renderShelf(k){
    var c = SH[k], st = c.st, all = G.filter(c.games);
    ["all","own","miss","sale"].forEach(function(v){
      $(k+"-n-"+v).textContent = (v==="sale" && !liveLoaded) ? "…" : all.filter(function(g){ return bbIs(g,v); }).length; });
    document.querySelectorAll('[data-sh="'+k+'"][data-show]').forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.show===st.show ? "true":"false"); });
    $(k+"-sort").value = st.sort;
    var changed = (st.show!==c.def.show) + (st.sort!==c.def.sort) + (c.q ? 1 : 0);
    $(k+"-reset").hidden = changed < 2;     // Reset only once more than one control is changed
    var list = all.filter(function(g){ return bbIs(g, st.show) && matchQ(g, c.q); });
    var az = function(a,b){ var x=sortKey(a.t), y=sortKey(b.t); return x<y ? -1 : x>y ? 1 : 0; };
    var hint = "";
    if (st.sort==="val") list.sort(function(a,b){ return (b.b||0)-(a.b||0) || az(a,b); });
    else if (st.sort==="rel") list.sort(function(a,b){ return (a.y||9999)-(b.y||9999) || az(a,b); });
    else if (st.sort==="cheap") {
      list.sort(function(a,b){ var x=cheapest(a), y=cheapest(b);
        if (x && y) return x.eur.total - y.eur.total; if (x) return -1; if (y) return 1; return az(a,b); });
      if (!liveLoaded) hint = "Loading live listings…";
      else if (st.show==="own") hint = "Owned games have no CIB listings to compare – showing A–Z.";
      else if (st.show!=="sale") hint = "Games with a complete-in-box listing first (cheapest total incl. shipping), then the rest A–Z.";
    } else list.sort(az);
    $(k+"-hint").textContent = hint; $(k+"-hint").hidden = !hint;
    $(c.el).innerHTML = withExtras(list).map(function(e){ return e.x ? tileX(e.x, k) : tile(e.g, k); }).join("") ||
      '<p class="empty bbempty">'+(c.q ? 'No games match “'+esc(c.q)+'”.' : st.show==="sale" && !liveLoaded ? "Loading live listings…" : c.empty[st.show])+'</p>';
    if (c.search) {   // letter jump (A–Z sort only)
      var have = {}; list.forEach(function(g){ have[letter(g.t)] = 1; });
      $(k+"-jump").hidden = st.sort!=="az" || list.length < 12;
      $(k+"-jump").innerHTML = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(function(L){
        return '<button type="button" data-jump="'+k+'" data-l="'+L+'"'+(have[L]?'':' disabled')+'>'+L+'</button>'; }).join("");
    }
  }
  function saveSh(k){ try { localStorage.setItem(SH[k].key, JSON.stringify(SH[k].st)); } catch(e){} }
  function s5For(g){   // last-5 CIB sales average, if the tracker fetched it for a listing of this game
    var L = liveFor(g); if (!L) return null; var r = null;
    L.all.forEach(function(x){ var s = x.sales5;   // same PAL product only (a US listing's sales would be compared with the PAL value)
      if (s && s.bucket==="cib" && s.n && s.pc_url===g.u && (!r || s.n > r.n)) r = s; });
    return r;
  }
  function popupX(x){
    var g = BYID[x.base] || {};
    return '<div class="bbd"><div class="bbd-art slab"><img src="'+esc(x.image_large||x.image)+'" alt="'+esc(x.title)+' – graded slab photo" width="720" height="720"></div>'+
      '<div class="bbd-info"><h3 id="bbd-t">'+esc(x.title)+'</h3>'+
      '<span class="chip C">Owned · graded extra</span>'+
      '<p class="bbd-sub">'+esc([g.p||"Nintendo", x.region].filter(Boolean).join(" · "))+'</p>'+
      '<dl><dt>Grade</dt><dd><b>'+esc(x.grader+' '+x.grade)+'</b> · '+esc(x.item)+'</dd>'+
      '<dt>Variant</dt><dd>'+esc(x.variant)+'</dd>'+
      '<dt>Region</dt><dd>'+esc(x.region)+'</dd>'+
      (VAL.graded[x.id] ? (function(v){ return '<dt>Value</dt><dd>careful <b>'+eur(v.careful)+'</b> · good condition <b>'+eur(v.good)+'</b>'+(v.few?' <span class="few">few sales</span>':'')+'</dd>'+
        '<dd class="wide xnote"><small>'+esc(v.basis)+' '+(v.sources||[]).map(function(s){ return '<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.label)+' ›</a>'; }).join(" · ")+'</small></dd>'; })(VAL.graded[x.id])
      : '<dt>Value</dt><dd>'+(x.value_eur!=null ? '<b>'+eur(x.value_eur)+'</b>' : 'not valued')+'</dd>'+
      '<dd class="wide xnote"><small>'+esc(x.value_note||"")+(x.value_source?' <a href="'+esc(x.value_source)+'" target="_blank" rel="noopener">Source ›</a>':'')+'</small></dd>')+purchRow(x, VAL.graded[x.id] ? VAL.graded[x.id].good : x.value_eur)+'</dl></div></div>'+
      (x.image_label ? '<div class="bbd-lbl"><img src="'+esc(x.image_label)+'" alt="Close-up of the WATA label of the photographed copy" width="720" height="191" loading="lazy"></div>' : '')+
      '<p class="note bbd-src"><b>Photo:</b> '+esc(x.image_note||"")+' Source: <a href="'+esc(x.image_source)+'" target="_blank" rel="noopener">'+esc(x.image_source_label||x.image_source)+'</a>.</p>'+
      '<p class="note">Not counted as a separate game (the CIB Legend of Zelda is), and not part of the checklist.</p>';
  }
  function valRow(g){   // owned games: careful / good-condition value from real sold prices
    var v = vals(g); if (!v) return "";
    if (v.fallback) return '<dt>Value</dt><dd>'+eur(v.pc)+' <small>(PriceCharting; no sales valuation)</small></dd>';
    var few = v.few ? ' <span class="few">few sales</span>' : '';
    var span = v.n ? v.n+' sale'+(v.n>1?'s':'')+(v.from ? ', '+(v.from===v.to ? v.to : v.from+' → '+v.to) : '') : 'no recent sales – PriceCharting value';
    var vg = v.grade==="very good";
    return '<dt class="vt">Value</dt><dd class="wide xnote vr">careful <b>'+eur(v.careful)+'</b> · '+(vg ? 'very good condition' : 'good condition')+' <b>'+eur(v.good)+'</b>'+
      '<small>'+(v.source_region ? '<b>US/NTSC sales</b> (<a href="'+esc(v.source_url)+'" target="_blank" rel="noopener">PriceCharting NES ›</a>), USD→EUR at ECB rate · ' : '')+(v.condition==="Sealed" ? 'sealed sales · ' : '')+(v.variant ? esc(v.variant)+' sales only · ' : '')+esc(span)+few+(vg ? ' · very good = 85th percentile of these sales' : '')+'</small></dd>';
  }
  function purchRow(e, good, vg){   // popup only: what was paid, and gain/loss vs the good-condition value
    if (!e) return "";
    var p = e.purchase_price;
    if (p==null || p==="" || isNaN(+p)) return '<dt class="pp-k">Purchase price</dt><dd class="pp-none">not set</dd>';
    p = +p;
    var extra = [e.purchase_date, e.purchase_note].filter(Boolean).join(" · ");
    var ps = p % 1 ? "€" + p.toLocaleString("nl-NL", {minimumFractionDigits:2, maximumFractionDigits:2}) : eur(p);   // keep cents (e.g. €47,50)
    var h = '<dt>Purchase price</dt><dd>'+ps+(p===0 ? ' <small class="pp-free">(free)</small>' : '')+'</dd>';
    if (extra) h += '<dd class="wide xnote"><small>'+esc(extra)+'</small></dd>';
    return h;
  }
  function openBB(id){
    var g = BYID[id];
    if (!g && EXID[id]) { $("bbd-body").innerHTML = popupX(EXID[id]); return showBB(id); }
    if (!g) return;
    var s = own[g.id], lab = s==="C" ? "Owned · CIB" : s==="S" ? "Owned · Sealed" : s==="L" ? "Owned · loose" : "Missing";
    var s5 = s5For(g), L = liveFor(g);
    if ((vals(g)||{}).l5 && vals(g).l5.n) s5 = vals(g).l5;   // per-game pricing source override (e.g. Ice Climber: NTSC sales)
    var h = '<div class="bbd"><div class="bbd-art '+(s?"":"M")+'"><img src="'+art(g)+'" alt="'+esc(g.t)+' – '+(g.bb?SH.bb.alt:SH.cs.alt)+'" width="252" height="360"></div>'+
      '<div class="bbd-info"><h3 id="bbd-t">'+esc(ve(g) ? ve(g).title : g.t)+'</h3>'+
      '<span class="chip '+(s||"M")+'">'+lab+'</span>'+((vals(g)||{}).grade==="very good" ? ' <span class="chip vg">Very good condition</span>' : '')+
      '<p class="bbd-sub">'+esc([ve(g) ? ve(g).variant_note : "", g.p, g.y ? "PAL "+g.y : ""].filter(Boolean).join(" · "))+'</p>'+
      '<dl>'+valRow(g)+(s && src==="pub" ? purchRow(PUBE[g.id], (vals(g)||{}).good, (vals(g)||{}).grade==="very good") : '')+(s==="S" && vals(g).pc!=null ? '<dt>PriceCharting sealed</dt><dd>'+eur(vals(g).pc)+'</dd>' : '')+((vals(g)||{}).source_region ? '<dt>PriceCharting CIB <small>(NTSC)</small></dt><dd>'+eur(vals(g).pc)+'</dd>' : '<dt>PriceCharting CIB'+(ve(g) ? ' <small>(all PAL versions)</small>' : '')+'</dt><dd>'+eur(g.b)+'</dd>')+
      '<dt>Loose</dt><dd>'+eur(g.l)+'</dd>'+
      (s==="S" || ve(g) ? '' : '<dt>Last '+(s5 ? s5.n : 5)+' CIB sales'+((vals(g)||{}).source_region ? ' <small>(NTSC)</small>' : '')+'</dt><dd>'+(s5 ? 'avg <b>'+eur(s5.avg_eur)+'</b></dd><dd class="wide"><small>'+esc(s5.from===s5.to ? s5.to : s5.from+' → '+s5.to)+' · PriceCharting sold</small>' : '<small>not available</small>')+'</dd>')+'</dl></div></div>';
    if (!full(s)) {
      if (!liveLoaded) h += '<p class="note">Loading live listings…</p>';
      else if (!L || !L.cib.length) h += '<p class="bbd-none">No complete-in-box copy for sale right now.</p>';
      else {
        var xs = L.cib.slice().sort(function(a,b){ return a.eur.total-b.eur.total; }).slice(0,3);
        h += '<h4 class="bbd-h">Cheapest complete-in-box for sale <small>('+L.cib.length+' CIB listing'+(L.cib.length>1?'s':'')+', total incl. shipping)</small></h4><div class="bbd-ls">'+xs.map(function(x){
          return '<div class="bbd-l"><div><b>'+eur(x.eur.total)+'</b> <span class="vb '+vclass(x.verdict)+'">'+esc(x.verdict)+(x.pct!=null?' '+pct(x.pct):'')+'</span>'+
            '<small>'+(MK[x.marketplace]||x.marketplace)+' · '+esc(x.condition==="CIB"?"CIB":x.condition)+(x.sale_type==="auction"?' · auction (current bid)':'')+'<br>'+esc(x.title)+'</small></div>'+
            '<a class="btn sm" href="'+esc(x.url)+'" target="_blank" rel="noopener">View listing ›</a></div>'; }).join("")+'</div>';
      }
    }
    $("bbd-body").innerHTML = h;
    showBB(g.id);
  }
  function showBB(id){
    var d = $("bbdlg"); bbOpener = document.activeElement && document.activeElement.closest && document.activeElement.closest("[data-bb]") ||
      document.querySelector('.shelf .pbox[data-bb="'+id+'"]');
    document.documentElement.classList.add("noscroll");
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute("open","");
    d.scrollTop = 0; $("bbd-x").focus();
  }
  var bbOpener = null;
  function closeBB(){ var d = $("bbdlg"); if (d.close) d.close(); else { d.removeAttribute("open"); afterClose(); } }
  function afterClose(){   // restore page scroll + return focus to the box that opened the popup
    document.documentElement.classList.remove("noscroll");
    var o = bbOpener && bbOpener.dataset && document.querySelector('.shelf .pbox[data-bb="'+bbOpener.dataset.bb+'"]');
    if (o) o.focus({preventScroll:true}); bbOpener = null;
  }
  $("bbdlg").addEventListener("close", afterClose);   // X, Esc (native) and tap outside all end here
  $("bbdlg").addEventListener("keydown", function(e){   // keep Tab inside the popup
    if (e.key!=="Tab") return;
    var f = [].slice.call(this.querySelectorAll('button,a[href],[tabindex]:not([tabindex="-1"])')).filter(function(x){ return x.offsetParent!==null; });
    if (!f.length) return; var first=f[0], last=f[f.length-1];
    if (e.shiftKey && document.activeElement===first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement===last) { e.preventDefault(); first.focus(); }
  });
  $("bbd-x").addEventListener("click", closeBB);
  $("bbdlg").addEventListener("click", function(e){   // tap outside (backdrop) - not on the sheet's own padding
    if (e.target!==this) return; var r = this.getBoundingClientRect();
    if (e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) closeBB(); });
  Object.keys(SH).forEach(function(k){
    $(k+"-sort").addEventListener("change", function(){ SH[k].st.sort = this.value; saveSh(k); renderShelf(k); });
    $(k+"-reset").addEventListener("click", function(){ var c = SH[k]; c.st = {show:c.def.show, sort:c.def.sort}; c.q = ""; if ($(k+"-q")) $(k+"-q").value = ""; saveSh(k); renderShelf(k); });
    $(SH[k].el).addEventListener("keydown", function(e){ var b = e.target.closest("[data-bb]");
      if (b && (e.key==="Enter" || e.key===" ")) { e.preventDefault(); openBB(b.dataset.bb); } });
    var qi = $(k+"-q"), qt;
    if (qi) qi.addEventListener("input", function(){ clearTimeout(qt); qt = setTimeout(function(){ SH[k].q = qi.value.trim().toLowerCase(); renderShelf(k); }, 150); });
  });

  function render(){
    renderShelf("bb"); renderShelf("cs");
    ["bb","cs"].forEach(function(k){ var all = G.filter(SH[k].games);
      $(k+"-cnt").textContent = all.filter(function(g){ return own[g.id]; }).length + "/" + all.length + " owned"; });
    wanted();
  }
  function stats(){
    var c=0,l=0,sl=0,b=0, nbb=G.filter(function(g){return g.bb;}).length, T={careful:0,good:0,pc:0}, TG={careful:0,good:0,pc:0}, nv=0;
    G.forEach(function(g){ var s=own[g.id]; if(!s) return; if(s==="C")c++; else if(s==="S")sl++; else if(s==="L")l++; if(g.bb)b++;
      var v = vals(g); ["careful","good","pc"].forEach(function(k){ T[k] += v[k]||0; }); });
    var n=G.length, o=c+l+sl;
    EX.forEach(function(x){ var v = VAL.graded[x.id] || {careful:x.value_eur, good:x.value_eur, pc:x.value_eur};
      if (v.careful==null) nv++; ["careful","good","pc"].forEach(function(k){ TG[k] += v[k]||0; }); });
    function pc(a,t){ return t ? (Math.round(1000*a/t)/10).toLocaleString("nl-NL") + "%" : "–"; }
    function bar(id, a, t){ var w = $(id+"-wrap"); $(id).style.width = (t ? 100*a/t : 0)+"%";
      w.setAttribute("aria-valuemax", t); w.setAttribute("aria-valuenow", a); w.setAttribute("aria-valuetext", a+" of "+t+" ("+pc(a,t)+")"); }
    function brk(k){ return "games " + eur(T[k]) + (EX.length ? " · graded " + eur(TG[k]) : ""); }
    $("s-own").innerHTML = o+'<small> / '+n+'</small>'; $("s-own-pct").textContent = pc(o,n); bar("pb-own", o, n);
    $("s-bb").innerHTML = b+'<small> / '+nbb+'</small>'; $("s-bb-pct").textContent = pc(b,nbb); bar("pb-bb", b, nbb);
    $("s-total").textContent = "≈ " + eur(T.good + TG.good);
    $("s-break").textContent = brk("good");
    $("s-careful").textContent = eur(T.careful + TG.careful); $("s-careful-b").textContent = brk("careful");
    $("s-pc").textContent = eur(T.pc + TG.pc); $("s-pc-b").textContent = brk("pc") + (nv ? " (" + nv + " not valued)" : "");
    var parts = [];
    if (c && !l && !sl) parts.push("All CIB"); else { if (c) parts.push("CIB " + c); if (sl) parts.push("Sealed " + sl); if (l) parts.push("Loose " + l); }
    var chips = [parts.join(" · ")];
    if (EX.length) chips.push(EX.length + " graded extra" + (EX.length>1 ? "s" : ""));
    $("s-chips").innerHTML = chips.filter(Boolean).map(function(t){ return '<span class="chip-s">'+esc(t)+'</span>'; }).join("");
    var upd = (pubMeta.updated||"").slice(0,10);
    $("st-upd").textContent = src==="pub" ? (upd ? "updated " + upd : "") : "this device";
    $("ribbon").innerHTML = src==="pub" ? "<b>My collection</b>"+(upd?" · updated "+upd:"") : "<b>Ticks from this device</b> (not the saved collection)";
    var M = VAL.method || {}, vd = VAL.valued ? new Date(VAL.valued+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "";
    $("srcnote").innerHTML = esc((src==="pub" ? "Showing the saved collection (" : "Showing this device's checklist ticks (") + o + " games). ") +
      (VAL.valued ? esc("Valued on " + vd + " from " + (M.sales_used||"") + " real PAL sales of complete-in-box copies (PriceCharting's record of eBay sales) from the past 12 months, or 24–36 months when a game sold fewer than 5 times. "
        + "Left out: graded, sealed, bundles and lots, reproductions, incomplete copies, NTSC/other versions and extreme outliers (" + ((M.sales_excluded||0)+(M.outliers_dropped||0)) + " sales). "
        + "Careful = the median sale. Good condition = the 70th percentile (what the nicer copies sold for) when a game has 6 or more sales, otherwise the median. "
        + (function(){ var vg = G.filter(function(g){ var v = own[g.id] && VAL.games[g.id]; return v && v.grade==="very good"; }).map(function(g){ return g.t; });
             return vg.length ? "Games you marked as very good condition (" + vg.join(", ") + ") use the 85th percentile instead (needs 6+ sales, never above the highest sale). " : ""; })()
        + (sl ? "Sealed games (Kung Fu) are valued from sealed sales. " : "")
        + (EX.length ? "Graded extras use the nearest WATA/CGC auction and eBay sales. " : "")
        + "PriceCharting = PriceCharting's own current values, for comparison. ") + '<a href="valuation_2026-10-09.md" target="_blank" rel="noopener">Full table with every sale ›</a>'
       : esc("Game value = PriceCharting PAL value for each owned game in its condition."));
    var differs = hasLocal && JSON.stringify(sortObj(local)) !== JSON.stringify(sortObj(pub||{}));
    $("src-local").hidden = !(src==="pub" && differs); $("src-pub").hidden = src!=="local";
  }
  function sortObj(o){ var r={}; Object.keys(o).sort().forEach(function(k){ r[k]=o[k]; }); return r; }
  document.addEventListener("click", function(e){
    var bs = e.target.closest("[data-show]");
    if (bs) { var k = bs.dataset.sh; SH[k].st.show = bs.dataset.show; saveSh(k); renderShelf(k); return; }
    var j = e.target.closest("[data-jump]");
    if (j) { var t = document.querySelector("#"+SH[j.dataset.jump].el+' .slot[data-l="'+j.dataset.l+'"]');
      if (t) t.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"}); return; }
    var bx = e.target.closest(".shelf [data-bb]");
    if (bx) { openBB(bx.dataset.bb); return; }
    var jl = e.target.closest('a[href^="#bb-"]');   // Wanted chip -> shelf box hidden by a filter? show all first
    if (jl && !document.getElementById(jl.getAttribute("href").slice(1))) { SH.bb.st.show = "all"; saveSh("bb"); renderShelf("bb"); }
    var w = e.target.closest("[data-w]");
    if (w) { wtype = w.dataset.w; document.querySelectorAll("[data-w]").forEach(function(x){ x.setAttribute("aria-pressed", x===w?"true":"false"); }); wanted(); return; }
  });
  $("src-local").addEventListener("click", function(){ src="local"; own=local; stats(); render(); });
  $("src-pub").addEventListener("click", function(){ src="pub"; own=pub||{}; stats(); render(); });

  fetch("my_collection.json", {cache:"no-cache"}).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
    pub = {}; pubMeta = (d && d.meta) || {};
    EX = ((d && d.extras) || []).filter(function(x){ return x && x.id && x.base && BYID[x.base] && !BYID[x.id]; });
    EX.forEach(function(x){ EXID[x.id] = x; });
    ((d && d.games) || []).forEach(function(x){ if (BYID[x.id]) PUBE[x.id] = x; if (BYID[x.id]) pub[x.id] = x.condition==="loose" ? "L" : /^sealed$/i.test(x.condition) ? "S" : "C"; });
  }).catch(function(){ pub = {}; }).then(function(){
    return fetch("valuation.json", {cache:"no-cache"}).then(function(r){ return r.ok ? r.json() : null; }).then(function(v){ if (v && v.games) VAL = v; }).catch(function(){});
  }).then(function(){
    if (src==="pub") own = pub;
    stats(); render();
  });
  // live listings from the tracker (same site)
  fetch("../data.json", {cache:"no-cache"}).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
    if (!d) return;
    (d.listings||[]).forEach(function(x){
      if (x.status!=="active" || !x.pc_title || !x.eur || x.eur.total==null) return;
      if (["lot","graded","box only"].indexOf(x.condition) >= 0) return;
      [x.pc_url, "t:"+norm(x.pc_title)].forEach(function(k){
        if (!k) return;
        var L = live[k] || (live[k] = {n:0, nCib:0, best:null, bestCib:null, cib:[], all:[]});
        L.n++; L.all.push(x);
        if (!L.best || x.eur.total < L.best.eur.total) L.best = x;
        if (x.condition==="CIB") { L.nCib++; L.cib.push(x); if (!L.bestCib || x.eur.total < L.bestCib.eur.total) L.bestCib = x; }
      });
    });
    liveLoaded = true; render();
  }).catch(function(){});
  stats(); render();
})();
