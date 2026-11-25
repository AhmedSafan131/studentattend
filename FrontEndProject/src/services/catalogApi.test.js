import { catalogAPI } from '../utils/api';
import { createCatalogSubject, updateCatalogSubject } from './catalogApi';

jest.mock('../utils/api', () => ({
  catalogAPI: {
    createSubject: jest.fn(),
    updateSubject: jest.fn(),
  },
}));

const payload = {
  facultyId: 'computers-ai',
  subjectName: 'Computer Networks',
  subjectCode: 'CS320',
  groupCount: 5,
  groupCounts: { Lecture: 2, Section: 5, Practical: 0 },
  types: ['Lecture', 'Section'],
  termCode: '2026-fall',
};

beforeEach(() => {
  jest.clearAllMocks();
  catalogAPI.createSubject.mockResolvedValue({ data: { subject: payload } });
  catalogAPI.updateSubject.mockResolvedValue({ data: { subject: payload } });
});

test('create sends the per-type group counts to the backend', async () => {
  await createCatalogSubject(payload);
  expect(catalogAPI.createSubject).toHaveBeenCalledWith(payload);
});

test('update sends the per-type group counts to the backend', async () => {
  await updateCatalogSubject('subject-1', payload);
  expect(catalogAPI.updateSubject).toHaveBeenCalledWith('subject-1', payload);
});
