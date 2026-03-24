# Bennett University / CampusFit

**Live site:** *(after deployment, add your link here, e.g. https://your-app.onrender.com)*

---

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

---

## Put the project on GitHub

### 1. What to keep in the repo (what gets committed)

- **Keep:** All source code (`.html`, `.css`, `.js`, `server.js`, `seed_leaderboard.js`), `package.json`, `package-lock.json`, `README.md`, `.env.example` (if you have one).
- **Do not commit:** `node_modules/`, `.env`, `users.db` (and other `.db` files). These are in `.gitignore` so Git will skip them.

### 2. Push to GitHub

In a terminal, from your project folder (`e:\new cursor project` or `new cursor project`):

```bash
git init
git add .
git status
git commit -m "Initial commit: CampusFit gym app with auth, leaderboard, feedback"
```

Then on GitHub:

1. Go to [github.com](https://github.com) → **New repository**.
2. Name it (e.g. `campusfit` or `bennett-gym`). Do **not** add a README or .gitignore (you already have them).
3. Copy the “push an existing repository” commands and run them:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and repo name.

---

## Make the website live and add the link

This app has a **Node.js backend** (Express + SQLite). **GitHub Pages only hosts static files**, so it cannot run your server. To have a real live site (login, signup, leaderboard, feedback working), you need to deploy the full app to a host that runs Node.

### Option A: Deploy on Render (recommended, free tier)

1. Push your code to GitHub (steps above).
2. Go to [render.com](https://render.com) and sign up (free).
3. **New** → **Web Service**.
4. Connect your GitHub repo.
5. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Plan:** Free.
6. Under **Environment**, add:
   - `NODE_ENV` = `production`
   - If you use env vars (e.g. JWT, SMTP), add them in the Render dashboard (do not put secrets in the repo).
7. Deploy. Render will give you a URL like `https://your-app-name.onrender.com`.

**Paste the live link:**

- In your **README.md** at the top, add:
  - `## Live site: https://your-app-name.onrender.com`
- You can also add the same link on your website (e.g. in the footer or “About” section) so visitors can open the live app.

**Note:** On the free tier the server may sleep after inactivity; the first open might be slow.

### Option B: Only static pages on GitHub Pages

If you only want to show the **design** (no working login/API):

1. Push the repo to GitHub as above.
2. **Settings** → **Pages** → Source: **Deploy from a branch** → branch `main` → folder **/ (root)** → Save.
3. Your site will be at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`.

Login, signup, leaderboard API, and feedback will **not** work there, because there is no Node server. Use this only for a static demo; for full functionality use Render (or similar).
