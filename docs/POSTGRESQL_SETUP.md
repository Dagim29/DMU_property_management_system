# PostgreSQL Setup Guide for Property Management System

## Step 1: Install PostgreSQL

1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer
3. During installation:
   - Set a password for the `postgres` superuser (remember this!)
   - Keep default port: 5432
   - Install pgAdmin 4 (GUI tool)

## Step 2: Create Database Using pgAdmin

1. Open pgAdmin 4
2. Connect to PostgreSQL server (use the password you set)
3. Right-click on "Databases" → "Create" → "Database"
4. Database name: `property_management`
5. Click "Save"

## Step 3: Create Database User

1. In pgAdmin, right-click on "Login/Group Roles" → "Create" → "Login/Group Role"
2. General tab:
   - Name: `pms_user`
3. Definition tab:
   - Password: `secure_password` (or your preferred password)
4. Privileges tab:
   - Check: "Can login?"
5. Click "Save"

## Step 4: Grant Privileges

1. Right-click on `property_management` database → "Query Tool"
2. Run this SQL:

```sql
GRANT ALL PRIVILEGES ON DATABASE property_management TO pms_user;
GRANT ALL ON SCHEMA public TO pms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pms_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pms_user;
```

## Step 5: Update .env File

Edit `backend/.env` file with your PostgreSQL credentials:

```env
# Database
DB_NAME=property_management
DB_USER=pms_user
DB_PASSWORD=secure_password
DB_HOST=localhost
DB_PORT=5432
```

## Step 6: Run Migrations

```bash
cd backend
python manage.py migrate
```

## Step 7: Create Superuser

```bash
python manage.py createsuperuser
```

## Alternative: Using Command Line (psql)

If you prefer command line:

```bash
# Connect to PostgreSQL
psql -U postgres

# Run the setup script
\i backend/setup_database.sql

# Exit
\q
```

## Troubleshooting

### Error: "password authentication failed"
- Check your password in the .env file
- Make sure the user was created correctly in pgAdmin

### Error: "database does not exist"
- Create the database first using pgAdmin or SQL script

### Error: "permission denied"
- Run the GRANT commands in Step 4

### Connection refused
- Make sure PostgreSQL service is running
- Check Windows Services → PostgreSQL should be "Running"
- Verify port 5432 is not blocked by firewall

## Verify Connection

Test the connection:

```bash
cd backend
python manage.py dbshell
```

If successful, you'll see the PostgreSQL prompt.
