import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type State = 'idle' | 'copied' | 'failed';

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

/* Copy-to-clipboard button. Confirms with a check that draws in and a label that slides, and announces the result. */
export function CopyEmail({ email }: { email: string }) {
  const [state, setState] = useState<State>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const onCopy = async () => {
    const ok = await copyText(email);
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2200);
  };
  const label = state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy';
  return (
    <>
      <motion.button type="button" onClick={onCopy} whileTap={{ scale: .96 }} aria-label={`Copy email address ${email}`}
        className={`relative inline-flex h-11 items-center justify-center gap-2 max-sm:w-full overflow-hidden rounded-full px-5 text-[14.5px] font-medium ring-1 ring-inset transition-[color,background-color,box-shadow] duration-300 ${state === 'copied' ? 'bg-teal/[.1] text-teal ring-teal/50' : 'text-ink ring-line-strong hover:ring-teal'}`}>
        <span className="relative grid size-4 place-items-center" aria-hidden="true">
          <AnimatePresence mode="wait" initial={false}>
            {state === 'copied' ? (
              <motion.svg key="check" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
                initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .6 }} transition={{ duration: .2 }}>
                <motion.path d="M3 8.5l3.2 3.2L13 4.8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .35, delay: .05, ease: [.25, 1, .5, 1] }} />
              </motion.svg>
            ) : (
              <motion.svg key="copy" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                initial={{ opacity: 0, scale: .6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .6 }} transition={{ duration: .2 }}>
                <rect x="5.5" y="5.5" width="8" height="8" rx="1.8" /><path d="M10.5 3.2V3a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.3" />
              </motion.svg>
            )}
          </AnimatePresence>
        </span>
        <span className="relative inline-grid min-w-[5.2rem] overflow-hidden text-left max-sm:min-w-0">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={label} initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-100%', opacity: 0 }}
              transition={{ duration: .28, ease: [.25, 1, .5, 1] }} className="col-start-1 row-start-1">{label}</motion.span>
          </AnimatePresence>
        </span>
      </motion.button>
      <span className="sr-only" role="status" aria-live="polite">{state === 'copied' ? 'Email address copied to the clipboard' : state === 'failed' ? 'Copy failed. Select the address to copy it.' : ''}</span>
    </>
  );
}
