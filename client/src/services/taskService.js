import api from './api';
import { cleanParams } from './leadService';

export const fetchTasks = async (params = {}, config = {}) => {
  const { data } = await api.get('/tasks', { params: cleanParams(params), ...config });
  return data;
};

export const createTask = async (payload) => {
  const { data } = await api.post('/tasks', payload);
  return data;
};

export const updateTask = async (id, payload) => {
  const { data } = await api.put(`/tasks/${id}`, payload);
  return data;
};

export const completeTask = async (id, completed = true) => {
  const { data } = await api.patch(`/tasks/${id}/complete`, { completed });
  return data;
};

export const deleteTask = async (id) => {
  const { data } = await api.delete(`/tasks/${id}`);
  return data;
};
