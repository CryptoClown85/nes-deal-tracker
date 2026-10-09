(function(){
  "use strict";
  var KEY = "nes-collection-v1";
  var G = window.NES_GAMES || [], BYID = {};
  G.forEach(function(g){ BYID[g.id] = g; });
  function loadLocal(){ try { var o = JSON.parse(localStorage.getItem(KEY) || "{}"); return (o && o.games) || {}; } catch(e){ return {}; } }
  var local = loadLocal(), hasLocal = Object.keys(local).length > 0;
  var pub = null, pubMeta = {};      // published collection (my_collection.json) = default on every device
  var src = "pub", own = {};
  var f = {own:"all", cond:"all"};
  var BBKEY = "nes-bbshelf-v1", bbf = {show:"all", sort:"az"};
  try { var sv = JSON.parse(localStorage.getItem(BBKEY)||"null"); if (sv) { if (/^(all|own|miss|sale)$/.test(sv.show)) bbf.show=sv.show; if (/^(az|val|cheap|rel)$/.test(sv.sort)) bbf.sort=sv.sort; } } catch(e){}
  var live = {};                      // key -> {n, best, bestCib}
  var liveLoaded = false, wtype = "all";
  var $ = function(id){ return document.getElementById(id); };
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function eur(v){ return v==null ? "–" : "€" + Math.round(v).toLocaleString("nl-NL"); }
  function sortKey(t){ return t.toLowerCase().replace(/^(the|a) /,""); }
  function letter(t){ var c = sortKey(t).charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : "#"; }
  function norm(s){ return String(s||"").toLowerCase().replace(/&/g," and ").replace(/\b(the|a|an|of|in)\b/g," ").replace(/[^a-z0-9]+/g,""); }
  function value(g){ var s = own[g.id]; return s==="C" ? g.b : s==="L" ? g.l : 0; }
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
  function keep(g, q){
    var s = own[g.id];
    if (f.own==="own" && !s) return false;
    if (f.own==="miss" && s) return false;
    if (f.cond!=="all" && s && s!==f.cond) return false;
    if (f.cond!=="all" && !s && f.own==="own") return false;
    if (q && (g.t+" "+(g.a||[]).join(" ")+" "+(g.p||"")).toLowerCase().indexOf(q) < 0) return false;
    return true;
  }
  function saleTag(g, cls){
    var L = liveFor(g);
    if (!L || own[g.id]==="C") return "";
    if (g.bb && !L.bestCib) return "";   // black box shelf: complete-in-box listings only
    var x = L.bestCib || L.best;
    return '<a class="'+cls+'" href="'+esc(x.url)+'" target="_blank" rel="noopener" title="'+esc(x.title)+'">FOR SALE: '+(g.bb ? L.nCib : L.n)+' · '+
      (L.bestCib ? 'CIB from ' : 'from ')+eur(x.eur.total)+' ›</a>';
  }
  function art(g){ return g.bb ? "boxart/blackbox/"+g.id+".jpg" : "boxart/"+g.id+".jpg"; }  // black box = NTSC original scan
  function thumb(g, cls){   // small box-art thumbnail (lazy) or retro placeholder
    if (g.bb) return '<img class="'+cls+'" src="'+art(g)+'" alt="" loading="lazy" decoding="async" width="252" height="360">';
    if (g.im) return '<img class="'+cls+'" src="'+art(g)+'" alt="" loading="lazy" decoding="async" width="'+(g.iw||40)+'" height="'+(g.ih||56)+'">';
    return '<span class="'+cls+' ph" style="--hue:'+HUES[hash(g.id)%HUES.length]+'" aria-hidden="true">'+esc(g.t.replace(/^(the|a) /i,"").charAt(0))+'</span>';
  }
  function tile(g){
    var s = own[g.id] || "M";
    var lab = s==="C" ? "CIB" : s==="L" ? "LOOSE" : "MISSING";
    var tag = s!=="C" ? saleTag(g, "sale") : "";
    if (g.bb) return '<div class="slot '+s+'" id="bb-'+g.id+'"><div class="stand"><div class="pbox '+s+'" data-bb="'+g.id+'" role="button" tabindex="0" aria-haspopup="dialog" aria-label="'+esc(g.t)+' – '+lab+' – details" title="'+esc(g.t)+' – '+lab+'">'+
      '<img src="'+art(g)+'" alt="'+esc(g.t)+' – NES black box" loading="lazy" decoding="async" width="252" height="360">'+
      (s!=="M" ? '<span class="st">'+lab+'</span>' : '')+'</div></div>'+
      '<span class="cap" data-bb="'+g.id+'" title="'+esc(g.t)+'"><span>'+esc(g.t)+'</span></span>'+tag+'</div>';
    var h = HUES[hash(g.id) % HUES.length];
    return '<div id="bb-'+g.id+'"><div class="box '+s+'" title="'+esc(g.t)+' – '+lab+'"><span class="seal">NES</span><span class="st">'+lab+'</span>'+
      '<span class="art"><i style="--hue:'+h+';--pix:'+sprite(g.id)+'"></i></span><span class="bt">'+esc(g.t)+'</span></div>'+tag+'</div>';
  }
  function crow(g){
    var s = own[g.id] || "M";
    var lab = s==="C" ? "CIB" : s==="L" ? "Loose" : "Missing";
    var sub = [g.p, g.y].filter(Boolean).join(" · ") + (g.r ? " · "+g.r : "");
    var v = s==="M" ? '<span title="PriceCharting loose / CIB">'+eur(g.l)+' / '+eur(g.b)+'</span>' : eur(value(g));
    var tag = s!=="C" ? saleTag(g, "forsale") : "";
    return '<div class="crow '+s+'">'+thumb(g,"th")+'<div class="nm"><span class="chip '+s+'">'+lab+'</span><b>'+esc(g.t)+'</b><small>'+esc(sub)+'</small>'+
      (tag ? '<small class="s">'+tag+'</small>' : '')+'</div><span class="val">'+v+'</span></div>';
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
    G.forEach(function(g){ if (own[g.id]==="C") return; var L = liveFor(g); if (!L) return;
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
  function forSale(g){ var L = own[g.id]!=="C" && liveFor(g); return L && L.bestCib ? L : null; }   // CIB listings only
  function cheapest(g){ var L = forSale(g); return L ? L.bestCib : null; }
  function bbIs(g, show){ var s = own[g.id];
    return show==="own" ? !!s : show==="miss" ? !s : show==="sale" ? !!forSale(g) : true; }
  var BBEMPTY = {own:"No black box games owned yet.", miss:"All 30 black box games owned – nothing missing!",
    sale:"No black box games for sale right now.", all:"No black box games."};
  function renderShelf(){
    var all = G.filter(function(g){ return g.bb; });
    ["all","own","miss","sale"].forEach(function(k){
      $("bn-"+k).textContent = (k==="sale" && !liveLoaded) ? "…" : all.filter(function(g){ return bbIs(g,k); }).length; });
    document.querySelectorAll("[data-bs]").forEach(function(b){ b.setAttribute("aria-pressed", b.dataset.bs===bbf.show ? "true":"false"); });
    $("bb-sort").value = bbf.sort;
    $("bb-reset").hidden = !(bbf.show!=="all" && bbf.sort!=="az");
    var list = all.filter(function(g){ return bbIs(g, bbf.show); });
    var az = function(a,b){ return sortKey(a.t) < sortKey(b.t) ? -1 : sortKey(a.t) > sortKey(b.t) ? 1 : 0; };
    var hint = "";
    if (bbf.sort==="val") list.sort(function(a,b){ return (b.b||0)-(a.b||0) || az(a,b); });
    else if (bbf.sort==="rel") list.sort(function(a,b){ return (a.y||9999)-(b.y||9999) || az(a,b); });
    else if (bbf.sort==="cheap") {
      list.sort(function(a,b){ var x=cheapest(a), y=cheapest(b);
        if (x && y) return x.eur.total - y.eur.total; if (x) return -1; if (y) return 1; return az(a,b); });
      if (!liveLoaded) hint = "Loading live listings…";
      else if (bbf.show==="own") hint = "Owned games have no CIB listings to compare – showing A–Z.";
      else if (bbf.show!=="sale") hint = "Games with a complete-in-box listing first (cheapest total incl. shipping), then the rest A–Z.";
    } else list.sort(az);
    $("bb-hint").textContent = hint; $("bb-hint").hidden = !hint;
    $("shelf").innerHTML = list.map(tile).join("") ||
      '<p class="empty bbempty">'+(bbf.show==="sale" && !liveLoaded ? "Loading live listings…" : BBEMPTY[bbf.show])+'</p>';
  }
  function saveBB(){ try { localStorage.setItem(BBKEY, JSON.stringify(bbf)); } catch(e){} }
  function s5For(g){   // last-5 CIB sales average, if the tracker fetched it for a listing of this game
    var L = liveFor(g); if (!L) return null; var r = null;
    L.all.forEach(function(x){ var s = x.sales5;   // same PAL product only (a US listing's sales would be compared with the PAL value)
      if (s && s.bucket==="cib" && s.n && s.pc_url===g.u && (!r || s.n > r.n)) r = s; });
    return r;
  }
  function openBB(id){
    var g = BYID[id]; if (!g) return;
    var s = own[g.id], lab = s==="C" ? "Owned · CIB" : s==="L" ? "Owned · loose" : "Missing";
    var s5 = s5For(g), L = liveFor(g);
    var h = '<div class="bbd"><div class="bbd-art '+(s?"":"M")+'"><img src="'+art(g)+'" alt="'+esc(g.t)+' – NES black box (NTSC art)" width="252" height="360"></div>'+
      '<div class="bbd-info"><h3 id="bbd-t">'+esc(g.t)+'</h3>'+
      '<span class="chip '+(s||"M")+'">'+lab+'</span>'+
      '<p class="bbd-sub">'+esc([g.p, g.y ? "PAL "+g.y : ""].filter(Boolean).join(" · "))+'</p>'+
      '<dl><dt>PriceCharting CIB</dt><dd>'+eur(g.b)+'</dd>'+
      '<dt>Loose</dt><dd>'+eur(g.l)+'</dd>'+
      '<dt>Last '+(s5 ? s5.n : 5)+' CIB sales</dt><dd>'+(s5 ? 'avg <b>'+eur(s5.avg_eur)+'</b></dd><dd class="wide"><small>'+esc(s5.from===s5.to ? s5.to : s5.from+' → '+s5.to)+' · PriceCharting sold</small>' : '<small>not available</small>')+'</dd></dl></div></div>';
    if (s!=="C") {
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
    var d = $("bbdlg"); bbOpener = document.activeElement && document.activeElement.closest && document.activeElement.closest("[data-bb]") ||
      document.querySelector('#shelf .pbox[data-bb="'+g.id+'"]');
    document.documentElement.classList.add("noscroll");
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute("open","");
    d.scrollTop = 0; $("bbd-x").focus();
  }
  var bbOpener = null;
  function closeBB(){ var d = $("bbdlg"); if (d.close) d.close(); else { d.removeAttribute("open"); afterClose(); } }
  function afterClose(){   // restore page scroll + return focus to the box that opened the popup
    document.documentElement.classList.remove("noscroll");
    var o = bbOpener && bbOpener.dataset && document.querySelector('#shelf .pbox[data-bb="'+bbOpener.dataset.bb+'"]');
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
  $("bb-sort").addEventListener("change", function(){ bbf.sort = this.value; saveBB(); renderShelf(); });
  $("bb-reset").addEventListener("click", function(){ bbf = {show:"all", sort:"az"}; saveBB(); renderShelf(); });
  $("shelf").addEventListener("keydown", function(e){ var b = e.target.closest("[data-bb]");
    if (b && (e.key==="Enter" || e.key===" ")) { e.preventDefault(); openBB(b.dataset.bb); } });

  function render(){
    var q = $("q").value.trim().toLowerCase();
    renderShelf();
    var rest = G.filter(function(g){ return !g.bb && keep(g,q); });
    var groups = {}, order = [];
    rest.forEach(function(g){ var L = letter(g.t); if (!groups[L]) { groups[L]=[]; order.push(L); } groups[L].push(g); });
    $("list-all").innerHTML = order.map(function(L){
      return '<h3 class="letter" id="L-'+(L==="#"?"0":L)+'">'+L+'</h3><div class="list">'+groups[L].map(crow).join("")+'</div>'; }).join("");
    $("jump").innerHTML = '<a href="#wanted">★</a><a href="#bb">BB</a>' + "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(function(L){
      return '<a href="#L-'+(L==="#"?"0":L)+'" class="'+(groups[L]?"":"off")+'">'+L+'</a>'; }).join("");
    $("none").hidden = !!rest.length;
    var allBB = G.filter(function(g){return g.bb;});
    $("bb-cnt").textContent = allBB.filter(function(g){return own[g.id];}).length + "/" + allBB.length + " owned";
    $("all-cnt").textContent = G.filter(function(g){return !g.bb && own[g.id];}).length + "/" + (G.length-allBB.length) + " owned";
    wanted();
  }
  function stats(){
    var c=0,l=0,b=0,val=0;
    G.forEach(function(g){ var s=own[g.id]; if(s==="C")c++; else if(s==="L")l++; if(s&&g.bb)b++; val += value(g)||0; });
    var n=G.length, o=c+l;
    $("s-own").innerHTML = o+'<small> / '+n+'</small>'; $("s-cib").textContent=c; $("s-loose").textContent=l;
    $("s-bb").innerHTML = b+'<small> / '+G.filter(function(g){return g.bb;}).length+'</small>'; $("s-val").textContent = eur(val);
    $("pb-all").style.width=(100*o/n)+"%"; $("pb-cib").style.width=(100*c/n)+"%";
    var upd = (pubMeta.updated||"").slice(0,10);
    $("ribbon").innerHTML = src==="pub" ? "<b>PREVIEW</b> · my collection"+(upd?" · updated "+upd:"") : "<b>PREVIEW</b> · ticks saved on this phone (not the saved collection)";
    $("srcnote").textContent = (src==="pub" ? "Saved collection: " : "This phone's checklist ticks: ") + o + " games. Value = PriceCharting PAL value for each game in its condition.";
    var differs = hasLocal && JSON.stringify(sortObj(local)) !== JSON.stringify(sortObj(pub||{}));
    $("src-local").hidden = !(src==="pub" && differs); $("src-pub").hidden = src!=="local";
  }
  function sortObj(o){ var r={}; Object.keys(o).sort().forEach(function(k){ r[k]=o[k]; }); return r; }
  document.addEventListener("click", function(e){
    var bs = e.target.closest("[data-bs]");
    if (bs) { bbf.show = bs.dataset.bs; saveBB(); renderShelf(); return; }
    var bx = e.target.closest("#shelf [data-bb]");
    if (bx) { openBB(bx.dataset.bb); return; }
    var jl = e.target.closest('a[href^="#bb-"]');   // Wanted chip -> shelf box hidden by a filter? show all first
    if (jl && !document.getElementById(jl.getAttribute("href").slice(1))) { bbf.show = "all"; saveBB(); renderShelf(); }
    var w = e.target.closest("[data-w]");
    if (w) { wtype = w.dataset.w; document.querySelectorAll("[data-w]").forEach(function(x){ x.setAttribute("aria-pressed", x===w?"true":"false"); }); wanted(); return; }
    var b = e.target.closest("[data-f]");
    if (!b) return;
    f[b.dataset.f] = b.dataset.v;
    document.querySelectorAll('[data-f="'+b.dataset.f+'"]').forEach(function(x){ x.setAttribute("aria-pressed", x===b?"true":"false"); });
    render();
  });
  $("src-local").addEventListener("click", function(){ src="local"; own=local; stats(); render(); });
  $("src-pub").addEventListener("click", function(){ src="pub"; own=pub||{}; stats(); render(); });
  var t; $("q").addEventListener("input", function(){ clearTimeout(t); t=setTimeout(render,120); });

  fetch("my_collection.json", {cache:"no-cache"}).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
    pub = {}; pubMeta = (d && d.meta) || {};
    ((d && d.games) || []).forEach(function(x){ if (BYID[x.id]) pub[x.id] = x.condition==="CIB" ? "C" : x.condition==="loose" ? "L" : "C"; });
  }).catch(function(){ pub = {}; }).then(function(){
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
