// ─────────────────────────────────────────────────────────────────
// App-wide Constants
// ─────────────────────────────────────────────────────────────────

export const SOCKET_URL        = 'http://localhost:3001';
export const TOTAL_REGISTERED  = 48;

export function generateLectureId() {
  return `LEC-${Date.now().toString(36).toUpperCase()}`;
}

// ── Full course list (used by LectureControl, AttendancePage, StudentsPage) ──
export const COURSES = [
  { id: 'CS101',   name: 'CS101 — Intro to Programming',       sections: ['A', 'B', 'C'] },
  { id: 'CS201',   name: 'CS201 — Data Structures',            sections: ['A', 'B'] },
  { id: 'CS301',   name: 'CS301 — Algorithms & Complexity',    sections: ['A', 'B', 'C', 'D'] },
  { id: 'CS401',   name: 'CS401 — Software Engineering',       sections: ['A'] },
  { id: 'CS501',   name: 'CS501 — Machine Learning',           sections: ['A', 'B'] },
  { id: 'MATH211', name: 'MATH211 — Discrete Mathematics',     sections: ['A', 'B', 'C'] },
  { id: 'CS310',   name: 'CS310 — Operating Systems',          sections: ['A', 'B'] },
  { id: 'CS320',   name: 'CS320 — Computer Networks',          sections: ['A'] },
  { id: 'CS330',   name: 'CS330 — Database Systems',           sections: ['A', 'B'] },
  { id: 'CS420',   name: 'CS420 — Artificial Intelligence',    sections: ['A'] },
  { id: 'MATH101', name: 'MATH101 — Calculus I',               sections: ['A', 'B', 'C'] },
  { id: 'MATH201', name: 'MATH201 — Linear Algebra',           sections: ['A', 'B'] },
  { id: 'EE101',   name: 'EE101 — Circuit Analysis',           sections: ['A'] },
  { id: 'EE201',   name: 'EE201 — Digital Logic Design',       sections: ['A'] },
];

// ── Faculty catalog (used by CoursesPage + AdminPage) ─────────────
export const FACULTY_CATALOG = [
  {
    id: 'engineering',
    name: 'Faculty of Engineering',
    icon: '⚙️',
    colleges: [
      {
        id: 'cs',
        name: 'Computer Science & Engineering',
        courses: [
          { id: 'CS101', name: 'Intro to Programming',         credits: 3 },
          { id: 'CS201', name: 'Data Structures',              credits: 3 },
          { id: 'CS301', name: 'Algorithms & Complexity',      credits: 3 },
          { id: 'CS401', name: 'Software Engineering',         credits: 3 },
          { id: 'CS501', name: 'Machine Learning',             credits: 3 },
          { id: 'CS310', name: 'Operating Systems',            credits: 3 },
          { id: 'CS320', name: 'Computer Networks',            credits: 3 },
          { id: 'CS330', name: 'Database Systems',             credits: 3 },
          { id: 'CS420', name: 'Artificial Intelligence',      credits: 3 },
          { id: 'CS430', name: 'Computer Graphics',            credits: 3 },
        ],
      },
      {
        id: 'elec',
        name: 'Electrical Engineering',
        courses: [
          { id: 'EE101', name: 'Circuit Analysis',             credits: 3 },
          { id: 'EE201', name: 'Digital Logic Design',         credits: 3 },
          { id: 'EE301', name: 'Signals & Systems',            credits: 3 },
          { id: 'EE401', name: 'Microprocessors',              credits: 3 },
        ],
      },
      {
        id: 'mech',
        name: 'Mechanical Engineering',
        courses: [
          { id: 'ME101', name: 'Engineering Mechanics',        credits: 3 },
          { id: 'ME201', name: 'Thermodynamics',               credits: 3 },
          { id: 'ME301', name: 'Fluid Mechanics',              credits: 3 },
        ],
      },
    ],
  },
  {
    id: 'science',
    name: 'Faculty of Science',
    icon: '🔬',
    colleges: [
      {
        id: 'math',
        name: 'Mathematics & Statistics',
        courses: [
          { id: 'MATH101', name: 'Calculus I',                 credits: 3 },
          { id: 'MATH201', name: 'Linear Algebra',             credits: 3 },
          { id: 'MATH211', name: 'Discrete Mathematics',       credits: 3 },
          { id: 'MATH301', name: 'Probability & Statistics',   credits: 3 },
          { id: 'MATH401', name: 'Numerical Analysis',         credits: 3 },
        ],
      },
      {
        id: 'phys',
        name: 'Physics',
        courses: [
          { id: 'PHYS101', name: 'General Physics I',          credits: 3 },
          { id: 'PHYS201', name: 'General Physics II',         credits: 3 },
          { id: 'PHYS301', name: 'Quantum Mechanics',          credits: 3 },
        ],
      },
    ],
  },
  {
    id: 'business',
    name: 'Faculty of Business',
    icon: '📊',
    colleges: [
      {
        id: 'mgmt',
        name: 'Management & Finance',
        courses: [
          { id: 'BUS101', name: 'Principles of Management',    credits: 3 },
          { id: 'BUS201', name: 'Financial Accounting',        credits: 3 },
          { id: 'BUS301', name: 'Marketing Strategy',          credits: 3 },
          { id: 'BUS401', name: 'Business Analytics',          credits: 3 },
        ],
      },
    ],
  },
  {
    id: 'medicine',
    name: 'Faculty of Medicine',
    icon: '🏥',
    colleges: [
      {
        id: 'med',
        name: 'General Medicine',
        courses: [
          { id: 'MED101', name: 'Human Anatomy',               credits: 4 },
          { id: 'MED201', name: 'Physiology',                  credits: 4 },
          { id: 'MED301', name: 'Pathology',                   credits: 4 },
        ],
      },
    ],
  },
];
