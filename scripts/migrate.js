#!/usr/bin/env node

/**
 * Database Migration Script (Node.js version)
 * Apply all migrations to remote MySQL server
 * 
 * Usage:
 *   npm run migrate
 *   or
 *   node scripts/migrate.js
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(PROJECT_ROOT, 'supabase', 'migrations');

// Configuration
const config = {
  host: process.env.MYSQL_HOST || '144.172.112.31',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'root_root',
  database: process.env.MYSQL_DATABASE || 'trading',
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.error(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}→ ${msg}${colors.reset}`),
};

// Array of migrations in order (important!)
const migrations = [
  '001_core_tables.sql',
  '20260315_mysql_rbac_deposits_schema.sql',
  '20260329_add_wallet_support.sql',
];

async function runMigrations() {
  let connection;

  try {
    console.log('\n' + '='.repeat(65));
    console.log('🗄️  MySQL Database Migration Script (Node.js)');
    console.log('='.repeat(65) + '\n');

    // Show configuration
    log.info(`Database: ${config.database}`);
    log.info(`Host: ${config.host}:${config.port}`);
    log.info(`User: ${config.user}`);
    console.log();

    // Create connection
    log.step('Connecting to database...');
    connection = await mysql.createConnection(config);
    log.success('Connected to database');
    console.log();

    // Run migrations
    for (let i = 0; i < migrations.length; i++) {
      const migrationFile = migrations[i];
      const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);

      console.log(`┌─ Migration [${i + 1}/${migrations.length}]`);
      log.step(`Applying: ${migrationFile}`);

      // Check if file exists
      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migrationPath}`);
      }

      // Read migration file
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

      // Split by semicolon to handle multiple statements
      const statements = migrationSQL
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

      // Execute each statement
      for (const statement of statements) {
        try {
          await connection.query(statement);
        } catch (err) {
          // Ignore "already exists" and "duplicate" errors
          if (
            err.message.includes('already exists') ||
            err.message.includes('Duplicate entry') ||
            err.message.includes('Duplicate key')
          ) {
            continue;
          }
          throw err;
        }
      }

      log.success(`Applied: ${migrationFile}`);
      console.log(`└─\n`);
    }

    // Show created tables
    console.log('📋 Database Tables:');
    const [tables] = await connection.query('SHOW TABLES');
    tables.forEach((row, index) => {
      const tableName = Object.values(row)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });
    console.log();

    // Show table statistics
    console.log('📊 Table Statistics:');
    const [tableStats] = await connection.query(
      'SELECT TABLE_NAME, TABLE_ROWS, DATA_LENGTH FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [config.database]
    );

    tableStats.forEach((row) => {
      const size = (row.DATA_LENGTH / 1024).toFixed(2);
      console.log(
        `   ${row.TABLE_NAME}: ${row.TABLE_ROWS} rows, ${size} KB`
      );
    });

    console.log('\n' + '='.repeat(65));
    log.success('All migrations completed successfully!');
    console.log('='.repeat(65) + '\n');

  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    console.error('\nFull error:');
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migrations
runMigrations();
