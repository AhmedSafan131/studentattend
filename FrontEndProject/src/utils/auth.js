import {
  MANAGED_ROLES,
  normalizeManagedUser,
} from './permissions';

export const normalizeAdminRecord = (admin) => normalizeManagedUser(admin, MANAGED_ROLES.ADMIN);
export const normalizeDoctorRecord = (doctor) => normalizeManagedUser(doctor, MANAGED_ROLES.DOCTOR);
