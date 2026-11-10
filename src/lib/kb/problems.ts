// The problems inside one merged ticket. Built on causes.ts: a report's problem is its cause by tenant,
// unless the desk read its body as a one-day move (desk-notes.json). Those reports describe a date that
// moved by a single day, not a day and month that swapped, so no fix to either cause would close them.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'shift' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'shift', 'unplaced'];

export const PROBLEM_TITLE: Record<Problem, string> = {
  parser: 'The shared parser reads day-first dates month first',
  hint: 'booking-v3 prints an MM/DD hint to day-first tenants',
  shift: 'A date moves by one day with the time zone',
  unplaced: 'No tenant on file: cause unknown',
};

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'shift';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  // What intake tagged these reports as: tag → count. A guess from the browser, not the cause.
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function mergedInto(reports: Report[], ticket: number): Report[] {
  return uniqueById(reports).filter((r) => r.mergedInto === ticket);
}

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const by = new Map<Problem, Report[]>();
  for (const r of reports) {
    const p = problemOf(r, tenantOf(r), oneDayMove);
    by.set(p, [...(by.get(p) ?? []), r]);
  }
  return PROBLEMS.filter((p) => by.has(p)).map((problem) => {
    const rs = by.get(problem)!;
    const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
    return {
      problem,
      reports: rs,
      tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
      channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
      taggedAs: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.meta.intakeTag]: (n[r.meta.intakeTag] ?? 0) + 1 }), {}),
      firstSeen: days[0],
      lastSeen: days[days.length - 1],
    };
  });
}
