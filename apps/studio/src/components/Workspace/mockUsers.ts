/** The mockup's four people — a mock identity with no auth behind it. */
export const MOCK_USERS: { name: string; role: string; email: string }[] = [
  // The emails are the Live Preview's mock sign-in account (see the grilled
  // design `azure-sso-auth`): the first is the mock API's admin.
  { name: 'Chanwit Yimneam', role: 'Product design', email: 'chanwit_y@gummay.co.th' },
  { name: 'Pimchanok S.', role: 'Backend', email: 'pimchanok_s@gummay.co.th' },
  { name: 'Thanapat R.', role: 'QA', email: 'thanapat_r@gummay.co.th' },
  { name: 'Nattapong V.', role: 'Head of Digital', email: 'nattapong_v@gummay.co.th' },
]
