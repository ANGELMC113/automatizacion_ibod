import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X, Link2 } from 'lucide-react';

interface EditableMetadataCellProps {
  value?: string;
  onSave: (value: string) => void;
  className?: string;
  isLinked?: boolean;
  linkedTooltip?: string;

  // Optional click behavior
  onSingleClick?: () => void;
  onDoubleClick?: () => void;
}

const CLICK_DELAY = 400;

export const EditableMetadataCell: React.FC<
  EditableMetadataCellProps
> = ({
  value,
  onSave,
  className = '',
  isLinked = false,
  linkedTooltip = 'Metadato vinculado a un ancestro',
  onSingleClick,
  onDoubleClick,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayValue = value?.trim() ? value : '';
  const isUrl =
    displayValue.startsWith('http://') ||
    displayValue.startsWith('https://');

  const clearClickTimer = useCallback(() => {
    if (clickTimer.current !== null) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
  }, []);

  const openUrl = useCallback(() => {
    if (!isUrl) return;

    window.open(displayValue, '_blank', 'noopener,noreferrer');
  }, [displayValue, isUrl]);

  const startEditing = useCallback(() => {
    if (isLinked) return;

    clearClickTimer();
    setDraft(value ?? '');
    setEditing(true);
  }, [clearClickTimer, isLinked, value]);

  const save = useCallback(() => {
    if (isLinked) {
      setDraft(value ?? '');
      setEditing(false);
      return;
    }

    if (draft !== (value ?? '')) {
      onSave(draft);
    }

    setEditing(false);
  }, [draft, isLinked, onSave, value]);

  const cancel = useCallback(() => {
    setDraft(value ?? '');
    setEditing(false);
  }, [value]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  // Focus the editor when editing begins.
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
      adjustTextareaHeight();
    }
  }, [editing, adjustTextareaHeight]);

  // Keep the draft synchronized with external value changes.
  useEffect(() => {
    if (!editing) {
      setDraft(value ?? '');
    }
  }, [value, editing]);

  // Linked metadata must never remain editable.
  useEffect(() => {
    if (isLinked && editing) {
      setEditing(false);
      setDraft(value ?? '');
    }
  }, [isLinked, editing, value]);

  // Clean up pending clicks on unmount.
  useEffect(() => {
    return clearClickTimer;
  }, [clearClickTimer]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();

      const target = event.target as HTMLElement;
      const clickedLink = target.closest('a');
      const isLinkClick = Boolean(clickedLink);

      // Linked metadata is read-only, but URLs remain accessible.
      if (isLinked) {
        if (isUrl && isLinkClick) {
          openUrl();
        }
        return;
      }

      // A second click cancels the pending single-click action.
      if (clickTimer.current !== null) {
        clearClickTimer();

        if (onDoubleClick) {
          onDoubleClick();
        } else {
          startEditing();
        }

        return;
      }

      // Defer the single-click action to distinguish a double-click.
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;

        if (isUrl && isLinkClick) {
          openUrl();
        } else {
          onSingleClick?.();
        }
      }, CLICK_DELAY);
    },
    [
      clearClickTimer,
      isLinked,
      isUrl,
      onDoubleClick,
      onSingleClick,
      openUrl,
      startEditing,
    ],
  );

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      save();
    }
  };

  if (editing && !isLinked) {
    return (
      <div
        className="min-w-[100px] space-y-2"
        onClick={(event) => event.stopPropagation()}
      >
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            adjustTextareaHeight();
          }}
          onKeyDown={handleKeyDown}
          onBlur={save}
          rows={2}
          className="w-full min-w-[100px] resize-none overflow-hidden rounded-md border border-cyan-500 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-cyan-500"
          placeholder="Introducir valor..."
        />

        <div className="flex gap-1">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={save}
            className="rounded p-1 text-emerald-400 hover:bg-slate-800"
            title="Guardar"
            aria-label="Guardar"
          >
            <Check className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={cancel}
            className="rounded p-1 text-rose-400 hover:bg-slate-800"
            title="Cancelar"
            aria-label="Cancelar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      title={
        isLinked
          ? linkedTooltip
          : isUrl || onSingleClick
            ? 'Un clic para abrir · Doble clic para editar'
            : undefined
      }
      className={`group inline-flex min-w-0 items-center rounded px-1 ${
        isLinked
          ? 'cursor-default'
          : 'cursor-text hover:bg-slate-800/70'
      } ${className}`}
    >
      <div className="flex items-start gap-1.5">
        {isLinked && (
          <Link2
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400"
            aria-label="Metadato vinculado"
          />
        )}

        <div className="min-w-0 flex-1">
          {displayValue ? (
            isUrl ? (
              <a
                href={displayValue}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.preventDefault()}
                className={`break-all hover:underline ${
                  isLinked ? 'text-blue-300' : 'text-cyan-400'
                }`}
              >
                {displayValue}
              </a>
            ) : (
              <span
                className={`break-words whitespace-pre-wrap ${
                  isLinked ? 'text-blue-300' : 'text-slate-200'
                }`}
              >
                {displayValue}
              </span>
            )
          ) : (
            <span
              className={
                isLinked ? 'text-blue-300' : 'text-slate-600'
              }
            >
              ---
            </span>
          )}
        </div>

        {!isLinked && (
          <span className="ml-1 text-[10px] text-slate-500 opacity-0 group-hover:opacity-100">
            ✎
          </span>
        )}
      </div>
    </div>
  );
};