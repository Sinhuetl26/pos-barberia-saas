import {createHmac} from 'node:crypto';
import {prisma} from '@systech/database';
import {financialTransaction} from './cash-ledger.service';
import {requestAccess} from './authorization.service';
import {JWT_SECRET} from '../middleware/auth';

export const recipientKey=(email:string)=>createHmac('sha256',JWT_SECRET).update('mail-recipient:'+email.trim().toLowerCase()).digest('hex');
const states:Record<string,string>={'email.sent':'SENT','email.delivered':'DELIVERED','email.delivery_delayed':'DELAYED','email.bounced':'BOUNCED','email.complained':'COMPLAINED','email.failed':'FAILED','email.suppressed':'SUPPRESSED'};
const rank:Record<string,number>={PENDING:0,SENT:1,DELAYED:2,DELIVERED:3,FAILED:4,BOUNCED:5,SUPPRESSED:6,COMPLAINED:7};
export async function deliveryState(emailId:string,tx:any=prisma){
 const events=await tx.emailDeliveryEvent.findMany({where:{emailId}});
 return events.reduce((state:string,e:any)=>rank[e.status]>rank[state]?e.status:state,'PENDING');
}
export async function recordEmailEvent(id:string,event:any){
 const status=states[event?.type];if(!status)return {received:true,ignored:true};
 const emailId=event?.data?.email_id,time=new Date(event?.created_at);
 if(typeof emailId!=='string'||emailId.length>150||!emailId||!Number.isFinite(time.getTime()))throw Object.assign(new Error('Evento de correo inválido.'),{status:400});
 return requestAccess.exit(()=>financialTransaction(async tx=>{
  // The stable provider event ID makes retries harmless; early callbacks remain
  // available for reconciliation after the send request stores its message ID.
  const old=await tx.emailDeliveryEvent.findUnique({where:{id}});
  if(old)return {received:true,duplicate:true};
  await tx.emailDeliveryEvent.create({data:{id,emailId,status,occurredAt:time}});
  if(['BOUNCED','COMPLAINED','SUPPRESSED'].includes(status)){
   const recipients=event.data.to;if(!Array.isArray(recipients)||recipients.length>20)throw Object.assign(new Error('Destinatario inválido.'),{status:400});
   for(const email of recipients)if(typeof email==='string'&&email.length<=254&&/^\S+@\S+\.\S+$/.test(email))await tx.emailSuppression.upsert({where:{id:recipientKey(email)},create:{id:recipientKey(email),reason:status},update:{reason:status}});
  }
  await tx.$executeRaw`UPDATE "AuthAction" SET "id"="id" WHERE "providerMessageId"=${emailId}`;
  const current=await deliveryState(emailId,tx);
  await tx.authAction.updateMany({where:{providerMessageId:emailId},data:{deliveryStatus:current}});
  return {received:true};
 }));
}
