# Umesha D G – DevOps Portfolio

Plain HTML/CSS/JS (no build step). Font Awesome, Devicon and Google Fonts load from CDNs, so you need internet when viewing.

```
index.html          page structure
css/style.css       all styling
js/config.js        EDIT: email, LinkedIn, GitHub, project URLs, Apps Script URL
js/main.js          navigation, animations, resume, form validation + submit
apps-script/Code.gs Google Apps Script for the contact form
assets/profile.jpg  ADD: your photo (a placeholder shows until you do)
assets/resume.pdf   REPLACE: placeholder PDF
```

## 1. Run locally
```
cd portfolio
python3 -m http.server 8000      # then open http://localhost:8000
```
(Double-clicking index.html also works, but the contact form needs http(s).)

## 2. Personalise
1. Your photo is already at `assets/profile.jpg`.
2. Your resume is already at `assets/resume.pdf`. To update it, replace the file (keep the name).
3. `js/config.js` already has your GitHub and project repo URLs (from your resume). Check them, and add the repo for “AWS and Docker Deployment”.
4. Preview the resume upload tool by opening `index.html?admin`. It only changes your own browser's preview; visitors see `assets/resume.pdf`.

## 3. Google Sheet + Apps Script (contact form)
1. Create a new Google Sheet (e.g. "Portfolio Contact Messages"). Keep it **private**; do not share it.
2. In the sheet: **Extensions → Apps Script**. This creates a script *bound to that sheet*.
3. Delete the sample code, paste the contents of `apps-script/Code.gs`, click Save.
4. In the function dropdown choose **setup** → **Run**. Google asks you to authorize:
   choose your account → *Advanced* → *Go to project (unsafe)* (normal for your own unverified script) → *Allow*.
   Because of `@OnlyCurrentDoc`, the permission requested is limited to **this spreadsheet only**.
   Running `setup` creates the `Messages` tab with headers: Timestamp, Name, Email, Subject, Message.
5. **Deploy → New deployment → ⚙ Select type → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (required so visitors can post without logging in)
   - Deploy, then copy the **Web app URL** (ends in `/exec`).
6. Paste it into `js/config.js` as `appsScriptUrl`.
7. After any later change to Code.gs: **Deploy → Manage deployments → Edit → New version → Deploy** (the URL stays the same).

### Why this is safe
- No passwords, API keys or tokens exist in the frontend. The `/exec` URL is the only thing public, and it can only *append rows* (the code has no read/edit/delete path; GET returns a status line only).
- The sheet itself stays private to you. "Anyone" applies to the web-app endpoint, not the spreadsheet.
- Server-side validation, length limits, a lock to avoid race conditions, formula-injection protection, plus a honeypot field and 30-second client cooldown against bots.
- Limit: anyone who finds the URL could post junk rows (true of any public form). Check the sheet occasionally; if abused, create a new deployment and update `appsScriptUrl`.

### Test it
1. In the Apps Script editor run **testAppend** → a test row should appear in the sheet.
2. Serve the site (step 1), submit the form with valid data → green success message, new row with timestamp.
3. Try invalid data (empty fields, bad email) → inline errors, no row.
4. Temporarily set a wrong `appsScriptUrl` → red error message.
Delete the test rows afterwards.

## 4. Deploy (free options)
GitHub Pages (repo → Settings → Pages), Netlify or Vercel: upload the folder as-is.
