import { Hono } from 'hono';

/**
 * `/collection/users` and `/collection/workflows` — the Workflow editor
 * demo's resources: the people a line is built from (searchable), and
 * workflow configs whose `steps` are the editor's field value (role, 1-based
 * sequence, in-charge and CC user objects). GET lists / reads, PATCH `/:id`
 * replaces the fields sent; the `{ data, status, success, message }` envelope.
 */
export const workflowRoutes = new Hono();

type User = { PersonId: string; FullNameEN: string; JobTitle: string; Email: string };

const user = (id: string, name: string, title: string): User => ({
  PersonId: id,
  FullNameEN: name,
  JobTitle: title,
  Email: `${name.toLowerCase().replace(/\s+/g, '_')}@banpu.co.th`,
});

export const USERS: User[] = [
  user('1', 'Dev Test1', 'Developer'),
  user('2', 'Dev Test3', 'Developer'),
  user('3', 'Montol Saklor', 'System Analyst'),
  user('4', 'Matee Rotjanaporn', 'Project Manager'),
  user('5', 'Mira Developer test', 'Developer'),
  user('6', 'Qian Wang', 'Finance Manager'),
  user('7', 'Tian Meng', 'Accountant'),
  user('8', 'Liwei Li', 'Engineer'),
  user('9', 'Nalin Kraikachornkitti', 'HR Manager'),
  user('10', 'Shumin Zhang', 'Procurement'),
  user('11', 'JianWen Guo', 'Site Manager'),
  user('12', 'Zhaocai Hu', 'Engineer'),
  user('13', 'Huimin Yu', 'Controller'),
  user('14', 'Wang Zhao', 'Director'),
  user('15', 'Sigang Liang', 'Operator'),
  user('16', 'Bing Cao', 'Vice President'),
  user('17', 'Sai Cao', 'Operator'),
  user('18', 'wenyue ren', 'Operator'),
  user('19', 'ziyi wang', 'Operator'),
  user('20', 'Wanutpong Siriwiphanan', 'Service Delivery'),
  user('21', 'Anna Kiewchaum', 'Service Delivery'),
  user('170', 'Chutima Pimthong', 'Manager - Process Governance'),
  user('265', 'Sasikan Sonchun', 'Senior Specialist - Geology'),
  user('436', 'Pitak Wuttinonchai', 'Vice President - Geoscience'),
  user('117', 'Taksawan Sabsirin', 'Manager - Service Delivery'),
];

const byId = (id: string) => USERS.find((u) => u.PersonId === id)!;
const step = (actionType: string, sequence: number, incharge: string[], cc: string[] = []) => ({
  actionType,
  sequence,
  inchargeUsers: incharge.map(byId),
  ccUsers: cc.map(byId),
});

type Workflow = { _id: string; name: string; status: 'active' | 'inactive'; businessUnit: string; site: string; steps: ReturnType<typeof step>[] };

const WORKFLOWS: Record<string, Workflow> = {
  'wf-1': {
    _id: 'wf-1',
    name: 'Coal Business — Temple II',
    status: 'active',
    businessUnit: 'Coal Business',
    site: 'Temple II',
    // The user's screen: inputter, two approvers, an acknowledger with two people.
    steps: [step('inputter', 1, ['15', '17', '18', '19']), step('approver', 2, ['16']), step('approver', 3, ['6']), step('acknowledger', 4, ['20', '21'])],
  },
  'wf-2': {
    _id: 'wf-2',
    name: 'Line Approval 1 (dev)',
    status: 'active',
    businessUnit: 'Coal Business',
    site: 'Temple II',
    steps: [step('inputter', 1, ['3', '2']), step('approver', 2, ['3', '1', '2'], ['4']), step('acknowledger', 3, ['3', '1', '2'])],
  },
  'wf-3': { _id: 'wf-3', name: 'New workflow', status: 'inactive', businessUnit: 'Power Business', site: 'HPC', steps: [] },
};

// GET /collection/users?search= — name / title contains.
workflowRoutes.get('/collection/users', (c) => {
  const q = (c.req.query('search') ?? '').trim().toLowerCase();
  const data = q ? USERS.filter((u) => `${u.FullNameEN} ${u.JobTitle}`.toLowerCase().includes(q)) : USERS;
  return c.json({ data, status: 200, success: true, message: 'Users retrieved successfully' });
});

workflowRoutes.get('/collection/workflows', (c) =>
  c.json({ data: Object.values(WORKFLOWS).map(({ steps, ...w }) => ({ ...w, stepCount: steps.length })), status: 200, success: true, message: 'Workflows retrieved successfully' }),
);

workflowRoutes.get('/collection/workflows/:id', (c) => {
  const found = WORKFLOWS[c.req.param('id')];
  if (!found) return c.json({ data: null, status: 404, success: false, message: 'Workflow not found' }, 404);
  return c.json({ data: found, status: 200, success: true, message: 'Workflow retrieved successfully' });
});

workflowRoutes.patch('/collection/workflows/:id', async (c) => {
  const found = WORKFLOWS[c.req.param('id')];
  if (!found) return c.json({ data: null, status: 404, success: false, message: 'Workflow not found' }, 404);
  const body = await c.req.json().catch(() => ({}));
  const steps = Array.isArray(body.steps) ? body.steps : found.steps;
  if (steps.some((s: { inchargeUsers?: unknown[] }) => !Array.isArray(s.inchargeUsers) || s.inchargeUsers.length === 0)) {
    return c.json({ data: null, status: 400, success: false, message: 'Every step needs at least one person in charge' }, 400);
  }
  const { _id: _ignored, ...patch } = body;
  Object.assign(found, patch, { steps: steps.map((s: Record<string, unknown>, i: number) => ({ ...s, sequence: i + 1 })) });
  return c.json({ data: found, status: 200, success: true, message: 'Workflow updated successfully' });
});
