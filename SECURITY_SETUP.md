
# Security & Database Setup
This project uses a professional SQL schema with Role-Based Access Control (RBAC) and Row Level Security (RLS).

## 1. Apply the Database Schema
The complete SQL schema is located at:
`src/db/schema.sql`

To set up your database:
1.  Open your Supabase Project.
2.  Go to the **SQL Editor**.
3.  Copy the contents of `src/db/schema.sql`.
4.  Paste and run the script.

## 2. What this protects
-   **Profiles**: Publicly readable, but only writable by the owner.
-   **Search History**: Strictly private. Only the user can see their own history.
-   **Audit Logs**: Tracks account creation and sensitive actions.
-   **Roles**: 'admin', 'pro', 'user' roles are enforced at the database level.

## 3. Environment Variables
Ensure your `.env` file has:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
