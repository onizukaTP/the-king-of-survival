import { it } from 'vitest';
import { loadContent } from '../../src/content/loader';

it('generates the world', () => {
  const t = performance.now();
  const c = loadContent();
  const ms = Math.round(performance.now() - t);
  const sites = Object.values(c.sites);
  const tiers: Record<string, number> = {};
  for (const s of sites) { const k = `${s.tier ?? s.kind}${s.owner ? '' : ' (gen)'}`; tiers[k] = (tiers[k] ?? 0) + 1; }
  const towns = Object.values(c.towns);
  const buildings = towns.reduce((n, t) => n + t.buildings.length, 0);
  const wells = towns.flatMap((t) => t.water.filter((w) => w.kind === 'well'));
  console.log({ ms, sites: sites.length, tiers, buildings, wells: wells.length, dryWells: wells.filter((w) => w.dry).length, roadNodes: c.roads.nodes.length, roadEdges: c.roads.edges.length, waterAreas: c.water.areas.length });
  for (const s of sites.filter((x) => x.id.startsWith('loc.g_madurai'))) console.log(s.id, s.name, s.lat, s.lon);
});
