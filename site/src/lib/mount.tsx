import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/app.css';
import { Shell } from '@/components/Shell';

/* Mount a page into #root inside the shared shell. */
export function mount(page: ReactNode) {
  const el = document.getElementById('root')!;
  createRoot(el).render(<StrictMode><Shell>{page}</Shell></StrictMode>);
}
export const rootSlug = (): string => document.getElementById('root')?.dataset.slug || '';
