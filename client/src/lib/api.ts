import axios, { AxiosError } from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !original?._retry) {
      original!._retry = true;
      try {
        const refreshUrl = import.meta.env.VITE_API_URL
          ? `${import.meta.env.VITE_API_URL}/api/auth/refresh`
          : '/api/auth/refresh';
        // Use a timeout so a slow server doesn't hang the entire request indefinitely
        const { data } = await axios.post(refreshUrl, {}, { withCredentials: true, timeout: 10000 });
        setAccessToken(data.accessToken);
        original!.headers!.Authorization = `Bearer ${data.accessToken}`;
        return api(original!);
      } catch {
        setAccessToken(null);
        // Use the hash-prefixed path so HashRouter lands on the correct route
        // without an extra round-trip redirect
        window.location.replace('/#/login');
      }
    }
    return Promise.reject(error);
  }
);
