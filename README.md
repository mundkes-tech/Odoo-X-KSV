# VendorBridge — Procurement ERP System

<div align="center">

![VendorBridge](https://img.shields.io/badge/VendorBridge-ERP-6366f1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0yMCA3SDRjLTEuMSAwLTIgLjktMiAydjEwYzAgMS4xLjkgMiAyIDJoMTZjMS4xIDAgMi0uOSAyLTJWOWMwLTEuMS0uOS0yLTItMnpNNCAxOVY5aDE2djEwSDR6TTIgNWgxNXYySDJ6Ii8+PC9zdmc+)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

**A full-stack procurement management platform with role-based access, approval workflows, vendor management, and real-time reporting.**

[Features](#-features) • [Architecture](#-architecture) • [Setup](#-setup) • [API Reference](#-api-reference) • [Database Schema](#-database-schema) • [Roles](#-roles--permissions)

</div>

---

## 📌 Overview

**VendorBridge** is a procurement ERP system inspired by Odoo's vendor management module. It streamlines the entire procurement lifecycle — from creating a Request for Quotation (RFQ), collecting vendor bids, comparing quotations, seeking management approval, generating purchase orders, and finally invoicing.

```
Procurement Officer → Creates RFQ → Assigns Vendors
        ↓
Vendors → Submit Quotations
        ↓
Procurement Officer → Compares Quotations → Selects Best → Requests Approval
        ↓
Manager → Approves / Rejects
        ↓
Procurement Officer → Generates Purchase Order → Generates Invoice
        ↓
Vendor → Accepts PO → Invoice Paid
```

---

## ✨ Features

| Module | Description | Roles |
|--------|-------------|-------|
| **Auth & User Management** | JWT auth, role-based registration, admin user control | All |
| **Vendor Management** | CRUD for vendors, profile management | Admin, Procurement |
| **RFQ Management** | Create/publish RFQs, assign vendors, track deadlines | Procurement, Manager |
| **Quotation Management** | Vendor bid submission, status tracking | Vendor, Procurement |
| **Quotation Comparison** | Side-by-side price/delivery comparison | Procurement |
| **Approval Workflow** | Manager approve/reject quotation selections | Manager, Procurement |
| **Purchase Orders** | Auto-generate POs from approved quotations | Procurement, Vendor |
| **Invoice Management** | Generate invoices from POs, PDF export | Procurement |
| **Notifications** | In-app notifications for key workflow events | All |
| **Reports & Analytics** | Vendor performance, spending trends, monthly reports | Admin, Manager |
| **Activity Logs** | Full audit trail of all system actions | Admin, Manager |
| **PDF Generation** | PDF export for POs and Invoices | Procurement |
| **Email Service** | SMTP email notifications on key events | System |

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                        │
│   React 19 + Vite + TailwindCSS 4 + React Router 7     │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│   │  Admin   │ │ Manager  │ │Procure.  │ │  Vendor  │  │
│   │Dashboard │ │Dashboard │ │Dashboard │ │ Dashboard│  │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP / REST
┌────────────────────────▼────────────────────────────────┐
│                     API LAYER                           │
│         Express.js 5  (Node.js)  — Port 5000           │
│   ┌──────────────┐  ┌───────────────┐                  │
│   │ authMiddleware│  │ roleMiddleware │                  │
│   │ (JWT verify) │  │ (RBAC guard)  │                  │
│   └──────────────┘  └───────────────┘                  │
│                                                         │
│   Auth  Vendor  RFQ  Quotation  Approval  PO  Invoice  │
│   Report  Notification  PDF  Email  Comparison         │
└────────────────────────┬────────────────────────────────┘
                         │ pg (node-postgres)
┌────────────────────────▼────────────────────────────────┐
│                   DATABASE LAYER                        │
│               PostgreSQL 16                             │
│   users  vendors  rfqs  rfq_vendors  quotations         │
│   approvals  purchase_orders  invoices                  │
│   activity_logs  notifications                          │
└─────────────────────────────────────────────────────────┘
```

### Frontend Component Tree

```
App.jsx
├── AuthContext (Global Auth State)
├── /login          → Login.jsx
├── /register       → Register.jsx
└── / (Protected)   → Dashboard.jsx
    ├── [ADMIN]
    │   ├── AdminHome.jsx
    │   ├── UserManagement.jsx
    │   ├── VendorManagement.jsx
    │   ├── ProcurementAnalytics.jsx
    │   ├── ReportsModule.jsx
    │   ├── NotificationCenter.jsx
    │   └── ActivityLogs.jsx
    ├── [MANAGER]
    │   ├── ManagerHome.jsx
    │   ├── ApprovalWorkflow.jsx
    │   ├── ProcurementMonitor.jsx
    │   ├── ManagerReports.jsx
    │   ├── ManagerNotifications.jsx
    │   └── ManagerActivityLogs.jsx
    ├── [PROCUREMENT_OFFICER]
    │   ├── ProcurementHome.jsx
    │   ├── RfqManagement.jsx
    │   ├── QuotationManagement.jsx
    │   ├── ApprovalRequest.jsx
    │   ├── PoManagement.jsx
    │   ├── InvoiceManagement.jsx
    │   └── ProcurementLogs.jsx
    └── [VENDOR]
        ├── VendorHome.jsx
        ├── VendorRfqList.jsx
        ├── VendorRfqTracking.jsx
        ├── VendorQuotations.jsx
        ├── VendorPurchaseOrders.jsx
        ├── VendorProfile.jsx
        ├── VendorNotifications.jsx
        └── VendorActivityLogs.jsx
```

---

## 📊 Procurement Lifecycle (DFD)

### Level 0 — Context Diagram

```
                    ┌─────────────────────────────┐
   Procurement ────▶│                             │────▶ Manager
   Officer          │      VendorBridge ERP       │
                    │                             │
   Vendor      ────▶│    Procurement Management   │────▶ Reports
                    │         System              │
   Admin       ────▶│                             │────▶ Notifications
                    └─────────────────────────────┘
```

### Level 1 — Process Flow

```
 ┌──────────────────────────────────────────────────────────────────────┐
 │  PROCESS 1           PROCESS 2           PROCESS 3                  │
 │  RFQ Management      Vendor Bidding      Comparison & Selection      │
 │                                                                      │
 │  Procurement ──▶ Create RFQ             Vendor ──▶ Submit Quote     │
 │  Officer         Publish RFQ   ──────▶  ─────────────────────────▶  │
 │                  Assign Vendors         Compare Quotes               │
 │                                         Select Best Vendor          │
 └────────────────────────────────────┬───────────────────────────────┘
                                      │
 ┌────────────────────────────────────▼───────────────────────────────┐
 │  PROCESS 4           PROCESS 5           PROCESS 6                 │
 │  Approval Workflow   Purchase Order      Invoice & Payment          │
 │                                                                     │
 │  Procurement ──▶ Request Approval       Generate PO                │
 │  Officer                                Send to Vendor             │
 │  Manager ──▶ Approve/Reject   ──────▶   Vendor Accept ──▶ Invoice  │
 │                                         Generate Invoice            │
 │                                         Mark Paid                  │
 └────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Entity-Relationship Overview

```
users ──────────────────────────┐
  │ id (PK)                     │ (created_by)
  │ full_name                   │
  │ email (UNIQUE)              ▼
  │ role (ADMIN|PROCUREMENT_   rfqs
  │   OFFICER|VENDOR|MANAGER)    │ id (PK)
  │ vendor_id (FK→vendors)      │ title, description
  │ is_active                   │ quantity, deadline
  │ password_hash               │ status: DRAFT|PUBLISHED|
  └──────────┐                  │   CLOSED|CANCELLED|
             │                  │   VENDOR_SELECTED|
             ▼                  │   APPROVED|REJECTED
          vendors               │ created_by (FK→users)
            │ id (PK)           │
            │ name, email       └──────────────┐
            │ phone, address                   │
            │ category, rating                 ▼
            │                           rfq_vendors
            │                            rfq_id (FK→rfqs)
            │                            vendor_id (FK→vendors)
            │
            └──────────────────────────────────┐
                                               │
quotations ◀───────────────────────────────────┘
  │ id (PK)
  │ rfq_id (FK→rfqs)
  │ vendor_id (FK→vendors)
  │ price, delivery_days, comments
  │ status: DRAFT|SUBMITTED|WITHDRAWN|
  │         SELECTED|REJECTED|APPROVED
  │
  ├──────────────────────────────────────▶ approvals
  │                                          id (PK)
  │                                          quotation_id (FK→quotations)
  │                                          manager_id (FK→users)
  │                                          status: PENDING|APPROVED|REJECTED
  │                                          remarks, approved_at
  │
  └──────────────────────────────────────▶ purchase_orders
                                             id (PK)
                                             po_number (UNIQUE)
                                             quotation_id (FK→quotations)
                                             vendor_id (FK→vendors)
                                             total_amount
                                             status: CREATED|SENT|
                                                     ACCEPTED|REJECTED|COMPLETED
                                             │
                                             └──────────▶ invoices
                                                            id (PK)
                                                            invoice_number (UNIQUE)
                                                            purchase_order_id (FK→POs)
                                                            subtotal, tax_amount, total_amount
                                                            status: GENERATED|SENT|PAID|CANCELLED
                                                            pdf_url

Cross-cutting:
  activity_logs  ← logs all entity actions (actor, action, entity_type, entity_id)
  notifications  ← per-user alerts for all workflow events
```

### Status State Machines

```
RFQ Status:
  DRAFT ──▶ PUBLISHED ──▶ CLOSED ──▶ VENDOR_SELECTED ──▶ APPROVED
     └──▶ CANCELLED            └──▶ REJECTED

Quotation Status:
  DRAFT ──▶ SUBMITTED ──▶ SELECTED ──▶ APPROVED
     └──▶ WITHDRAWN   └──▶ REJECTED

Approval Status:
  PENDING ──▶ APPROVED
          └──▶ REJECTED

Purchase Order Status:
  CREATED ──▶ SENT ──▶ ACCEPTED ──▶ COMPLETED
                   └──▶ REJECTED

Invoice Status:
  GENERATED ──▶ SENT ──▶ PAID
            └──▶ CANCELLED
```

---

## 👥 Roles & Permissions

| Endpoint / Feature | Admin | Manager | Procurement Officer | Vendor |
|---|:---:|:---:|:---:|:---:|
| Register / Login | ✅ | ✅ | ✅ | ✅ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Create/Edit Vendors | ✅ | ❌ | ✅ | ❌ |
| Delete Vendor | ✅ | ❌ | ❌ | ❌ |
| Create RFQ | ❌ | ❌ | ✅ | ❌ |
| View RFQs | ✅ | ✅ | ✅ | ✅* |
| Assign Vendors to RFQ | ❌ | ❌ | ✅ | ❌ |
| Submit Quotation | ❌ | ❌ | ❌ | ✅ |
| View Quotations | ✅ | ✅ | ✅ | ✅* |
| Request Approval | ❌ | ❌ | ✅ | ❌ |
| Approve / Reject | ❌ | ✅ | ❌ | ❌ |
| Create Purchase Order | ❌ | ❌ | ✅ | ❌ |
| View Purchase Orders | ✅ | ✅ | ✅ | ✅* |
| Update PO Status | ❌ | ✅ | ✅ | ✅* |
| Create Invoice | ❌ | ❌ | ✅ | ❌ |
| View Invoices | ✅ | ✅ | ✅ | ✅* |
| View Reports | ✅ | ✅ | ✅ | ❌ |
| View Activity Logs | ✅ | ✅ | ✅ | ❌ |
| View Notifications | ✅ | ✅ | ✅ | ✅ |

> `*` Vendors see only their own records.

---

## 🚀 Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| PostgreSQL | 14+ |
| npm | 9+ |

### 1. Clone & Install

```bash
git clone <repository-url>
cd Odoo-X-KSV

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../Frontend && npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:your-password@localhost:5432/vendorbridge_db
JWT_SECRET=replace-with-a-long-random-secret-string
DB_SSL=false
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

# SMTP Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@vendorbridge.com
EMAIL_FROM_NAME=VendorBridge
```

### 3. Create PostgreSQL Database

```sql
CREATE DATABASE vendorbridge_db;
```

### 4. Start the Backend

```bash
cd backend
npm run dev       # Development (nodemon)
# or
npm start         # Production
```

The backend auto-initializes all database tables on first start.

### 5. Seed Demo Data (Optional)

```bash
cd backend
npm run seed
```

### 6. Start the Frontend

```bash
cd Frontend
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Health Check | http://localhost:5000/health |

---

## 📡 API Reference

### Authentication — `/auth`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/auth/register` | ❌ | — | Register user |
| POST | `/auth/login` | ❌ | — | Login, receive JWT |
| GET | `/auth/profile` | ✅ | Any | Get current user |
| GET | `/auth/users` | ✅ | Admin | List all users |
| PUT | `/auth/users/:id` | ✅ | Admin | Update user |
| PUT | `/auth/users/:id/reset-password` | ✅ | Admin | Reset password |

### Vendors — `/vendors`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/vendors` | Admin, Procurement | Create vendor |
| GET | `/vendors` | Admin, Procurement | List vendors |
| GET | `/vendors/:id` | Admin, Procurement | Get vendor |
| PUT | `/vendors/:id` | Admin, Procurement | Update vendor |
| DELETE | `/vendors/:id` | Admin | Delete vendor |

### RFQs — `/rfqs`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/rfqs` | Procurement | Create RFQ |
| GET | `/rfqs` | Admin, Manager, Procurement | List RFQs |
| GET | `/rfqs/:id` | Admin, Manager, Procurement, Vendor | Get RFQ |
| PUT | `/rfqs/:id` | Procurement | Update RFQ |
| DELETE | `/rfqs/:id` | Admin | Delete RFQ |
| POST | `/rfqs/:id/assign-vendors` | Procurement | Assign vendors |
| GET | `/rfqs/:id/vendors` | Admin, Manager, Procurement | Get RFQ vendors |
| GET | `/vendors/:vendorId/rfqs` | All | Vendor's RFQs |

### Quotations — `/quotations`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/quotations` | Vendor | Submit quotation |
| GET | `/quotations` | All | List quotations |
| GET | `/quotations/:id` | All | Get quotation |
| PUT | `/quotations/:id` | Vendor | Update quotation |

### Approvals — `/approvals`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/approvals` | Procurement | Request approval |
| GET | `/approvals` | Admin, Manager, Procurement | List approvals |
| GET | `/approvals/:id` | Admin, Manager, Procurement | Get approval |
| PATCH | `/approvals/:id/approve` | Manager | Approve |
| PATCH | `/approvals/:id/reject` | Manager | Reject |

### Purchase Orders — `/purchase-orders`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/purchase-orders` | Procurement | Generate PO |
| GET | `/purchase-orders` | All | List POs |
| GET | `/purchase-orders/:id` | All | Get PO |
| PATCH | `/purchase-orders/:id/status` | Procurement, Manager, Vendor | Update status |

### Invoices — `/invoices`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/invoices` | Procurement | Generate invoice |
| GET | `/invoices` | All | List invoices |
| GET | `/invoices/:id` | All | Get invoice |
| PATCH | `/invoices/:id/status` | Admin, Manager, Procurement | Update status |

### Reports — `/reports`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/reports/dashboard` | Admin, Manager, Procurement | Dashboard stats |
| GET | `/reports/vendor-performance` | Admin, Manager, Procurement | Vendor metrics |
| GET | `/reports/spending` | Admin, Manager, Procurement | Spending analysis |
| GET | `/reports/monthly-trends` | Admin, Manager, Procurement | Monthly trends |
| GET | `/activity-logs` | Admin, Manager, Procurement | All logs |
| GET | `/activity-logs/:id` | Admin, Manager, Procurement | Single log |

### Misc

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health check |
| GET | `/notifications` | User notifications |
| PATCH | `/notifications/:id/read` | Mark read |
| GET | `/rfqs/:id/comparison` | Quotation comparison |
| POST | `/pdf/purchase-order/:id` | Generate PO PDF |
| POST | `/pdf/invoice/:id` | Generate invoice PDF |

---

## 📁 Project Structure

```
Odoo-X-KSV/
├── backend/                     # Node.js + Express API
│   ├── config/
│   │   └── db.js                # PostgreSQL connection pool
│   ├── controllers/             # Route handler functions
│   │   ├── authController.js
│   │   ├── vendorController.js
│   │   ├── rfqController.js
│   │   ├── quotationController.js
│   │   ├── approvalController.js
│   │   ├── purchaseOrderController.js
│   │   ├── invoiceController.js
│   │   ├── reportController.js
│   │   ├── notificationController.js
│   │   ├── comparisonController.js
│   │   ├── pdfController.js
│   │   └── emailController.js
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification
│   │   └── roleMiddleware.js    # RBAC guard
│   ├── models/                  # Database schema (CREATE TABLE)
│   │   ├── index.js             # Schema initializer
│   │   ├── usersModel.js
│   │   ├── vendorsModel.js
│   │   ├── rfqsModel.js
│   │   ├── rfqVendorsModel.js
│   │   ├── quotationsModel.js
│   │   ├── approvalsModel.js
│   │   ├── purchaseOrdersModel.js
│   │   ├── invoicesModel.js
│   │   ├── activityLogsModel.js
│   │   └── notificationsModel.js
│   ├── routes/                  # Express route definitions
│   ├── services/                # Business logic layer
│   │   ├── authService.js
│   │   ├── vendorService.js
│   │   ├── rfqService.js
│   │   ├── quotationService.js
│   │   ├── approvalService.js
│   │   ├── purchaseOrderService.js
│   │   ├── invoiceService.js
│   │   ├── reportService.js
│   │   ├── notificationService.js
│   │   ├── comparisonService.js
│   │   ├── pdfService.js
│   │   └── emailService.js
│   ├── utils/
│   │   ├── logger.js            # Structured logging
│   │   └── generateUUID.js
│   ├── scripts/
│   │   └── seed.js              # Demo data seeder
│   ├── uploads/                 # File upload storage
│   ├── .env.example
│   └── server.js                # App entry point
│
└── Frontend/                    # React 19 + Vite SPA
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx  # JWT auth state
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   └── Dashboard.jsx    # Role-based dashboard router
    │   ├── components/
    │   │   ├── ProtectedRoute.jsx
    │   │   ├── admin/           # 7 admin components
    │   │   ├── manager/         # 6 manager components
    │   │   ├── procurement/     # 7 procurement components
    │   │   └── vendor/          # 8 vendor components
    │   └── main.jsx
    ├── index.html
    └── vite.config.js
```

---

## 🔐 Security

- **JWT Authentication** — All protected routes require `Authorization: Bearer <token>`
- **Role-Based Access Control** — `authorizeRoles()` middleware enforces per-endpoint permissions
- **Password Hashing** — bcrypt with salt rounds
- **Account Status** — Inactive accounts are rejected even with valid tokens
- **DB Extension** — `pgcrypto` used for UUID generation
- **Input Validation** — DB-level CHECK constraints on all status fields
- **Auto-updated Timestamps** — PostgreSQL triggers keep `updated_at` in sync

---

## 🛠️ Tech Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.2.1 | HTTP framework |
| pg | ^8.21.0 | PostgreSQL client |
| jsonwebtoken | ^9.0.3 | JWT auth |
| bcrypt | ^6.0.0 | Password hashing |
| nodemailer | ^8.0.10 | Email sending |
| pdfkit | ^0.18.0 | PDF generation |
| multer | ^2.1.1 | File uploads |
| uuid | ^14.0.0 | UUID generation |
| dotenv | ^17.4.2 | Environment config |
| nodemon | ^3.1.14 | Dev auto-reload |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.6 | UI framework |
| react-router-dom | ^7.17.0 | Client-side routing |
| tailwindcss | ^4.3.0 | Utility CSS |
| lucide-react | ^1.17.0 | Icon library |
| vite | ^8.0.12 | Build tool |

---

## 📋 Scripts

### Backend
```bash
npm run dev       # Start with nodemon (hot reload)
npm start         # Production start
npm run seed      # Seed demo data
```

### Frontend
```bash
npm run dev       # Vite dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # ESLint check
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m 'feat: add your feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

ISC License — see `backend/package.json` for details.

---

<div align="center">
  <strong>VendorBridge</strong> — Built with ❤️ as a full-stack procurement ERP solution
</div>