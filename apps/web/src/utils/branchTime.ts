export function branchToday(zone='America/Mexico_City',date=new Date()) {
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;
}
export function branchDateTime(instant:string,zone='America/Mexico_City') {return new Date(instant).toLocaleString('es-MX',{timeZone:zone,dateStyle:'medium',timeStyle:'short'});}
