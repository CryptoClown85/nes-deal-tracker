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
    return {n:all.length, nCib:cib.length, cib:cib, best:all.slice().sort(by)[0], bestCib:cib.slice().sort(by)[0]||null};
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
    var x = L.bestCib || L.best;
    return '<a class="'+cls+'" href="'+esc(x.url)+'" target="_blank" rel="noopener" title="'+esc(x.title)+'">FOR SALE: '+L.n+' · '+
      (L.bestCib ? 'CIB from ' : 'from ')+eur(x.eur.total)+' ›</a>';
  }
  function thumb(g, cls){   // small box-art thumbnail (lazy) or retro placeholder
    if (g.im) return '<img class="'+cls+'" src="boxart/'+g.id+'.jpg" alt="" loading="lazy" decoding="async" width="'+(g.iw||40)+'" height="'+(g.ih||56)+'">';
    return '<span class="'+cls+' ph" style="--hue:'+HUES[hash(g.id)%HUES.length]+'" aria-hidden="true">'+esc(g.t.replace(/^(the|a) /i,"").charAt(0))+'</span>';
  }
  function tile(g){
    var s = own[g.id] || "M";
    var lab = s==="C" ? "CIB" : s==="L" ? "LOOSE" : "MISSING";
    var tag = s!=="C" ? saleTag(g, "sale") : "";
    if (g.im) return '<div id="bb-'+g.id+'"><div class="box img '+s+'" title="'+esc(g.t)+' – '+lab+'">'+
      '<img src="boxart/'+g.id+'.jpg" alt="'+esc(g.t)+' box art" loading="lazy" decoding="async"><span class="st">'+lab+'</span></div>'+
      '<span class="cap">'+esc(g.t)+'</span>'+tag+'</div>';
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
  function render(){
    var q = $("q").value.trim().toLowerCase();
    var bb = G.filter(function(g){ return g.bb && keep(g,q); });
    $("shelf").innerHTML = bb.map(tile).join("") || '<p class="empty" style="grid-column:1/-1">No black box games match.</p>';
    var rest = G.filter(function(g){ return !g.bb && keep(g,q); });
    var groups = {}, order = [];
    rest.forEach(function(g){ var L = letter(g.t); if (!groups[L]) { groups[L]=[]; order.push(L); } groups[L].push(g); });
    $("list-all").innerHTML = order.map(function(L){
      return '<h3 class="letter" id="L-'+(L==="#"?"0":L)+'">'+L+'</h3><div class="list">'+groups[L].map(crow).join("")+'</div>'; }).join("");
    $("jump").innerHTML = '<a href="#wanted">★</a><a href="#bb">BB</a>' + "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(function(L){
      return '<a href="#L-'+(L==="#"?"0":L)+'" class="'+(groups[L]?"":"off")+'">'+L+'</a>'; }).join("");
    $("none").hidden = !!(bb.length || rest.length);
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
