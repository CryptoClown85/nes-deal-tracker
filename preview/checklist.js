(function(){
  "use strict";
  var KEY = "nes-collection-v1";            // {id: "L" | "C"}  (shared with collection.html on the same site)
  var G = window.NES_GAMES || [];
  var own = load();
  var show = "all";
  function load(){ try { var o = JSON.parse(localStorage.getItem(KEY) || "{}"); return (o && o.games) || {}; } catch(e){ return {}; } }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify({v:1, updated:new Date().toISOString(), games:own})); } catch(e){} }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function sortKey(t){ return t.toLowerCase().replace(/^(the|a) /,""); }
  function letter(t){ var c = sortKey(t).charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : "#"; }
  var $ = function(id){ return document.getElementById(id); };
  document.querySelector("footer").innerHTML = document.querySelector("footer").innerHTML.replace("{N}", G.length);

  function rowHtml(g){
    var st = own[g.id] || "";
    var sub = [g.p, g.y].filter(Boolean).join(" · ");
    if (g.c) sub += " · compilation";
    if (g.r) sub += " · " + g.r;
    var th = g.im ? '<img class="th" src="boxart/'+g.id+'.jpg" alt="" loading="lazy" decoding="async" width="'+(g.iw||40)+'" height="'+(g.ih||56)+'">'
      : '<span class="th ph" aria-hidden="true">'+esc(g.t.replace(/^(the|a) /i,"").charAt(0))+'</span>';
    return '<div class="row '+st+'" data-id="'+g.id+'">'+th+'<div class="nm"><b>'+esc(g.t)+'</b><small>'+sub+'</small></div>'+
      '<div class="pick" role="group" aria-label="'+esc(g.t)+'">'+
      '<button class="o0" data-v="" aria-pressed="'+(st===""?"true":"false")+'" title="Not owned">NO</button>'+
      '<button class="oL" data-v="L" aria-pressed="'+(st==="L"?"true":"false")+'">LOOSE</button>'+
      '<button class="oC" data-v="C" aria-pressed="'+(st==="C"?"true":"false")+'">CIB</button></div></div>';
  }
  function match(g, q){
    if (show==="own" && !own[g.id]) return false;
    if (show==="need" && own[g.id]) return false;
    if (!q) return true;
    return (g.t+" "+(g.a||[]).join(" ")+" "+(g.p||"")).toLowerCase().indexOf(q) >= 0;
  }
  function render(){
    var q = $("q").value.trim().toLowerCase();
    var bb = G.filter(function(g){ return g.bb && match(g,q); });
    $("list-bb").innerHTML = bb.map(rowHtml).join("") || '<p class="empty">No black box games match.</p>';
    var rest = G.filter(function(g){ return !g.bb && match(g,q); });
    var groups = {}, order = [];
    rest.forEach(function(g){ var L = letter(g.t); if (!groups[L]) { groups[L] = []; order.push(L); } groups[L].push(g); });
    $("list-all").innerHTML = order.map(function(L){
      return '<h3 class="letter" id="L-'+(L==="#"?"0":L)+'">'+L+'</h3><div class="list">'+groups[L].map(rowHtml).join("")+'</div>';
    }).join("");
    var letters = "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    $("jump").innerHTML = '<a href="#bb" title="Black box">BB</a>' + letters.map(function(L){
      return '<a href="#L-'+(L==="#"?"0":L)+'" class="'+(groups[L]?"":"off")+'">'+L+'</a>'; }).join("");
    $("none").hidden = !!(bb.length || rest.length);
    $("bb-cnt").textContent = G.filter(function(g){return g.bb && own[g.id];}).length + "/" + G.filter(function(g){return g.bb;}).length;
    $("all-cnt").textContent = G.filter(function(g){return !g.bb && own[g.id];}).length + "/" + G.filter(function(g){return !g.bb;}).length;
    stats();
  }
  function stats(){
    var c=0,l=0,b=0;
    G.forEach(function(g){ var s=own[g.id]; if(s==="C")c++; else if(s==="L")l++; if(s&&g.bb)b++; });
    var n = G.length, o = c+l;
    $("s-own").innerHTML = o+'<small> / '+n+'</small>'; $("s-cib").textContent = c; $("s-loose").textContent = l;
    $("s-bb").innerHTML = b+'<small> / '+G.filter(function(g){return g.bb;}).length+'</small>'; $("s-need").textContent = n-o;
    $("pb-all").style.width = (100*o/n)+"%"; $("pb-cib").style.width = (100*c/n)+"%";
    $("dock-sum").textContent = o+"/"+n+" owned · "+c+" CIB · "+l+" loose";
  }
  document.addEventListener("click", function(e){
    var b = e.target.closest(".pick button");
    if (b) {
      var row = b.closest(".row"), id = row.dataset.id, v = b.dataset.v;
      if (v) own[id] = v; else delete own[id];
      save();
      row.className = "row " + (v||"");
      row.querySelectorAll(".pick button").forEach(function(x){ x.setAttribute("aria-pressed", x===b ? "true" : "false"); });
      stats();
      $("bb-cnt").textContent = G.filter(function(g){return g.bb && own[g.id];}).length + "/30";
      return;
    }
    var s = e.target.closest("[data-show]");
    if (s) { show = s.dataset.show; document.querySelectorAll("[data-show]").forEach(function(x){ x.setAttribute("aria-pressed", x===s?"true":"false"); }); render(); }
  });
  var t; $("q").addEventListener("input", function(){ clearTimeout(t); t = setTimeout(render, 120); });

  function summary(){
    var cib=[], loose=[];
    G.forEach(function(g){ if(own[g.id]==="C") cib.push(g.t); else if(own[g.id]==="L") loose.push(g.t); });
    var bbOwned = G.filter(function(g){return g.bb && own[g.id];}).length;
    return "My NES collection (PAL list, "+G.length+" games): "+(cib.length+loose.length)+" owned ("+cib.length+" CIB, "+loose.length+" loose; black box "+bbOwned+"/30)\n"+
      "CIB: "+(cib.join(", ")||"none")+"\nLoose: "+(loose.join(", ")||"none");
  }
  function toast(msg){ var el=$("toast"); el.textContent=msg; el.style.display="block"; clearTimeout(el._t); el._t=setTimeout(function(){el.style.display="none";},2200); }
  function showDialog(text){ $("dlg-text").value = text; if ($("dlg").showModal) $("dlg").showModal(); else $("dlg").setAttribute("open",""); $("dlg-text").select(); }
  $("copy").addEventListener("click", function(){
    var text = summary();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function(){ toast("Copied! Paste it in the chat"); }, function(){ showDialog(text); });
    } else showDialog(text);
  });
  $("dlg-close").addEventListener("click", function(){ $("dlg").close ? $("dlg").close() : $("dlg").removeAttribute("open"); });
  $("clear").addEventListener("click", function(){
    if (Object.keys(own).length && confirm("Clear all your ticks on this phone?")) { own = {}; save(); render(); }
  });
  // No ticks saved on this phone yet: pre-fill from the published collection (saved to this phone on the first tap).
  if (localStorage.getItem(KEY) === null) {
    fetch("my_collection.json", {cache:"no-cache"}).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
      if (!d || !d.games || localStorage.getItem(KEY) !== null) return;
      d.games.forEach(function(x){ own[x.id] = x.condition==="loose" ? "L" : "C"; });
      var rb = document.querySelector(".ribbon");
      if (rb) rb.innerHTML = "<b>PREVIEW</b> · pre-filled with your saved collection ("+d.games.length+" games) · change any tick to update";
      render();
    }).catch(function(){});
  }
  window.addEventListener("storage", function(e){ if (e.key===KEY) { own = load(); render(); } });
  render();
})();
