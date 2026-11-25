import Axios from '../../utils/Axios';

export const rosterAPI = {
  options: () => Axios({ method: 'GET', path: '/api/attendance-roster/options' }),
  updateOptions: (data) => Axios({ method: 'PUT', path: '/api/admin/settings/attendance-roster', data }),
  list: (mode, id, params) => Axios({ method: 'GET', path: `/api/attendance-roster/${mode}/${encodeURIComponent(id)}`, params }),
  save: (mode, id, studentIds) => Axios({ method: 'POST', path: `/api/attendance-roster/${mode}/${encodeURIComponent(id)}`, data: { studentIds }, timeout: 120000 }),
};
