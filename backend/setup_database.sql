-- PostgreSQL Database Setup Script for Property Management System
-- Run this script using pgAdmin or psql command line

-- Create database
CREATE DATABASE property_management
    WITH 
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_United States.1252'
    LC_CTYPE = 'English_United States.1252'
    TEMPLATE = template0;

-- Create user
CREATE USER pms_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE property_management TO pms_user;

-- Connect to the database (in psql, use: \c property_management)
-- Then grant schema privileges
GRANT ALL ON SCHEMA public TO pms_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pms_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pms_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pms_user;
