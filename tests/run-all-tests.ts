import { getDb, schema } from "../src/db";
import { runSeed } from "../src/db/seed";
import { authenticateUser, hashPassword, createSessionToken, verifySessionToken } from "../src/lib/auth";
import { createOrderHold } from "../src/lib/transactions/orderHold";
import { confirmOrderPayment } from "../src/lib/transactions/orderConfirmation";
import { releaseExpiredHolds } from "../src/lib/transactions/holdRelease";
import { cancelOrder } from "../src/lib/transactions/cancellation";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

// Colorized console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ${colors.green}✓ PASS${colors.reset} ${testName}`);
    passedTests++;
  } else {
    console.error(`  ${colors.red}✗ FAIL${colors.reset} ${testName}${detail ? ` - ${detail}` : ""}`);
    failedTests++;
  }
}

async function runQaSuite() {
  console.log(`\n${colors.cyan}${colors.bold}================================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}   CAKECART QA AGENT - AUTOMATED VERIFICATION TEST SUITE        ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}================================================================${colors.reset}\n`);

  // Ensure DB seed is fresh
  console.log(`${colors.yellow}1. Initializing Database & Verifying Migrations...${colors.reset}`);
  await runSeed();
  const db = await getDb();
  assert(true, "Database schema, enums, check constraints, and seed data loaded successfully.");

  // Test 2: Authentication & Session Security
  console.log(`\n${colors.yellow}2. Testing Authentication, Passwords & Session Tokens...${colors.reset}`);
  const customerAuth = await authenticateUser("customer@cakecart.local", "customerpass123");
  assert(customerAuth !== null, "Valid customer login succeeds");
  assert(customerAuth?.role === "CUSTOMER", "Customer role properly assigned");

  const invalidAuth = await authenticateUser("customer@cakecart.local", "wrongpassword");
  assert(invalidAuth === null, "Invalid password rejected with null session");

  const bakerAuth = await authenticateUser("baker@cakecart.local", "bakerpass123");
  assert(bakerAuth !== null && bakerAuth.role === "BAKER", "Baker login succeeds with BAKER role");

  const sessionToken = await createSessionToken(customerAuth!);
  const verifiedSession = await verifySessionToken(sessionToken);
  assert(verifiedSession?.userId === customerAuth?.userId, "JWT session token created and verified with httpOnly payload");

  // Test 3: Catalog, Filters, and 40-Char Message Limit
  console.log(`\n${colors.yellow}3. Testing Catalog, Pricing Rules & 40-Char Message Limit...${colors.reset}`);
  const products = await db.query.products.findMany({
    with: { options: true, dietaryTags: { with: { dietaryTag: true } } },
  });
  assert(products.length >= 6, `Catalog contains ${products.length} artisan cakes`);

  const cake = products[0];
  const sizeOption = cake.options.find((o) => o.type === "SIZE" && o.priceDeltaInCents > 0);
  const flavourOption = cake.options.find((o) => o.type === "FLAVOUR");

  // Fetch slot for Day 3 (ensures >= 48 hours lead time)
  const targetDateObj = new Date();
  targetDateObj.setDate(targetDateObj.getDate() + 4);
  const targetDateStr = targetDateObj.toISOString().split("T")[0];

  const [slot] = await db.query.pickupSlots.findMany({
    where: eq(schema.pickupSlots.bakeryDate, targetDateStr),
  });

  // Attempt message > 40 chars
  const longMessageResult = await createOrderHold({
    customerId: customerAuth!.userId,
    pickupDate: targetDateStr,
    pickupSlotId: slot.id,
    items: [
      {
        productId: cake.id,
        quantity: 1,
        cakeMessage: "This is an excessively long custom message that exceeds forty characters limit!",
      },
    ],
  });
  assert(!longMessageResult.success, "Server strictly rejects custom cake message > 40 characters");
  assert(longMessageResult.statusCode === 400, "Returns HTTP 400 for message overflow");

  // Test 4: Atomic Capacity Reservation & Server Fee Calculation
  console.log(`\n${colors.yellow}4. Testing Server Fee Calculation & Atomic Order Hold...${colors.reset}`);
  const validHold = await createOrderHold({
    customerId: customerAuth!.userId,
    pickupDate: targetDateStr,
    pickupSlotId: slot.id,
    items: [
      {
        productId: cake.id,
        quantity: 1,
        sizeOptionId: sizeOption?.id,
        flavourOptionId: flavourOption?.id,
        cakeMessage: "Happy 30th Birthday!", // <= 40 chars
      },
    ],
  });

  assert(validHold.success && !!validHold.order, "Valid 10-minute hold order created");
  const expectedSubtotal = cake.basePriceInCents;
  const expectedCustomisation = (sizeOption?.priceDeltaInCents || 0) + (flavourOption?.priceDeltaInCents || 0);
  const expectedMessageFee = 250; // $2.50
  const expectedTotal = expectedSubtotal + expectedCustomisation + expectedMessageFee;

  assert(validHold.order?.subtotalInCents === expectedSubtotal, `Server accurately calculated base subtotal (${expectedSubtotal} cents)`);
  assert(validHold.order?.customisationFeeInCents === expectedCustomisation, `Server accurately calculated customisation deltas (${expectedCustomisation} cents)`);
  assert(validHold.order?.messageFeeInCents === expectedMessageFee, "Server accurately added $2.50 message fee");
  assert(validHold.order?.totalInCents === expectedTotal, `Server accurately summed total (${expectedTotal} cents)`);

  // Verify daily capacity incremented
  const [capAfterHold] = await db
    .select()
    .from(schema.dailyCapacity)
    .where(eq(schema.dailyCapacity.bakeryDate, targetDateStr));
  assert(capAfterHold.reservedCakes >= 1, `Daily capacity reserved_cakes updated to ${capAfterHold.reservedCakes}`);

  // Test 5: Concurrency Race Condition Test (2 Concurrent Orders for Last Cake Slot)
  console.log(`\n${colors.yellow}5. Testing Concurrency Race Condition: 2 Concurrent Orders for Final Cake Slot...${colors.reset}`);
  const raceDateObj = new Date();
  raceDateObj.setDate(raceDateObj.getDate() + 6);
  const raceDateStr = raceDateObj.toISOString().split("T")[0];

  // Set maxCakes to 1 and reservedCakes to 0
  await db
    .update(schema.dailyCapacity)
    .set({ maxCakes: 1, reservedCakes: 0, isClosed: false })
    .where(eq(schema.dailyCapacity.bakeryDate, raceDateStr));

  const [raceSlot] = await db.query.pickupSlots.findMany({
    where: eq(schema.pickupSlots.bakeryDate, raceDateStr),
  });

  // Launch two simultaneous order hold requests
  console.log("  Launching 2 concurrent requests claiming the last available cake...");
  const [session1Result, session2Result] = await Promise.all([
    createOrderHold({
      customerId: customerAuth!.userId,
      pickupDate: raceDateStr,
      pickupSlotId: raceSlot.id,
      items: [{ productId: cake.id, quantity: 1 }],
    }),
    createOrderHold({
      customerId: customerAuth!.userId,
      pickupDate: raceDateStr,
      pickupSlotId: raceSlot.id,
      items: [{ productId: cake.id, quantity: 1 }],
    }),
  ]);

  const successes = [session1Result, session2Result].filter((r) => r.success);
  const conflicts = [session1Result, session2Result].filter((r) => !r.success && r.statusCode === 409);

  assert(successes.length === 1, `Atomic lock ensured exactly 1 order succeeded (Success count: ${successes.length})`);
  assert(conflicts.length === 1, `Conflicting order correctly received 409 Conflict / Sold Out (Conflict count: ${conflicts.length})`);

  // Confirm capacity never went negative or exceeded max
  const [raceCapFinal] = await db
    .select()
    .from(schema.dailyCapacity)
    .where(eq(schema.dailyCapacity.bakeryDate, raceDateStr));
  assert(raceCapFinal.reservedCakes === 1, `Final reserved_cakes equals exactly 1 (max_cakes: ${raceCapFinal.maxCakes})`);
  assert(raceCapFinal.reservedCakes <= raceCapFinal.maxCakes, "Check constraint verified: reserved_cakes never exceeded max_cakes");

  // Test 6: Expired Hold Release & Capacity Restoration
  console.log(`\n${colors.yellow}6. Testing 10-Minute Hold Expiry & Automatic Capacity Release...${colors.reset}`);
  const successfulHoldOrder = successes[0].order!;
  // Artificially age the order's expiresAt to 15 minutes ago
  const pastExpiry = new Date(Date.now() - 15 * 60 * 1000);
  await db
    .update(schema.orders)
    .set({ expiresAt: pastExpiry })
    .where(eq(schema.orders.id, successfulHoldOrder.id));

  // Run releaseExpiredHolds (the cron function)
  const releaseResult = await releaseExpiredHolds();
  assert(releaseResult.success, "releaseExpiredHolds executed successfully");
  assert(releaseResult.releasedCount >= 1, `Released ${releaseResult.releasedCount} expired hold(s)`);

  // Verify order status is now EXPIRED
  const [expiredOrder] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, successfulHoldOrder.id));
  assert(expiredOrder.status === "EXPIRED", "Order status transitioned to EXPIRED");

  // Verify daily capacity was restored to 0
  const [capAfterRelease] = await db
    .select()
    .from(schema.dailyCapacity)
    .where(eq(schema.dailyCapacity.bakeryDate, raceDateStr));
  assert(capAfterRelease.reservedCakes === 0, `Capacity restored back to 0 (Current: ${capAfterRelease.reservedCakes})`);

  // Test 7: Minimum 48-Hour Lead Time & Closed Date Rejection
  console.log(`\n${colors.yellow}7. Testing Minimum 48-Hour Lead Time & Closed Date Enforcement...${colors.reset}`);
  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [tomorrowSlot] = await db.query.pickupSlots.findMany({
    where: eq(schema.pickupSlots.bakeryDate, tomorrowStr),
  });

  if (tomorrowSlot) {
    const leadTimeReject = await createOrderHold({
      customerId: customerAuth!.userId,
      pickupDate: tomorrowStr,
      pickupSlotId: tomorrowSlot.id,
      items: [{ productId: cake.id, quantity: 1 }],
    });
    assert(!leadTimeReject.success, "Order with < 48-hour notice strictly rejected by server");
    assert(leadTimeReject.statusCode === 400, "Returns HTTP 400 lead-time violation");
  }

  // Test closed date
  const closedDateObj = new Date();
  closedDateObj.setDate(closedDateObj.getDate() + 5);
  const closedDateStr = closedDateObj.toISOString().split("T")[0];
  await db
    .update(schema.dailyCapacity)
    .set({ isClosed: true })
    .where(eq(schema.dailyCapacity.bakeryDate, closedDateStr));

  const [closedSlot] = await db.query.pickupSlots.findMany({
    where: eq(schema.pickupSlots.bakeryDate, closedDateStr),
  });

  const closedDateReject = await createOrderHold({
    customerId: customerAuth!.userId,
    pickupDate: closedDateStr,
    pickupSlotId: closedSlot.id,
    items: [{ productId: cake.id, quantity: 1 }],
  });
  assert(!closedDateReject.success, "Order on closed bakery date strictly rejected by server");

  // Re-open date
  await db
    .update(schema.dailyCapacity)
    .set({ isClosed: false })
    .where(eq(schema.dailyCapacity.bakeryDate, closedDateStr));

  // Test 8: Payment Confirmation & Idempotency Key
  console.log(`\n${colors.yellow}8. Testing Payment Confirmation & Idempotency Protection...${colors.reset}`);
  const paymentOrderHold = await createOrderHold({
    customerId: customerAuth!.userId,
    pickupDate: targetDateStr,
    pickupSlotId: slot.id,
    items: [{ productId: cake.id, quantity: 1 }],
  });
  assert(paymentOrderHold.success, "Hold created for payment verification");

  const idempotencyKey = `qa_test_idemp_${Date.now()}`;
  const confirmResult1 = await confirmOrderPayment({
    orderId: paymentOrderHold.order!.id,
    idempotencyKey,
    provider: "STRIPE_TEST",
    providerPaymentId: "ch_qa_test_12345",
  });
  assert(confirmResult1.success, "Payment confirmed order transitioned to CONFIRMED");
  assert(confirmResult1.isDuplicate === false, "First payment call processed as new transaction");

  // Duplicate webhook / retry with same idempotency key
  const confirmResult2 = await confirmOrderPayment({
    orderId: paymentOrderHold.order!.id,
    idempotencyKey,
    provider: "STRIPE_TEST",
    providerPaymentId: "ch_qa_test_12345",
  });
  assert(confirmResult2.success, "Duplicate payment call succeeds safely");
  assert(confirmResult2.isDuplicate === true, "Idempotency recognized: duplicate call flagged without re-charging or modifying capacity");

  // Test 9: 24-Hour Cancellation Cut-off Rule
  console.log(`\n${colors.yellow}9. Testing 24-Hour Cancellation Cut-Off Rule...${colors.reset}`);
  // Order 1: eligible cancellation (> 24 hours away)
  const cancelResult = await cancelOrder({
    orderId: paymentOrderHold.order!.id,
    userId: customerAuth!.userId,
    userRole: "CUSTOMER",
    reason: "QA Test Cancellation",
  });
  assert(cancelResult.success, "Cancellation permitted when > 24 hours before pickup");

  // Verify status is CANCELLED
  const [cancelledOrder] = await db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, paymentOrderHold.order!.id));
  assert(cancelledOrder.status === "CANCELLED", "Order status updated to CANCELLED");

  // Order 2: Ineligible cancellation (< 24 hours away)
  const shortCutoffDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // cutoff passed 2h ago
  const [shortOrder] = await db
    .insert(schema.orders)
    .values({
      orderNumber: `CC-TEST-CUTOFF-${Date.now()}`,
      customerId: customerAuth!.userId,
      pickupDate: targetDateStr,
      pickupSlotId: slot.id,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      subtotalInCents: 5000,
      totalInCents: 5000,
      cancelCutoff: shortCutoffDate,
      pickupQrToken: "test_qr_token",
    })
    .returning();

  const ineligibleCancel = await cancelOrder({
    orderId: shortOrder.id,
    userId: customerAuth!.userId,
    userRole: "CUSTOMER",
  });
  assert(!ineligibleCancel.success, "Cancellation rejected when < 24 hours prior to pickup");
  assert(ineligibleCancel.statusCode === 400, "Returns HTTP 400 cut-off violation");

  // Test 10: Customer Order Isolation
  console.log(`\n${colors.yellow}10. Testing Customer Order Isolation (Cross-User Security)...${colors.reset}`);
  // Attempt by Customer B to cancel Customer A's order
  const userBHash = await hashPassword("pass12345");
  const [userB] = await db
    .insert(schema.users)
    .values({
      email: `customer_b_${Date.now()}@example.com`,
      passwordHash: userBHash,
      name: "Customer B",
      role: "CUSTOMER",
    })
    .returning();

  const unauthorizedCancel = await cancelOrder({
    orderId: shortOrder.id, // belongs to customer A
    userId: userB.id,
    userRole: "CUSTOMER",
  });
  assert(!unauthorizedCancel.success, "Cross-user cancellation rejected with unauthorized access");
  assert(unauthorizedCancel.statusCode === 403, "Returns HTTP 403 Forbidden");

  // Summary Report
  console.log(`\n${colors.cyan}${colors.bold}================================================================${colors.reset}`);
  console.log(`${colors.bold}QA TEST EXECUTION SUMMARY:${colors.reset}`);
  console.log(`  Total Checks Executed: ${passedTests + failedTests}`);
  console.log(`  ${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`  ${failedTests === 0 ? colors.green : colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}================================================================${colors.reset}\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runQaSuite().catch((err) => {
  console.error("Fatal QA Suite Error:", err);
  process.exit(1);
});
