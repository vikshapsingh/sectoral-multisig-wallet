const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new Error(
      `Could not reach the API at ${API_URL}. Is the backend running? (${err.message})`
    );
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: { message: text } };
    }
  }

  if (!response.ok) {
    const message = payload?.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = payload?.error?.details;
    throw error;
  }

  return payload;
}

export const api = {
  get: (path) => request(path),
  post: (path, body, opts) => request(path, { method: 'POST', body, ...opts }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
};

export { getToken };
