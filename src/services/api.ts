import axios from 'axios';

export type UserRole = 'admin' | 'pembina' | 'bendahara';
export type BuildingAssignment = 'Gedung A' | 'Gedung B' | 'Semua';

export interface AuthUser {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  building_assignment: BuildingAssignment;
  phone_number?: string;
}

export interface SantriItem {
  id: number;
  nis: string;
  full_name: string;
  gender: 'L' | 'P';
  birth_place: string;
  birth_date: string;
  room_number: string;
  building: 'Gedung A' | 'Gedung B';
  class_grade: string;
  parent_name: string;
  parent_phone: string;
  photo_url: string;
  status: 'aktif' | 'alumni';
  created_at: string;
  totalViolationPoints: number;
  totalAchievementPoints: number;
  netDisciplineScore: number;
  riskStatus: 'Aman' | 'Waspada' | 'Bahaya/SP';
  violationCount: number;
  achievementCount: number;
}

let inMemoryToken: string | null = sessionStorage.getItem('sim_asrama_jwt');

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (token) {
    sessionStorage.setItem('sim_asrama_jwt', token);
  } else {
    sessionStorage.removeItem('sim_asrama_jwt');
  }
}

export function getAuthToken(): string | null {
  return inMemoryToken;
}

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const code = error.response?.data?.code;
      if (code === 'SESSION_TIMEOUT' || code === 'INVALID_TOKEN' || code === 'ACCOUNT_INACTIVE') {
        window.dispatchEvent(
          new CustomEvent('sim-asrama:unauthorized', {
            detail: error.response?.data?.message || 'Sesi Anda telah berakhir.',
          })
        );
      }
    }
    return Promise.reject(error);
  }
);

export async function uploadMediaFile(file: File, folder = 'sim-asrama/santri'): Promise<{ url: string; provider: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}
