# SoundCart

A responsive musical instrument storefront using HTML/CSS/vanilla JavaScript, Node.js + Express, and JSON-file storage.

## Features
- Product catalog, category filters and search
- Cart with quantity changes and saved cart in browser localStorage
- Register/login endpoints with bcrypt password hashing and JWT
- Checkout endpoint that validates the submitted customer and item data server-side
- INR pricing and responsive layout
- Local JSON files for products, users and orders

## Run locally
1. Install Node.js 20+ (Node 22 recommended).
2. Extract this folder and open it in VS Code.
3. Open a terminal in the project folder and run:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env` and set a long random `JWT_SECRET`.
5. Start the server:
   ```bash
   npm start
   ```
6. Visit http://localhost:3000

The first run uses `data/products.json`. User and order JSON files are created automatically. Do not commit `.env`, `data/users.json`, or `data/orders.json`.

## API routes
- `GET /api/health`
- `GET /api/products?q=guitar&category=Electric%20Guitars`
- `POST /api/auth/register` with `{ "name": "...", "email": "...", "password": "at-least-8-characters" }`
- `POST /api/auth/login` with `{ "email": "...", "password": "..." }`
- `POST /api/orders` with `{ "customer": { "name": "...", "email": "...", "phone": "...", "address": "..." }, "items": [{ "id": "g-ac-01", "quantity": 1 }] }`

## Deploy to Vercel
1. Push the project folder to a GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repository and deploy.
3. Set `JWT_SECRET` under **Project → Settings → Environment Variables** and redeploy.
4. Check `/api/health` on the deployed URL.

## Important storage limitation
JSON files are suitable for local learning and demonstrations, but **Vercel serverless functions do not provide durable writable project storage**. This sample uses `/tmp` on Vercel so endpoints can be demonstrated, but `/tmp` is temporary, may be cleared, and is not shared reliably between function instances. Product changes, users and orders can disappear after a cold start or run on different instances. Therefore this is not suitable for real customers or production orders as deployed. For durable online accounts and orders, replace `lib/store.js` with a persistent service (for example Vercel Blob/KV or a hosted database). That would require a service connection, contrary to the no-external-database requirement.

## Security / production notes
- Set a strong `JWT_SECRET`; the built-in fallback is for local development only.
- Add rate limiting, email verification, password reset, CSRF strategy if cookie auth is introduced, and admin authorization before production.
- Checkout is a demo flow: no payment gateway is connected and no money is collected.
- The login token is stored in localStorage for simplicity in this student project. Consider secure HttpOnly cookies for production.
- Product images load from Unsplash and need an internet connection.
