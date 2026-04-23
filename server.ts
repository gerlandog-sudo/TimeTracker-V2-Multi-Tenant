import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';
import getSqliteDb, { initDb as initSqlite } from './src/server/db.ts';
import dotenv from 'dotenv';

dotenv.config();

// --- Database Selection ---
// We check if MySQL is requested and if we have credentials.
let USE_MYSQL = process.env.USE_MYSQL === 'true' && !!process.env.DB_NAME && !!process.env.DB_USER;

async function getDb() {
  if (USE_MYSQL) {
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '3306'),
        connectTimeout: 2000 // Short timeout for faster fallback
      });
      return connection;
    } catch (error) {
      USE_MYSQL = false; // Force fallback to SQLite
      return null;
    }
  }
  return null;
}

// Wrapper to handle both SQLite and MySQL queries
async function query(sql: string, params: any[] = []) {
  if (USE_MYSQL) {
    const connection = await getDb();
    if (connection) {
      try {
        const [rows] = await connection.execute(sql, params);
        return rows;
      } finally {
        await connection.end();
      }
    }
  }
  
  // SQLite fallback
  const sqliteDb = getSqliteDb();
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return sqliteDb.prepare(sql).all(...params);
  } else {
    return sqliteDb.prepare(sql).run(...params);
  }
}

async function queryOne(sql: string, params: any[] = []) {
  if (USE_MYSQL) {
    const rows = await query(sql, params) as any[];
    if (rows && rows.length > 0) return rows[0];
  }
  
  // SQLite fallback
  return getSqliteDb().prepare(sql).get(...params);
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

async function startServer() {
  try {
    console.log('Starting server initialization...');
    // Always initialize SQLite as it serves as our primary fallback
    console.log('Initializing SQLite...');
    initSqlite();
    
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', database: USE_MYSQL ? 'mysql' : 'sqlite' });
    });

    // --- Auth Middleware ---
    const authenticateToken = (req: any, res: any, next: any) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) return res.sendStatus(401);

      jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
      });
    };

    // --- Auth Routes ---
    app.post('/api/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);

        if (!user || !bcrypt.compareSync(password, user.password)) {
          return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET);
        res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // Seed default admin if none exists
    const seedAdmin = async () => {
      try {
        const adminCheck = await queryOne('SELECT * FROM users WHERE role = ?', ['admin']);
        if (!adminCheck) {
          const hashedPassword = bcrypt.hashSync('admin123', 10);
          await query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [
            'Administrador',
            'admin@example.com',
            hashedPassword,
            'admin'
          ]);
          console.log('Default admin created: admin@example.com / admin123');
        }
      } catch (error) {
        console.error('Seeding error:', error);
      }
    };
    seedAdmin();

    // --- System Config ---
    app.get('/api/config', async (req, res) => {
      try {
        const config = await queryOne('SELECT * FROM system_config WHERE id = 1');
        res.json(config);
      } catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ message: 'Error fetching config' });
      }
    });

    app.post('/api/config', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        const { company_name, logo_url, primary_color, secondary_color, accent_color, sidebar_bg, sidebar_text, currency } = req.body;
        
        // Ensure columns exist in MySQL if active
        if (USE_MYSQL) {
          try {
            await query('ALTER TABLE system_config ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT "#3b82f6"');
            await query('ALTER TABLE system_config ADD COLUMN IF NOT EXISTS sidebar_bg VARCHAR(20) DEFAULT "#ffffff"');
            await query('ALTER TABLE system_config ADD COLUMN IF NOT EXISTS sidebar_text VARCHAR(20) DEFAULT "#1f2937"');
            await query('ALTER TABLE system_config MODIFY COLUMN logo_url MEDIUMTEXT');
            
            // Permissions table for MySQL
            await query(`
              CREATE TABLE IF NOT EXISTS permissions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role VARCHAR(50) NOT NULL,
                feature VARCHAR(100) NOT NULL,
                can_access TINYINT DEFAULT 0,
                UNIQUE KEY role_feature (role, feature)
              )
            `);

            // Time entry logs table for MySQL
            await query(`
              CREATE TABLE IF NOT EXISTS time_entry_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                time_entry_id INT NOT NULL,
                from_status VARCHAR(50),
                to_status VARCHAR(50) NOT NULL,
                user_id INT NOT NULL,
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id)
              )
            `);
          } catch (e) {
            console.log('MySQL migration notice:', e);
          }
        }

        await query(`
          UPDATE system_config SET 
            company_name = ?, 
            logo_url = ?, 
            primary_color = ?, 
            secondary_color = ?, 
            accent_color = ?,
            sidebar_bg = ?,
            sidebar_text = ?,
            currency = ?
          WHERE id = 1
        `, [company_name, logo_url, primary_color, secondary_color, accent_color, sidebar_bg, sidebar_text, currency]);
        
        console.log('Config updated successfully');
        res.json({ success: true });
      } catch (error) {
        console.error('Config update error:', error);
        res.status(500).json({ message: 'Error updating config' });
      }
    });

    // --- Permissions Endpoints ---
    app.get('/api/permissions', authenticateToken, async (req, res) => {
      try {
        const permissions = await query('SELECT role, feature, can_access FROM permissions');
        res.json(permissions);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching permissions' });
      }
    });

    app.post('/api/permissions', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        const { role, feature, can_access } = req.body;
        
        if (USE_MYSQL) {
          await query(`
            INSERT INTO permissions (role, feature, can_access) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE can_access = VALUES(can_access)
          `, [role, feature, can_access ? 1 : 0]);
        } else {
          await query(`
            INSERT INTO permissions (role, feature, can_access) 
            VALUES (?, ?, ?) 
            ON CONFLICT(role, feature) DO UPDATE SET can_access = excluded.can_access
          `, [role, feature, can_access ? 1 : 0]);
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: 'Error updating permissions' });
      }
    });

    // --- Users CRUD ---
    app.get('/api/users', authenticateToken, async (req, res) => {
      try {
        if (!['admin', 'c-level'].includes(req.user.role)) return res.sendStatus(403);
        const users = await query(`
          SELECT u.id, u.name, u.email, u.role, u.profile_id as position_id, 
                 p.name as position_name, s.name as seniority
          FROM users u
          LEFT JOIN profiles p ON u.profile_id = p.id
          LEFT JOIN seniorities s ON u.seniority_id = s.id
        `);
        res.json(users);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
      }
    });

    app.post('/api/users', authenticateToken, async (req, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      const { name, email, password, role, position_id, seniority } = req.body;
      const hashedPassword = bcrypt.hashSync(password, 10);
      try {
        let seniority_id = null;
        if (seniority) {
          let s = await queryOne('SELECT id FROM seniorities WHERE name = ?', [seniority]);
          if (!s) {
            await query('INSERT INTO seniorities (name) VALUES (?)', [seniority]);
            s = await queryOne('SELECT id FROM seniorities WHERE name = ?', [seniority]);
          }
          seniority_id = s.id;
        }

        await query('INSERT INTO users (name, email, password, role, profile_id, seniority_id) VALUES (?, ?, ?, ?, ?, ?)', [
          name, email, hashedPassword, role, position_id || null, seniority_id
        ]);
        res.json({ success: true });
      } catch (e: any) {
        res.status(400).json({ message: e.message });
      }
    });

    app.put('/api/users', authenticateToken, async (req, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      const { id, name, email, password, role, position_id, seniority } = req.body;
      try {
        let seniority_id = null;
        if (seniority) {
          let s = await queryOne('SELECT id FROM seniorities WHERE name = ?', [seniority]);
          if (!s) {
            await query('INSERT INTO seniorities (name) VALUES (?)', [seniority]);
            s = await queryOne('SELECT id FROM seniorities WHERE name = ?', [seniority]);
          }
          seniority_id = s.id;
        }

        if (password) {
          const hashedPassword = bcrypt.hashSync(password, 10);
          await query('UPDATE users SET name = ?, email = ?, password = ?, role = ?, profile_id = ?, seniority_id = ? WHERE id = ?', [
            name, email, hashedPassword, role, position_id || null, seniority_id, id
          ]);
        } else {
          await query('UPDATE users SET name = ?, email = ?, role = ?, profile_id = ?, seniority_id = ? WHERE id = ?', [
            name, email, role, position_id || null, seniority_id, id
          ]);
        }
        res.json({ success: true });
      } catch (e: any) {
        res.status(400).json({ message: e.message });
      }
    });

    app.delete('/api/users/:id', authenticateToken, async (req, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      try {
        const id = req.params.id;
        // Check if user has time entries
        const used = await queryOne('SELECT id FROM time_entries WHERE user_id = ? LIMIT 1', [id]);
        if (used) {
          return res.status(400).json({ message: 'No se puede eliminar el usuario porque tiene horas registradas en el tracker.' });
        }
        await query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true });
      } catch (e: any) {
        res.status(400).json({ message: 'Error al eliminar el usuario.' });
      }
    });

    // --- Clients CRUD ---
    app.get('/api/clients', authenticateToken, async (req, res) => {
      try {
        const clients = await query(`
          SELECT c.*, 
                 COALESCE(p_stats.budget_hours, 0) as total_budget_hours,
                 COALESCE(p_stats.budget_money, 0) as total_budget_money,
                 COALESCE(te_stats.actual_hours, 0) as total_actual_hours,
                 COALESCE(te_stats.actual_revenue, 0) as total_actual_revenue
          FROM clients c
          LEFT JOIN (
            SELECT client_id, SUM(budget_hours) as budget_hours, SUM(budget_money) as budget_money
            FROM projects
            GROUP BY client_id
          ) p_stats ON c.id = p_stats.client_id
          LEFT JOIN (
            SELECT p.client_id, 
                   SUM(te.hours) as actual_hours,
                   SUM(te.hours * COALESCE(co.rate_per_hour, 0)) as actual_revenue
            FROM time_entries te
            JOIN projects p ON te.project_id = p.id
            LEFT JOIN users u ON te.user_id = u.id
            LEFT JOIN costs co ON u.profile_id = co.profile_id AND u.seniority_id = co.seniority_id
            WHERE te.status = 'approved'
            GROUP BY p.client_id
          ) te_stats ON c.id = te_stats.client_id
          ORDER BY c.name
        `);
        res.json(clients);
      } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ message: 'Error fetching clients' });
      }
    });

    app.get('/api/clients/:id', authenticateToken, async (req, res) => {
      try {
        const client = await queryOne('SELECT * FROM clients WHERE id = ?', [req.params.id]);
        if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
        const contacts = await query('SELECT * FROM client_contacts WHERE client_id = ?', [req.params.id]);
        res.json({ ...client, contacts });
      } catch (error) {
        res.status(500).json({ message: 'Error fetching client' });
      }
    });

    app.post('/api/clients', authenticateToken, async (req, res) => {
      try {
        const { name, legal_name, tax_id, address } = req.body;
        const result = await query('INSERT INTO clients (name, legal_name, tax_id, address) VALUES (?, ?, ?, ?)', [
          name, legal_name || null, tax_id || null, address || null
        ]) as any;
        const id = USE_MYSQL ? result.insertId : result.lastInsertRowid;
        res.json({ success: true, id });
      } catch (error) {
        res.status(500).json({ message: 'Error creating client' });
      }
    });

    app.put('/api/clients', authenticateToken, async (req, res) => {
      try {
        const { id, name, legal_name, tax_id, address } = req.body;
        await query('UPDATE clients SET name = ?, legal_name = ?, tax_id = ?, address = ? WHERE id = ?', [
          name, legal_name || null, tax_id || null, address || null, id
        ]);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: 'Error updating client' });
      }
    });

    app.delete('/api/clients/:id', authenticateToken, async (req, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      try {
        const id = req.params.id;
        // Check if client has projects
        const used = await queryOne('SELECT id FROM projects WHERE client_id = ? LIMIT 1', [id]);
        if (used) {
          return res.status(400).json({ message: 'No se puede eliminar el cliente porque tiene proyectos asociados.' });
        }
        await query('DELETE FROM clients WHERE id = ?', [id]);
        res.json({ success: true });
      } catch (e: any) {
        res.status(400).json({ message: 'Error al eliminar el cliente.' });
      }
    });

    // --- Client Contacts ---
    app.get('/api/clients/:id/contacts', authenticateToken, async (req, res) => {
      try {
        const contacts = await query('SELECT * FROM client_contacts WHERE client_id = ?', [req.params.id]);
        res.json(contacts);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching contacts' });
      }
    });

    app.post('/api/clients/:id/contacts', authenticateToken, async (req, res) => {
      try {
        const { name, email, phone, position } = req.body;
        const result = await query('INSERT INTO client_contacts (client_id, name, email, phone, position) VALUES (?, ?, ?, ?, ?)', [
          req.params.id, name, email || null, phone || null, position || null
        ]) as any;
        const id = USE_MYSQL ? result.insertId : result.lastInsertRowid;
        res.json({ success: true, id });
      } catch (error) {
        res.status(500).json({ message: 'Error creating contact' });
      }
    });

    app.put('/api/clients/contacts/:id', authenticateToken, async (req, res) => {
      try {
        const { name, email, phone, position } = req.body;
        await query('UPDATE client_contacts SET name = ?, email = ?, phone = ?, position = ? WHERE id = ?', [
          name, email || null, phone || null, position || null, req.params.id
        ]);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: 'Error updating contact' });
      }
    });

    app.delete('/api/clients/contacts/:id', authenticateToken, async (req, res) => {
      try {
        await query('DELETE FROM client_contacts WHERE id = ?', [req.params.id]);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: 'Error deleting contact' });
      }
    });

    // --- Projects CRUD ---
    app.get('/api/projects', authenticateToken, async (req, res) => {
      try {
        const projects = await query(`
          SELECT p.*, c.name as client_name,
                 COALESCE(te_stats.actual_hours, 0) as actual_hours,
                 COALESCE(te_stats.actual_revenue, 0) as actual_revenue,
                 COALESCE(te_stats.actual_cost, 0) as actual_cost
          FROM projects p 
          JOIN clients c ON p.client_id = c.id
          LEFT JOIN (
            SELECT te.project_id, 
                   SUM(te.hours) as actual_hours,
                   SUM(te.hours * COALESCE(co.rate_per_hour, 0)) as actual_revenue,
                   SUM(te.hours * COALESCE(co.cost_per_hour, 0)) as actual_cost
            FROM time_entries te
            JOIN users u ON te.user_id = u.id
            LEFT JOIN costs co ON u.profile_id = co.profile_id AND u.seniority_id = co.seniority_id
            WHERE te.status = 'approved'
            GROUP BY te.project_id
          ) te_stats ON p.id = te_stats.project_id
        `);
        res.json(projects);
      } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ message: 'Error fetching projects' });
      }
    });

    app.post('/api/projects', authenticateToken, async (req, res) => {
      try {
        if (!['admin', 'c-level', 'commercial'].includes(req.user.role)) return res.sendStatus(403);
        const { client_id, name, budget_hours, budget_money, status } = req.body;
        await query('INSERT INTO projects (client_id, name, budget_hours, budget_money, status) VALUES (?, ?, ?, ?, ?)', [
          client_id, name, budget_hours, budget_money, status || 'active'
        ]);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: 'Error creating project' });
      }
    });

    app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
      if (req.user.role !== 'admin') return res.sendStatus(403);
      try {
        const id = req.params.id;
        // Check if project has time entries
        const used = await queryOne('SELECT id FROM time_entries WHERE project_id = ? LIMIT 1', [id]);
        if (used) {
          return res.status(400).json({ message: 'No se puede eliminar el proyecto porque tiene horas registradas.' });
        }
        await query('DELETE FROM projects WHERE id = ?', [id]);
        res.json({ success: true });
      } catch (e: any) {
        res.status(400).json({ message: 'Error al eliminar el proyecto.' });
      }
    });

    // --- Profiles & Seniorities & Costs ---
    app.get('/api/positions', authenticateToken, async (req, res) => {
      try {
        const positions = await query('SELECT * FROM profiles ORDER BY name');
        res.json(positions);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching positions' });
      }
    });

    app.post('/api/positions', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        const { name } = req.body;
        await query('INSERT INTO profiles (name) VALUES (?)', [name]);
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ message: error.message });
      }
    });

    app.put('/api/positions', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        const { id, name } = req.body;
        await query('UPDATE profiles SET name = ? WHERE id = ?', [name, id]);
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ message: error.message });
      }
    });

    app.delete('/api/positions/:id', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        const id = req.params.id;
        // Check if position is used in users or costs
        const usedInUsers = await queryOne('SELECT id FROM users WHERE profile_id = ? LIMIT 1', [id]);
        const usedInCosts = await queryOne('SELECT id FROM costs WHERE profile_id = ? LIMIT 1', [id]);
        if (usedInUsers || usedInCosts) {
          return res.status(400).json({ message: 'No se puede eliminar el cargo porque está siendo utilizado por usuarios o tiene costos asociados.' });
        }
        await query('DELETE FROM profiles WHERE id = ?', [id]);
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ message: 'Error al eliminar el cargo.' });
      }
    });

    app.get('/api/seniorities', authenticateToken, async (req, res) => {
      try {
        const seniorities = await query('SELECT * FROM seniorities ORDER BY name');
        res.json(seniorities);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching seniorities' });
      }
    });

    app.get('/api/position-costs', authenticateToken, async (req, res) => {
      try {
        if (!['admin', 'c-level'].includes(req.user.role)) return res.sendStatus(403);
        // We'll return a structure that matches what Settings.tsx expects
        // If the database uses seniority_id, we'll join it. 
        // But Settings.tsx seems to use a string for seniority in some places.
        // Let's check the costs table again.
        const costs = await query(`
          SELECT c.id, c.profile_id as position_id, p.name as position_name, 
                 s.name as seniority, c.cost_per_hour as hourly_cost
          FROM costs c
          JOIN profiles p ON c.profile_id = p.id
          JOIN seniorities s ON c.seniority_id = s.id
        `);
        res.json(costs);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching position costs' });
      }
    });

    app.post('/api/position-costs', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        const { position_id, seniority, hourly_cost } = req.body;
        
        // Find seniority_id from name
        let s = await queryOne('SELECT id FROM seniorities WHERE name = ?', [seniority]);
        if (!s) {
          // If not found, create it? Or return error.
          // For now, let's create it to be flexible.
          await query('INSERT INTO seniorities (name) VALUES (?)', [seniority]);
          s = await queryOne('SELECT id FROM seniorities WHERE name = ?', [seniority]);
        }

        if (USE_MYSQL) {
          await query(`
            INSERT INTO costs (profile_id, seniority_id, cost_per_hour, rate_per_hour) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE cost_per_hour = VALUES(cost_per_hour)
          `, [position_id, s.id, hourly_cost, hourly_cost * 1.5]); // Default rate
        } else {
          await query(`
            INSERT INTO costs (profile_id, seniority_id, cost_per_hour, rate_per_hour) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(profile_id, seniority_id) DO UPDATE SET cost_per_hour = excluded.cost_per_hour
          `, [position_id, s.id, hourly_cost, hourly_cost * 1.5]);
        }
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ message: error.message });
      }
    });

    app.put('/api/position-costs', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        const { id, position_id, seniority, hourly_cost } = req.body;
        
        let s = await queryOne('SELECT id FROM seniorities WHERE name = ?', [seniority]);
        if (!s) {
          await query('INSERT INTO seniorities (name) VALUES (?)', [seniority]);
          s = await queryOne('SELECT id FROM seniorities WHERE name = ?', [seniority]);
        }

        await query(`
          UPDATE costs SET profile_id = ?, seniority_id = ?, cost_per_hour = ?
          WHERE id = ?
        `, [position_id, s.id, hourly_cost, id]);
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ message: error.message });
      }
    });

    app.delete('/api/position-costs/:id', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        // Costs are usually safe to delete as they are mappings, but let's check if any user currently relies on this specific profile/seniority combo
        // Actually, deleting a cost entry just means we won't have a rate for that combo.
        // It's safer to just delete it if the user wants to.
        await query('DELETE FROM costs WHERE id = ?', [req.params.id]);
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ message: 'Error al eliminar el costo.' });
      }
    });

    app.get('/api/tasks', authenticateToken, async (req, res) => {
      try {
        const tasks = await query('SELECT * FROM tasks_master ORDER BY name');
        res.json(tasks);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching tasks' });
      }
    });

    app.post('/api/tasks', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        const { name } = req.body;
        await query('INSERT INTO tasks_master (name) VALUES (?)', [name]);
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ message: error.message });
      }
    });

    app.put('/api/tasks', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        const { id, name } = req.body;
        await query('UPDATE tasks_master SET name = ? WHERE id = ?', [name, id]);
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ message: error.message });
      }
    });

    app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        const id = req.params.id;
        // Check if task is used in time entries
        const used = await queryOne('SELECT id FROM time_entries WHERE task_id = ? LIMIT 1', [id]);
        if (used) {
          return res.status(400).json({ message: 'No se puede eliminar la tarea porque tiene registros de horas asociados.' });
        }
        await query('DELETE FROM tasks_master WHERE id = ?', [id]);
        res.json({ success: true });
      } catch (error: any) {
        res.status(400).json({ message: 'Error al eliminar la tarea.' });
      }
    });

    app.get('/api/metadata', authenticateToken, async (req, res) => {
      try {
        const profiles = await query('SELECT * FROM profiles');
        const seniorities = await query('SELECT * FROM seniorities');
        const tasks = await query('SELECT * FROM tasks_master');
        res.json({ profiles, seniorities, tasks });
      } catch (error) {
        res.status(500).json({ message: 'Error fetching metadata' });
      }
    });

    app.get('/api/costs', authenticateToken, async (req, res) => {
      try {
        if (!['admin', 'c-level'].includes(req.user.role)) return res.sendStatus(403);
        const costs = await query(`
          SELECT c.*, p.name as profile_name, s.name as seniority_name
          FROM costs c
          JOIN profiles p ON c.profile_id = p.id
          JOIN seniorities s ON c.seniority_id = s.id
        `);
        res.json(costs);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching costs' });
      }
    });

    app.post('/api/costs', authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== 'admin') return res.sendStatus(403);
        const { profile_id, seniority_id, cost_per_hour, rate_per_hour } = req.body;
        
        if (USE_MYSQL) {
          await query(`
            INSERT INTO costs (profile_id, seniority_id, cost_per_hour, rate_per_hour) 
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              cost_per_hour = VALUES(cost_per_hour),
              rate_per_hour = VALUES(rate_per_hour)
          `, [profile_id, seniority_id, cost_per_hour, rate_per_hour]);
        } else {
          await query(`
            INSERT INTO costs (profile_id, seniority_id, cost_per_hour, rate_per_hour) 
            VALUES (?, ?, ?, ?)
            ON CONFLICT(profile_id, seniority_id) DO UPDATE SET
              cost_per_hour = excluded.cost_per_hour,
              rate_per_hour = excluded.rate_per_hour
          `, [profile_id, seniority_id, cost_per_hour, rate_per_hour]);
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: 'Error updating costs' });
      }
    });

    // --- Time Entries ---
    app.get('/api/time-entries/:id/logs', authenticateToken, async (req, res) => {
      try {
        const id = req.params.id;
        
        if (!['admin', 'c-level'].includes(req.user.role)) {
          const entry = await queryOne('SELECT user_id FROM time_entries WHERE id = ?', [id]);
          if (!entry || entry.user_id !== req.user.id) {
            return res.sendStatus(403);
          }
        }

        const logs = await query(`
          SELECT l.*, u.name as user_name 
          FROM time_entry_logs l 
          JOIN users u ON l.user_id = u.id 
          WHERE l.time_entry_id = ? 
          ORDER BY l.created_at DESC
        `, [id]);
        res.json(logs);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching logs' });
      }
    });

    app.get('/api/time-entries', authenticateToken, async (req, res) => {
      try {
        let sql = `
          SELECT te.*, p.name as project_name, tm.name as task_name, u.name as user_name
          FROM time_entries te
          JOIN projects p ON te.project_id = p.id
          JOIN tasks_master tm ON te.task_id = tm.id
          JOIN users u ON te.user_id = u.id
        `;
        const params: any[] = [];

        if (req.user.role === 'staff') {
          sql += ' WHERE te.user_id = ?';
          params.push(req.user.id);
        }

        const entries = await query(sql, params);
        res.json(entries);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching time entries' });
      }
    });

    app.post('/api/time-entries', authenticateToken, async (req, res) => {
      try {
        const { project_id, task_id, description, hours, date } = req.body;
        await query('INSERT INTO time_entries (user_id, project_id, task_id, description, hours, date) VALUES (?, ?, ?, ?, ?, ?)', [
          req.user.id, project_id, task_id, description, hours, date
        ]);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: 'Error creating time entry' });
      }
    });

    app.patch('/api/time-entries/:id/status', authenticateToken, async (req, res) => {
      try {
        if (!['admin', 'c-level'].includes(req.user.role)) return res.sendStatus(403);
        const { status, rejection_reason } = req.body;
        
        // Get time entry info to notify user
        const entry = await queryOne('SELECT user_id, date FROM time_entries WHERE id = ?', [req.params.id]);
        
        await query('UPDATE time_entries SET status = ?, rejection_reason = ? WHERE id = ?', [
          status, rejection_reason || null, req.params.id
        ]);

        if (entry) {
          const message = status === 'approved' 
            ? `Tu registro del ${entry.date} ha sido aprobado.`
            : `Tu registro del ${entry.date} ha sido rechazado: ${rejection_reason || 'Sin motivo especificado'}.`;
          
          await query('INSERT INTO notifications (user_id, message, type) VALUES (?, ?, ?)', [
            entry.user_id, message, status === 'approved' ? 'success' : 'error'
          ]);
        }

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: 'Error updating status' });
      }
    });

    // --- Notifications (Endpoint: user-alerts to avoid ad blockers) ---
    app.get('/api/user-alerts', authenticateToken, async (req, res) => {
      try {
        const notifications = await query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
        res.json(notifications);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications' });
      }
    });

    app.patch('/api/user-alerts', authenticateToken, async (req, res) => {
      try {
        const { id } = req.body;
        if (id) {
          await query('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.user.id]);
        } else {
          await query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ message: 'Error updating notifications' });
      }
    });

    // --- Dashboard Data ---
    app.get('/api/dashboard', authenticateToken, async (req, res) => {
      try {
        if (!['admin', 'c-level', 'commercial'].includes(req.user.role)) return res.sendStatus(403);
        
        // Summary stats
        const totalHours = await queryOne("SELECT SUM(hours) as total FROM time_entries WHERE status = 'approved'");
        const activeProjects = await queryOne("SELECT COUNT(*) as count FROM projects WHERE status = 'active'");
        const totalClients = await queryOne("SELECT COUNT(*) as count FROM clients");
        
        // Hours by project
        const hoursByProject = await query(`
          SELECT p.name, SUM(te.hours) as hours
          FROM time_entries te
          JOIN projects p ON te.project_id = p.id
          WHERE te.status = 'approved'
          GROUP BY p.id, p.name
        `);

        // Profitability (simplified)
        const profitability = await query(`
          SELECT p.name, 
                 SUM(te.hours * COALESCE(c.rate_per_hour, 0)) as revenue,
                 SUM(te.hours * COALESCE(c.cost_per_hour, 0)) as cost
          FROM time_entries te
          JOIN projects p ON te.project_id = p.id
          JOIN users u ON te.user_id = u.id
          LEFT JOIN costs c ON u.profile_id = c.profile_id AND u.seniority_id = c.seniority_id
          WHERE te.status = 'approved'
          GROUP BY p.id, p.name
        `);

        res.json({
          stats: {
            totalHours: totalHours?.total || 0,
            activeProjects: activeProjects?.count || 0,
            totalClients: totalClients?.count || 0
          },
          hoursByProject,
          profitability
        });
      } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard data' });
      }
    });

  // --- Vite Middleware / Static Files ---
  const distPath = path.join(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(distPath, 'index.html'));

  if (!isProduction) {
    console.log('Running in Development mode (Vite Middleware)');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Running in Production mode (Static Files)');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  } catch (error) {
    console.error('CRITICAL: Server failed to start:', error);
    process.exit(1);
  }
}

startServer();
