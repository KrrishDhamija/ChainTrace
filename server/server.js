require('dotenv').config();
const express=require('express'),path=require('path'),nodemailer=require('nodemailer');
const app=express(),PORT=process.env.PORT||3000,KEY=process.env.ALCHEMY_API_KEY,NETWORK=process.env.ALCHEMY_NETWORK||'eth-mainnet',TIMEOUT=10000;
app.use(express.json());app.use(express.static(path.join(__dirname,'..')));
async function request(url,options={}){const r=await fetch(url,{...options,signal:AbortSignal.timeout(TIMEOUT)}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||d.error||`Provider HTTP ${r.status}`);return d;}
async function rpc(method,params){if(!KEY)throw new Error('Alchemy API key is required for live monitoring.');const d=await request(`https://${NETWORK}.g.alchemy.com/v2/${KEY}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});if(d.error)throw new Error(d.error.message||'Alchemy request failed');return d.result;}
function smtpConfigured(){return !!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.ALERT_EMAIL_TO);}
function mailer(){return nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),secure:String(process.env.SMTP_SECURE||'true')==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});}
function normalise(t){return {blockNum:t.blockNum||t.block||t.block_number,hash:t.hash,from:t.from?.hash||t.from,to:t.to?.hash||t.to,value:Number(t.value||0),asset:(t.asset||'ETH').toUpperCase(),category:t.category||'transaction',timestamp:t.metadata?.blockTimestamp||t.timestamp||null};}
async function getTransfers(address,liveOnly=false){if(KEY){const base={fromBlock:'0x0',toBlock:'latest',category:['external','internal','erc20'],withMetadata:true,maxCount:'0x64',order:'desc'},[a,b]=await Promise.all([rpc('alchemy_getAssetTransfers',[{...base,fromAddress:address}]),rpc('alchemy_getAssetTransfers',[{...base,toAddress:address}])]),seen=new Set(),transfers=[...(a.transfers||[]),...(b.transfers||[])].map(normalise).filter(t=>{const id=`${t.hash}|${t.from}|${t.to}|${t.category}|${t.value}`;if(seen.has(id))return false;seen.add(id);return true;});return {provider:'Alchemy',transfers};}if(liveOnly)throw new Error('Live monitoring requires a free Alchemy API key. Add ALCHEMY_API_KEY to .env.');const d=await request(`https://eth.blockscout.com/api/v2/addresses/${address}/transactions`,{headers:{accept:'application/json'}});return {provider:'Blockscout',transfers:(Array.isArray(d.items)?d.items:[]).slice(0,100).map(normalise)};}
function scoreTransfer(t){const asset=String(t.asset||'').toUpperCase(),value=Number(t.value||0);if(asset==='ETH'&&value>=10)return {riskScore:85,reason:'Large ETH transfer (≥ 10 ETH)'};if(['USDC','USDT','DAI'].includes(asset)&&value>=10000)return {riskScore:85,reason:`Large stablecoin transfer (≥ 10,000 ${asset})`};return {riskScore:0,reason:null};}
const STABLES={USDC:{address:'0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',decimals:6},USDT:{address:'0xdac17f958d2ee523a2206206994597c13d831ec7',decimals:6},DAI:{address:'0x6b175474e89094c44da98b954eedeac495271d0f',decimals:18}},TRANSFER='0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',PATTERN_WINDOW=10*60*1000;
const walletActivity=new Map(),riskCache=new Map();
function topicAddress(topic){return `0x${topic.slice(-40)}`;}
function assessPattern(e){
  const id=`${e.hash}:${e.asset}:${e.from}:${e.to}`;
  if(riskCache.has(id))return {...e,...riskCache.get(id)};
  const now=e.timestamp||Date.now(),cutoff=now-PATTERN_WINDOW,from=String(e.from||'').toLowerCase(),to=String(e.to||'').toLowerCase();
  const out=(walletActivity.get(from)?.out||[]).filter(x=>x.timestamp>=cutoff),incoming=(walletActivity.get(to)?.in||[]).filter(x=>x.timestamp>=cutoff);
  out.push(e);incoming.push(e);
  walletActivity.set(from,{out,in:(walletActivity.get(from)?.in||[]).filter(x=>x.timestamp>=cutoff)});
  walletActivity.set(to,{out:(walletActivity.get(to)?.out||[]).filter(x=>x.timestamp>=cutoff),in:incoming});
  const recipients=new Set(out.map(x=>String(x.to||'').toLowerCase())).size,sources=new Set(incoming.map(x=>String(x.from||'').toLowerCase())).size,total=out.length+incoming.length;
  const rapid=total>=3,burst=total>=6,fanOut=out.length>=3&&recipients>=3,fanIn=incoming.length>=3&&sources>=3;
  const amountScore=e.asset==='ETH'?(e.value>=100?25:e.value>=50?20:12):(e.value>=100000?25:e.value>=50000?20:12);
  let riskScore=amountScore,flaggedWallet=null;
  const signals=[`Large ${e.asset} transfer (+${amountScore})`];
  if(rapid){riskScore+=18;flaggedWallet=e.from;signals.push(`rapid movement: ${total} transfers / 10 min (+18)`);}
  if(burst){riskScore+=12;flaggedWallet=e.from;signals.push(`sustained burst (+12)`);}
  if(fanOut){riskScore+=22;flaggedWallet=e.from;signals.push(`fan-out to ${recipients} wallets (+22)`);}
  if(fanIn){riskScore+=18;flaggedWallet=e.to;signals.push(`fan-in from ${sources} wallets (+18)`);}
  if(recipients>=5){riskScore+=10;flaggedWallet=e.from;signals.push(`wide recipient spread (+10)`);}
  if(sources>=5){riskScore+=8;flaggedWallet=e.to;signals.push(`wide source spread (+8)`);}
  if(fanOut&&fanIn&&burst){riskScore+=15;signals.push(`compounded flow pattern (+15)`);}
  riskScore=Math.min(99,riskScore);
  const riskLevel=riskScore>=90?'CRITICAL':riskScore>=75?'HIGH':riskScore>=50?'MEDIUM':'LOW';
  const reason=`${riskLevel}: ${signals.join(' · ')}.`;
  const risk={riskScore,riskLevel,reason,flaggedWallet};riskCache.set(id,risk);return {...e,...risk};
}
async function globalFeed(){const block=await rpc('eth_getBlockByNumber',['latest',true]),events=[];for(const tx of block.transactions||[]){const value=Number(BigInt(tx.value||'0x0'))/1e18;if(value>=10)events.push({hash:tx.hash,from:tx.from,to:tx.to,value,asset:'ETH',blockNum:parseInt(block.number,16),timestamp:Number(parseInt(block.timestamp,16))*1000});}for(const [asset,meta] of Object.entries(STABLES)){const logs=await rpc('eth_getLogs',[{fromBlock:block.number,toBlock:block.number,address:meta.address,topics:[TRANSFER]}]);for(const log of logs||[]){if(!log.topics?.[1]||!log.topics?.[2])continue;const value=Number(BigInt(log.data||'0x0'))/10**meta.decimals;if(value>=10000)events.push({hash:log.transactionHash,from:topicAddress(log.topics[1]),to:topicAddress(log.topics[2]),value,asset,blockNum:parseInt(block.number,16),timestamp:Number(parseInt(block.timestamp,16))*1000});}}return events.slice(0,50).map(assessPattern);}
function address(q){return (q.query.address||'').trim();}function valid(a){return /^0x[a-fA-F0-9]{40}$/.test(a);}
app.get('/api/health',(q,s)=>s.json({ok:true,configured:!!KEY,monitoringReady:!!KEY,network:NETWORK,provider:KEY?'Alchemy':'Blockscout fallback',emailConfigured:smtpConfigured()}));
app.get('/api/price',async(q,s)=>{try{const d=await request('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true');s.json({usd:d.ethereum.usd,change24h:d.ethereum.usd_24h_change||0});}catch(e){s.status(502).json({error:e.message});}});
app.get('/api/transfers',async(q,s)=>{const a=address(q);if(!valid(a))return s.status(400).json({error:'Invalid Ethereum address.'});try{const d=await getTransfers(a);s.json({address:a,network:'eth-mainnet',provider:d.provider,count:d.transfers.length,transfers:d.transfers});}catch(e){s.status(502).json({error:e.message});}});
app.get('/api/scan',async(q,s)=>{const a=address(q);if(!valid(a))return s.status(400).json({error:'Invalid Ethereum address.'});if(!KEY)return s.status(503).json({error:'Live monitoring requires a free Alchemy API key. Add ALCHEMY_API_KEY to .env.'});try{const d=await getTransfers(a,true),suspicious=d.transfers.map(t=>({...t,...scoreTransfer(t)})).filter(t=>t.riskScore>=70);s.json({address:a,provider:d.provider,recent:d.transfers.slice(0,10),suspiciousCount:suspicious.length,suspicious:suspicious.slice(0,10)});}catch(e){s.status(502).json({error:e.message});}});
app.get('/api/global-feed',async(q,s)=>{if(!KEY)return s.status(503).json({error:'Global feed requires a free Alchemy API key.'});try{s.json({provider:'Alchemy',events:await globalFeed()});}catch(e){s.status(502).json({error:e.message});}});
app.post('/api/email-alert',async(q,s)=>{const {address,alert}=q.body||{};if(!address||!alert)return s.status(400).json({error:'Missing alert details.'});if(!smtpConfigured())return s.status(503).json({sent:false,error:'Email is not configured. Add SMTP settings to .env.'});try{await mailer().sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:process.env.ALERT_EMAIL_TO,subject:`🚨 ChainTrace — Suspicious activity (${alert.riskScore}/100)`,text:`Wallet: ${address}\nRisk: ${alert.riskScore}/100\nReason: ${alert.reason}\nAmount: ${alert.value||0} ${alert.asset||'ETH'}\nTransaction: ${alert.hash||'Unknown'}`});s.json({sent:true,to:process.env.ALERT_EMAIL_TO});}catch(e){s.status(502).json({sent:false,error:e.message});}});
app.listen(PORT,()=>console.log(`ChainTrace: http://localhost:${PORT}`));
