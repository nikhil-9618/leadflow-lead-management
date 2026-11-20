import api, { saveBlob } from './api';

/** Drops empty values so the API only receives meaningful filters. */
export const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

export const fetchLeads = async (params = {}, config = {}) => {
  const { data } = await api.get('/leads', { params: cleanParams(params), ...config });
  return data;
};

export const fetchLeadStats = async (params = {}, config = {}) => {
  const { data } = await api.get('/leads/stats', { params: cleanParams(params), ...config });
  return data.data;
};

export const fetchScoringRules = async (config = {}) => {
  const { data } = await api.get('/leads/scoring-rules', config);
  return data.data;
};

export const fetchLeadById = async (id, config = {}) => {
  const { data } = await api.get(`/leads/${id}`, config);
  return data.data;
};

export const createLead = async (payload) => {
  const { data } = await api.post('/leads', payload);
  return data;
};

export const updateLead = async (id, payload) => {
  const { data } = await api.put(`/leads/${id}`, payload);
  return data;
};

export const updateLeadStatus = async (id, status) => {
  const { data } = await api.patch(`/leads/${id}/status`, { status });
  return data;
};

export const addLeadNote = async (id, text) => {
  const { data } = await api.post(`/leads/${id}/notes`, { text });
  return data;
};

export const fetchLeadActivities = async (id, config = {}) => {
  const { data } = await api.get(`/leads/${id}/activities`, config);
  return data.data;
};

export const deleteLead = async (id) => {
  const { data } = await api.delete(`/leads/${id}`);
  return data;
};

/**
 * Downloads a CSV. `ids` exports only the selected leads; otherwise the
 * current filters are applied server-side.
 */
export const exportLeadsCsv = async (params = {}) => {
  const response = await api.get('/leads/export', {
    params: cleanParams(params),
    responseType: 'blob',
  });

  const filename =
    response.headers['content-disposition']?.match(/filename="?([^";]+)"?/)?.[1] ||
    `leadflow-leads-${new Date().toISOString().slice(0, 10)}.csv`;

  saveBlob(response.data, filename);
  return Number(response.headers['x-total-count'] || 0);
};

export const previewLeadImport = async (csv) => {
  const { data } = await api.post('/leads/import/preview', { csv });
  return data.data;
};

export const importLeadsCsv = async (csv) => {
  const { data } = await api.post('/leads/import', { csv, confirm: true });
  return data;
};
