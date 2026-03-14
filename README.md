# Bennett University
**What the website does:**
1) it calculates yoyr gym PR and ranks you accordingly 
2) it gives you a proper time slot to reduce the chaios
3) it gives you the choice to share your thoughts which everyone can see


A full-stack site with user authentication, database storage, and forgot-password email flow.

## Quick start

1. **Install dependencies** (already done if you ran `npm install`):
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. Open **http://localhost:3000** in your browser.

## Features

- **Signup** – Saves email and hashed password in SQLite database
- **Login** – Verifies credentials against the database
- **Forgot password** – Sends reset link via email (requires email config)
- **Reset password** – Updates password using the token from the email link

## Email setup (for forgot password)

To send real emails, create a `.env` file from the template:

```bash
copy .env.example .env
```

Then edit `.env` and add your email settings.

### Gmail

1. Enable 2-factor authentication on your Google account
2. Create an [App Password](https://myaccount.google.com/apppasswords)
3. In `.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   ```

### Other providers

Use your provider’s SMTP host, port, username, and password in `.env`.

## Database

User data is stored in `users.db` (SQLite) in the project folder. Passwords are hashed with bcrypt.
