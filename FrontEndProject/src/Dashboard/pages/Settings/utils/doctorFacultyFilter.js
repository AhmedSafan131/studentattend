import { FACULTY_CATALOG } from '../../../../utils/constants';

export const ALL_DOCTOR_FACULTIES = '__all_doctor_faculties__';

const normalizeLookupValue = (value) => String(value || '').trim().toLowerCase();

const facultyIdByLookupValue = new Map(FACULTY_CATALOG.flatMap((faculty) => [
  [normalizeLookupValue(faculty.id), faculty.id],
  [normalizeLookupValue(faculty.name), faculty.id],
  ...faculty.colleges.flatMap((college) => [
    [normalizeLookupValue(college.id), faculty.id],
    [normalizeLookupValue(college.name), faculty.id],
  ]),
]));

const resolveFacultyId = (value) => facultyIdByLookupValue.get(normalizeLookupValue(value)) || '';

export const getDoctorTeachingFacultyIds = (doctor) => [...new Set(
  (doctor?.courses || []).flatMap((course) => [
    course?.faculty,
    course?.college,
    ...(Array.isArray(course?.faculties) ? course.faculties : []),
  ])
    .map(resolveFacultyId)
    .filter(Boolean),
)];

export const doctorMatchesFaculty = (doctor, facultyId) => (
  facultyId === ALL_DOCTOR_FACULTIES
  || getDoctorTeachingFacultyIds(doctor).includes(facultyId)
);

