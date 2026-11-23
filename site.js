const C={name:"Pragathi P.U. College",kn:"ಪ್ರಗತಿ ಪದವಿ ಪೂರ್ವ ಕಾಲೇಜು",soc:"Deccan Education Society (R.)",socKn:"ಡೆಕ್ಕನ್ ಶಿಕ್ಷಣ ಸಂಸ್ಥೆ (ರಿ.)",
phones:[["+91 98864 35014","919886435014"],["+91 98458 33574","919845833574"],["+91 99024 32498","919902432498"],["+91 90360 88843","919036088843"]],
email:"pragathipugkl434@gmail.com",pgtse:"https://script.google.com/macros/s/AKfycbzblNXU5L-h3tojP7Wb8rxMUnI0BCKq23XCBcVAgjZl0MtZpFoQmzUDhfmsegY0F9jTzw/exec",pgtseResult:"https://script.google.com/macros/s/AKfycbzXedUOZjoAt0qqRR9mrdUSU65NAUY9ajzsE2ZVfAT9VUsJLgP5On3nSWZBjuevxd0E/exec",onlineExam:"https://script.google.com/macros/s/AKfycbxpc6cTq78vPJ37zL05SMysrn4B6bnAPzxfOoz6iOTYV9muJWmZOqTd1qCUTEnaWAO0/exec",ig:"https://www.instagram.com/pragathi_pu_college_gkl/",fb:"https://www.facebook.com/PragathiPUCollegeGurumatkal",
maps:"https://www.google.com/maps/search/?api=1&query=Near+Yashodha+Petroleums+Hyderabad+Road+Gurumatkal+585214",
map:"https://www.openstreetmap.org/export/embed.html?bbox=77.355%2C16.845%2C77.425%2C16.895&layer=mapnik&marker=16.8678%2C77.3909"};
const FAC=[["Chemistry",[["Mr. R. Shivkumar Reddy","Principal · Lecturer in Chemistry","M.Sc, B.Ed"],["Miss Ambika Arsid","Lecturer in Chemistry","M.Sc, B.Ed"]]],
["Mathematics",[["Mr. Mahesh K. Dhore","Lecturer in Mathematics","M.Sc, B.Ed"],["Mr. Gopala Reddy","Lecturer in Mathematics","M.Sc, B.Ed"]]],
["Biology",[["Mr. Lakshman Dodla","Lecturer in Biology","M.Sc, B.Ed, K-SET"],["Mr. Akash Rathod","Lecturer in Biology","M.Sc, B.Ed, K-SET"]]],
["Physics",[["Mr. Abhilash T.","Lecturer in Physics","M.Sc, B.Ed"],["Mr. Pradeep C.","Lecturer in Physics","MSc, B.Ed"]]],
["Hindi",[["Mr. Balagopal","Lecturer in Hindi","M.A, B.Ed"]]],["Kannada",[["Mr. Shamappa","Lecturer in Kannada","M.A, B.Ed, K-SET"]]],
["English",[["Miss Madiha Taskeen","Lecturer in English","M.A, B.Ed"]]],["Urdu",[["Mrs. Farhana Kousar","Lecturer in Urdu","M.A, B.Ed"]]]];
const RES=[{id:"2026",t:"II PUC Science · 2025–26",img:"media/results-2026.jpg",s:[["Distinction","19"],["First class","48"],["Second class","11"]],
lead:"Arpita & Priyanka — Taluka 1st rank, 575 / 600 (95.83%) each",top:[["Ummul Khair Fatima","559 / 600 · 93.16%"],["Jahnavi","555 / 600 · 92.50%"],["Sneha S.","552 / 600 · 92.00%"],["T. Narayana","544 / 600 · 90.67%"],["Vinod","542 / 600 · 90.33%"],["Ayesha Fathima","539 / 600 · 89.83%"],["Rithika Neerati","536 / 600 · 89.33%"],["Madiha Afsheen","534 / 600 · 89.00%"],["Tasmiya Begum","533 / 600 · 88.83%"]]},
{id:"2025",t:"II PUC Science · 2024–25",img:"media/results-2025.jpg",s:[["Distinction","07"],["First class","39"],["Second class","06"]],
lead:"Aditya Shettymath — Taluka 1st rank, 567 / 600 (94.50%) · Biology 99, Maths 97, Physics 96, Chemistry 94",top:[["Khadija Zainab","557 / 600 · 92.83% · Taluka 2nd rank"],["Monika","541 / 600 · 90.17%"],["Manogna","533 / 600 · 88.83%"],["Vaishnavi","527 / 600 · 87.67%"],["Mukunda","516 / 600 · 86.00%"],["Yogeshwari","512 / 600 · 85.33%"],["Lavanya","499 / 600 · 83.17%"],["Radhika","499 / 600 · 83.17%"],["Jagadeesh","497 / 600 · 82.83%"]]},
{id:"2024",t:"II PUC Science · 2023–24",img:"media/results-2024.jpg",s:[["Distinction","07"],["First class","09"],["Second class","03"]],
lead:"Nirmala — College 1st rank (1st batch), 570 / 600 (95.00%) · Biology 100 / 100",top:[["Basappa","556 / 600 · 92.66%"],["Akshatha","543 / 600 · 90.50%"],["Rishika A.","526 / 600 · 87.66%"],["Ajay Kumar","520 / 600 · 86.66%"],["Shanta","520 / 600 · 86.66%"],["Savitramma","517 / 600 · 86.16%"]]}];
const $=(s,r=document)=>r.querySelector(s),pg=document.body.dataset.page||"home",H=pg==="home"?"":"index.html";
$("#hdr").innerHTML=`<div class="top"><div class="wrap"><span>📞 ${C.phones.map(p=>`<a href="tel:+${p[1]}">${p[0]}</a>`).join(" &nbsp;|&nbsp; ")}</span><span>✉ <a href="mailto:${C.email}">${C.email}</a> &nbsp; <a href="${C.fb}">Facebook</a> &nbsp; <a href="${C.ig}">Instagram</a></span></div></div>
<div class="brand"><div class="wrap"><img src="media/logo-deccan.png" alt="Deccan Education Society logo"><div class="t"><p class="soc">${C.socKn} · ${C.soc}</p><h1>PRAGATHI P.U. COLLEGE</h1><div class="kn">${C.kn}</div><div class="sub">Gurumatkal, Dist. Yadgir, Karnataka · College Code KY0434</div></div><img src="media/logo-pragathi.png" alt="Pragathi P.U. College logo"></div></div>
<nav><div class="wrap"><button id="burger" aria-label="Menu" aria-expanded="false">☰</button><ul id="menu">
<li><a href="${H||"index.html"}#top" class="${pg==="home"?"on":""}">Home</a></li><li><a href="${H}#information">Information</a></li><li><a href="${H}#faculty">Faculty</a></li><li><a href="${H}#results">Results</a></li><li><a href="${H}#admission">Admission</a></li><li class="pgn sub"><a href="pgtse-2027.html" class="${pg==="pgtse"?"on":""}">PGTSE 2027 ▾</a><ul class="dd"><li><a href="pgtse-2027.html">Apply Online</a></li><li><a href="pgtse-result.html">Result</a></li></ul></li><li class="exm"><a href="online-exam.html" class="${pg==="exam"?"on":""}">📝 Online Exam</a></li>
<li><a href="study-material.html" class="${pg==="study"?"on":""}">Study Material</a></li><li><a href="${H}#contact">Contact</a></li><li class="login"><a href="college-login.html">College Login</a></li></ul></div></nav>`;
$("#ftr").innerHTML=`<footer><div class="wrap"><div><h4>${C.name}, Gurumatkal</h4><p>${C.soc}<br>Near Yashodha Petroleums, Hyderabad Road, Gurumatkal, Dist. Yadgir, Karnataka — 585214</p><p><a href="${C.maps}">Open in Google Maps</a></p></div>
<div><h4>Quick links</h4><a href="index.html#information">Information</a><br><a href="index.html#results">Results</a><br><a href="index.html#admission">Admission enquiry</a><br><a href="pgtse-2027.html">PGTSE 2027 (Class X)</a><br><a href="pgtse-result.html">PGTSE 2027 Result</a><br><a href="online-exam.html">Online Exam Portal</a><br><a href="study-material.html">Study Material</a><br><a href="media/pragathi-pamphlet-2025-26.pdf">Pamphlet (PDF)</a></div>
<div><h4>Call the office</h4>${C.phones.map(p=>`<a href="tel:+${p[1]}">${p[0]}</a>`).join("<br>")}</div></div><div class="copy">© ${new Date().getFullYear()} ${C.name}, Gurumatkal · ${C.soc}</div></footer>`;
$("#burger").onclick=e=>{const o=$("#menu").classList.toggle("open");e.target.setAttribute("aria-expanded",o)};
$("#menu").onclick=e=>{if(e.target.tagName==="A")$("#menu").classList.remove("open")};
if(pg==="home"){
 $("#fac").innerHTML=FAC.map(([s,p])=>`<div class="fac"><h3>${s}</h3>${p.map(x=>`<div class="p"><b>${x[0]}</b><small>${x[1]}<br>${x[2]}</small></div>`).join("")}</div>`).join("");
 const show=id=>{const r=RES.find(x=>x.id===id);$("#rtabs").innerHTML=RES.map(x=>`<button class="${x.id===id?"on":""}" data-i="${x.id}">${x.id==="2026"?"2025–26":x.id==="2025"?"2024–25":"2023–24"}</button>`).join("");
 $("#rbody").innerHTML=`<h3>${r.t}</h3><div class="stats">${r.s.map(s=>`<div><b>${s[1]}</b>${s[0]}</div>`).join("")}</div><div class="lead"><b>Rank holder:</b> ${r.lead}</div>
 <div class="two"><div class="scroll"><table><tr><th>Student</th><th>Marks</th></tr>${r.top.map(t=>`<tr><td>${t[0]}</td><td>${t[1]}</td></tr>`).join("")}</table></div><a href="${r.img}" target="_blank" rel="noopener"><img class="zoom" src="${r.img}" alt="Results extract ${r.t}" loading="lazy"></a></div>`};
 $("#rtabs").onclick=e=>{if(e.target.dataset.i)show(e.target.dataset.i)};show("2026");
 $("#enq").onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
  const t=["Admission enquiry — Pragathi P.U. College, Gurumatkal",`Student: ${f.student}`,`Seeking: ${f.prog}`,`Parent / guardian: ${f.parent}`,`Mobile: ${f.phone}`,f.school&&`Previous school: ${f.school}`,f.msg&&`Message: ${f.msg}`].filter(Boolean).join("\n");
  window.open(`https://wa.me/${C.phones[0][1]}?text=${encodeURIComponent(t)}`,"_blank")};
 $("#mapf").src=C.map;$("#mapl").href=C.maps;
}
