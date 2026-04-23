import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: any;

// Initialize schema
export function initDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'timesheet.db');
    db = new Database(dbPath);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT DEFAULT 'TimeTracker',
      logo_url TEXT DEFAULT '',
      primary_color TEXT DEFAULT '#3b82f6',
      secondary_color TEXT DEFAULT '#1f2937',
      accent_color TEXT DEFAULT '#3b82f6',
      sidebar_bg TEXT DEFAULT '#ffffff',
      sidebar_text TEXT DEFAULT '#1f2937',
      currency TEXT DEFAULT 'USD'
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seniorities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER,
      seniority_id INTEGER,
      cost_per_hour REAL NOT NULL,
      rate_per_hour REAL NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id),
      FOREIGN KEY (seniority_id) REFERENCES seniorities(id),
      UNIQUE(profile_id, seniority_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'c-level', 'commercial', 'staff')) NOT NULL,
      profile_id INTEGER,
      seniority_id INTEGER,
      FOREIGN KEY (profile_id) REFERENCES profiles(id),
      FOREIGN KEY (seniority_id) REFERENCES seniorities(id)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      legal_name TEXT,
      tax_id TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS client_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      position TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      name TEXT NOT NULL,
      budget_hours REAL,
      budget_money REAL,
      status TEXT CHECK(status IN ('active', 'paused', 'finished', 'invoiced')) DEFAULT 'active',
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS tasks_master (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      project_id INTEGER,
      task_id INTEGER,
      description TEXT NOT NULL,
      hours REAL NOT NULL,
      date TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (task_id) REFERENCES tasks_master(id)
    );

    CREATE TABLE IF NOT EXISTS time_entry_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      time_entry_id INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      feature TEXT NOT NULL,
      can_access INTEGER DEFAULT 0,
      UNIQUE(role, feature)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Seed initial permissions
    INSERT OR IGNORE INTO permissions (role, feature, can_access) VALUES 
    ('admin', 'settings', 1), ('admin', 'users', 1), ('admin', 'costs', 1), ('admin', 'approvals', 1), ('admin', 'dashboard', 1), ('admin', 'projects', 1), ('admin', 'clients', 1), ('admin', 'tracker', 1),
    ('c-level', 'settings', 0), ('c-level', 'users', 0), ('c-level', 'costs', 1), ('c-level', 'approvals', 1), ('c-level', 'dashboard', 1), ('c-level', 'projects', 1), ('c-level', 'clients', 1), ('c-level', 'tracker', 1),
    ('commercial', 'settings', 0), ('commercial', 'users', 0), ('commercial', 'costs', 0), ('commercial', 'approvals', 0), ('commercial', 'dashboard', 1), ('commercial', 'projects', 1), ('commercial', 'clients', 1), ('commercial', 'tracker', 1),
    ('staff', 'settings', 0), ('staff', 'users', 0), ('staff', 'costs', 0), ('staff', 'approvals', 0), ('staff', 'dashboard', 0), ('staff', 'projects', 0), ('staff', 'clients', 0), ('staff', 'tracker', 1);

    -- Seed initial data if empty
    INSERT OR IGNORE INTO system_config (id, company_name, logo_url) VALUES (1, 'TimeTracker', '');
    
    INSERT OR IGNORE INTO profiles (name) VALUES ('PM'), ('QA'), ('AF'), ('DEV');
    INSERT OR IGNORE INTO seniorities (name) VALUES ('Junior'), ('Ssr'), ('Senior');
    
    INSERT OR IGNORE INTO tasks_master (name) VALUES ('Coding'), ('Meeting'), ('Testing'), ('Documentation'), ('Planning');
  `);

  // Migration: Add missing columns if they don't exist
  const columns = db.prepare("PRAGMA table_info(system_config)").all();
  const columnNames = columns.map((c: any) => c.name);
  
  if (!columnNames.includes('accent_color')) {
    db.exec("ALTER TABLE system_config ADD COLUMN accent_color TEXT DEFAULT '#3b82f6'");
  }
  if (!columnNames.includes('sidebar_bg')) {
    db.exec("ALTER TABLE system_config ADD COLUMN sidebar_bg TEXT DEFAULT '#ffffff'");
  }
  if (!columnNames.includes('sidebar_text')) {
    db.exec("ALTER TABLE system_config ADD COLUMN sidebar_text TEXT DEFAULT '#1f2937'");
  }

  // Check if admin exists, if not create a default one
  const admin = db.prepare('SELECT * FROM users WHERE role = ?').get('admin');
  if (!admin) {
    // Default password is 'admin123' - in a real app this should be changed immediately
    // We'll hash it in the server logic, but for seeding we can do it here or via the API
  }
}

export function getSqliteDb() {
  if (!db) {
    initDb();
  }
  return db;
}

export default getSqliteDb;
