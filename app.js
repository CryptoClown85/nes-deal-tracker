(function(){
  "use strict";
  var D = window.NES_DATA || {listings: []};
  var L = D.listings || [];
  var TABS = [
    {id:"best", label:"★ Best deals"},
    {id:"marktplaats", label:"Marktplaats"},
    {id:"tradera", label:"Tradera"},
    {id:"ebay", label:"eBay.com"},
    {id:"ebay_de", label:"eBay.de"},
    {id:"ebay_it", label:"eBay.it"},
    {id:"ebay_uk", label:"eBay.co.uk"},
    {id:"2dehands", label:"2dehands"}
  ];
  var MKLABEL = {}; TABS.forEach(function(t){ MKLABEL[t.id]=t.label; });
  var qsAll = /[?&]all(=1|=true)?(&|$)/.test(location.search);
  var state = {tab: (location.hash||"").replace("#","") || "best", scope: qsAll ? "all" : "cib"};  // always opens on complete-in-box; ?all opens on everything
  if (!TABS.some(function(t){return t.id===state.tab;})) state.tab = "best";
  var $ = function(id){return document.getElementById(id);};
  var CUR = {EUR:"€", USD:"$", SEK:"SEK ", GBP:"£"};
  function money(a, c){ if (a==null) return "—"; var s=(Math.round(a*100)/100).toFixed(2); return c==="SEK" ? s.replace(/\.00$/,"")+" SEK" : (CUR[c]||c+" ")+s; }
  function eur(a){ return a==null ? "—" : "€"+a.toFixed(2); }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }
  function day(iso){ return iso ? iso.slice(0,10) : ""; }
  function fmtAms(iso){
    try { return new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Amsterdam",dateStyle:"medium",timeStyle:"short"}).format(new Date(iso)) + " (Amsterdam)"; }
    catch(e){ return iso; }
  }
  function isNew(r){ return day(r.first_seen) === D.today; }
  function vclass(v){ return {"Good buy":"good","Fair":"fair","Overpriced":"over"}[v] || "unclear"; }

  $("meta").innerHTML = "Last updated: <b>"+esc(fmtAms(D.generated_at))+"</b><br>"+
    L.filter(function(r){return r.status==="active";}).length+" active · "+L.length+" tracked in total";
  $("fx").textContent = D.fx ? ("Exchange rates (ECB, "+D.fx.date+"): 1 EUR = "+D.fx.USD+" USD = "+D.fx.SEK+" SEK"+(D.fx.GBP?" = "+D.fx.GBP+" GBP":"")+". PriceCharting lists cached: PAL "+
    day((D.pricecharting_as_of||{})["pal-nes"])+", NTSC "+day((D.pricecharting_as_of||{}).nes)+".") : "";

  function inTab(r, tab){ return tab==="best" ? r.verdict==="Good buy" : r.marketplace===tab; }
  function isCib(r){ return (r.condition||"").toUpperCase()==="CIB"; }
  function visible(r, opts){
    if (r.hidden) return false;
    if (state.scope==="cib" && !isCib(r)) return false;
    if (!opts.archive && r.status!=="active") return false;
    return true;
  }
  function renderTabs(){
    var opts = {archive: $("f-archive").checked};
    $("tabs").innerHTML = TABS.map(function(t){
      var n = L.filter(function(r){return inTab(r,t.id) && visible(r,opts);}).length;
      return '<button class="tab" role="tab" data-tab="'+t.id+'" aria-selected="'+(t.id===state.tab)+'">'+esc(t.label)+'<span class="n">'+n+'</span></button>';
    }).join("");
    var act = $("tabs").querySelector('.tab[aria-selected="true"]'), box = $("tabs");
    if (act && box.scrollWidth > box.clientWidth) {  // keep the active tab in view on narrow screens
      var l = act.offsetLeft - box.offsetLeft, r = l + act.offsetWidth;
      if (l < box.scrollLeft || r > box.scrollLeft + box.clientWidth) box.scrollLeft = Math.max(0, l - 12);
    }
  }
  function card(r){
    var p = r.price||{}, e = r.eur||{}, pc = r.pc_usd;
    var img = r.img;  // local copy (img/...) or inlined data URI; never hotlinked
    var pills = '<span class="pill mk-'+r.marketplace+'">'+esc(MKLABEL[r.marketplace]||r.marketplace)+'</span>' + (isNew(r)?'<span class="pill new">NEW TODAY</span>':'') +
      (r.ask_shipping ? '<span class="pill ask">ASK SELLER: NL SHIPPING</span>' : '') +
      (r.status!=="active" ? '<span class="pill gone">'+esc(r.status.toUpperCase())+'</span>' : '');
    var priceLine = money(p.amount, p.currency) + (p.currency!=="EUR" && e.price!=null ? ' <small>≈ '+eur(e.price)+'</small>' : '') +
      (p.type ? ' <small>· '+esc(p.type)+'</small>' : '');
    if (r.buy_now && p.type && p.type.indexOf("buy now")>=0) priceLine += '<br><small>buy now '+money(r.buy_now,p.currency)+(e.buy_now!=null?' ≈ '+eur(e.buy_now):'')+'</small>';
    var imp = e["import"];
    var impRow = imp ? '<dt>Import</dt><dd>from '+esc(imp.origin)+': goods + shipping '+eur(imp.base)+' + 21% VAT '+eur(imp.vat)+
      (imp.duty?' + duty '+eur(imp.duty):'')+(imp.handling?' + handling '+eur(imp.handling):'')+' = <b>'+eur(imp.total)+'</b></dd>' : '';
    var ship = r.ask_shipping && !r.shipping ? '<b class="ask-txt">ask seller (not included)</b>' :
      r.shipping && r.shipping.amount===0 ? 'free to NL' :
      r.shipping ? money(r.shipping.amount, r.shipping.currency) + (r.shipping.currency!=="EUR" && e.shipping!=null ? " ≈ "+eur(e.shipping) : "") +
      (r.shipping.note ? ' <span title="'+esc(r.shipping.note)+'">ⓘ</span>' : '') : "not stated";
    var pcLine = pc ? (eur(e.pc_loose)+" / "+eur(e.pc_cib)) + (r.condition==="sealed" ? "<br>new: "+eur(e.pc_new) : "") : "—";
    var ends = r.end_time && /auction/.test(p.type||"") ? '<dt>Ends</dt><dd>'+esc(fmtAms(r.end_time))+(r.bids!=null?' · '+r.bids+' bid'+(r.bids===1?'':'s'):'')+'</dd>' : '';
    var pctTxt = r.pct==null ? "" : '<span class="pct">'+(r.pct>0?"+":"")+Math.round(r.pct*100)+'%</span>';
    var lastPrice = r.status!=="active" ? '<dt>Last seen</dt><dd>'+esc(day(r.last_seen))+' at '+money(p.amount,p.currency)+'</dd>' : '';
    var hist = (r.price_history||[]).length>1 ? '<dt>Price hist.</dt><dd>'+r.price_history.map(function(h){return money(h.amount,h.currency)+" ("+day(h.t)+")";}).join(" → ")+'</dd>' : '';
    return '<article class="card'+(r.status!=="active"?" gone":"")+'">'+
      '<div class="thumb">'+(img?'<img decoding="async" src="'+esc(img)+'" alt="'+esc(r.title)+'" onerror="this.parentNode.classList.add(\'noimg\');this.remove()">':'')+'<span class="ph">NO PHOTO</span>'+
      '<div class="ribbon">'+pills+'</div></div>'+
      '<div class="body">'+
        '<h2 class="title"><a href="'+esc(r.url)+'" target="_blank" rel="noopener">'+esc(r.title)+'</a></h2>'+
        '<div class="price">'+priceLine+'</div>'+
        '<div class="vrow"><span class="badge '+vclass(r.verdict)+'">'+esc(r.verdict)+'</span>'+pctTxt+
          (e.total!=null?'<small>total '+eur(e.total)+'</small>':'')+'</div>'+
        '<dl class="rows">'+
          '<dt>Shipping</dt><dd>'+ship+'</dd>'+ impRow +
          '<dt>Condition</dt><dd>'+esc(r.condition)+' · '+esc(r.region)+'</dd>'+
          '<dt>PriceCharting</dt><dd>'+(r.pc_title?'<a href="'+esc(r.pc_url)+'" target="_blank" rel="noopener">'+esc(r.pc_title)+'</a><br>':'')+
            'loose / CIB: '+pcLine+'</dd>'+
          ends + (r.bids!=null && !ends ? '<dt>Bids</dt><dd>'+r.bids+'</dd>' : '') +
          '<dt>First seen</dt><dd>'+esc(day(r.first_seen))+(r.location?' · '+esc(r.location):'')+'</dd>'+
          lastPrice + hist +
        '</dl>'+
        ((r.notes||[]).length?'<ul class="notes">'+r.notes.map(function(n){return '<li>'+esc(n)+'</li>';}).join("")+'</ul>':'')+
        '<a class="go" href="'+esc(r.url)+'" target="_blank" rel="noopener">View listing ▶</a>'+
      '</div></article>';
  }
  function renderScope(){
    var bs = document.querySelectorAll("#scope .seg");
    for (var i=0;i<bs.length;i++) bs[i].setAttribute("aria-pressed", String(bs[i].getAttribute("data-scope")===state.scope));
  }
  function render(){
    renderScope();
    renderTabs();
    var opts = {archive:$("f-archive").checked};
    var v = $("f-verdict").value, q = $("f-q").value.trim().toLowerCase(), onlyNew = $("f-new").checked, sort = $("f-sort").value;
    var rows = L.filter(function(r){
      if (!inTab(r, state.tab) || !visible(r, opts)) return false;
      if (v && r.verdict!==v) return false;
      if (onlyNew && !isNew(r)) return false;
      if (q && (r.title+" "+(r.pc_title||"")).toLowerCase().indexOf(q)<0) return false;
      return true;
    });
    var tot = function(r){ var e=r.eur||{}; return e.total!=null?e.total:(e.price!=null?e.price:Infinity); };
    rows.sort(function(a,b){
      if (sort==="price-asc") return tot(a)-tot(b);
      if (sort==="price-desc") return (tot(b)===Infinity?-1:tot(b))-(tot(a)===Infinity?-1:tot(a));
      if (sort==="deal") return (a.pct==null?9:a.pct)-(b.pct==null?9:b.pct);
      return (b.first_seen||"").localeCompare(a.first_seen||"");
    });
    if (state.tab==="best" && sort==="new") rows.sort(function(a,b){return (a.pct==null?9:a.pct)-(b.pct==null?9:b.pct);});
    $("summary").textContent = rows.length+(state.scope==="cib"?" complete-in-box":"")+" listing"+(rows.length===1?"":"s")+" shown"+(state.tab==="best"?" · Good-buy verdicts across all marketplaces, best discount first":"");
    $("grid").innerHTML = rows.length ? rows.map(card).join("") : '<p class="empty">Nothing matches these filters.</p>';
  }
  $("scope").addEventListener("click", function(ev){
    var b = ev.target.closest(".seg"); if (!b) return;
    state.scope = b.getAttribute("data-scope");
    render();
  });
  $("tabs").addEventListener("click", function(ev){
    var b = ev.target.closest(".tab"); if (!b) return;
    state.tab = b.getAttribute("data-tab"); history.replaceState(null,"","#"+state.tab); render();
  });
  ["f-verdict","f-sort","f-new","f-archive"].forEach(function(id){ $(id).addEventListener("change", render); });
  $("f-q").addEventListener("input", render);
  render();
})();
