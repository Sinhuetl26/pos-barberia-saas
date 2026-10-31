import {Router} from 'express';
import {Webhook} from 'svix';
import {recordEmailEvent} from '../services/email-delivery.service';

export const mailWebhookRouter=Router();
mailWebhookRouter.post('/resend',async(req:any,res,next)=>{
 const secret=process.env.RESEND_WEBHOOK_SECRET;
 if(!secret)return res.status(503).json({error:'Seguimiento de correo pendiente de configurar.'});
 let event:any;const id=req.get('svix-id');
 try{
  if(!Buffer.isBuffer(req.rawBody)||!id||id.length>200)throw new Error();
  new Webhook(secret).verify(req.rawBody,{ 'svix-id':id,'svix-timestamp':req.get('svix-timestamp')||'', 'svix-signature':req.get('svix-signature')||'' });
  event=JSON.parse(req.rawBody.toString('utf8'));
 }catch{return res.status(401).json({error:'Firma de correo inválida.'});}
 try{res.json(await recordEmailEvent(id,event));}catch(e){next(e);}
});
