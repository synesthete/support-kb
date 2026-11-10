<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, mergedInto, PROBLEM_TITLE, type Problem } from '#lib/kb/problems';

  // `issues`: the tracker issue filed for each problem, by number. `listUpTo`: groups this small get
  // every report listed with its own words, so the desk can check the reading.
  let {
    ticket,
    repo,
    issues = {},
    listUpTo = 10,
  }: { ticket: number; repo: string; issues?: Partial<Record<Problem, number>>; listUpTo?: number } = $props();

  const rows = (reports as Report[]).length;
  const merged = $derived(mergedInto(reports as Report[], ticket));
  const groups = $derived(groupByProblem(merged, tenantOf, notes.oneDayMove));
  // `shift` cuts across the causes, so only the filed causes add up to the ticket.
  const placed = $derived(groups.filter((g) => g.problem !== 'shift').reduce((n, g) => n + g.reports.length, 0));
  const tally = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports merged into #{ticket} ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>
<p class="check">
  The export holds {rows} rows; {rows - merged.length} repeat a report already counted (overlapping export pages).
  {placed === merged.length ? `Every one of the ${merged.length} reports is filed under exactly one cause, the desk's way (causes.ts).` : `${merged.length - placed} reports are filed under no cause: check problems.ts.`}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>channels</th><th>tagged as</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code><br /><span class="title">{PROBLEM_TITLE[g.problem]}</span></td>
        <td class="n">{g.reports.length}</td>
        <td>{g.tenants.length}</td>
        <td class="tags">{tally(g.channels)}</td>
        <td class="tags">{tally(g.taggedAs)}</td>
        <td class="seen">{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if issues[g.problem]}
            <a href="{repo}/issues/{issues[g.problem]}">#{issues[g.problem]}</a>
          {:else}
            <span class="none">no ticket yet</span>
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#each groups as g (g.problem)}
  {#if g.alsoShift}
    <p class="note">
      {g.alsoShift} of the <code>{g.problem}</code> reports read as a one-day move: counted under <code>{g.problem}</code>,
      where the desk files them by tenant, and tracked as <code>shift</code>{issues.shift ? ` in #${issues.shift}` : ''}.
    </p>
  {/if}
{/each}

{#each groups as g (g.problem)}
  {#if g.reports.length <= listUpTo}
    <details open>
      <summary><code>{g.problem}</code>: all {g.reports.length} reports</summary>
      <ul>
        {#each g.reports as r (r.id)}
          <li><code>{r.id}</code> · {r.tenant} · {r.channel} · {r.receivedAt.slice(0, 10)} — “{r.body}”</li>
        {/each}
      </ul>
    </details>
  {/if}
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .check, .note, .tags, .title, .seen { color: var(--muted); font-size: 0.85em; }
  .n { font-weight: 600; }
  .seen { white-space: nowrap; }
  .none { color: var(--warn); font-weight: 600; }
  details { margin: 1rem 0; }
  summary { cursor: pointer; }
  li { margin: 0.25rem 0; font-size: 0.92rem; }
</style>
