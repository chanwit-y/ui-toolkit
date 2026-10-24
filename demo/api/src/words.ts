/**
 * Word pools the seeded generator (`data.ts`) draws from: invented title parts per genre,
 * people's names, premises, review lines. Nothing here is a real book or author.
 */

export interface GenreSeed {
  _id: string;
  name: string;
  color: string;
}

export const GENRES: GenreSeed[] = [
  { _id: 'g-fantasy', name: 'Fantasy', color: '#7c3aed' },
  { _id: 'g-science-fiction', name: 'Science Fiction', color: '#0369a1' },
  { _id: 'g-mystery', name: 'Mystery', color: '#334155' },
  { _id: 'g-romance', name: 'Romance', color: '#be185d' },
  { _id: 'g-history', name: 'History', color: '#92400e' },
  { _id: 'g-biography', name: 'Biography', color: '#0f766e' },
  { _id: 'g-children', name: 'Children', color: '#c2410c' },
  { _id: 'g-cookery', name: 'Cookery', color: '#15803d' },
];

/** Title parts per genre: `{A}` adjective, `{N}` noun, `{P}` place / phrase. */
export interface TitleParts {
  patterns: string[];
  A: string[];
  N: string[];
  P: string[];
}

export const TITLE_PARTS: Record<string, TitleParts> = {
  'g-fantasy': {
    patterns: ['The {A} {N}', '{N} of the {P}', '{N} for the {P}', 'The {N} of {A} Hollow'],
    A: ['Ember', 'Silver', 'Rowan', 'Thornbound', 'Moonlit', 'Ashen', 'Gilded', 'Wandering', 'Sunken', 'Iron'],
    N: ['Crown', 'Lantern', 'Orchard', 'Keep', 'Tide', 'Oath', 'Spire', 'Harp', 'Gate', 'Feather'],
    P: ['Northern Marches', 'Glass Sea', 'Last Valley', 'Salt Kings', 'Seventh Moon', 'Willow Court'],
  },
  'g-science-fiction': {
    patterns: ['The {A} {N}', '{N} at {P}', 'Beyond {P}', 'The {N} Protocol'],
    A: ['Quiet', 'Orbital', 'Distant', 'Hollow', 'Binary', 'Cold', 'Last', 'Drifting', 'Paper', 'Silent'],
    N: ['Meridian', 'Station', 'Engine', 'Horizon', 'Archive', 'Colony', 'Relay', 'Signal', 'Garden', 'Lattice'],
    P: ['Kepler Reach', 'the Outer Belt', 'Tau Ceti', 'the Long Dark', 'Europa', 'Ring Nine'],
  },
  'g-mystery': {
    patterns: ['The {A} {N}', 'The {N} at {P}', 'Murder on {P}', 'A {A} {N}'],
    A: ['Locked', 'Silent', 'Crooked', 'Midnight', 'Borrowed', 'Pale', 'Missing', 'Seventh', 'Riverside', 'Velvet'],
    N: ['Ledger', 'Alibi', 'Witness', 'Key', 'Verdict', 'Footprint', 'Telegram', 'Portrait', 'Cellar', 'Clock'],
    P: ['Harrow Lane', 'the Night Ferry', 'Soi Thirty-Two', 'Blackwater Pier', 'the Old Mill', 'Room 214'],
  },
  'g-romance': {
    patterns: ['{A} {N}', '{A} {N} in {P}', '{N} in {P}', 'The {A} {N}'],
    A: ['Monsoon', 'Summer', 'Second', 'Paper', 'Lantern', 'Late', 'Small', 'Sweet', 'Rooftop', 'Open'],
    N: ['Letters', 'Season', 'Promise', 'Hearts', 'Bloom', 'Weekend', 'Song', 'Chance', 'Café', 'Window'],
    P: ['Chiang Mai', 'the Riverside', 'Lisbon', 'the Night Market', 'Hua Hin', 'Kyoto'],
  },
  'g-history': {
    patterns: ['The {A} {N}', '{N} of {P}', 'A History of {P}', 'The {A} {N} of {P}'],
    A: ['Forgotten', 'Golden', 'Long', 'Hidden', 'Rising', 'Silent', 'Northern', 'Merchant', 'River', 'Broken'],
    N: ['Empire', 'Kingdoms', 'Harbour', 'Dynasty', 'Roads', 'Treaty', 'Frontier', 'Century', 'Rebellion', 'Courts'],
    P: ['Ayutthaya', 'the Spice Routes', 'the Mekong', 'the Silk Road', 'Old Siam', 'the Lowlands'],
  },
  'g-biography': {
    patterns: ['A Life in {P}', 'The {A} Years', '{N}: A Memoir', 'The {A} Life'],
    A: ['Restless', 'Early', 'Lost', 'Teaching', 'Quiet', 'Wandering', 'Lantern', 'Salt'],
    N: ['Notes from the Margin', 'Field Notes', 'Unfinished Business', 'Late Bloomer', 'Second Act', 'Open Roads', 'Small Hours'],
    P: ['Ink', 'Rice Fields', 'Small Rooms', 'Borrowed Time', 'Four Kitchens', 'Stage Light', 'Paper Boats'],
  },
  'g-children': {
    patterns: ['The {A} {N}', '{N} Goes to {P}', 'The {N} Who Loved {P}', 'Goodnight, {A} {N}'],
    A: ['Brave', 'Little', 'Sleepy', 'Curious', 'Busy', 'Giggling', 'Tiny', 'Clever'],
    N: ['Elephant', 'Tuk-Tuk', 'Dragon', 'Rabbit', 'Robot', 'Mango', 'Kite', 'Penguin'],
    P: ['the Sea', 'the Market', 'School', 'the Moon', 'the Rain', 'Grandma'],
  },
  'g-cookery': {
    patterns: ['The {A} Kitchen', '{N} at Home', 'The Book of {N}', '{A} {N}'],
    A: ['Weeknight', 'Market', 'Slow', 'Smoky', 'Coconut', 'Green', 'Sunday', 'Pantry', 'Spice', 'Midnight'],
    N: ['Street Food', 'Noodles', 'Curry Pastes', 'Rice Bowls', 'Bread', 'Ferments', 'Soups', 'Salads', 'Grills', 'Desserts'],
    P: [],
  },
};

/** One-sentence premises, the first paragraph of a generated description. */
export const PREMISES: Record<string, string[]> = {
  'g-fantasy': [
    "A cartographer's apprentice discovers that the map she is copying redraws itself every night.",
    'Three exiled heirs share one stolen crown and a single winter to decide who will wear it.',
    'In a city built on the back of a sleeping giant, a lamplighter hears the giant begin to wake.',
    'A reluctant hedge-witch is hired to find a river that vanished overnight.',
  ],
  'g-science-fiction': [
    'The crew of a relay station receives a message from a ship that left Earth a century after them.',
    'An archivist on a generation ship finds a record of a planet the captain swears does not exist.',
    "When the colony's weather engine fails, a botanist has nine days to grow enough food for everyone.",
    'A translator is sent to negotiate with a signal that only speaks in mathematics.',
  ],
  'g-mystery': [
    'A retired detective is asked to look again at the one case she never managed to close.',
    'A bookshop owner finds a confession tucked inside a second-hand novel, dated next Tuesday.',
    'When a ferry arrives with one passenger fewer than it left with, every traveller becomes a suspect.',
    'An insurance clerk notices that the same signature appears on three wills in three different cities.',
  ],
  'g-romance': [
    'Two rival café owners on the same soi are forced to share a kitchen for one rainy season.',
    'A wedding photographer keeps running into the same guest at every ceremony she shoots.',
    'Letters meant for the previous tenant start a correspondence neither writer expected.',
    'A night-market vendor and a visiting architect have one summer to decide what they are building.',
  ],
  'g-history': [
    'A sweeping account of the merchants, monks and sailors who tied distant river ports together.',
    'Drawing on letters and court records, this history follows a single harbour across four centuries.',
    'The rise and fall of a trading kingdom, told through the goods that passed through its markets.',
    "An accessible history of the roads, rivers and rumours that shaped a region's borders.",
  ],
  'g-biography': [
    'The life of a self-taught engineer who built bridges across three continents.',
    'A portrait of a stage actress who reinvented herself as a war correspondent.',
    'Told in her own words, the story of a schoolteacher who founded forty village libraries.',
    'An intimate biography of a chef who changed how a whole city eats breakfast.',
  ],
  'g-children': [
    'A small elephant who is afraid of puddles learns that splashing is the best part of the rainy season.',
    'A curious robot sets out to count every star and keeps losing track at one hundred and three.',
    'Two friends build a kite big enough to carry a wish all the way to the moon.',
    'A sleepy penguin tries every bed in the zoo before finding the perfect one.',
  ],
  'g-cookery': [
    'More than eighty recipes for everyday cooking, from quick breakfasts to slow Sunday curries.',
    'A practical guide to pastes, pickles and ferments, with a chapter on stocking the pantry.',
    'Street-food classics adapted for the home kitchen, with tips for cooking on a single burner.',
    'Seasonal menus built around rice, noodles and whatever the market has that week.',
  ],
};

export const PRAISE = [
  'Readers call it warm, sharp and impossible to put down.',
  'It was shortlisted for a regional book prize.',
  'Booksellers have been pressing it into customers\' hands since launch week.',
  'A quiet favourite with book clubs and reading groups.',
  'It has been translated into nine languages.',
];

export const AUTHOR_FIRST = [
  'Anong', 'Somchai', 'Kittiya', 'Narin', 'Pranee', 'Wichai', 'Malee', 'Thanakorn', 'Siriporn', 'Eleanor',
  'Marcus', 'Ingrid', 'Tomas', 'Amara', 'Hiroshi', 'Lena', 'Rafael', 'Noor', 'Felix', 'Clara',
  'Yuki', 'Dmitri', 'Sofia', 'Owen', 'Mei', 'Arjun', 'Beatrix', 'Ezra', 'Hana', 'Lucas',
];
export const AUTHOR_LAST = [
  'Chaiyaporn', 'Wongsakul', 'Boonmee', 'Sutthiwong', 'Kaewmanee', 'Phromma', 'Hartwell', 'Okafor',
  'Lindqvist', 'Moreau', 'Tanaka', 'Castellano', 'Abernathy', 'Novak', 'Raman', 'Fairweather',
  'Ishikawa', 'Delacroix', 'Whitlock', 'Sato', 'Petrova', 'Achterberg', 'Quill', 'Ferreira',
];
export const COUNTRIES = [
  'Thailand', 'Thailand', 'Thailand', 'United Kingdom', 'Japan', 'Sweden', 'Nigeria', 'France',
  'Brazil', 'India', 'Canada', 'Australia', 'Italy', 'Czechia',
];
export const BIO_FIRST = [
  'writes {genre} with a sharp eye for small details',
  'is best known for {genre} that readers return to again and again',
  'turned to {genre} after a decade in journalism',
  'has been writing {genre} since publishing a first story at nineteen',
];
export const BIO_SECOND = [
  'Before writing full time, {first} worked as a ferry engineer.',
  '{first} lives by the river with two cats and far too many notebooks.',
  "{first}'s work has been translated into eleven languages.",
  '{first} teaches a weekly writing workshop at a community library.',
];

export const CUSTOMER_THAI_FIRST = [
  'Somsak', 'Siriporn', 'Kittisak', 'Nattaya', 'Pongsakorn', 'Waraporn', 'Chaiwat', 'Ratchanee',
  'Supachai', 'Jiraporn', 'Teerapong', 'Kannika', 'Wanchai', 'Patcharee', 'Anan', 'Duangjai',
];
export const CUSTOMER_THAI_LAST = [
  'Jaidee', 'Srisawat', 'Thongdee', 'Phanit', 'Saetang', 'Kongkaew', 'Rungruang', 'Chaiyasit',
  'Bunnag', 'Nakprasert', 'Pattanapong', 'Sombat',
];
export const CUSTOMER_INTL_FIRST = [
  'Emma', 'Liam', 'Sophie', 'Daniel', 'Aiko', 'Kenji', 'Priya', 'Mateo', 'Chloe', 'Noah', 'Hannah',
  'Omar', 'Isla', 'Lukas', 'Grace', 'Ravi',
];
export const CUSTOMER_INTL_LAST = [
  'Bennett', 'Fischer', 'Nakamura', 'Okoye', 'Laurent', 'Kowalski', 'Haddad', 'Sullivan', 'Lindgren',
  'Moretti', 'Chen', 'Patel',
];
export const THAI_CITIES = ['Bangkok', 'Bangkok', 'Bangkok', 'Chiang Mai', 'Phuket', 'Khon Kaen', 'Hat Yai'];
export const INTL_CITIES = ['Bangkok', 'Singapore', 'London', 'Tokyo'];

export const REVIEWERS = [
  'Ploy K.', 'Mark T.', 'Nok S.', 'Julia R.', 'Bank P.', 'Ken W.', 'Fon C.', 'Sam L.', 'Mint J.',
  'Oliver H.', 'Aom T.', 'Rina M.',
];
export const REVIEW_TITLES: Record<number, string[]> = {
  1: ['Not for me', 'Could not finish it'],
  2: ['Slow going', 'Expected more'],
  3: ['A decent read', 'Good in parts'],
  4: ['Really enjoyed it', 'Well worth the time'],
  5: ['An instant favourite', 'Loved every page', 'Bought a second copy as a gift'],
};
export const REVIEW_BODIES: Record<number, string[]> = {
  1: ['The pacing lost me early on and I never found my way back.'],
  2: ['Some lovely moments, but the middle dragged for me.'],
  3: ['Solid and readable; I would pick up the next one.'],
  4: ['Characters I cared about and an ending that landed.', 'Read it over a weekend, which says enough.'],
  5: ['I stayed up far too late finishing this one.', 'Already recommended it to everyone at work.'],
};

export const PAYMENT_METHODS = ['Credit card', 'PromptPay', 'Bank transfer', 'Cash on delivery'];
export const REFUND_REASONS = [
  'Damaged on arrival',
  'Wrong edition delivered',
  'Duplicate order',
  'Arrived after the gift date',
  'Pages misprinted',
];
