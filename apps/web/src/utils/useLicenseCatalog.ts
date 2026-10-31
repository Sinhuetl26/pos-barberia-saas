import { useEffect, useState } from 'react';
import { api } from '../api';
import { PublicLicenseCatalog } from './licenseCatalog';
export function useLicenseCatalog() {
  const [catalog, setCatalog] = useState<PublicLicenseCatalog | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.getLicenseCatalog().then(data => { if (active) setCatalog(data); }).catch(() => { if (active) setError('No pudimos consultar los precios. Intenta nuevamente antes de elegir el plan.'); });
    return () => { active = false; };
  }, []);
  return { catalog, error };
}
