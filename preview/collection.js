(function(){
  "use strict";
  var KEY = "nes-collection-v1";
  var G = window.NES_GAMES || [];
  // clearly-labelled EXAMPLE collection used for the preview
  var DEMO = {"super-mario-bros":"C","duck-hunt":"L","excitebike":"C","ice-climber":"L","tennis":"C","kung-fu":"C","balloon-fight":"C",
    "golf":"L","donkey-kong":"L","wrecking-crew":"C","the-legend-of-zelda":"C","zelda-ii-the-adventure-of-link":"L","mega-man-2":"C",
    "kirby-s-adventure":"L","super-mario-bros-3":"C","tetris":"L","dr-mario":"C","metroid":"L","castlevania":"C","ducktales":"C",
    "punch-out":"L","probotector":"C","2-in-1-super-mario-bros-duck-hunt":"L"};
  function loadMine(){ try { var o = JSON.parse(localStorage.getItem(KEY) || "{}"); return (o && o.games) || {}; } catch(e){ return {}; } }
  var mine = loadMine(), hasMine = Object.keys(mine).length > 0;
  var src = /[?&]mine\b/.test(location.search) && hasMine ? "mine" : "demo";
  var own = src === "mine" ? mine : DEMO;
  var f = {own:"all", cond:"all"};
  var live = {};  // pc key -> {n, best}
  var $ = function(id){ return document.getElementById(id); };
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function eur(v){ return v==null ? "–" : "€" + Math.round(v).toLocaleString("nl-NL"); }
  function sortKey(t){ return t.toLowerCase().replace(/^(the|a) /,""); }
  function letter(t){ var c = sortKey(t).charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : "#"; }
  function norm(s){ return String(s||"").toLowerCase().replace(/&/g," and ").replace(/\b(the|a|an|of|in)\b/g," ").replace(/[^a-z0-9]+/g,""); }
  function value(g){ var s = own[g.id]; return s==="C" ? g.b : s==="L" ? g.l : 0; }

  // deterministic 8x8 symmetric pixel sprite + hue per game, used as "box art"
  function hash(s){ var h=2166136261; for (var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
  function sprite(id){
    var h = hash(id), r = "", y, x;
    for (y=0;y<8;y++) for (x=0;x<4;x++) { h = Math.imul(h ^ (h>>>15), 2246822507)>>>0; if ((h & 7) < 4 || (y>2&&y<6&&x>1)) {
      r += '<rect x="'+x+'" y="'+y+'" width="1" height="1"/><rect x="'+(7-x)+'" y="'+y+'" width="1" height="1"/>'; } }
    return "url('data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">'+r+'</svg>') + "')";
  }
  var HUES = ["#d42020","#ffd23f","#2f8cff","#38b85a","#ff8a1c","#c04bff","#25c7c7","#ff5aa5"];

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
    var L = live[g.u] || live["t:"+norm(g.pt)];
    if (!L || own[g.id]==="C") return "";
    return '<a class="'+cls+'" href="'+esc(L.best.url)+'" target="_blank" rel="noopener" title="'+esc(L.best.title)+'">FOR SALE: '+L.n+' · from '+eur(L.best.eur.total)+
      (L.best.condition==="CIB"?" CIB":"")+' ›</a>';
  }
  function tile(g){
    var s = own[g.id] || "M";
    var lab = s==="C" ? "CIB" : s==="L" ? "LOOSE" : "MISSING";
    var h = HUES[hash(g.id) % HUES.length];
    var tag = s==="M" || s==="L" ? saleTag(g, "sale") : "";
    return '<div><div class="box '+s+'" title="'+esc(g.t)+' – '+lab+'"><span class="seal">NES</span><span class="st">'+lab+'</span>'+
      '<span class="art"><i style="--hue:'+h+';--pix:'+sprite(g.id)+'"></i></span><span class="bt">'+esc(g.t)+'</span></div>'+tag+'</div>';
  }
  function crow(g){
    var s = own[g.id] || "M";
    var lab = s==="C" ? "CIB" : s==="L" ? "Loose" : "Missing";
    var sub = [g.p, g.y].filter(Boolean).join(" · ") + (g.r ? " · "+g.r : "");
    var v = s==="M" ? '<span title="PriceCharting loose / CIB">'+eur(g.l)+' / '+eur(g.b)+'</span>' : eur(value(g));
    var tag = s!=="C" ? saleTag(g, "forsale") : "";
    return '<div class="crow '+s+'"><span class="chip '+s+'">'+lab+'</span><div class="nm"><b>'+esc(g.t)+'</b><small>'+esc(sub)+'</small>'+
      (tag ? '<small class="s">'+tag+'</small>' : '')+'</div><span class="val">'+v+'</span></div>';
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
    $("jump").innerHTML = '<a href="#bb">BB</a>' + "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(function(L){
      return '<a href="#L-'+(L==="#"?"0":L)+'" class="'+(groups[L]?"":"off")+'">'+L+'</a>'; }).join("");
    $("none").hidden = !!(bb.length || rest.length);
    var allBB = G.filter(function(g){return g.bb;});
    $("bb-cnt").textContent = allBB.filter(function(g){return own[g.id];}).length + "/" + allBB.length + " owned";
    $("all-cnt").textContent = G.filter(function(g){return !g.bb && own[g.id];}).length + "/" + (G.length-allBB.length) + " owned";
  }
  function stats(){
    var c=0,l=0,b=0,val=0;
    G.forEach(function(g){ var s=own[g.id]; if(s==="C")c++; else if(s==="L")l++; if(s&&g.bb)b++; val += value(g)||0; });
    var n=G.length, o=c+l;
    $("s-own").innerHTML = o+'<small> / '+n+'</small>'; $("s-cib").textContent=c; $("s-loose").textContent=l;
    $("s-bb").innerHTML = b+'<small> / '+G.filter(function(g){return g.bb;}).length+'</small>'; $("s-val").textContent = eur(val);
    $("pb-all").style.width=(100*o/n)+"%"; $("pb-cib").style.width=(100*c/n)+"%";
    $("ribbon").innerHTML = src==="demo" ? "<b>PREVIEW</b> · EXAMPLE DATA – not your real collection" : "<b>PREVIEW</b> · your checklist from this phone";
    $("srcnote").textContent = src==="demo" ? "Showing "+o+" example games so you can see how it looks. Tick your own games on the checklist page."
      : "Showing the games you ticked on the checklist (saved on this device).";
    $("src-mine").hidden = !(src==="demo" && hasMine); $("src-demo").hidden = src!=="mine";
  }
  document.addEventListener("click", function(e){
    var b = e.target.closest("[data-f]");
    if (!b) return;
    f[b.dataset.f] = b.dataset.v;
    document.querySelectorAll('[data-f="'+b.dataset.f+'"]').forEach(function(x){ x.setAttribute("aria-pressed", x===b?"true":"false"); });
    render();
  });
  $("src-mine").addEventListener("click", function(){ src="mine"; own=mine; history.replaceState(null,"","?mine"); stats(); render(); });
  $("src-demo").addEventListener("click", function(){ src="demo"; own=DEMO; history.replaceState(null,"",location.pathname); stats(); render(); });
  var t; $("q").addEventListener("input", function(){ clearTimeout(t); t=setTimeout(render,120); });

  // live listings from the tracker (same site): active, priced, newest data
  fetch("../data.json", {cache:"no-cache"}).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
    if (!d) return;
    (d.listings||[]).forEach(function(x){
      if (x.status!=="active" || !x.pc_title || !x.eur || x.eur.total==null) return;
      if (["lot","graded","box only"].indexOf(x.condition) >= 0) return;
      var keys = [x.pc_url, "t:"+norm(x.pc_title)];
      keys.forEach(function(k){
        if (!k) return;
        var L = live[k] || (live[k] = {n:0, best:null});
        L.n++;
        var better = !L.best || (x.condition==="CIB") > (L.best.condition==="CIB") ||
          ((x.condition==="CIB") === (L.best.condition==="CIB") && x.eur.total < L.best.eur.total);
        if (better) L.best = x;
      });
    });
    render();
  }).catch(function(){});
  stats(); render();
})();
