import { Fragment } from 'react';

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* Renders text unchanged, with the given phrases shown in the teal accent. Styling only: the words are never altered. */
export function Highlighted({ text, phrases }: { text: string; phrases: string[] }) {
  const list = [...phrases].sort((a, b) => b.length - a.length);
  if (!list.length) return <>{text}</>;
  const re = new RegExp(`(${list.map(esc).join('|')})`, 'g');
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) => list.includes(part)
        ? <span key={i} className="about-hl">{part}</span>
        : <Fragment key={i}>{part}</Fragment>)}
    </>
  );
}
