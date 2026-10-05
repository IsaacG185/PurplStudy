# PurplStudy — Setup Guide

## First-time setup (run once)

Open PowerShell in the purplstudy folder and run:

```
npm install
```

This downloads all the required packages (Express, Passport, SQLite, etc.)
into a `node_modules` folder. Takes about 30 seconds.

## Start the server

```
node server.js
```

You should see:
```
✦ PurplStudy running at http://localhost:3000
```

Open your browser and go to **http://localhost:3000**

## File structure

```
purplstudy/
├── server.js           ← The backend (handles auth + API)
├── package.json        ← Lists the npm packages needed
├── .env                ← Secret config (never share this)
├── .gitignore          ← Tells git to ignore secrets and node_modules
├── db/
│   ├── database.js     ← Sets up the SQLite database
│   └── purplstudy.sqlite  ← Created automatically on first run
└── public/
    ├── index.html      ← Home page
    ├── notecards.html  ← Flashcard tool
    ├── login.html      ← Login / register page
    └── purpl_Study_Logo.png
```

## To keep the server running after closing PowerShell

Install PM2 (a process manager):
```
npm install -g pm2
pm2 start server.js --name purplstudy
pm2 startup   ← makes it auto-start on Windows boot
```

## Accessing from another computer on your network

Find your server's local IP (run `ipconfig` in PowerShell, look for IPv4 Address).
Then on any other device on the same network, open:
```
http://YOUR_IP:3000
```
