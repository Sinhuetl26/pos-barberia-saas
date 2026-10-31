import { ReactNode } from 'react';

interface OperationStateProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  busy?: boolean;
}

/** A shared, factual state for unavailable or empty operating data. */
export function OperationState({ title, children, action, busy = false }: OperationStateProps) {
  return <div className="operation-state" role={busy ? 'status' : undefined}>
    <p className="font-semibold">{title}</p>
    <div className="mt-1 text-sm operation-muted">{children}</div>
    {action && <div className="mt-4">{action}</div>}
  </div>;
}
