const savedMonitored=JSON.parse(localStorage.getItem('chaintraceMonitored')||'null');
const defaultMonitored=["0x1081997a20e2a34114b7297f5e6c78fbd909c776","0x0000000000000000000000000000000000000000","0x000000000000000000000000000000000000dEaD"];
const initialMonitored=(Array.isArray(savedMonitored)?savedMonitored:defaultMonitored).map(w=>{if(w==="0x7f8a...a9b2c")return "0x0000000000000000000000000000000000000000";if(w==="0x2c3d...d4e5f")return "0x000000000000000000000000000000000000dEaD";return w;});
const state={wallets:0,tx:0,alerts:0,highRisk:0,monitored:[...new Set(initialMonitored)].slice(0,5),transactions:[]};
const titles={dashboard:["Dashboard","Real-time overview of blockchain activity and suspicious behavior"],investigations:["Investigations","Search and investigate wallet activity"],monitor:["Wallet Monitor","Continuous screening of monitored addresses"],global:["Global Activity","Large-value activity across the latest Ethereum block"],riskqueue:["Risk Queue","Prioritized wallets with explainable dark-pattern signals"],alerts:["Alerts","Automatic warnings from the screening engine"],watchlist:["Watchlist","Addresses requiring enhanced attention"],entities:["Entities","Wallet and service intelligence"],transactions:["Transactions","Recent blockchain transaction activity"],analytics:["Analytics","Risk and activity analytics"],reports:["Reports","Investigation reports"],settings:["Settings","System and API configuration"]};
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
document.addEventListener('click',e=>{
  const go=e.target.closest('[data-go]');if(go)nav(go.dataset.go);
  const open=e.target.closest('[data-open-modal]');if(open)openModal();
  const ex=e.target.closest('[data-example]');if(ex)$('#investigateInput').value=ex.dataset.example;
  const investigationTarget=e.target.closest('[data-investigate-query]');
  if(investigationTarget){e.preventDefault();const query=investigationTarget.dataset.investigateQuery;if(query){nav('investigations');$('#investigateInput').value=query;investigate();}return;}
  const filter=e.target.closest('.investigation-filter');
  if(filter){investigationDirection=filter.dataset.direction||'all';renderInvestigationTransactions();}
});
document.addEventListener('change',e=>{if(e.target.matches('#investigationAsset')){investigationAsset=e.target.value;renderInvestigationTransactions();}});
window.addEventListener('popstate',()=>nav(initialView(),true));
function clock(){$('#clock').textContent=new Date().toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'});}clock();setInterval(clock,1000);
function points(seed,n=40,base=50,amp=25){let x=seed*97+11,a=[];for(let i=0;i<n;i++){x=(x*1664525+1013904223)%4294967296;a.push(base+((x/4294967296)-.5)*amp+(i/n)*amp*.45);}return a;}
function svgLine(data,stroke='#268ce6',fill='rgba(30,120,220,.12)'){const w=700,h=150,p=12,min=Math.min(...data),max=Math.max(...data),range=max-min||1,coords=data.map((v,i)=>`${p+i*(w-2*p)/(data.length-1)},${h-p-(v-min)/range*(h-2*p)}`).join(' '),grid=[.25,.5,.75].map(y=>`<line x1="${p}" y1="${h*y}" x2="${w-p}" y2="${h*y}" stroke="#142433"/>`).join('');return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${grid}<polygon points="${p},${h-p} ${coords} ${w-p},${h-p}" fill="${fill}"/><polyline points="${coords}" fill="none" stroke="${stroke}" stroke-width="2"/></svg>`;}
function renderCharts(){const cs=['#2488dd','#8c52d8','#31c76c','#f08b1e','#f23f44'];$$('.mini-chart').forEach(el=>el.innerHTML=svgLine(points(+el.dataset.seed,25,50,35),cs[+el.dataset.seed-1],'transparent'));$('#memoryChart').innerHTML=svgLine(points(8,55,50,40),'#3c8fd3');$('#transactionsChart').innerHTML=svgLine(points(4,55,55,42),'#2789e3');$('#riskTrend').innerHTML=svgLine(points(13,50,55,35),'#f43d42','rgba(244,61,66,.06)');$('#analyticsRisk').innerHTML=svgLine(points(21,50,55,45),'#35d78a','rgba(53,215,138,.08)');const vals=[30,52,42,64,47,39,56,45,61,51,68,58,73,48,66,57,71,62,76,58,70,64,79,66];$('#alertBars').innerHTML=vals.map(v=>`<i style="height:${v}px"><b style="height:${Math.max(9,v*.45)}px"></b><b style="height:${Math.max(6,v*.25)}px"></b><b style="height:${Math.max(4,v*.16)}px"></b></i>`).join('');}
function renderRiskBars(){const vals=[3252,2841,2917,2103,1729],max=Math.max(...vals);$('#riskBars').innerHTML=vals.map((v,i)=>`<div class="bar"><b>${v.toLocaleString()}</b><i style="height:${v/max*105}px"></i><span>${i*20}–${i===4?100:i*20+20}</span></div>`).join('');}
function renderTransactions(){const rows=state.transactions.map(t=>`<tr><td>${t[0]}</td><td>${t[1]}</td><td>${t[2]}</td><td>${t[3]}</td><td>${t[4]}</td><td>${t[5]}</td><td class="risk-high">${t[6]}</td><td class="alert-text">${t[7]}</td></tr>`).join('');$('#suspiciousRows').innerHTML=rows;$('#allTxRows').innerHTML=rows;$('#reportRows').innerHTML=state.transactions.slice(0,5).map(t=>`<div class="report-row"><span>${t[0]}</span><b>${t[7]}</b><em>${t[5]} ${t[4]}</em></div>`).join('');}
const MAX_ALERT_HISTORY=500;
let activeAlertFilter='All';
const alertSeverity=score=>score>=90?'CRITICAL':score>=75?'HIGH':score>=50?'MEDIUM':'LOW';
let alerts=JSON.parse(localStorage.getItem('chaintraceAlerts')||'[]').map(a=>{
  const score=Number(a[4]);
  if(Number.isFinite(score))return [...a.slice(0,4),score];
  const inferred=/critical|fan-out/i.test(a[0]||'')?92:80;
  return [...a.slice(0,3),alertSeverity(inferred),inferred];
});
function syncAlertStats(){state.alerts=alerts.length;state.highRisk=alerts.filter(a=>a[3]==='HIGH'||a[3]==='CRITICAL').length;$('#alertCount').textContent=state.alerts;$('#alertBadge').textContent=state.alerts;$('#topAlert').textContent=state.alerts;$('#highRiskCount').textContent=state.highRisk;$('#rAlerts').textContent=state.alerts;$('#rHigh').textContent=state.highRisk;}
function alertHtml(a){return `<div class="alert-row ${a[3]==='CRITICAL'?'alert-critical':''}"><i class="dot"></i><div><b>${a[0]}</b><small>Wallet: ${a[1]} · Amount: ${a[2]} · Score: ${a[4]}/100</small></div><em class="risk-${a[3].toLowerCase()}">${a[3]}</em></div>`;}
function renderAlerts(){const visible=activeAlertFilter==='All'?alerts:alerts.filter(a=>a[3]===activeAlertFilter.toUpperCase());const high=alerts.filter(a=>a[3]==='HIGH'||a[3]==='CRITICAL');$('#highRiskAlerts').innerHTML=high.slice(0,5).map(alertHtml).join('')||'<div class="empty-state">No high-risk alerts.</div>';$('#allAlerts').innerHTML=visible.map(alertHtml).join('')||`<div class="empty-state">No ${activeAlertFilter.toLowerCase()} alerts.</div>`;$('#alertsSummary').textContent=`${visible.length} ${activeAlertFilter.toLowerCase()} alert${visible.length===1?'':'s'}`;}
$$('.filter').forEach(button=>button.addEventListener('click',()=>{activeAlertFilter=button.textContent.trim();$$('.filter').forEach(b=>b.classList.toggle('active',b===button));renderAlerts();}));
function renderMonitor(){
  const html=state.monitored.map(w=>{const valid=/^0x[a-fA-F0-9]{40}$/.test(w);return `<article class="monitor-card"><div class="monitor-top"><span class="status-dot"></span><span>${valid?'LIVE MONITORING':'INVALID ADDRESS'}</span></div><h3>${short(w)}</h3><p>Ethereum Mainnet · Alchemy scan every 20 seconds</p><div class="monitor-meta"><span>Alert rule</span><b>10 ETH / 10k stablecoin</b></div><div class="monitor-actions"><button type="button" data-invest="${w}">Investigate</button><button type="button" class="remove" data-remove="${w}">Remove</button></div></article>`}).join('');
  $('#monitoredList').innerHTML=html||'<div class="empty-state"><strong>No monitored wallets</strong><span>Add a wallet to start screening.</span></div>';
}

let currentInvestigation=null,investigationDirection='all',investigationAsset='all';
function escapeHtml(value){return String(value??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));}
function displayNumber(value,digits=2){const number=Number(value||0);return number.toLocaleString('en-US',{maximumFractionDigits:digits});}
function displayTime(value){if(!value)return 'Pending';const date=new Date(value);return Number.isNaN(date.getTime())?'Unknown':date.toLocaleString('en-IN');}
function transferReviewScore(t){const asset=String(t.asset||'').toUpperCase(),category=String(t.category||'').toLowerCase(),value=Number(t.value||0),stableContracts={USDC:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',USDT:'0xdac17f958d2ee523a2206206994597c13d831ec7',DAI:'0x6b175474e89094c44da98b954eedeac495271d0f'},verifiedNative=asset==='ETH'&&['external','internal','transaction'].includes(category),verifiedStable=stableContracts[asset]===String(t.contractAddress||'').toLowerCase();if(verifiedNative)return value>=100?25:value>=50?20:value>=10?12:0;if(verifiedStable)return value>=100000?25:value>=50000?20:value>=10000?12:0;return 0;}
function investigationMetric(label,value,note){return `<article class="metric-card investigation-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></article>`;}
function graphPositions(nodes){const positions=new Map(),left=[],right=[];for(const node of nodes){if(node.side==='center'||node.type==='subject'||node.type==='transaction'){positions.set(node.id,{x:450,y:205});continue;}if(node.side==='incoming')left.push(node);else if(node.side==='outgoing')right.push(node);else(left.length<=right.length?left:right).push(node);}const place=(items,x)=>items.forEach((node,index)=>positions.set(node.id,{x,y:(index+1)*390/(items.length+1)+10}));place(left,150);place(right,750);return positions;}
function renderInvestigationGraph(graph){if(!graph?.nodes?.length)return '<div class="graph-empty">No counterparties were returned for this subject.</div>';const positions=graphPositions(graph.nodes),edges=(graph.edges||[]).map(edge=>{const from=positions.get(edge.source),to=positions.get(edge.target);if(!from||!to)return '';const mx=(from.x+to.x)/2,my=(from.y+to.y)/2-7;return `<g><line class="graph-edge ${escapeHtml(edge.direction||'')}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line><text class="graph-edge-label" x="${mx}" y="${my}">${escapeHtml(edge.label||'flow')}</text></g>`;}).join(''),nodes=graph.nodes.map(node=>{const p=positions.get(node.id),subject=node.type==='subject'||node.type==='transaction',label=node.label==='Investigated wallet'||node.label==='Transaction'?node.label:short(node.address||node.id),sub=subject?(node.type==='transaction'?'hash':'focus'):node.count?`${node.count} transfer${node.count===1?'':'s'}`:'click to investigate',action=node.address?`data-investigate-query="${escapeHtml(node.address)}"`:'';return `<g class="graph-node ${escapeHtml(node.type||'wallet')}" transform="translate(${p.x},${p.y})" ${action}><circle r="${subject?31:24}"></circle><text y="-2">${escapeHtml(label)}</text><text class="node-sub" y="12">${escapeHtml(sub)}</text></g>`;}).join('');return `<svg viewBox="0 0 900 410" role="img" aria-label="Transaction relationship graph"><defs><marker id="investigationArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#58758c"></path></marker></defs>${edges}${nodes}</svg><div class="graph-legend"><span><i class="graph-in"></i>Incoming</span><span><i class="graph-out"></i>Outgoing</span><span><i class="graph-center"></i>Investigated subject</span></div>`;}
function renderRiskEvidence(risk){const signals=(risk?.signals||[]).map(signal=>`<div class="risk-signal"><div class="risk-signal-points">${signal.points>0?`+${signal.points}`:'0'}</div><div><b>${escapeHtml(signal.label)}</b><p>${escapeHtml(signal.detail)}</p></div></div>`).join('');return `${signals}<div class="risk-method-note">The score is an explainable screening indicator, not a declaration of criminal activity. An investigator must review the underlying evidence.</div>`;}
function renderInvestigationTransactions(){if(!currentInvestigation)return;const table=$('#investigationTxRows');if(!table)return;const transfers=currentInvestigation.transfers||[],filtered=transfers.filter(t=>(investigationDirection==='all'||t.direction===investigationDirection)&&(investigationAsset==='all'||String(t.asset).toUpperCase()===investigationAsset));table.innerHTML=filtered.map(t=>{const direction=t.direction||'related',score=transferReviewScore(t);return `<tr><td>${escapeHtml(displayTime(t.timestamp))}</td><td><button class="tx-hash view-btn" data-investigate-query="${escapeHtml(t.hash)}">${escapeHtml(short(t.hash))}</button></td><td><span class="direction-badge direction-${escapeHtml(direction)}">${escapeHtml(direction.toUpperCase())}</span></td><td>${escapeHtml(short(t.from))}</td><td>${escapeHtml(short(t.to))}</td><td>${escapeHtml(displayNumber(t.value,6))}</td><td>${escapeHtml(t.asset||'-')}</td><td class="risk-${score>=20?'medium':'low'}">${score||'—'}</td><td>${score?'Large-value review threshold':'No transaction-level rule'}</td></tr>`;}).join('')||'<tr><td colspan="9">No transfers match the selected filters.</td></tr>';$$('.investigation-filter').forEach(button=>button.classList.toggle('active',button.dataset.direction===investigationDirection));}
function renderInvestigation(data){currentInvestigation=data;investigationDirection='all';investigationAsset='all';const out=$('#investigationOutput'),risk=data.risk||{score:0,level:'LOW',signals:[]},summary=data.summary||{},isWallet=data.queryType==='wallet',identity=isWallet?data.subject.address:data.subject.hash,etherscan=isWallet?`https://etherscan.io/address/${encodeURIComponent(identity)}`:`https://etherscan.io/tx/${encodeURIComponent(identity)}`,assets=[...new Set((data.transfers||[]).map(t=>String(t.asset||'').toUpperCase()).filter(Boolean))];let metrics;if(isWallet){metrics=[investigationMetric('Transfers examined',summary.transferCount||0,'Latest provider result'),investigationMetric('Incoming',summary.incomingCount||0,'Transfers received'),investigationMetric('Outgoing',summary.outgoingCount||0,'Transfers sent'),investigationMetric('Counterparties',summary.uniqueCounterparties||0,'Unique addresses'),investigationMetric('Busiest 10 min',summary.busiestWindowCount||0,`${summary.riskEligibleTransferCount||0} verified ETH/stablecoin transfers`)].join('');}else{metrics=[investigationMetric('Status',data.subject.status||'Unknown','On-chain receipt'),investigationMetric('Block',data.subject.blockNum??'Pending','Ethereum Mainnet'),investigationMetric('ETH value',displayNumber(data.subject.value,6),'Native transfer'),investigationMetric('Token transfers',summary.tokenTransferCount||0,'Supported stablecoins'),investigationMetric('Gas used',displayNumber(data.subject.gasUsed,0),'Receipt value')].join('');}
  const actions=isWallet?`<button class="primary-action" data-watch="${escapeHtml(data.subject.address)}">＋ Monitor wallet</button>`:`<button data-investigate-query="${escapeHtml(data.subject.from)}">Investigate sender</button>${data.subject.to?`<button data-investigate-query="${escapeHtml(data.subject.to)}">Investigate recipient</button>`:''}`,riskLabel=!isWallet&&risk.scope==='sender_context'?`${risk.level} · SENDER CONTEXT`:`${risk.level} RISK`,evidenceLabel=!isWallet&&risk.scope==='sender_context'?`Recent behavior of ${short(risk.evaluatedAddress)}`:'Explainable evidence';
  out.innerHTML=`<div class="investigation-result"><section class="page-card investigation-identity"><div class="investigation-type-icon">${isWallet?'◉':'⇄'}</div><div class="investigation-identity-copy"><small>${isWallet?'Wallet investigation':'Transaction investigation'} · ${escapeHtml(data.network)}</small><h3>${escapeHtml(identity)}</h3><p>Provider: ${escapeHtml(data.provider)} · Updated ${escapeHtml(displayTime(data.updatedAt))}${data.cached?' · cached response':''}</p></div><div class="investigation-risk risk-${escapeHtml(risk.level.toLowerCase())}"><strong>${escapeHtml(risk.score)}</strong><span>${escapeHtml(riskLabel)}</span></div><div class="investigation-actions">${actions}<a href="${etherscan}" target="_blank" rel="noreferrer">Etherscan ↗</a></div></section><div class="investigation-metrics">${metrics}</div><div class="investigation-main-grid"><section class="page-card investigation-panel"><div class="investigation-panel-head"><h3>Relationship graph</h3><span>${escapeHtml(data.graph?.totalCounterparties||0)} connected address${data.graph?.totalCounterparties===1?'':'es'}${data.graph?.truncated?' · strongest 12 shown':''}</span></div><div class="investigation-graph">${renderInvestigationGraph(data.graph)}</div></section><section class="page-card investigation-panel"><div class="investigation-panel-head"><h3>Why this score?</h3><span>${escapeHtml(evidenceLabel)}</span></div><div class="risk-evidence">${renderRiskEvidence(risk)}</div></section></div><section class="page-card investigation-panel investigation-transactions"><div class="investigation-panel-head"><h3>${isWallet?'Retrieved transfers':'Transaction components'}</h3><div class="investigation-toolbar"><button class="investigation-filter active" data-direction="all">All</button><button class="investigation-filter" data-direction="incoming">Incoming</button><button class="investigation-filter" data-direction="outgoing">Outgoing</button><select class="investigation-asset" id="investigationAsset"><option value="all">All assets</option>${assets.map(asset=>`<option value="${escapeHtml(asset)}">${escapeHtml(asset)}</option>`).join('')}</select></div></div><div class="investigation-table"><table><thead><tr><th>Time</th><th>Hash</th><th>Direction</th><th>From</th><th>To</th><th>Amount</th><th>Asset</th><th>Review score</th><th>Indicator</th></tr></thead><tbody id="investigationTxRows"></tbody></table></div></section></div>`;renderInvestigationTransactions();}
async function investigate(){const query=$('#investigateInput').value.trim(),out=$('#investigationOutput'),button=$('#investigateBtn');if(!/^0x(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(query)){out.innerHTML='<div class="investigation-error"><strong>Invalid Ethereum identifier</strong><p>Enter a complete wallet address (0x + 40 hexadecimal characters) or transaction hash (0x + 64 hexadecimal characters).</p></div>';return;}button.disabled=true;button.textContent='Investigating…';out.innerHTML='<div class="investigation-loading"><div class="investigation-spinner"></div><b>Collecting live Ethereum evidence</b><small>Transfers, counterparties and risk indicators are being analysed.</small></div>';try{const r=await fetch(`/api/investigate?query=${encodeURIComponent(query)}`),text=await r.text();let data;try{data=JSON.parse(text);}catch{throw new Error(`Investigation API unavailable (HTTP ${r.status}). Restart the Node server.`);}if(!r.ok)throw new Error(data.error||'Investigation failed');localStorage.setItem('chaintraceLastInvestigationQuery',query);renderInvestigation(data);}catch(e){out.innerHTML=`<div class="investigation-error"><strong>Investigation could not be completed</strong><p>${escapeHtml(e.message)}</p></div>`;}finally{button.disabled=false;button.textContent='Investigate';}}
function short(x){return x?x.length>18?x.slice(0,10)+'…'+x.slice(-6):x:'-'}
$('#investigateBtn').addEventListener('click',investigate);$('#investigateInput').addEventListener('keydown',e=>{if(e.key==='Enter')investigate();});
const lastInvestigationQuery=localStorage.getItem('chaintraceLastInvestigationQuery');if(lastInvestigationQuery)$('#investigateInput').value=lastInvestigationQuery;
function openModal(){$('#walletModal').classList.remove('hidden');$('#newWallet').focus();}$('#addWalletBtn').addEventListener('click',openModal);$('#closeModal').addEventListener('click',()=>$('#walletModal').classList.add('hidden'));$('#walletModal').addEventListener('click',e=>{if(e.target.id==='walletModal')$('#walletModal').classList.add('hidden');});
$('#saveWallet').addEventListener('click',async()=>{const w=$('#newWallet').value.trim(),m=$('#modalMsg');if(!/^0x[a-fA-F0-9]{40}$/.test(w)){m.textContent='Enter a valid Ethereum address: 0x + 40 hexadecimal characters.';m.className='error-text';return;}if(state.monitored.length>=5){m.textContent='Free-tier limit reached: monitor up to 5 wallets.';m.className='error-text';return;}if(state.monitored.includes(w)){m.textContent='Wallet is already monitored.';m.className='error-text';return;}state.monitored.push(w);localStorage.setItem('chaintraceMonitored',JSON.stringify(state.monitored));state.wallets=state.monitored.length;$('#walletCount').textContent=state.wallets;m.textContent='Wallet added. First scan sets its baseline.';m.className='success-text';renderMonitor();setTimeout(()=>$('#walletModal').classList.add('hidden'),700);await scanWallet(w,true);});
$('#printReport').addEventListener('click',()=>window.print());$('#reportDate').textContent=new Date().toLocaleString('en-IN');$('#refreshTx').addEventListener('click',()=>primeMonitoring());
const seenAlerts=new Set(JSON.parse(localStorage.getItem('chaintraceSeenAlerts')||'[]'));
const seenTransfers=new Set(JSON.parse(localStorage.getItem('chaintraceSeenTransfers')||'[]'));
let activeAlert=null;
function persistSeen(){localStorage.setItem('chaintraceSeenAlerts',JSON.stringify([...seenAlerts].slice(-300)));}
function persistTransfers(){localStorage.setItem('chaintraceSeenTransfers',JSON.stringify([...seenTransfers].slice(-500)));}
function addTransactionRecord(a){const row=[a.timestamp?new Date(a.timestamp).toLocaleTimeString('en-IN'):new Date().toLocaleTimeString('en-IN'),short(a.hash),short(a.from),short(a.to),Number(a.value||0).toFixed(4),a.asset||'ETH',a.riskScore||0,a.reason||'Live transfer'];state.transactions.unshift(row);state.transactions=state.transactions.slice(0,50);state.tx++;renderTransactions();}
function addAlertRecord(address,a){
  const score=Number(a.riskScore)||0;
  alerts.unshift([a.reason,address,`${Number(a.value||0).toFixed(4)} ${a.asset||'ETH'}`,alertSeverity(score),score]);alerts.splice(MAX_ALERT_HISTORY);localStorage.setItem('chaintraceAlerts',JSON.stringify(alerts));syncAlertStats();
  renderTransactions();renderAlerts();
}
function showSuspiciousToast(address,a,emailState,escalation=null){
  const id=`toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const stack=$('#alertToastStack');
  const el=document.createElement('div');el.className='alert-toast';el.id=id;el.dataset.wallet=address.toLowerCase();
  const score=escalation?`${escalation.previousScore} → <strong>${a.riskScore} Critical</strong>`:`Risk <strong>${a.riskScore}/100</strong>`;
  el.innerHTML=`<div class="toast-top"><div class="toast-icon">!</div><b>${escalation?'RISK ESCALATED':'Suspicious activity detected'}</b><button class="toast-close" aria-label="Close">×</button></div><p><strong>${short(address)}</strong> · ${score}</p><p>${a.reason} · ${Number(a.value||0).toFixed(4)} ${a.asset||'ETH'}</p><div class="toast-actions"><button class="primary-toast toast-invest">Open Investigation</button><button class="toast-email">Send Email</button></div><div class="toast-mail ${emailState==='failed'?'warn':''}">${emailState==='sent'?'✓ Email alert sent':emailState==='failed'?'⚠ Email could not be sent':escalation?'New stronger evidence overrides cooldown':'Popup alert active'}</div>`;
  stack.appendChild(el);
  const remove=()=>el.remove();el.querySelector('.toast-close').onclick=remove;
  el.querySelector('.toast-invest').onclick=()=>{nav('investigations');$('#investigateInput').value=address;investigate();remove();};
  el.querySelector('.toast-email').onclick=()=>sendEmailAlert(address,a,el.querySelector('.toast-mail'));
  setTimeout(remove,15000);
}
function openAlertModal(address,a){
  activeAlert={address,a};$('#modalWallet').textContent=short(address);$('#modalAmount').textContent=`${Number(a.value||0).toFixed(4)} ${a.asset||'ETH'}`;$('#modalHash').textContent=short(a.hash);$('#modalProvider').textContent=a.provider||'Blockchain API';$('#modalRisk').textContent=`${alertSeverity(Number(a.riskScore)||0)} RISK · ${a.riskScore}/100`;$('#modalReason').textContent=a.reason;$('#modalEmailStatus').textContent='';$('#alertModal').classList.remove('hidden');
}
async function sendEmailAlert(address,a,statusEl){
  try{const r=await fetch('/api/email-alert',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({address,alert:a})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Email failed');if(statusEl)statusEl.textContent=`✓ Email sent to ${d.to}`;return true;}catch(e){if(statusEl)statusEl.textContent=`⚠ ${e.message}`;return false;}
}
const scanning=new Set();
async function scanWallet(address,baseline=false){
  if(!/^0x[a-fA-F0-9]{40}$/.test(address)||scanning.has(address))return;
  scanning.add(address);
  try{
    const r=await fetch(`/api/scan?address=${encodeURIComponent(address)}`);const d=await r.json();if(!r.ok)throw new Error(d.error||'Scan failed');
    for(const t of (d.recent||[])){const transferKey=`${address.toLowerCase()}:${t.hash}`;if(seenTransfers.has(transferKey))continue;seenTransfers.add(transferKey);addTransactionRecord(t);persistTransfers();}
    const banner=$('#monitorStatus');if(banner)banner.textContent=`Last live scan completed for ${short(address)} · ${d.recent?.length||0} recent transfers returned by ${d.provider}.`;
    for(const a0 of (d.suspicious||[]).slice(0,3)){
      const a={...a0,provider:d.provider};const key=`${address.toLowerCase()}:${a.hash}`;
      if(seenAlerts.has(key))continue;
      seenAlerts.add(key);persistSeen();
      if(!baseline){
        addAlertRecord(address,a);openAlertModal(address,a);
        let emailState='';
        if(localStorage.getItem('chaintraceAutoEmail')==='1')emailState=(await sendEmailAlert(address,a))?'sent':'failed';
        showSuspiciousToast(address,a,emailState);
      }
    }
  }catch(e){console.warn('ChainTrace monitor scan:',e.message);const banner=$('#monitorStatus');if(banner)banner.textContent=e.message;}finally{scanning.delete(address);}
}
async function primeMonitoring(){
  const baseline=localStorage.getItem('chaintraceMonitoringPrimed')!=='1';
  for(const w of state.monitored)if(/^0x[a-fA-F0-9]{40}$/.test(w))await scanWallet(w,baseline);
  localStorage.setItem('chaintraceMonitoringPrimed','1');
}
setInterval(()=>state.monitored.filter(w=>/^0x[a-fA-F0-9]{40}$/.test(w)).forEach(w=>scanWallet(w,false)),20000);
const seenGlobal=new Set(JSON.parse(localStorage.getItem('chaintraceSeenGlobalV2')||'[]'));let globalEvents=JSON.parse(localStorage.getItem('chaintraceGlobalEventsV2')||'[]'),popupHistory=JSON.parse(localStorage.getItem('chaintracePopupHistoryV2')||'{}');
function renderGlobal(){const rows=globalEvents.map(e=>{const level=e.riskLevel||alertSeverity(e.riskScore);return `<tr class="${level==='CRITICAL'?'risk-row-critical':''}"><td>${new Date(e.timestamp||Date.now()).toLocaleTimeString('en-IN')}</td><td>${short(e.hash)}</td><td>${short(e.from)}</td><td>${short(e.to)}</td><td>${Number(e.value||0).toFixed(4)}</td><td>${e.asset}</td><td class="risk-${level.toLowerCase()}">${e.riskScore}<small class="risk-label">${level}</small></td><td class="risk-reason ${level==='CRITICAL'?'critical-reason':''}">${e.reason}</td></tr>`;}).join('');$('#globalRows').innerHTML=rows||'<tr><td colspan="8">Waiting for a qualifying transfer in a newly scanned block.</td></tr>';}
function renderRiskQueue(){const findings=globalEvents.filter(e=>e.riskScore>=50),rows=findings.map(e=>{const w=e.flaggedWallet||e.from,added=state.monitored.includes(w),level=e.riskLevel||alertSeverity(e.riskScore);return `<tr class="${level==='CRITICAL'?'risk-row-critical':''}"><td><button class="monitor-queue-btn" data-watch="${w}" ${added?'disabled':''}>${added?'✓ Monitoring':'＋ Monitor wallet'}</button></td><td>${short(w)}</td><td class="risk-${level.toLowerCase()}">${e.riskScore}<small class="risk-label">${level}</small></td><td class="risk-reason ${level==='CRITICAL'?'critical-reason':''}">${e.reason}</td><td>${Number(e.value||0).toFixed(4)} ${e.asset}</td></tr>`}).join('');$('#riskRows').innerHTML=rows||'<tr><td colspan="5">No wallets currently match a dark pattern.</td></tr>';$('#riskBadge').textContent=findings.length;$('#riskSummary').textContent=`${findings.length} findings`;}
function renderAnalytics(){
  const events=globalEvents,queue=events.filter(e=>e.riskScore>=50),urgent=events.filter(e=>e.riskScore>=75),average=events.length?Math.round(events.reduce((sum,e)=>sum+Number(e.riskScore||0),0)/events.length):0;
  $('#analyticsFindings').textContent=events.length;$('#analyticsUrgent').textContent=urgent.length;$('#analyticsAverage').textContent=average;$('#analyticsQueue').textContent=queue.length;
  const trend=events.slice(0,16).reverse().map(e=>Number(e.riskScore||0));$('#analyticsRisk').innerHTML=trend.length>1?svgLine(trend,'#f08b1e','rgba(240,139,30,.10)'):'<div class="analytics-empty">Waiting for enough live findings to draw a trend.</div>';
  const patterns=[['Fan-out',/fan-out/i],['Fan-in',/fan-in/i],['Rapid movement',/rapid movement/i],['Burst activity',/sustained burst/i],['Large transfer',/Large .* transfer/i]].map(([name,test])=>[name,events.filter(e=>test.test(e.reason||'')).length]);
  const max=Math.max(1,...patterns.map(p=>p[1]));$('#patternBreakdown').innerHTML=patterns.map(([name,count])=>`<div><span>${name}</span><i style="width:${Math.max(8,count/max*100)}%">${count}</i></div>`).join('');
  const wallets=new Map();for(const e of events){const wallet=e.flaggedWallet||e.from,current=wallets.get(wallet);if(!current||e.riskScore>current.riskScore)wallets.set(wallet,{...e,wallet});}
  const rows=[...wallets.values()].sort((a,b)=>b.riskScore-a.riskScore).slice(0,5).map(e=>{const level=e.riskLevel||alertSeverity(e.riskScore),added=state.monitored.includes(e.wallet);return `<tr class="${level==='CRITICAL'?'risk-row-critical':''}"><td>${short(e.wallet)}</td><td class="risk-${level.toLowerCase()}">${e.riskScore} <small>${level}</small></td><td class="risk-reason">${e.reason}</td><td><button class="monitor-queue-btn" data-watch="${e.wallet}" ${added?'disabled':''}>${added?'✓ Monitoring':'＋ Monitor'}</button></td></tr>`;}).join('');
  $('#analyticsWalletRows').innerHTML=rows||'<tr><td colspan="4">No live findings yet.</td></tr>';
}
function popupDecision(e){const wallet=(e.flaggedWallet||e.from).toLowerCase(),now=Date.now(),previous=popupHistory[wallet];const previousScore=typeof previous==='object'?previous.score:0,lastAt=typeof previous==='object'?previous.at:Number(previous||0),escalated=Boolean(lastAt)&&e.riskScore>=previousScore+8;if(e.riskScore<90||(!escalated&&(now-lastAt<300000||$$('.alert-toast').length>=2)))return null;popupHistory[wallet]={at:now,score:e.riskScore};localStorage.setItem('chaintracePopupHistoryV2',JSON.stringify(popupHistory));return escalated?{previousScore}:{};}
async function scanGlobal(){try{const r=await fetch('/api/global-feed'),text=await r.text();let d;try{d=JSON.parse(text);}catch{throw new Error(`Global API unavailable (HTTP ${r.status}). Restart the Node server with npm start.`);}if(!r.ok)throw new Error(d.error||'Global scan failed');for(const e of d.events||[]){const id=`${e.hash}:${e.asset}:${e.from}:${e.to}`;if(seenGlobal.has(id))continue;seenGlobal.add(id);globalEvents.unshift(e);if(e.riskScore>=25){const w=e.flaggedWallet||e.from;addAlertRecord(w,e);const popup=popupDecision(e);if(popup){if('previousScore'in popup)$$('.alert-toast').filter(t=>t.dataset.wallet===w.toLowerCase()).forEach(t=>t.remove());showSuspiciousToast(w,e,'',popup);}}}globalEvents=globalEvents.slice(0,50);localStorage.setItem('chaintraceSeenGlobalV2',JSON.stringify([...seenGlobal].slice(-500)));localStorage.setItem('chaintraceGlobalEventsV2',JSON.stringify(globalEvents));renderGlobal();renderRiskQueue();renderAnalytics();$('#globalStatus').textContent=`Last global scan: ${d.events?.length||0} large-transfer candidates; Medium and above move to Risk Queue.`;}catch(e){$('#globalStatus').textContent=e.message;}}
setInterval(scanGlobal,20000);
$('#closeAlertModal').addEventListener('click',()=>$('#alertModal').classList.add('hidden'));$('#alertModal').addEventListener('click',e=>{if(e.target.id==='alertModal')$('#alertModal').classList.add('hidden')});
$('#modalInvestigate').addEventListener('click',()=>{if(activeAlert){$('#alertModal').classList.add('hidden');nav('investigations');$('#investigateInput').value=activeAlert.address;investigate();}});
$('#modalEmail').addEventListener('click',async()=>{if(!activeAlert)return;$('#modalEmailStatus').textContent='Sending email…';const ok=await sendEmailAlert(activeAlert.address,activeAlert.a,$('#modalEmailStatus'));if(ok)$('#modalEmail').textContent='Email Sent ✓';});
function setupMonitorActions(){
  document.addEventListener('click',async e=>{
    const watch=e.target.closest('[data-watch]');
    if(watch){const address=watch.dataset.watch;if(state.monitored.includes(address)){nav('monitor');showInfoToast(`Wallet ${short(address)} is already monitored.`);return;}if(state.monitored.length>=5){showInfoToast('Free-tier limit reached: remove a wallet before adding another.');return;}state.monitored.push(address);state.wallets=state.monitored.length;localStorage.setItem('chaintraceMonitored',JSON.stringify(state.monitored));renderMonitor();$('#walletCount').textContent=state.wallets;nav('monitor');showInfoToast(`Wallet ${short(address)} added to close monitoring.`);await scanWallet(address,true);return;}
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
function init(){state.wallets=state.monitored.length;setupMonitorActions();renderCharts();renderRiskBars();renderTransactions();renderAlerts();renderMonitor();renderGlobal();renderRiskQueue();renderAnalytics();checkApi();loadPrice();nav(initialView(),true);primeMonitoring();scanGlobal();$('#walletCount').textContent=state.wallets;syncAlertStats();$('#rWallets').textContent=state.wallets;$('#rTx').textContent=state.tx;}
init();
