# Vercel & Supabase Deployment Guide

This guide describes how to deploy the **DMU Property Management System** to Vercel and connect it to a managed PostgreSQL database on Supabase.

---

## Part 1: Setting up Supabase Database

1. **Create a Supabase Account & Project**:
   - Go to [Supabase](https://supabase.com/) and sign in or create an account.
   - Click **New Project** and select your organization.
   - Choose a project name (e.g., `dmu-property-management`), set a secure database password, and select a region close to your Vercel deployment 9q3FEpTvdmW3Muai(e.g., East US or nearest).
   - Click **Create New Project** and wait for database provisioning to finish.

2. **Retrieve Connection String**:
   - In the Supabase Dashboard, navigate to **Project Settings** (gear icon) > **Database**.
   - Scroll down to the **Connection strings** section.
   - Select the **URI** tab. Copy the URL string. It will look like this:
     ```text
     postgresql://postgres.[YOUR-PROJECT-ID]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
     ```
     *(Note: If you use the pooler, use port `6543` for transaction pooling, or port `5432` for direct connection. For Django serverless, using the Transaction Pooler `6543` is highly recommended because it handles many concurrent stateless connections).*

---

## Part 2: Migrating & Seeding the Supabase Database Locally

Before launching on Vercel, you need to run Django migrations and seed initial data into your Supabase database from your local machine.

1. **Activate Virtual Environment**:
   Open a terminal and navigate to the backend folder:
   ```powershell
   cd backend
   .\venv\Scripts\Activate
   ```

2. **Install Dependencies**:
   Ensure you have installed the new dependencies (`dj-database-url`):
   ```powershell
   pip install -r requirements.txt
   ```

3. **Run Migrations on Supabase**:
   Set the `DATABASE_URL` environment variable temporarily in your terminal, then run Django's `migrate` command:
   *On Windows PowerShell:*
   ```powershell
   $env:DATABASE_URL="your-supabase-connection-uri"
   python manage.py migrate
   ```
   *On Linux/macOS/Git Bash:*
   ```bash
   export DATABASE_URL="your-supabase-connection-uri"
   python manage.py migrate
   ```

4. **Seed Database Data (Optional)**:
   Run the setup/seed scripts present in your backend folder to populate the database with mock properties, assets, and users:
   ```powershell
   python create_management_data.py
   python create_availability_data.py
   python create_performance_reviews.py
   python create_sla_tracking_data.py
   ```

---

## Part 3: Deploying the Backend on Vercel

1. **Create a New Project on Vercel**:
   - Go to your Vercel Dashboard, click **Add New** > **Project**.
   - Import your GitHub repository containing the project.

2. **Configure Backend Settings**:
   - **Project Name**: `dmu-property-management-backend`
   - **Framework Preset**: Choose **Other**
   - **Root Directory**: Click `Edit` and select the `backend` folder.

3. **Add Environment Variables**:
   Under the **Environment Variables** section, add the following variables:
   - `DATABASE_URL`: The Supabase URI you retrieved in Part 1.
   - `SECRET_KEY`: A secure random string (e.g. `django-insecure-prod-key-change-this!`).
   - `DEBUG`: `False` (for production safety).
   - `ALLOWED_HOSTS`: `*` (or your specific Vercel deployment domain names, comma-separated).
   - `CORS_ALLOW_ALL_ORIGINS`: `True` (or set `CORS_ALLOWED_ORIGINS` to the URL of your Vercel frontend once deployed).

4. **Deploy**:
   - Click **Deploy**. Vercel will install the Python dependencies listed in `requirements.txt` and package the application using the `@vercel/python` builder defined in `vercel.json`.

---

## Part 4: Deploying the Frontend on Vercel

1. **Create another New Project on Vercel**:
   - Go back to Vercel Dashboard, click **Add New** > **Project**.
   - Import the same GitHub repository again.

2. **Configure Frontend Settings**:
   - **Project Name**: `dmu-property-management-frontend`
   - **Framework Preset**: **Vite** (Vercel will auto-detect this).
   - **Root Directory**: Click `Edit` and select the `frontend` folder.

3. **Add Environment Variables**:
   Under the **Environment Variables** section, add:
   - `VITE_API_URL`: The domain URL of your deployed backend (e.g. `https://dmu-property-management-backend.vercel.app/api`).
     *(Note: Do not include a trailing slash unless desired; the React services expect it to end with `/api` e.g., `/users/auth/token/refresh/`)*

4. **Deploy**:
   - Click **Deploy**. Vercel will compile the React bundle and deploy the static build with the routes configured in `frontend/vercel.json` (which automatically routes pages back to `index.html` to avoid 404s on page refresh).

---

## Part 5: Post-Deployment Verification

1. Go to your frontend URL. You should see the login portal.
2. Sign in with the seeded credentials (e.g., manager, admin, supervisor, or technician users created during seeding).
3. Open Developer Tools (F12) > Network tab, and verify that API requests to the backend Vercel URL succeed.
