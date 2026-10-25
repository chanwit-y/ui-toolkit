import { Hono } from 'hono';

/**
 * `/collection/approvals` — the Approval line demo's resource: approval
 * requests whose `steps` are the raw workflow rows exactly as the user's
 * document system returns them (a `ReviewerUser` row, then `ApproverUser`
 * rows with a `Sequence`; `Status` codes 0–9). The component normalizes them
 * through its `keys` / `roleRules` / `statusMap`. Read-only; the
 * `{ data, status, success, message }` envelope.
 */
export const approvalRoutes = new Hono();

type User = { Email: string; FirstNameEN: string; FullNameEN: string; JobTitle: string; LastNameEN: string; PersonId: string; UserId: string };

const user = (first: string, last: string, title: string, id: string): User => ({
  Email: `${first}_${last[0]}@gummay.co.th`,
  FirstNameEN: first,
  FullNameEN: `${first} ${last}`,
  JobTitle: title,
  LastNameEN: last,
  PersonId: id,
  UserId: id,
});

const chutima = user('Chutima', 'Pimthong', 'Manager - Process Governance', '170');
const sasikan = user('Sasikan', 'Sonchun', 'Senior Specialist - Geology', '265');
const pitak = user('Pitak', 'Wuttinonchai', 'Vice President - Geoscience', '436');
const taksawan = user('Taksawan', 'Sabsirin', 'Manager - Service Delivery', '117');
const somchai = user('Somchai', 'Jaidee', 'Director - Operations', '501');

const stamp = (minute: number) => `2026-01-05T10:${String(minute).padStart(2, '0')}:00.0000000Z`;

const reviewer = (u: User, status: string, remark = '') => ({
  DelegationId: 39,
  Id: 39,
  IsRevised: false,
  Model: { CreatedAt: stamp(10), DeletedAt: null, Id: 0, UpdatedAt: stamp(11) },
  Remark: remark,
  ReviewerUser: u,
  Status: status,
});
const approver = (u: User, sequence: number, status: string, remark = '') => ({
  ApproverUser: u,
  Id: 95 + sequence,
  IsRevised: false,
  Model: { CreatedAt: stamp(11), DeletedAt: null, Id: 0, UpdatedAt: stamp(11 + sequence * 3) },
  Remark: remark,
  Sequence: sequence,
  Status: status,
});

const requester = { FullNameEN: 'Dev Test3', JobTitle: 'Developer', PersonId: '1' };

const APPROVALS: Record<string, { _id: string; title: string; status: string; requester: typeof requester; steps: unknown[] }> = {
  'req-1001': {
    _id: 'req-1001',
    title: 'Purchase request PR-2026-0012',
    status: '2',
    requester,
    // The user's sample: everyone done, waiting on the last approver.
    steps: [reviewer(chutima, '5'), approver(sasikan, 1, '5'), approver(pitak, 2, '5'), approver(taksawan, 3, '2')],
  },
  'req-1002': {
    _id: 'req-1002',
    title: 'Travel request TR-2026-0088',
    status: '3',
    requester,
    // Rejected at the second approver, with a remark.
    steps: [reviewer(chutima, '5'), approver(sasikan, 1, '5'), approver(pitak, 2, '3', 'Budget code is wrong, please resubmit.'), approver(taksawan, 3, '0')],
  },
  'req-1003': {
    _id: 'req-1003',
    title: 'E-memo EM-2026-0301',
    status: '6',
    requester,
    // Everything approved.
    steps: [reviewer(chutima, '5'), approver(sasikan, 1, '5'), approver(pitak, 2, '5'), approver(taksawan, 3, '5')],
  },
  'req-1004': {
    _id: 'req-1004',
    title: 'Contract renewal CR-2026-0007',
    status: '1',
    requester,
    // Still with the reviewer, and a long line: seven approvers.
    steps: [
      reviewer(chutima, '1'),
      approver(sasikan, 1, '0'),
      approver(pitak, 2, '0'),
      approver(taksawan, 3, '0'),
      approver(somchai, 4, '0'),
      approver(user('Anong', 'Srisuk', 'Legal Counsel', '612'), 5, '0'),
      approver(user('Wichai', 'Boonmee', 'CFO', '700'), 6, '0'),
      approver(user('Nattaya', 'Kaew', 'CEO', '701'), 7, '0'),
    ],
  },
  'req-1005': {
    _id: 'req-1005',
    title: 'Leave request LR-2026-0450',
    status: '2',
    requester,
    // Sent back for revision by the acknowledger, then resubmitted and approved by them; now with the VP.
    steps: [reviewer(chutima, '5'), approver(sasikan, 1, '4', 'Please attach the medical certificate.'), approver(pitak, 2, '2'), approver(taksawan, 3, '0')],
  },
};

approvalRoutes.get('/collection/approvals', (c) =>
  c.json({ data: Object.values(APPROVALS).map(({ steps, ...rest }) => ({ ...rest, stepCount: steps.length })), status: 200, success: true, message: 'Approvals retrieved successfully' }),
);

approvalRoutes.get('/collection/approvals/:id', (c) => {
  const found = APPROVALS[c.req.param('id')];
  if (!found) return c.json({ data: null, status: 404, success: false, message: 'Approval not found' }, 404);
  return c.json({ data: found, status: 200, success: true, message: 'Approval retrieved successfully' });
});
