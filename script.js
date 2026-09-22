(function(){
  "use strict";

  var UNIT_TO_FT = { mm: 304.8, cm: 30.48, m: 0.3048, inch: 12, ft: 1 };
  var UNIT_LABEL = { mm: "mm", cm: "cm", m: "m", inch: "in", ft: "ft" };

  var PARTS = [
    { key:"front", label:"Front",  dimA:"Width", dimB:"Height", both:false },
    { key:"side",  label:"Side",   dimA:"Length", dimB:"Height", both:true  },
    { key:"back",  label:"Back",   dimA:"Width", dimB:"Height", both:false },
    { key:"top",   label:"Top",    dimA:"Width", dimB:"Length", both:false }
  ];

  var CHIP_DEFAULTS = [
    { name:"Bonnet", qty:1 },
    { name:"Roof / Top", qty:1 },
    { name:"F. Bumper", qty:1 },
    { name:"R. Bumper", qty:1 },
    { name:"Dicky / Boot", qty:1 },
    { name:"F. Fender", qty:2 },
    { name:"R. Fender", qty:2 },
    { name:"F. Door", qty:2 },
    { name:"R. Door", qty:2 },
    { name:"Mirror", qty:2 },
    { name:"Pillar", qty:2 },
    { name:"Rocker Panel", qty:2 }
  ];

  var STORE_KEY = "ppf_sqft_vehicles_v1";
  var state = { front:{a:"",b:"",unit:"mm"}, side:{a:"",b:"",unit:"mm",both:true}, back:{a:"",b:"",unit:"mm"}, top:{a:"",b:"",unit:"mm"} };
  var detailedItems = [];
  var MODE = "simple";

  var cardsHost = document.getElementById("cardsHost");
  var breakdownList = document.getElementById("breakdownList");
  var totalNum = document.getElementById("totalNum");
  var saveBtn = document.getElementById("saveBtn");
  var clearBtn = document.getElementById("clearBtn");
  var vehicleNameInput = document.getElementById("vehicleName");
  var listHost = document.getElementById("listHost");
  var searchBox = document.getElementById("searchBox");
  var toastEl = document.getElementById("toast");
  var simplePanel = document.getElementById("simplePanel");
  var detailedPanel = document.getElementById("detailedPanel");
  var chipsHost = document.getElementById("chipsHost");
  var itemRowsHost = document.getElementById("itemRowsHost");
  var addRowBtn = document.getElementById("addRowBtn");
  var partNamesList = document.getElementById("partNames");
  var modeTabs = document.querySelectorAll(".mode-tab");
  var coverageInput = document.getElementById("coverageInput");
  var autoFillBtn = document.getElementById("autoFillBtn");
  var coverageChipsHost = document.getElementById("coverageChips");
  var receiptCoverage = document.getElementById("receiptCoverage");

  var COVERAGE_PRESETS = ["Full Vehicle", "Full Front", "Full Rear", "Partial Front", "Partial Rear", "Floating Roof"];

  function toFt(value, unit){
    var n = parseFloat(value);
    if (isNaN(n) || n <= 0) return 0;
    return n / UNIT_TO_FT[unit];
  }

  function partSqft(part){
    var d = state[part.key];
    var a = toFt(d.a, d.unit);
    var b = toFt(d.b, d.unit);
    var sq = a * b;
    return sq;
  }

  function uid(){
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- coverage (full vehicle / specific parts) ---------- */
  function renderCoverageChips(){
    coverageChipsHost.innerHTML = COVERAGE_PRESETS.map(function(c){
      return '<button type="button" class="coverage-chip" data-value="'+escapeHtml(c)+'">'+escapeHtml(c)+'</button>';
    }).join("");
    coverageChipsHost.querySelectorAll(".coverage-chip").forEach(function(chip){
      chip.addEventListener("click", function(){
        coverageInput.value = chip.dataset.value;
        updateReceiptCoverage();
      });
    });
  }

  function suggestCoverage(){
    if (MODE === "simple"){
      var filled = PARTS.filter(function(part){ return partSqft(part) > 0; });
      if (filled.length === 0) return "";
      if (filled.length === PARTS.length) return "Full Vehicle";
      return filled.map(function(p){ return p.label; }).join(", ");
    }
    var named = detailedItems.filter(function(it){ return (it.name||"").trim() && toFt(it.a,it.unit)>0 && toFt(it.b,it.unit)>0; });
    if (named.length === 0) return "";
    var seen = {}, uniq = [];
    named.forEach(function(it){
      var n = it.name.trim(), k = n.toLowerCase();
      if (!seen[k]){ seen[k] = true; uniq.push(n); }
    });
    return uniq.join(", ");
  }

  function updateReceiptCoverage(){
    var val = coverageInput.value.trim();
    if (val){
      receiptCoverage.textContent = "Coverage: " + val;
      receiptCoverage.classList.remove("empty");
    } else {
      receiptCoverage.textContent = "Coverage not set — type it in or tap Auto-fill";
      receiptCoverage.classList.add("empty");
    }
  }

  autoFillBtn.addEventListener("click", function(){
    var suggestion = suggestCoverage();
    if (suggestion) coverageInput.value = suggestion;
    updateReceiptCoverage();
  });
  coverageInput.addEventListener("input", updateReceiptCoverage);

  /* ---------- mode switching ---------- */
  function setMode(mode){
    MODE = mode;
    modeTabs.forEach(function(btn){ btn.classList.toggle("active", btn.dataset.mode === mode); });
    simplePanel.style.display = mode === "simple" ? "" : "none";
    detailedPanel.style.display = mode === "detailed" ? "" : "none";
    onFormChange();
  }

  modeTabs.forEach(function(btn){
    btn.addEventListener("click", function(){ setMode(btn.dataset.mode); });
  });

  /* ---------- detailed mode: chips & rows ---------- */
  function renderChips(){
    chipsHost.innerHTML = CHIP_DEFAULTS.map(function(c){
      return '<button type="button" class="chip" data-name="'+escapeHtml(c.name)+'" data-qty="'+c.qty+'">+ '+escapeHtml(c.name)+'</button>';
    }).join("");
    partNamesList.innerHTML = CHIP_DEFAULTS.map(function(c){ return '<option value="'+escapeHtml(c.name)+'">'; }).join("");
    chipsHost.querySelectorAll(".chip").forEach(function(chip){
      chip.addEventListener("click", function(){
        addDetailedItem(chip.dataset.name, parseInt(chip.dataset.qty, 10) || 1);
      });
    });
  }

  function addDetailedItem(name, qty){
    detailedItems.push({ id: uid(), name: name || "", a:"", b:"", unit:"inch", qty: qty || 1 });
    renderItemRows();
    onFormChange();
    var lastInput = itemRowsHost.querySelector('.item-row:last-child [data-role="a"]');
    if (lastInput && !name) itemRowsHost.querySelector('.item-row:last-child [data-role="name"]').focus();
    else if (lastInput) lastInput.focus();
  }

  addRowBtn.addEventListener("click", function(){ addDetailedItem("", 1); });

  function renderItemRows(){
    if (detailedItems.length === 0){
      itemRowsHost.innerHTML = '<div class="detailed-empty">No parts added yet — tap a chip above or "Add custom part" to start.</div>';
      return;
    }
    var unitOptionsHtml = function(selected){
      return Object.keys(UNIT_TO_FT).map(function(u){
        return '<option value="'+u+'"'+(selected===u?" selected":"")+'>'+UNIT_LABEL[u]+'</option>';
      }).join("");
    };
    itemRowsHost.innerHTML = detailedItems.map(function(item){
      return '<div class="item-row" data-id="'+item.id+'">'+
        '<input type="text" data-role="name" list="partNames" placeholder="Part name" value="'+escapeHtml(item.name)+'">'+
        '<input type="number" data-role="a" inputmode="decimal" min="0" step="any" placeholder="Width" value="'+item.a+'">'+
        '<input type="number" data-role="b" inputmode="decimal" min="0" step="any" placeholder="Height" value="'+item.b+'">'+
        '<select data-role="unit">'+unitOptionsHtml(item.unit)+'</select>'+
        '<div class="qty-wrap"><input type="number" data-role="qty" min="1" step="1" value="'+item.qty+'" style="width:52px;"><span>qty</span></div>'+
        '<span class="row-sqft" data-role="sqft">0.00 sqft</span>'+
        '<button type="button" class="row-del" data-action="del" aria-label="Remove part"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>'+
      '</div>';
    }).join("");

    itemRowsHost.querySelectorAll(".item-row").forEach(function(row){
      var id = row.dataset.id;
      var item = detailedItems.find(function(i){ return i.id === id; });
      if (!item) return;
      row.querySelector('[data-role="name"]').addEventListener("input", function(e){ item.name = e.target.value; onFormChange(); });
      row.querySelector('[data-role="a"]').addEventListener("input", function(e){ item.a = e.target.value; onFormChange(); });
      row.querySelector('[data-role="b"]').addEventListener("input", function(e){ item.b = e.target.value; onFormChange(); });
      row.querySelector('[data-role="unit"]').addEventListener("change", function(e){ item.unit = e.target.value; onFormChange(); });
      row.querySelector('[data-role="qty"]').addEventListener("input", function(e){ item.qty = Math.max(1, parseInt(e.target.value,10) || 1); onFormChange(); });
      row.querySelector('[data-action="del"]').addEventListener("click", function(){
        detailedItems = detailedItems.filter(function(i){ return i.id !== id; });
        renderItemRows();
        onFormChange();
      });
    });
  }

  function detailedBreakdown(){
    return detailedItems.map(function(item){
      var a = toFt(item.a, item.unit);
      var b = toFt(item.b, item.unit);
      var sq = a * b;
      var qty = item.qty || 1;
      return { key:item.id, label: item.name.trim() || "Unnamed part", sqft: sq, mult: qty, total: sq*qty };
    });
  }

  function refreshItemRowReadouts(bd){
    bd.forEach(function(item){
      var row = itemRowsHost.querySelector('.item-row[data-id="'+item.key+'"]');
      if (!row) return;
      var readout = row.querySelector('[data-role="sqft"]');
      readout.textContent = item.sqft>0 ? item.total.toFixed(2)+" sqft" : "0.00 sqft";
    });
  }

  function buildCards(){
    cardsHost.innerHTML = "";
    PARTS.forEach(function(part){
      var d = state[part.key];
      var card = document.createElement("div");
      card.className = "card";
      card.dataset.part = part.key;

      var unitOptions = Object.keys(UNIT_TO_FT).map(function(u){
        return '<option value="'+u+'"'+(d.unit===u?" selected":"")+'>'+UNIT_LABEL[u]+'</option>';
      }).join("");

      card.innerHTML =
        '<div class="card-head">'+
          '<div class="card-title"><span class="swatch"></span>'+part.label+'</div>'+
          '<div class="card-sqft" data-role="sqft">0.00 sqft</div>'+
        '</div>'+
        '<div class="dims-row">'+
          '<input type="number" inputmode="decimal" min="0" step="any" placeholder="'+part.dimA+'" data-role="a" value="'+d.a+'">'+
          '<input type="number" inputmode="decimal" min="0" step="any" placeholder="'+part.dimB+'" data-role="b" value="'+d.b+'">'+
        '</div>'+
        '<div class="unit-row">'+
          (part.both ? '<label class="both-sides"><input type="checkbox" data-role="both" '+(d.both?"checked":"")+'> Count both sides (×2)</label>' : '<span></span>')+
          '<select data-role="unit">'+unitOptions+'</select>'+
        '</div>';

      cardsHost.appendChild(card);

      card.querySelector('[data-role="a"]').addEventListener("input", function(e){ d.a = e.target.value; onFormChange(); });
      card.querySelector('[data-role="b"]').addEventListener("input", function(e){ d.b = e.target.value; onFormChange(); });
      card.querySelector('[data-role="unit"]').addEventListener("change", function(e){ d.unit = e.target.value; onFormChange(); });
      var bothEl = card.querySelector('[data-role="both"]');
      if (bothEl){ bothEl.addEventListener("change", function(e){ d.both = e.target.checked; onFormChange(); }); }
    });
  }

  function currentBreakdown(){
    return PARTS.map(function(part){
      var sq = partSqft(part);
      var mult = (part.both && state[part.key].both) ? 2 : 1;
      return { key:part.key, label:part.label, sqft: sq, mult: mult, total: sq*mult };
    });
  }

  function refreshCardReadouts(bd){
    bd.forEach(function(item){
      var card = cardsHost.querySelector('.card[data-part="'+item.key+'"]');
      if (!card) return;
      var readout = card.querySelector('[data-role="sqft"]');
      var label = item.sqft>0 ? item.sqft.toFixed(2)+" sqft"+(item.mult===2?" × 2":"") : "0.00 sqft";
      readout.textContent = label;
      card.classList.toggle("active", item.sqft>0);
    });
  }

  function renderBreakdown(bd){
    if (bd.length === 0){
      breakdownList.innerHTML = '<li style="border-bottom:none;color:var(--text-faint);">Add parts to see the breakdown</li>';
      return;
    }
    breakdownList.innerHTML = bd.map(function(item){
      var suffix = item.mult===2 ? " ×2" : (item.mult>2 ? " ×"+item.mult : "");
      return '<li><span>'+escapeHtml(item.label)+suffix+'</span><span>'+item.total.toFixed(2)+' sqft</span></li>';
    }).join("");
  }

  function computeTotal(bd){
    return bd.reduce(function(sum, i){ return sum + i.total; }, 0);
  }

  function onFormChange(){
    var bd, total;
    if (MODE === "simple"){
      bd = currentBreakdown();
      refreshCardReadouts(bd);
    } else {
      bd = detailedBreakdown();
      refreshItemRowReadouts(bd);
    }
    renderBreakdown(bd);
    total = computeTotal(bd);
    totalNum.innerHTML = total.toFixed(2) + "<small>sqft</small>";
    saveBtn.disabled = !(total > 0 && vehicleNameInput.value.trim().length > 0);
  }

  vehicleNameInput.addEventListener("input", onFormChange);

  clearBtn.addEventListener("click", function(){
    vehicleNameInput.value = "";
    coverageInput.value = "";
    PARTS.forEach(function(part){
      state[part.key].a = ""; state[part.key].b = "";
      if (part.both) state[part.key].both = true;
    });
    buildCards();
    detailedItems = [];
    renderItemRows();
    updateReceiptCoverage();
    onFormChange();
  });

  // ---------- storage (this browser only) ----------
  var vehiclesCache = [];

  function loadVehiclesLocal(){
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch(e){ return []; }
  }

  function saveVehiclesLocal(list){
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch(e){ /* storage unavailable */ }
  }

  function initStorage(){
    vehiclesCache = loadVehiclesLocal();
    renderList();
  }

  function upsertVehicle(record){
    vehiclesCache = upsertLocal(vehiclesCache, record);
    saveVehiclesLocal(vehiclesCache);
    renderList();
  }

  function deleteVehicle(id){
    vehiclesCache = vehiclesCache.filter(function(v){ return v.id !== id; });
    saveVehiclesLocal(vehiclesCache);
    renderList();
  }

  function upsertLocal(list, record){
    var idx = list.findIndex(function(v){ return v.id === record.id; });
    if (idx !== -1){ list[idx] = record; } else { list.push(record); }
    return list;
  }

  function showToast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function(){ toastEl.classList.remove("show"); }, 2200);
  }

  function fmtDate(ts){
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { day:"2-digit", month:"short", year:"numeric" });
  }

  function renderList(){
    var vehicles = vehiclesCache;
    var q = (searchBox.value || "").trim().toLowerCase();
    var filtered = vehicles.filter(function(v){ return v.name.toLowerCase().indexOf(q) !== -1; });
    filtered.sort(function(a,b){ return a.name.localeCompare(b.name, undefined, {sensitivity:"base"}); });

    if (filtered.length === 0){
      listHost.innerHTML = '<div class="empty-state"><span class="big">📐</span>'+
        (vehicles.length===0 ? "No vehicles saved yet — calculate one above and save it." : "No vehicles match your search.")+
        '</div>';
      return;
    }

    var rows = filtered.map(function(v){
      var method = v.type === "detailed" ? "detailed" : "simple";
      var coverage = v.coverage ? escapeHtml(v.coverage) : "";
      return '<tr data-id="'+v.id+'" data-method="'+method+'">'+
        '<td class="veh-name"><div>'+escapeHtml(v.name)+'</div>'+
          '<div class="veh-meta">'+
            '<span class="method-pill '+method+'">'+(method==="detailed"?"Detailed":"Simple")+'</span>'+
            (coverage ? '<span class="coverage-tag" title="'+coverage+'">'+coverage+'</span>' : '')+
          '</div>'+
        '</td>'+
        '<td class="veh-total">'+v.total.toFixed(2)+' sqft</td>'+
        '<td class="veh-date">'+fmtDate(v.savedAt)+'</td>'+
        '<td class="row-actions"><button class="icon-btn" data-action="delete" title="Delete" aria-label="Delete '+escapeHtml(v.name)+'">'+
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>'+
        '</button></td>'+
      '</tr>';
    }).join("");

    listHost.innerHTML =
      '<table><thead><tr><th>Vehicle</th><th>Total</th><th>Saved</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>';

    listHost.querySelectorAll("tbody tr").forEach(function(tr){
      tr.addEventListener("click", function(e){
        if (e.target.closest('[data-action="delete"]')) return;
        loadIntoForm(tr.dataset.id);
      });
    });
    listHost.querySelectorAll('[data-action="delete"]').forEach(function(btn){
      btn.addEventListener("click", function(e){
        e.stopPropagation();
        var tr = e.target.closest("tr");
        var id = tr.dataset.id;
        deleteVehicle(id);
        showToast("Vehicle removed");
      });
    });
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  function loadIntoForm(id){
    var v = vehiclesCache.find(function(x){ return x.id === id; });
    if (!v) return;
    vehicleNameInput.value = v.name;
    coverageInput.value = v.coverage || "";
    updateReceiptCoverage();

    if (v.type === "detailed"){
      detailedItems = (v.items || []).map(function(it){
        return { id: uid(), name: it.name, a: it.a, b: it.b, unit: it.unit, qty: it.qty || 1 };
      });
      renderItemRows();
      setMode("detailed");
    } else {
      PARTS.forEach(function(part){
        var saved = v.parts ? v.parts[part.key] : null;
        if (!saved) return;
        state[part.key].a = saved.a;
        state[part.key].b = saved.b;
        state[part.key].unit = saved.unit;
        if (part.both) state[part.key].both = saved.both;
      });
      buildCards();
      setMode("simple");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    showToast("Loaded "+v.name+" into the form");
  }

  saveBtn.addEventListener("click", function(){
    var name = vehicleNameInput.value.trim();
    var bd = MODE === "simple" ? currentBreakdown() : detailedBreakdown();
    var total = computeTotal(bd);
    if (!name || total <= 0) return;

    var existing = vehiclesCache.find(function(v){ return v.name.toLowerCase() === name.toLowerCase(); });
    var record = {
      id: existing ? existing.id : uid(),
      name: name,
      nameLower: name.toLowerCase(),
      total: total,
      type: MODE,
      coverage: coverageInput.value.trim() || suggestCoverage(),
      savedAt: Date.now()
    };

    if (MODE === "simple"){
      var partsSnapshot = {};
      PARTS.forEach(function(part){
        partsSnapshot[part.key] = {
          a: state[part.key].a, b: state[part.key].b, unit: state[part.key].unit,
          both: part.both ? !!state[part.key].both : undefined
        };
      });
      record.parts = partsSnapshot;
    } else {
      record.items = detailedItems.map(function(it){
        return { name: it.name, a: it.a, b: it.b, unit: it.unit, qty: it.qty || 1 };
      });
    }

    upsertVehicle(record);
    showToast(existing ? "Updated "+name : "Saved "+name);
  });

  searchBox.addEventListener("input", renderList);

  buildCards();
  renderChips();
  renderItemRows();
  renderCoverageChips();
  updateReceiptCoverage();
  onFormChange();
  initStorage();
  renderList();
})();
