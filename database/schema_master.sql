-- ========================================================
-- SCHEMA MAESTRO - TIMETRACKER V2 MULTI-TENANT
-- Versión: 2.01.026
-- Motor Recomendado: InnoDB | Charset: utf8mb4_unicode_ci
-- ========================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- 1. ESTRUCTURA DE TENANTS (Maestra)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tenants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `domain` varchar(255) DEFAULT NULL,
  `status` enum('active','paused','suspended') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_tenant_domain` (`domain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. CONFIGURACIÓN DE SISTEMA (White-Label)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `system_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `company_name` varchar(100) DEFAULT 'TimeTracker',
  `logo_url` mediumtext DEFAULT NULL,
  `primary_color` varchar(20) DEFAULT '#4f46e5',
  `secondary_color` varchar(20) DEFAULT '#0f172a',
  `accent_color` varchar(20) DEFAULT '#06b6d4',
  `sidebar_bg` varchar(20) DEFAULT '#f8fafc',
  `sidebar_text` varchar(20) DEFAULT '#334155',
  `color_approved` varchar(7) DEFAULT '#10b981',
  `color_rejected` varchar(7) DEFAULT '#ef4444',
  `color_submitted` varchar(7) DEFAULT '#f59e0b',
  `color_draft` varchar(7) DEFAULT '#94a3b8',
  `currency` varchar(10) DEFAULT 'USD',
  `sound_enabled` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_config_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. USUARIOS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role_id` int(11) DEFAULT 4,
  `role` varchar(50) DEFAULT 'staff',
  `position_id` int(11) DEFAULT NULL,
  `seniority_id` int(11) DEFAULT NULL,
  `seniority` varchar(50) DEFAULT NULL,
  `hourly_cost` decimal(15,2) DEFAULT 0.00,
  `weekly_capacity` decimal(5,2) DEFAULT 40.00,
  `language` varchar(10) DEFAULT 'es_AR',
  `is_super_admin` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_user_email` (`email`),
  KEY `idx_user_tenant` (`tenant_id`),
  KEY `idx_user_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ROLES Y PERMISOS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `financial_access` tinyint(1) DEFAULT 0,
  `system_config_access` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_role_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `feature` varchar(100) NOT NULL,
  `can_access` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_perm_role_feature_tenant` (`role_id`,`feature`,`tenant_id`),
  KEY `idx_perm_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. CLIENTES Y PROYECTOS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `clients` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `legal_name` varchar(255) DEFAULT NULL,
  `tax_id` varchar(50) DEFAULT NULL,
  `contact_name` varchar(100) DEFAULT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_client_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `budget_hours` decimal(15,2) DEFAULT 0.00,
  `budget_money` decimal(15,2) DEFAULT 0.00,
  `status` enum('Activo','Pausado','Facturado','Finalizado') DEFAULT 'Activo',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_tenant` (`tenant_id`),
  KEY `idx_project_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. REGISTROS DE TIEMPO (Transaccional)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `time_entries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `hours` decimal(5,2) NOT NULL,
  `date` date NOT NULL,
  `status` enum('draft','submitted','approved','rejected') DEFAULT 'draft',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_time_tenant` (`tenant_id`),
  KEY `idx_time_user` (`user_id`),
  KEY `idx_time_project` (`project_id`),
  KEY `idx_time_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. AUDITORÍA Y LOGS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `old_values` longtext DEFAULT NULL,
  `new_values` longtext DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_tenant` (`tenant_id`),
  KEY `idx_audit_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. MAESTROS Y METADATA
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tasks_master` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_task_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `positions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_position_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. CONFIGURACIÓN DE COSTOS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `position_costs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `position_id` int(11) NOT NULL,
  `seniority` varchar(50) NOT NULL,
  `hourly_cost` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_poscost_unique` (`position_id`,`seniority`,`tenant_id`),
  KEY `idx_poscost_tenant` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. KANBAN Y TAREAS (Operacional)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kanban_tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenant_id` int(11) NOT NULL,
  `project_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `description` text NOT NULL,
  `priority` varchar(20) DEFAULT 'Baja',
  `task_type_id` int(11) DEFAULT NULL,
  `estimated_hours` decimal(5,2) DEFAULT '0.00',
  `status` varchar(20) DEFAULT 'ToDo',
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kanban_tenant` (`tenant_id`),
  KEY `idx_kanban_project` (`project_id`),
  KEY `idx_kanban_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. NOTIFICACIONES
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notify_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;
