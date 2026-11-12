import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { CreateServiceItemDto, ServiceItem, PaginatedResult, UpdateServiceItemDto } from '../types/item.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure pitstop.db is placed inside the server directory
const dbPath = process.env.DB_PATH || path.resolve(__dirname, '../../pitstop.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db: DatabaseType = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Startup initialization: Create users and service_items tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT
  );

  CREATE TABLE IF NOT EXISTS service_items (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    serviceName TEXT NOT NULL,
    cost REAL NOT NULL,
    mileage REAL NOT NULL,
    serviceDate TEXT NOT NULL,
    category TEXT NOT NULL,
    isCompleted INTEGER NOT NULL,
    locationLat REAL,
    locationLng REAL,
    createdAt TEXT NOT NULL
  );
`);

// Seed default users if table is empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)');
  insertUser.run('user-123', 'demo@pitstop.com', 'password123', 'Alex Rivera');
  insertUser.run('user-456', 'second@pitstop.com', 'password123', 'Jordan Smith');
}

// Seed default service items if table is empty
const itemCount = db.prepare('SELECT COUNT(*) as count FROM service_items').get() as { count: number };
if (itemCount.count === 0) {
  const insertItem = db.prepare(`
    INSERT INTO service_items (id, userId, serviceName, cost, mileage, serviceDate, category, isCompleted, locationLat, locationLng, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = new Date().toISOString();
  insertItem.run('e8b0b8c0-1111-4000-8000-000000000001', 'user-123', 'Oil & Filter Change', 85.50, 124500, '2026-10-11', 'Maintenance', 1, 44.4323, 26.1063, now);
  insertItem.run('e8b0b8c0-1111-4000-8000-000000000002', 'user-123', 'Tire Rotation', 50.0, 126000, '2026-11-11', 'Maintenance', 0, 44.4323, 26.1063, now);
  insertItem.run('e8b0b8c0-1111-4000-8000-000000000003', 'user-123', 'Brake Pad Replacement', 230.0, 128000, '2026-11-12', 'Repair', 0, 44.4323, 26.1063, now);
  insertItem.run('e8b0b8c0-1111-4000-8000-000000000004', 'user-456', 'Transmission Flush', 310.0, 95000, '2026-10-25', 'Maintenance', 1, 44.4323, 26.1063, now);
}

export interface UserRecord {
  id: string;
  email: string;
  password: string;
  name?: string | undefined;
}

export class UserStore {
  findByEmail(email: string): UserRecord | undefined {
    const stmt = db.prepare('SELECT id, email, password, name FROM users WHERE LOWER(email) = LOWER(?)');
    return stmt.get(email) as UserRecord | undefined;
  }

  findById(id: string): UserRecord | undefined {
    const stmt = db.prepare('SELECT id, email, password, name FROM users WHERE id = ?');
    return stmt.get(id) as UserRecord | undefined;
  }

  create(user: { id?: string | undefined; email: string; password: string; name?: string | undefined }): UserRecord {
    const id = user.id || randomUUID();
    const email = user.email.toLowerCase().trim();
    const name = user.name || null;
    const stmt = db.prepare('INSERT INTO users (id, email, password, name) VALUES (?, ?, ?, ?)');
    stmt.run(id, email, user.password, name);
    return {
      id,
      email,
      password: user.password,
      ...(user.name ? { name: user.name } : {})
    };
  }
}

export const userStore = new UserStore();

interface ServiceItemRow {
  id: string;
  userId: string;
  serviceName: string;
  cost: number;
  mileage: number;
  serviceDate: string;
  category: string;
  isCompleted: number;
  locationLat: number | null;
  locationLng: number | null;
  createdAt: string;
}

function mapRowToServiceItem(row: ServiceItemRow): ServiceItem {
  return {
    id: row.id,
    userId: row.userId,
    serviceName: row.serviceName,
    cost: Number(row.cost),
    mileage: Number(row.mileage),
    serviceDate: row.serviceDate,
    category: row.category,
    isCompleted: Boolean(row.isCompleted),
    ...(row.locationLat !== null && row.locationLng !== null ? {
      location: {
        lat: row.locationLat,
        lng: row.locationLng
      }
    } : {}),
    createdAt: row.createdAt
  };
}

class ItemStore {
  getPaginated(
    userId: string,
    page: number = 1,
    limit: number = 10,
    searchQuery: string = '',
    categoryFilter: string = 'all'
  ): PaginatedResult<ServiceItem> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const offset = (safePage - 1) * safeLimit;

    const whereClauses: string[] = ['userId = ?'];
    const params: (string | number)[] = [userId];

    if (searchQuery.trim()) {
      whereClauses.push('LOWER(serviceName) LIKE ?');
      params.push(`%${searchQuery.toLowerCase().trim()}%`);
    }

    if (categoryFilter && categoryFilter.toLowerCase() !== 'all') {
      whereClauses.push('LOWER(category) = LOWER(?)');
      params.push(categoryFilter.trim());
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // Total count query
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM service_items ${whereSql}`);
    const countRow = countStmt.get(...params) as { count: number };
    const total = countRow.count;
    const totalPages = Math.ceil(total / safeLimit) || 1;

    // Paginated items query
    const dataSql = `
      SELECT id, userId, serviceName, cost, mileage, serviceDate, category, isCompleted, locationLat, locationLng, createdAt
      FROM service_items
      ${whereSql}
      ORDER BY serviceDate DESC, createdAt DESC
      LIMIT ? OFFSET ?
    `;
    const dataStmt = db.prepare(dataSql);
    const rows = dataStmt.all(...params, safeLimit, offset) as ServiceItemRow[];
    const data = rows.map(mapRowToServiceItem);

    return {
      data,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages,
        hasMore: safePage < totalPages
      }
    };
  }

  getById(id: string, userId: string): ServiceItem | undefined {
    const stmt = db.prepare(`
      SELECT id, userId, serviceName, cost, mileage, serviceDate, category, isCompleted, locationLat, locationLng, createdAt
      FROM service_items
      WHERE id = ? AND userId = ?
    `);
    const row = stmt.get(id, userId) as ServiceItemRow | undefined;
    return row ? mapRowToServiceItem(row) : undefined;
  }

  create(dto: CreateServiceItemDto, userId: string): ServiceItem {
    const today = new Date().toISOString().split('T')[0] ?? '';
    const id = randomUUID();
    const serviceName = dto.serviceName.trim();
    const cost = Number(dto.cost);
    const mileage = Number(dto.mileage);
    const serviceDate = dto.serviceDate ? dto.serviceDate : today;
    const category = dto.category || 'Maintenance';
    const isCompleted = dto.isCompleted ? 1 : 0;
    const location = dto.location ?? { lat: 0, lng: 0 };
    const locationLat = location.lat ?? null;
    const locationLng = location.lng ?? null;
    const createdAt = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO service_items (id, userId, serviceName, cost, mileage, serviceDate, category, isCompleted, locationLat, locationLng, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, userId, serviceName, cost, mileage, serviceDate, category, isCompleted, locationLat, locationLng, createdAt);

    return {
      id,
      userId,
      serviceName,
      cost,
      mileage,
      serviceDate,
      category,
      isCompleted: Boolean(isCompleted),
      location,
      createdAt
    };
  }

  update(id: string, dto: UpdateServiceItemDto, userId: string): ServiceItem | null {
    const current = this.getById(id, userId);
    if (!current) return null;

    const serviceName = dto.serviceName !== undefined ? dto.serviceName.trim() : current.serviceName;
    const cost = dto.cost !== undefined ? Number(dto.cost) : current.cost;
    const mileage = dto.mileage !== undefined ? Number(dto.mileage) : current.mileage;
    const serviceDate = dto.serviceDate !== undefined ? dto.serviceDate : current.serviceDate;
    const category = dto.category !== undefined ? dto.category : current.category;
    const isCompleted = dto.isCompleted !== undefined ? (dto.isCompleted ? 1 : 0) : (current.isCompleted ? 1 : 0);
    const location = dto.location !== undefined ? dto.location : current.location;
    const locationLat = location?.lat ?? null;
    const locationLng = location?.lng ?? null;

    const stmt = db.prepare(`
      UPDATE service_items
      SET serviceName = ?, cost = ?, mileage = ?, serviceDate = ?, category = ?, isCompleted = ?, locationLat = ?, locationLng = ?
      WHERE id = ? AND userId = ?
    `);
    stmt.run(serviceName, cost, mileage, serviceDate, category, isCompleted, locationLat, locationLng, id, userId);

    return {
      ...current,
      serviceName,
      cost,
      mileage,
      serviceDate,
      category,
      isCompleted: Boolean(isCompleted),
      ...(location !== undefined ? { location } : {})
    };
  }

  delete(id: string, userId: string): boolean {
    const stmt = db.prepare('DELETE FROM service_items WHERE id = ? AND userId = ?');
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }
}

export const itemStore = new ItemStore();
