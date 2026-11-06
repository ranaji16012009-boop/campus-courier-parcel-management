/* ParcelDesk — interactive campus courier prototype */
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
let lastCreatedParcel = null;
let toastTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  initializeStorage();
  $("#todayLabel").textContent = new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date());
  bindNavigation();
  bindForms();
  bindHistory();
  bindUtilities();
  renderAll();
});

function bindNavigation() {
  $$(".nav-link[data-view]").forEach(button => button.addEventListener("click", () => showView(button.dataset.view)));
  $$("[data-go]").forEach(button => button.addEventListener("click", () => showView(button.dataset.go)));
  $("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
}

function showView(name) {
  $$(".view").forEach(view => view.classList.toggle("active", view.id === `view-${name}`));
  $$(".nav-link[data-view]").forEach(link => link.classList.toggle("active", link.dataset.view === name));
  const labels = {overview:"Overview",receive:"Receive parcel",student:"Student lookup",verify:"Verify pickup",history:"Parcel history"};
  $("#crumb").textContent = labels[name] || "Overview";
  $("#sidebar").classList.remove("open");
  if (name === "overview") renderDashboard();
  if (name === "history") renderHistory();
  window.scrollTo({top:0,behavior:"smooth"});
}

function bindForms() {
  const recipientType = $("#recipientType");
  recipientType.addEventListener("change", updateRecipientFields);
  updateRecipientFields();
  $("#parcelForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const parcels = getAllParcels();
    const duplicate = parcels.some(p => p.rollNumber.trim().toLowerCase() === data.rollNumber.trim().toLowerCase() && p.trackingLast4 === data.trackingLast4 && data.trackingLast4);
    if (duplicate && !confirm("A parcel with this roll number and tracking suffix already exists. Add another anyway?")) return;

    const parcel = {
      id: generateParcelId(parcels),
      studentName: data.studentName.trim(),
      recipientType: data.recipientType,
      rollNumber: data.rollNumber.trim(),
      hostelBlock: data.hostelBlock || "",
      roomNumber: data.roomNumber || "",
      department: data.department || "",
      recipientLocation: data.recipientLocation || "",
      destination: data.recipientType === "Student" ? [data.hostelBlock, data.roomNumber].filter(Boolean).join(" · ") : [data.department, data.recipientLocation].filter(Boolean).join(" · "),
      courier: data.courier,
      trackingLast4: data.trackingLast4.trim(),
      pickupToken: generateToken(parcels),
      status: "Pending",
      receivedAt: new Date().toISOString(),
      deliveredAt: null,
      note: data.note.trim()
    };
    saveParcel(parcel);
    lastCreatedParcel = parcel;
    form.reset();
    updateRecipientFields();
    renderAll();
    showTokenModal(parcel);
  });

  $("#studentSearchForm").addEventListener("submit", event => {
    event.preventDefault();
    const roll = $("#studentRoll").value.trim().toLowerCase();
    if (!roll) return;
    const matches = getAllParcels().filter(p => String(p.rollNumber || "").toLowerCase() === roll);
    renderStudentResults(matches, roll);
  });
  $("#clearStudentSearch").addEventListener("click", () => {
    $("#studentRoll").value = "";
    $("#studentResults").classList.add("hidden");
  });

  $("#verifyForm").addEventListener("submit", event => {
    event.preventDefault();
    const id = $("#verifyParcelId").value.trim().toUpperCase();
    const token = $("#verifyToken").value.trim();
    const parcel = getAllParcels().find(p => p.id.toUpperCase() === id);
    const message = $("#verifyMessage");
    message.classList.remove("hidden","success","error");
    if (!parcel) return setVerifyMessage("Parcel ID not found. Check the ID and try again.","error");
    if (parcel.status === "Delivered") return setVerifyMessage("This parcel has already been marked as delivered.","error");
    if (parcel.pickupToken !== token) return setVerifyMessage("Incorrect pickup token. Do not hand over the parcel.","error");
    updateParcel(parcel.id,{status:"Delivered",deliveredAt:new Date().toISOString()});
    $("#verifyForm").reset();
    setVerifyMessage(`Handover completed for ${parcel.studentName}. Parcel ${parcel.id} is now marked delivered.`,"success");
    renderAll();
  });
}

function updateRecipientFields() {
  const type = $("#recipientType").value;
  const isStudent = type === "Student";
  $("#hostelField").classList.toggle("hidden", !isStudent);
  $("#roomField").classList.toggle("hidden", !isStudent);
  $("#departmentField").classList.toggle("hidden", isStudent);
  $("#locationField").classList.toggle("hidden", isStudent);
  $("#hostelBlock").required = isStudent;
  $("#recipientLocation").required = !isStudent;
  $("#recipientIdLabel").textContent = isStudent ? "University roll number *" : `${type} ID / reference *`;
  $("#recipientId").placeholder = isStudent ? "e.g. 12345678" : "Enter university / staff ID";
}

function bindHistory() {
  $("#historySearch").addEventListener("input",renderHistory);
  $("#statusFilter").addEventListener("change",renderHistory);
  $("#sortFilter").addEventListener("change",renderHistory);
  $("#exportCsv").addEventListener("click",exportCsv);
  $("#resetDemo").addEventListener("click",() => {
    if (!confirm("Reset all local records to the original sample parcels? Your added records will be removed.")) return;
    resetStorage();
    renderAll();
    showToast("Demo data has been reset.");
  });
}

function bindUtilities() {
  $("#themeToggle").addEventListener("click",() => {
    document.body.classList.toggle("dark");
    localStorage.setItem("parceldesk_theme",document.body.classList.contains("dark")?"dark":"light");
  });
  if (localStorage.getItem("parceldesk_theme")==="dark") document.body.classList.add("dark");
  $("#notificationButton").addEventListener("click",() => showToast("You’re all caught up — no new alerts."));
  $("#modalClose").addEventListener("click",closeTokenModal);
  $("#modalDone").addEventListener("click",closeTokenModal);
  $("#modalBackdrop").addEventListener("click",event => {if(event.target.id==="modalBackdrop")closeTokenModal();});
  $("#copyToken").addEventListener("click",async () => {
    if (!lastCreatedParcel) return;
    const text = `Parcel ID: ${lastCreatedParcel.id}\nPickup token: ${lastCreatedParcel.pickupToken}\nStudent: ${lastCreatedParcel.studentName}`;
    try { await navigator.clipboard.writeText(text); showToast("Parcel details copied."); }
    catch { showToast("Copy is unavailable in this browser."); }
  });
}

function generateParcelId(parcels) {
  const maxNumber = parcels.reduce((max,p) => {
    const match = p.id.match(/(\d+)$/);
    return match ? Math.max(max,Number(match[1])) : max;
  },1000);
  return `PKG-${maxNumber+1}`;
}

function generateToken(parcels) {
  let token;
  const pendingTokens = new Set(parcels.filter(p=>p.status==="Pending").map(p=>p.pickupToken));
  do { token = String(Math.floor(1000+Math.random()*9000)); } while (pendingTokens.has(token));
  return token;
}

function renderAll() {
  renderDashboard();
  renderHistory();
}

function renderDashboard() {
  const parcels = getAllParcels();
  const pending = parcels.filter(p=>p.status==="Pending").length;
  const delivered = parcels.filter(p=>p.status==="Delivered").length;
  const today = new Date().toDateString();
  const receivedToday = parcels.filter(p=>new Date(p.receivedAt).toDateString()===today).length;
  $("#statTotal").textContent = parcels.length;
  $("#statPending").textContent = pending;
  $("#statDelivered").textContent = delivered;
  $("#statToday").textContent = receivedToday;
  $("#snapshotPending").textContent = pending;
  $("#snapshotDelivered").textContent = delivered;
  const rate = parcels.length ? Math.round(delivered/parcels.length*100) : 0;
  $("#collectionRate").textContent = `${rate}%`;
  $("#progressFill").style.width = `${rate}%`;
  $("#progressNote").textContent = parcels.length ? `${delivered} of ${parcels.length} parcels have been collected.` : "No parcel activity yet.";
  const recent = [...parcels].sort((a,b)=>new Date(b.receivedAt)-new Date(a.receivedAt)).slice(0,5);
  $("#recentRows").innerHTML = recent.map(p=>`
    <tr><td><div class="student-cell"><span class="student-mini">${escapeHtml(initials(p.studentName))}</span><span><strong>${escapeHtml(p.studentName)}</strong><small>${escapeHtml(p.recipientType || "Student")} · ${escapeHtml(p.rollNumber)}</small></span></div></td>
    <td><span class="parcel-code">${escapeHtml(p.id)}</span></td><td>${formatDate(p.receivedAt,true)}</td><td>${statusBadge(p.status)}</td></tr>`).join("");
  $("#recentEmpty").classList.toggle("hidden",recent.length>0);
}

function renderHistory() {
  const query = $("#historySearch").value.trim().toLowerCase();
  const status = $("#statusFilter").value;
  const sort = $("#sortFilter").value;
  let parcels = getAllParcels().filter(p => {
    const matchesQuery = [p.id,p.studentName,p.rollNumber,p.hostelBlock,p.department,p.recipientLocation,p.courier].some(v=>String(v||"").toLowerCase().includes(query));
    return matchesQuery && (status==="all" || p.status===status);
  });
  parcels.sort((a,b)=>sort==="newest"?new Date(b.receivedAt)-new Date(a.receivedAt):new Date(a.receivedAt)-new Date(b.receivedAt));
  $("#historyRows").innerHTML = parcels.map(p=>`
    <tr><td><div class="student-cell"><span class="student-mini">${escapeHtml(initials(p.studentName))}</span><span><strong>${escapeHtml(p.studentName)}</strong><small>${escapeHtml(p.id)} · ${escapeHtml(p.rollNumber)}</small></span></div></td>
    <td>${escapeHtml(p.destination || p.hostelBlock || "—")}</td><td>${escapeHtml(p.courier)}</td><td>${formatDate(p.receivedAt,true)}</td><td>${statusBadge(p.status)}</td>
    <td><button class="action-button" data-print="${escapeHtml(p.id)}">Receipt</button></td></tr>`).join("");
  $("#historyCount").textContent = `${parcels.length} record${parcels.length===1?"":"s"}`;
  $("#historyEmpty").classList.toggle("hidden",parcels.length>0);
  $$("[data-print]").forEach(button=>button.addEventListener("click",()=>printReceipt(button.dataset.print)));
}

function renderStudentResults(matches,roll) {
  const section=$("#studentResults");
  section.classList.remove("hidden");
  $("#resultCaption").textContent = `${matches.length} parcel${matches.length===1?"":"s"} found for roll number ${roll}.`;
  $("#studentCards").innerHTML = matches.length ? matches.map(p=>`
    <article class="student-result-card"><div class="result-card-top"><div><h3>${escapeHtml(p.studentName)}</h3><p>${escapeHtml(p.id)} · ${escapeHtml(p.courier)}</p></div>${statusBadge(p.status)}</div>
      <div class="result-meta"><div><span>RECIPIENT / DESTINATION</span><strong>${escapeHtml(p.recipientType || "Student")} · ${escapeHtml(p.destination || p.hostelBlock || "—")}</strong></div><div><span>ARRIVED AT DESK</span><strong>${formatDate(p.receivedAt,true)}</strong></div></div>
      ${p.status==="Pending"?`<div class="student-token"><span>Pickup token · show at desk</span><strong>${escapeHtml(p.pickupToken)}</strong></div>`:`<div class="student-token"><span>Collection status</span><strong style="font-size:11px;letter-spacing:0">Collected ✓</strong></div>`}
    </article>`).join("") : `<div class="panel empty-state">No parcel found for this roll number. Check the number or contact the security desk.</div>`;
}

function setVerifyMessage(text,type) {
  const message=$("#verifyMessage");
  message.textContent=text;
  message.className=`message ${type}`;
}

function showTokenModal(parcel) {
  $("#generatedToken").textContent=parcel.pickupToken;
  $("#generatedParcelId").textContent=parcel.id;
  $("#modalBackdrop").classList.remove("hidden");
}
function closeTokenModal(){ $("#modalBackdrop").classList.add("hidden"); }
function statusBadge(status){return `<span class="status-pill ${status==="Delivered"?"status-delivered":"status-pending"}">${escapeHtml(status)}</span>`;}
function initials(name){return String(name||"?").split(/\s+/).slice(0,2).map(part=>part[0]||"").join("").toUpperCase();}
function formatDate(value,short=false){
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "—";
  return new Intl.DateTimeFormat("en-IN",short?{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}:{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function showToast(message){
  $("#toastText").textContent=message;
  const toast=$("#toast");toast.classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),2600);
}
function exportCsv(){
  const parcels=getAllParcels();
  if(!parcels.length)return showToast("There are no records to export.");
  const columns=["id","recipientType","studentName","rollNumber","hostelBlock","roomNumber","department","recipientLocation","destination","courier","trackingLast4","status","receivedAt","deliveredAt"];
  const csv=[columns.join(","),...parcels.map(p=>columns.map(key=>`"${String(p[key]??"").replace(/"/g,'""')}"`).join(","))].join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="parceldesk-parcel-history.csv";a.click();URL.revokeObjectURL(url);
  showToast("CSV export started.");
}
function printReceipt(parcelId){
  const p=getAllParcels().find(item=>item.id===parcelId);if(!p)return;
  const win=window.open("","_blank","width=600,height=700");
  if(!win)return showToast("Please allow pop-ups to print a receipt.");
  win.document.write(`<!doctype html><html><head><title>Parcel receipt ${escapeHtml(p.id)}</title><style>body{font:14px Arial;padding:35px;color:#20283a}h1{font-size:22px}small{color:#777}hr{border:0;border-top:1px solid #ddd;margin:20px 0}.token{font-size:30px;letter-spacing:7px;font-weight:bold;color:#5558d9;padding:15px;background:#f0f0ff;display:inline-block}p{line-height:1.8}</style></head><body><small>PARCELDESK · CAMPUS COURIER</small><h1>Parcel collection receipt</h1><hr><p><b>Parcel ID:</b> ${escapeHtml(p.id)}<br><b>Student:</b> ${escapeHtml(p.studentName)}<br><b>Roll number:</b> ${escapeHtml(p.rollNumber)}<br><b>Recipient type:</b> ${escapeHtml(p.recipientType || "Student")}<br><b>Destination:</b> ${escapeHtml(p.destination || p.hostelBlock || "—")}<br><b>Courier:</b> ${escapeHtml(p.courier)}<br><b>Received:</b> ${formatDate(p.receivedAt)}</p><p>Pickup token</p><div class="token">${escapeHtml(p.pickupToken)}</div><p><small>Present this token at the parcel desk. Keep it private until collection.</small></p><hr><small>Prototype receipt — not an official university document.</small><script>window.onload=()=>window.print()<\/script></body></html>`);
  win.document.close();
}
