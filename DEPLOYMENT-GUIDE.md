# Google Indexing Checker - Complete Beginner Deployment Guide

## Project Overview

This is a **Google Indexing Checker** tool built with **Next.js**. It lets you paste multiple URLs and checks if Google has indexed them using the `site:URL` search operator.

**Tech Stack:**
- Next.js 14 (React framework)
- Cheerio (HTML parser)
- Vercel (hosting platform)

---

## Project Folder Structure

```
google-indexing-checker/
├── package.json              ← Project config & dependencies
├── next.config.js            ← Next.js settings
├── .gitignore                ← Files Git should ignore
├── app/
│   ├── layout.js             ← HTML wrapper for every page
│   ├── page.js               ← Main page (the tool UI)
│   ├── globals.css           ← All the styling
│   └── api/
│       └── check-index/
│           └── route.js      ← Server-side API that checks Google
└── public/
    └── (favicon goes here)
```

---

## Step-by-Step Deployment Guide

### STEP 1: Install Node.js

Node.js is the engine that runs JavaScript on your computer.

1. Go to: https://nodejs.org
2. Download the **LTS** version (the one that says "Recommended")
3. Run the installer → Click **Next** through all steps → Click **Install**
4. To verify it installed correctly, open **Command Prompt** (Windows) or **Terminal** (Mac):
   ```
   node --version
   npm --version
   ```
   You should see version numbers like `v20.x.x` and `10.x.x`

---

### STEP 2: Install Git

Git is a tool for tracking code changes and uploading to GitHub.

1. Go to: https://git-scm.com/downloads
2. Download and install for your operating system
3. During installation on Windows, keep all default settings
4. Verify installation:
   ```
   git --version
   ```

---

### STEP 3: Set Up the Project on Your Computer

1. **Create a folder** on your computer where you want the project. For example:
   - Windows: `C:\Projects\`
   - Mac: `~/Projects/`

2. **Copy the project folder** `google-indexing-checker` (provided with this guide) into your Projects folder.

3. **Open Command Prompt / Terminal** and navigate to the project:
   ```
   cd C:\Projects\google-indexing-checker
   ```
   (On Mac: `cd ~/Projects/google-indexing-checker`)

4. **Install dependencies** (this downloads all required libraries):
   ```
   npm install
   ```
   Wait for it to finish. You'll see a `node_modules` folder appear.

5. **Test locally** (optional but recommended):
   ```
   npm run dev
   ```
   Open your browser and go to: `http://localhost:3000`
   You should see the tool! Press `Ctrl+C` to stop the local server.

---

### STEP 4: Create a GitHub Account & Repository

GitHub is where your code will live online so Vercel can access it.

1. Go to: https://github.com
2. Click **Sign Up** and create a free account (if you don't have one)
3. After signing in, click the **+** icon (top right) → **New repository**
4. Fill in:
   - Repository name: `google-indexing-checker`
   - Description: `Bulk Google Index Checker Tool`
   - Select **Public** (Vercel free tier works with public repos)
   - Do NOT check "Add a README file" (we already have code)
5. Click **Create repository**
6. You'll see a page with instructions. Keep this page open.

---

### STEP 5: Upload Code to GitHub

In your Command Prompt / Terminal (make sure you're in the project folder):

```bash
# Initialize Git in your project
git init

# Add all files
git add .

# Create your first commit
git commit -m "Initial commit: Google Indexing Checker tool"

# Connect to your GitHub repository (replace YOUR-USERNAME)
git remote add origin https://github.com/YOUR-USERNAME/google-indexing-checker.git

# Upload the code
git branch -M main
git push -u origin main
```

**If asked for credentials:** GitHub will ask you to sign in. Follow the prompts.

**Troubleshooting:** If `git push` fails, you may need to set up a Personal Access Token:
1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Generate New Token → Select `repo` scope → Generate
3. Copy the token and use it as your password when Git asks

---

### STEP 6: Deploy on Vercel

Vercel is the hosting platform. It's free for personal projects.

1. Go to: https://vercel.com
2. Click **Sign Up** → Choose **Continue with GitHub**
3. Authorize Vercel to access your GitHub account
4. Click **Add New...** → **Project**
5. Find `google-indexing-checker` in the list → Click **Import**
6. On the configuration page:
   - **Framework Preset**: Should auto-detect `Next.js` (if not, select it)
   - **Root Directory**: Leave as `.` (dot)
   - **Build Command**: Leave as default (`next build`)
   - **Output Directory**: Leave as default
7. Click **Deploy**
8. Wait 1-2 minutes for the build to complete
9. You'll see a success screen with a URL like: `https://google-indexing-checker-xxxx.vercel.app`

**That's your live tool!** Share this URL with anyone.

---

## Important Notes

### About Google Rate Limiting

Google may temporarily block requests if too many are sent too quickly. The tool includes:
- Batch processing (5 URLs at a time)
- 2-second delays between batches
- 1-2 second delays between individual checks
- Server-side rate limiting (10 requests per minute per user)

If you see "Error" or "CAPTCHA detected" results, wait a few minutes and try again with fewer URLs.

### Updating Your Tool

After making changes to the code:
```bash
git add .
git commit -m "Description of what you changed"
git push
```
Vercel will automatically redeploy within 1-2 minutes.

### Custom Domain (Optional)

1. In Vercel dashboard, go to your project → **Settings** → **Domains**
2. Add your custom domain and follow the DNS instructions

---

## No Environment Variables Needed

This project does not require any environment variables. It works out of the box.
