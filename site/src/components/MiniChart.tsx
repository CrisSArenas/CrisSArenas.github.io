import { DRAW, MINI } from '@/lib/minichart';
import type { CardStat } from '@/data/projects';

/* The small chart on a project card, drawn from the application's own base-case output. */
export function MiniChart({ stat, className = '' }: { stat?: CardStat; className?: string }) {
  if (!stat || !DRAW[stat.chart.type]) return null;
  const d = DRAW[stat.chart.type](stat.chart);
  return (
    <svg className={`mini-chart ${className}`} viewBox={`0 0 ${MINI.W} ${MINI.H}`} role="img" aria-label={d.desc}
      dangerouslySetInnerHTML={{ __html: d.svg }} />
  );
}
