import { Dream } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// 简单的用户 ID 管理（用 localStorage 存用户标识）
const USER_ID_KEY = 'dream-daily-user-id';

function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = 'user-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const userId = getUserId();
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Dreams API
export const dreamsApi = {
  getAll: async (): Promise<Dream[]> => {
    return request<Dream[]>('/dreams');
  },

  get: async (id: string): Promise<Dream> => {
    return request<Dream>(`/dreams/${id}`);
  },

  create: async (dream: Omit<Dream, 'id' | 'createdAt'>): Promise<Dream> => {
    return request<Dream>('/dreams', {
      method: 'POST',
      body: JSON.stringify({
        ...dream,
        id: 'dream-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        createdAt: Date.now(),
      }),
    });
  },

  update: async (dream: Dream): Promise<Dream> => {
    return request<Dream>(`/dreams/${dream.id}`, {
      method: 'PUT',
      body: JSON.stringify(dream),
    });
  },
};
