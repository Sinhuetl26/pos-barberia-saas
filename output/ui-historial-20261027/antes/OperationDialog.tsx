import { KeyboardEvent, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface OperationDialogProps {
  open: boolean;
  busy: boolean;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function OperationDialog({ open, busy, titleId, onClose, children, className = 'max-w-md' }: OperationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('h2, h3')?.focus();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open]);

  const keepFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]'))
      .filter(control => control.tabIndex >= 0 && !control.matches(':disabled') && control.getClientRects().length > 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement?.id === titleId)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  if (!open) return null;
  return createPortal(<dialog ref={dialogRef} aria-labelledby={titleId} aria-busy={busy} onKeyDown={keepFocus}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className={`operation-page m-auto w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto ${className} border-0 bg-transparent p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm`}>
    {children}
  </dialog>, document.body);
}
