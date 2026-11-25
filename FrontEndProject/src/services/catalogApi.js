import { catalogAPI } from '../utils/api';
import { extractApiData, extractApiError } from '../utils/apiHelpers';

const getResponseData = (response) => extractApiData(response) || {};

const mapCatalogSubject = (subject = {}) => ({
  id: subject.id,
  facultyId: subject.facultyId || '',
  facultyName: subject.facultyName || '',
  subjectCode: subject.subjectCode || '',
  subjectName: subject.subjectName || '',
  groupCount: Number(subject.groupCount) || 1,
  groupCounts: subject.groupCounts || {},
  groupsByType: subject.groupsByType || {},
  groups: Array.isArray(subject.groups) ? subject.groups : ['A'],
  types: Array.isArray(subject.types) && subject.types.length ? subject.types : ['Lecture'],
  termCode: subject.termCode || '',
});

export const fetchCatalogSubjects = async ({ facultyId, termCode } = {}) => {
  const params = {};
  if (facultyId) params.facultyId = facultyId;
  if (termCode) params.termCode = termCode;

  const data = getResponseData(await catalogAPI.getSubjects(params));
  return (data.subjects || []).map(mapCatalogSubject);
};

export const importCatalogSubjects = async ({ facultyId, termCode, subjects }) => {
  try {
    const data = getResponseData(await catalogAPI.importSubjects({
      facultyId: facultyId || null,
      termCode: termCode || null,
      subjects,
    }));

    return {
      summary: data.summary || { created: 0, updated: 0, skipped: 0 },
      subjects: (data.subjects || []).map(mapCatalogSubject),
    };
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to import catalog subjects.'));
  }
};

export const createCatalogSubject = async ({ facultyId, subjectName, subjectCode, groupCount, groupCounts, types, termCode }) => {
  try {
    const data = getResponseData(await catalogAPI.createSubject({
      facultyId,
      subjectName,
      subjectCode,
      groupCount,
      groupCounts,
      types,
      termCode,
    }));

    return mapCatalogSubject(data.subject || {});
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to create catalog subject.'));
  }
};

export const updateCatalogSubject = async (id, { facultyId, subjectName, subjectCode, groupCount, groupCounts, types, termCode }) => {
  try {
    const data = getResponseData(await catalogAPI.updateSubject(id, {
      facultyId,
      subjectName,
      subjectCode,
      groupCount,
      groupCounts,
      types,
      termCode,
    }));

    return mapCatalogSubject(data.subject || {});
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to update catalog subject.'));
  }
};

export const deleteCatalogSubject = async (id) => {
  try {
    const data = getResponseData(await catalogAPI.deleteSubject(id));
    return {
      deleted: Boolean(data.deleted),
      id: data.id || id,
    };
  } catch (error) {
    throw new Error(extractApiError(error, 'Unable to delete catalog subject.'));
  }
};
