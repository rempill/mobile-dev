import { CreateServiceItemDto, PaginatedResult, ServiceItem, UpdateServiceItemDto } from '../types/item.types';
import axios from 'axios';
import { storageService } from './storage.service';

const API_BASE_URL = 'http://localhost:4000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL
});

// attach bearer token to every outgoing req
apiClient.interceptors.request.use(async (config) => {
  const token = await storageService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const itemApi = {
  async getAll(
    page: number = 1,
    limit: number = 10,
    searchQuery: string = '',
    category: string = 'all'
  ): Promise<PaginatedResult<ServiceItem>> {
    const res = await apiClient.get<PaginatedResult<ServiceItem>>('/items', {
      params: { page, limit, q: searchQuery, category }
    });
    return res.data;
  },

  async getById(id: string): Promise<ServiceItem> {
    const res = await apiClient.get<ServiceItem>(`/items/${id}`);
    return res.data;
  },

  async create(dto: CreateServiceItemDto): Promise<ServiceItem> {
    const res = await apiClient.post<ServiceItem>('/items', dto);
    return res.data;
  },

  async update(id: string, dto: UpdateServiceItemDto): Promise<ServiceItem> {
    const res = await apiClient.put<ServiceItem>(`/items/${id}`, dto);
    return res.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/items/${id}`);
  },

  async login(email: string, pass: string): Promise<{ token: string; user: any }> {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password: pass
    });
    return res.data;
  },

  async register(email: string, pass: string, name?: string): Promise<{ token: string; user: any }> {
    const res = await axios.post(`${API_BASE_URL}/auth/register`, {
      email,
      password: pass,
      name
    });
    return res.data;
  }
};
