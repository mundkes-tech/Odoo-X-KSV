# 🌉 VendorBridge ERP — Enterprise Procurement Orchestrator

> **A full-stack, role-aware procurement automation platform** that orchestrates the entire vendor-to-payment lifecycle — from RFQ publishing and bid comparison to multi-stage approvals, PDF generation, GST invoicing, and real-time audit trails.

---

## 📑 Table of Contents

1. [Platform Overview](#-platform-overview)
2. [Technology Stack](#-technology-stack)
3. [System Architecture](#-system-architecture)
4. [Procurement Lifecycle — Swimlane Diagram](#-procurement-lifecycle--unified-swimlane)
5. [Quotation State Machine](#-quotation-to-po-state-machine)
6. [GST Invoice Calculation Flow](#-gst-tax-invoice-verification-flow)
7. [Role-Based Workspaces](#-role-based-workspaces)
   - [Administrator Dashboard](#-administrator-dashboard)
   - [Procurement Officer Workspace](#-procurement-officer-workspace)
   - [Manager Approval Center](#-manager-approval-center)
   - [Vendor Portal](#-vendor-portal)
8. [Database Schema](#-database-schema--relational-model)
9. [API Endpoints Directory](#-api-endpoints-directory)
10. [Security & Data Isolation](#-security--data-isolation)
11. [GST Financial Logic](#-gst-financial-calculation-logic)
12. [Setup & Installation](#-setup--installation-guide)
13. [Environment Variables Reference](#-environment-variables-reference)
14. [Notification & Audit System](#-notification--audit-trail-system)

---

## 🧭 Platform Overview

VendorBridge is an **Odoo-style ERP platform** built to digitize and automate the **Procure-to-Pay (P2P) cycle** for enterprise organizations. It replaces manual, email-driven procurement with a structured, auditable, multi-role digital workflow.

### Core Capabilities at a Glance

| Capability | Description |
|---|---|
| 🏢 **Multi-Role Workspaces** | Dedicated UIs for Admins, Procurement Officers, Managers, and Vendors |
| 🔐 **JWT Authentication** | Stateless, cryptographically signed sessions with role-based access |
| 📋 **RFQ Management** | Create, publish, and manage Requests for Quotation with deadlines |
| 📊 **Bid Comparison Matrix** | Side-by-side vendor quotation evaluation with price and delivery metrics |
| ✅ **Multi-Stage Approvals** | Manager-gated approval flow before any purchase order is generated |
| 📄 **Automated PDF Generation** | PDFKit-generated Purchase Orders and Tax Invoices |
| 📧 **SMTP Email Dispatch** | Nodemailer-powered email notifications with PDF attachments |
| 🧾 **GST Tax Invoicing** | Full CGST (9%) + SGST (9%) = 18% GST computation and audit trail |
| 🔒 **Tenant Data Isolation** | Vendor-scoped query filters prevent cross-tenant data leaks |
| 📈 **System Reports** | 5 report templates with date-range filters and CSV export |

---

## 🛠️ Technology Stack

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  React 18 (SPA)  ◄──►  Vite 6 (HMR Bundler)  ◄──►  Lucide React   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP/REST
┌───────────────────────────────▼─────────────────────────────────────┐
│                        SERVER LAYER                                  │
│  Node.js + Express  ◄──►  JWT Auth  ◄──►  Bcrypt Password Hashing   │
│  PDFKit (PDF Gen)   ◄──►  Nodemailer (SMTP Email)                   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ pg Client / Connection Pool
┌───────────────────────────────▼─────────────────────────────────────┐
│                       DATABASE LAYER                                 │
│              PostgreSQL — Relational Transactional Ledger            │
│         UUID Primary Keys  ◄──►  Parameterized SQL Queries          │
└─────────────────────────────────────────────────────────────────────┘
```

| Layer | Technology | Role |
|---|---|---|
| **Core Client** | React 18 | Declarative SPA framework |
| **Client Bundler** | Vite 6 | Hot-module replacement & optimized builds |
| **Icons** | Lucide React | Modern vector iconography |
| **Core Server** | Node.js & Express | Async runtime & RESTful routing |
| **Database** | PostgreSQL | Relational transactional ledger |
| **DB Driver** | `pg` client | Connection pooling & parameterized SQL |
| **Auth Tokens** | JSON Web Tokens | Stateless cryptographic session management |
| **Encryption** | Bcrypt | Password hashing with salt rounds |
| **PDF Generation** | PDFKit | Vector PDF generation for POs & Invoices |
| **Mail Dispatch** | Nodemailer | Automated SMTP mailing with attachments |

---

## 🏗️ System Architecture

```
                          ┌──────────────────────────────────────┐
                          │           VITE DEV SERVER            │
                          │     React SPA  (localhost:5173)      │
                          └──────────────┬───────────────────────┘
                                         │
                          ┌──────────────▼───────────────────────┐
                          │         ROLE-BASED ROUTING           │
                          │  /admin  /officer  /manager  /vendor │
                          └──────────────┬───────────────────────┘
                                         │ Axios (Bearer JWT)
                          ┌──────────────▼───────────────────────┐
                          │    EXPRESS REST API  (Port 5000)     │
                          │                                       │
                          │  ┌─────────────┐  ┌───────────────┐  │
                          │  │  Auth MW    │  │  Role Guard   │  │
                          │  │  verifyJWT  │  │ authorizeRole │  │
                          │  └──────┬──────┘  └───────┬───────┘  │
                          │         └────────┬─────────┘          │
                          │  ┌──────────────▼──────────────────┐  │
                          │  │       Route Handlers            │  │
                          │  │  /auth  /rfqs  /quotations      │  │
                          │  │  /approvals  /purchase-orders   │  │
                          │  │  /invoices   /notifications     │  │
                          │  └──────────────┬──────────────────┘  │
                          │                 │                      │
                          │  ┌──────────────▼──────────────────┐  │
                          │  │       Service Layer             │  │
                          │  │  reportService  pdfService      │  │
                          │  │  emailService   auditService    │  │
                          │  └──────────────┬──────────────────┘  │
                          └─────────────────┼────────────────────-┘
                                            │ pg Pool
                          ┌─────────────────▼───────────────────┐
                          │           POSTGRESQL DB              │
                          │  users  vendors  rfqs  quotations    │
                          │  approvals  purchase_orders          │
                          │  invoices  notifications             │
                          │  activity_logs                       │
                          └──────────────────────────────────────┘
```

---

## 🔄 Procurement Lifecycle — Unified Swimlane

This diagram traces every action and data flow across all four roles from vendor onboarding to final payment authorization.

```
┌────────────┬────────────────────┬────────────────────┬────────────────────┬──────────────┐
│   ADMIN    │  PROCUREMENT OFF.  │      VENDOR        │     MANAGER        │  POSTGRESQL  │
├────────────┼────────────────────┼────────────────────┼────────────────────┼──────────────┤
│            │                    │                    │                    │              │
│ 1. Register│                    │                    │                    │              │
│  Vendor    │                    │                    │                    │              │
│  Profile   ├───────────────────────────────────────────────────────────► │ INSERT       │
│            │                    │                    │                    │ vendors      │
│            │                    │                    │                    │              │
│            │ 2. Create & Publish│                    │                    │              │
│            │    RFQ Tender      ├───────────────────────────────────────► │ INSERT rfqs  │
│            │                    │                    │                    │ status=      │
│            │                    │                    │                    │ PUBLISHED    │
│            │                    │                    │                    │              │
│            │                    │ ◄─────── 3. Notify of RFQ Invitation ──┤ INSERT       │
│            │                    │                    │                    │ notification │
│            │                    │                    │                    │              │
│            │                    │ 4. Submit Bid      │                    │              │
│            │                    │    (price, days,   ├───────────────────►│ INSERT       │
│            │                    │     remarks)       │                    │ quotations   │
│            │                    │                    │                    │ status=      │
│            │                    │                    │                    │ SUBMITTED    │
│            │                    │                    │                    │              │
│            │ 5. Compare         │                    │                    │              │
│            │    Quotations      │◄───────────────────────────────────────┤ SELECT       │
│            │    Side-by-Side    │                    │                    │ quotations   │
│            │                    │                    │                    │              │
│            │ 6. Select Best Bid │                    │                    │              │
│            │    + Init Approval ├───────────────────────────────────────►│ UPDATE       │
│            │                    │                    │                    │ quotations   │
│            │                    │                    │                    │ status=      │
│            │                    │                    │                    │ SELECTED     │
│            │                    │                    │                    │ INSERT       │
│            │                    │                    │                    │ approvals    │
│            │                    │                    │                    │              │
│            │                    │                    │ ◄── 7. Notify ─────┤ INSERT       │
│            │                    │                    │    Pending         │ notification │
│            │                    │                    │    Approval        │              │
│            │                    │                    │                    │              │
│            │                    │                    │ 8. Review &        │              │
│            │                    │                    │    Approve/Reject  │              │
│            │                    │                    ├───────────────────►│ UPDATE       │
│            │                    │                    │                    │ approvals    │
├────────────┴────────────────────┴────────────────────┴────────────────────┼──────────────┤
│                         IF APPROVED PATH                                  │              │
│                                                                           │              │
│            │ 9. Auto-Generate   │                    │                    │ INSERT       │
│            │    Purchase Order  │                    │                    │ purchase_    │
│            │                    │                    │                    │ orders       │
│            │                    │                    │                    │              │
│            │                    │ ◄──────────── 10. Email PO PDF ─────────┤ SMTP Send    │
│            │                    │                    │                    │              │
│            │                    │ 11. Fulfill Order  │                    │              │
│            │                    │     Accept PO      ├───────────────────►│ UPDATE       │
│            │                    │                    │                    │ purchase_    │
│            │                    │                    │                    │ orders       │
│            │                    │                    │                    │ status=      │
│            │                    │                    │                    │ ACCEPTED     │
│            │                    │                    │                    │              │
│            │ 12. Review Invoice │                    │                    │              │
│            │     Compute GST    │                    │                    │              │
│            │     Authorize Pymt │                    │                    │ INSERT       │
│            │                    │                    │                    │ invoices     │
│            │                    │                    │                    │ Log audit    │
└────────────┴────────────────────┴────────────────────┴────────────────────┴──────────────┘
```

---

## 🔁 Quotation-to-PO State Machine

All status transitions are enforced server-side. No status can be skipped.

```
                    ┌─────────────────────────────────────────────────────────────┐
                    │                       RFQ LIFECYCLE                         │
                    └─────────────────────────────────────────────────────────────┘

                        ┌──────────┐
           RFQ Created  │          │
          ─────────────►│  DRAFT   │
                        │          │
                        └────┬─────┘
                             │ PO Officer Publishes
                             ▼
                        ┌──────────┐
                        │PUBLISHED │◄──────────────────────────────────┐
                        │          │                                    │
                        └────┬─────┘                                   │
                             │ Deadline Reached                         │
                             ▼                                          │
                        ┌──────────┐                                    │
                        │  CLOSED  │                                    │
                        └────┬─────┘                                    │
                             │ Evaluate Bids                            │
                             │                                          │
                    ┌────────▼────────────────────────────────┐        │
                    │         QUOTATION SUB-LIFECYCLE          │        │
                    │                                          │        │
                    │  [*] ──► SUBMITTED ──► SELECTED          │        │
                    │               Vendor submits   PO select │        │
                    │                                    │     │        │
                    │              PENDING_APPROVAL ◄────┘     │        │
                    └────────────────────┬─────────────────────┘        │
                                         │ Manager Reviews               │
                              ┌──────────▼───────────┐                  │
                              │  APPROVAL DECISION   │                  │
                              └──────┬───────────┬───┘                  │
                                     │ Approve   │ Reject               │
                                     │           │                      │
                              ┌──────▼──┐   ┌────▼────┐                 │
                              │APPROVED │   │REJECTED │─────────────────┘
                              └──────┬──┘   └─────────┘  Re-open for bidding
                                     │
                    ┌────────────────▼─────────────────────────────────┐
                    │            PURCHASE ORDER LIFECYCLE               │
                    │                                                   │
                    │  APPROVED ──► PO_GENERATED ──► PO_SENT           │
                    │                    │                │             │
                    │           (auto-compile)    (emailed to vendor)   │
                    │                                     │             │
                    │                              PO_ACCEPTED          │
                    │                                     │             │
                    │                              PO_COMPLETED         │
                    │                           (order fulfilled)       │
                    └───────────────────────────────────────────────────┘
```

---

## 🧾 GST Tax Invoice Verification Flow

```
  ┌────────────────────────────────────────────────────────────────────┐
  │                  TAX INVOICE COMPUTATION PIPELINE                  │
  └────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐
  │  Completed PO   │
  │  (PO_COMPLETED) │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────────────────┐
  │  PO Officer triggers invoice    │
  │  generation for this PO         │
  └────────┬────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────┐
  │  Retrieve PO + quotation data   │
  │  → price, quantity, vendor info │
  └────────┬────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────┐
  │  Compute SUBTOTAL               │
  │  (Unit Price × Quantity)        │
  └────────┬────────────────────────┘
           │
     ┌─────┴──────┐
     │            │
     ▼            ▼
  ┌───────────┐ ┌───────────┐
  │ CGST @ 9% │ │ SGST @ 9% │
  │  = Sub×9% │ │  = Sub×9% │
  └─────┬─────┘ └─────┬─────┘
        └──────┬───────┘
               │
               ▼
  ┌─────────────────────────────────┐
  │  TOTAL = Subtotal + CGST + SGST │
  │  (Effective GST rate = 18%)     │
  └────────┬────────────────────────┘
           │
           ▼
  ┌─────────────────────────────────┐
  │  INSERT invoices record         │
  │  status = 'GENERATED'           │
  │  invoice_number auto-assigned   │
  └────────┬────────────────────────┘
           │
     ┌─────┴──────────────────┐
     │                        │
     ▼                        ▼
  ┌──────────┐          ┌──────────────┐
  │ PAID     │          │  CANCELLED   │
  │(Auth'd)  │          │  (Voided)    │
  └────┬─────┘          └──────┬───────┘
       └───────────┬────────────┘
                   ▼
  ┌─────────────────────────────────┐
  │  LOG action to activity_logs    │
  │  (full audit trail entry)       │
  └─────────────────────────────────┘
```

### GST Calculation Example

| Field | Formula | Example (₹10,000 subtotal) |
|---|---|---|
| **Subtotal** | Unit Price × Qty | ₹10,000.00 |
| **CGST (9%)** | Subtotal × 0.09 | ₹900.00 |
| **SGST (9%)** | Subtotal × 0.09 | ₹900.00 |
| **Total GST** | CGST + SGST | ₹1,800.00 |
| **Grand Total** | Subtotal + Total GST | ₹11,800.00 |

---

## 👥 Role-Based Workspaces

VendorBridge enforces **strict role isolation** at both the UI routing and API middleware levels. Each role accesses only its designated workspace.

```
┌─────────────────────────────────────────────────────────────┐
│                    ROLE ACCESS MAP                          │
├─────────────┬──────────────────────────────────────────────┤
│  ADMIN      │  User Mgmt · Vendor Directory · Reports      │
│  (Global)   │  Suspend/Blacklist · Password Reset          │
├─────────────┼──────────────────────────────────────────────┤
│  PROCUREMENT│  RFQ Create/Publish · Bid Matrix             │
│  OFFICER    │  PO Generation · PDF Download                │
│             │  Invoice Ledger · Payment Auth               │
├─────────────┼──────────────────────────────────────────────┤
│  MANAGER    │  Approve/Reject Quotations · Remarks         │
│             │  Procurement Monitor · Report Charts         │
├─────────────┼──────────────────────────────────────────────┤
│  VENDOR     │  View RFQ Invitations · Submit Quotations    │
│             │  Track Bid Status · Accept/Reject POs        │
└─────────────┴──────────────────────────────────────────────┘
```

### 💻 Administrator Dashboard

The Admin has **global platform authority** — the only role that can provision users and manage vendor standing.

```
ADMIN WORKSPACE
│
├── 👤 User Management
│   ├── Create users: PROCUREMENT_OFFICER | MANAGER | ADMIN | VENDOR
│   ├── Update: full_name, email, role, is_active
│   └── Reset passwords (bcrypt-hashed)
│
├── 🏢 Vendor Directory
│   ├── Register vendor: company_name, GSTIN, category, email, phone, address
│   └── Update vendor status:
│       ├── PENDING   → awaiting activation
│       ├── ACTIVE    → can participate in RFQs
│       ├── INACTIVE  → suspended access
│       └── BLACKLISTED → permanently blocked
│
└── 📊 System Reports Module
    ├── Templates:
    │   ├── Monthly Procurement Summary
    │   ├── Vendor Performance Analysis
    │   ├── Spending Breakdown
    │   ├── Purchase Order Status Report
    │   └── Invoice Audit Report
    ├── Date Filters:
    │   ├── Last 30 Days
    │   ├── Last Quarter
    │   ├── Year to Date
    │   └── All Available History
    └── Export: Structured CSV download
```

### 💼 Procurement Officer Workspace

The operational core of the procurement cycle. Officers own the entire procure-to-pay pipeline.

```
PROCUREMENT OFFICER WORKSPACE
│
├── 📋 RFQ Manager
│   ├── Create RFQ: title, description, quantity, deadline, attachment_url
│   ├── Edit draft RFQs before publishing
│   └── Publish → RFQ becomes visible to vendors
│
├── ⚖️ Bid Comparison Matrix
│   ├── View all submitted quotations per RFQ
│   ├── Compare: vendor name, unit price, delivery_days, comments
│   ├── Select best quotation
│   └── Submit approval request → triggers Manager notification
│
├── 📄 PO Manager
│   ├── Create PO agreements (post-approval)
│   ├── Download PO as PDF (PDFKit vector document)
│   └── Dispatch PO via email (Nodemailer + SMTP attachment)
│
└── 🧾 Tax Invoice Ledger
    ├── View all generated invoices
    ├── Inspect CGST / SGST line items
    ├── Print billing receipts
    └── Authorize payment → status: GENERATED → PAID
```

### 🛡️ Manager Approval Center

Managers are the **authorization gatekeepers** — no PO is generated without manager sign-off.

```
MANAGER WORKSPACE
│
├── ✅ Pending Approvals Queue
│   ├── View all PENDING approval requests
│   ├── Inspect: quotation specs, vendor profile, price, delivery days
│   ├── Approve → PO auto-generated + vendor notified
│   └── Reject (with remarks) → RFQ re-opened for new bids
│
├── 📊 Procurement Monitor (Real-Time Dashboard)
│   ├── Active RFQ count gauge
│   ├── Submitted quotation count
│   ├── Active PO count
│   └── Invoice status breakdown
│
└── 📈 Manager Reports
    ├── Decision speed analytics (avg. approval time)
    ├── Monthly procurement trend charts
    └── Cost-benefit breakdowns per RFQ
```

### 🚜 Vendor Portal

Vendors have a **scoped, isolated view** — they only see data relevant to their own account.

```
VENDOR PORTAL
│
├── 🏠 Vendor Dashboard
│   ├── Active PO count
│   ├── Quotation success rate (selected / submitted)
│   └── Outstanding billing balance
│
├── 📨 RFQ Invitations
│   ├── View open RFQ invitations
│   ├── Read specifications: title, description, quantity, deadline
│   └── Download attached RFQ documents
│
├── 💬 Quotation Submission Engine
│   ├── Input: price (per unit), delivery_days, comments/notes
│   ├── Save as DRAFT → edit later before deadline
│   └── SUBMIT → locked for officer review
│
├── 📍 Quotation Status Tracker
│   │
│   │  Invitation → Bid Submitted → Under Review → Selected / Rejected
│   │     🔵              🟡               🟠            🟢  /  🔴
│   │
│   └── Real-time pipeline visualization
│
└── 📦 Purchase Orders
    ├── Inspect awarded PO details
    ├── Track fulfillment progress
    ├── Print PO sheet (PDF)
    └── Accept / Reject PO agreement
```

---

## 🗄️ Database Schema & Relational Model

### Entity Relationship Overview

```
users ──────────────────────────────────────────────────────────────┐
  │ id (PK)                                                          │
  │ full_name | email | password_hash | role | is_active             │
  │                                                                  │
  │ 1:N                   1:N                      1:N              │
  ▼                        ▼                        ▼               │
rfqs               activity_logs            notifications            │
  │ id (PK)           id (PK)                  id (PK)              │
  │ title             user_id (FK)             user_id (FK)         │
  │ description       action                   title                │
  │ quantity          entity_type              message              │
  │ deadline          entity_id                is_read              │
  │ status            description                                   │
  │ created_by (FK)                                                  │
  │                                                                  │
  │ 1:N                                                             │
  ▼                                                                  │
quotations ─────────────────────────────────────────────┐           │
  │ id (PK)                                              │           │
  │ rfq_id (FK) ──────────────────────────────────────  │           │
  │ vendor_id (FK) ────────────────────────────────────►│           │
  │ price | delivery_days | comments | status           │           │
  │                                                     │           │
  │ 1:1                                  vendors        │           │
  ▼                                        │ id (PK)    │           │
approvals                                  │ company    │           │
  │ id (PK)                                │ gst_number │           │
  │ quotation_id (FK)                      │ category   │           │
  │ manager_id (FK) ──────────────────────►│ email      │           │
  │ status | remarks | approved_at         │ status     │           │
  │                                        │            │           │
  │ (on APPROVED)                          │ 1:N        │           │
  │                                        ▼            │           │
  └──────────────────────────────► purchase_orders ◄───┘           │
                                      │ id (PK)                     │
                                      │ po_number (unique)          │
                                      │ quotation_id (FK)           │
                                      │ vendor_id (FK)              │
                                      │ total_amount | status       │
                                      │ created_by (FK) ───────────►┘
                                      │
                                      │ 1:N
                                      ▼
                                   invoices
                                      │ id (PK)
                                      │ invoice_number (unique)
                                      │ purchase_order_id (FK)
                                      │ subtotal
                                      │ tax_amount (CGST+SGST)
                                      │ total_amount
                                      └ status: GENERATED|PAID|CANCELLED
```

### Table Definitions

#### `users`
| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK, `gen_random_uuid()` |
| `full_name` | VARCHAR(200) | NOT NULL |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `role` | VARCHAR(40) | CHECK: `ADMIN`, `MANAGER`, `PROCUREMENT_OFFICER`, `VENDOR` |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

#### `vendors`
| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `company_name` | VARCHAR(200) | NOT NULL |
| `gst_number` | VARCHAR(50) | NOT NULL, UNIQUE |
| `category` | VARCHAR(100) | NOT NULL |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `phone` | VARCHAR(25) | NOT NULL |
| `address` | TEXT | — |
| `status` | VARCHAR(40) | CHECK: `PENDING`, `ACTIVE`, `INACTIVE`, `BLACKLISTED` |

#### `rfqs`
| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `title` | VARCHAR(200) | NOT NULL |
| `description` | TEXT | NOT NULL |
| `quantity` | NUMERIC(14,2) | CHECK > 0 |
| `deadline` | TIMESTAMPTZ | NOT NULL |
| `attachment_url` | TEXT | — |
| `status` | VARCHAR(40) | CHECK: `DRAFT`, `PUBLISHED`, `CLOSED`, `CANCELLED`, `VENDOR_SELECTED`, `APPROVED`, `REJECTED` |
| `created_by` | UUID | FK → `users.id` |

#### `quotations`
| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `rfq_id` | UUID | FK → `rfqs.id` |
| `vendor_id` | UUID | FK → `vendors.id` |
| `price` | NUMERIC(14,2) | CHECK > 0 |
| `delivery_days` | INTEGER | CHECK > 0 |
| `comments` | TEXT | — |
| `status` | VARCHAR(40) | CHECK: `DRAFT`, `SUBMITTED`, `SELECTED`, `REJECTED` |
| `submitted_at` | TIMESTAMPTZ | — |

#### `approvals`
| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `quotation_id` | UUID | FK → `quotations.id` |
| `manager_id` | UUID | FK → `users.id` |
| `status` | VARCHAR(40) | CHECK: `PENDING`, `APPROVED`, `REJECTED` |
| `remarks` | TEXT | — |
| `approved_at` | TIMESTAMPTZ | — |

#### `purchase_orders`
| Column | Type | Constraint |
|---|---|---|
| `id` | UUID | PK |
| `po_number` | VARCHAR(50) | NOT NULL, UNIQUE |
| `quotation_id` | UUID | FK → `quotations.id` |
| `vendor_id` | UUID | FK → `vendors.id` |
| `total_amount` | NUMERIC(14,2) | NOT NULL |
| `status` | VARCHAR(40) | CHECK: `PENDING`, `SENT`, `ACCEPTED`, `REJECTED`, `COMPLETED`, `CANCELLED` |
| `created_by` | UUID | FK → `users.id` |

#### `invoices`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `invoice_number` | VARCHAR(50) | UNIQUE |
| `purchase_order_id` | UUID | FK → `purchase_orders.id` |
| `subtotal` | NUMERIC(14,2) | Pre-tax amount |
| `tax_amount` | NUMERIC(14,2) | CGST (9%) + SGST (9%) = 18% |
| `total_amount` | NUMERIC(14,2) | `subtotal + tax_amount` |
| `status` | VARCHAR(40) | CHECK: `GENERATED`, `PAID`, `CANCELLED` |

#### `notifications`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users.id` |
| `title` | VARCHAR(200) | NOT NULL |
| `message` | TEXT | NOT NULL |
| `is_read` | BOOLEAN | DEFAULT FALSE |

#### `activity_logs`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → `users.id` |
| `action` | VARCHAR(100) | e.g. `INVOICE_PAID`, `PO_CREATED` |
| `entity_type` | VARCHAR(50) | e.g. `invoice`, `purchase_order` |
| `entity_id` | UUID | The affected record |
| `description` | TEXT | Human-readable audit entry |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

## ⚡ API Endpoints Directory

### Authentication & User Management

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | ADMIN (for non-vendor roles) | Register new platform user |
| `POST` | `/auth/login` | Public | Authenticate; returns signed JWT |
| `GET` | `/auth/users` | ADMIN only | List all user accounts |
| `PUT` | `/auth/users/:id` | ADMIN only | Update user name/email/role/status |

### RFQ Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/rfqs` | All authenticated | List RFQs (status-filtered) |
| `POST` | `/rfqs` | PROCUREMENT_OFFICER | Create new draft RFQ |
| `PUT` | `/rfqs/:id` | PROCUREMENT_OFFICER | Update RFQ specifications |
| `PATCH` | `/rfqs/:id/publish` | PROCUREMENT_OFFICER | Publish RFQ to vendor network |
| `GET` | `/vendors/:vendorId/rfqs` | VENDOR (own ID only) | Get RFQs invited to this vendor |

### Quotation & Bid Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/quotations` | VENDOR | Submit quotation bid for RFQ |
| `GET` | `/quotations` | Role-filtered | List quotations (vendor-scoped for VENDOR role) |
| `PUT` | `/quotations/:id` | VENDOR (owner only) | Edit quotation before deadline |
| `PATCH` | `/quotations/:id/select` | PROCUREMENT_OFFICER | Select bid + trigger approval workflow |

### Purchase Order & PDF Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/purchase-orders` | Role-filtered | List PO agreements |
| `GET` | `/purchase-orders/:id/pdf` | Authorized roles | Download PDFKit-generated PO PDF |
| `POST` | `/emails/send-po` | PROCUREMENT_OFFICER | Dispatch PO PDF via SMTP (Nodemailer) |

### Approval Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/approvals` | MANAGER | List pending approval requests |
| `PATCH` | `/approvals/:id/approve` | MANAGER | Approve quotation; triggers PO generation |
| `PATCH` | `/approvals/:id/reject` | MANAGER | Reject with remarks; RFQ re-opened |

### Invoice Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/invoices` | PROCUREMENT_OFFICER | List all invoices |
| `POST` | `/invoices` | PROCUREMENT_OFFICER | Generate invoice for completed PO |
| `PATCH` | `/invoices/:id/pay` | PROCUREMENT_OFFICER | Authorize payment; status → PAID |
| `PATCH` | `/invoices/:id/cancel` | PROCUREMENT_OFFICER | Void invoice; status → CANCELLED |

---

## 🛡️ Security & Data Isolation

### 1. JWT Authentication Flow

```
Client                                    Express Server
  │                                             │
  │── POST /auth/login { email, password } ────►│
  │                                             │── bcrypt.compare(password, hash)
  │                                             │── jwt.sign({ id, role, email })
  │◄── { token, user } ────────────────────────│
  │                                             │
  │── GET /rfqs  Authorization: Bearer <token> ►│
  │                                             │── jwt.verify(token, JWT_SECRET)
  │                                             │── req.user = decoded payload
  │                                             │── authorizeRoles('PROCUREMENT_OFFICER')
  │◄── [ rfq records ] ────────────────────────│
```

### 2. Role-Based Access Control Middleware

```javascript
// backend/middleware/roleMiddleware.js
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    next();
  };
}

// Applied per route:
router.post('/rfqs', verifyJWT, authorizeRoles('PROCUREMENT_OFFICER'), createRfq);
router.patch('/approvals/:id/approve', verifyJWT, authorizeRoles('MANAGER'), approveQuotation);
```

### 3. Multi-Tenant Vendor Data Isolation

Vendors can **only access their own records**. The backend injects identity filters automatically:

```javascript
// backend/services/reportService.js — Activity Log Query
if (actor.role === 'VENDOR') {
  values.push(actor.id);
  clauses.push(`al.user_id = $${values.length}`);
  // Injected SQL: WHERE al.user_id = $1
}

// Direct resource access guard
if (actor.role === 'VENDOR' && row.user_id !== actor.id) {
  throw createHttpError(403, 'You do not have permission to access this activity log.');
}
```

### 4. Security Architecture Summary

```
┌────────────────────────────────────────────────────────────┐
│                   DEFENSE IN DEPTH                         │
├─────────────────────────────────────────────────────────────
│  Layer 1: Transport      HTTPS (production)                │
│  Layer 2: Authentication JWT signature verification        │
│  Layer 3: Authorization  Role middleware (403 on mismatch) │
│  Layer 4: Data Scoping   Vendor ID injection in SQL WHERE  │
│  Layer 5: Passwords      Bcrypt hash (never stored plain)  │
│  Layer 6: SQL Safety     Parameterized queries via pg       │
│  Layer 7: Audit Trail    activity_logs for all mutations   │
└────────────────────────────────────────────────────────────┘
```

---

## 💰 GST Financial Calculation Logic

VendorBridge implements **India's Goods and Services Tax (GST) model** with intra-state split billing.

```
Invoice Total Breakdown
─────────────────────────────────────────────
  Base Amount (Subtotal)        ₹ X
  + CGST  (Central GST @ 9%)   ₹ X × 0.09
  + SGST  (State GST   @ 9%)   ₹ X × 0.09
  ─────────────────────────────────────────
  Grand Total (18% GST)         ₹ X × 1.18
─────────────────────────────────────────────

Stored in invoices table:
  subtotal    = X
  tax_amount  = (X × 0.09) + (X × 0.09) = X × 0.18
  total_amount = X + (X × 0.18)
```

---

## 🔔 Notification & Audit Trail System

### Notification Triggers

| Event | Recipient | Message |
|---|---|---|
| RFQ Published | All active VENDOR accounts | New RFQ invitation available |
| Quotation Selected | MANAGER accounts | Approval request pending |
| Approval Granted | PROCUREMENT_OFFICER | PO generation ready |
| Approval Rejected | PROCUREMENT_OFFICER | Quotation rejected with remarks |
| PO Email Sent | VENDOR (via SMTP) | Purchase Order PDF attachment |

### Audit Log Structure

Every state-changing action is recorded:

```json
{
  "user_id": "uuid-of-actor",
  "action": "INVOICE_PAID",
  "entity_type": "invoice",
  "entity_id": "uuid-of-invoice",
  "description": "Invoice INV-2024-001 marked as PAID by officer John Doe",
  "created_at": "2024-03-15T10:30:00Z"
}
```

Common `action` values:

```
RFQ_CREATED          RFQ_PUBLISHED         RFQ_CLOSED
QUOTATION_SUBMITTED  QUOTATION_SELECTED    QUOTATION_REJECTED
APPROVAL_CREATED     APPROVAL_APPROVED     APPROVAL_REJECTED
PO_CREATED           PO_SENT               PO_ACCEPTED
INVOICE_GENERATED    INVOICE_PAID          INVOICE_CANCELLED
```

---

## 🚀 Setup & Installation Guide

### Prerequisites

```
✅ Node.js v18+
✅ PostgreSQL 14+ server running locally
✅ npm or yarn
✅ SMTP credentials (Gmail App Password recommended)
```

### Step 1 — Create Database

```sql
-- In your PostgreSQL shell (psql):
CREATE DATABASE vendorbridge_db;
```

### Step 2 — Configure Environment

Create `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/vendorbridge_db
JWT_SECRET=your_super_secret_jwt_key_here
DB_SSL=false
CORS_ORIGIN=*
NODE_ENV=development
```

### Step 3 — Install & Seed Backend

```bash
cd backend
npm install
npm run seed     # Creates all tables + inserts mock data
npm run dev      # Starts Express server on Port 5000
```

### Step 4 — Install & Start Frontend

```bash
cd ../Frontend
npm install
npm run dev      # Starts Vite dev server on Port 5173 or 5174
```

### Step 5 — Access the Application

Open `http://localhost:5173` (or the port shown by Vite) in your browser.

The seed script creates default accounts for each role — check your seed file for credentials.

---

## 📋 Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | ✅ | Express server port (default: 5000) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT signing (keep private!) |
| `DB_SSL` | ✅ | Set `true` for cloud DBs, `false` for local |
| `CORS_ORIGIN` | ✅ | Allowed CORS origin (`*` for dev, specific domain for prod) |
| `NODE_ENV` | ✅ | `development` or `production` |
| `SMTP_HOST` | 📧 | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | 📧 | SMTP port (587 for TLS, 465 for SSL) |
| `SMTP_SECURE` | 📧 | `true` for port 465, `false` for 587 |
| `SMTP_USER` | 📧 | Sender email address |
| `SMTP_PASS` | 📧 | App password (not account password!) |
| `EMAIL_FROM` | 📧 | From address displayed in emails |
| `EMAIL_FROM_NAME` | 📧 | Display name (e.g. `VendorBridge`) |

> 📧 = Required for email dispatch features (PO emails, notifications)

---

## 📊 Report Templates Reference

| Report | Data Source | Key Metrics |
|---|---|---|
| **Monthly Procurement Summary** | `rfqs` + `purchase_orders` | RFQs published, POs generated, total spend |
| **Vendor Performance Analysis** | `quotations` + `vendors` | Win rate, avg delivery days, response rate |
| **Spending Breakdown** | `invoices` + `purchase_orders` | GST paid, category spend, vendor distribution |
| **PO Status Report** | `purchase_orders` | PENDING / SENT / ACCEPTED / COMPLETED counts |
| **Invoice Audit Report** | `invoices` + `activity_logs` | GENERATED / PAID / CANCELLED + timeline |

All reports support date filters: **Last 30 Days · Last Quarter · Year to Date · All History**  
Export format: **Structured CSV**

---

*VendorBridge ERP — Built for enterprise procurement teams that demand traceability, accountability, and automation at every step of the supply chain.*
