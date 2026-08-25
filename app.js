const savedMonitored=JSON.parse(localStorage.getItem('chaintraceMonitored')||'null');
const defaultMonitored=["0x1081997a20e2a34114b7297f5e6c78fbd909c776","0x0000000000000000000000000000000000000000","0x000000000000000000000000000000000000dEaD"];
const initialMonitored=(Array.isArray(savedMonitored)?savedMonitored:defaultMonitored).map(w=>{if(w==="0x7f8a...a9b2c")return "0x0000000000000000000000000000000000000000";if(w==="0x2c3d...d4e5f")return "0x000000000000000000000000000000000000dEaD";return w;});
const state={wallets:1248,tx:8731,alerts:47,highRisk:23,monitored:[...new Set(initialMonitored)],transactions:[
["10:42:18 AM","0x9d1b...b3d9","0x7f8a...a9b2c","0x3ea1...14c5","250.35","ETH",92,"Suspicious Fund Flow"],["10:41:56 AM","0x9d1b...e7f2","0x2c3d...d4e5f","0xf22b...9a1d","1,502.75","USDT",88,"Rapid Movement"],["10:41:22 AM","0xaa4e...c2b1","0x9a7b...7c3d1","0xMixer...000","75.00","BTC",95,"Mixer Interaction"],["10:40:55 AM","0x1e2f...4a6b","0x1b2e...e8f9a","0x9c8d...3a2b","120.00","ETH",76,"Structuring Pattern"],["10:40:33 AM","0x3b4c...78de","0x6d5c...4f2b9","0xSanct...123","500.00","USDC",94,"Sanctioned Entity"]]};
const titles={dashboard:["Dashboard","Real-time overview of blockchain activity and suspicious behavior"],investigations:["Investigations","Search and investigate wallet activity"],monitor:["Wallet Monitor","Continuous screening of monitored addresses"],alerts:["Alerts","Automatic warnings from the screening engine"],watchlist:["Watchlist","Addresses requiring enhanced attention"],entities:["Entities","Wallet and service intelligence"],transactions:["Transactions","Recent blockchain transaction activity"],analytics:["Analytics","Risk and activity analytics"],reports:["Reports","Investigation reports"],settings:["Settings","System and API configuration"]};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function nav(view,replace=false){
  if(!titles[view])view='dashboard';
  $$('.view').forEach(v=>{v.classList.remove('active');v.hidden=true;v.setAttribute('aria-hidden','true');});
  const target=$('#'+view);if(!target)return;
  target.hidden=false;target.removeAttribute('aria-hidden');target.classList.add('active');
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));
  $('#pageTitle').textContent=titles[view][0];$('#pageSubtitle').textContent=titles[view][1];
  if(replace)history.replaceState({view},'',`#${view}`);else if(location.hash!==`#${view}`)history.pushState({view},'',`#${view}`);
  window.scrollTo(0,0);
}
function initialView(){return (location.hash||'#dashboard').slice(1)||'dashboard';}
$('#nav').addEventListener('click',e=>{const b=e.target.closest('.nav-item');if(b)nav(b.dataset.view);});
document.addEventListener('click',e=>{const go=e.target.closest('[data-go]');if(go)nav(go.dataset.go);const open=e.target.closest('[data-open-modal]');if(open)openModal();const ex=e.target.closest('[data-example]');if(ex){$('#investigateInput').value=ex.dataset.example;}});
window.addEventListener('popstate',()=>nav(initialView(),true));
function clock(){$('#clock').textContent=new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}clock();setInterval(clock,1000);
function points(seed,n=40,base=50,amp=25){let x=seed*97+11,a=[];for(let i=0;i<n;i++){x=(x*1664525+1013904223)%4294967296;a.push(base+((x/4294967296)-.5)*amp+(i/n)*amp*.45);}return a;}
function svgLine(data,stroke='#268ce6',fill='rgba(30,120,220,.12)'){const w=700,h=150,p=12,min=Math.min(...data),max=Math.max(...data),range=max-min||1,coords=data.map((v,i)=>`${p+i*(w-2*p)/(data.length-1)},${h-p-(v-min)/range*(h-2*p)}`).join(' '),grid=[.25,.5,.75].map(y=>`<line x1="${p}" y1="${h*y}" x2="${w-p}" y2="${h*y}" stroke="#142433"/>`).join('');return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${grid}<polygon points="${p},${h-p} ${coords} ${w-p},${h-p}" fill="${fill}"/><polyline points="${coords}" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;}
function renderCharts(){const cs=['#2488dd','#8c52d8','#31c76c','#f08b1e','#f23f44'];$$('.mini-chart').forEach(el=>el.innerHTML=svgLine(points(+el.dataset.seed,25,50,35),cs[+el.dataset.seed-1],'transparent'));$('#memoryChart').innerHTML=svgLine(points(8,55,50,40),'#3c8fd3');$('#transactionsChart').innerHTML=svgLine(points(4,55,55,42),'#2789e3');$('#riskTrend').innerHTML=svgLine(points(13,50,55,35),'#f43d42','rgba(244,61,66,.06)');$('#analyticsRisk').innerHTML=svgLine(points(21,50,55,45),'#35d78a','rgba(53,215,138,.08)');const vals=[30,52,42,64,47,39,56,45,61,51,68,58,73,48,66,57,71,62,76,58,70,64,79,66];$('#alertBars').innerHTML=vals.map(v=>`<i style="height:${v}px"><b style="height:${Math.max(9,v*.45)}px"></b><b style="height:${Math.max(6,v*.25)}px"></b><b style="height:${Math.max(4,v*.16)}px"></b></i>`).join('');}
function renderRiskBars(){const vals=[3252,2841,2917,2103,1729],max=Math.max(...vals);$('#riskBars').innerHTML=vals.map((v,i)=>`<div class="bar"><b>${v.toLocaleString()}</b><i style="height:${v/max*105}px"></i><span>${i*20}–${i===4?100:i*20+20}</span></div>`).join('');}
function renderTransactions(){const rows=state.transactions.map(t=>`<tr><td>${t[0]}</td><td>${t[1]}</td><td>${t[2]}</td><td>${t[3]}</td><td>${t[4]}</td><td>${t[5]}</td><td class="risk-high">${t[6]}</td><td class="alert-text">${t[7]}</td></tr>`).join('');$('#suspiciousRows').innerHTML=rows;$('#allTxRows').innerHTML=rows;$('#reportRows').innerHTML=state.transactions.slice(0,5).map(t=>`<div class="report-row"><span>${t[0]}</span><b>${t[7]}</b><em>${t[5]} ${t[4]}</em></div>`).join('');}
let alerts=[["Suspicious fund flow detected","0x7f8a...a9b2c","250.35 ETH","HIGH"],["Rapid fund movement","0x2c3d...d4e5f","1,502.75 USDT","HIGH"],["Mixer service interaction","0x9a7b...7c3d1","75.00 BTC","HIGH"],["Structuring / Smurfing Pattern","0x1b2e...e8f9a","120.00 ETH","HIGH"],["Sanctioned entity interaction","0x6d5c...4f2b9","500.00 USDC","HIGH"],["Unusual transaction velocity","0x4e7a...21bc","42.00 ETH","MEDIUM"],["Large-value transfer","0x1d8c...8aa1","800.00 USDC","MEDIUM"]];
function renderAlerts(){const html=alerts.map(a=>`<div class="alert-row"><i class="dot"></i><div><b>${a[0]}</b><small>Wallet: ${a[1]} · Amount: ${a[2]}</small></div><em class="risk-${a[3].toLowerCase()}">${a[3]}</em></div>`).join('');$('#highRiskAlerts').innerHTML=html.slice(0,5);$('#allAlerts').innerHTML=html;}
function renderMonitor(){
  const html=state.monitored.map((w,i)=>{const valid=/^0x[a-fA-F0-9]{40}$/.test(w);const risk=valid&&i===0?'HIGH RISK':valid?'MONITORING':'DEMO ADDRESS';return `<article class="monitor-card"><div class="monitor-top"><span class="status-dot"></span><span>${risk}</span></div><h3>${short(w)}</h3><p>Ethereum Mainnet · ${valid?'live screening enabled':'demo address only'}</p><div class="monitor-meta"><span>Scan interval</span><b>20 sec</b></div><div class="monitor-actions"><button type="button" data-invest="${w}">Investigate</button><button type="button" class="remove" data-remove="${w}">Remove</button></div></article>`}).join('');
  $('#monitoredList').innerHTML=html||'<div class="empty-state"><strong>No monitored wallets</strong><span>Add a wallet to start screening.</span></div>';
}

async function investigate(){const addr=$('#investigateInput').value.trim(),out=$('#investigationOutput');if(!/^0x[a-fA-F0-9]{40}$/.test(addr)){out.innerHTML='<div class="empty-state error">Enter a full Ethereum address (0x + 40 hexadecimal characters).</div>';return;}out.innerHTML='<div class="page-card loading">Fetching live blockchain transfers…</div>';try{const r=await fetch(`/api/transfers?address=${encodeURIComponent(addr)}`),d=await r.json();if(!r.ok)throw new Error(d.error||'API request failed');const rows=(d.transfers||[]).map(t=>`<tr><td>${t.blockNum||t.block_number||'-'}</td><td>${short(t.hash)}</td><td>${short(t.from)}</td><td>${short(t.to)}</td><td>${Number(t.value||0).toFixed(6)}</td><td>${t.asset||'-'}</td><td>${t.category||'-'}</td></tr>`).join('');out.innerHTML=`<div class="page-card result-card"><div class="result-head"><div><h3>Live Ethereum Data</h3><p>${d.count} transfers returned · provider: ${d.provider||'blockchain API'}</p></div><a href="https://etherscan.io/address/${addr}" target="_blank" rel="noreferrer">Open on Etherscan ↗</a></div><div class="table-wrap tall"><table><thead><tr><th>Block</th><th>Hash</th><th>From</th><th>To</th><th>Value</th><th>Asset</th><th>Type</th></tr></thead><tbody>${rows||'<tr><td colspan="7">No transfers found.</td></tr>'}</tbody></table></div></div>`;}catch(e){out.innerHTML=`<div class="empty-state error">${e.message}</div>`;}}
function short(x){return x?x.length>18?x.slice(0,10)+'…'+x.slice(-6):x:'-'}
$('#investigateBtn').addEventListener('click',investigate);$('#investigateInput').addEventListener('keydown',e=>{if(e.key==='Enter')investigate();});
function openModal(){$('#walletModal').classList.remove('hidden');$('#newWallet').focus();}$('#addWalletBtn').addEventListener('click',openModal);$('#closeModal').addEventListener('click',()=>$('#walletModal').classList.add('hidden'));$('#walletModal').addEventListener('click',e=>{if(e.target.id==='walletModal')$('#walletModal').classList.add('hidden');});
$('#saveWallet').addEventListener('click',async()=>{const w=$('#newWallet').value.trim(),m=$('#modalMsg');if(!/^0x[a-fA-F0-9]{40}$/.test(w)){m.textContent='Enter a valid Ethereum address: 0x + 40 hexadecimal characters.';m.className='error-text';return;}if(state.monitored.includes(w)){m.textContent='Wallet is already monitored.';m.className='error-text';return;}state.monitored.push(w);localStorage.setItem('chaintraceMonitored',JSON.stringify(state.monitored));state.wallets++;$('#walletCount').textContent=state.wallets.toLocaleString();m.textContent='Wallet added. Live screening started.';m.className='success-text';renderMonitor();setTimeout(()=>$('#walletModal').classList.add('hidden'),700);await scanWallet(w,true);});
$('#printReport').addEventListener('click',()=>window.print());$('#reportDate').textContent=new Date().toLocaleString('en-IN');$('#refreshTx').addEventListener('click',()=>{state.transactions.unshift([new Date().toLocaleTimeString('en-IN'),`0x${Math.random().toString(16).slice(2,10)}...live`,`0x7f8a...a9b2c`,`0x3ea1...14c5`,(Math.random()*100).toFixed(2),'ETH',Math.floor(60+Math.random()*40),'Live transfer signal']);renderTransactions();});
const seenAlerts=new Set(JSON.parse(localStorage.getItem('chaintraceSeenAlerts')||'[]'));
let activeAlert=null;
function persistSeen(){localStorage.setItem('chaintraceSeenAlerts',JSON.stringify([...seenAlerts].slice(-300)));}
function addAlertRecord(address,a){
  const time=new Date().toLocaleTimeString('en-IN');
  const row=[time,short(a.hash),short(a.from),short(a.to),Number(a.value||0).toFixed(2),a.asset||'ETH',a.riskScore,a.reason];
  state.transactions.unshift(row);state.transactions=state.transactions.slice(0,50);alerts.unshift([a.reason,address,`${Number(a.value||0).toFixed(4)} ${a.asset||'ETH'}`,a.riskScore>=85?'HIGH':'MEDIUM']);alerts.splice(20);state.alerts++;if(a.riskScore>=85)state.highRisk++;
  renderTransactions();renderAlerts();$('#alertCount').textContent=state.alerts;$('#rAlerts').textContent=state.alerts;$('#rHigh').textContent=state.highRisk;
}
function showSuspiciousToast(address,a,emailState){
  const id=`toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const stack=$('#alertToastStack');
  const el=document.createElement('div');el.className='alert-toast';el.id=id;
  el.innerHTML=`<div class="toast-top"><div class="toast-icon">!</div><b>Suspicious activity detected</b><button class="toast-close" aria-label="Close">×</button></div><p><strong>${short(address)}</strong> · Risk <strong>${a.riskScore}/100</strong></p><p>${a.reason} · ${Number(a.value||0).toFixed(4)} ${a.asset||'ETH'}</p><div class="toast-actions"><button class="primary-toast toast-invest">Open Investigation</button><button class="toast-email">Send Email</button></div><div class="toast-mail ${emailState==='failed'?'warn':''}">${emailState==='sent'?'✓ Email alert sent':emailState==='failed'?'⚠ Email could not be sent':'Popup alert active'}</div>`;
  stack.appendChild(el);
  const remove=()=>el.remove();el.querySelector('.toast-close').onclick=remove;
  el.querySelector('.toast-invest').onclick=()=>{nav('investigations');$('#investigateInput').value=address;investigate();remove();};
  el.querySelector('.toast-email').onclick=()=>sendEmailAlert(address,a,el.querySelector('.toast-mail'));
  setTimeout(remove,15000);
}
function openAlertModal(address,a){
  activeAlert={address,a};$('#modalWallet').textContent=short(address);$('#modalAmount').textContent=`${Number(a.value||0).toFixed(4)} ${a.asset||'ETH'}`;$('#modalHash').textContent=short(a.hash);$('#modalProvider').textContent=a.provider||'Blockchain API';$('#modalRisk').textContent=`HIGH RISK · ${a.riskScore}/100`;$('#modalReason').textContent=a.reason;$('#modalEmailStatus').textContent='';$('#alertModal').classList.remove('hidden');
}
async function sendEmailAlert(address,a,statusEl){
  try{const r=await fetch('/api/email-alert',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address,alert:a})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Email failed');if(statusEl)statusEl.textContent=`✓ Email sent to ${d.to}`;return true;}catch(e){if(statusEl)statusEl.textContent=`⚠ ${e.message}`;return false;}
}
async function scanWallet(address,alertImmediately=false){
  if(!/^0x[a-fA-F0-9]{40}$/.test(address))return;
  try{
    const r=await fetch(`/api/scan?address=${encodeURIComponent(address)}`);const d=await r.json();if(!r.ok)throw new Error(d.error||'Scan failed');
    for(const a0 of (d.suspicious||[]).slice(0,3)){
      const a={...a0,provider:d.provider};const key=`${address.toLowerCase()}:${a.hash}`;
      if(seenAlerts.has(key))continue;
      // First scan of an existing wallet establishes a baseline; newly added wallets alert immediately.
      seenAlerts.add(key);persistSeen();
      if(alertImmediately||localStorage.getItem('chaintraceMonitoringPrimed')==='1'){
        addAlertRecord(address,a);openAlertModal(address,a);
        let emailState='';
        if(localStorage.getItem('chaintraceAutoEmail')==='1')emailState=(await sendEmailAlert(address,a))?'sent':'failed';
        showSuspiciousToast(address,a,emailState);
      }
    }
  }catch(e){console.warn('ChainTrace monitor scan:',e.message);}
}
async function primeMonitoring(){
  const wasPrimed=localStorage.getItem('chaintraceMonitoringPrimed')==='1';
  for(const w of state.monitored)if(/^0x[a-fA-F0-9]{40}$/.test(w))await scanWallet(w,!wasPrimed);
  localStorage.setItem('chaintraceMonitoringPrimed','1');
}
setInterval(()=>state.monitored.filter(w=>/^0x[a-fA-F0-9]{40}$/.test(w)).forEach(w=>scanWallet(w,false)),20000);
$('#closeAlertModal').addEventListener('click',()=>$('#alertModal').classList.add('hidden'));$('#alertModal').addEventListener('click',e=>{if(e.target.id==='alertModal')$('#alertModal').classList.add('hidden')});
$('#modalInvestigate').addEventListener('click',()=>{if(activeAlert){$('#alertModal').classList.add('hidden');nav('investigations');$('#investigateInput').value=activeAlert.address;investigate();}});
$('#modalEmail').addEventListener('click',async()=>{if(!activeAlert)return;$('#modalEmailStatus').textContent='Sending email…';const ok=await sendEmailAlert(activeAlert.address,activeAlert.a,$('#modalEmailStatus'));if(ok)$('#modalEmail').textContent='Email Sent ✓';});
function demoSuspiciousAlert(){
  const address=state.monitored.find(w=>/^0x[a-fA-F0-9]{40}$/.test(w))||'0x1081997a20e2a34114b7297f5e6c78fbd909c776';
  const a={hash:`0x${Math.random().toString(16).slice(2).padEnd(64,'0').slice(0,64)}`,from:address,to:'0x3ea10000000000000000000000000000000014c5',value:250.35,asset:'ETH',riskScore:94,reason:'Suspicious fund flow · demo event',provider:'ChainTrace Demo Engine'};
  addAlertRecord(address,a);openAlertModal(address,a);showSuspiciousToast(address,a,'');
}
function setupMonitorActions(){
  document.addEventListener('click',async e=>{
    const invest=e.target.closest('[data-invest]');
    if(invest){
      e.preventDefault();
      e.stopPropagation();
      const address=invest.dataset.invest;
      nav('investigations');
      $('#investigateInput').value=address;
      await investigate();
      return;
    }
    const remove=e.target.closest('[data-remove]');
    if(remove){
      e.preventDefault();
      e.stopPropagation();
      const address=remove.dataset.remove;
      state.monitored=state.monitored.filter(w=>w!==address);
      localStorage.setItem('chaintraceMonitored',JSON.stringify(state.monitored));
      renderMonitor();
      showInfoToast(`Wallet ${short(address)} removed from monitoring.`);
      return;
    }
  });
  const testAlert=$('#testAlert');
  if(testAlert)testAlert.addEventListener('click',demoSuspiciousAlert);
  const testEmail=$('#testEmail');
  if(testEmail)testEmail.addEventListener('click',async()=>{const address=state.monitored.find(w=>/^0x[a-fA-F0-9]{40}$/.test(w))||'0x1081997a20e2a34114b7297f5e6c78fbd909c776';const a={hash:`0x${Math.random().toString(16).slice(2).padEnd(64,'0').slice(0,64)}`,value:1,asset:'ETH',riskScore:91,reason:'ChainTrace test email'};$('#settingsEmailMsg').textContent='Sending test email…';const ok=await sendEmailAlert(address,a,$('#settingsEmailMsg'));if(ok)$('#settingsEmailMsg').textContent='✓ Test email sent.';});
}
function showInfoToast(message){
  const stack=$('#alertToastStack');
  if(!stack)return;
  const el=document.createElement('div');
  el.className='alert-toast';
  el.innerHTML=`<div class="toast-top"><div class="toast-icon">✓</div><b>Wallet Updated</b><button class="toast-close" type="button">×</button></div><p>${message}</p>`;
  stack.appendChild(el);
  const remove=()=>el.remove();
  el.querySelector('.toast-close').addEventListener('click',remove);
  setTimeout(remove,3500);
}
async function checkApi(){try{const r=await fetch('/api/health');const d=await r.json();$('#apiStatus').textContent=d.ok?'Backend online':'Backend unavailable';$('#providerStatus').textContent=(d.provider||'Not configured')+(d.emailConfigured?' · Email ready':'');$('#apiStatus').className=d.ok?'good':'bad';if(d.emailConfigured){localStorage.setItem('chaintraceAutoEmail','1');$('#emailStatus').textContent='READY';$('#emailStatus').className='toggle on';}else{$('#emailStatus').textContent='NOT CONFIGURED';$('#emailStatus').className='toggle';}}catch{$('#apiStatus').textContent='Backend unavailable';$('#providerStatus').textContent='Start npm run start';$('#apiStatus').className='bad';}}
async function loadPrice(){try{const r=await fetch('/api/price');const d=await r.json();if(!r.ok)throw new Error();$('#ethPrice').textContent=`$${Number(d.usd).toLocaleString('en-US',{maximumFractionDigits:0})}`;$('#ethChange').textContent=`${d.change24h>=0?'▲':'▼'} ${Math.abs(d.change24h).toFixed(2)}% 24h`;$('#ethChange').className=d.change24h<0?'bad':'';}catch{$('#ethPrice').textContent='Unavailable';$('#ethChange').textContent='API unavailable';}}
function init(){setupMonitorActions();renderCharts();renderRiskBars();renderTransactions();renderAlerts();renderMonitor();checkApi();loadPrice();nav(initialView(),true);primeMonitoring();$('#rWallets').textContent=state.wallets.toLocaleString();$('#rTx').textContent=state.tx.toLocaleString();$('#rAlerts').textContent=state.alerts;$('#rHigh').textContent=state.highRisk;}
init();
