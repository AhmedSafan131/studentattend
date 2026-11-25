export const SOCKET_URL = typeof window !== 'undefined'
  ? (window.location.protocol === 'https:' ? window.location.origin : `${window.location.protocol}//${window.location.hostname}:3001`)
  : 'http://localhost:3001';

export const TOTAL_REGISTERED = 48;

export function generateLectureId() {
  return `LEC-${Date.now().toString(36).toUpperCase()}`;
}

export const COURSES = [
  { id: 'CS101',   name: 'CS101 - Intro to Programming',       sections: ['A', 'B', 'C'] },
  { id: 'CS201',   name: 'CS201 - Data Structures',            sections: ['A', 'B'] },
  { id: 'CS301',   name: 'CS301 - Algorithms & Complexity',    sections: ['A', 'B', 'C', 'D'] },
  { id: 'CS401',   name: 'CS401 - Software Engineering',       sections: ['A'] },
  { id: 'CS501',   name: 'CS501 - Machine Learning',           sections: ['A', 'B'] },
  { id: 'MATH211', name: 'MATH211 - Discrete Mathematics',      sections: ['A', 'B', 'C'] },
  { id: 'CS310',   name: 'CS310 - Operating Systems',          sections: ['A', 'B'] },
  { id: 'CS320',   name: 'CS320 - Computer Networks',          sections: ['A'] },
  { id: 'CS330',   name: 'CS330 - Database Systems',           sections: ['A', 'B'] },
  { id: 'CS420',   name: 'CS420 - Artificial Intelligence',    sections: ['A'] },
  { id: 'CS430',   name: 'CS430 - Computer Graphics',          sections: ['A'] },
  { id: 'MATH101', name: 'MATH101 - Calculus I',               sections: ['A', 'B', 'C'] },
  { id: 'MATH201', name: 'MATH201 - Linear Algebra',           sections: ['A', 'B'] },
  { id: 'MATH301', name: 'MATH301 - Probability & Statistics', sections: ['A'] },
  { id: 'MATH401', name: 'MATH401 - Numerical Analysis',       sections: ['A'] },
  { id: 'EE101',   name: 'EE101 - Circuit Analysis',           sections: ['A'] },
  { id: 'EE201',   name: 'EE201 - Digital Logic Design',       sections: ['A'] },
  { id: 'EE301',   name: 'EE301 - Signals & Systems',          sections: ['A'] },
  { id: 'EE401',   name: 'EE401 - Microprocessors',            sections: ['A'] },
  { id: 'ME101',   name: 'ME101 - Engineering Mechanics',      sections: ['A'] },
  { id: 'ME201',   name: 'ME201 - Thermodynamics',             sections: ['A'] },
  { id: 'ME301',   name: 'ME301 - Fluid Mechanics',            sections: ['A'] },
  { id: 'MED101',  name: 'MED101 - Human Anatomy',             sections: ['A'] },
  { id: 'MED201',  name: 'MED201 - Physiology',                sections: ['A'] },
  { id: 'MED301',  name: 'MED301 - Pathology',                 sections: ['A'] },
];

export const FACULTY_CATALOG = [
  {
    id: 'engineering',
    name: 'كليه الهندسه',
    icon: '⚙️',
    colleges: [
      {
        id: 'engineering',
        name: 'كليه الهندسه',
        courses: [
          { id: 'EE101', name: 'Circuit Analysis',      credits: 3 },
          { id: 'EE201', name: 'Digital Logic Design',  credits: 3 },
          { id: 'EE301', name: 'Signals & Systems',     credits: 3 },
          { id: 'EE401', name: 'Microprocessors',       credits: 3 },
          { id: 'ME101', name: 'Engineering Mechanics', credits: 3 },
          { id: 'ME201', name: 'Thermodynamics',        credits: 3 },
          { id: 'ME301', name: 'Fluid Mechanics',       credits: 3 },
        ],
      },
    ],
  },
  {
    id: 'computers-ai',
    name: 'كليه الحاسبات والذكاء الاصطناعي',
    icon: '💻',
    colleges: [
      {
        id: 'computers-ai',
        name: 'كليه الحاسبات والذكاء الاصطناعي',
        courses: [
          { id: 'CS101',   name: 'Intro to Programming',       credits: 3 },
          { id: 'CS201',   name: 'Data Structures',            credits: 3 },
          { id: 'CS301',   name: 'Algorithms & Complexity',    credits: 3 },
          { id: 'CS401',   name: 'Software Engineering',       credits: 3 },
          { id: 'CS501',   name: 'Machine Learning',           credits: 3 },
          { id: 'CS310',   name: 'Operating Systems',          credits: 3 },
          { id: 'CS320',   name: 'Computer Networks',          credits: 3 },
          { id: 'CS330',   name: 'Database Systems',           credits: 3 },
          { id: 'CS420',   name: 'Artificial Intelligence',    credits: 3 },
          { id: 'CS430',   name: 'Computer Graphics',          credits: 3 },
          { id: 'MATH101', name: 'Calculus I',                 credits: 3 },
          { id: 'MATH201', name: 'Linear Algebra',             credits: 3 },
          { id: 'MATH211', name: 'Discrete Mathematics',       credits: 3 },
          { id: 'MATH301', name: 'Probability & Statistics',   credits: 3 },
          { id: 'MATH401', name: 'Numerical Analysis',         credits: 3 },
        ],
      },
    ],
  },
  {
    id: 'nursing',
    name: 'كليه التمريض',
    icon: '🩺',
    colleges: [{ id: 'nursing', name: 'كليه التمريض', courses: [] }],
  },
  {
    id: 'medicine',
    name: 'كليه الطب البشري',
    icon: '🏥',
    colleges: [
      {
        id: 'medicine',
        name: 'كليه الطب البشري',
        courses: [
          { id: 'MED101', name: 'Human Anatomy', credits: 4 },
          { id: 'MED201', name: 'Physiology',    credits: 4 },
          { id: 'MED301', name: 'Pathology',     credits: 4 },
        ],
      },
    ],
  },
  {
    id: 'pharmacy',
    name: 'كليه الصيدله',
    icon: '💊',
    colleges: [{ id: 'pharmacy', name: 'كليه الصيدله', courses: [] }],
  },
  {
    id: 'humanities',
    name: 'علوم انسانيه',
    icon: '📚',
    colleges: [{ id: 'humanities', name: 'علوم انسانيه', courses: [] }],
  },
  {
    id: 'health-sciences-technology',
    name: 'تكنولوجيا العلوم الصحيه',
    icon: '🔬',
    colleges: [{ id: 'health-sciences-technology', name: 'تكنولوجيا العلوم الصحيه', courses: [] }],
  },
  {
    id: 'dentistry',
    name: 'كليه طب الاسنان',
    icon: '🦷',
    colleges: [{ id: 'dentistry', name: 'كليه طب الاسنان', courses: [] }],
  },
  {
    id: 'veterinary-medicine',
    name: 'كليه الطب البيطري',
    icon: '🏥',
    colleges: [{ id: 'veterinary-medicine', name: 'كليه الطب البيطري', courses: [] }],
  },
  {
    id: 'physical-therapy',
    name: 'كليه العلاج الطبيعي',
    icon: '🧑‍⚕️',
    colleges: [{ id: 'physical-therapy', name: 'كليه العلاج الطبيعي', courses: [] }],
  },
];
