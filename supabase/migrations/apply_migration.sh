#!/bin/bash

# MySQL Migration Script
# This script applies the MySQL database schema

MYSQL_HOST="144.172.112.31"
MYSQL_USER="root"
MYSQL_PASSWORD="root_root"
MYSQL_DB="trading"

echo "🔄 Applying MySQL migrations..."
echo "Host: $MYSQL_HOST"
echo "Database: $MYSQL_DB"
echo ""

# Run the migration file
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --skip-ssl "$MYSQL_DB" < /home/iguanya/Projects/forex-ai-insights/supabase/migrations/20260315_mysql_rbac_deposits_schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
    
    # Verify tables were created
    echo ""
    echo "📋 Tables created:"
    mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" --skip-ssl "$MYSQL_DB" -e "SHOW TABLES;"
else
    echo "❌ Migration failed!"
    exit 1
fi
