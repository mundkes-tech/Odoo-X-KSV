require('dotenv').config({ override: true });

const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { initializeModels } = require('../models');

const PASSWORD = 'Password@123';
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

const users = [
  { key: 'admin', full_name: 'Admin User', email: 'admin@vendorbridge.test', role: 'ADMIN' },
  { key: 'procurement', full_name: 'Priya Procurement', email: 'procurement@vendorbridge.test', role: 'PROCUREMENT_OFFICER' },
  { key: 'manager', full_name: 'Manav Manager', email: 'manager@vendorbridge.test', role: 'MANAGER' },
  { key: 'vendor1', full_name: 'Aarav Steel Vendor', email: 'steel.vendor@vendorbridge.test', role: 'VENDOR' },
  { key: 'vendor2', full_name: 'Neha Office Vendor', email: 'office.vendor@vendorbridge.test', role: 'VENDOR' },
  { key: 'vendor3', full_name: 'Isha Logistics Vendor', email: 'logistics.vendor@vendorbridge.test', role: 'VENDOR' },
];

const vendors = [
  {
    key: 'steel',
    company_name: 'Aarav Steel Supplies',
    gst_number: '24ABCDE1234F1Z1',
    category: 'Raw Materials',
    email: 'steel.vendor@vendorbridge.test',
    phone: '+91 98765 10001',
    address: 'Plot 42, GIDC Estate, Ahmedabad, Gujarat',
    status: 'ACTIVE',
  },
  {
    key: 'office',
    company_name: 'Neha Office Essentials',
    gst_number: '24ABCDE1234F1Z2',
    category: 'Office Supplies',
    email: 'office.vendor@vendorbridge.test',
    phone: '+91 98765 10002',
    address: 'C-18, Corporate Park, Vadodara, Gujarat',
    status: 'ACTIVE',
  },
  {
    key: 'logistics',
    company_name: 'Isha Logistics Partners',
    gst_number: '24ABCDE1234F1Z3',
    category: 'Logistics',
    email: 'logistics.vendor@vendorbridge.test',
    phone: '+91 98765 10003',
    address: 'Warehouse 9, Sanand Road, Ahmedabad, Gujarat',
    status: 'ACTIVE',
  },
  {
    key: 'inactive',
    company_name: 'Legacy Maintenance Co',
    gst_number: '24ABCDE1234F1Z4',
    category: 'Maintenance',
    email: 'legacy.vendor@vendorbridge.test',
    phone: '+91 98765 10004',
    address: 'Old Market Road, Surat, Gujarat',
    status: 'INACTIVE',
  },
];

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function upsertUser(client, user, passwordHash) {
  const result = await client.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (email) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          password_hash = EXCLUDED.password_hash,
          role = EXCLUDED.role,
          is_active = TRUE,
          updated_at = NOW()
      RETURNING id, email, role;
    `,
    [user.full_name, user.email, passwordHash, user.role]
  );
  return result.rows[0];
}

async function upsertVendor(client, vendor) {
  const result = await client.query(
    `
      INSERT INTO vendors (company_name, gst_number, category, email, phone, address, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE
      SET company_name = EXCLUDED.company_name,
          gst_number = EXCLUDED.gst_number,
          category = EXCLUDED.category,
          phone = EXCLUDED.phone,
          address = EXCLUDED.address,
          status = EXCLUDED.status
      RETURNING id, email, company_name;
    `,
    [
      vendor.company_name,
      vendor.gst_number,
      vendor.category,
      vendor.email,
      vendor.phone,
      vendor.address,
      vendor.status,
    ]
  );
  return result.rows[0];
}

async function upsertRfq(client, rfq) {
  const result = await client.query(
    `
      INSERT INTO rfqs (id, title, description, quantity, deadline, attachment_url, status, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE
      SET title = EXCLUDED.title,
          description = EXCLUDED.description,
          quantity = EXCLUDED.quantity,
          deadline = EXCLUDED.deadline,
          attachment_url = EXCLUDED.attachment_url,
          status = EXCLUDED.status,
          created_by = EXCLUDED.created_by
      RETURNING id;
    `,
    [rfq.id, rfq.title, rfq.description, rfq.quantity, rfq.deadline, rfq.attachment_url, rfq.status, rfq.created_by]
  );
  return result.rows[0];
}

async function upsertQuotation(client, quotation) {
  const result = await client.query(
    `
      INSERT INTO quotations (rfq_id, vendor_id, price, delivery_days, comments, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (rfq_id, vendor_id) DO UPDATE
      SET price = EXCLUDED.price,
          delivery_days = EXCLUDED.delivery_days,
          comments = EXCLUDED.comments,
          status = EXCLUDED.status
      RETURNING id;
    `,
    [quotation.rfq_id, quotation.vendor_id, quotation.price, quotation.delivery_days, quotation.comments, quotation.status]
  );
  return result.rows[0];
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing. Add it to backend/.env before running npm run seed.');
  }

  await initializeModels(pool);

  const client = await pool.connect();
  const ids = { users: {}, vendors: {}, rfqs: {}, quotations: {}, approvals: {}, purchaseOrders: {}, invoices: {} };
  const dynamicVendorProfiles = [];

  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

    for (const user of users) {
      ids.users[user.key] = await upsertUser(client, user, passwordHash);
    }

    for (const vendor of vendors) {
      ids.vendors[vendor.key] = await upsertVendor(client, vendor);
    }

    const vendorUsersWithoutProfiles = await client.query(
      `
        SELECT u.id, u.full_name, u.email
        FROM users u
        LEFT JOIN vendors v ON LOWER(v.email) = LOWER(u.email)
        WHERE u.role = 'VENDOR'
          AND v.id IS NULL;
      `
    );

    for (const user of vendorUsersWithoutProfiles.rows) {
      const safeName = user.full_name && user.full_name.trim() ? user.full_name.trim() : user.email.split('@')[0];
      const vendorResult = await upsertVendor(client, {
        company_name: `${safeName} Reference Vendor`,
        gst_number: `SEED-${user.id.slice(0, 8).toUpperCase()}`,
        category: 'Reference Vendor',
        email: user.email,
        phone: '+91 90000 00000',
        address: 'Seeded vendor profile created for frontend testing.',
        status: 'ACTIVE',
      });

      dynamicVendorProfiles.push({
        user_id: user.id,
        vendor_id: vendorResult.id,
        email: user.email,
      });
    }

    const rfqs = [
      {
        key: 'steel',
        id: '11111111-1111-4111-8111-111111111111',
        title: 'Steel Rods for Plant Expansion',
        description: 'Procure 12mm TMT steel rods for the new production bay.',
        quantity: 500,
        deadline: daysFromNow(14),
        attachment_url: 'https://example.com/specs/steel-rods.pdf',
        status: 'PUBLISHED',
        created_by: ids.users.procurement.id,
      },
      {
        key: 'office',
        id: '22222222-2222-4222-8222-222222222222',
        title: 'Quarterly Office Supply Kit',
        description: 'Office stationery, printer cartridges, and pantry essentials for Q3.',
        quantity: 120,
        deadline: daysFromNow(21),
        attachment_url: null,
        status: 'VENDOR_SELECTED',
        created_by: ids.users.procurement.id,
      },
      {
        key: 'logistics',
        id: '33333333-3333-4333-8333-333333333333',
        title: 'Outbound Logistics Contract',
        description: 'Monthly Ahmedabad to Mumbai shipment support for finished goods.',
        quantity: 30,
        deadline: daysFromNow(30),
        attachment_url: null,
        status: 'APPROVED',
        created_by: ids.users.procurement.id,
      },
      {
        key: 'draft',
        id: '44444444-4444-4444-8444-444444444444',
        title: 'Reference Draft RFQ',
        description: 'Draft RFQ reference record for checking draft filters and edit screens.',
        quantity: 25,
        deadline: daysFromNow(45),
        attachment_url: null,
        status: 'DRAFT',
        created_by: ids.users.procurement.id,
      },
      {
        key: 'closed',
        id: '55555555-5555-4555-8555-555555555555',
        title: 'Reference Closed RFQ',
        description: 'Closed RFQ reference record with a withdrawn quotation.',
        quantity: 60,
        deadline: daysFromNow(7),
        attachment_url: null,
        status: 'CLOSED',
        created_by: ids.users.procurement.id,
      },
      {
        key: 'rejected',
        id: '66666666-6666-4666-8666-666666666666',
        title: 'Reference Rejected RFQ',
        description: 'Rejected RFQ reference record connected to a rejected approval.',
        quantity: 15,
        deadline: daysFromNow(18),
        attachment_url: null,
        status: 'REJECTED',
        created_by: ids.users.procurement.id,
      },
      {
        key: 'poCreated',
        id: '77777777-7777-4777-8777-777777777777',
        title: 'Reference Created PO RFQ',
        description: 'Approved quotation reference used for a CREATED purchase order.',
        quantity: 10,
        deadline: daysFromNow(24),
        attachment_url: null,
        status: 'APPROVED',
        created_by: ids.users.procurement.id,
      },
      {
        key: 'poCompleted',
        id: '88888888-8888-4888-8888-888888888888',
        title: 'Reference Completed PO RFQ',
        description: 'Approved quotation reference used for a COMPLETED purchase order and PAID invoice.',
        quantity: 8,
        deadline: daysFromNow(28),
        attachment_url: null,
        status: 'APPROVED',
        created_by: ids.users.procurement.id,
      },
    ];

    for (const rfq of rfqs) {
      ids.rfqs[rfq.key] = await upsertRfq(client, rfq);
    }

    const assignments = [
      ['steel', 'steel'],
      ['steel', 'logistics'],
      ['office', 'office'],
      ['office', 'steel'],
      ['logistics', 'logistics'],
      ['closed', 'office'],
      ['rejected', 'steel'],
      ['poCreated', 'office'],
      ['poCompleted', 'logistics'],
    ];

    for (const [rfqKey, vendorKey] of assignments) {
      await client.query(
        `
          INSERT INTO rfq_vendors (rfq_id, vendor_id)
          VALUES ($1, $2)
          ON CONFLICT (rfq_id, vendor_id) DO NOTHING;
        `,
        [ids.rfqs[rfqKey].id, ids.vendors[vendorKey].id]
      );
    }

    for (const profile of dynamicVendorProfiles) {
      await client.query(
        `
          INSERT INTO rfq_vendors (rfq_id, vendor_id)
          VALUES ($1, $2)
          ON CONFLICT (rfq_id, vendor_id) DO NOTHING;
        `,
        [ids.rfqs.steel.id, profile.vendor_id]
      );
    }

    const quotations = [
      {
        key: 'steelA',
        rfq_id: ids.rfqs.steel.id,
        vendor_id: ids.vendors.steel.id,
        price: 875000,
        delivery_days: 10,
        comments: 'Includes loading and quality certificate.',
        status: 'SUBMITTED',
      },
      {
        key: 'steelB',
        rfq_id: ids.rfqs.steel.id,
        vendor_id: ids.vendors.logistics.id,
        price: 902500,
        delivery_days: 12,
        comments: 'Can bundle delivery support.',
        status: 'SUBMITTED',
      },
      {
        key: 'officeSelected',
        rfq_id: ids.rfqs.office.id,
        vendor_id: ids.vendors.office.id,
        price: 146000,
        delivery_days: 5,
        comments: 'Best rate for complete kit.',
        status: 'SELECTED',
      },
      {
        key: 'logisticsApproved',
        rfq_id: ids.rfqs.logistics.id,
        vendor_id: ids.vendors.logistics.id,
        price: 325000,
        delivery_days: 3,
        comments: 'Dedicated route manager included.',
        status: 'APPROVED',
      },
      {
        key: 'closedWithdrawn',
        rfq_id: ids.rfqs.closed.id,
        vendor_id: ids.vendors.office.id,
        price: 58500,
        delivery_days: 8,
        comments: 'Withdrawn after internal stock review.',
        status: 'WITHDRAWN',
      },
      {
        key: 'rejectedQuote',
        rfq_id: ids.rfqs.rejected.id,
        vendor_id: ids.vendors.steel.id,
        price: 212000,
        delivery_days: 16,
        comments: 'Rejected reference quotation for manager workflow testing.',
        status: 'REJECTED',
      },
      {
        key: 'poCreatedQuote',
        rfq_id: ids.rfqs.poCreated.id,
        vendor_id: ids.vendors.office.id,
        price: 78500,
        delivery_days: 4,
        comments: 'Approved quote used to show a CREATED purchase order.',
        status: 'APPROVED',
      },
      {
        key: 'poCompletedQuote',
        rfq_id: ids.rfqs.poCompleted.id,
        vendor_id: ids.vendors.logistics.id,
        price: 188000,
        delivery_days: 6,
        comments: 'Approved quote used to show completed PO and paid invoice references.',
        status: 'APPROVED',
      },
    ];

    for (const quotation of quotations) {
      ids.quotations[quotation.key] = await upsertQuotation(client, quotation);
    }

    const pendingApproval = await client.query(
      `
        INSERT INTO approvals (quotation_id, status, remarks)
        VALUES ($1, 'PENDING', 'Waiting for manager review.')
        ON CONFLICT (quotation_id) DO UPDATE
        SET status = 'PENDING',
            remarks = EXCLUDED.remarks,
            manager_id = NULL,
            approved_at = NULL
        RETURNING id;
      `,
      [ids.quotations.officeSelected.id]
    );
    ids.approvals.pending = pendingApproval.rows[0];

    const approvedApproval = await client.query(
      `
        INSERT INTO approvals (quotation_id, manager_id, status, remarks, approved_at)
        VALUES ($1, $2, 'APPROVED', 'Approved for contract generation.', NOW() - INTERVAL '2 days')
        ON CONFLICT (quotation_id) DO UPDATE
        SET manager_id = EXCLUDED.manager_id,
            status = 'APPROVED',
            remarks = EXCLUDED.remarks,
            approved_at = EXCLUDED.approved_at
        RETURNING id;
      `,
      [ids.quotations.logisticsApproved.id, ids.users.manager.id]
    );
    ids.approvals.approved = approvedApproval.rows[0];

    const rejectedApproval = await client.query(
      `
        INSERT INTO approvals (quotation_id, manager_id, status, remarks, approved_at)
        VALUES ($1, $2, 'REJECTED', 'Budget not approved for this reference request.', NOW() - INTERVAL '1 day')
        ON CONFLICT (quotation_id) DO UPDATE
        SET manager_id = EXCLUDED.manager_id,
            status = 'REJECTED',
            remarks = EXCLUDED.remarks,
            approved_at = EXCLUDED.approved_at
        RETURNING id;
      `,
      [ids.quotations.rejectedQuote.id, ids.users.manager.id]
    );
    ids.approvals.rejected = rejectedApproval.rows[0];

    const po = await client.query(
      `
        INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, total_amount, status)
        VALUES ('PO-2026-SEED-0001', $1, $2, 325000, 'SENT')
        ON CONFLICT (po_number) DO UPDATE
        SET quotation_id = EXCLUDED.quotation_id,
            vendor_id = EXCLUDED.vendor_id,
            total_amount = EXCLUDED.total_amount,
            status = EXCLUDED.status
        RETURNING id;
      `,
      [ids.quotations.logisticsApproved.id, ids.vendors.logistics.id]
    );
    ids.purchaseOrders.logistics = po.rows[0];

    const createdPo = await client.query(
      `
        INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, total_amount, status)
        VALUES ('PO-2026-SEED-0002', $1, $2, 78500, 'CREATED')
        ON CONFLICT (po_number) DO UPDATE
        SET quotation_id = EXCLUDED.quotation_id,
            vendor_id = EXCLUDED.vendor_id,
            total_amount = EXCLUDED.total_amount,
            status = EXCLUDED.status
        RETURNING id;
      `,
      [ids.quotations.poCreatedQuote.id, ids.vendors.office.id]
    );
    ids.purchaseOrders.created = createdPo.rows[0];

    const completedPo = await client.query(
      `
        INSERT INTO purchase_orders (po_number, quotation_id, vendor_id, total_amount, status)
        VALUES ('PO-2026-SEED-0003', $1, $2, 188000, 'COMPLETED')
        ON CONFLICT (po_number) DO UPDATE
        SET quotation_id = EXCLUDED.quotation_id,
            vendor_id = EXCLUDED.vendor_id,
            total_amount = EXCLUDED.total_amount,
            status = EXCLUDED.status
        RETURNING id;
      `,
      [ids.quotations.poCompletedQuote.id, ids.vendors.logistics.id]
    );
    ids.purchaseOrders.completed = completedPo.rows[0];

    const subtotal = 325000;
    const taxAmount = 58500;
    await client.query(
      `
        INSERT INTO invoices (invoice_number, purchase_order_id, subtotal, tax_amount, total_amount, status)
        VALUES ('INV-2026-SEED-0001', $1, $2, $3, $4, 'GENERATED')
        ON CONFLICT (invoice_number) DO UPDATE
        SET purchase_order_id = EXCLUDED.purchase_order_id,
            subtotal = EXCLUDED.subtotal,
            tax_amount = EXCLUDED.tax_amount,
            total_amount = EXCLUDED.total_amount,
            status = EXCLUDED.status
        RETURNING id;
      `,
      [ids.purchaseOrders.logistics.id, subtotal, taxAmount, subtotal + taxAmount]
    );

    const paidSubtotal = 188000;
    const paidTaxAmount = 33840;
    await client.query(
      `
        INSERT INTO invoices (invoice_number, purchase_order_id, subtotal, tax_amount, total_amount, status)
        VALUES ('INV-2026-SEED-0002', $1, $2, $3, $4, 'PAID')
        ON CONFLICT (invoice_number) DO UPDATE
        SET purchase_order_id = EXCLUDED.purchase_order_id,
            subtotal = EXCLUDED.subtotal,
            tax_amount = EXCLUDED.tax_amount,
            total_amount = EXCLUDED.total_amount,
            status = EXCLUDED.status
        RETURNING id;
      `,
      [ids.purchaseOrders.completed.id, paidSubtotal, paidTaxAmount, paidSubtotal + paidTaxAmount]
    );

    const logRows = [
      [ids.users.admin.id, 'SEED_DATA_CREATED', 'user', ids.users.admin.id, 'Seed data refreshed for all roles.'],
      [ids.users.procurement.id, 'RFQ_CREATED', 'rfq', ids.rfqs.steel.id, 'Sample published RFQ is available for vendor quotations.'],
      [ids.users.vendor1.id, 'QUOTATION_CREATED', 'quotation', ids.quotations.steelA.id, 'Sample vendor quotation submitted.'],
      [ids.users.manager.id, 'APPROVAL_APPROVED', 'approval', ids.approvals.approved.id, 'Sample approval completed by manager.'],
      [ids.users.manager.id, 'APPROVAL_REJECTED', 'approval', ids.approvals.rejected.id, 'Sample rejected approval is available for manager history.'],
      [ids.users.procurement.id, 'PURCHASE_ORDER_GENERATED', 'purchase_order', ids.purchaseOrders.created.id, 'Sample CREATED purchase order is available.'],
      [ids.users.procurement.id, 'INVOICE_PAID', 'purchase_order', ids.purchaseOrders.completed.id, 'Sample PAID invoice reference is available.'],
    ];

    for (const row of logRows) {
      await client.query(
        `
          INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
          SELECT $1::uuid, $2::varchar, $3::varchar, $4::uuid, $5::text
          WHERE NOT EXISTS (
            SELECT 1 FROM activity_logs WHERE action = $2::varchar AND entity_id = $4::uuid
          );
        `,
        row
      );
    }

    const notifications = [
      [ids.users.procurement.id, 'Quotation Submitted', 'A sample quotation is ready for comparison.'],
      [ids.users.manager.id, 'Approval Requested', 'A sample approval request is pending in your queue.'],
      [ids.users.vendor1.id, 'New RFQ Assigned', 'Steel Rods for Plant Expansion has been assigned to you.'],
      [ids.users.vendor3.id, 'Purchase Order Generated', 'A sample purchase order is available for review.'],
      [ids.users.procurement.id, 'Reference Data Ready', 'Extra RFQ, quotation, approval, PO, and invoice references have been seeded.'],
      [ids.users.vendor2.id, 'Reference PO Created', 'A CREATED purchase order reference is available for Office Essentials.'],
    ];

    for (const profile of dynamicVendorProfiles) {
      notifications.push([
        profile.user_id,
        'Vendor Profile Created',
        'A reference vendor profile and RFQ assignment were created for your account.',
      ]);
    }

    for (const row of notifications) {
      await client.query(
        `
          INSERT INTO notifications (user_id, title, message)
          SELECT $1::uuid, $2::varchar, $3::text
          WHERE NOT EXISTS (
            SELECT 1 FROM notifications WHERE user_id = $1::uuid AND title = $2::varchar AND message = $3::text
          );
        `,
        row
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }

  console.log('Seed data inserted successfully.');
  console.log('');
  console.log('Login accounts:');
  for (const user of users) {
    console.log(`${user.role.padEnd(20)} ${user.email} / ${PASSWORD}`);
  }
}

main().catch(async (error) => {
  console.error('Seed failed:', error.stack || error.message);
  process.exit(1);
});
