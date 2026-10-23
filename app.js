
const SEED=window.__SEED;
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
let D=JSON.parse(JSON.stringify(SEED));
function merge(o){if(!o)return;
 ["docs","groups"].forEach(k=>{if(o[k])Object.assign(D[k],o[k])});
 ["maps","judgments","offices","courts"].forEach(k=>{if(Array.isArray(o[k]))D[k]=o[k]});
 if(Array.isArray(o.intl))o.intl.forEach(c=>{const i=D.intl.findIndex(x=>x.id===c.id);if(i>=0)D.intl[i]=c;else D.intl.push(c)});}
merge(store.get("nia-data-v2"));
const BACKEND=()=>String(store.get("nia-server")||(SEED.meta&&SEED.meta.backend)||"").trim();
const SERVER=()=>!!BACKEND();
let CASES=SERVER()?[]:(store.get("nia-cases-v2")||SEED.cases);
let SES=null,SNAP={},SYNCING=false;
try{SES=JSON.parse(sessionStorage.getItem("nia-ses")||"null")}catch(e){SES=null}
const ssave=()=>{try{SES?sessionStorage.setItem("nia-ses",JSON.stringify(SES)):sessionStorage.removeItem("nia-ses")}catch(e){}};
const snapAll=()=>{SNAP={};CASES.forEach(c=>SNAP[c.id]=JSON.stringify(c))};
async function api(a,p){const r=await fetch(BACKEND(),{method:"POST",body:JSON.stringify(Object.assign({a,t:SES&&SES.token},p||{}))});
 let j;try{j=await r.json()}catch(e){throw new Error("The officer server did not answer. Check the server address and your network.")}
 if(!j.ok){if(j.err==="auth"&&SES){signOutLocal();throw new Error("Your session has ended. Sign in again.")}throw new Error(j.err||"Request failed")}return j}
function signOutLocal(){SES=null;ssave();CASES=[];SNAP={};clearTimeout(IDLE);try{route()}catch(e){}}
let IDLE=null;
function idleArm(){clearTimeout(IDLE);if(SES)IDLE=setTimeout(()=>{if(SES){api("logout").catch(()=>{});signOutLocal();alert("You were signed out after 15 minutes of inactivity.")}},15*60*1000)}
["click","keydown","touchstart"].forEach(ev=>document.addEventListener(ev,()=>{if(SES)idleArm()},true));
async function loadCases(){const r=await api("listCases");CASES=r.cases||[];snapAll()}
const isAdmin=()=>!!(SES&&SES.user&&SES.user.role==="admin");
function myOffices(){if(!SERVER())return D.offices.map(o=>o.id);if(!SES)return[];const u=SES.user;if(u.role==="admin")return D.offices.map(o=>o.id);
 const ok=!u.until||today()<=u.until;return[u.office].concat(ok?String(u.extra||"").split(",").map(x=>x.trim()):[]).filter(Boolean)}
const canOffice=id=>myOffices().includes(id);
const saveCases=()=>{if(!SERVER())return store.set("nia-cases-v2",CASES);syncCases();return true};
async function syncCases(){if(SYNCING){setTimeout(syncCases,400);return}SYNCING=true;
 try{const ids=new Set(CASES.map(c=>c.id));
  for(const c of CASES){const j=JSON.stringify(c);if(SNAP[c.id]!==j){const r=await api("saveCase",{case:c,baseRev:c.rev||0});c.rev=r.rev;SNAP[c.id]=JSON.stringify(c)}}
  for(const id of Object.keys(SNAP)){if(!ids.has(id)){await api("deleteCase",{id});delete SNAP[id]}}}
 catch(e){alert("Not saved: "+e.message);try{await loadCases()}catch(x){}try{route()}catch(x){}}
 finally{SYNCING=false}}
const STAGES=["Registered","Under investigation","Chargesheet filed","Trial","Judgment reserved","Appeal pending","Convicted","Acquitted","Closed"];
const stageCls=s=>["Registered","Under investigation","Chargesheet filed"].includes(s)?"s-early":["Trial","Judgment reserved","Appeal pending"].includes(s)?"s-trial":"s-done";
const PH='[Sample placeholder. Load the official text of this section using "Load data".]';
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const enc=encodeURIComponent, dec=decodeURIComponent;
const fmtD=d=>{if(!d)return"";const x=new Date(d+"T00:00:00");return isNaN(x)?d:x.toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})};
const today=()=>new Date().toISOString().slice(0,10);
const main=$("main"),pager=$("pager");let Q="";
const row=(href,no,title,sub,extra="")=>`<li><a class="row" href="#/${href}">${no!==""&&no!=null?`<span class="no">${esc(no)}</span>`:""}<span class="h">${esc(title)}${extra}${sub?`<span class="sub">${esc(sub)}</span>`:""}</span><span class="chev">&#8250;</span></a></li>`;
const empty=t=>`<div class="empty">${t}</div>`;
const kv=a=>`<div class="kv">${a.filter(x=>x[1]).map(x=>`<div><b>${esc(x[0])}</b><span>${x[2]?x[1]:esc(x[1])}</span></div>`).join("")}</div>`;
const chip=s=>`<span class="chip ${stageCls(s)}">${esc(s)}</span>`;
function head(t,c,tab,back){$("title").textContent=t;$("crumbs").textContent=c||"";$("back").style.display=back?"block":"none";pager.hidden=true;
 document.querySelectorAll("#tabs a").forEach(a=>a.classList.toggle("on",a.dataset.t===tab));document.title=t+" | NIA Law Reader"}
$("back").onclick=()=>{if(STACK.length){CUR=STACK.pop();try{history.replaceState(null,"","#/"+CUR)}catch(e){}route()}else go("resources")};
const searchBox=ph=>`<input class="search" id="gs" type="search" placeholder="${esc(ph)}" aria-label="${esc(ph)}">`;
function wireSearch(){const g=$("gs");if(g)g.onkeydown=e=>{if(e.key==="Enter"&&g.value.trim())L.hash="#/search/"+enc(g.value.trim())}}
function filterBox(ph,render){main.insertAdjacentHTML("beforeend",`<input class="search" id="q" type="search" placeholder="${esc(ph)}" value="${esc(Q)}" aria-label="${esc(ph)}"><div id="res"></div>`);
 $("q").oninput=e=>{Q=e.target.value;render()};render()}

/* ---------- router ---------- */
const R=[];const on=(re,fn)=>R.push([re,fn]);
function route(){Q="";try{window.scrollTo(0,0)}catch(e){}const h=CUR;
 for(const[re,fn]of R){const m=h.match(re);if(m){fn(...m.slice(1).map(x=>x===undefined?x:dec(x)));return}}
 L.hash="#/resources"}
let CUR=(location.hash||"").replace(/^#\/?/,"")||"resources",STACK=[];
function go(h){h=String(h).replace(/^#\/?/,"");if(h!==CUR){STACK.push(CUR);CUR=h;try{history.pushState(null,"","#/"+h)}catch(e){}}route()}
const L={set hash(v){go(v)}};
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest('a[href^="#/"]');if(a){e.preventDefault();go(a.getAttribute("href"))}});
window.addEventListener("hashchange",()=>{const h=(location.hash||"").replace(/^#\/?/,"");if(h&&h!==CUR){CUR=h;route()}});

/* ---------- ACTS ---------- */
on(/^(?:acts|resources)$/,()=>{head("NIA Law Reader","Acts, rules, SOPs, judgements and international law","resources",false);
 const n=D.docs.nia;
 const dl=(ids)=>ids.map(i=>D.docs[i]).filter(Boolean).map(d=>row("doc/"+enc(d.id),d.year||"",d.title.replace(/^The\s+/,""),d.sections.length+" sections")).join("");
 const dd=(t,sub,body,open)=>`<details class="dd"${open?" open":""}><summary><span class="t">${t}</span><span class="s">${sub}</span></summary>${body}</details>`;
 main.innerHTML=searchBox("Search sections, judgements, cases (press Enter)")+
 dd("NIA Act",esc(n.title)+" | "+n.sections.length+" sections",`<ul class="list">${n.sections.map(x=>row("doc/nia/"+enc(x.no),x.no,x.heading,"")).join("")}</ul>`)+
 dd("Scheduled Acts",D.groups.sched.length+" Acts in the Schedule to the NIA Act",`<ul class="list">${dl(D.groups.sched)}</ul>`)+
 dd("New criminal laws","BNS, BNSS and BSA",`<ul class="list">${dl(D.groups.proc)}</ul>`)+
 ((D.groups.other||[]).length?dd("Other Acts","Related laws, starting with the Digital Personal Data Protection Act, 2023",`<ul class="list">${dl(D.groups.other)}</ul>`):"")+
 dd("Rules",D.groups.rules.length+" rules and orders under the UA(P) Act",`<ul class="list">${dl(D.groups.rules)}</ul>`)+
 dd("SOPs","Standard operating procedures, starting with the FICN investigation SOP",`<ul class="list">${dl(D.groups.sops)}</ul>`)+
 dd("Comparison","Old and new provisions",`<ul class="list">${row("maps","","IPC to BNS table (full)",D.maps.length+" entries, searchable")}${row("maps","","CrPC to BNSS and Evidence Act to BSA","Selected provisions")}</ul>`)+
 `<div class="grid" style="margin-top:12px">
 <a class="tile" href="#/judg"><div class="t">Judgements</div><div class="s">${D.judgments.length} NIA case and terror-related judgements</div></a>
 <a class="tile alt" href="#/intl"><div class="t">International law</div><div class="s">MLATs, extradition treaties, UA(P) Act Second Schedule conventions, UN resolutions</div></a>
 <a class="tile" href="#/tip"><div class="t">Report a tip</div><div class="s">Share information on terrorist activity or fake currency (FICN) smuggling with the NIA</div></a></div><div style="height:8px"></div>`;
 wireSearch()});
const LT={sched:["Scheduled Acts","resources"],proc:["New criminal laws","resources"],rules:["Rules","resources"],sops:["SOPs","resources"]};
on(/^tip$/,()=>{head("Report a tip","Public terror reporting","resources",true);
 main.innerHTML=`<p class="notice">This app does not collect or send tips. Tips go only through the NIA's own channels below, so they reach the Agency and nobody else.</p>`+
 `<div class="gh">What to report</div><p style="line-height:1.55">Any information about suspicious terrorist activity or a terrorist crime, a person involved in such activities, or networks smuggling fake Indian currency notes. Documents and photographs can be sent with the tip. The NIA states that the identity of the informer is kept confidential.</p>`+
 `<div class="gh">Official channels</div>`+kv([["Online form",'<a class="btn" target="_blank" rel="noopener" href="https://nia.mha.gov.in">Open the NIA website</a><br>Go to Share Input, then About Terror-Related Activities (Share Tip).',1],["Helpline",'<a href="tel:+918285100100">+91-8285100100</a> and <a href="tel:+919654447345">+91-9654447345</a>',1]])+
 `<div class="gh">Online form: what to have ready</div><ul class="list"><li><div class="row"><span class="h">Mobile number (required, an OTP is sent to it)</span></div></li><li><div class="row"><span class="h">The information or tip (required) and a category (required)</span></div></li><li><div class="row"><span class="h">Optional: name, address, country, email</span></div></li><li><div class="row"><span class="h">Optional files: JPG or PDF, 1 MB limit each</span></div></li><li><div class="row"><span class="h">A captcha code shown on the form</span></div></li></ul>`+
 `<p class="notice">Fields and limits are as shown on the NIA page when this was added. Check the live form. In an emergency, contact the local police or call 112.</p>`});
on(/^list\/(\w+)$/,g=>{const[t,tab]=LT[g]||["List","resources"];head(t,"Resources",tab,true);
 filterBox("Search by name or year",()=>{const q=Q.toLowerCase();
  const items=(D.groups[g]||[]).map(i=>D.docs[i]).filter(d=>d&&(!q||d.title.toLowerCase().includes(q)||String(d.year||"").includes(q)));
  $("res").innerHTML=items.length?`<ul class="list">${items.map(d=>row("doc/"+enc(d.id),d.sl!=null?"Sl. "+d.sl:"",d.title,d.sections.length?d.sections.length+" sections loaded":"Not loaded yet")).join("")}</ul>`:empty("Nothing matches.")});
 if(g==="rules")main.insertAdjacentHTML("beforeend",`<p class="notice">The serial numbers follow the NIA website list. Your screenshot began at Sl. 7, so Sl. 1 to 6 still need to be added through Data > Load data.</p>`)});
const tabOf=d=>d.kind==="rule"||d.kind==="sop"||d.kind==="treaty"?"resources":"resources";
on(/^doc\/([^/]+)$/,id=>{const d=D.docs[id];if(!d)return L.hash="#/resources";
 head(d.title,"Resources",tabOf(d),true);
 main.innerHTML=`<p class="intro">${esc(d.title)}${d.note?"<br>"+esc(d.note):""}</p>`;
 if(!d.sections.length){main.insertAdjacentHTML("beforeend",empty(d.empty||'No sections loaded for this one yet. Use Data > Load data to add them.'));return}
 filterBox("Search by number or heading",()=>{const q=Q.toLowerCase();let g="",h="";
  d.sections.filter(s=>!q||String(s.no).toLowerCase().includes(q)||s.heading.toLowerCase().includes(q)).forEach(s=>{
   if(s.group&&s.group!==g){if(h)h+="</ul>";h+=`<div class="gh">${esc(s.group)}</div><ul class="list">`;g=s.group}else if(!h)h='<ul class="list">';
   h+=row("doc/"+enc(id)+"/"+enc(s.no),s.no,s.heading,"",(s.amendments&&s.amendments.length?'<span class="badge">Amended</span>':""))});
  $("res").innerHTML=h?h+"</ul>":empty("No match.")})});
on(/^doc\/([^/]+)\/(.+)$/,(id,no)=>{const d=D.docs[id];if(!d)return;const i=d.sections.findIndex(s=>String(s.no)===no);if(i<0)return L.hash="#/doc/"+enc(id);
 const s=d.sections[i];head((d.short||d.title.replace(/^The\s+/,"").replace(/,\s*\d{4}.*$/,""))+" "+s.no,d.title,tabOf(d),true);
 const paras=String(s.text||"").split("\n").filter(x=>x.trim()).map(p=>{if(p.trim()===PH)return`<p><span class="ph">${esc(p)}</span></p>`;
  return`<p class="${/^(•|\(?[a-z0-9ivx]{1,3}\))/.test(p)?"b":""}">${esc(p)}</p>`}).join("");
 const am=s.amendments||[],mp=s.maps||[];
 main.innerHTML=`<div class="sec-no">${/^\d/.test(s.no)?"Section ":""}${esc(s.no)}</div><h2 class="sec-title">${esc(s.heading)}</h2><div class="body">${paras}</div>
 ${mp.length?`<section class="box newlaw"><h2>Old and new provisions</h2><ul>${mp.map(m=>`<li>${esc(m.old)} &rarr; <b>${esc(m.new)}</b></li>`).join("")}</ul></section>`:""}
 ${(s.cls&&s.cls.length)?`<section class="box newlaw"><h2>Classification (BNSS, First Schedule)</h2><ul>${s.cls.map(c=>`<li><b>${esc(c.ref)}</b> ${esc(c.offence)}<br>${esc(c.punishment)}<br>${esc(c.cog)} | ${esc(c.bail)} | ${esc(c.court)}</li>`).join("")}</ul></section>`:""}
 ${am.length?`<section class="box chg"><h2>Changes to this section</h2><ul>${am.map(a=>`<li><span class="yr">${esc(a.year)}</span> ${esc(a.by||"")}<br>${esc(a.note||"")}</li>`).join("")}</ul></section>`:`<div class="plain">No changes recorded for this section.</div>`}
 ${d.source?`<div class="plain">Source: ${esc(d.source)}</div>`:""}`;
 pager.hidden=false;const p=$("prev"),n=$("next");p.disabled=i===0;n.disabled=i===d.sections.length-1;
 p.onclick=()=>L.hash="#/doc/"+enc(id)+"/"+enc(d.sections[i-1].no);n.onclick=()=>L.hash="#/doc/"+enc(id)+"/"+enc(d.sections[i+1].no)});
on(/^maps$/,()=>{head("Old to new provisions","Resources","resources",true);
 main.innerHTML=`<p class="intro">Old provision on the left, new provision on the right. Type a section number (for example 302 or 103), a word, or IPC, BNS, CrPC, BNSS.</p>`;
 filterBox("Search section or topic",()=>{const q=Q.toLowerCase().replace(/\s+/g," ");
  const it=D.maps.filter(m=>!q||(m.old+" "+m.new+" "+(m.topic||"")).toLowerCase().replace(/s\.|ss\./g,"").replace(/\s+/g," ").includes(q)||(m.old+" "+m.new+" "+(m.topic||"")).toLowerCase().includes(q));
  $("res").innerHTML=it.length?`<ul class="list">${it.slice(0,150).map(m=>`<li><div class="row"><span class="h">${esc(m.old)} &rarr; ${m.link?`<a href="#/doc/${m.link}"><b><u>${esc(m.new)}</u></b></a>`:`<b>${esc(m.new)}</b>`}<span class="sub">${esc(m.topic||"")}${m.flag?" ("+esc(m.flag)+")":""}${m.verify?" (verify against the official correlation table)":""}</span></span></div></li>`).join("")}</ul>${it.length>150?`<p class="notice">Showing 150 of ${it.length}. Type more to narrow.</p>`:""}`:empty("No match.")})});

/* ---------- RESOURCES ---------- */
const OUT={favour:["In favour of NIA","ok"],partial:["Partly in favour of NIA","warn"],against:["Against NIA","bad"],plea:["Plea of guilty","info"]};
const obadge=j=>j.outcome&&OUT[j.outcome]?`<span class="badge ob ${OUT[j.outcome][1]}">${OUT[j.outcome][0]}</span>`:"";
on(/^judg(?:\/(\w+))?$/,c=>{c=c||"all";head("Judgements","Resources","resources",true);
 const tabs=[["all","All"],["favour","In favour of NIA"],["partial","Partly in favour"],["against","Against NIA"],["plea","Plea of guilty"],["terror","Other terror-related"]];
 main.innerHTML=`<div class="seg">${tabs.map(t=>`<a href="#/judg/${t[0]}" class="${t[0]===c?"on":""}">${t[1]}</a>`).join("")}</div>`;
 filterBox("Search title, case number or topic",()=>{const q=Q.toLowerCase();
  const it=D.judgments.filter(j=>(c==="all"||j.outcome===c||(c==="terror"&&!j.outcome))&&(!q||(j.title+" "+(j.topic||"")+" "+(j.case||"")+" "+(j.summary||"")).toLowerCase().includes(q)));
  $("res").innerHTML=it.length?`<ul class="list">${it.map(j=>row("j/"+enc(j.id),"",j.title,j.court+", "+j.year+(j.topic?" | "+j.topic:""),obadge(j)||(j.verified?"":'<span class="badge">Verify</span>'))).join("")}</ul>`:empty("No judgements here yet.")});
 main.insertAdjacentHTML("beforeend",`<p class="notice">Summaries are drafted from the judgement texts for quick reference and are not a substitute for the full judgement. Entries marked "Verify" are listed from general knowledge. Check the citation and holding in the official report before relying on them.</p>`)});
on(/^j\/(.+)$/,id=>{const j=D.judgments.find(x=>x.id===id);if(!j)return;head(j.title,"Judgements","resources",true);
 const lk=j.link?`<a href="${esc(j.link)}" target="_blank" rel="noopener">Open full judgement</a>`:(j.file?`Link not added yet. Original file: ${esc(j.file)}`:"");
 main.innerHTML=(j.outcome?`<div class="remark ${OUT[j.outcome]?OUT[j.outcome][1]:""}"><b>${OUT[j.outcome]?OUT[j.outcome][0]:""}</b><div>${esc(j.remark||"")}</div></div>`:"")+
 kv([["Case",j.case||""],["Court",j.court],["Year",String(j.year)],["Date",j.date||""],["Citation",j.citation||""],["Topic",j.topic||""],["Full judgement",lk,1],["Source",j.source||""]])+
 (j.summary?`<div class="body"><h3>Summary</h3><p>${esc(j.summary)}</p></div>`:`<div class="empty">No summary added yet.</div>`)+
 (j.verified===false?`<p class="notice">Not yet verified against the official report.</p>`:"")});
on(/^intl$/,()=>{head("International law","Resources","resources",true);
 main.innerHTML=`<ul class="list">${D.intl.map(c=>row("intl/"+enc(c.id),"",c.title,c.items.length?c.items.length+" listed":"None loaded yet")).join("")}</ul>`});
on(/^intl\/(\w+)$/,cid=>{const c=D.intl.find(x=>x.id===cid);if(!c)return;head(c.title,"International law","resources",true);
 main.innerHTML=`<p class="intro">${esc(c.desc||"")}</p>`;
 if(!c.items.length){main.insertAdjacentHTML("beforeend",empty("Nothing loaded yet. The NIA website could not be read automatically, so add this list through Data > Load data. Each item needs a title and can have country, date, status and link."));return}
 filterBox("Search",()=>{const q=Q.toLowerCase();const it=c.items.filter(x=>!q||JSON.stringify(x).toLowerCase().includes(q));
  $("res").innerHTML=`<ul class="list">${it.map(x=>row(x.doc&&D.docs[x.doc]?"doc/"+enc(x.doc):"intl/"+enc(cid)+"/"+enc(x.id),"",x.title,[x.country,x.date].filter(Boolean).join(" | "))).join("")}</ul>`})});
on(/^intl\/(\w+)\/(.+)$/,(cid,iid)=>{const c=D.intl.find(x=>x.id===cid),x=c&&c.items.find(i=>i.id===iid);if(!x)return;head(x.title,c.title,"resources",true);
 main.innerHTML=kv([["Country",x.country||""],["Date",x.date||""],["Status",x.status||""],["Note",x.note||""],["Link",x.link?`<a href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.link)}</a>`:"",1]])+(x.verified===false?`<p class="notice">Listed from general knowledge. Check against the NIA page or the treaty text.</p>`:"")});

/* ---------- SEARCH ---------- */
on(/^search\/(.+)$/,q=>{head("Search",'"'+q+'"',"resources",true);const t=q.toLowerCase(),out=[];
 Object.values(D.docs).forEach(d=>d.sections.forEach(s=>{if((s.heading+" "+s.text+" "+s.no).toLowerCase().includes(t))out.push(row("doc/"+enc(d.id)+"/"+enc(s.no),s.no,s.heading,d.title))}));
 D.judgments.forEach(j=>{if((j.title+" "+(j.topic||"")).toLowerCase().includes(t))out.push(row("j/"+enc(j.id),"",j.title,"Judgement"))});
 CASES.forEach(c=>{if((c.id+" "+c.title+" "+(c.sections||"")).toLowerCase().includes(t))out.push(row("case/"+enc(c.id),"",c.id+" "+c.title,"Case"))});
 main.innerHTML=out.length?`<ul class="list">${out.slice(0,80).join("")}</ul>`:empty("No results.")});

/* ---------- OFFICES ---------- */
const casesOf=f=>CASES.filter(f);
function authCard(){
 if(!SERVER())return"";
 if(!SES)return`<div class="box"><h2>Officer sign-in</h2><p class="soft">Cases are visible only to signed-in NIA officers. Use the ID issued to you.</p>
  <label>Officer ID</label><input type="text" id="lg_i" autocomplete="username" autocapitalize="characters"><label>PIN</label><input type="password" id="lg_p" autocomplete="current-password">
  <div class="btnrow" style="margin-top:10px"><button class="btn primary" id="lg_b">Sign in</button></div><div class="msg" id="lg_m"></div></div>`;
 const u=SES.user,offs=myOffices().map(i=>{const o=D.offices.find(x=>x.id===i);return o?o.city:i});
 return`<div class="box"><h2>Signed in</h2><p><b>${esc(u.name||u.id)}</b> (${esc(u.id)}) ${u.role==="admin"?"| Administrator":""}</p>
  <p class="soft">${u.role==="admin"?"Access: all offices":"Access: "+esc(offs.join(", ")||"none assigned")}</p>
  <div class="btnrow"><button class="btn" id="cp_b">Change PIN</button>${u.role==="admin"?'<button class="btn primary" id="ad_b">Manage officers</button>':""}<button class="btn" id="so_b">Sign out</button></div></div>`}
function wireAuth(){
 const lb=$("lg_b");if(lb){const go2=async()=>{const m=$("lg_m");m.className="msg";m.textContent="Signing in...";
   try{const j=await api("login",{id:$("lg_i").value,pin:$("lg_p").value});SES={token:j.token,user:j.user};ssave();await loadCases();idleArm();if(j.user.mustChange)pinForm(true);else route()}
   catch(e){m.className="msg err";m.textContent=e.message}};lb.onclick=go2;$("lg_p").onkeydown=e=>{if(e.key==="Enter")go2()}}
 const so=$("so_b");if(so)so.onclick=()=>{api("logout").catch(()=>{});signOutLocal()};
 const cp=$("cp_b");if(cp)cp.onclick=()=>pinForm(false);
 const ad=$("ad_b");if(ad)ad.onclick=()=>go("admin")}
function pinForm(forced){dlg.innerHTML=`<h2>${forced?"Set a new PIN":"Change PIN"}</h2>${forced?'<p class="soft">Your PIN was set by the administrator. Choose your own before continuing.</p>':""}
 <label>Current PIN</label><input type="password" id="pn_o" autocomplete="current-password"><label>New PIN (at least 8 characters)</label><input type="password" id="pn_n" autocomplete="new-password">
 <label>Repeat new PIN</label><input type="password" id="pn_r" autocomplete="new-password">
 <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="pn_s">Save</button>${forced?"":'<button class="btn" id="pn_c">Cancel</button>'}</div><div class="msg" id="pn_m"></div>`;
 dlg.oncancel=e=>{if(forced)e.preventDefault()};dlg.showModal();const c=$("pn_c");if(c)c.onclick=()=>dlg.close();
 $("pn_s").onclick=async()=>{const m=$("pn_m");if($("pn_n").value!==$("pn_r").value){m.className="msg err";m.textContent="The new PINs do not match.";return}
  try{await api("changePin",{oldPin:$("pn_o").value,newPin:$("pn_n").value});SES.user.mustChange=false;ssave();dlg.oncancel=null;dlg.close();route()}catch(e){m.className="msg err";m.textContent=e.message}}}
on(/^offices$/,()=>{head("NIA offices","Offices and their cases","offices",false);
 main.innerHTML=(SERVER()?`<div class="notice">Officers: sign in on the Login tab to see and enter cases.</div>`:"")+`<p class="intro">Tap an office to see its details and manage its cases.</p><div class="notice">Addresses and contacts are copied from the NIA Offices page (nia.gov.in/nia-office). Blank fields were blank on that page.</div>`;
 filterBox("Search office or city",()=>{const q=Q.toLowerCase();const it=D.offices.filter(o=>!q||(o.name+o.city+o.state).toLowerCase().includes(q));
  $("res").innerHTML=`<ul class="list">${it.map(o=>{const n=casesOf(c=>c.officeId===o.id);return row("office/"+enc(o.id),"",o.city+" | "+o.name,o.state+(SERVER()&&!canOffice(o.id)?"":" | "+n.length+" case"+(n.length===1?"":"s")))}).join("")}</ul>`});wireAuth()});
const tl=v=>(v||"").split(/\s*,\s*/).filter(Boolean).map(x=>`<a href="tel:${esc(x.replace(/[^\d+]/g,""))}">${esc(x)}</a>`).join(", ");
on(/^office\/(.+)$/,id=>{const o=D.offices.find(x=>x.id===id);if(!o)return;head(o.city,o.name,"offices",true);
 const cs=casesOf(c=>c.officeId===id),by={};cs.forEach(c=>by[c.stage]=(by[c.stage]||0)+1);
 main.innerHTML=kv([["Office",o.name],["City",o.city+", "+o.state],["Address",o.address||""],["Control room",tl(o.phone),1],["Mobile",tl(o.mobile),1],["WhatsApp",tl(o.whatsapp),1],["Fax",o.fax||""],["Email",o.email?`<a href="mailto:${esc(o.email)}">${esc(o.email)}</a>`:"",1],["Jurisdiction",o.jurisdiction||""]])+
 (canOffice(id)?`<div class="btnrow"><button class="btn primary" id="addc">Add case</button><a class="btn" href="#/monitor/${enc(id)}">Monitor office</a></div>`:"")+`
 <div class="stats">${Object.entries(by).map(([k,v])=>`${chip(k)} <b>${v}</b>`).join(" &nbsp; ")}</div>`;
 if(SERVER()&&!canOffice(id)){main.insertAdjacentHTML("beforeend",`<div class="gh">Cases</div>`+empty(SES?"Your ID is not assigned to this office. Ask the administrator for access.":"Sign in as an officer (Login tab) to see cases."));return}
 main.insertAdjacentHTML("beforeend",`<div class="gh">Cases (${cs.length})</div>`);
 main.insertAdjacentHTML("beforeend",cs.length?`<ul class="list">${cs.map(c=>row("case/"+enc(c.id),"",c.id+" | "+c.title,(c.next?"Next hearing "+fmtD(c.next):"No hearing date")," "+chip(c.stage))).join("")}</ul>`:empty("No cases for this office yet."));
 main.insertAdjacentHTML("beforeend",SERVER()?`<p class="notice">Cases are stored on the NIA officer server, not on this phone. Access is logged.</p>`:`<p class="notice">Cases are saved only on this device. Do not enter sensitive or sub-judice details unless the device and app are access-controlled.</p>`);
 if($("addc"))$("addc").onclick=()=>caseForm(null,id)});

/* ---------- LOGIN (officers) ---------- */
on(/^login$/,()=>{head("Officer login","Sign in to enter and manage cases","login",false);
 const signed=!SERVER()||!!SES;
 main.innerHTML=(SERVER()?authCard():`<div class="box"><h2>Case entry</h2><p class="soft">This copy of the app is not connected to the officer server, so cases entered here are kept only on this device. To use officer IDs and shared cases, ask the administrator for the server address (Data menu).</p></div>`);
 if(signed){
  const offs=myOffices();
  const hi=allAlerts(CASES).filter(a=>a.lv>=2);
  main.insertAdjacentHTML("beforeend",`<div class="btnrow"><button class="btn primary" id="lc_add"${offs.length?"":" disabled"}>Add case</button><a class="btn" href="#/today">Today</a><a class="btn" href="#/monitor">Monitor${hi.length?" ("+hi.length+" alerts)":""}</a><button class="btn" id="lc_imp"${offs.length?"":" disabled"}>Import CSV</button><a class="btn" href="#/guide">Guide</a></div>`);
  main.insertAdjacentHTML("beforeend",`<div class="gh">Cases (${CASES.length})</div>`);
  const sts=[...new Set(CASES.map(c=>(D.courts.find(x=>x.id===c.courtId)||{}).state).filter(Boolean))].sort();
  main.insertAdjacentHTML("beforeend",`<div class="filters"><select id="cf_s" aria-label="Stage"><option value="">All stages</option>${opts(STAGES)}</select><select id="cf_t" aria-label="State"><option value="">All states</option>${opts(sts)}</select><select id="cf_a" aria-label="Alerts"><option value="">All cases</option><option value="u">Needs attention</option><option value="h">Hearing in 7 days</option><option value="n">No hearing date</option></select><select id="cf_o" aria-label="Sort"><option value="">Sort: case number</option><option value="n">Next hearing</option><option value="u">Last update</option><option value="r">Oldest first</option></select></div>`);
  filterBox("Search by number, title, sections or office",()=>{const q=Q.toLowerCase(),fs=$("cf_s").value,ft=$("cf_t").value,fa=$("cf_a").value,so=$("cf_o").value;
   let it=CASES.filter(c=>{const o=D.offices.find(x=>x.id===c.officeId),ct=D.courts.find(x=>x.id===c.courtId);
    if(fs&&c.stage!==fs)return false;if(ft&&!(ct&&ct.state===ft))return false;
    if(fa==="u"&&!alerts(c).some(a=>a.lv>=2))return false;if(fa==="h"&&!(c.next&&c.next>=today()&&c.next<=addD(today(),7)))return false;if(fa==="n"&&(c.next||isDone(c)))return false;
    return !q||((c.id||"")+" "+(c.title||"")+" "+(c.sections||"")+" "+(o?o.city:"")+" "+(c.stage||"")+" "+(c.cnr||"")+" "+(c.specialNo||"")+" "+(c.ioName||"")+" "+(c.spp||"")).toLowerCase().includes(q)});
   if(so==="n")it.sort((a,b)=>(a.next||"9999")<(b.next||"9999")?-1:1);else if(so==="u")it.sort((a,b)=>(a.updated||"")<(b.updated||"")?1:-1);else if(so==="r")it.sort((a,b)=>(a.registered||"")<(b.registered||"")?-1:1);
   $("res").innerHTML=it.length?`<ul class="list">${it.map(c=>{const o=D.offices.find(x=>x.id===c.officeId),n=alerts(c).filter(a=>a.lv>=2).length;return row("case/"+enc(c.id),"",c.id+" | "+c.title,(o?o.city+" | ":"")+(c.next?"Next hearing "+fmtD(c.next):"No hearing date"),(n?` <span class="chip al-3">${n} alert${n===1?"":"s"}</span>`:"")+" "+chip(c.stage))}).join("")}</ul><p class="soft" style="font-size:13px">${it.length} of ${CASES.length} cases</p>`:empty(CASES.length?"No cases match.":(offs.length?"No cases yet. Tap Add case to enter the first one.":"No office is assigned to your ID yet. Ask the administrator."))});
  ["cf_s","cf_t","cf_a","cf_o"].forEach(i=>$(i).onchange=()=>$("q").oninput({target:$("q")}));
  if($("lc_add"))$("lc_add").onclick=()=>caseForm(null,offs[0]);if($("lc_imp"))$("lc_imp").onclick=importForm;
  main.insertAdjacentHTML("beforeend",SERVER()?`<p class="notice">Cases are stored on the NIA officer server, not on this phone. You see only your own office's cases and any office the administrator has allowed. Access is logged.</p>`:`<p class="notice">Cases are saved only on this device. Do not enter sensitive or sub-judice details unless the device and app are access-controlled.</p>`);
 }
 wireAuth()});

/* ---------- CASES & MONITORING ---------- */
const DAY=864e5,DONE=["Convicted","Acquitted","Closed"],isDone=c=>DONE.includes(c.stage);
const dayN=d=>d?Math.round(Date.parse(d+"T00:00:00Z")/DAY):NaN;
const addD=(d,n)=>{const x=new Date(Date.parse(d+"T00:00:00Z")+n*DAY);return x.toISOString().slice(0,10)};
const hcName=id=>{const h=(D.highCourts||[]).find(x=>x.id===id);return h?h.name:""};
const MT=["Bail petition or appeal","Criminal appeal","Revision","Transfer petition","Quashing petition","Supreme Court matter (SLP or appeal)","Other"];
const MST=["Pending","Notice issued","Admitted","Stay granted","Reserved","Allowed","Dismissed","Disposed"];
const OUTC=["Favourable to NIA","Adverse to NIA","Neutral or procedural"];
const APST=["Under review","Recommended","Not recommended","Filed","Decided"];
const who=()=>SES&&SES.user?SES.user.id:"";
const audit=(c,note)=>{(c.history=c.history||[]).push({ts:today(),at:new Date().toISOString(),stage:c.stage,note,by:who()})};
const nid=()=>Math.random().toString(36).slice(2,9);
function stageSince(c){const h=c.history||[];let d=c.registered||"";for(let i=h.length-1;i>=0;i--){if(h[i].stage===c.stage)d=h[i].ts;else break}return d?dayN(today())-dayN(d):0}
function disposedOn(c){if(c.disposed)return c.disposed;if(!isDone(c))return"";const h=c.history||[];let d=c.updated||"";for(let i=h.length-1;i>=0;i--){if(h[i].stage===c.stage)d=h[i].ts;else break}return d}
function duration(c){const d=disposedOn(c);return d&&c.registered?dayN(d)-dayN(c.registered):NaN}
const FILL=[["courtId","court"],["hc","High Court"],["cnr","CNR"],["specialNo","special case number"],["ioName","officer in charge"],["spp","Special Public Prosecutor"],["nodal","court nodal officer"],["sections","sections"],["accused","number of accused"]];
const complete=c=>{const m=FILL.filter(f=>!c[f[0]]).map(f=>f[1]);return{pct:Math.round(100*(FILL.length-m.length)/FILL.length),missing:m}};
function alerts(c){const t=today(),T=dayN(t),a=[],add=(lv,k,tx,dt)=>a.push({lv,k,tx,dt:dt||"",c});const done=isDone(c);
 if(!done){
  if(c.next){const n=dayN(c.next)-T;if(n<0)add(3,"hearing","Hearing date "+fmtD(c.next)+" has passed. Record the outcome and the next date.",c.next);else if(n<=7)add(2,"hearing",(n===0?"Hearing today":"Hearing in "+n+" day"+(n===1?"":"s"))+" ("+fmtD(c.next)+")",c.next)}
  const st=T-dayN(c.updated||c.registered);if(st>=30)add(2,"stale","No update for "+st+" days",c.updated);
  const sc=stageSince(c);if(sc>=180)add(1,"stuck","In stage \""+c.stage+"\" for "+sc+" days");
  stDeadlines(c).forEach(d=>{const w=d.who?d.who+": ":"";if(d.days<0)add(3,"deadline",w+"the "+c.dlDays+"-day period for the chargesheet ended on "+fmtD(d.due),d.due);else if(d.days<=15)add(d.days<=5?3:2,"deadline",w+"chargesheet due by "+fmtD(d.due)+" ("+d.days+" day"+(d.days===1?"":"s")+" left)",d.due)});
  if(c.cnr){const k=c.ecChecked?T-dayN(c.ecChecked):999;if(k>=7)add(1,"ecourts",c.ecChecked?"eCourts last checked "+k+" days ago":"eCourts status not checked yet")}
 }
 (c.matters||[]).forEach(m=>{if(!m.next||/^(Allowed|Dismissed|Disposed)$/.test(m.status))return;const n=dayN(m.next)-T,l=(m.type||"Matter")+" "+(m.no||"");
  if(n<0)add(2,"matter",l+": hearing date "+fmtD(m.next)+" has passed. Update it.",m.next);else if(n<=7)add(2,"matter",l+": hearing in "+n+" day"+(n===1?"":"s")+" ("+fmtD(m.next)+")",m.next)});
 (c.orders||[]).forEach(o=>{if(!o.action||o.done||!o.due)return;const n=dayN(o.due)-T;
  if(n<0)add(3,"order","Action overdue: "+o.action+" (due "+fmtD(o.due)+")",o.due);else if(n<=7)add(2,"order","Action due in "+n+" day"+(n===1?"":"s")+": "+o.action,o.due)});
 const ap=c.appeal,adv=(c.orders||[]).filter(o=>o.outcome==="Adverse to NIA"),need=c.stage==="Acquitted"||adv.length;
 if(need&&(!ap||ap.status==="Under review")){const base=adv.length?adv[adv.length-1].date:(disposedOn(c)||c.updated),due=(ap&&ap.due)||addD(base,30),n=dayN(due)-T;
  add(n<0?3:n<=10?3:2,"appeal","Appeal decision pending. "+(n<0?"The 30-day date passed on ":"Decide by ")+fmtD(due)+(n<0?" (the High Court can still allow up to 90 days for sufficient cause).":"."),due)}
 const cm=complete(c);if(cm.missing.length)add(1,"missing","Record is "+cm.pct+"% complete. Missing: "+cm.missing.join(", "));
 return a}
const allAlerts=cs=>cs.flatMap(alerts);
const ALC={3:"al-3",2:"al-2",1:"al-1"},ALT={3:"Urgent",2:"Soon",1:"Note"};
const alRow=a=>row("case/"+enc(a.c.id),"",a.c.id+" | "+a.c.title,a.tx," <span class='chip "+ALC[a.lv]+"'>"+ALT[a.lv]+"</span>");
/* all upcoming hearings: trial and High Court matters */
function hearings(days){const t=today(),e=addD(t,days),o=[];
 CASES.forEach(c=>{if(c.next&&c.next>=t&&c.next<=e&&!isDone(c))o.push({c,date:c.next,label:"Trial court",stage:c.stage});
  (c.matters||[]).forEach(m=>{if(m.next&&m.next>=t&&m.next<=e&&!/^(Allowed|Dismissed|Disposed)$/.test(m.status))o.push({c,date:m.next,label:(m.type||"Matter")+(m.forum?" ("+hcName(m.forum)+")":""),stage:c.stage})})});
 return o.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0)}

on(/^case\/(.+)$/,id=>{const c=CASES.find(x=>x.id===id);if(!c)return L.hash="#/login";
 const o=D.offices.find(x=>x.id===c.officeId),ct=D.courts.find(x=>x.id===c.courtId);head(c.id,c.title,ct?"courts":"login",true);
 const al=alerts(c).filter(a=>a.k!=="missing"),cm=complete(c),dl=c.arrested&&c.dlDays?addD(c.arrested,+c.dlDays):"";
 main.innerHTML=`<div style="margin:0 2px 10px">${chip(c.stage)} <span class="chip s-early">Record ${cm.pct}% complete</span></div>`+
 (al.length?`<div class="gh">Alerts</div><ul class="list">${al.sort((a,b)=>b.lv-a.lv).map(a=>`<li><div class="row"><span class="h">${esc(a.tx)}<span class="sub"><span class="chip ${ALC[a.lv]}">${ALT[a.lv]}</span></span></span></div></li>`).join("")}</ul>`:"")+
 kv([["Title",c.title],["Special case number",c.specialNo||""],["Office",o?`<a href="#/office/${enc(o.id)}"><u>${esc(o.city)}</u></a>`:"","1"],
 ["Court",ct?`<a href="#/court/${enc(ct.id)}"><u>${esc(ct.city)}: ${esc(ct.name)}</u></a>`:"","1"],["High Court",hcName(c.hc)],["Sections",c.sections||""],["Accused",accusedSummary(c)],
 ["Registered",fmtD(c.registered)],["Next hearing",fmtD(c.next)],["Disposed on",fmtD(disposedOn(c))],["CNR",c.cnr||""],["Notes",c.notes||""],["Last update",fmtD(c.updated)]].map(x=>x[2]?[x[0],x[1],1]:x))+
 `<div class="gh">People</div>`+kv([["Officer in charge",[c.ioName,c.ioContact].filter(Boolean).join(", ")],["Special Public Prosecutor",[c.spp,c.sppContact].filter(Boolean).join(", ")],["Court nodal officer",[c.nodal,c.nodalContact].filter(Boolean).join(", ")]])+
 (c.arrested||c.csFiled||c.dlDays?`<div class="gh">Statutory timeline</div>`+kv([["First remand or arrest",fmtD(c.arrested)],["Chargesheet period",c.dlDays?c.dlDays+" days":""],["Chargesheet due by",fmtD(dl)],["Chargesheet filed",fmtD(c.csFiled)]]):"")+
 `<div class="gh">Accused (${(c.accusedList||[]).length})</div>`+((c.accusedList||[]).length?`<ul class="list">${c.accusedList.map(x=>{const d=stDeadlines(c).find(y=>y.who===(x.name||"Accused"));return`<li><div class="row" data-xid="${esc(x.id)}" style="cursor:pointer"><span class="h">${esc(x.name)}${x.alias?" ("+esc(x.alias)+")":""} <span class="chip ${x.status==="In custody"?"al-2":x.status==="Convicted"?"s-done":"s-early"}">${esc(x.status)}</span><span class="sub">${x.arrested?"Arrested "+esc(fmtD(x.arrested)):""}${d?" | chargesheet due "+esc(fmtD(d.due)):""}${x.bailOn?" | bail "+esc(fmtD(x.bailOn)):""}${x.note?" | "+esc(x.note):""}</span></span></div></li>`}).join("")}</ul>`:empty("No accused listed. The count above is a plain number."))+
 `<div class="btnrow"><button class="btn" id="ax">Add accused</button></div>`+
 `<div class="btnrow"><button class="btn primary" id="st">Update status</button><button class="btn" id="ed">Edit</button><a class="btn" href="#/brief/${enc(c.id)}">Print brief</a>
 ${c.cnr?`<button class="btn" id="ec">Check on eCourts</button><button class="btn" id="ecr">Record eCourts check</button>`:""}${(!SERVER()||isAdmin())?`<button class="btn danger" id="dl">Delete</button>`:""}</div>`+
 (c.cnr?`<p class="soft" style="font-size:13px;margin:2px 2px 6px">eCourts last checked: ${c.ecChecked?esc(fmtD(c.ecChecked)):"never"}. The Check button copies the CNR (${esc(c.cnr)}) and opens eCourts. Enter it there under Case Status, search by CNR.</p>`:"")+
 `<div class="gh">High Court and Supreme Court matters (${(c.matters||[]).length})</div>`+
 ((c.matters||[]).length?`<ul class="list">${c.matters.map(m=>`<li><div class="row" data-mid="${esc(m.id)}" style="cursor:pointer"><span class="h">${esc(m.type||"Matter")} ${esc(m.no||"")}<span class="sub">${esc(hcName(m.forum))} | ${esc(m.status||"")}${m.next?" | next "+esc(fmtD(m.next)):""}${m.note?" | "+esc(m.note):""}</span></span></div></li>`).join("")}</ul>`:empty("No linked High Court or Supreme Court matters."))+
 `<div class="btnrow"><button class="btn" id="am">Add matter</button></div>`+
 `<div class="gh">Orders and judgements (${(c.orders||[]).length})</div>`+
 ((c.orders||[]).length?`<ul class="list">${[...c.orders].reverse().map(x=>`<li><div class="row"><span class="h">${fmtD(x.date)} | ${esc(x.forum||"")} | ${esc(x.type||"Order")} ${x.outcome?`<span class="chip ${x.outcome==="Adverse to NIA"?"al-3":x.outcome==="Favourable to NIA"?"s-done":"s-early"}">${esc(x.outcome)}</span>`:""}<span class="sub">${esc(x.summary||"")}${x.action?" | Action: "+esc(x.action)+(x.due?" by "+esc(fmtD(x.due)):"")+(x.done?" (done)":""):""}</span>${x.action&&!x.done?`<button class="btn" data-od="${esc(x.id)}" style="margin-top:6px">Mark action done</button>`:""}</span></div></li>`).join("")}</ul>`:empty("No orders recorded."))+
 `<div class="btnrow"><button class="btn" id="ao">Add order</button></div>`+
 (c.appeal||c.stage==="Acquitted"||(c.orders||[]).some(x=>x.outcome==="Adverse to NIA")?`<div class="gh">Appeal decision</div>`+kv([["Status",c.appeal?c.appeal.status:"Under review"],["Reviewer",c.appeal&&c.appeal.reviewer||""],["Decide by",fmtD(c.appeal&&c.appeal.due||"")],["Appeal number",c.appeal&&c.appeal.no||""],["Filed on",fmtD(c.appeal&&c.appeal.filed||"")],["Note",c.appeal&&c.appeal.note||""]])+`<div class="btnrow"><button class="btn primary" id="ap">Update appeal decision</button></div><p class="soft" style="font-size:13px;margin:2px 2px 6px">Under section 21 of the NIA Act an appeal to the High Court is to be filed within 30 days of the order. The High Court may entertain it within 90 days for sufficient cause. Confirm against the Act before relying on a date.</p>`:"")+
 `<div class="gh">Audit trail</div>${(c.history||[]).length?`<ul class="tl">${[...c.history].reverse().map(h=>`<li><b>${fmtD(h.ts)}</b> ${chip(h.stage)}${h.by?` <span class="soft">by ${esc(h.by)}</span>`:""}<br>${esc(h.note||"")}</li>`).join("")}</ul>`:empty("No updates logged.")}`;
 $("st").onclick=()=>statusForm(id);$("ed").onclick=()=>caseForm(c);$("am").onclick=()=>matterForm(id);$("ax").onclick=()=>accusedForm(id);main.querySelectorAll("[data-xid]").forEach(e=>e.onclick=()=>accusedForm(id,e.dataset.xid));$("ao").onclick=()=>orderForm(id);if($("ap"))$("ap").onclick=()=>appealForm(id);
 if($("ec"))$("ec").onclick=()=>{try{navigator.clipboard.writeText(c.cnr)}catch(e){}window.open("https://services.ecourts.gov.in/ecourtindia_v6/","_blank","noopener")};
 if($("ecr"))$("ecr").onclick=()=>{c.ecChecked=today();audit(c,"Checked on eCourts.");saveCases();route()};
 main.querySelectorAll("[data-mid]").forEach(e=>e.onclick=()=>matterForm(id,e.dataset.mid));
 main.querySelectorAll("[data-od]").forEach(e=>e.onclick=ev=>{ev.stopPropagation();const x=c.orders.find(y=>y.id===e.dataset.od);if(x){x.done=true;audit(c,"Action completed: "+x.action);c.updated=today();saveCases();route()}});
 if($("dl"))$("dl").onclick=()=>{if(confirm(SERVER()?"Delete this case from the server? This cannot be undone.":"Delete this case from this device?")){CASES=CASES.filter(x=>x.id!==id);saveCases();L.hash="#/login"}}});
const dlg=$("dlg");
const opts=(a,sel,fn=x=>[x,x])=>a.map(x=>{const[v,l]=fn(x);return`<option value="${esc(v)}"${v===sel?" selected":""}>${esc(l)}</option>`}).join("");
const TRACK=[["title","title"],["officeId","office"],["courtId","court"],["specialNo","special case no."],["hc","High Court"],["sections","sections"],["accused","accused"],["registered","registered date"],["stage","stage"],["next","next hearing"],["cnr","CNR"],["ioName","officer in charge"],["ioContact","officer contact"],["spp","SPP"],["sppContact","SPP contact"],["nodal","nodal officer"],["nodalContact","nodal contact"],["arrested","first remand date"],["dlDays","chargesheet period"],["csFiled","chargesheet date"],["disposed","disposal date"],["notes","notes"]];
function caseForm(c,officeId){const n=!c;if(!officeId&&n)officeId=(myOffices()[0]||"");c=c||{officeId,stage:"Registered",registered:today()};
 const states=[...new Set(D.courts.map(x=>x.state))].sort(),cst=(D.courts.find(x=>x.id===c.courtId)||{}).state||"";
 const courtOpts=st=>`<option value="">Not assigned</option>`+opts(D.courts.filter(x=>!st||x.state===st),c.courtId,o=>[o.id,o.city+" | "+o.name]);
 dlg.innerHTML=`<h2>${n?"Add case":"Edit case"}</h2>
 <label>RC / case number</label><input type="text" id="f_id" value="${esc(c.id||"")}" ${n?"":"disabled"} placeholder="RC-01/2026/NIA/DLI">
 <label>Title</label><input type="text" id="f_t" value="${esc(c.title||"")}">
 <label>Office</label><select id="f_o">${opts(D.offices.filter(o=>canOffice(o.id)||o.id===c.officeId),c.officeId,o=>[o.id,o.city+" | "+o.name])}</select>
 <label>Sections / offences</label><input type="text" id="f_s" value="${esc(c.sections||"")}">
 <label>Number of accused</label><input type="number" id="f_a" min="0" value="${esc((c.accusedList||[]).length||c.accused||"")}"${(c.accusedList||[]).length?" readonly":""}>
 <label>Registered on</label><input type="date" id="f_r" value="${esc(c.registered||"")}">
 <div class="gh">Court</div>
 <label>State of the court (narrows the list)</label><select id="f_cs"><option value="">All states</option>${opts(states,cst)}</select>
 <label>Special court</label><select id="f_c">${courtOpts(cst)}</select>
 <label>Special case number</label><input type="text" id="f_sn" value="${esc(c.specialNo||"")}" placeholder="NIA Special Case No. 01/2026">
 <label>High Court (for appeals and bail matters)</label><select id="f_hc"><option value="">Not set</option>${opts((D.highCourts||[]).filter(h=>h.id!=="sc"),c.hc,h=>[h.id,h.name])}</select>
 <label>eCourts CNR number</label><input type="text" id="f_cnr" value="${esc(c.cnr||"")}">
 <div class="gh">People</div>
 <label>Officer in charge</label><input type="text" id="f_io" value="${esc(c.ioName||"")}"><label>Officer contact</label><input type="text" id="f_ioc" value="${esc(c.ioContact||"")}">
 <label>Special Public Prosecutor</label><input type="text" id="f_sp" value="${esc(c.spp||"")}"><label>SPP contact</label><input type="text" id="f_spc" value="${esc(c.sppContact||"")}">
 <label>Court nodal officer</label><input type="text" id="f_nd" value="${esc(c.nodal||"")}"><label>Nodal officer contact</label><input type="text" id="f_ndc" value="${esc(c.nodalContact||"")}">
 <div class="gh">Stage and dates</div>
 <label>Stage</label><select id="f_g">${opts(STAGES,c.stage)}</select>
 <label>Next hearing</label><input type="date" id="f_n" value="${esc(c.next||"")}">
 <label>First arrest or remand date (for the chargesheet deadline)</label><input type="date" id="f_ar" value="${esc(c.arrested||"")}">
 <label>Time allowed to file the chargesheet</label><select id="f_dd"><option value="">Not tracked</option>${opts(["60","90","180"],String(c.dlDays||""),x=>[x,x+" days"])}</select>
 <p class="soft" style="font-size:12.5px">UA(P) Act section 43D(2): 90 days, extendable to 180 days by the court. BNSS section 187: 60 or 90 days depending on the offence. Confirm the period for your case.</p>
 <label>Chargesheet filed on</label><input type="date" id="f_cf" value="${esc(c.csFiled||"")}">
 <label>Disposed on (conviction, acquittal or closure)</label><input type="date" id="f_dp" value="${esc(c.disposed||"")}">
 <label>Notes</label><textarea class="plainta" id="f_no">${esc(c.notes||"")}</textarea>
 <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="sv">Save</button><button class="btn" id="cx">Cancel</button></div><div class="msg err" id="m"></div>`;
 dlg.showModal();$("cx").onclick=()=>dlg.close();
 $("f_cs").onchange=()=>{$("f_c").innerHTML=courtOpts($("f_cs").value).replace(/ selected/,"")};
 $("f_c").onchange=()=>{const ct=D.courts.find(x=>x.id===$("f_c").value);if(!ct)return;if(ct.hc)$("f_hc").value=ct.hc;
  const prev=[...CASES].reverse().find(x=>x.courtId===ct.id&&x.id!==c.id);
  if(prev){if(!$("f_sp").value){$("f_sp").value=prev.spp||"";$("f_spc").value=prev.sppContact||""}if(!$("f_nd").value){$("f_nd").value=prev.nodal||"";$("f_ndc").value=prev.nodalContact||""}}};
 $("sv").onclick=()=>{const id=$("f_id").value.trim(),t=$("f_t").value.trim();
  if(!id||!t){$("m").textContent="Case number and title are required.";return}
  if(n&&CASES.some(x=>x.id===id)){$("m").textContent="A case with this number already exists.";return}
  const v=k=>$(k).value.trim();
  const o=Object.assign({},c,{id,title:t,officeId:$("f_o").value,courtId:$("f_c").value,specialNo:v("f_sn"),hc:$("f_hc").value,sections:v("f_s"),accused:$("f_a").value,registered:$("f_r").value,stage:$("f_g").value,next:$("f_n").value,cnr:v("f_cnr"),
   ioName:v("f_io"),ioContact:v("f_ioc"),spp:v("f_sp"),sppContact:v("f_spc"),nodal:v("f_nd"),nodalContact:v("f_ndc"),arrested:$("f_ar").value,dlDays:$("f_dd").value,csFiled:$("f_cf").value,disposed:$("f_dp").value,notes:v("f_no"),updated:today()});
  if(isDone(o)&&!o.disposed)o.disposed=today();
  if(n){o.history=[];audit(o,"Case added.");CASES.push(o)}
  else{o.history=c.history||[];const ch=TRACK.filter(k=>String(c[k[0]]||"")!==String(o[k[0]]||"")).map(k=>k[1]);if(ch.length)audit(o,"Edited: "+ch.join(", ")+".");const i=CASES.findIndex(x=>x.id===c.id);CASES[i]=o}
  if(!saveCases())alert("Could not save on this device. Changes will be lost when the page closes.");
  dlg.close();L.hash="#/case/"+enc(id);route()}}
function addOrder(c,x){x.id=nid();(c.orders=c.orders||[]).push(x);audit(c,(x.type||"Order")+" recorded"+(x.outcome?" ("+x.outcome+")":"")+".");
 if(x.outcome==="Adverse to NIA"&&!c.appeal)c.appeal={status:"Under review",due:addD(x.date,30)}}
function statusForm(id){const c=CASES.find(x=>x.id===id);
 dlg.innerHTML=`<h2>Update status</h2><label>Stage</label><select id="s_g">${opts(STAGES,c.stage)}</select>
 <label>Next hearing</label><input type="date" id="s_n" value="${esc(c.next||"")}">
 <label>What happened</label><textarea class="plainta" id="s_no" placeholder="Hearing outcome, next step"></textarea>
 <div class="gh">Order passed (optional)</div>
 <label>Order or direction</label><textarea class="plainta" id="s_os" placeholder="What the court ordered"></textarea>
 <label>Outcome for NIA</label><select id="s_oc"><option value="">Not recorded</option>${opts(OUTC)}</select>
 <label>Action required</label><input type="text" id="s_oa" placeholder="For example: file reply, apply for certified copy"><label>Action due by</label><input type="date" id="s_od">
 <label><input type="checkbox" id="s_ec"> I checked eCourts today</label>
 <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="sv">Save</button><button class="btn" id="cx">Cancel</button></div>`;
 dlg.showModal();$("cx").onclick=()=>dlg.close();
 $("sv").onclick=()=>{const prev=c.stage;c.stage=$("s_g").value;c.next=$("s_n").value;c.updated=today();if(isDone(c)&&!c.disposed)c.disposed=today();if($("s_ec").checked)c.ecChecked=today();
  audit(c,$("s_no").value.trim()||(prev!==c.stage?"Stage changed.":"Status updated."));
  const os=$("s_os").value.trim(),oa=$("s_oa").value.trim();if(os||oa||$("s_oc").value){const ct=D.courts.find(x=>x.id===c.courtId);addOrder(c,{date:today(),forum:ct?ct.city+" special court":"Trial court",type:"Order",summary:os,outcome:$("s_oc").value,action:oa,due:$("s_od").value,done:false})}
  saveCases();dlg.close();route()}}
function matterForm(cid,mid){const c=CASES.find(x=>x.id===cid),m=(c.matters||[]).find(x=>x.id===mid)||{type:MT[0],status:"Pending",forum:c.hc||""};
 dlg.innerHTML=`<h2>${mid?"Edit matter":"Add High Court or Supreme Court matter"}</h2>
 <label>Type</label><select id="m_t">${opts(MT,m.type)}</select>
 <label>Court</label><select id="m_f"><option value="">Select</option>${opts(D.highCourts||[],m.forum,h=>[h.id,h.name])}</select>
 <label>Case number</label><input type="text" id="m_n" value="${esc(m.no||"")}" placeholder="CRL.A. 123/2026"><label>Bench or judge</label><input type="text" id="m_b" value="${esc(m.bench||"")}">
 <label>Status</label><select id="m_s">${opts(MST,m.status)}</select><label>Next hearing</label><input type="date" id="m_x" value="${esc(m.next||"")}">
 <label>Latest order or note</label><textarea class="plainta" id="m_o">${esc(m.note||"")}</textarea>
 <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="sv">Save</button><button class="btn" id="cx">Cancel</button>${mid?'<button class="btn danger" id="rm">Remove</button>':""}</div>`;
 dlg.showModal();$("cx").onclick=()=>dlg.close();
 if($("rm"))$("rm").onclick=()=>{c.matters=c.matters.filter(x=>x.id!==mid);audit(c,"Matter removed: "+(m.type||"")+" "+(m.no||""));saveCases();dlg.close();route()};
 $("sv").onclick=()=>{const o={id:m.id||nid(),type:$("m_t").value,forum:$("m_f").value,no:$("m_n").value.trim(),bench:$("m_b").value.trim(),status:$("m_s").value,next:$("m_x").value,note:$("m_o").value.trim()};
  c.matters=c.matters||[];const i=c.matters.findIndex(x=>x.id===o.id);if(i>=0)c.matters[i]=o;else c.matters.push(o);
  audit(c,(i>=0?"Matter updated: ":"Matter added: ")+o.type+" "+o.no+(o.status?" ("+o.status+")":""));c.updated=today();saveCases();dlg.close();route()}}
function orderForm(cid){const c=CASES.find(x=>x.id===cid),ct=D.courts.find(x=>x.id===c.courtId);
 const forums=[ct?ct.city+" special court":"Trial court"].concat((D.highCourts||[]).map(h=>h.name));
 dlg.innerHTML=`<h2>Add order or judgement</h2><label>Date</label><input type="date" id="o_d" value="${today()}">
 <label>Forum</label><select id="o_f">${opts(forums)}</select>
 <label>Type</label><select id="o_t">${opts(["Order","Judgement","Bail order","Interim order","Direction","Notice"])}</select>
 <label>Summary</label><textarea class="plainta" id="o_s"></textarea>
 <label>Outcome for NIA</label><select id="o_c"><option value="">Not recorded</option>${opts(OUTC)}</select>
 <label>Action required</label><input type="text" id="o_a"><label>Action due by</label><input type="date" id="o_x">
 <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="sv">Save</button><button class="btn" id="cx">Cancel</button></div>`;
 dlg.showModal();$("cx").onclick=()=>dlg.close();
 $("sv").onclick=()=>{addOrder(c,{date:$("o_d").value||today(),forum:$("o_f").value,type:$("o_t").value,summary:$("o_s").value.trim(),outcome:$("o_c").value,action:$("o_a").value.trim(),due:$("o_x").value,done:false});c.updated=today();saveCases();dlg.close();route()}}
function appealForm(cid){const c=CASES.find(x=>x.id===cid),a=c.appeal||{status:"Under review"};
 dlg.innerHTML=`<h2>Appeal decision</h2><label>Status</label><select id="a_s">${opts(APST,a.status)}</select>
 <label>Reviewing officer</label><input type="text" id="a_r" value="${esc(a.reviewer||"")}">
 <label>Decide or file by</label><input type="date" id="a_d" value="${esc(a.due||"")}">
 <label>Appeal number</label><input type="text" id="a_n" value="${esc(a.no||"")}"><label>Filed on</label><input type="date" id="a_f" value="${esc(a.filed||"")}">
 <label>Note (reasons)</label><textarea class="plainta" id="a_o">${esc(a.note||"")}</textarea>
 <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="sv">Save</button><button class="btn" id="cx">Cancel</button></div>`;
 dlg.showModal();$("cx").onclick=()=>dlg.close();
 $("sv").onclick=()=>{c.appeal={status:$("a_s").value,reviewer:$("a_r").value.trim(),due:$("a_d").value,no:$("a_n").value.trim(),filed:$("a_f").value,note:$("a_o").value.trim()};audit(c,"Appeal decision: "+c.appeal.status+".");c.updated=today();saveCases();dlg.close();route()}}

/* ---------- MONITOR ---------- */
function csvDownload(rows){const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"';const t="﻿"+rows.map(r=>r.map(q).join(",")).join("\r\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/csv"}));a.download="nia-cases-"+today()+".csv";document.body.appendChild(a);a.click();a.remove()}
const avg=a=>a.length?Math.round(a.reduce((s,x)=>s+x,0)/a.length):null;
const tbl=(h,rows)=>`<div style="overflow:auto"><table class="mt"><thead><tr>${h.map(x=>`<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
on(/^monitor(?:\/(.+))?$/,of=>{head("Case monitor","Alerts and roll-up","login",true);
 if(SERVER()&&!SES){L.hash="#/login";return}
 of=of||"all";const offs=myOffices(),sel=of==="all"?CASES:CASES.filter(c=>c.officeId===of);
 const act=sel.filter(c=>!isDone(c)),al=allAlerts(sel),hi=al.filter(a=>a.lv>=2).sort((a,b)=>b.lv-a.lv||(a.dt<b.dt?-1:1)),lo=al.filter(a=>a.lv===1);
 const conv=sel.filter(c=>c.stage==="Convicted").length,acq=sel.filter(c=>c.stage==="Acquitted").length,du=avg(sel.map(duration).filter(x=>x>=0));
 main.innerHTML=`<label>Office</label><select id="mo"><option value="all">All my offices</option>${opts(offs.map(i=>D.offices.find(o=>o.id===i)).filter(Boolean),of,o=>[o.id,o.city+" | "+o.name])}</select>
 <div class="stats" style="margin-top:12px"><span class="chip s-early">Cases <b>${sel.length}</b></span> <span class="chip s-trial">Active <b>${act.length}</b></span> <span class="chip al-3">Urgent <b>${hi.filter(a=>a.lv===3).length}</b></span> <span class="chip al-2">Soon <b>${hi.filter(a=>a.lv===2).length}</b></span> <span class="chip s-done">Hearings in 7 days <b>${hearings(7).filter(h=>sel.includes(h.c)).length}</b></span></div>
 <div class="stats"><span class="chip s-done">Convictions <b>${conv}</b></span> <span class="chip s-done">Acquittals <b>${acq}</b></span> <span class="chip s-done">Conviction rate <b>${conv+acq?Math.round(100*conv/(conv+acq))+"%":"n/a"}</b></span> <span class="chip s-early">Average time to disposal <b>${du==null?"n/a":Math.round(du/30.4)+" months"}</b></span></div>
 <div class="btnrow"><button class="btn" id="mx">Download CSV</button><button class="btn" id="mi">Calendar (.ics)</button><a class="btn" href="#/today">Today</a><a class="btn" href="#/ecq">eCourts queue</a><a class="btn" href="#/guide">How monitoring works</a></div>
 <div class="gh">Needs attention (${hi.length})</div>${hi.length?`<ul class="list">${hi.slice(0,150).map(alRow).join("")}</ul>`:empty("Nothing urgent.")}`;
 const by=f=>{const m={};sel.forEach(c=>{const k=f(c)||"Not set";(m[k]=m[k]||[]).push(c)});return Object.entries(m).sort((a,b)=>b[1].length-a[1].length)};
 const stat=cs=>{const v=cs.filter(c=>c.stage==="Convicted").length,a=cs.filter(c=>c.stage==="Acquitted").length,d=avg(cs.map(duration).filter(x=>x>=0));return[cs.length,cs.filter(c=>!isDone(c)).length,v,a,v+a?Math.round(100*v/(v+a))+"%":"n/a",d==null?"n/a":Math.round(d/30.4)+" mo"]};
 const H=["","Cases","Active","Conv.","Acq.","Rate","Avg time"];
 const accs=sel.flatMap(c=>c.accusedList||[]),cust=accs.filter(x=>x.status==="In custody").length,dls=sel.flatMap(c=>stDeadlines(c).map(d=>Object.assign({c},d))).filter(d=>d.days<=30).sort((a,b)=>a.days-b.days);
 const ag=[["Under 1 year",0,365],["1 to 3 years",365,1095],["3 to 5 years",1095,1825],["Over 5 years",1825,1e9]].map(b=>[b[0],act.filter(c=>{const a=dayN(today())-dayN(c.registered);return a>=b[1]&&a<b[2]}).length]);
 main.insertAdjacentHTML("beforeend",`<div class="gh">Accused</div><div class="stats"><span class="chip s-early">Listed <b>${accs.length}</b></span> <span class="chip al-2">In custody <b>${cust}</b></span> <span class="chip s-early">On bail <b>${accs.filter(x=>x.status==="On bail").length}</b></span> <span class="chip al-3">Absconding or proclaimed <b>${accs.filter(x=>/^(Absconding|Proclaimed)/.test(x.status)).length}</b></span></div>
 <div class="gh">Chargesheet deadlines in 30 days (${dls.length})</div>${dls.length?`<ul class="list">${dls.map(d=>row("case/"+enc(d.c.id),"",d.c.id+" | "+(d.who||d.c.title),(d.days<0?"Ended "+fmtD(d.due):"Due "+fmtD(d.due)+" ("+d.days+" days)")," <span class='chip "+(d.days<=5?"al-3":"al-2")+"'>"+(d.days<0?"Past":d.days+"d")+"</span>")).join("")}</ul>`:empty("None in the next 30 days.")}
 <div class="gh">Age of active cases</div>${tbl(["Time since registration","Active cases"],ag.map(x=>[esc(x[0]),String(x[1])]))}
 <div class="gh">By stage</div><div class="stats">${STAGES.map(s=>[s,sel.filter(c=>c.stage===s).length]).filter(x=>x[1]).map(x=>`${chip(x[0])} <b>${x[1]}</b>`).join(" &nbsp; ")||"No cases."}</div>
 <div class="gh">By office</div>${tbl(H,by(c=>{const o=D.offices.find(x=>x.id===c.officeId);return o?o.city:""}).map(([k,v])=>[esc(k)].concat(stat(v))))}
 <div class="gh">By court</div>${tbl(H,by(c=>{const o=D.courts.find(x=>x.id===c.courtId);return o?o.city+" | "+o.name:""}).map(([k,v])=>[esc(k)].concat(stat(v))))}
 <div class="gh">By state of court</div>${tbl(H,by(c=>{const o=D.courts.find(x=>x.id===c.courtId);return o?o.state:""}).map(([k,v])=>[esc(k)].concat(stat(v))))}
 <div class="gh">Appeal decisions pending</div>`);
 const pend=sel.filter(c=>alerts(c).some(a=>a.k==="appeal"));
 main.insertAdjacentHTML("beforeend",pend.length?`<ul class="list">${pend.map(c=>row("case/"+enc(c.id),"",c.id+" | "+c.title,"Reviewer: "+((c.appeal&&c.appeal.reviewer)||"not set"))).join("")}</ul>`:empty("None pending."));
 const ec=act.filter(c=>c.cnr&&(!c.ecChecked||dayN(today())-dayN(c.ecChecked)>=7));
 main.insertAdjacentHTML("beforeend",`<div class="gh">eCourts check due (${ec.length})</div>`+(ec.length?`<ul class="list">${ec.map(c=>row("case/"+enc(c.id),"",c.id+" | "+c.title,"CNR "+c.cnr+" | last checked "+(c.ecChecked?fmtD(c.ecChecked):"never"))).join("")}</ul>`:empty("All cases with a CNR were checked in the last 7 days."))+
 `<div class="gh">Housekeeping (${lo.length})</div>`+(lo.length?`<ul class="list">${lo.slice(0,100).map(alRow).join("")}</ul>`:empty("Nothing to tidy.")));
 $("mo").onchange=()=>{L.hash="#/monitor/"+($("mo").value==="all"?"":enc($("mo").value))};
 $("mi").onclick=()=>icsDownload(sel);$("mx").onclick=()=>csvDownload([["Case","Title","Office","Court","State","High Court","Special case no.","CNR","Sections","Accused","Stage","Registered","Next hearing","Disposed","Officer in charge","SPP","Nodal officer","Matters","Orders","Last update"]].concat(sel.map(c=>{const o=D.offices.find(x=>x.id===c.officeId),ct=D.courts.find(x=>x.id===c.courtId);return[c.id,c.title,o?o.city:"",ct?ct.city+" | "+ct.name:"",ct?ct.state:"",hcName(c.hc),c.specialNo,c.cnr,c.sections,c.accused,c.stage,c.registered,c.next,disposedOn(c),c.ioName,c.spp,c.nodal,(c.matters||[]).length,(c.orders||[]).length,c.updated]})))});
on(/^guide$/,()=>{head("How monitoring works","Case monitoring guide","login",true);
 const li=(t,b)=>`<li><div class="row"><span class="h">${t}<span class="sub">${b}</span></span></div></li>`;
 main.innerHTML=`<p class="intro">What the app does for each case, and what still needs a decision outside the app.</p><ul class="list">
 ${li("1. One record per case","RC number, special case number, court, High Court, CNR, officer in charge, Special Public Prosecutor and court nodal officer sit on one record. A completeness score shows what is missing.")}
 ${li("2. eCourts","Today an officer taps Check on eCourts (the CNR is copied), reads the status and records the check. The monitor lists cases not checked for 7 days. Automatic fetching needs approval from NIC and MeitY and a government server, which this app does not have.")}
 ${li("3. High Court matters","Each bail petition, appeal, revision, transfer petition or Supreme Court matter is linked to the trial case with its own number, bench, status and next date.")}
 ${li("4. Alerts","Hearings within 7 days (trial and High Court), passed hearing dates, no update for 30 days, chargesheet deadline, overdue actions on orders, pending appeal decisions and stuck stages. Alerts show on this page and on each case. The app cannot send notifications when it is closed.")}
 ${li("5. Office and headquarters view","The monitor shows cases, conviction rate and average time to disposal by office, court and state. Headquarters sees every office and an office sees its own. CSV download is included.")}
 ${li("6. Orders register","Every order records the forum, outcome for NIA and any action with a due date. An adverse order or an acquittal opens an appeal decision with a reviewer and a 30-day date.")}
 ${li("7. People","Special Public Prosecutor and court nodal officer are recorded per case and suggested again when the same court is picked. The court page lists those named for that court. The Gazette notifications decide which court covers which area.")}
 ${li("Today, calendar and queue","The Today page lists urgent items, hearings today and in 7 days, and deadlines. It can export every upcoming date to your phone or computer calendar with a reminder one day before. The eCourts queue walks through cases one by one so each check takes under a minute.")}
 ${li("Accused register","List each accused with status (in custody, on bail, absconding and so on), arrest date and bail date. The chargesheet deadline is then tracked for each accused in custody. The Monitor page totals them.")}
 ${li("Bulk entry and printing","Import many cases from a spreadsheet (CSV) with a check before saving. Print a one-page brief of any case for review meetings.")}
 ${li("8. Audit trail","Every edit, order, matter and appeal change is logged with the date and the signed-in ID. The server also keeps its own access log.")}
 </ul><p class="notice">Before real case data goes in: confirm whether Google Drive may hold it. If not, the same app can be hosted on a NIC or NIA server with a database. Deadlines shown are aids, not legal advice.</p>`});


/* ---------- ACCUSED, DEADLINES, CALENDAR, QUEUE, IMPORT, BRIEF ---------- */
const ACS=["In custody","On bail","Not arrested","Absconding","Proclaimed offender","Convicted","Acquitted","Discharged","Deceased"];
function stDeadlines(c){const dd=c.dlDays?+c.dlDays:0;if(!dd||isDone(c)||!["Registered","Under investigation"].includes(c.stage)||c.csFiled)return[];
 const ppl=(c.accusedList||[]).filter(x=>x.arrested&&x.status==="In custody"&&!x.csFiled);
 const src=ppl.length?ppl.map(x=>({who:x.name||"Accused",from:x.arrested})):(c.arrested?[{who:"",from:c.arrested}]:[]);
 return src.map(x=>({who:x.who,due:addD(x.from,dd),days:dayN(addD(x.from,dd))-dayN(today())}))}
function accusedSummary(c){const l=c.accusedList||[];if(!l.length)return c.accused?String(c.accused):"";const k={};l.forEach(x=>k[x.status]=(k[x.status]||0)+1);return l.length+" listed: "+Object.entries(k).map(([a,b])=>b+" "+a.toLowerCase()).join(", ")}
function accusedForm(cid,aid){const c=CASES.find(x=>x.id===cid),a=(c.accusedList||[]).find(x=>x.id===aid)||{status:"Not arrested"};
 dlg.innerHTML=`<h2>${aid?"Edit accused":"Add accused"}</h2><label>Name</label><input type="text" id="x_n" value="${esc(a.name||"")}"><label>Alias or other name</label><input type="text" id="x_a" value="${esc(a.alias||"")}">
 <label>Status</label><select id="x_s">${opts(ACS,a.status)}</select>
 <label>Arrest or first remand date</label><input type="date" id="x_r" value="${esc(a.arrested||"")}">
 <label>Chargesheet filed against this accused on</label><input type="date" id="x_c" value="${esc(a.csFiled||"")}">
 <label>Bail granted on</label><input type="date" id="x_b" value="${esc(a.bailOn||"")}"><label>Bail court</label><input type="text" id="x_bc" value="${esc(a.bailCourt||"")}">
 <label>Note</label><textarea class="plainta" id="x_o">${esc(a.note||"")}</textarea>
 <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="sv">Save</button><button class="btn" id="cx">Cancel</button>${aid?'<button class="btn danger" id="rm">Remove</button>':""}</div><div class="msg err" id="m"></div>`;
 dlg.showModal();$("cx").onclick=()=>dlg.close();
 if($("rm"))$("rm").onclick=()=>{c.accusedList=c.accusedList.filter(x=>x.id!==aid);audit(c,"Accused removed: "+(a.name||""));c.updated=today();saveCases();dlg.close();route()};
 $("sv").onclick=()=>{const n=$("x_n").value.trim();if(!n){$("m").textContent="Name is required.";return}
  const o={id:a.id||nid(),name:n,alias:$("x_a").value.trim(),status:$("x_s").value,arrested:$("x_r").value,csFiled:$("x_c").value,bailOn:$("x_b").value,bailCourt:$("x_bc").value.trim(),note:$("x_o").value.trim()};
  c.accusedList=c.accusedList||[];const i=c.accusedList.findIndex(x=>x.id===o.id);if(i>=0)c.accusedList[i]=o;else c.accusedList.push(o);
  c.accused=String(c.accusedList.length);audit(c,(i>=0?"Accused updated: ":"Accused added: ")+o.name+" ("+o.status+")");c.updated=today();saveCases();dlg.close();route()}}

/* calendar export: hearings, High Court dates, action dates, chargesheet deadlines, appeal dates */
function calEvents(cs){const ev=[],t=today();const add=(c,kind,date,text)=>{if(date&&date>=t)ev.push({uid:(c.id+"-"+kind+"-"+date).replace(/[^A-Za-z0-9-]/g,"_")+"@nia-reader",date,sum:text+": "+c.id+" "+c.title,desc:(c.sections||"")})};
 cs.forEach(c=>{if(!isDone(c))add(c,"h",c.next,"Hearing");(c.matters||[]).forEach(m=>{if(!/^(Allowed|Dismissed|Disposed)$/.test(m.status))add(c,"m"+m.id,m.next,(m.type||"HC matter")+" "+(m.no||""))});
  (c.orders||[]).forEach(o=>{if(o.action&&!o.done)add(c,"o"+o.id,o.due,"Action due ("+o.action+")")});stDeadlines(c).forEach(d=>add(c,"d"+d.who,d.due,"Chargesheet deadline"+(d.who?" ("+d.who+")":"")));
  if(c.appeal&&c.appeal.status==="Under review"&&c.appeal.due)add(c,"a",c.appeal.due,"Appeal decision due")});
 return ev.sort((a,b)=>a.date<b.date?-1:1)}
function icsDownload(cs){const ev=calEvents(cs);if(!ev.length){alert("No upcoming dates to export.");return}
 const f=s=>String(s).replace(/\\/g,"\\\\").replace(/;/g,"\;").replace(/,/g,"\\,").replace(/\r?\n/g," "),ymd=d=>d.replace(/-/g,"");
 const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//NIA Law Reader//EN","CALSCALE:GREGORIAN"];
 ev.forEach(e=>{L.push("BEGIN:VEVENT","UID:"+e.uid,"DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z","DTSTART;VALUE=DATE:"+ymd(e.date),"DTEND;VALUE=DATE:"+ymd(addD(e.date,1)),"SUMMARY:"+f(e.sum),"DESCRIPTION:"+f(e.desc),"BEGIN:VALARM","ACTION:DISPLAY","DESCRIPTION:"+f(e.sum),"TRIGGER:-P1D","END:VALARM","END:VEVENT")});
 L.push("END:VCALENDAR");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([L.join("\r\n")],{type:"text/calendar"}));a.download="nia-dates-"+today()+".ics";document.body.appendChild(a);a.click();a.remove()}

/* today view */
on(/^today$/,()=>{head("Today","Hearings, deadlines and actions","login",true);
 if(SERVER()&&!SES){L.hash="#/login";return}
 const t=today(),al=allAlerts(CASES).filter(a=>a.lv>=2),hr=hearings(7),tod=hr.filter(h=>h.date===t),wk=hr.filter(h=>h.date>t);
 const urgent=al.filter(a=>a.lv===3).sort((a,b)=>(a.dt||"")<(b.dt||"")?-1:1),soon=al.filter(a=>a.lv===2&&!["hearing","matter"].includes(a.k)).sort((a,b)=>(a.dt||"")<(b.dt||"")?-1:1);
 const hrow=h=>row("case/"+enc(h.c.id),"",h.c.id+" | "+h.c.title,h.label+" | "+fmtD(h.date)," "+chip(h.stage));
 main.innerHTML=`<div class="stats"><span class="chip al-3">Urgent <b>${urgent.length}</b></span> <span class="chip s-trial">Hearings today <b>${tod.length}</b></span> <span class="chip s-early">Hearings in 7 days <b>${wk.length}</b></span></div>
 <div class="btnrow"><button class="btn" id="td_ics">Add dates to my calendar (.ics)</button><a class="btn" href="#/ecq">eCourts check queue</a><a class="btn" href="#/monitor">Monitor</a></div>
 <div class="gh">Urgent (${urgent.length})</div>${urgent.length?`<ul class="list">${urgent.map(alRow).join("")}</ul>`:empty("Nothing urgent.")}
 <div class="gh">Hearings today (${tod.length})</div>${tod.length?`<ul class="list">${tod.map(hrow).join("")}</ul>`:empty("No hearings today.")}
 <div class="gh">Hearings in the next 7 days (${wk.length})</div>${wk.length?`<ul class="list">${wk.map(hrow).join("")}</ul>`:empty("None.")}
 <div class="gh">Deadlines and actions coming up (${soon.length})</div>${soon.length?`<ul class="list">${soon.map(alRow).join("")}</ul>`:empty("None.")}
 <p class="soft" style="font-size:13px">The calendar file adds every upcoming date with a reminder one day before. Open it on the phone or computer to add the dates to your calendar app.</p>`;
 $("td_ics").onclick=()=>icsDownload(CASES)});

/* eCourts check queue */
let ECQ={ids:[],i:0};
on(/^ecq$/,()=>{head("eCourts check queue","Check each case, then record it","login",true);
 if(SERVER()&&!SES){L.hash="#/login";return}
 if(!ECQ.ids.length||ECQ.i>=ECQ.ids.length)ECQ={ids:CASES.filter(c=>!isDone(c)&&c.cnr).sort((a,b)=>(a.ecChecked||"")<(b.ecChecked||"")?-1:1).map(c=>c.id),i:0};
 const c=CASES.find(x=>x.id===ECQ.ids[ECQ.i]);
 if(!c){main.innerHTML=empty("Nothing to check. Active cases with a CNR number will appear here.");ECQ={ids:[],i:0};return}
 main.innerHTML=`<div class="stats"><span class="chip s-early">${ECQ.i+1} of ${ECQ.ids.length}</span></div>
 ${kv([["Case",c.id+" | "+c.title],["CNR",c.cnr],["Court",(D.courts.find(x=>x.id===c.courtId)||{}).name||""],["Last checked",c.ecChecked?fmtD(c.ecChecked):"never"],["Next hearing on record",fmtD(c.next)],["Stage on record",c.stage]])}
 <div class="btnrow"><button class="btn primary" id="q_open">Copy CNR and open eCourts</button></div>
 <p class="soft" style="font-size:13px">On eCourts choose Case Status, then CNR Number, and paste. Note the stage and next date it shows, then record them below.</p>
 <label>Stage now</label><select id="q_g">${opts(STAGES,c.stage)}</select><label>Next hearing date now</label><input type="date" id="q_n" value="${esc(c.next||"")}">
 <label>Note (order or business on the last date)</label><textarea class="plainta" id="q_o"></textarea>
 <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="q_s">Save and next</button><button class="btn" id="q_k">Skip</button><button class="btn" id="q_d">Stop</button></div>`;
 $("q_open").onclick=()=>{try{navigator.clipboard.writeText(c.cnr)}catch(e){}window.open("https://services.ecourts.gov.in/ecourtindia_v6/","_blank","noopener")};
 const next=()=>{ECQ.i++;route()};
 $("q_s").onclick=()=>{const p=c.stage;c.stage=$("q_g").value;c.next=$("q_n").value;c.ecChecked=today();c.updated=today();if(isDone(c)&&!c.disposed)c.disposed=today();audit(c,"eCourts check"+($("q_o").value.trim()?": "+$("q_o").value.trim():".")+(p!==c.stage?" Stage changed.":""));saveCases();next()};
 $("q_k").onclick=next;$("q_d").onclick=()=>{ECQ={ids:[],i:0};L.hash="#/login"}});

/* CSV import */
function parseCSV(t){const rows=[];let r=[],f="",q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=ch}else if(ch==='"')q=true;else if(ch===","){r.push(f);f=""}else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&t[i+1]==="\n")i++;r.push(f);f="";if(r.some(x=>x.trim()))rows.push(r);r=[]}else f+=ch}r.push(f);if(r.some(x=>x.trim()))rows.push(r);return rows}
const CSVH=["case_number","title","office","court","sections","accused_count","registered","stage","next_hearing","cnr","special_case_no","officer_in_charge","spp","nodal_officer"];
function normDate(v){v=String(v||"").trim();if(!v)return"";let m=/^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);if(!m){m=/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(v);if(m)m=[0,m[3],m[2],m[1]]}if(!m)return null;const s=m[1]+"-"+String(m[2]).padStart(2,"0")+"-"+String(m[3]).padStart(2,"0");const dt=new Date(s+"T00:00:00Z");return isNaN(dt)||dt.toISOString().slice(0,10)!==s?null:s}
function importCases(text){const rows=parseCSV(text.replace(/^\ufeff/,""));if(rows.length<2)return{ok:[],err:["The file has no data rows."]};
 const h=rows[0].map(x=>x.trim().toLowerCase().replace(/\s+/g,"_")),ix=k=>h.indexOf(k),ok=[],err=[],seen=new Set(CASES.map(c=>c.id));
 if(ix("case_number")<0||ix("title")<0)return{ok:[],err:["The first row must have the columns case_number and title. Download the template to see all columns."]};
 rows.slice(1).forEach((r,n)=>{const g=k=>ix(k)<0?"":String(r[ix(k)]||"").trim(),L=n+2,id=g("case_number"),e=[];
  if(!id)e.push("case number missing");if(!g("title"))e.push("title missing");if(id&&seen.has(id))e.push("case number already exists");
  const ov=g("office").toLowerCase(),of=D.offices.find(o=>o.id.toLowerCase()===ov||o.city.toLowerCase()===ov||o.name.toLowerCase()===ov);
  if(!of)e.push("office not recognised ("+g("office")+")");else if(!canOffice(of.id))e.push("you cannot add cases for "+of.city);
  let ct=null;if(g("court")){const cv=g("court").toLowerCase();ct=D.courts.find(x=>x.id===cv)||D.courts.find(x=>x.city.toLowerCase()===cv)||null;if(!ct)e.push("court not recognised ("+g("court")+")")}
  const reg=normDate(g("registered")),nx=normDate(g("next_hearing"));if(reg===null)e.push("registered date not valid");if(nx===null)e.push("next hearing date not valid");
  let st=g("stage");if(st){const f=STAGES.find(x=>x.toLowerCase()===st.toLowerCase());if(!f)e.push("stage not recognised ("+st+")");st=f||""}
  if(e.length){err.push("Row "+L+(id?" ("+id+")":"")+": "+e.join("; "));return}
  seen.add(id);const o={id,title:g("title"),officeId:of.id,courtId:ct?ct.id:"",hc:ct?ct.hc:"",sections:g("sections"),accused:g("accused_count"),registered:reg||today(),stage:st||"Registered",next:nx||"",cnr:g("cnr"),specialNo:g("special_case_no"),ioName:g("officer_in_charge"),spp:g("spp"),nodal:g("nodal_officer"),updated:today(),history:[]};
  audit(o,"Imported from CSV.");ok.push(o)});
 return{ok,err}}
function importForm(){dlg.innerHTML=`<h2>Import cases from CSV</h2><p class="soft">One row per case. Download the template, fill it in a spreadsheet, save as CSV and choose it here. You see a check before anything is saved.</p>
 <div class="btnrow"><button class="btn" id="im_t">Download template</button></div><label>CSV file</label><input type="file" id="im_f" accept=".csv,text/csv"><div id="im_r"></div>
 <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="im_s" disabled>Import</button><button class="btn" id="cx">Close</button></div>`;
 dlg.showModal();$("cx").onclick=()=>dlg.close();let res=null;
 $("im_t").onclick=()=>csvDownload([CSVH,["RC-01/2026/NIA/DLI","Example case","delhi","delhi-ph","UA(P) Act s.16","3","2026-01-10","Under investigation","2026-11-20","DLCT010000012026","NIA Special Case 01/2026","Insp A","SPP B","Nodal C"]]);
 $("im_f").onchange=async e=>{const f=e.target.files[0];if(!f)return;res=importCases(await f.text());
  $("im_r").innerHTML=`<p><b>${res.ok.length}</b> case${res.ok.length===1?"":"s"} ready to import. <b>${res.err.length}</b> row${res.err.length===1?"":"s"} with problems.</p>`+(res.err.length?`<ul style="font-size:13px;max-height:200px;overflow:auto">${res.err.slice(0,50).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:"");$("im_s").disabled=!res.ok.length};
 $("im_s").onclick=()=>{if(!res||!res.ok.length)return;res.ok.forEach(o=>CASES.push(o));if(!saveCases())alert("Could not save on this device.");dlg.close();route()}}

/* printable brief */
on(/^brief\/(.+)$/,id=>{const c=CASES.find(x=>x.id===id);if(!c)return L.hash="#/login";head("Case brief",c.id,"login",true);
 const o=D.offices.find(x=>x.id===c.officeId),ct=D.courts.find(x=>x.id===c.courtId),al=alerts(c).filter(a=>a.k!=="missing");
 const ul=(a,f)=>a.length?`<ul>${a.map(f).join("")}</ul>`:"<p>None.</p>";
 main.innerHTML=`<div class="btnrow noprint"><button class="btn primary" id="pr">Print or save as PDF</button></div><div class="brief"><h2>${esc(c.id)}</h2><h3>${esc(c.title)}</h3><p>Printed ${esc(fmtD(today()))}. Status as last updated on ${esc(fmtD(c.updated))}.</p>
 ${kv([["Stage",c.stage],["Office",o?o.city+" | "+o.name:""],["Court",ct?ct.city+" | "+ct.name:""],["High Court",hcName(c.hc)],["Special case number",c.specialNo||""],["CNR",c.cnr||""],["Sections",c.sections||""],["Registered",fmtD(c.registered)],["Next hearing",fmtD(c.next)],["Disposed on",fmtD(disposedOn(c))],["Officer in charge",[c.ioName,c.ioContact].filter(Boolean).join(", ")],["Special Public Prosecutor",[c.spp,c.sppContact].filter(Boolean).join(", ")],["Court nodal officer",[c.nodal,c.nodalContact].filter(Boolean).join(", ")],["Accused",accusedSummary(c)],["Notes",c.notes||""]])}
 <h3>Alerts</h3>${ul(al,a=>`<li>${esc(a.tx)}</li>`)}<h3>Accused</h3>${ul(c.accusedList||[],x=>`<li>${esc(x.name)}${x.alias?" ("+esc(x.alias)+")":""}: ${esc(x.status)}${x.arrested?", arrested "+esc(fmtD(x.arrested)):""}${x.bailOn?", bail "+esc(fmtD(x.bailOn)):""}${x.note?". "+esc(x.note):""}</li>`)}
 <h3>High Court and Supreme Court matters</h3>${ul(c.matters||[],m=>`<li>${esc(m.type||"")} ${esc(m.no||"")} | ${esc(hcName(m.forum))} | ${esc(m.status||"")}${m.next?" | next "+esc(fmtD(m.next)):""}${m.note?". "+esc(m.note):""}</li>`)}
 <h3>Orders and judgements</h3>${ul(c.orders||[],x=>`<li>${esc(fmtD(x.date))} | ${esc(x.forum||"")} | ${esc(x.type||"")}${x.outcome?" | "+esc(x.outcome):""}. ${esc(x.summary||"")}${x.action?" Action: "+esc(x.action)+(x.due?" by "+esc(fmtD(x.due)):"")+(x.done?" (done)":""):""}</li>`)}
 ${c.appeal?`<h3>Appeal decision</h3><p>${esc(c.appeal.status)}${c.appeal.reviewer?", reviewer "+esc(c.appeal.reviewer):""}${c.appeal.due?", decide by "+esc(fmtD(c.appeal.due)):""}${c.appeal.no?", appeal "+esc(c.appeal.no):""}. ${esc(c.appeal.note||"")}</p>`:""}
 <h3>Audit trail</h3>${ul([...(c.history||[])].reverse(),h=>`<li>${esc(fmtD(h.ts))} | ${esc(h.stage)}${h.by?" | "+esc(h.by):""}: ${esc(h.note||"")}</li>`)}</div>`;
 $("pr").onclick=()=>window.print()});

/* ---------- COURTS ---------- */
const upcoming=(days,f)=>{const t=today(),e=new Date(Date.now()+days*864e5).toISOString().slice(0,10);return CASES.filter(c=>c.next&&c.next>=t&&c.next<=e&&(!f||f(c))).sort((a,b)=>a.next<b.next?-1:1)};
on(/^courts$/,()=>{head("NIA special courts","Courts and live case status","courts",false);
 const up=hearings(14);
 main.innerHTML=`<div class="gh">Hearings in the next 14 days</div>`+(up.length?`<ul class="list">${up.map(h=>row("case/"+enc(h.c.id),"",h.c.id+" | "+h.c.title,fmtD(h.date)+" | "+h.label," "+chip(h.stage))).join("")}</ul>`:empty("No hearings scheduled. Add hearing dates to cases to see them here."))+`<div class="gh">Courts</div>`;
 filterBox("Search court, city or state",()=>{const q=Q.toLowerCase();const it=D.courts.filter(c=>!q||(c.name+c.city+c.state).toLowerCase().includes(q));
  $("res").innerHTML=`<ul class="list">${it.map(c=>{const n=casesOf(x=>x.courtId===c.id);return row("court/"+enc(c.id),"",c.city+" | "+c.name,c.state+" | "+n.length+" case"+(n.length===1?"":"s"))}).join("")}</ul>`});
 main.insertAdjacentHTML("beforeend",`<p class="notice">${D.courts.length} courts listed. Entries are taken from the Gazette notifications under section 11 of the NIA Act (2019 to 2026) and from 2026 press reports. Notifications are replaced from time to time, so check the latest Gazette before relying on an entry. Several states are not covered yet.</p>`)});
on(/^court\/(.+)$/,id=>{const c=D.courts.find(x=>x.id===id);if(!c)return;head(c.city,c.name,"courts",true);
 const cs=casesOf(x=>x.courtId===id),by={};cs.forEach(x=>by[x.stage]=(by[x.stage]||0)+1);
 main.innerHTML=kv([["Court",c.name],["Place",c.city+", "+c.state],["Jurisdiction",c.jurisdiction||""],["Notified",c.notified||""],["Note",c.note||""],["Source",c.source||""]])+
 `<div class="plain">Status here is entered by hand and shows the date of the last update. Automatic live status needs a server feed (for example from eCourts), which this offline app does not have.</div>
 <div class="stats" style="margin-top:12px">${Object.entries(by).map(([k,v])=>`${chip(k)} <b>${v}</b>`).join(" &nbsp; ")}</div>
 <div class="gh">Prosecutors and nodal officers named on cases here</div>${(()=>{const m={};cs.forEach(x=>{[["Special Public Prosecutor",x.spp,x.sppContact],["Court nodal officer",x.nodal,x.nodalContact]].forEach(r=>{if(r[1]){const k=r[0]+"|"+r[1];(m[k]=m[k]||{r:r[0],n:r[1],c:r[2]||"",k:0}).k++}})});const v=Object.values(m);return v.length?`<ul class="list">${v.map(p=>`<li><div class="row"><span class="h">${esc(p.n)}<span class="sub">${esc(p.r)}${p.c?" | "+esc(p.c):""} | ${p.k} case${p.k===1?"":"s"}</span></span></div></li>`).join("")}</ul>`:empty("None recorded yet. Add them on the case form.")})()}
 <p class="soft" style="font-size:13px">High Court: ${esc(hcName(c.hc)||"not set")}</p>
 <div class="gh">Cases in this court (${cs.length})</div>`;
 main.insertAdjacentHTML("beforeend",cs.length?`<ul class="list">${cs.map(x=>row("case/"+enc(x.id),"",x.id+" | "+x.title,(x.next?"Next hearing "+fmtD(x.next)+" | ":"")+"Updated "+fmtD(x.updated)," "+chip(x.stage))).join("")}</ul>`:empty(SERVER()&&!SES?"Sign in as an officer (Offices tab) to see cases.":"No cases linked to this court. Add a case from an office page and pick this court."))});


/* ---------- ADMIN ---------- */
on(/^admin$/,async()=>{head("Manage officers","Administrator","login",true);
 if(!isAdmin()){main.innerHTML=empty("Administrators only.");return}
 main.innerHTML=`<div class="btnrow"><button class="btn primary" id="au_n">Add officer</button><button class="btn" id="au_l">Activity log</button></div><div id="au_r">${empty("Loading...")}</div>`;
 $("au_n").onclick=()=>userForm(null);$("au_l").onclick=showLog;
 try{const r=await api("listUsers");const off=i=>{const o=D.offices.find(x=>x.id===i);return o?o.city:i};
  $("au_r").innerHTML=`<ul class="list">${r.users.map(u=>`<li><a class="row" href="#u" data-u="${esc(u.id)}"><span class="h">${esc(u.id)} | ${esc(u.name||"")}${u.active?"":' <span class="badge">Inactive</span>'}<span class="sub">${u.role==="admin"?"Administrator, all offices":esc(off(u.office)||"No office")+(u.extra?" + "+esc(u.extra.split(",").map(off).join(", "))+(u.until?" until "+esc(u.until):""):"")}</span></span><span class="chev">&#8250;</span></a></li>`).join("")}</ul>`;
  $("au_r").querySelectorAll("a[data-u]").forEach(a=>a.onclick=e=>{e.preventDefault();e.stopPropagation();userForm(r.users.find(x=>x.id===a.dataset.u))},true)}
 catch(e){$("au_r").innerHTML=empty(esc(e.message))}});
function userForm(u){const n=!u;u=u||{role:"officer",active:true,extra:""};const ex=String(u.extra||"").split(",");
 dlg.innerHTML=`<h2>${n?"Add officer":"Edit officer"}</h2><label>ID</label><input type="text" id="u_i" value="${esc(u.id||"")}" ${n?"":"disabled"} placeholder="e.g. NIA1234">
 <label>Name</label><input type="text" id="u_n" value="${esc(u.name||"")}"><label>Role</label><select id="u_r">${opts(["officer","admin"],u.role)}</select>
 <label>Home office</label><select id="u_o"><option value="">None</option>${opts(D.offices,u.office,o=>[o.id,o.city+" | "+o.name])}</select>
 <label>Extra offices (charge allocation)</label><div style="max-height:150px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:6px">${D.offices.map(o=>`<label style="display:block;margin:0"><input type="checkbox" class="u_x" value="${esc(o.id)}" ${ex.includes(o.id)?"checked":""}> ${esc(o.city)} | ${esc(o.name)}</label>`).join("")}</div>
 <label>Extra access until (optional)</label><input type="date" id="u_u" value="${esc(u.until||"")}">
 <label><input type="checkbox" id="u_a" ${u.active!==false?"checked":""}> Active</label>
 <label>${n?"Starting PIN (at least 8 characters)":"New PIN (leave blank to keep)"}</label><input type="text" id="u_p" autocomplete="off">
 <div class="btnrow" style="margin-top:12px"><button class="btn primary" id="u_s">Save</button>${n?"":'<button class="btn danger" id="u_d">Delete</button>'}<button class="btn" id="u_c">Cancel</button></div><div class="msg" id="u_m"></div>`;
 dlg.showModal();$("u_c").onclick=()=>dlg.close();
 $("u_s").onclick=async()=>{try{await api("saveUser",{pin:$("u_p").value,user:{id:n?$("u_i").value:u.id,name:$("u_n").value,role:$("u_r").value,office:$("u_o").value,extra:[...document.querySelectorAll(".u_x:checked")].map(x=>x.value),until:$("u_u").value,active:$("u_a").checked}});dlg.close();route()}catch(e){$("u_m").className="msg err";$("u_m").textContent=e.message}};
 const d=$("u_d");if(d)d.onclick=async()=>{if(confirm("Delete this officer?"))try{await api("deleteUser",{id:u.id});dlg.close();route()}catch(e){$("u_m").className="msg err";$("u_m").textContent=e.message}}}
async function showLog(){try{const r=await api("listLog",{limit:100});dlg.innerHTML=`<h2>Activity log</h2><div style="max-height:60vh;overflow:auto;font-size:13px">${r.log.map(l=>`<p style="margin:0 0 6px"><b>${esc(String(l.time).slice(0,16).replace("T"," "))}</b> ${esc(l.user)} | ${esc(l.action)}<br><span class="soft">${esc(l.detail||"")}</span></p>`).join("")}</div><div class="btnrow"><button class="btn" id="lg_x">Close</button></div>`;dlg.showModal();$("lg_x").onclick=()=>dlg.close()}catch(e){alert(e.message)}}

/* ---------- DATA MENU ---------- */
$("menuBtn").onclick=()=>{dlg.innerHTML=`<h2>Data</h2><p>Load official text, office lists, court lists, treaties or judgements as JSON. Imported data replaces the matching parts and stays on this device.</p>
 ${SEED.meta&&SEED.meta.backend?"":`<label>Officer server address (Google Apps Script web app URL)</label><input type="text" id="su" value="${esc(store.get("nia-server")||"")}" placeholder="https://script.google.com/macros/s/.../exec"><div class="btnrow"><button class="btn" id="ss">Save address</button></div>`}<input type="file" id="fl" accept=".json,application/json"><label>Or paste JSON</label><textarea id="pj"></textarea>
 <div class="btnrow" style="margin-top:10px"><button class="btn primary" id="ap">Load</button><button class="btn" id="tp">Download template</button><button class="btn" id="bc">Back up cases</button><button class="btn" id="rc">Restore cases</button></div>
 <div class="btnrow"><button class="btn danger" id="rs">Reset to built-in data</button><button class="btn" id="cl">Close</button></div><div class="msg" id="mg"></div>`;
 dlg.showModal();const say=(t,ok)=>{$("mg").textContent=t;$("mg").className="msg "+(ok?"ok":"err")};
 const load=t=>{try{const o=JSON.parse(t);if(o.cases&&!SERVER()){CASES=o.cases;saveCases()}merge(o);const keep=store.get("nia-data-v2")||{};
  ["docs","groups"].forEach(k=>{if(o[k])keep[k]=Object.assign(keep[k]||{},o[k])});["maps","judgments","offices","courts","intl"].forEach(k=>{if(o[k])keep[k]=o[k]});
  store.set("nia-data-v2",keep);say("Loaded.",1);route()}catch(e){say("Could not load: "+e.message)}};
 $("ap").onclick=()=>load($("pj").value);$("fl").onchange=e=>e.target.files[0]&&e.target.files[0].text().then(load);
 $("cl").onclick=()=>dlg.close();
 if($("ss"))$("ss").onclick=()=>{const v=$("su").value.trim();if(v&&!/^https:\/\/script\.google\.com\//.test(v)&&!confirm("This does not look like a Google Apps Script address. Use it anyway?"))return;if(v)store.set("nia-server",v);else store.del("nia-server");location.reload()};
 const dl=(name,obj)=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:"application/json"}));a.download=name;a.click()};
 $("tp").onclick=()=>dl("nia-template.json",{docs:{example:{id:"example",title:"The Example Act, 2000",year:2000,kind:"act",sections:[{no:"1",heading:"Short title",text:"Text here",amendments:[{year:2019,by:"Amendment Act",note:"What changed"}]}]}},groups:{sched:[...D.groups.sched,"example"]},
  offices:[{id:"delhi",name:"NIA Headquarters",city:"New Delhi",state:"Delhi",address:"",phone:"",email:"",jurisdiction:""}],courts:[{id:"c1",name:"Special Court",city:"City",state:"State",jurisdiction:"",notified:"",note:"",source:""}],
  intl:[{id:"mlat",title:"MLATs",desc:"",items:[{id:"m1",title:"Treaty title",country:"Country",date:"",status:"",link:""}]}],judgments:[{id:"j99",cat:"terror",title:"A v. B",court:"Supreme Court",year:2020,topic:"",summary:"",verified:true}]});
 $("bc").onclick=()=>{if(SERVER()&&!isAdmin()){say("Only an administrator can export cases.");return}dl("nia-cases-backup.json",{cases:CASES})};$("rc").onclick=()=>say("Use the file picker above with a cases backup file, then press Load or choose the file.",1);
 $("rs").onclick=()=>{if(confirm(SERVER()?"Remove imported data saved on this device? Cases on the server are not affected.":"Remove imported data and all cases saved on this device?")){store.del("nia-data-v2");store.del("nia-cases-v2");D=JSON.parse(JSON.stringify(SEED));if(!SERVER())CASES=SEED.cases;dlg.close();route()}}};
if(SERVER()&&SES){loadCases().then(()=>{idleArm();route()}).catch(()=>{SES=null;ssave();route()})}
route();

if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"))navigator.serviceWorker.register("sw.js").catch(function(){});
