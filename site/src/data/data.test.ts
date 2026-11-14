import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PROJECTS, LAB, STATS, FEATURED, AREAS } from './projects';
import { TITLE, HERO_LINE, ABOUT, ABOUT_HIGHLIGHTS, PAPER } from './site';
import { DRAW } from '../lib/minichart';

const repo = path.resolve(__dirname, '../../..');
const exists = (href: string) => fs.existsSync(path.join(repo, href.split('#')[0].split('?')[0]));

describe('project data', () => {
  it('every application has its live key number and a chart that draws', () => {
    for (const p of PROJECTS) {
      const s = STATS[p.stat];
      expect(s, p.slug).toBeTruthy();
      expect(s.demo).toBe(p.href.replace(/^\//, ''));
      expect(typeof DRAW[s.chart.type], p.slug).toBe('function');
      const d = DRAW[s.chart.type](s.chart);
      expect(d.svg.length).toBeGreaterThan(20);
      expect(d.desc.length).toBeGreaterThan(10);
    }
  });
  it('every linked page exists in the repository', () => {
    for (const p of PROJECTS) {
      expect(exists(p.href), p.href).toBe(true);
      if (p.memo) expect(exists(p.memo.href), p.memo.href).toBe(true);
      if (p.note) expect(exists(p.note.href), p.note.href).toBe(true);
    }
    for (const l of LAB) expect(exists(l.href), l.href).toBe(true);
    expect(exists(PAPER.pdf)).toBe(true);
    expect(exists(PAPER.summary)).toBe(true);
  });
  it('slugs are unique, areas are known and six projects are featured', () => {
    const slugs = PROJECTS.map(p => p.slug).concat(LAB.map(l => l.slug));
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of PROJECTS) expect(Object.keys(AREAS)).toContain(p.area);
    expect(FEATURED.length).toBe(6);
  });
});

describe('approved wording', () => {
  it('title, hero line and About are unchanged', () => {
    expect(TITLE).toBe('Quantitative Investment Management & AI Engineering');
    expect(HERO_LINE.startsWith('I work at the intersection of multi-asset investment management and AI engineering')).toBe(true);
    expect(ABOUT).toHaveLength(5);
    expect(ABOUT[0].startsWith('I have over six years of experience spanning')).toBe(true);
    expect(ABOUT[4].endsWith('complex analytical and operational processes.')).toBe(true);
  });
  it('every highlighted phrase occurs in the About text', () => {
    const all = ABOUT.join(' ');
    for (const h of ABOUT_HIGHLIGHTS) expect(all, h).toContain(h);
  });
  it('no em dashes in the site copy', () => {
    for (const t of [TITLE, HERO_LINE, ...ABOUT, ...PROJECTS.map(p => p.summary), ...LAB.map(l => l.summary)]) expect(t).not.toMatch(/—/);
  });
});
