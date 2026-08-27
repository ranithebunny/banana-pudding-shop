# 🍌 Banana Pudding Shop

A full-stack e-commerce platform for managing and selling banana pudding products with role-based access control for customers, staff, and owners.

**Live Demo:** [https://banana-pudding-shop.vercel.app](https://banana-pudding-shop.vercel.app)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Setup](#-environment-setup)
- [Running the Application](#-running-the-application)
- [API Endpoints](#-api-endpoints)
- [User Roles](#-user-roles)
- [Database Schema](#-database-schema)
- [Contributing](#-contributing)

---

## ✨ Features

### Customer Features
- Browse products by category
- Add/remove items from cart
- Checkout and place orders
- Upload payment proof
- Track order status
- View order history

### Staff Features
- View and manage orders
- Process payment uploads
- Manage inventory levels
- Dashboard with analytics

### Owner Features
- Full admin access
- Track business expenses
- View detailed audit logs
- View dashboard reports
- Monitor all system activities

### System Features
- Secure user authentication (JWT + bcrypt)
- Automatic order expiration (scheduled tasks)
- CORS-enabled API
- Comprehensive audit logging
- Role-based access control

---

## 🛠️ Tech Stack

### Frontend
- **React** 19.2.8 - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **React Router** 7.18.2 - Client-side routing
- **Tailwind CSS** 4.3.3 - Styling

### Backend
- **Node.js** - Runtime
- **Express** 5.2.1 - Web framework
- **TypeScript** - Type safety
- **Prisma** 7.9.1 - ORM
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **node-cron** - Scheduled tasks

### Deployment
- **Vercel** - Frontend hosting
- **PostgreSQL** (Supabase) - Database

---

## 📁 Project Structure

```
banana-pudding-shop/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── pages/             # Page components
│   │   ├── context/           # React Context (Auth, Cart)
│   │   ├── App.tsx            # Main app component
│   │   └── main.tsx           # Entry point
│   ├── package.json
│   └── vite.config.ts
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── lib/               # Utilities (auth, db)
│   │   ├── prisma/            # Prisma schema & migrations
│   │   └── index.ts           # Server entry point
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## 📦 Prerequisites

Before you begin, make sure you have:

- **Node.js** v18+ and npm/yarn
- **PostgreSQL** database (local or cloud like Supabase)
- **Git** for version control

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ranithebunny/banana-pudding-shop.git
cd banana-pudding-shop
```

### 2. Install Dependencies

#### Install Root Dependencies
```bash
npm install
```

#### Install Client Dependencies
```bash
cd client
npm install
cd ..
```

#### Install Server Dependencies
```bash
cd server
npm install
cd ..
```

---

## 🔧 Environment Setup

### Backend Environment (.env)

Create a `.env` file in the `server/` directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/banana_pudding_shop"

# Server
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET="your_secret_key_here"

# Supabase (if using cloud storage)
SUPABASE_URL="your_supabase_url"
SUPABASE_KEY="your_supabase_key"
```

### Frontend Environment

If needed, create a `.env` file in the `client/` directory:

```bash
VITE_API_URL="http://localhost:4000"
```

### Database Setup

```bash
cd server

# Generate Prisma client
npm run build

# Run database migrations (update with your migration)
npx prisma migrate deploy

# (Optional) Seed database with sample data
npx prisma db seed
```

---

## ▶️ Running the Application

### Development Mode

#### Terminal 1: Start Backend
```bash
cd server
npm run dev
```
Backend runs on `http://localhost:4000`

#### Terminal 2: Start Frontend
```bash
cd client
npm run dev
```
Frontend runs on `http://localhost:5173`

### Production Build

#### Build Frontend
```bash
cd client
npm run build
```

#### Build & Start Backend
```bash
cd server
npm run build
npm start
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (staff/owner)
- `PUT /api/products/:id` - Update product (staff/owner)
- `DELETE /api/products/:id` - Delete product (owner)

### Orders
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id` - Update order status (staff/owner)
- `DELETE /api/orders/:id` - Cancel order

### Payments
- `POST /api/payments/upload` - Upload payment proof
- `GET /api/payments` - Get payment records (staff/owner)

### Inventory
- `GET /api/inventory` - Get inventory levels
- `PUT /api/inventory/:id` - Update stock (staff/owner)

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category (owner)

### Expenses
- `GET /api/expenses` - Get expenses (owner)
- `POST /api/expenses` - Create expense (owner)

### Audit Logs
- `GET /api/audit-logs` - Get audit logs (owner)

### Reports
- `GET /api/reports/dashboard` - Dashboard data (staff/owner)
- `GET /api/reports/sales` - Sales reports (owner)

---

## 👥 User Roles

### Customer
- Browse and purchase products
- Manage their shopping cart
- Upload payment proofs
- View their own orders
- No access to staff/owner features

### Staff
- View all orders
- Process customer payments
- Manage product inventory
- View dashboard and reports
- Cannot access owner-only features

### Owner
- Full administrative access
- Manage all products and categories
- Track business expenses
- View comprehensive audit logs
- Access analytics dashboard
- Highest permission level

---

## 💾 Database Schema (Prisma)

Key entities:
- **User** - Accounts with role-based access
- **Product** - Available items for sale
- **Category** - Product categories
- **Order** - Customer orders with status tracking
- **OrderItem** - Individual items in orders
- **Payment** - Payment records and proof uploads
- **Inventory** - Stock levels
- **Expense** - Business expenses
- **AuditLog** - System activity tracking

---

## 📅 Scheduled Tasks

### Auto-Cancel Expired Orders
- Runs every hour at the top of the hour
- Automatically cancels orders that have expired
- Prevents pending payments from stalling

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 🎯 Future Enhancements

- [ ] Email notifications for orders
- [ ] Advanced inventory analytics
- [ ] Multi-payment gateway support
- [ ] Customer reviews and ratings
- [ ] Promotional codes and discounts for customers

---

**Happy Pudding Shopping! 🍌**
