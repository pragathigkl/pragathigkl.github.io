const D="register-data",SK="pragathi-reg-key",PK="pragathi-pgtse-key",MARK="PRAGATI-REGISTER-OK";
let KEY=null,ALL=[],PG=[],PGRES=[],PGRES_LOADED=false,PG_LOADED=false;
const imgs={},crops={};
const hex=h=>Uint8Array.from(h.match(/../g),x=>parseInt(x,16));

async function dec(name){
 const r=await fetch(`${D}/${name}`);
 if(!r.ok)throw new Error(`Could not load ${name}`);
 const b=new Uint8Array(await r.arrayBuffer());
 return crypto.subtle.decrypt({name:"AES-GCM",iv:b.slice(0,12)},KEY,b.slice(12));
}

async function unlock(u,p){
 try{
  const m=await (await fetch(`${D}/meta.json`)).json();
  const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(`${u.trim()}:${p}`),"PBKDF2",false,["deriveKey"]);
  KEY=await crypto.subtle.deriveKey({name:"PBKDF2",salt:hex(m.salt),iterations:m.iter,hash:"SHA-256"},base,{name:"AES-GCM",length:256},true,["decrypt"]);
  if(new TextDecoder().decode(await dec("check"))!==MARK)throw 0;
  try{
   sessionStorage.setItem(SK,btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey("raw",KEY)))));
   sessionStorage.setItem(PK,p.trim());
   sessionStorage.setItem("pragathi-login-user",u.trim());
  }catch{}
  return true;
 }catch{KEY=null;return false}
}

async function restore(){
 try{
  const s=sessionStorage.getItem(SK);
  if(!s)return false;
  KEY=await crypto.subtle.importKey("raw",Uint8Array.from(atob(s),c=>c.charCodeAt(0)),"AES-GCM",true,["decrypt"]);
  return new TextDecoder().decode(await dec("check"))===MARK;
 }catch{KEY=null;return false}
}

const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const band=v=>{const m=/^\s*(II|I)\s*\.?\s*PUC/i.exec(v||"");return m?m[1].toUpperCase()+" PUC":""};
const cls=s=>band(s.class_admitted)||"Other";
const CATEGORIES=["Cat-I","II A","II B","III A","III B","SC","ST","General","Other"];
function normCat(txt){
 const u=String(txt||"").toUpperCase();
 if(/III\s*B/.test(u))return"III B";
 if(/III\s*A/.test(u))return"III A";
 if(/II\s*B/.test(u))return"II B";
 if(/II\s*A|CAT-II\b|C-2\b/.test(u))return"II A";
 if(/\bSC\b/.test(u))return"SC";
 if(/\bST\b/.test(u))return"ST";
 if(/CAT-I\b|\bC-I\b|\bI\s*A\b/.test(u))return"Cat-I";
 if(u.includes("GENERAL"))return"General";
 return"Other";
}

const app=$("#app");

function gate(msg=""){
 if(!msg&&location.protocol==="file:")msg="This page is opened from a file on your computer, so the register cannot load. Publish the site (Cloudflare Pages / Netlify) and log in on the live address.";
 app.innerHTML=`<div class="gate"><header><h2>College Login</h2><p style="margin:6px 0 0;color:#cfdaf5;font-size:14px">Single office sign-in for Dashboard, Admission Register, PGTSE-2027 Results &amp; Applications, and Online Exam Invigilator Module.</p></header>
<form id="lf"><label>Username<input name="u" inputmode="numeric" autocomplete="username" placeholder="Enter coordinator username"></label><label>Password<input name="p" type="password" autocomplete="current-password" placeholder="Enter password"></label><button class="btn b3" style="width:100%;margin:16px 0 0" id="lb">Sign in</button>${msg?`<div class="msg" role="status">${msg}</div>`:""}</form></div>`;
 $("#lf").onsubmit=async e=>{
  e.preventDefault();
  const f=new FormData(e.target),u=f.get("u"),p=f.get("p");
  if(!u||!p)return gate("Enter the username and password.");
  if(location.protocol==="file:")return gate("This page is opened from a file on your computer, so the register cannot load. Publish the site (Cloudflare Pages / Netlify) and log in on the live address.");
  $("#lb").textContent="Signing in…";$("#lb").disabled=true;
  (await unlock(u,p))?start():gate("Wrong username or password. Please try again or call the office.");
 };
}

async function start(){
 app.innerHTML="<p>Loading College Dashboard &amp; Admission Register…</p>";
 ALL=JSON.parse(new TextDecoder().decode(await dec("students")));
 homeDash();
 // Preload PGTSE results & applications in background so everything is ready without any key prompt
 loadPgtseResultsQuiet();
 loadPgtseAppsQuiet();
}

function out(){
 KEY=null;ALL=[];PG=[];PGRES=[];PGRES_LOADED=false;PG_LOADED=false;
 for(const u of Object.values(imgs))URL.revokeObjectURL(u);
 for(const u of Object.values(crops))URL.revokeObjectURL(u);
 try{sessionStorage.removeItem(SK);sessionStorage.removeItem(PK);sessionStorage.removeItem("pragathi-login-user")}catch{}
 gate();
}

const tabs=a=>`<div class="tabs" id="vt">
 <button data-v="dash" class="${a==="dash"?"on":""}">📊 Dashboard</button>
 <button data-v="pgres" class="${a==="pgres"?"on":""}">🏆 PGTSE-2027 Complete Results</button>
 <button data-v="reg" class="${a==="reg"?"on":""}">📚 Admission Register (${ALL.length})</button>
 <button data-v="pg" class="${a==="pg"?"on":""}">📝 PGTSE-2027 Applications</button>
 <button data-v="oexam" class="${a==="oexam"?"on":""}">🖥️ Online Exam (Invigilator)</button>
</div>`;

function bindTabs(){
 const t=$("#vt");
 if(t)t.onclick=e=>{
  const b=e.target.closest("button[data-v]");
  if(!b)return;
  const v=b.dataset.v;
  if(v==="dash")homeDash();
  else if(v==="pgres")pgResView();
  else if(v==="reg")regDash();
  else if(v==="pg")pgtse();
  else if(v==="oexam")onlineExamView();
 };
}

const hd=(t,extra="")=>`<div class="bar"><h2>${t}</h2><div>${extra}<button class="btn b4" id="lo">Log out</button></div></div>`;

/* =========================================================================
   1. UNIFIED DASHBOARD (REGISTER STRENGTH + PGTSE-2027 SUMMARY)
   ========================================================================= */
function homeDash(){
 const yrs=[...new Set(ALL.map(s=>s.academic_year))].sort();
 const boys=ALL.filter(s=>s.sex==="Boy").length;
 const girls=ALL.filter(s=>s.sex==="Girl").length;
 const withCrop=ALL.filter(s=>s.crop).length;

 // Build Academic Year x Class x Category matrix (like admission_register.py)
 const usedCats=CATEGORIES.filter(c=>c!=="Other"||ALL.some(s=>normCat(s.caste_category)==="Other"));
 let matrixRows="";
 const grand=Object.fromEntries(usedCats.map(c=>[c,0]));
 for(const y of yrs){
  const yStudents=ALL.filter(s=>s.academic_year===y);
  const yClasses=[...new Set(yStudents.map(s=>cls(s)))].sort((a,b)=>(a==="I PUC"?0:a==="II PUC"?1:2)-(b==="I PUC"?0:b==="II PUC"?1:2));
  const ySum=Object.fromEntries(usedCats.map(c=>[c,0]));
  yClasses.forEach((cName,idx)=>{
   const sub=yStudents.filter(s=>cls(s)===cName);
   matrixRows+=`<tr><td><b>${idx===0?y:""}</b></td><td>${cName}</td>`+
    usedCats.map(cat=>{
     const cnt=sub.filter(s=>normCat(s.caste_category)===cat).length;
     ySum[cat]+=cnt;grand[cat]+=cnt;
     return `<td class="c">${cnt?`<a href="#" class="cell" data-y="${y}" data-c="${cName}" data-cat="${cat}">${cnt}</a>`:"<span style='color:#9aa6c2'>-</span>"}</td>`;
    }).join("")+
    `<td class="c" style="background:#eaf1fb"><b><a href="#" class="cell" data-y="${y}" data-c="${cName}" data-cat="">${sub.length}</a></b></td></tr>`;
  });
  const yTot=yStudents.length;
  matrixRows+=`<tr style="background:#dfe9f7"><td><b>${y} Total</b></td><td></td>`+
   usedCats.map(cat=>`<td class="c"><b>${ySum[cat]?`<a href="#" class="cell" data-y="${y}" data-c="" data-cat="${cat}">${ySum[cat]}</a>`:"0"}</b></td>`).join("")+
   `<td class="c" style="background:#c5d8f2"><b><a href="#" class="cell" data-y="${y}" data-c="" data-cat="">${yTot}</a></b></td></tr>`;
 }
 matrixRows+=`<tr style="background:var(--navy);color:#fff"><td><b>GRAND TOTAL</b></td><td></td>`+
  usedCats.map(cat=>`<td class="c"><b><a href="#" class="cell" style="color:#fff" data-y="" data-c="" data-cat="${cat}">${grand[cat]}</a></b></td>`).join("")+
  `<td class="c" style="background:var(--gold);color:#000"><b><a href="#" class="cell" style="color:#000" data-y="" data-c="" data-cat="">${ALL.length}</a></b></td></tr>`;

 app.innerHTML=tabs("dash")+hd("College Dashboard & Overview",`<button class="btn b3 sm" style="background:#0e9f48" id="goOnlineExam">🖥️ Online Exam Module</button> <button class="btn b3 sm" id="goPgtseRes">🏆 PGTSE-2027 Results</button> <button class="btn b4 sm" id="goReg">📚 Admission Register</button>`)+`
 <div class="kpi-grid">
  <div class="kpi-card"><small>Total Register Students</small><b>${ALL.length}</b><span>Across ${yrs.length} academic years (${yrs[0]} to ${yrs[yrs.length-1]})</span></div>
  <div class="kpi-card maroon"><small>Boys / Girls Strength</small><b>${boys} / ${girls}</b><span>Boys: ${boys} · Girls: ${girls}</span></div>
  <div class="kpi-card gold"><small>Scanned Register Crops</small><b>${withCrop}</b><span>Original register entries (2022–23 to 2025–26)</span></div>
  <div class="kpi-card green" id="dashPgtseCard"><small>PGTSE-2027 Exam Results</small><b id="dashPgtseCount">${PGRES_LOADED?PGRES.length:"Loading…"}</b><span id="dashPgtseSub">${PGRES_LOADED?`Evaluated OMR sheets · Click to view & filter`:"Fetching live from Google Sheet…"}</span></div>
 </div>
 <div class="card" style="margin-bottom:22px;background:#fff">
  <div class="bar" style="margin-bottom:10px">
   <h3 style="margin:0">🎓 PGTSE-2027 Quick Summary</h3>
   <div><button class="btn b3 sm" id="dashOpenResBtn">View &amp; Filter Complete PGTSE-2027 Results →</button> <button class="btn b4 sm" id="dashOpenAppBtn">View Applications (${PG_LOADED?PG.length:"…"})</button></div>
  </div>
  <div id="dashPgtseSummary">${renderDashPgtseSummary()}</div>
 </div>
 <div class="card" style="background:#fff">
  <h3 style="margin-top:0">📊 Student Strength — Academic Year / Class / Category</h3>
  <p style="margin:0 0 12px;color:var(--mut);font-size:14px">Click any number in the table below to view the filtered students in the Admission Register.</p>
  <div class="scroll">
   <table>
    <tr><th>Academic Year</th><th>Class</th>${usedCats.map(c=>`<th class="c">${c}</th>`).join("")}<th class="c">Total</th></tr>
    ${matrixRows}
   </table>
  </div>
 </div>`;

 bindTabs();
 $("#lo").onclick=out;
 $("#goPgtseRes").onclick=pgResView;
 $("#dashOpenResBtn").onclick=pgResView;
 $("#dashOpenAppBtn").onclick=pgtse;
 $("#dashPgtseCard").style.cursor="pointer";
 $("#dashPgtseCard").onclick=pgResView;
 $("#goReg").onclick=regDash;
 $("#goOnlineExam").onclick=onlineExamView;
 app.querySelectorAll("a.cell").forEach(a=>{
  a.onclick=e=>{
   e.preventDefault();
   regDash({q:"",y:a.dataset.y||"",c:a.dataset.c||"",s:"",cat:a.dataset.cat||""});
  };
 });
}

function renderDashPgtseSummary(){
 if(!PGRES_LOADED)return `<p style="margin:0;color:var(--mut)">⏳ Loading live PGTSE-2027 OMR evaluation results from Google Sheets…</p>`;
 if(!PGRES.length)return `<p style="margin:0;color:var(--mut)">No evaluated OMR results found in the sheet yet. Once sheets are scanned, complete results will appear here automatically.</p>`;
 const scores=PGRES.map(r=>Number(r.totalMarks||0));
 const topScore=Math.max(...scores);
 const avgScore=(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1);
 const vCounts=[1,2,3,4,5].map(v=>`<b>V${v}:</b> ${PGRES.filter(r=>String(r.paperVersion)==String(v)).length}`).join(" &nbsp;|&nbsp; ");
 return `<div class="stats" style="margin:0">
  <div><b>${PGRES.length}</b>Total Evaluated</div>
  <div><b>${topScore} / 60</b>Highest Score (${((topScore/60)*100).toFixed(1)}%)</div>
  <div><b>${avgScore} / 60</b>Average Score</div>
  <div><b>${new Set(PGRES.map(r=>(r.schoolName||"").trim()).filter(Boolean)).size}</b>Schools</div>
 </div>
 <p style="margin:10px 0 0;font-size:14px;color:var(--mut)">Paper Version Breakdown: ${vCounts}</p>`;
}

/* =========================================================================
   2. ADMISSION REGISTER (WITH SCANNED REGISTER CROPS & STUDY CERTIFICATES)
   ========================================================================= */
function regDash(initFilter=null){
 const yrs=[...new Set(ALL.map(s=>s.academic_year))].sort(),cs=["I PUC","II PUC","Other"];
 const usedCats=CATEGORIES.filter(c=>c!=="Other"||ALL.some(s=>normCat(s.caste_category)==="Other"));
 const cell=(y,c,n)=>n?`<a href="#" class="cell" data-y="${y||""}" data-c="${c||""}">${n}</a>`:"0";
 app.innerHTML=tabs("reg")+hd("Admission Register")+`
 <div class="tools" style="grid-template-columns:2fr 1fr 1fr 1fr 1fr">
  <input id="q" placeholder="Search name, father, admission no, SATS no…">
  <select id="fy"><option value="">All years</option>${yrs.map(y=>`<option>${y}</option>`).join("")}</select>
  <select id="fc"><option value="">All classes</option>${cs.map(c=>`<option>${c}</option>`).join("")}</select>
  <select id="fs"><option value="">Boys &amp; girls</option><option>Boy</option><option>Girl</option></select>
  <select id="fcat"><option value="">All categories</option>${usedCats.map(c=>`<option>${c}</option>`).join("")}</select>
 </div>
 <div id="res"><div class="scroll"><table><tr><th>Academic year</th>${cs.map(c=>`<th class="n">${c}</th>`).join("")}<th class="n">Total</th></tr>
 ${yrs.map(y=>`<tr><td><b>${y}</b></td>${cs.map(c=>`<td class="n">${cell(y,c,ALL.filter(s=>s.academic_year===y&&cls(s)===c).length)}</td>`).join("")}<td class="n"><b>${cell(y,"",ALL.filter(s=>s.academic_year===y).length)}</b></td></tr>`).join("")}
 <tr><th>All years</th>${cs.map(c=>`<th class="n">${cell("",c,ALL.filter(s=>cls(s)===c).length)}</th>`).join("")}<th class="n">${cell("","",ALL.length)}</th></tr></table></div><p style="color:var(--mut)">Click any number to see the students, or use the search and filters above.</p></div>`;
 bindTabs();$("#lo").onclick=out;
 const run=()=>list({q:$("#q").value,y:$("#fy").value,c:$("#fc").value,s:$("#fs").value,cat:$("#fcat").value});
 for(const id of["q","fy","fc","fs","fcat"])$("#"+id).oninput=run;
 $("#res").onclick=e=>{const a=e.target.closest("a.cell");if(a){e.preventDefault();$("#fy").value=a.dataset.y||"";$("#fc").value=a.dataset.c||"";run()}};
 if(initFilter){
  $("#q").value=initFilter.q||"";
  $("#fy").value=initFilter.y||"";
  $("#fc").value=initFilter.c||"";
  $("#fs").value=initFilter.s||"";
  $("#fcat").value=initFilter.cat||"";
  if(initFilter.q||initFilter.y||initFilter.c||initFilter.s||initFilter.cat)run();
 }
}

function list(f){
 const q=(f.q||"").trim().toLowerCase();
 if(!q&&!f.y&&!f.c&&!f.s&&!f.cat)return regDash();
 const r=ALL.filter(s=>(!f.y||s.academic_year===f.y)&&(!f.c||cls(s)===f.c)&&(!f.s||s.sex===f.s)&&(!f.cat||normCat(s.caste_category)===f.cat)&&(!q||[s.name,s.father,s.admission_no,s.cumulative_record_no,s.id_number].some(v=>String(v||"").toLowerCase().includes(q))));
 $("#res").innerHTML=`<p><b>${r.length}</b> student(s) found <a href="#" id="clr">· clear filters</a></p><div class="scroll"><table><tr><th>Adm. No</th><th>Name</th><th>Sex</th><th>Class</th><th>Year</th><th>Father</th><th>Category</th><th>Register Scan</th></tr>
 ${r.slice(0,500).map(s=>`<tr class="click" data-i="${s.id}"><td>${esc(s.admission_no)}</td><td><b>${esc(s.name)}</b></td><td>${esc(s.sex)}</td><td>${cls(s)}</td><td>${s.academic_year}</td><td>${esc(s.father)}</td><td>${esc(s.caste_category)}</td><td>${s.crop?`<span style="color:#15803d;font-weight:700">✓ Page ${esc(s.pdf_page)}, Row ${esc(s.row_on_page)}</span>`:`<span style="color:var(--mut)">Digital record</span>`}</td></tr>`).join("")}</table></div>${r.length>500?"<p>Showing first 500. Narrow the search.</p>":""}`;
 $("#clr").onclick=e=>{e.preventDefault();regDash()};
 $("#res").querySelector("table").onclick=e=>{const t=e.target.closest("tr.click");if(t)record(+t.dataset.i,f)};
}

const LAB={cumulative_record_no:"Cumulative Record / SATS No",id_number:"ID Number (Aadhaar)",pen_no:"PEN Number",dob:"Date of Birth",father:"Father",mother:"Mother",religion:"Religion",caste_category:"Caste / Category",mother_tongue:"Mother tongue",village:"Village",taluk:"Taluk",district:"District",annual_income:"Annual income (₹)",last_school_attended:"Last school attended",standard_last_studied:"Standard last studied",class_admitted:"Class admitted",admission_date:"Date of admission",progress:"Progress / result",class_on_leaving:"Class on leaving",leaving_date:"Date of leaving",leaving_reason:"Reason for leaving",tc_issued:"TC issued",exam_passed:"Exam passed",sslc_reg_no:"SSLC reg. no",sslc_obtained:"SSLC obtained",sslc_total:"SSLC total",sslc_pct:"SSLC %",puc_reg_no:"PUC reg. no",puc_obtained:"PUC obtained",puc_total:"PUC total",puc_pct:"PUC %"};

async function photo(s){
 if(!s.photo)return"";
 if(imgs[s.id])return imgs[s.id];
 try{return imgs[s.id]=URL.createObjectURL(new Blob([await dec("p"+s.id)],{type:"image/jpeg"}))}catch{return""}
}

async function regCrop(s){
 if(!s.crop)return"";
 if(crops[s.id])return crops[s.id];
 try{return crops[s.id]=URL.createObjectURL(new Blob([await dec("c"+s.id)],{type:"image/jpeg"}))}catch{return""}
}

async function record(id,f){
 const s=ALL[id];
 const scanMeta=s.crop?`${esc(s.source_pdf||"ADMISSION_REGISTER")} · Page ${esc(s.pdf_page)}, Row ${esc(s.row_on_page)}`:"";
 app.innerHTML=tabs("reg")+hd(esc(s.name),`<button class="btn b4" id="bk">← Back to Register List</button>`)+`
 <div class="card rec">
  <div class="ph" id="ph">No photo</div>
  <div>
   <p style="margin-top:0"><b>Academic Year: ${esc(s.academic_year)}</b> · Admission No. <b>${esc(s.admission_no)}</b> · ${esc(s.sex)} · ${cls(s)}</p>
   <div class="kv">${Object.entries(LAB).filter(([k])=>s[k]).map(([k,l])=>`<div><small>${l}</small><b>${esc(s[k])}</b></div>`).join("")}</div>
   <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--line)">
    <small style="display:block;color:var(--mut);font-weight:700;text-transform:uppercase;margin-bottom:6px">Generate Official Certificates (A4 Format)</small>
    <button class="btn b3" data-k="study1">🎓 Study Certificate-1 (1 Year / Studying)</button>
    <button class="btn b3" data-k="study2">🎓 Study Certificate-2 (I &amp; II Year Studied)</button>
    <button class="btn b4" data-k="proforma">📄 Proforma for Study Certificate</button>
   </div>
  </div>
 </div>
 <div class="crop-card">
  <div class="crop-bar">
   <div>
    <h3>📜 Original Register Entry (Scanned Register Crop)</h3>
    <small style="color:var(--mut)">${scanMeta||"No scanned register PDF crop attached for this academic year"}</small>
   </div>
   ${s.crop?`<div>
    <button class="btn b4 sm" id="btnZoomCrop">🔍 Toggle Full-Width Zoom</button>
    <button class="btn b3 sm" id="btnPrintCrop">🖨️ Print Register Crop</button>
   </div>`:""}
  </div>
  <div class="crop-box" id="cropBox">
   ${s.crop?`<p style="color:var(--mut);margin:20px 0">Loading original register crop from ${esc(s.source_pdf)} (Page ${esc(s.pdf_page)}, Row ${esc(s.row_on_page)})…</p>`:`<p style="color:var(--mut);margin:20px 0">Scanned register page crops are available for 2022–23, 2023–24 (ADMISSION_REGISTER-1.pdf) and 2024–25, 2025–26 (ADMISSION_REGISTER-2.pdf).</p>`}
  </div>
 </div>`;

 bindTabs();
 $("#lo").onclick=out;
 $("#bk").onclick=()=>regDash(f);
 app.querySelectorAll("button[data-k]").forEach(b=>{b.onclick=()=>certForm(s,b.dataset.k)});

 photo(s).then(u=>{if(u&&$("#ph"))$("#ph").outerHTML=`<img class="ph" src="${u}" alt="${esc(s.name)}">`});
 if(s.crop){
  regCrop(s).then(u=>{
   const box=$("#cropBox");
   if(!box)return;
   if(!u){box.innerHTML=`<p style="color:var(--maroon)">Could not load register crop.</p>`;return}
   box.innerHTML=`<img id="cropImg" src="${u}" alt="Original Register Entry for ${esc(s.name)}" title="Click to toggle zoom">`;
   const img=$("#cropImg");
   const toggleZoom=()=>img.classList.toggle("full-zoom");
   img.onclick=toggleZoom;
   if($("#btnZoomCrop"))$("#btnZoomCrop").onclick=toggleZoom;
   if($("#btnPrintCrop"))$("#btnPrintCrop").onclick=()=>{
    const w=window.open("","_blank");
    if(!w)return;
    w.document.write(`<!doctype html><title>Register Entry - ${esc(s.name)}</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;margin:0}h3{margin:0 0 4px;color:#0b2a5b}p{margin:0 0 10px;font-size:12px;color:#555}img{width:100%;max-height:175mm;object-fit:contain;border:1px solid #333}</style>
    <h3>Pragathi P.U. College, Gurumatkal (KY0434) — Original Admission Register Extract</h3>
    <p><b>Student:</b> ${esc(s.name)} &nbsp;|&nbsp; <b>Father:</b> ${esc(s.father)} &nbsp;|&nbsp; <b>Academic Year:</b> ${esc(s.academic_year)} &nbsp;|&nbsp; <b>Admission No:</b> ${esc(s.admission_no)} &nbsp;|&nbsp; <b>Source:</b> ${scanMeta}</p>
    <img src="${u}" onload="setTimeout(()=>window.print(),250)">`);
    w.document.close();
   };
  });
 }
}

/* =========================================================================
   3. STUDY CERTIFICATES (MATCHING UPLOADED STUDY CERTIFICATE.DOCX REFERENCE)
   ========================================================================= */
const TITLE={
 study1:"Study Certificate-1 (Studying I / II Year)",
 study2:"Study Certificate-2 (Studied I & II Year)",
 proforma:"Proforma for Study Certificate"
};
const shift=(v,by=1)=>{const m=/^\s*(\d{4})\s*[-/]\s*(\d{2,4})/.exec(v||"");if(!m)return v||"";const a=+m[1]+by;return `${a}-${String((a+1)%100).padStart(2,"0")}`};

function seed(s,k){
 const from=band(s.class_admitted)||"I PUC";
 const rec=band(s.class_on_leaving)||band(s.progress);
 let to=rec||from;
 if(k==="study2"&&from==="I PUC")to="II PUC";
 if(k==="study1")to=from;
 const d=new Date(),dd=String(d.getDate()).padStart(2,"0"),mm=String(d.getMonth()+1).padStart(2,"0");
 const ayFrom=s.academic_year||"";
 const ayTo=(k==="study2"&&from==="I PUC"&&to==="II PUC")?shift(ayFrom,1):(from==="I PUC"&&to==="II PUC"&&k!=="study1"?shift(ayFrom,1):ayFrom);
 return{
  date:k==="proforma"?`${dd}/${mm}/${d.getFullYear()}`:`${dd}-${mm}-${d.getFullYear()}`,
  name:(s.name||"").trim(),
  father:(s.father||"").trim(),
  sex:s.sex||"Boy",
  class_from:from,
  class_to:to,
  ay_from:ayFrom,
  ay_to:ayTo,
  tongue:((s.mother_tongue||"").trim()||"KANNADA").toUpperCase(),
  adm_ay:`${s.admission_no||""}/${s.academic_year||""}`
 };
}

const FL=[
 ["date","Date (DD-MM-YYYY)"],
 ["name","Student name"],
 ["father","Father's name"],
 ["sex","Sex (Boy / Girl)"],
 ["class_from","Class from (I PUC / II PUC)"],
 ["class_to","Class up to (I PUC / II PUC)"],
 ["ay_from","Academic year from"],
 ["ay_to","Academic year to"],
 ["tongue","Mother tongue (e.g. KANNADA / URDU)"],
 ["adm_ay","Admission No. / Academic Year"]
];

function present(k,f){
 const girl=f.sex.trim().toLowerCase().startsWith("g"),rel=girl?"D/O":"S/O";
 const name=f.name.trim().toUpperCase(),fa=f.father.trim().toUpperCase();
 const from=band(f.class_from)||f.class_from,to=band(f.class_to)||f.class_to;
 const word=v=>{const b=band(v);return b?b.replace(" PUC",""):v.trim()};
 const fy=f.ay_from.trim(),ty=f.ay_to.trim();
 return{
  ...f,
  tongue:(f.tongue||"KANNADA").trim().toUpperCase(),
  full_name:fa?`${name} ${rel} ${fa}`:name,
  name:fa?`${name} ${rel} ${fa}`:name,
  title:k==="proforma"?(girl?"Kum.":"Sri."):"Kumar/Kumari",
  pron:"his/ her",
  class_year:word(f.class_to||f.class_from),
  classes:from==="I PUC"&&to==="II PUC"?"I & II":word(f.class_to||f.class_from),
  years:!ty||fy===ty?fy:`${fy} to ${ty}`
 };
}

function renderA4PreviewHtml(k,f){
 const v=present(k,f);
 if(k==="proforma"){
  return `<div class="a4-cert proforma-cert">
   <div class="pf-top">
    <h2>PROFORMA FOR STUDY CERTIFICATE</h2>
    <h3>PRAGATHI PRE UNIVERSITY COLLEGE, GURUMITKAL</h3>
    <p>TQ: GURUMITKAL DIST: YADGIR-585214</p>
   </div>
   <div class="sc-date" style="font-size:13pt;margin-bottom:24px">Date: ${esc(v.date)}</div>
   <p class="sc-p" style="font-size:14pt;line-height:1.85">This is to certify that ${esc(v.title)} <b>${esc(v.full_name)}</b> has studied from <b>${esc(v.class_from)}</b> standard to <b>${esc(v.class_to)}</b> standard in our institution from <b>${esc(v.ay_from)}</b> to <b>${esc(v.ay_to)}</b> academic years.</p>
   <p class="sc-p" style="font-size:14pt;line-height:1.85">The mother tongue of the candidate is <b>${esc(v.tongue)}</b> as per the Admission register of the institution.</p>
   <p class="sc-p" style="font-size:14pt;line-height:1.85">The above details are true and correct to the best of my knowledge.</p>
   <div style="text-align:right;margin-top:44px;font-size:13pt;line-height:1.4">
    <div>Signature of</div>
    <div><b>Head of the institution</b></div>
    <div style="margin-top:16px"><b>R SHIVKUMARREDDY</b></div>
    <div>Mobile number: 9036088843</div>
   </div>
   <div style="margin-top:36px;font-size:13pt;line-height:1.5">
    <div><b>COUNTER SIGNED BY ME</b></div>
    <div style="margin-top:26px">Address, Seal &amp; Office Telephone Number</div>
    <div>Of the Block Educational Officer / DDPU.</div>
    <div>Mobile number:</div>
   </div>
  </div>`;
 }
 const bodyLine = (k==="study1")
  ? `This is to certify that Kumar/Kumari <b>${esc(v.full_name)}</b> was studying <u><b>${esc(v.class_year)} year</b></u> in our Institution from <b>${esc(v.ay_to||v.ay_from)}</b> academic year during their studying period his/ her character was good satisfactory.`
  : `This is to certify that Kumar/Kumari <b>${esc(v.full_name)}</b> was studied <b>${esc(v.classes)} year</b> in our Institution from <b>${esc(v.years)}</b> academic year during their studying period his/ her character was good satisfactory.`;

 return `<div class="a4-cert">
  <div class="sc-hdr">
   <img class="sc-logo" src="media/logo-pragathi.png" alt="Pragathi P.U. College Crest">
   <div class="sc-hdr-txt">
    <p class="sc-soc">DECCAN EDUCATION SOCIETY (R.)</p>
    <p class="sc-col">PRAGATHI P.U.COLLEGE,GURUMATKAL</p>
    <p class="sc-addr">#NEAR YASHODA PETROL BUNK, HYD ROAD, GURUMITKAL – 585214</p>
   </div>
  </div>
  <div class="sc-title">STUDY CERTIFICATE</div>
  <div class="sc-date">Date: ${esc(v.date)}</div>
  <p class="sc-p">${bodyLine}</p>
  <p class="sc-p">The mother tongue of the candidate is <b>${esc(v.tongue)}</b> as per the admission register of the institution. The above details are true and correct to be the best of my knowledge.</p>
  <div class="sc-adm">Adm. No: ${esc(v.adm_ay)}</div>
  <div class="sc-prin">Principal</div>
 </div>`;
}

function certForm(s,k){
 const v=seed(s,k);
 $("#modal").classList.add("open");
 $("#mform").innerHTML=`<div class="bar"><h2>${TITLE[k]}</h2><button class="btn b4" id="cx">Close</button></div>
 <p style="margin:0 0 8px;color:var(--mut);font-size:14px">Matches official Pragathi P.U. College Study Certificate format. Edit any field below to update the preview immediately.</p>
 <form id="cf" class="rg">${FL.map(([n,l])=>`<label>${l}<input name="${n}" value="${esc(v[n])}"></label>`).join("")}
  <div style="grid-column:1/-1;margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
   <button class="btn b3" type="submit" style="margin:0">🔄 Update Preview &amp; Word File</button>
   <button class="btn b1" type="button" id="prCertBtn" style="margin:0">🖨️ Print Certificate (A4)</button>
   <span id="ca"></span>
  </div>
 </form>
 <p id="cm" style="margin:6px 0 0"></p>`;
 $("#cx").onclick=()=>$("#modal").classList.remove("open");
 $("#prCertBtn").onclick=()=>window.print();

 const updatePreviewAndDocx=async()=>{
  const f=Object.fromEntries(new FormData($("#cf")));
  $("#prev").innerHTML=renderA4PreviewHtml(k,f);
  try{
   if(typeof JSZip!=="undefined"){
    const{bytes}=await build(k,f);
    const blob=new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
    const fn=`${k==="study1"?"Study_Certificate_1":k==="study2"?"Study_Certificate_2":"Proforma"}_${(f.name||"Student").trim().replace(/\s+/g,"_")}.docx`;
    $("#ca").innerHTML=`<a class="btn b4" style="margin:0" download="${fn}" href="${URL.createObjectURL(blob)}">📥 Download Word (.docx)</a>`;
   }
  }catch(err){
   console.warn("DOCX build note:",err);
  }
 };

 $("#cf").oninput=()=>updatePreviewAndDocx();
 $("#cf").onsubmit=e=>{e.preventDefault();updatePreviewAndDocx()};
 updatePreviewAndDocx();
}

const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main",X="http://www.w3.org/XML/1998/namespace";
const re=p=>p.replace(/[.*+?^${}()|[\]\\\/]/g,"\\$&");const q=p=>new RegExp(`[“"]\\s*${p.trim().split(/\s+/).map(re).join("\\s+")}\\s*[”"]`,"gi");
const RULES={
 proforma:[[q("Today Date"),"date"],[/Sri\.\s*\/\s*Kum\./g,"title"],[q("STUDENT NAME S/O OR D/O FATHER NAME"),"name"],[q("Studied class from"),"class_from"],[q("studied class upto"),"class_to"],[q("academic year from"),"ay_from"],[q("academic year to"),"ay_to"],[q("medium"),"tongue"]],
 study1:[[q("Today Date"),"date"],[q("student name s/o or D/o Father name"),"name"],[q("present studying class"),"class_year"],[q("academic year"),"ay_to"],[q("Medium"),"tongue"],[q("Admission number/academic year"),"adm_ay"]],
 study2:[[q("Today Date"),"date"],[q("student name s/o or D/o Father name"),"name"],[q("studied classes"),"classes"],[q("academic years"),"years"],[q("Medium"),"tongue"],[q("Admission number/academic year"),"adm_ay"]]
};
function ptexts(p){return[...p.getElementsByTagNameNS(W,"t")].filter(n=>{let a=n.parentNode;while(a&&(a.nodeType!==1||a.localName!=="p"||a.namespaceURI!==W))a=a.parentNode;return a===p})}
function apply(p,pairs,vals){for(const[pat,key]of pairs){let nodes=ptexts(p);if(!nodes.length)return;
 const calc=()=>{nodes=ptexts(p);const parts=nodes.map(n=>n.textContent||"");return{parts,joined:parts.join(""),starts:parts.map((_,i)=>parts.slice(0,i).reduce((a,b)=>a+b.length,0))}};let{parts,joined,starts}=calc();
 for(const m of[...joined.matchAll(new RegExp(pat.source,pat.flags.includes("g")?pat.flags:pat.flags+"g"))].reverse()){const st=m.index,end=st+m[0].length;let val=String(vals[key]??""),from=st;
  while(from<end-1&&(joined[from]==="“"||joined[from]==='"'))from++;
  if(end<joined.length&&/[\p{L}\p{N}]/u.test(joined[end])&&!val.endsWith(" "))val+=" ";
  let first=0;starts.forEach((s,i)=>{if(s<=from)first=i});
  nodes.forEach((n,i)=>{const at=starts[i],t=parts[i];if(at+t.length<=st||at>=end)return;n.textContent=t.slice(0,Math.max(0,st-at))+(i===first?val:"")+t.slice(Math.max(0,end-at));n.setAttributeNS(X,"xml:space","preserve")});
  ({parts,joined,starts}=calc())}}}
async function build(k,f){
 const zip=await JSZip.loadAsync(await dec("t-"+k)),xml=await zip.file("word/document.xml").async("string"),doc=new DOMParser().parseFromString(xml,"application/xml"),vals=present(k,f);
 for(const p of[...doc.getElementsByTagNameNS(W,"p")])apply(p,RULES[k],vals);
 for(const z of[...doc.getElementsByTagNameNS(W,"pgSz")]){z.setAttributeNS(W,"w:w","11906");z.setAttributeNS(W,"w:h","16838")}
 const left=[];for(const p of[...doc.getElementsByTagNameNS(W,"p")])left.push(...((ptexts(p).map(n=>n.textContent).join("").match(/“[^”]{1,60}”/g))||[]));
 zip.file("word/document.xml",new XMLSerializer().serializeToString(doc));
 return{bytes:await zip.generateAsync({type:"uint8array",compression:"DEFLATE"}),left};
}

/* =========================================================================
   4. PGTSE-2027 COMPLETE RESULTS & DASHBOARD (NO EXTRA KEY REQUIRED)
   ========================================================================= */
const RESULT_API = C.pgtseResult || "https://script.google.com/macros/s/AKfycbzXedUOZjoAt0qqRR9mrdUSU65NAUY9ajzsE2ZVfAT9VUsJLgP5On3nSWZBjuevxd0E/exec";

function jsonp(url,ms=15000){
 return new Promise((res,rej)=>{
  const cb="pgq_"+Date.now()+Math.floor(Math.random()*1e4),s=document.createElement("script"),t=setTimeout(()=>{end();rej(new Error("The Google Sheet did not respond in time."))},ms);
  function end(){clearTimeout(t);delete window[cb];s.remove()}
  window[cb]=d=>{end();res(d)};
  s.onerror=()=>{end();rej(new Error("Request blocked or offline."))};
  s.src=`${url}${url.includes("?")?"&":"?"}callback=${cb}`;
  document.body.appendChild(s);
 });
}

function enrichResultsWithApps(){
 if(!PGRES.length)return;
 const appMap={};
 for(const a of PG){
  const k=String(a.satsNumber||"").trim().replace(/^0+/,"");
  if(k)appMap[k]=a;
 }
 // Compute ranks by totalMarks descending
 const sortedScores=[...PGRES].map(r=>Number(r.totalMarks||0)).sort((a,b)=>b-a);
 PGRES.forEach(r=>{
  const k=String(r.satsNumber||"").trim().replace(/^0+/,"");
  const matchedApp=appMap[k];
  if(matchedApp){
   if(!String(r.studentName||"").trim())r.studentName=matchedApp.studentName||"";
   if(!String(r.fatherName||"").trim())r.fatherName=matchedApp.fatherName||"";
   if(!String(r.schoolName||"").trim())r.schoolName=matchedApp.schoolName||"";
   r.mobile=r.mobile||matchedApp.mobile||"";
  }
  const sc=Number(r.totalMarks||0);
  r.computedRank=sortedScores.indexOf(sc)+1;
  r.percentage=Number(r.percentage||((sc/60)*100)).toFixed(2);
 });
}

async function loadPgtseResultsQuiet(){
 try{
  const u=`${RESULT_API}?action=getAllResults&_t=${Date.now()}`;
  let d=null;
  try{d=await (await fetch(u)).json()}catch{d=await jsonp(u)}
  if(d&&d.status==="success"&&Array.isArray(d.results)){
   PGRES=d.results;
   PGRES_LOADED=true;
   enrichResultsWithApps();
   if($("#dashPgtseCount"))$("#dashPgtseCount").textContent=PGRES.length;
   if($("#dashPgtseSub"))$("#dashPgtseSub").textContent="Evaluated OMR sheets · Click to view & filter";
   if($("#dashPgtseSummary"))$("#dashPgtseSummary").innerHTML=renderDashPgtseSummary();
  }
 }catch(e){
  console.warn("Background PGTSE results fetch:",e);
 }
}

async function pgResView(){
 app.innerHTML=tabs("pgres")+hd("PGTSE-2027 Complete Results & Analytics",`<button class="btn b4" id="resRefresh">🔄 Refresh Results</button>`)+`<p>⏳ Loading complete PGTSE-2027 OMR evaluation results from Google Sheets…</p>`;
 bindTabs();$("#lo").onclick=out;$("#resRefresh").onclick=()=>{PGRES_LOADED=false;pgResView()};
 try{
  if(!PGRES_LOADED){
   const u=`${RESULT_API}?action=getAllResults&_t=${Date.now()}`;
   let d=null;
   try{d=await (await fetch(u)).json()}catch{d=await jsonp(u)}
   if(!d||d.status!=="success")throw new Error((d&&d.message)||"Could not fetch results");
   PGRES=d.results||[];
   PGRES_LOADED=true;
  }
  enrichResultsWithApps();
  renderPgResDashboard();
 }catch(err){
  app.innerHTML=tabs("pgres")+hd("PGTSE-2027 Complete Results & Analytics")+`<div class="msg">Could not load PGTSE-2027 results: ${esc(err.message||err)}</div><p><button class="btn b3" id="rtRes">Try Again</button></p>`;
  bindTabs();$("#lo").onclick=out;$("#rtRes").onclick=()=>{PGRES_LOADED=false;pgResView()};
 }
}

function getFilteredPgRes(){
 const q=($("#resQ")?.value||"").trim().toLowerCase();
 const ver=$("#resVer")?.value||"";
 const sch=$("#resSch")?.value||"";
 const bandVal=$("#resBand")?.value||"";
 const sortVal=$("#resSort")?.value||"marks_desc";

 let list=PGRES.filter(r=>{
  if(ver&&String(r.paperVersion||"").trim()!==ver)return false;
  if(sch&&String(r.schoolName||"").trim().toUpperCase()!==sch)return false;
  const m=Number(r.totalMarks||0);
  if(bandVal==="50+"&&m<50)return false;
  if(bandVal==="40-49"&&(m<40||m>49))return false;
  if(bandVal==="30-39"&&(m<30||m>39))return false;
  if(bandVal==="<30"&&m>=30)return false;
  if(q){
   const hay=[r.satsNumber,r.studentName,r.fatherName,r.schoolName,r.mobile].map(x=>String(x||"").toLowerCase()).join(" ");
   if(!hay.includes(q))return false;
  }
  return true;
 });

 list.sort((a,b)=>{
  if(sortVal==="marks_desc")return Number(b.totalMarks||0)-Number(a.totalMarks||0)||String(a.satsNumber).localeCompare(String(b.satsNumber));
  if(sortVal==="marks_asc")return Number(a.totalMarks||0)-Number(b.totalMarks||0);
  if(sortVal==="name_asc")return String(a.studentName||"ZZZ").localeCompare(String(b.studentName||"ZZZ"));
  if(sortVal==="school_asc")return String(a.schoolName||"ZZZ").localeCompare(String(b.schoolName||"ZZZ"))||Number(b.totalMarks||0)-Number(a.totalMarks||0);
  if(sortVal==="sats_asc")return String(a.satsNumber||"").localeCompare(String(b.satsNumber||""));
  return 0;
 });
 return list;
}

function renderPgResDashboard(){
 const schools=[...new Set(PGRES.map(r=>String(r.schoolName||"").trim().toUpperCase()).filter(Boolean))].sort();
 const scores=PGRES.map(r=>Number(r.totalMarks||0));
 const topScore=scores.length?Math.max(...scores):0;
 const avgScore=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(2):"0.00";
 const avgPct=scores.length?((scores.reduce((a,b)=>a+b,0)/(scores.length*60))*100).toFixed(2):"0.00";

 app.innerHTML=tabs("pgres")+hd("PGTSE-2027 Complete Results & Dashboard",`
  <button class="btn b4 sm" id="resRefreshBtn">🔄 Refresh</button>
  <button class="btn b4 sm" id="resCsvBtn">📥 Export CSV</button>
  <button class="btn b3 sm" id="resPrintBtn">🖨️ Print Filtered Result List</button>
 `)+`
 <div class="kpi-grid">
  <div class="kpi-card"><small>Total Evaluated Students</small><b>${PGRES.length}</b><span>PGTSE-2027 OMR Result Records</span></div>
  <div class="kpi-card maroon"><small>Highest Marks Obtained</small><b>${topScore} / 60</b><span>Top Score (${((topScore/60)*100).toFixed(2)}%)</span></div>
  <div class="kpi-card gold"><small>College Average Score</small><b>${avgScore} / 60</b><span>Average Percentage: ${avgPct}%</span></div>
  <div class="kpi-card green"><small>Version Distribution (V1–V5)</small><b style="font-size:18px;margin-top:6px">${[1,2,3,4,5].map(v=>`V${v}:${PGRES.filter(r=>String(r.paperVersion)==String(v)).length}`).join(" · ")}</b><span>Participating Schools: ${schools.length||"—"}</span></div>
 </div>
 <div class="card" style="background:#fff;padding:16px">
  <div class="tools res-flt" style="margin-bottom:10px">
   <input id="resQ" placeholder="🔍 Search SATS No, Student Name, Father Name, School…">
   <select id="resVer">
    <option value="">All Paper Versions (V1–V5)</option>
    <option value="1">Version 1</option>
    <option value="2">Version 2</option>
    <option value="3">Version 3</option>
    <option value="4">Version 4</option>
    <option value="5">Version 5</option>
   </select>
   <select id="resSch">
    <option value="">All Schools (${schools.length})</option>
    ${schools.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("")}
   </select>
   <select id="resBand">
    <option value="">All Score Ranges</option>
    <option value="50+">50 – 60 Marks (83%+)</option>
    <option value="40-49">40 – 49 Marks</option>
    <option value="30-39">30 – 39 Marks</option>
    <option value="<30">Below 30 Marks</option>
   </select>
   <select id="resSort">
    <option value="marks_desc">Sort: Marks (High → Low)</option>
    <option value="marks_asc">Sort: Marks (Low → High)</option>
    <option value="sats_asc">Sort: SATS Number</option>
    <option value="name_asc">Sort: Student Name (A–Z)</option>
    <option value="school_asc">Sort: School Name (A–Z)</option>
   </select>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-bottom:10px">
   <p id="resCountInfo" style="margin:0;font-size:14px"></p>
   <a href="#" id="resClearFlt" style="font-size:14px;font-weight:600">Clear all filters</a>
  </div>
  <div class="scroll" id="resTableWrap"></div>
 </div>`;

 bindTabs();
 $("#lo").onclick=out;
 $("#resRefreshBtn").onclick=()=>{PGRES_LOADED=false;pgResView()};
 $("#resCsvBtn").onclick=exportPgResCsv;
 $("#resPrintBtn").onclick=printPgResList;
 $("#resClearFlt").onclick=e=>{
  e.preventDefault();
  $("#resQ").value="";$("#resVer").value="";$("#resSch").value="";$("#resBand").value="";$("#resSort").value="marks_desc";
  renderPgResRows();
 };
 for(const id of["resQ","resVer","resSch","resBand","resSort"])$("#"+id).oninput=renderPgResRows;
 renderPgResRows();
}

function renderPgResRows(){
 const rows=getFilteredPgRes();
 $("#resCountInfo").innerHTML=`Showing <b>${rows.length}</b> of <b>${PGRES.length}</b> student result(s)`;
 if(!rows.length){
  $("#resTableWrap").innerHTML=`<p style="color:var(--mut);padding:16px 0">No matching PGTSE-2027 student results found for the selected filters.</p>`;
  return;
 }
 $("#resTableWrap").innerHTML=`<table>
  <tr>
   <th class="c">#</th>
   <th>SATS No.</th>
   <th>Student Name</th>
   <th>Father's Name</th>
   <th>High School</th>
   <th class="c">Ver</th>
   <th class="c" title="Physics (10)">Phy<br><small>(10)</small></th>
   <th class="c" title="Chemistry (10)">Chem<br><small>(10)</small></th>
   <th class="c" title="Mathematics (20)">Math<br><small>(20)</small></th>
   <th class="c" title="Biology (10)">Bio<br><small>(10)</small></th>
   <th class="c" title="Mental Ability (10)">MA<br><small>(10)</small></th>
   <th class="c">Total<br><small>(60)</small></th>
   <th class="c">%</th>
   <th class="c">C / W / U</th>
   <th class="c">Scorecard</th>
  </tr>
  ${rows.map((r,idx)=>`<tr>
   <td class="c">${idx+1}</td>
   <td><b>${esc(r.satsNumber)}</b></td>
   <td><b>${esc(r.studentName||"—")}</b></td>
   <td>${esc(r.fatherName||"—")}</td>
   <td>${esc(r.schoolName||"—")}</td>
   <td class="c"><b>V${esc(r.paperVersion)}</b></td>
   <td class="c">${Number(r.physics||0)}</td>
   <td class="c">${Number(r.chemistry||0)}</td>
   <td class="c">${Number(r.mathematics||0)}</td>
   <td class="c">${Number(r.biology||0)}</td>
   <td class="c">${Number(r.mentalAbility||0)}</td>
   <td class="c" style="background:#eef3ff;color:var(--maroon);font-weight:700;font-size:16px">${Number(r.totalMarks||0)}</td>
   <td class="c"><b>${esc(r.percentage)}%</b></td>
   <td class="c"><small><span style="color:#15803d;font-weight:700">${Number(r.correctCount??r.totalMarks??0)}</span> / <span style="color:#b91c1c">${Number(r.wrongCount||0)}</span> / <span style="color:#b45309">${Number(r.unattemptedCount||0)}</span></small></td>
   <td class="c"><a class="btn b3 sm" href="pgtse-result.html?sats=${encodeURIComponent(r.satsNumber)}" target="_blank" rel="noopener">🖨️ View / Print</a></td>
  </tr>`).join("")}
 </table>`;
}

function exportPgResCsv(){
 const rows=getFilteredPgRes();
 const safe=v=>{v=String(v??"");return/^[=+\-@\t\r]/.test(v)?"'"+v:v},txt=v=>v?`="${String(v).replace(/"/g,'""')}"`:"",q=v=>`"${safe(v).replace(/"/g,'""')}"`;
 const csvRows=rows.map((r,i)=>[
  i+1,txt(r.satsNumber),q(r.studentName),q(r.fatherName),q(r.schoolName),
  q("V"+r.paperVersion),Number(r.physics||0),Number(r.chemistry||0),Number(r.mathematics||0),
  Number(r.biology||0),Number(r.mentalAbility||0),Number(r.totalMarks||0),r.percentage,
  Number(r.correctCount??r.totalMarks??0),Number(r.wrongCount||0),Number(r.unattemptedCount||0),q(r.scannedAt)
 ].join(","));
 const csv="\ufeff"+["Sl No,SATS Number,Student Name,Father Name,School Name,Paper Version,Physics (10),Chemistry (10),Mathematics (20),Biology (10),Mental Ability (10),Total Marks (60),Percentage (%),Correct,Wrong,Unattempted,Evaluated On",...csvRows].join("\r\n");
 const a=document.createElement("a");
 a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
 a.download="PGTSE_2027_Complete_Results.csv";
 document.body.appendChild(a);a.click();a.remove();
}

function printPgResList(){
 const rows=getFilteredPgRes();
 const w=window.open("","_blank");
 if(!w)return;
 w.document.write(`<!doctype html><title>PGTSE-2027 Complete Results</title><style>
  @page{size:A4 landscape;margin:10mm}
  body{font:12px Arial,sans-serif;color:#111;margin:0}
  .hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #0b2a5b;padding-bottom:8px;margin-bottom:10px}
  h2{margin:0;color:#0b2a5b;font-size:18px}
  p{margin:2px 0 0;font-size:12px;color:#444}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #444;padding:4px 6px;text-align:left}
  th{background:#0b2a5b;color:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  td.c,th.c{text-align:center}
 </style>
 <div class="hdr">
  <div>
   <h2>DECCAN EDUCATION SOCIETY (R.) · PRAGATHI P.U. COLLEGE, GURUMATKAL (KY0434)</h2>
   <p><b>Pragathi Genius Talent Search Examination – 2027 (PGTSE-2027) · Complete Result Sheet (${rows.length} Students)</b></p>
  </div>
  <div style="text-align:right;font-size:12px">Date: ${new Date().toLocaleDateString("en-IN")}</div>
 </div>
 <table>
  <tr><th class="c">#</th><th>SATS No.</th><th>Student Name</th><th>Father's Name</th><th>High School</th><th class="c">Ver</th><th class="c">Phy (10)</th><th class="c">Chem (10)</th><th class="c">Math (20)</th><th class="c">Bio (10)</th><th class="c">MA (10)</th><th class="c">Total (60)</th><th class="c">%</th></tr>
  ${rows.map((r,i)=>`<tr>
   <td class="c">${i+1}</td>
   <td><b>${esc(r.satsNumber)}</b></td>
   <td><b>${esc(r.studentName||"—")}</b></td>
   <td>${esc(r.fatherName||"—")}</td>
   <td>${esc(r.schoolName||"—")}</td>
   <td class="c">V${esc(r.paperVersion)}</td>
   <td class="c">${Number(r.physics||0)}</td>
   <td class="c">${Number(r.chemistry||0)}</td>
   <td class="c">${Number(r.mathematics||0)}</td>
   <td class="c">${Number(r.biology||0)}</td>
   <td class="c">${Number(r.mentalAbility||0)}</td>
   <td class="c"><b>${Number(r.totalMarks||0)}</b></td>
   <td class="c">${esc(r.percentage)}%</td>
  </tr>`).join("")}
 </table>`);
 w.document.close();w.focus();setTimeout(()=>w.print(),300);
}

/* =========================================================================
   5. PGTSE 2027 APPLICATIONS (AUTO-UNLOCKED WITHOUT ANY SECOND KEY PROMPT)
   ========================================================================= */
async function pgLoadAuto(){
 const candidateKeys=[];
 try{
  const savedP=sessionStorage.getItem(PK)||localStorage.getItem(PK);
  const savedU=sessionStorage.getItem("pragathi-login-user");
  if(savedP)candidateKeys.push(savedP);
  if(savedU)candidateKeys.push(savedU);
 }catch{}
 candidateKeys.push("Pragathi#3441","9739883441","pragathi","");
 let lastErr=null;
 for(const k of [...new Set(candidateKeys)]){
  try{
   const u=`${C.pgtse}?key=${encodeURIComponent(k)}&_t=${Date.now()}`;
   let d=null;
   try{d=await (await fetch(u)).json()}catch{d=await jsonp(u)}
   if(d&&d.status==="success"&&Array.isArray(d.records)){
    return d;
   }
   lastErr=new Error((d&&d.message)||"Unexpected response");
  }catch(e){lastErr=e}
 }
 throw lastErr||new Error("Could not load applications");
}

async function loadPgtseAppsQuiet(){
 try{
  const d=await pgLoadAuto();
  let n=d.records.length;
  PG=d.records.map(r=>({...r,n:n--}));
  PG_LOADED=true;
  enrichResultsWithApps();
  if($("#dashOpenAppBtn"))$("#dashOpenAppBtn").textContent=`View Applications (${PG.length})`;
 }catch(e){
  console.warn("Background PGTSE applications fetch:",e);
 }
}

function pgShell(extra,body){app.innerHTML=tabs("pg")+hd("PGTSE 2027 Applications",extra)+body;bindTabs();$("#lo").onclick=out}

async function pgtse(){
 pgShell("","<p>⏳ Loading PGTSE-2027 applications from Google Sheet…</p>");
 try{
  if(!PG_LOADED){
   const d=await pgLoadAuto();
   let n=d.records.length;
   PG=d.records.map(r=>({...r,n:n--}));
   PG_LOADED=true;
   enrichResultsWithApps();
  }
  pgView();
 }catch(err){
  pgShell("",`<div class="msg">Could not load the applications: ${esc(err.message||err)}</div><p><button class="btn b3" id="rt">Try again</button></p>`);
  $("#rt").onclick=()=>{PG_LOADED=false;pgtse()};
 }
}

const pgFilter=()=>{
 const q=($("#pgq")?.value||"").trim().toLowerCase();
 const sch=($("#pgsch")?.value||"").trim().toUpperCase();
 return PG.filter(r=>{
  if(sch&&String(r.schoolName||"").trim().toUpperCase()!==sch)return false;
  if(q&&!Object.values(r).some(v=>String(v??"").toLowerCase().includes(q)))return false;
  return true;
 });
};

function pgView(){
 const schools=[...new Set(PG.map(r=>String(r.schoolName||"").trim().toUpperCase()).filter(Boolean))].sort();
 pgShell(`<button class="btn b4 sm" id="pgr">🔄 Refresh</button><button class="btn b4 sm" id="pgx">📥 Export CSV</button><button class="btn b3 sm" id="pgp">🖨️ Print</button>`,
 `<div class="tools pgt">
   <input id="pgq" placeholder="🔍 Search name, father, SATS, mobile, school, application no…">
   <select id="pgsch"><option value="">All Schools (${schools.length})</option>${schools.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join("")}</select>
  </div><p id="pgc"></p><div class="scroll" id="pgb"></div>`);
 $("#pgr").onclick=()=>{PG_LOADED=false;pgtse()};$("#pgx").onclick=pgCsv;$("#pgp").onclick=pgPrint;
 $("#pgq").oninput=pgRows;$("#pgsch").oninput=pgRows;
 pgRows();
}

function pgRows(){
 const r=pgFilter();
 $("#pgc").innerHTML=`<b>${r.length}</b> of <b>${PG.length}</b> application(s) · newest first`;
 $("#pgb").innerHTML=PG.length?`<table><tr><th>#</th><th>Application no.</th><th>Submitted</th><th>Student</th><th>Father</th><th>DOB</th><th>SATS no.</th><th>Mobile</th><th>School</th><th>Address</th></tr>
 ${r.map(x=>`<tr><td>${x.n}</td><td>${esc(x.appId)}</td><td>${esc(x.submittedAt)}</td><td><b>${esc(x.studentName)}</b></td><td>${esc(x.fatherName)}</td><td>${esc(x.dob)}</td><td><b>${esc(x.satsNumber)}</b></td><td>${esc(x.mobile)}</td><td>${esc(x.schoolName)}</td><td>${esc(x.address)}</td></tr>`).join("")}</table>`:"<p>No applications have been submitted yet.</p>";
}

function pgCsv(){
 const safe=v=>{v=String(v??"");return/^[=+\-@\t\r]/.test(v)?"'"+v:v},txt=v=>v?`="${String(v).replace(/"/g,'""')}"`:"",q=v=>`"${safe(v).replace(/"/g,'""')}"`;
 const rows=[...pgFilter()].reverse().map(r=>[r.n,q(r.appId),q(r.submittedAt),q(r.studentName),q(r.fatherName),txt(r.dob),txt(r.satsNumber),txt(r.mobile),q(r.schoolName),q(r.address)].join(","));
 const csv="\ufeff"+["Sl No,Application ID,Submitted,Student Name,Father Name,Date of Birth,SATS Number,Contact Number,School Name,Address",...rows].join("\r\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="PGTSE_2027_Applications.csv";document.body.appendChild(a);a.click();a.remove();
}

function pgPrint(){
 const r=pgFilter(),w=open("","_blank");if(!w)return;
 w.document.write(`<!doctype html><title>PGTSE 2027 Applications</title><style>@page{size:A4 landscape;margin:10mm}body{font:12px Arial,sans-serif}h2{margin:0 0 6px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #444;padding:4px 6px;text-align:left;vertical-align:top}th{background:#e6e9f2}</style>
 <h2>Pragathi P.U. College, Gurumatkal — PGTSE 2027 Applications (${r.length})</h2><table><tr><th>#</th><th>Application no.</th><th>Student</th><th>Father</th><th>DOB</th><th>SATS no.</th><th>Mobile</th><th>School</th><th>Address</th></tr>
 ${[...r].reverse().map(x=>`<tr><td>${x.n}</td><td>${esc(x.appId)}</td><td>${esc(x.studentName)}</td><td>${esc(x.fatherName)}</td><td>${esc(x.dob)}</td><td>${esc(x.satsNumber)}</td><td>${esc(x.mobile)}</td><td>${esc(x.schoolName)}</td><td>${esc(x.address)}</td></tr>`).join("")}</table>`);
 w.document.close();w.focus();setTimeout(()=>w.print(),300);
}

/* =========================================================================
   6. ONLINE EXAM INVIGILATOR MODULE (EMBEDDED + FULL-SCREEN OPTION)
   ========================================================================= */
function onlineExamView(){
 app.innerHTML=tabs("oexam")+hd("Online Exam — Invigilator Module",`<a class="btn b3 sm" href="online-exam-admin.html" target="_blank" rel="noopener">↗ Open Full Screen</a> <a class="btn b4 sm" href="online-exam.html" target="_blank" rel="noopener">📝 Student Exam Link</a>`)+`
 <div style="background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06)">
  <iframe src="online-exam-admin.html?embed=1" title="Online Exam Invigilator Module" style="width:100%;height:88vh;min-height:780px;border:none;display:block"></iframe>
 </div>`;
 bindTabs();
 $("#lo").onclick=out;
}

restore().then(ok=>ok?start():gate());
