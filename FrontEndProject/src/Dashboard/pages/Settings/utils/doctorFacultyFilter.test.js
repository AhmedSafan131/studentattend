import { ALL_DOCTOR_FACULTIES, doctorMatchesFaculty, getDoctorTeachingFacultyIds } from './doctorFacultyFilter';

const multiFacultyDoctor = {
  courses: [
    { id: 'EE101', faculty: 'engineering', college: 'engineering' },
    { id: 'CS101', faculty: 'computers-ai', college: 'computers-ai' },
  ],
};

test('a doctor assigned to multiple faculties appears in every matching faculty filter', () => {
  expect(getDoctorTeachingFacultyIds(multiFacultyDoctor)).toEqual(['engineering', 'computers-ai']);
  expect(doctorMatchesFaculty(multiFacultyDoctor, 'engineering')).toBe(true);
  expect(doctorMatchesFaculty(multiFacultyDoctor, 'computers-ai')).toBe(true);
  expect(doctorMatchesFaculty(multiFacultyDoctor, 'medicine')).toBe(false);
});

test('faculty matching supports catalog names and college values returned by the API', () => {
  const doctor = {
    courses: [{ faculty: '', college: 'كليه الهندسه' }],
  };

  expect(getDoctorTeachingFacultyIds(doctor)).toEqual(['engineering']);
});

test('all faculties includes assigned and currently unassigned doctors', () => {
  expect(doctorMatchesFaculty(multiFacultyDoctor, ALL_DOCTOR_FACULTIES)).toBe(true);
  expect(doctorMatchesFaculty({ courses: [] }, ALL_DOCTOR_FACULTIES)).toBe(true);
});

