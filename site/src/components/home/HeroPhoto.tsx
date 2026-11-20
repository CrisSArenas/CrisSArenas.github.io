import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { NAME } from '@/data/site';
import { foundEgg, markEggFound } from '@/lib/egg';

const ease = [.25, 1, .5, 1] as const;
const GAP_MS = 4000;

/* The portrait, with something behind it. Three clicks within a few seconds of each other: the first glitches it,
   the second peels a corner back, the third slides it aside and offers the way in. It is deliberately not a button,
   so it stays a secret; the dialog it opens is a proper, keyboard-usable dialog. */
export function HeroPhoto() {
  const [stage, setStage] = useState(0);
  const [found, setFound] = useState(false);
  const [open, setOpen] = useState(false);
  const clicks = useRef({ n: 0, t: 0 });
  const timer = useRef<number | undefined>(undefined);
  const enterRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => { setFound(foundEgg()); return () => window.clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!open) return;
    enterRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function after(ms: number, fn: () => void) { window.clearTimeout(timer.current); timer.current = window.setTimeout(fn, ms); }
  function close() { setOpen(false); setStage(0); clicks.current.n = 0; }

  function onClick() {
    if (open) return;
    const now = performance.now(), c = clicks.current;
    c.n = now - c.t > GAP_MS ? 1 : c.n + 1;
    c.t = now;
    if (c.n === 1) { setStage(1); after(480, () => setStage(0)); }
    else if (c.n === 2) { setStage(2); after(1300, () => setStage(0)); }
    else {
      c.n = 0;
      setStage(3);
      markEggFound(); setFound(true);
      after(650, () => setOpen(true));
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease }}
        className="nf-egg relative mx-auto mb-7 size-[88px] sm:size-28" data-stage={stage} data-found={found ? '' : undefined}>
        <div aria-hidden="true" className="nf-behind">
          <span className="nf-behind-text">{stage === 3 ? 'ACCESS' : 'KEEP GOING'}</span>
        </div>
        <img src="/assets/images/profile-800.webp" alt={NAME} width={112} height={112} decoding="async" fetchPriority="high" draggable={false}
          onClick={onClick}
          className="nf-photo relative size-full rounded-full object-cover ring-2 ring-sand/80 ring-offset-4 ring-offset-page" />
      </motion.div>
      {open && (
        <div className="nf-gate" role="dialog" aria-modal="true" aria-labelledby="nf-gate-title" onClick={e => { if (e.target === e.currentTarget) close(); }}>
          <div className="nf-gate-panel">
            <div className="nf-gate-rain" aria-hidden="true" />
            <p className="nf-gate-kicker">Access granted</p>
            <h2 id="nf-gate-title" className="nf-gate-title"><span>Neon</span> <span>Furnace</span></h2>
            <p className="nf-gate-copy">A rogue AI has taken the tower. Fight across five districts of a neon city, glide between the rooftops and take it back. The soundtrack is composed live in your browser.</p>
            <div className="nf-gate-actions">
              <a ref={enterRef} href="/furnace.html" className="nf-gate-enter">Enter</a>
              <button type="button" className="nf-gate-later" onClick={close}>Not now</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
