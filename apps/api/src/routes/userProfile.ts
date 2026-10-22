import { Hono } from 'hono';
import { USERS } from './workflows.js';

/**
 * `/collection/profiles/*` — the Replace / Switch Profile demo's resources,
 * shaped like the Banpu user-profile service: `me` (the logged-in profile),
 * `search?search=` (people, one row per person) and `person/:personId
 * ?exceptJobStatus=T` (every profile a person holds — a person may have
 * several positions / companies). Read-only; the `{ data, status, success,
 * message }` envelope.
 */
export const userProfileRoutes = new Hono();

type Profile = {
  personId: string;
  userId: string;
  firstNameEn: string;
  lastNameEN: string;
  email: string;
  jobTitle: string;
  jobStatus: 'A' | 'T';
  /** The primary assignment, 'Y' on one profile per person (the Banpu shape). */
  isPrimaryAssignment: 'Y' | 'N';
  isAdmin: boolean;
  avatar: string;
  companyModel: { code: string; name: string };
  businessUnitModel: { code: string; name: string };
};

const COMPANIES = {
  BPP: { code: 'BPP', name: 'Banpu Public Company Limited' },
  BPN: { code: 'BPN', name: 'Banpu NEXT' },
  BPA: { code: 'BPA', name: 'Banpu Australia' },
} as const;

const UNITS = ['Digital', 'Finance', 'Operations', 'People', 'Sustainability'];

const profile = (
  personId: string,
  n: number,
  first: string,
  last: string,
  jobTitle: string,
  company: keyof typeof COMPANIES,
  unit: string,
  extra: Partial<Profile> = {},
): Profile => ({
  personId,
  userId: `${personId}-${n}`,
  firstNameEn: first,
  lastNameEN: last,
  email: `${first.toLowerCase()}_${last[0]?.toLowerCase() ?? ''}@banpu.co.th`,
  jobTitle,
  jobStatus: 'A',
  isPrimaryAssignment: 'N',
  isAdmin: false,
  avatar: '',
  companyModel: COMPANIES[company],
  businessUnitModel: { code: unit.slice(0, 3).toUpperCase(), name: unit },
  ...extra,
});

/** The logged-in person: an admin with two positions — the *second* is the primary assignment. */
const ME: Profile[] = [
  profile('p-me', 1, 'Kavisara', 'Thisakobsuk', 'Section Manager - Application Development', 'BPP', 'Digital', { isAdmin: true }),
  profile('p-me', 2, 'Kavisara', 'Thisakobsuk', 'Product Owner - Employee Platforms', 'BPN', 'Digital', { isAdmin: true, isPrimaryAssignment: 'Y' }),
];

// Everyone from the workflow demo gets one profile; a few hold more, one is
// terminated (filtered by `exceptJobStatus=T`), one has nothing active.
const PEOPLE: Profile[] = USERS.flatMap((u, i) => {
  const [first, ...rest] = u.FullNameEN.split(' ');
  const last = rest.join(' ') || first;
  const personId = `p-${u.PersonId}`;
  const company = (['BPP', 'BPN', 'BPA'] as const)[i % 3];
  const unit = UNITS[i % UNITS.length];
  const list = [profile(personId, 1, first, last, u.JobTitle, company, unit, { email: u.Email, isPrimaryAssignment: 'Y' })];
  // The acting position is the primary one for every other such person, so the primary pick is visibly not the first row.
  if (i % 4 === 1) {
    const actingPrimary = i % 8 === 1;
    if (actingPrimary) list[0] = { ...list[0], isPrimaryAssignment: 'N' };
    list.push(profile(personId, 2, first, last, `${u.JobTitle} (Acting)`, 'BPN', UNITS[(i + 2) % UNITS.length], { email: u.Email, isPrimaryAssignment: actingPrimary ? 'Y' : 'N' }));
  }
  if (i % 7 === 3) list.push(profile(personId, 3, first, last, 'Committee Member', 'BPA', 'Sustainability', { email: u.Email }));
  if (i === 2) list.push(profile(personId, 9, first, last, 'Former role', 'BPP', unit, { email: u.Email, jobStatus: 'T' }));
  return list;
});

const PROFILES: Profile[] = [
  ...ME,
  ...PEOPLE,
  // Only a terminated profile: the "no active profile" path.
  profile('p-gone', 1, 'Nadia', 'Samae', 'Section Manager - Sustainability Management', 'BPP', 'Sustainability', { jobStatus: 'T', isPrimaryAssignment: 'Y' }),
  // The profiles call fails for this person: the error path.
  profile('p-broken', 1, 'Broken', 'Record', 'Returns a server error', 'BPP', 'Operations', { isPrimaryAssignment: 'Y' }),
];

const envelope = <T>(data: T, message: string) => ({ data, status: 200, success: true, message });

userProfileRoutes.get('/collection/profiles/me', (c) => c.json(envelope(ME[0], 'Profile retrieved successfully')));

// GET /collection/profiles/search?search= — one row per person (their first profile); blank ⇒ nobody.
userProfileRoutes.get('/collection/profiles/search', (c) => {
  const q = (c.req.query('search') ?? '').trim().toLowerCase();
  const seen = new Set<string>();
  const data = q
    ? PROFILES.filter((p) => {
        if (seen.has(p.personId)) return false;
        const hit = `${p.firstNameEn} ${p.lastNameEN} ${p.email} ${p.jobTitle}`.toLowerCase().includes(q);
        if (hit) seen.add(p.personId);
        return hit;
      })
    : [];
  return c.json(envelope(data, 'Profiles retrieved successfully'));
});

// GET /collection/profiles/person/:personId?exceptJobStatus=T — every profile of a person.
userProfileRoutes.get('/collection/profiles/person/:personId', (c) => {
  const personId = c.req.param('personId');
  if (personId === 'p-broken') {
    return c.json({ data: null, status: 500, success: false, message: 'Profile service unavailable' }, 500);
  }
  const except = c.req.query('exceptJobStatus');
  const data = PROFILES.filter((p) => p.personId === personId && (!except || p.jobStatus !== except));
  return c.json(envelope(data, 'Profiles retrieved successfully'));
});
