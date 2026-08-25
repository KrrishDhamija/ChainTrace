require('dotenv').config();
const express=require('express'),path=require('path');
const nodemailer=require('nodemailer');
const app=express(),PORT=process.env.PORT||3000;
const KEY=process.env.ALCHEMY_API_KEY,NETWORK=process.env.ALCHEMY_NETWORK||'eth-mainnet';
app.use(express.json());
app.use(express.static(path.join(__dirname,'..')));

async function rpc(method,params){
  const r=await fetch(`https://${NETWORK}.g.alchemy.com/v2/${KEY}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  const d=await r.json();
  if(!r.ok||d.error)throw new Error(d.error?.message||`Alchemy HTTP ${r.status}`);
  return d.result;
}

function smtpConfigured(){return !!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.ALERT_EMAIL_TO);}
function mailer(){
  if(!smtpConfigured()) return null;
  return nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port:Number(process.env.SMTP_PORT||465),
    secure:String(process.env.SMTP_SECURE||'true')==='true',
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}
  });
}

app.get('/api/health',(q,s)=>s.json({ok:true,configured:!!KEY,network:NETWORK,provider:KEY?'Alchemy':'Blockscout fallback',emailConfigured:smtpConfigured()}));
app.get('/api/price',async(q,s)=>{try{const r=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true');const d=await r.json();if(!r.ok||!d.ethereum)throw new Error('CoinGecko price request failed');s.json({usd:d.ethereum.usd,change24h:d.ethereum.usd_24h_change||0});}catch(e){s.status(502).json({error:e.message});}});

async function getTransfers(address){
  if(KEY){
    const cats=['external','internal','erc20'];
    const base={fromBlock:'0x0',toBlock:'latest',category:cats,withMetadata:true,maxCount:'0x64',order:'desc'};
    const [a,b]=await Promise.all([rpc('alchemy_getAssetTransfers',[{...base,fromAddress:address}]),rpc('alchemy_getAssetTransfers',[{...base,toAddress:address}])]);
    const all=[...(a.transfers||[]),...(b.transfers||[])],seen=new Set();
    return {provider:'Alchemy',transfers:all.filter(t=>{const k=`${t.hash}|${t.from}|${t.to}|${t.category}|${t.value}`;if(seen.has(k))return false;seen.add(k);return true;})};
  }
  // Public Blockscout fallback: do not use the old `filter=from|to` query.
  // That query can return HTTP 422 on the Ethereum Blockscout instance.
  // The address-specific transactions endpoint already scopes results to the wallet.
  const url=`https://eth.blockscout.com/api/v2/addresses/${address}/transactions`;
  const r=await fetch(url,{headers:{accept:'application/json'}});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.message||d.error||`Blockscout HTTP ${r.status}`);
  const items=Array.isArray(d.items)?d.items:[];
  return {provider:'Blockscout',transfers:items.slice(0,100).map(t=>({
    blockNum:t.block||t.block_number,
    hash:t.hash,
    from:t.from?.hash||t.from,
    to:t.to?.hash||t.to,
    value:t.value?Number(t.value)/1e18:0,
    asset:'ETH',
    category:'transaction'
  }))};
}

app.get('/api/transfers',async(q,s)=>{
  const address=(q.query.address||'').trim();
  if(!/^0x[a-fA-F0-9]{40}$/.test(address))return s.status(400).json({error:'Invalid Ethereum address.'});
  try{const d=await getTransfers(address);s.json({address,network:'eth-mainnet',provider:d.provider,count:d.transfers.length,transfers:d.transfers});}
  catch(e){s.status(502).json({error:e.message});}
});

// Simple, explainable prototype risk engine for the hackathon demo.
function scoreTransfer(t){
  const value=Number(t.value||0);
  const text=`${t.category||''} ${t.asset||''}`.toLowerCase();
  let score=0,reason='';
  if(value>=100){score+=65;reason='Large-value transfer';}
  else if(value>=25){score+=45;reason='Unusually large transfer';}
  if(/erc20|token/.test(text))score+=8;
  if(/internal/.test(text))score+=5;
  if(/mixer|tornado|sanction/.test(text)){score+=30;reason='High-risk service interaction';}
  return {score:Math.min(99,score),reason:reason||'Unusual transfer pattern'};
}

app.get('/api/scan',async(q,s)=>{
  const address=(q.query.address||'').trim();
  if(!/^0x[a-fA-F0-9]{40}$/.test(address))return s.status(400).json({error:'Invalid Ethereum address.'});
  try{
    const d=await getTransfers(address);
    const suspicious=[];
    for(const t of d.transfers){
      const risk=scoreTransfer(t);
      if(risk.score>=70)suspicious.push({...t,riskScore:risk.score,reason:risk.reason});
    }
    s.json({address,provider:d.provider,suspiciousCount:suspicious.length,suspicious:suspicious.slice(0,10)});
  }catch(e){s.status(502).json({error:e.message});}
});

app.post('/api/email-alert',async(q,s)=>{
  const {address,alert}=q.body||{};
  if(!address||!alert)return s.status(400).json({error:'Missing alert details.'});
  if(!smtpConfigured())return s.status(503).json({sent:false,error:'Email is not configured. Add SMTP settings to .env.'});
  try{
    const transporter=mailer();
    const subject=`🚨 ChainTrace — Suspicious activity detected (${alert.riskScore}/100)`;
    const text=[
      'ChainTrace Suspicious Activity Alert','',
      `Wallet: ${address}`,
      `Risk score: ${alert.riskScore}/100`,
      `Reason: ${alert.reason}`,
      `Amount: ${alert.value||0} ${alert.asset||'ETH'}`,
      `Transaction: ${alert.hash||'Unknown'}`,
      `From: ${alert.from||'Unknown'}`,
      `To: ${alert.to||'Unknown'}`,
      '',
      'Open ChainTrace to investigate this wallet.'
    ].join('\n');
    await transporter.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:process.env.ALERT_EMAIL_TO,subject,text});
    s.json({sent:true,to:process.env.ALERT_EMAIL_TO});
  }catch(e){s.status(502).json({sent:false,error:e.message});}
});

app.listen(PORT,()=>console.log(`ChainTrace: http://localhost:${PORT}`));
