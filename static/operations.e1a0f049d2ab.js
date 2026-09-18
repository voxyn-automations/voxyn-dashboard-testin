"use strict";
const statuses=new Set(["HEALTHY","READY","ACTIVE","PAUSED","ACTION_REQUIRED","DEGRADED","FAILED","UNKNOWN"]);
const terminalScheduleStatuses=new Set(["POSTED","MISSED","AUTH_REQUIRED","FAILED"]);
const esc=value=>String(value??"—").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const label=value=>String(value).replaceAll("_"," ").toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const badge=value=>'<span class="status badge status-'+esc(String(value).toLowerCase().replaceAll("_","-"))+'">'+esc(String(value).replaceAll("_"," "))+'</span>';
let currentTimezone="",snapshot=null,selectedRange="today",customRange=null,drawerReturnFocus=null;
function setDrawer(open){const drawer=document.querySelector("#dashboard-navigation"),backdrop=document.querySelector("#nav-backdrop"),button=document.querySelector("#mobile-menu");drawer.classList.toggle("open",open);backdrop.hidden=!open;document.body.classList.toggle("drawer-open",open);button.setAttribute("aria-expanded",String(open));if(open){drawerReturnFocus=document.activeElement;document.querySelector("#drawer-close").focus()}else if(drawerReturnFocus){drawerReturnFocus.focus();drawerReturnFocus=null}}

function zonedParts(value,timezone){
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(value);
  const get=type=>parts.find(part=>part.type===type)?.value;
  return {date:`${get("year")}-${get("month")}-${get("day")}`,minutes:Number(get("hour"))*60+Number(get("minute"))};
}
function buyerDate(value,timezone){return zonedParts(new Date(value),timezone).date}
function shiftDate(iso,days){const value=new Date(iso+"T12:00:00Z");value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10)}
function metric(value){return value===null||value===undefined?"—":value}
function rangeRows(data){
  const rows=Array.isArray(data.daily_history)?data.daily_history:[];
  if(selectedRange==="all")return rows;
  if(selectedRange==="custom"&&customRange)return rows.filter(row=>row.date>=customRange.from&&row.date<=customRange.to);
  const today=buyerDate(new Date(),data.brand.timezone),days=Number(selectedRange)||1,from=shiftDate(today,1-days);
  return rows.filter(row=>row.date>=from&&row.date<=today);
}
function totals(rows){
  const result={active_days:rows.filter(row=>["generated","posted","ready","processing","failed","auth_required","missed"].some(key=>Number(row[key]||0)>0)).length};
  for(const key of ["generated","posted","ready","processing","failed","auth_required","missed"])result[key]=rows.reduce((sum,row)=>sum+Number(row[key]||0),0);
  result.expected=rows.some(row=>row.expected===null||row.expected===undefined)?null:rows.reduce((sum,row)=>sum+Number(row.expected),0);
  return result;
}
function metricCards(values,synced=true,includeDays=false){
  const metrics=[];
  if(includeDays)metrics.push(["Active Days",values.active_days]);
  metrics.push(["Expected",values.expected],["Generated",values.generated],["Posted",values.posted],["Ready",values.ready],["Processing",values.processing],["Failed",values.failed],["Action Required",values.auth_required],["Missed",values.missed]);
  const icons=["◇","✦","✓","●","◆","!","!","◷","◫"];
  return metrics.map(([name,value],index)=>'<article class="kpi"><div class="kpi-icon">'+icons[index]+'</div><div><span>'+esc(name)+'</span><strong>'+esc(synced?metric(value):"—")+'</strong></div></article>').join("");
}
function periodName(){
  if(selectedRange==="today")return "Performance · Today";
  if(selectedRange==="all")return "Performance · All Time";
  if(selectedRange==="custom"&&customRange)return `Performance · ${customRange.from} — ${customRange.to}`;
  return `Performance · Last ${selectedRange} Days`;
}
function renderHistory(data,rows){
  const historical=selectedRange!=="today",available=Array.isArray(data.daily_history);
  document.querySelector("#overview").classList.toggle("historical",historical);
  document.querySelector("#today-view").hidden=historical;
  document.querySelector("#historical-view").hidden=!historical;
  document.querySelector("#schedule-card").hidden=historical;
  document.querySelector("#history-eyebrow").textContent=historical?"DAILY PERFORMANCE":"TODAY";
  document.querySelector("#history-title").textContent=historical?"Publishing history":"Today's queue";
  document.querySelector("#history-description").textContent=historical?"Buyer-local daily aggregates only. No captions, identifiers, or sources.":"Schedules and statuses only in the public view.";
  if(!historical)return;
  const unavailable=document.querySelector("#history-unavailable"),wrap=document.querySelector("#daily-history-wrap"),mobile=document.querySelector("#mobile-daily-history");
  unavailable.hidden=available;
  if(!available){unavailable.textContent="Historical analytics available after the next synchronization.";wrap.hidden=true;mobile.hidden=true;return}
  wrap.hidden=false;mobile.hidden=false;
  const ordered=[...rows].sort((a,b)=>b.date.localeCompare(a.date));
  const empty=data.daily_history.length?"No synchronized activity exists for this period.":"No production history yet.";
  document.querySelector("#daily-history").innerHTML=ordered.length?ordered.map(row=>`<tr><td>${esc(new Date(row.date+"T12:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}))}</td><td>${metric(row.expected)}</td><td>${metric(row.generated)}</td><td>${metric(row.posted)}</td><td>${metric(row.ready)}</td><td>${metric(row.processing)}</td><td>${metric(row.failed)}</td><td>${metric(row.auth_required)}</td><td>${metric(row.missed)}</td></tr>`).join(""):`<tr><td colspan="9" class="table-empty">${empty}</td></tr>`;
  mobile.innerHTML=ordered.length?ordered.map(row=>`<article class="history-card"><div class="history-card-head"><h3>${esc(row.date)}</h3><strong>${metric(row.posted)} posted</strong></div><p class="history-meta">Expected ${metric(row.expected)} · Generated ${metric(row.generated)}</p><p class="history-meta">Ready ${metric(row.ready)} · Processing ${metric(row.processing)}</p><p class="history-meta">Failed ${metric(row.failed)} · Action Required ${metric(row.auth_required)} · Missed ${metric(row.missed)}</p></article>`).join(""):`<div class="empty-state">${empty}</div>`;
}
function renderPeriod(data){
  const rows=rangeRows(data),historical=selectedRange!=="today",values=historical?totals(rows):{expected:data.today.configured,...data.today};
  document.querySelector("#period-title").textContent=periodName();
  document.querySelector("#summary").innerHTML=metricCards(values,!!data.updated_at,historical&&selectedRange==="all");
  document.querySelectorAll("[data-range]").forEach(button=>{const active=button.dataset.range===selectedRange;button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active))});
  document.querySelector("#custom-range").hidden=selectedRange!=="custom";
  renderHistory(data,rows);
}
function scheduleState(data,now=new Date()){
  const schedule=Array.isArray(data.schedule)?data.schedule:[];
  if(!schedule.length)return {kind:"EMPTY"};
  const current=zonedParts(now,data.brand.timezone),snapshotDay=data.updated_at?buyerDate(data.updated_at,data.brand.timezone):current.date;
  if(snapshotDay!==current.date)return {kind:"WAITING",next:schedule[0]};
  const rows=schedule.map((row,index)=>({...row,index,minutes:Number(row.local_time.slice(0,2))*60+Number(row.local_time.slice(3,5))})).sort((a,b)=>a.minutes-b.minutes||a.index-b.index);
  const processing=rows.find(row=>row.status==="PROCESSING");
  if(processing)return {kind:"PROCESSING",row:processing};
  const grace=Number(data.publisher_grace_minutes)||0;
  const active=rows.filter(row=>!terminalScheduleStatuses.has(row.status)&&row.minutes<=current.minutes&&current.minutes<=row.minutes+grace);
  if(active.length)return {kind:"ACTIVE",row:active[0]};
  const future=rows.find(row=>!terminalScheduleStatuses.has(row.status)&&row.minutes>current.minutes);
  if(future)return {kind:"FUTURE",row:future};
  return {kind:"COMPLETE",next:rows[0],unresolved:rows.filter(row=>row.status==="READY").length};
}
function renderSchedule(data,now=new Date()){
  const state=scheduleState(data,now),blocked=!!data.publishing_block,mode=data.evidence?.publisher_mode||"LIVE",verified=data.evidence?.linkedin_access==="VERIFIED",eyebrow=document.querySelector("#schedule-eyebrow"),target=document.querySelector("#next-post");
  const capability=blocked?'<p class="schedule-capability blocked">Publishing: <strong>BLOCKED BY AUTH</strong></p>':mode==="DISABLED"?'<p class="schedule-capability paused">Publishing: <strong>PAUSED BY CONFIGURATION</strong></p>':mode==="DRY_RUN"?'<p class="schedule-capability paused">Publishing: <strong>DRY RUN — NO LIVE WRITES</strong></p>':verified?'<p class="schedule-capability available">Publishing: <strong>AVAILABLE</strong></p>':'<p class="schedule-capability paused">Publishing: <strong>AWAITING RUNTIME VERIFICATION</strong></p>';
  if(state.kind==="EMPTY"){eyebrow.textContent="CURRENT SCHEDULE";target.innerHTML='<h2>—</h2><p>Waiting for synchronized buyer schedule.</p>';return}
  if(state.kind==="WAITING"){eyebrow.textContent="CURRENT SCHEDULE";target.innerHTML='<h2>Waiting for today</h2><p>Today’s synchronized queue has not arrived yet.</p>';return}
  if(state.kind==="PROCESSING"){eyebrow.textContent="CURRENT PUBLISHING ACTIVITY";target.innerHTML=`<h2>${esc(state.row.local_time)}</h2><p>${esc(state.row.slot)}</p>${badge(state.row.status)}${capability}`;return}
  if(state.kind==="ACTIVE"){eyebrow.textContent="CURRENT PUBLISHING WINDOW";target.innerHTML=`<h2>${esc(state.row.local_time)}</h2><p>${esc(state.row.slot)}</p><p>Queue status: ${badge(state.row.status)}</p>${capability}`;return}
  if(state.kind==="FUTURE"){eyebrow.textContent="NEXT SCHEDULED SLOT";target.innerHTML=`<h2>${esc(state.row.local_time)}</h2><p>${esc(state.row.slot)}</p><p>Queue status: ${badge(state.row.status)}</p>${capability}`;return}
  eyebrow.textContent="TODAY'S SCHEDULE COMPLETE";
  const unresolved=state.unresolved?`<p>${state.unresolved} READY item${state.unresolved===1?"":"s"} remain.</p>`:"<p>No future production slots today.</p>";
  target.innerHTML=`<h2>Schedule complete</h2>${unresolved}<p>Next scheduled window: Tomorrow ${esc(state.next.local_time)}</p>${blocked?capability:""}`;
}
function clock(){if(!currentTimezone)return;document.querySelector("#live-time").textContent=new Intl.DateTimeFormat("en-US",{timeZone:currentTimezone,hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true}).format(new Date());document.querySelector("#live-date").textContent=new Intl.DateTimeFormat("en-US",{timeZone:currentTimezone,dateStyle:"full"}).format(new Date())}
function syncThemeButton(){const dark=document.documentElement.dataset.theme==="dark",button=document.querySelector("#theme-toggle");button.setAttribute("aria-pressed",String(dark));button.querySelector("span").textContent=dark?"☾":"☀";button.querySelector("strong").textContent=dark?"Dark":"Light"}
function render(data){
  if(![1,2,3].includes(data.schema_version)||!data.brand||!Array.isArray(data.queue))throw new Error("snapshot schema");
  data.evidence=data.evidence||{safe_launch_verified:false,linkedin_access:data.publishing_block?"ACTION_REQUIRED":"UNKNOWN",publisher_mode:data.system.publisher==="PAUSED"?"DISABLED":"LIVE"};
  const query=selector=>document.querySelector(selector),synced=!!data.updated_at,publicView=data.profile==="public_pages";snapshot=data;currentTimezone=synced?data.brand.timezone:"";
  ["#brand","#mobile-brand","#footer-brand"].forEach(selector=>query(selector).textContent=data.brand.name);query(".logo span").textContent=data.brand.name.slice(0,1);document.title=data.brand.name+" Operations";
  query("#timezone").textContent=currentTimezone||"Not yet synchronized";query("#updated").textContent=synced?"Updated "+new Date(data.updated_at).toLocaleString("en-US",{timeZone:currentTimezone,dateStyle:"medium",timeStyle:"short"}):"Not yet synchronized";
  query("#system-status strong").textContent=!synced?"Waiting for first sync":data.publishing_block?"Action required":"Snapshot synchronized";query("#system-status").className="system-status "+(data.publishing_block?"level-warning":"level-healthy");
  query("#health").innerHTML=Object.entries(data.system).map(([name,status])=>{let detail="";if(name==="scheduler"&&status==="UNKNOWN")detail='<p>No recent external scheduler run has been observed.</p>';if(["content_engine","source_pipeline","ai_provider","slack"].includes(name)&&data.evidence.safe_launch_verified&&!data.today.generated)detail='<p>Safe Launch capability verified; no production run recorded today.</p>';if(name==="publisher"&&status==="PAUSED"&&!data.publishing_block)detail='<p>Publishing is intentionally disabled by configuration.</p>';return '<article class="health-card '+(status==="ACTION_REQUIRED"?"action-required":["HEALTHY","READY","ACTIVE"].includes(status)?"healthy":status==="UNKNOWN"?"unknown":"warning")+'"><span class="health-icon">✦</span><div><h3>'+esc(label(name))+'</h3>'+badge(statuses.has(status)?status:"UNKNOWN")+detail+'</div></article>'}).join("");
  document.querySelectorAll("thead th").forEach((cell,index)=>{if(!cell.closest(".daily-table"))cell.hidden=publicView&&index>3});
  query("#queue").innerHTML=data.queue.length?data.queue.map(item=>'<tr><td>'+esc(item.scheduled_local)+'</td><td>'+esc(item.topic)+'</td><td>'+esc(item.post_type)+'</td><td>'+badge(item.status)+'</td>'+(publicView?"":'<td>'+esc(item.template)+'</td><td>'+esc(item.source_publisher)+'</td><td>'+esc(item.post_id)+'</td>')+'</tr>').join(""):'<tr><td colspan="7" class="table-empty">No synchronized data yet.</td></tr>';
  query("#mobile-queue").innerHTML=data.queue.length?data.queue.map(item=>'<article class="history-card"><div class="history-card-head"><h3>'+esc(item.topic)+'</h3>'+badge(item.status)+'</div><p class="history-meta">'+esc(item.scheduled_local)+" · "+esc(item.post_type)+'</p></article>').join(""):'<div class="empty-state">Waiting for first automation sync.</div>';
  query("#today-empty").hidden=!synced||Number(data.today.generated||0)!==0||Number(data.today.posted||0)!==0||Number(data.today.ready||0)!==0;query("#today-empty").textContent=data.evidence.safe_launch_verified?"No production run has completed today. Safe Launch capability verification passed.":"No synchronized production activity yet today.";query("#alert").hidden=!data.publishing_block;if(data.publishing_block){query("#auth-title").textContent="Publishing paused";query("#auth-description").textContent="Publishing is paused until LinkedIn access is restored.";query("#alert").textContent=data.publishing_block.message}else if(data.evidence.linkedin_access==="VERIFIED"){query("#auth-title").textContent="LinkedIn access verified";query("#auth-description").textContent="Recent read-only identity evidence confirms the configured connection."}else if(data.evidence.linkedin_access==="CONFIGURED_UNVERIFIED"){query("#auth-title").textContent="LinkedIn access configured";query("#auth-description").textContent="Credentials are configured, but no recent durable identity verification is available."}else{query("#auth-title").textContent="LinkedIn access not yet verified";query("#auth-description").textContent="No durable connection evidence is available yet. Credentials and identities are never displayed."}
  query("#activity").innerHTML=data.recent_activity.length?data.recent_activity.map(item=>'<li class="activity-'+esc(item.result.toLowerCase())+'"><span class="timeline-marker"></span><div><time>'+esc(item.at||"")+'</time><strong>'+esc(label(item.kind))+'</strong><span>'+esc(item.count?`${item.count} ${label(item.result).toLowerCase()} post${item.count===1?"":"s"}`:label(item.result))+'</span></div></li>').join(""):'<li class="empty-state">No synchronized activity yet.</li>';
  renderPeriod(data);renderSchedule(data);query("#error").hidden=true;syncThemeButton();clock();
}
function refresh(){return fetch("state.json",{cache:"no-store"}).then(response=>{if(!response.ok)throw new Error("snapshot");return response.json()}).then(render).catch(()=>{document.querySelector("#error").hidden=false})}
document.querySelector("#theme-toggle").addEventListener("click",()=>{window.VoxynTheme.set(window.VoxynTheme.get()==="dark"?"light":"dark");syncThemeButton()});
document.querySelector("#system-status").addEventListener("click",()=>{if(snapshot?.publishing_block)document.querySelector("#authentication").scrollIntoView({behavior:"smooth",block:"center"})});
document.querySelector("#mobile-menu").addEventListener("click",()=>setDrawer(true));
document.querySelector("#drawer-close").addEventListener("click",()=>setDrawer(false));
document.querySelector("#nav-backdrop").addEventListener("click",()=>setDrawer(false));
document.querySelectorAll("#dashboard-navigation nav a").forEach(link=>link.addEventListener("click",()=>setDrawer(false)));
document.addEventListener("keydown",event=>{if(event.key==="Escape"&&document.querySelector("#dashboard-navigation").classList.contains("open"))setDrawer(false)});
document.querySelectorAll("[data-range]").forEach(button=>button.addEventListener("click",()=>{selectedRange=button.dataset.range;if(selectedRange!=="custom")customRange=null;if(snapshot)renderPeriod(snapshot)}));
document.querySelector("#custom-range").addEventListener("submit",event=>{event.preventDefault();const from=document.querySelector("#range-from").value,to=document.querySelector("#range-to").value,error=document.querySelector("#range-error");if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to)||from>to){error.textContent="Choose valid dates with From on or before To.";return}customRange={from,to};error.textContent="";if(snapshot)renderPeriod(snapshot)});
window.VoxynDashboard={buyerDate,rangeRows,totals,scheduleState,renderSchedule};
refresh();setInterval(refresh,45000);setInterval(clock,1000);setInterval(()=>{if(snapshot&&selectedRange==="today"){renderSchedule(snapshot);renderPeriod(snapshot)}},30000);
