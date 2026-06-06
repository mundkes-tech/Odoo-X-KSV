require('dotenv').config();
const http = require('http');
const { Pool } = require('pg');

const BASE = 'http://localhost:5000';
const RESULTS = [];
let TOTAL = 0;
let PASSED = 0;
let FAILED = 0;

const testPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const state = {};

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

function assert(testName, condition, detail) {
  TOTAL++;
  if (condition) {
    PASSED++;
    RESULTS.push({ name: testName, status: 'PASS', detail });
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    FAILED++;
    RESULTS.push({ name: testName, status: 'FAIL', detail });
    console.log(`  ❌ FAIL: ${testName} — ${detail || ''}`);
  }
}

async function seedTestData() {
  console.log('\n🔧 Seeding test data for POs...');

  const users = [
    { email: 'po_admin@test.com', password: 'TestPass123!', full_name: 'PO Admin', role: 'ADMIN' },
    { email: 'po_proc@test.com', password: 'TestPass123!', full_name: 'PO Procurement', role: 'PROCUREMENT_OFFICER' },
    { email: 'po_mgr@test.com', password: 'TestPass123!', full_name: 'PO Manager', role: 'MANAGER' },
    { email: 'po_vendor1@test.com', password: 'TestPass123!', full_name: 'PO Vendor 1', role: 'VENDOR' },
    { email: 'po_vendor2@test.com', password: 'TestPass123!', full_name: 'PO Vendor 2', role: 'VENDOR' },
  ];

  for (const u of users) {
    await request('POST', '/auth/register', u);
  }

  let res;
  res = await request('POST', '/auth/login', { email: 'po_admin@test.com', password: 'TestPass123!' });
  state.adminToken = res.body.token;
  state.adminId = res.body.user?.id;

  res = await request('POST', '/auth/login', { email: 'po_proc@test.com', password: 'TestPass123!' });
  state.procToken = res.body.token;
  state.procUserId = res.body.user?.id;

  res = await request('POST', '/auth/login', { email: 'po_mgr@test.com', password: 'TestPass123!' });
  state.mgrToken = res.body.token;
  state.mgrUserId = res.body.user?.id;

  res = await request('POST', '/auth/login', { email: 'po_vendor1@test.com', password: 'TestPass123!' });
  state.vendorToken1 = res.body.token;
  state.vendorUserId1 = res.body.user?.id;

  res = await request('POST', '/auth/login', { email: 'po_vendor2@test.com', password: 'TestPass123!' });
  state.vendorToken2 = res.body.token;
  state.vendorUserId2 = res.body.user?.id;

  // Create two vendors
  res = await request('POST', '/vendors', {
    company_name: 'PO Test Vendor 1',
    gst_number: 'POGST001',
    category: 'Hardware',
    email: 'po_vendor1@test.com',
    phone: '9300000001',
    address: 'Chennai',
  }, state.adminToken);
  state.vendorId1 = res.body.data?.id || (await testPool.query("SELECT id FROM vendors WHERE email='po_vendor1@test.com' LIMIT 1")).rows[0]?.id;

  res = await request('POST', '/vendors', {
    company_name: 'PO Test Vendor 2',
    gst_number: 'POGST002',
    category: 'Hardware',
    email: 'po_vendor2@test.com',
    phone: '9300000002',
    address: 'Chennai',
  }, state.adminToken);
  state.vendorId2 = res.body.data?.id || (await testPool.query("SELECT id FROM vendors WHERE email='po_vendor2@test.com' LIMIT 1")).rows[0]?.id;

  // Create two RFQs
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  
  res = await request('POST', '/rfqs', {
    title: 'PO RFQ 1',
    description: 'First PO test RFQ',
    quantity: 50,
    deadline: futureDate,
    status: 'PUBLISHED',
  }, state.procToken);
  state.rfqId1 = res.body.data?.id;

  res = await request('POST', '/rfqs', {
    title: 'PO RFQ 2',
    description: 'Second PO test RFQ',
    quantity: 120,
    deadline: futureDate,
    status: 'PUBLISHED',
  }, state.procToken);
  state.rfqId2 = res.body.data?.id;

  // Assign vendors
  await request('POST', `/rfqs/${state.rfqId1}/assign-vendors`, { vendorIds: [state.vendorId1] }, state.procToken);
  await request('POST', `/rfqs/${state.rfqId2}/assign-vendors`, { vendorIds: [state.vendorId2] }, state.procToken);

  // Submit quotations
  res = await request('POST', '/quotations', { rfq_id: state.rfqId1, price: 5000, delivery_days: 10, comments: 'Good deal' }, state.vendorToken1);
  state.quotId1 = res.body.data?.id;

  res = await request('POST', '/quotations', { rfq_id: state.rfqId2, price: 9000, delivery_days: 15, comments: 'Premium deal' }, state.vendorToken2);
  state.quotId2 = res.body.data?.id;

  // Select vendors
  await request('POST', `/rfqs/${state.rfqId1}/select-vendor`, { quotationId: state.quotId1 }, state.procToken);
  await request('POST', `/rfqs/${state.rfqId2}/select-vendor`, { quotationId: state.quotId2 }, state.procToken);

  // Initiate and Approve Approval requests
  res = await request('POST', '/approvals', { quotationId: state.quotId1 }, state.procToken);
  state.approvalId1 = res.body.data?.approval_id;
  await request('PATCH', `/approvals/${state.approvalId1}/approve`, { remarks: 'Approve PO test 1' }, state.mgrToken);

  console.log('  Seeding completed.');
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up PO test data...');
  try {
    const emailPattern = '%po_%@test.com';
    await testPool.query(`DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`, [emailPattern]);
    await testPool.query(`DELETE FROM activity_logs WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)`, [emailPattern]);
    
    if (state.rfqId1) await testPool.query(`DELETE FROM activity_logs WHERE entity_id = $1`, [state.rfqId1]);
    if (state.rfqId2) await testPool.query(`DELETE FROM activity_logs WHERE entity_id = $1`, [state.rfqId2]);
    if (state.approvalId1) await testPool.query(`DELETE FROM activity_logs WHERE entity_id = $1`, [state.approvalId1]);
    if (state.poId1) await testPool.query(`DELETE FROM activity_logs WHERE entity_id = $1`, [state.poId1]);

    await testPool.query(`DELETE FROM purchase_orders WHERE vendor_id IN (SELECT id FROM vendors WHERE email LIKE $1)`, [emailPattern]);
    await testPool.query(`DELETE FROM approvals WHERE quotation_id IN (SELECT id FROM quotations WHERE vendor_id IN (SELECT id FROM vendors WHERE email LIKE $1))`, [emailPattern]);
    await testPool.query(`DELETE FROM quotations WHERE vendor_id IN (SELECT id FROM vendors WHERE email LIKE $1)`, [emailPattern]);
    await testPool.query(`DELETE FROM rfq_vendors WHERE rfq_id IN (SELECT id FROM rfqs WHERE created_by IN (SELECT id FROM users WHERE email LIKE $1))`, [emailPattern]);
    await testPool.query(`DELETE FROM rfqs WHERE created_by IN (SELECT id FROM users WHERE email LIKE $1)`, [emailPattern]);
    await testPool.query(`DELETE FROM vendors WHERE email LIKE $1`, [emailPattern]);
    await testPool.query(`DELETE FROM users WHERE email LIKE $1`, [emailPattern]);
    console.log('  Cleanup complete.');
  } catch (err) {
    console.log(`  Cleanup error: ${err.message}`);
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════');
  console.log('          PURCHASE ORDER WORKFLOW TESTS        ');
  console.log('═══════════════════════════════════════════════');

  await seedTestData();

  // ── 1. PURCHASE ORDER CREATION ──
  console.log('\n📥 Test Group: Purchase Order Creation');

  // Quotation must be APPROVED (quotation 2 is only SELECTED, not APPROVED yet)
  let res = await request('POST', '/purchase-orders', { quotationId: state.quotId2 }, state.procToken);
  assert('T01 — PO creation fails for non-APPROVED quotations (400)', res.status === 400, `status=${res.status}`);

  // Only PROCUREMENT_OFFICER can create PO
  res = await request('POST', '/purchase-orders', { quotationId: state.quotId1 }, state.mgrToken);
  assert('T02 — Manager cannot create Purchase Order (403)', res.status === 403, `status=${res.status}`);

  res = await request('POST', '/purchase-orders', { quotationId: state.quotId1 }, state.vendorToken1);
  assert('T03 — Vendor cannot create Purchase Order (403)', res.status === 403, `status=${res.status}`);

  // Successful creation by Procurement Officer
  res = await request('POST', '/purchase-orders', { quotationId: state.quotId1 }, state.procToken);
  assert('T04 — PO generated successfully for approved quotation (201)', res.status === 201 && res.body.success === true, `status=${res.status}`);
  state.poId1 = res.body.data?.id;
  state.poNumber1 = res.body.data?.po_number;

  // Duplicate PO prevention
  res = await request('POST', '/purchase-orders', { quotationId: state.quotId1 }, state.procToken);
  assert('T05 — Duplicate PO generation is prevented (409)', res.status === 409, `status=${res.status}`);

  // ── 2. PO NUMBER SEQUENCING ──
  console.log('\n🔢 Test Group: PO Number Sequencing');
  assert('T06 — Generated PO number follows correct format', /^PO-\d{4}-\d{4}$/.test(state.poNumber1), `po_number=${state.poNumber1}`);

  // ── 3. PO RETRIEVAL & OWNERSHIP ──
  console.log('\n🔍 Test Group: PO Retrieval & Ownership');

  // View by Procurement Officer
  res = await request('GET', `/purchase-orders/${state.poId1}`, null, state.procToken);
  assert('T07 — Procurement officer can retrieve PO by ID', res.status === 200 && res.body.data?.id === state.poId1, `status=${res.status}`);

  // View by Manager
  res = await request('GET', `/purchase-orders/${state.poId1}`, null, state.mgrToken);
  assert('T08 — Manager can retrieve PO by ID', res.status === 200, `status=${res.status}`);

  // View by Admin
  res = await request('GET', `/purchase-orders/${state.poId1}`, null, state.adminToken);
  assert('T09 — Admin can retrieve PO by ID', res.status === 200, `status=${res.status}`);

  // View by Vendor 1 (Owner)
  res = await request('GET', `/purchase-orders/${state.poId1}`, null, state.vendorToken1);
  assert('T10 — Owner Vendor can retrieve their own PO', res.status === 200 && res.body.data?.total_amount === 5000, `status=${res.status}`);

  // View by Vendor 2 (Non-Owner)
  res = await request('GET', `/purchase-orders/${state.poId1}`, null, state.vendorToken2);
  assert('T11 — Non-owner Vendor is blocked from viewing PO (403)', res.status === 403, `status=${res.status}`);

  // ── 4. SEARCH, FILTERING, PAGINATION ──
  console.log('\n📊 Test Group: Search & Filtering');

  // List all POs
  res = await request('GET', '/purchase-orders', null, state.procToken);
  assert('T12 — Procurement officer can list purchase orders', res.status === 200 && res.body.data?.purchase_orders?.length >= 1, `count=${res.body.data?.purchase_orders?.length}`);

  // Filter by status
  res = await request('GET', '/purchase-orders?status=CREATED', null, state.procToken);
  assert('T13 — Filter by status works', res.status === 200 && res.body.data?.purchase_orders?.every(po => po.status === 'CREATED'), `status filter fail`);

  // Filter by vendorId
  res = await request('GET', `/purchase-orders?vendorId=${state.vendorId1}`, null, state.procToken);
  assert('T14 — Filter by vendorId works', res.status === 200 && res.body.data?.purchase_orders?.every(po => po.vendor.id === state.vendorId1), `vendor filter fail`);

  // Vendor listing restriction
  res = await request('GET', '/purchase-orders', null, state.vendorToken2);
  assert('T15 — Vendor listing only returns their own POs', res.status === 200 && res.body.data?.purchase_orders?.length === 0, `count=${res.body.data?.purchase_orders?.length}`);

  // ── 5. STATUS TRANSITIONS & WORKFLOW ──
  console.log('\n🔄 Test Group: Status Transitions & Actions');

  // Vendor can accept their own PO
  res = await request('PATCH', `/purchase-orders/${state.poId1}/status`, { status: 'ACCEPTED' }, state.vendorToken1);
  assert('T16 — Vendor can update status to ACCEPTED', res.status === 200 && res.body.data?.status === 'ACCEPTED', `status=${res.status}`);

  // Prevent transitions from terminal state (ACCEPTED is not terminal, but let's test transition to COMPLETED by Procurement Officer)
  res = await request('PATCH', `/purchase-orders/${state.poId1}/status`, { status: 'COMPLETED' }, state.procToken);
  assert('T17 — Procurement Officer can complete PO', res.status === 200 && res.body.data?.status === 'COMPLETED', `status=${res.body.data?.status}`);

  // Now COMPLETED is terminal, prevent further updates
  res = await request('PATCH', `/purchase-orders/${state.poId1}/status`, { status: 'SENT' }, state.procToken);
  assert('T18 — Prevent status change from terminal COMPLETED state (409)', res.status === 409, `status=${res.status}`);

  // ── 6. NOTIFICATIONS & ACTIVITY LOGS ──
  console.log('\n🔔 Test Group: Notifications & Activity Logs');

  // Notification for Vendor
  const vendorNotif = await testPool.query(
    "SELECT * FROM notifications WHERE user_id = $1 AND title = 'Purchase Order Generated' ORDER BY created_at DESC LIMIT 1",
    [state.vendorUserId1]
  );
  assert('T19 — Vendor user received notification', vendorNotif.rowCount > 0, `count=${vendorNotif.rowCount}`);

  // Activity log check
  const genLog = await testPool.query("SELECT * FROM activity_logs WHERE action = 'PURCHASE_ORDER_GENERATED' LIMIT 1");
  assert('T20 — PURCHASE_ORDER_GENERATED activity log created', genLog.rowCount > 0, `count=${genLog.rowCount}`);

  const viewLog = await testPool.query("SELECT * FROM activity_logs WHERE action = 'PURCHASE_ORDER_VIEWED' LIMIT 1");
  assert('T21 — PURCHASE_ORDER_VIEWED activity log created', viewLog.rowCount > 0, `count=${viewLog.rowCount}`);

  const statusLog = await testPool.query("SELECT * FROM activity_logs WHERE action = 'PURCHASE_ORDER_STATUS_UPDATED' LIMIT 1");
  assert('T22 — PURCHASE_ORDER_STATUS_UPDATED activity log created', statusLog.rowCount > 0, `count=${statusLog.rowCount}`);

  // ── CLEANUP ──
  await cleanupTestData();

  // ── REPORT ──
  console.log('═══════════════════════════════════════════════');
  console.log('                 PO TESTS REPORT               ');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total Tests : ${TOTAL}`);
  console.log(`  Passed      : ${PASSED}`);
  console.log(`  Failed      : ${FAILED}`);
  console.log('═══════════════════════════════════════════════\n');

  if (FAILED > 0) {
    console.log('❌ FAILED TESTS:');
    RESULTS.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}: ${r.detail}`);
    });
  } else {
    console.log('🎉 ALL PURCHASE ORDER WORKFLOW TESTS PASSED!\n');
  }

  await testPool.end();
  process.exit(FAILED > 0 ? 1 : 0);
}

runTests().catch(async (err) => {
  console.error('Test suite crashed:', err);
  await cleanupTestData().catch(() => {});
  await testPool.end().catch(() => {});
  process.exit(1);
});
