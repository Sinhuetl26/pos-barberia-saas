import {useEffect,useState} from 'react';
export function useNetworkStatus(){
 const [online,setOnline]=useState(()=>navigator.onLine);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 return online;
}
export function ConnectionStatus(){
 const online=useNetworkStatus();
 return online?null:<div role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">Sin conexión. No registres un nuevo cobro. Conserva esta pestaña; conecta datos móviles y recupera cualquier operación pendiente antes de volver a cobrar.</div>;
}
