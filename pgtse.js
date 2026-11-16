/* PGTSE-2027 public application form -> Google Sheet (Apps Script) */
(()=>{
const URL_=C.pgtse,F=$("#pf"),ST=$("#st"),SB=$("#sb");
const IDS=["studentName","fatherName","dob","satsNumber","mobile","schoolName","address"];
let pendingId=null,busy=false;
$("#dob").max=new Date().toISOString().slice(0,10);

const note=(html,cls)=>{ST.innerHTML=html?`<div class="${cls||"msg"}">${html}</div>`:""};
const bad=(el,m)=>{el.classList.toggle("bad",!!m);const e=el.parentElement.querySelector(".err");if(e)e.textContent=m||""};
function validate(){let ok=true,first=null;
 for(const id of IDS){const el=$("#"+id);if(!el.value.trim()){bad(el,"This field is required.");ok=false;first=first||el}else bad(el,"")}
 const m=$("#mobile");if(m.value.trim()&&!/^[6-9]\d{9}$/.test(m.value.trim())){bad(m,"Enter a valid 10-digit mobile number.");ok=false;first=first||m}
 if(first)first.focus();return ok}
F.addEventListener("input",e=>{if(e.target.matches("input,textarea"))bad(e.target,"")});
$("#mobile").addEventListener("input",e=>e.target.value=e.target.value.replace(/\D/g,""));

const fmtDob=v=>{const p=String(v||"").split("-");return p.length===3&&p[0].length===4?`${p[2]}-${p[1]}-${p[0]}`:v};
const now=()=>new Date().toLocaleString("en-IN",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true});
const newId=()=>"PGTSE-2027-"+Math.floor(100000+Math.random()*900000);

function jsonp(url,ms=6000){return new Promise((res,rej)=>{const cb="pgp_"+Date.now()+Math.floor(Math.random()*1e4),s=document.createElement("script"),t=setTimeout(()=>{end();rej(new Error("timeout"))},ms);
 function end(){clearTimeout(t);delete window[cb];s.remove()}window[cb]=d=>{end();res(d)};s.onerror=()=>{end();rej(new Error("blocked"))};
 s.src=`${url}${url.includes("?")?"&":"?"}callback=${cb}&_t=${Date.now()}`;document.body.appendChild(s)})}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* Returns the saved Application ID, or null when the Sheet did not confirm it. */
async function save(rec){
 const body=JSON.stringify(rec);
 try{ // 1) normal request, readable answer
  const ac=new AbortController(),t=setTimeout(()=>ac.abort(),25000);
  const r=await fetch(URL_,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body,signal:ac.signal});clearTimeout(t);
  const d=await r.json();if(d&&d.status==="success")return d.appId||rec.appId;
  console.error("PGTSE save refused:",d);return null;
 }catch(e1){
  console.warn("PGTSE direct save failed, trying fallback:",e1);
  try{await fetch(URL_,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body})}catch(e2){}
  for(let i=0;i<2;i++){ // 2) ask the Sheet whether the row arrived
   await wait(1500);
   try{const d=await jsonp(`${URL_}?action=check&id=${encodeURIComponent(rec.appId)}`);if(d&&d.exists)return rec.appId}catch(e3){}
  }
  return null}
}

function showSlip(r){
 const set=(id,v)=>$("#"+id).textContent=v||"";
 set("s-id",r.appId);set("s-dt",r.submittedAt);set("s-name",r.studentName);set("s-father",r.fatherName);set("s-dob",r.dob);
 set("s-sats",r.satsNumber);set("s-mob",r.mobile);set("s-school",r.schoolName);set("s-addr",r.address);
 $("#formsec").hidden=true;$("#slipwrap").hidden=false;window.scrollTo({top:0})}

F.addEventListener("submit",async e=>{e.preventDefault();if(busy)return;note("");
 if(!validate()){note("Please fill all required fields correctly.");return}
 busy=true;SB.disabled=true;SB.textContent="Saving…";
 pendingId=pendingId||newId();
 const rec={appId:pendingId,submittedAt:now(),studentName:$("#studentName").value.trim(),fatherName:$("#fatherName").value.trim(),dob:fmtDob($("#dob").value),
  satsNumber:$("#satsNumber").value.trim(),mobile:$("#mobile").value.trim(),schoolName:$("#schoolName").value.trim(),address:$("#address").value.trim()};
 const id=await save(rec);
 busy=false;SB.disabled=false;SB.textContent="Submit Application";
 if(!id){note("Your application could <b>not</b> be confirmed as saved. Please check your internet connection and press <b>Submit Application</b> again (your details are still here and nothing will be duplicated). If it keeps failing, call the college office.");return}
 rec.appId=id;pendingId=null;showSlip(rec);F.reset()});

$("#cl").onclick=()=>{F.reset();IDS.forEach(i=>bad($("#"+i),""));note("");pendingId=null};
$("#pr").onclick=()=>print();
$("#again").onclick=()=>{$("#slipwrap").hidden=true;$("#formsec").hidden=false;note("");window.scrollTo({top:0})};
})();
