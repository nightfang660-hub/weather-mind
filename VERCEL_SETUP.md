# Vercel Deployment Guide

Your application requires specific Environment Variables to function correctly on Vercel.

## 1. Database Configuration
The application uses **PostgreSQL** in production. You must provide a valid connection string.
- Create a Postgres database (e.g., via Supabase, Neon, or Vercel Storage).
- Get the connection string (usually starts with `postgres://` or `postgresql://`).
- Set the following Environment Variable in your Vercel Project Settings:
  - Key: `DATABASE_URL`
  - Value: `your_postgres_connection_string`

## 2. Authentication
Secure your JWT tokens by setting a secret.
- Key: `JWT_SECRET`
- Value: `a_secure_random_string` (e.g., run `openssl rand -hex 32` to generate one)

## 3. Quantum Service
The Python backend (Quantum Service) is automatically deployed as a serverless function with the provided setup.
- Ensure `requirements.txt` is in the root directory (We have done this for you).
- The service will be available at `/api/quantum`.

## 4. Redeploy
After setting the environment variables:
1. Go to your Vercel Dashboard.
2. Select your project.
3. Go to **Deployments**.
4. Click the three dots on the latest deployment and select **Redeploy**.

If you do not set `DATABASE_URL`, the application will partially work but features requiring storage (User Auth, History) will fail. The Quantum Analysis has been patched to work without DB (but won't cache results).
