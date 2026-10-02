import type { ReactNode } from 'react';
import { preserveEditorSelectionOnControlMouseDown } from '../../lib/tiptapTextStyleCommands';
import { cn } from '../../lib/utils';

type Props = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
  className?: string;
};

/**
 * Toolbar control that keeps TipTap text selection when clicked (same pattern as blog format bar).
 */
export function EditorToolbarButton({ onClick, active, disabled, title, children, className }: Props) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        preserveEditorSelectionOnControlMouseDown(e);
        if (!disabled) onClick();
      }}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition',
        active && 'border-brand-blue/50 bg-brand-blue/10 text-brand-blue',
        !disabled && !active && 'hover:border-brand-blue/30 hover:text-brand-blue',
        disabled && 'opacity-40',
        className,
      )}
    >
      {children}
    </button>
  );
}
