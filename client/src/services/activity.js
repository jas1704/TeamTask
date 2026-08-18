import api from './api';

export const fetchActivity = (projectId) => api.get(`/projects/${projectId}/activity`).then((r) => r.data.activities);
