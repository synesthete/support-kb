// The problems inside one merged ticket, counted the desk's way (causes.ts): every report is filed under
// its cause by tenant. Reports the desk read as a one-day move (desk-notes.json) describe a date that moved
// by a single day, not a day and month that swapped, so no fix to either cause closes them: they are a
// problem of their own, `shift`. As the desk does with any report it reads differently from its cause,
// they stay counted where they are filed and are footnoted there.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'shift' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'shift', 'unplaced'];

export const PROBLEM_TITLE: Record<Problem, string> = {
  parser: 'The shared parser reads day-first dates month first',
  hint: 'booking-v3 prints an MM/DD hint to day-first tenants',
  shift: 'A date moves by one day with the time zone',
  unplaced: 'No tenant on file: cause unknown',
};

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  tenants: string[];
  channels: Record<string, number>;
  // What intake tagged these reports as: tag → count. A guess from the browser, not the cause.
  taggedAs: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
  // For a cause: how many of its reports are also `shift`. For `shift`: the causes they are filed under.
  alsoShift: number;
  filedUnder: Record<string, number>;
};

export function mergedInto(reports: Report[], ticket: number): Report[] {
  return uniqueById(reports).filter((r) => r.mergedInto === ticket);
}

const tally = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const filed = (r: Report): Problem => causeOf(r, tenantOf(r)) ?? 'unplaced';
  const isShift = (r: Report) => oneDayMove.includes(r.id);
  const members = (p: Problem) => (p === 'shift' ? reports.filter(isShift) : reports.filter((r) => filed(r) === p));
  return PROBLEMS.map((problem) => ({ problem, rs: members(problem) }))
    .filter(({ rs }) => rs.length > 0)
    .map(({ problem, rs }) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        channels: tally(rs, (r) => r.channel),
        taggedAs: tally(rs, (r) => r.meta.intakeTag),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
        alsoShift: problem === 'shift' ? 0 : rs.filter(isShift).length,
        filedUnder: problem === 'shift' ? tally(rs, filed) : {},
      };
    });
}
