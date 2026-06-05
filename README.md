# Nepton IT Support System

Internal IT ticketing system with 3 portals: Employee, Tech Support, Admin.

## Tech Stack
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas
- **Frontend:** Vanilla HTML/CSS/JS (single file)

## Deploy to Railway (via GitHub)

### Step 1: Change your MongoDB password
Go to MongoDB Atlas → Database Access → Edit user → Change password.

### Step 2: Push to GitHub
1. Create a new GitHub repo (e.g. `nepton-it-support`)
2. Push all these files to it:
```bash
git init
git add .
git commit -m "Nepton IT Support"
git remote add origin https://github.com/YOUR_USER/nepton-it-support.git
git push -u origin main
```

### Step 3: Deploy on Railway
1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **New Project → Deploy from GitHub Repo**
3. Select your `nepton-it-support` repo
4. Go to **Variables** tab and add:
   - `MONGODB_URI` = `mongodb+srv://YOUR_USER:YOUR_NEW_PASSWORD@cluster0.7lbs9q0.mongodb.net/nepton_it?retryWrites=true&w=majority`
   - `PORT` = `3000`
5. Railway will auto-deploy. Click **Generate Domain** to get your URL.

### Step 4: Share the link
Share the Railway URL with your team. That's it!

## Login Credentials

| Portal | Username | Password |
|--------|----------|----------|
| Employee | No login needed | — |
| Tech Support | micheal | Mich@nepton2030 |
| Admin | Admin | hr@netn#2030 |

Passwords can be reset via the "Forgot password?" link.

## Project Structure
```
nepton-it-support/
├── server.js           # Express server + MongoDB connection
├── package.json        # Dependencies
├── .env.example        # Environment variables template
├── .gitignore          # Ignore node_modules and .env
├── models/
│   ├── Ticket.js       # Ticket schema
│   └── User.js         # User schema with bcrypt
├── routes/
│   ├── tickets.js      # CRUD API for tickets
│   └── auth.js         # Login + password reset
└── public/
    └── index.html      # Complete frontend (all 3 portals)
```
