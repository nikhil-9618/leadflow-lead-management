import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Turns any Axios error into a message that is safe to show in the UI.
 */
export const getApiErrorMessage = (error) => {
  if (axios.isCancel?.(error) || error.code === 'ERR_CANCELED') {
    return 'Request cancelled';
  }

  if (error.response) {
    const { data, status } = error.response;

    if (data?.errors?.length) {
      return data.errors.map((item) => item.message).join('. ');
    }

    if (data?.message) return data.message;

    if (status === 404) return 'The requested resource was not found.';
    if (status === 429) return 'Too many requests. Please wait a moment and try again.';
    if (status >= 500) return 'The server ran into a problem. Please try again.';

    return `Request failed with status ${status}`;
  }

  if (error.code === 'ECONNABORTED') {
    return 'The request timed out. Please try again.';
  }

  return 'Cannot reach the LeadFlow API. Make sure the backend is running.';
};

/** Triggers a browser download for a Blob response. */
export const saveBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default api;
