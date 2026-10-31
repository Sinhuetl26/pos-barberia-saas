import { SaleError } from './financial-error';
export const BOOKING_BUFFER = 10;
const names = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const normalize = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function civilParts(date: Date, zone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23' }).formatToParts(date);
    const p = Object.fromEntries(parts.map(x => [x.type,x.value]));
    return { day:`${p.year}-${p.month}-${p.day}`, time:`${p.hour}:${p.minute}:${p.second}`, minute:Number(p.hour)*60+Number(p.minute) };
  } catch { throw new SaleError(400,'INVALID_TIME_ZONE','La zona horaria de la sucursal requiere revisión.'); }
}
export function validDay(day: string) {
  if (typeof day!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(Date.parse(day+'T00:00:00Z')) || new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day) throw new SaleError(400,'INVALID_DATE','Usa una fecha válida YYYY-MM-DD.');
  return day;
}
export function appointmentTime(value: any, zone: string): Date {
  if(typeof value!=='string') throw new SaleError(400,'INVALID_DATE','Fecha y hora inválidas.');
  const local=/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/.exec(value);
  if(!local) {
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new SaleError(400,'INVALID_DATE','Indica fecha y hora local o un instante con zona.');
    validDay(value.slice(0,10));
    const date=new Date(value); if(!Number.isFinite(date.getTime())) throw new SaleError(400,'INVALID_DATE','Fecha y hora inválidas.');
    civilParts(date,zone); return date;
  }
  validDay(local[1]);
  const time=local[2]+':'+(local[3]||'00');
  if(Number(time.slice(0,2))>23 || Number(time.slice(3,5))>59 || Number(time.slice(6))>59) throw new SaleError(400,'INVALID_DATE','Hora inválida.');
  const wanted=Date.parse(local[1]+'T'+time+'Z'); let guessed=wanted;
  for(let i=0;i<4;i++) { const p=civilParts(new Date(guessed),zone); const seen=Date.parse(p.day+'T'+p.time+'Z'); guessed+=wanted-seen; }
  const matches=[guessed-3600000,guessed,guessed+3600000].filter(t=>{const p=civilParts(new Date(t),zone);return p.day===local[1]&&p.time===time;});
  if(matches.length!==1) throw new SaleError(400,'AMBIGUOUS_LOCAL_TIME','Esta hora no existe o es ambigua por cambio de horario. Elige otra.');
  return new Date(matches[0]);
}
export function configuredDays(raw: string) {
  const value=normalize(raw||'');
  if(/todos|diario/.test(value)) return names;
  const range=/([a-z]+)\s+a\s+([a-z]+)/.exec(value);
  if(range&&names.includes(range[1])&&names.includes(range[2])) {
    const out:string[]=[]; for(let i=names.indexOf(range[1]);out.length<7;i=(i+1)%7){out.push(names[i]);if(names[i]===range[2])break;}return out;
  }
  return names.filter((n,i)=>value.includes(n)||new RegExp('(?:^|[\\[,\\s])'+i+'(?:$|[\\],\\s])').test(value));
}
function minuteOf(value:string){if(!/^\d{2}:\d{2}$/.test(value)||Number(value.slice(0,2))>23||Number(value.slice(3))>59)throw new SaleError(400,'INVALID_SCHEDULE','Revisa los horarios configurados.');return Number(value.slice(0,2))*60+Number(value.slice(3));}
export function scheduleFits(branch:any,barber:any,start:Date,duration:number,buffer=BOOKING_BUFFER){
  const p=civilParts(start,branch.zonaHoraria), day=names[new Date(p.day+'T12:00:00Z').getUTCDay()];
  const end=civilParts(new Date(start.getTime()+(duration+buffer)*60000),branch.zonaHoraria);
  const override=barber._turnoEspecial?.fecha===p.day?barber._turnoEspecial:null;
  return configuredDays(branch.diasLaborales).includes(day)&&(override||!configuredDays(barber.diasDescanso).includes(day))&&p.time.endsWith(':00')&&end.day===p.day&&p.minute>=Math.max(minuteOf(branch.horarioApertura),minuteOf(override?.horarioInicio||barber.horarioInicio))&&end.minute<=Math.min(minuteOf(branch.horarioCierre),minuteOf(override?.horarioFin||barber.horarioFin));
}
export function bookingDateBounds(day:string,zone:string){validDay(day);const start=appointmentTime(day+'T00:00:00',zone);const next=new Date(day+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);return {gte:start,lt:appointmentTime(next.toISOString().slice(0,10)+'T00:00:00',zone)};}
