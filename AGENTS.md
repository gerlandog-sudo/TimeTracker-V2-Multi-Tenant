# Deployment Instructions & Credentials

## Production Environment (cPanel)
- **URL:** https://timetracker.pmaasglobal.com
- **Root Directory:** `/public_html/TimeTracker/`
- **Platform:** PHP/MySQL

## Database Credentials
- **Host:** `localhost`
- **Database Name:** `admglobal_timesheet`
- **Database User:** `admglobal_admin`
- **Password:** `PMaaS_2026`
- **Encoding:** `utf8mb4_general_ci`

## Deployment Workflow
1. Build the frontend: `npm run build`.
2. Copy contents of `dist/` to the root of the hosting.
3. Copy the `api/` folder to the root.
4. Ensure `api/config.php` has the credentials listed above.
5. Upload `.htaccess` to handle routing.
6. Run `update.php?key=SECRET` if database changes are needed.

## File Preparation
The folder `/ready_for_deploy` is used to collect all files for manual download. Always update `ready_for_deploy/api/config.php` before finalizing a turn that involves deployment.
