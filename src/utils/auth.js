/**
 * utils/auth.js — Central authentication & doctor data store.
 * Moved from: src/auth.js
 */

// ── Admin account ─────────────────────────────────────────────────
export const ADMIN_ACCOUNT = {
  id:       'admin-1',
  email:    'a',
  password: '123',
  name:     'System Administrator',
  specialty:'University Administration',
  userRole: 'admin',
  avatar:   'SA',
};

// ── Initial doctor accounts ───────────────────────────────────────
export const INITIAL_DOCTORS = [
  {
    id:       'doc-1',
    email:    'd',
    password: '123',
    name:     'Dr. Ahmed Al-Rashid',
    specialty:'Algorithms & AI',
    avatar:   'AA',
    userRole: 'doctor',
    courses:  [
      { uid: 'CS101-LEC', id: 'CS101', name: 'Intro to Programming',    faculty: 'engineering', college: 'cs',   type: 'Lecture'  },
      { uid: 'CS301-LEC', id: 'CS301', name: 'Algorithms & Complexity', faculty: 'engineering', college: 'cs',   type: 'Lecture'  },
      { uid: 'CS501-LEC', id: 'CS501', name: 'Machine Learning',        faculty: 'engineering', college: 'cs',   type: 'Lecture'  },
    ],
  },
  {
    id:       'doc-2',
    email:    'sara@university.edu',
    password: '1234',
    name:     'Dr. Sara Khalil',
    specialty:'Software Engineering',
    avatar:   'SK',
    userRole: 'doctor',
    courses:  [
      { uid: 'CS201-LEC', id: 'CS201', name: 'Data Structures',      faculty: 'engineering', college: 'cs', type: 'Lecture'   },
      { uid: 'CS401-LEC', id: 'CS401', name: 'Software Engineering', faculty: 'engineering', college: 'cs', type: 'Lecture'   },
      { uid: 'CS401-SEC', id: 'CS401', name: 'Software Engineering', faculty: 'engineering', college: 'cs', type: 'Section'   },
    ],
  },
  {
    id:       'doc-3',
    email:    'omar@university.edu',
    password: '1234',
    name:     'Dr. Omar Hassan',
    specialty:'Data Structures',
    avatar:   'OH',
    userRole: 'doctor',
    courses:  [
      { uid: 'MATH211-LEC', id: 'MATH211', name: 'Discrete Mathematics', faculty: 'science', college: 'math', type: 'Lecture' },
    ],
  },
];

export const INITIAL_STUDENTS = [
  {
    id:       'student-1',
    universityId: '20201001',
    email:    's',
    password: '123',
    name:     'Ahmed Safan',
    userRole: 'student',
    avatar:   'AS'
  },
  {
    id:       'student-2',
    universityId: '20201002',
    email:    'liam@students.edu',
    password: '1234',
    name:     'Liam Carter',
    userRole: 'student',
    avatar:   'LC'
  }
];

/**
 * Runtime store — App.js keeps a React state copy and also writes here
 * so helpers (authenticate) always see the latest doctor list.
 */
export const store = {
  doctors: [...INITIAL_DOCTORS],
  students: [...INITIAL_STUDENTS],
};

/** Authenticate any user (admin or doctor) */
export function authenticate(email, password) {
  const e = email.toLowerCase().trim();
  if (
    e === ADMIN_ACCOUNT.email.toLowerCase() &&
    password === ADMIN_ACCOUNT.password
  ) {
    return ADMIN_ACCOUNT;
  }
  return store.doctors.find(
    d => d.email.toLowerCase() === e && d.password === password
  ) || store.students.find(
    s => s.email.toLowerCase() === e && s.password === password
  ) || null;
}
