import {resolveTxt} from 'node:dns/promises';
import {configuredValue,publicAppOrigin} from './provider-config.service';

let cached:{key:string,until:number,result:any}|undefined;
export async function emailReadiness(){
 const key=[process.env.RESEND_API_KEY,process.env.RESEND_DOMAIN_ID,process.env.EMAIL_FROM,process.env.RESEND_WEBHOOK_SECRET,process.env.APP_URL].join('|');
 if(cached?.key===key&&cached.until>Date.now())return cached.result;
 const result:any={configured:configuredValue(process.env.RESEND_API_KEY)&&configuredValue(process.env.EMAIL_FROM),domainVerified:false,spfVerified:false,dkimVerified:false,dmarc:'PENDIENTE',webhookConfigured:configuredValue(process.env.RESEND_WEBHOOK_SECRET),originReady:false,checkedAt:new Date().toISOString(),issues:[]};
 try{publicAppOrigin();result.originReady=true;}catch{result.issues.push('Configurar dirección pública segura de la aplicación.');}
 const domainId=process.env.RESEND_DOMAIN_ID,sender=process.env.EMAIL_FROM||'',address=/<([^<>]+)>/.exec(sender)?.[1]||sender,domain=address.split('@')[1]?.toLowerCase();
 if(!result.configured)result.issues.push('Configurar proveedor y remitente.');
 if(!domainId||!domain)result.issues.push('Conectar el dominio remitente.');
 else if(result.configured){
  try{
   const response=await fetch('https://api.resend.com/domains/'+encodeURIComponent(domainId),{headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY},signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw new Error();const data:any=await response.json();
   if(data.name?.toLowerCase()!==domain)throw new Error();
   const records=Array.isArray(data.records)?data.records:[];
   result.spfVerified=records.some((r:any)=>r.record==='SPF'&&r.type==='TXT'&&r.status==='verified');
   result.dkimVerified=records.some((r:any)=>r.record==='DKIM'&&r.status==='verified');
   result.domainVerified=data.status==='verified'&&data.capabilities?.sending!=='disabled'&&result.spfVerified&&result.dkimVerified;
   try{const txt=await Promise.race([resolveTxt('_dmarc.'+domain),new Promise<never>((_,reject)=>{const t=setTimeout(()=>reject(new Error()),3000);t.unref();})]);const record=txt.map(parts=>parts.join('')).filter(v=>/^v=DMARC1;/i.test(v));result.dmarc=record.length===1&&/;\s*p=(none|quarantine|reject)(?:;|$)/i.test(record[0])?'PUBLICADO_POR_REVISAR':'PENDIENTE';}catch{/* DNS readiness is separate from provider configuration. */}
  }catch{result.issues.push('No se pudo comprobar el dominio en el proveedor.');}
 }
 if(!result.domainVerified)result.issues.push('Verificar SPF y DKIM del dominio remitente.');
 if(!result.webhookConfigured)result.issues.push('Configurar seguimiento firmado de entrega.');
 result.readyForDeliveryTest=result.domainVerified&&result.webhookConfigured&&result.originReady;
 // A published DMARC policy and accepted API request do not prove inbox delivery.
 result.deliveryTestVerified=false;
 cached={key,until:Date.now()+60000,result};return result;
}
