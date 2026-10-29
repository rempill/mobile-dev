import { CreateServiceItemDto, ServiceItem, UpdateServiceItemDto } from '../types/item.types';

const API_BASE_URL = 'http://localhost:4000/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `HTTP error ${res.status}`);
  }
  if (res.status === 204) {
    return {} as T;
  }
  return res.json();
}

export const itemApi = {
  async getAll(): Promise<ServiceItem[]> {
    const res = await fetch(`${API_BASE_URL}/items`);
    return handleResponse<ServiceItem[]>(res);
  },

  async getById(id: string): Promise<ServiceItem> {
    const res = await fetch(`${API_BASE_URL}/items/${id}`);
    return handleResponse<ServiceItem>(res);
  },

  async create(dto: CreateServiceItemDto): Promise<ServiceItem> {
    const res = await fetch(`${API_BASE_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto)
    });
    return handleResponse<ServiceItem>(res);
  },

  async update(id: string, dto: UpdateServiceItemDto): Promise<ServiceItem> {
    const res = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto)
    });
    return handleResponse<ServiceItem>(res);
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/items/${id}`, {
      method: 'DELETE'
    });
    return handleResponse<void>(res);
  }
};
