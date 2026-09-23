import { getDb, schema } from "./index";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

export async function runSeed() {
  console.log("Starting CakeCart database seeding...");
  const db = await getDb();

  // 1. Create Baker and Customer Users
  console.log("Seeding users...");
  const passwordSalt = await bcrypt.genSalt(10);
  const bakerHash = await bcrypt.hash("bakerpass123", passwordSalt);
  const customerHash = await bcrypt.hash("customerpass123", passwordSalt);

  // Upsert Baker
  const [baker] = await db
    .insert(schema.users)
    .values({
      email: "baker@cakecart.local",
      passwordHash: bakerHash,
      name: "Chef Aurelia Delacroix",
      phone: "+1 (555) 234-5678",
      role: "BAKER",
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        name: "Chef Aurelia Delacroix",
        role: "BAKER",
        passwordHash: bakerHash,
      },
    })
    .returning();

  // Upsert Customer
  const [customer] = await db
    .insert(schema.users)
    .values({
      email: "customer@cakecart.local",
      passwordHash: customerHash,
      name: "Elena Rostova",
      phone: "+1 (555) 876-5432",
      role: "CUSTOMER",
    })
    .onConflictDoUpdate({
      target: schema.users.email,
      set: {
        name: "Elena Rostova",
        role: "CUSTOMER",
        passwordHash: customerHash,
      },
    })
    .returning();

  console.log(`Created users: Baker (${baker.email}), Customer (${customer.email})`);

  // 2. Seed Categories
  console.log("Seeding categories...");
  const categoryData = [
    { name: "Celebration Cakes", slug: "celebration-cakes", description: "Multi-layered showstoppers for birthdays, anniversaries, and milestones.", displayOrder: 1 },
    { name: "Artisan Cheesecakes", slug: "artisan-cheesecakes", description: "Velvety, slow-baked New York style & Basque burnt cheesecakes.", displayOrder: 2 },
    { name: "Dietary & Allergen-Friendly", slug: "dietary-friendly", description: "Decadent creations crafted without gluten, eggs, or nuts.", displayOrder: 3 },
    { name: "Signature Mini & Bundt", slug: "mini-bundt", description: "Intimate treats and heritage recipes infused with seasonal fruits.", displayOrder: 4 },
  ];

  const seededCategories: Record<string, string> = {};
  for (const cat of categoryData) {
    const [inserted] = await db
      .insert(schema.categories)
      .values(cat)
      .onConflictDoUpdate({
        target: schema.categories.slug,
        set: { name: cat.name, description: cat.description, displayOrder: cat.displayOrder },
      })
      .returning();
    seededCategories[cat.slug] = inserted.id;
  }

  // 3. Seed Dietary Tags
  console.log("Seeding dietary tags...");
  const dietaryData = [
    { name: "Eggless", slug: "eggless", description: "Baked without any egg products, moist and airy." },
    { name: "Gluten-Free", slug: "gluten-free", description: "Certified gluten-free flours with exquisite crumb." },
    { name: "Nut-Free", slug: "nut-free", description: "Prepared in a dedicated nut-conscious environment." },
    { name: "Vegan", slug: "vegan", description: "100% plant-based dairy-free and egg-free ingredients." },
  ];

  const seededDietary: Record<string, string> = {};
  for (const tag of dietaryData) {
    const [inserted] = await db
      .insert(schema.dietaryTags)
      .values(tag)
      .onConflictDoUpdate({
        target: schema.dietaryTags.slug,
        set: { name: tag.name, description: tag.description },
      })
      .returning();
    seededDietary[tag.slug] = inserted.id;
  }

  // 4. Seed Products (Cakes)
  console.log("Seeding cakes and options...");
  const productsData = [
    {
      name: "Wild Berry Champagne Chiffon",
      slug: "wild-berry-champagne-chiffon",
      description: "Airy champagne-infused sponge layered with macerated wild blackberries, raspberry coulis, and silky vanilla bean mascarpone frosting.",
      basePriceInCents: 5800, // $58.00
      imageUrl: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80",
      minLeadTimeHours: 48,
      categorySlugs: ["celebration-cakes"],
      dietarySlugs: ["nut-free"],
      sizes: [
        { name: "6-inch (Serves 6-8)", priceDeltaInCents: 0 },
        { name: "8-inch (Serves 12-16)", priceDeltaInCents: 1800 },
        { name: "10-inch (Serves 20-24)", priceDeltaInCents: 3600 },
        { name: "2-Tier (Serves 30-36)", priceDeltaInCents: 7500 },
      ],
      flavours: [
        { name: "Madagascar Vanilla Bean & Blackberry", priceDeltaInCents: 0 },
        { name: "Raspberry Champagne Mousse", priceDeltaInCents: 400 },
        { name: "White Chocolate Rosewater", priceDeltaInCents: 500 },
      ],
    },
    {
      name: "Belgian Noir Truffle & Espresso",
      slug: "belgian-noir-truffle-espresso",
      description: "Rich 70% Callebaut dark chocolate sponge, espresso ganache velvet soak, toasted hazelnut crumble, and glossy dark mirror glaze.",
      basePriceInCents: 6400, // $64.00
      imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
      minLeadTimeHours: 48,
      categorySlugs: ["celebration-cakes"],
      dietarySlugs: ["eggless"],
      sizes: [
        { name: "6-inch (Serves 6-8)", priceDeltaInCents: 0 },
        { name: "8-inch (Serves 12-16)", priceDeltaInCents: 2000 },
        { name: "10-inch (Serves 20-24)", priceDeltaInCents: 4000 },
      ],
      flavours: [
        { name: "Dark Chocolate & Arabica Espresso", priceDeltaInCents: 0 },
        { name: "Salted Caramel Chocolate Fudge", priceDeltaInCents: 450 },
        { name: "Mocha Orange Liqueur", priceDeltaInCents: 600 },
      ],
    },
    {
      name: "Basque Burnt Caramel Cheesecake",
      slug: "basque-burnt-caramel-cheesecake",
      description: "Carefully caramelized Spanish-style cheesecake with a deeply bronzed exterior, custardy melting center, and smoked sea salt caramel drizzle.",
      basePriceInCents: 5200, // $52.00
      imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80",
      minLeadTimeHours: 48,
      categorySlugs: ["artisan-cheesecakes", "dietary-friendly"],
      dietarySlugs: ["gluten-free", "nut-free"],
      sizes: [
        { name: "7-inch (Serves 8-10)", priceDeltaInCents: 0 },
        { name: "9-inch (Serves 14-16)", priceDeltaInCents: 2200 },
      ],
      flavours: [
        { name: "Traditional Basque Cream", priceDeltaInCents: 0 },
        { name: "Tahitian Vanilla & Smoked Honey", priceDeltaInCents: 400 },
        { name: "Pistachio Praline Swirl", priceDeltaInCents: 600 },
      ],
    },
    {
      name: "Lemon Thyme & Lavender Cloud",
      slug: "lemon-thyme-lavender-cloud",
      description: "Delicate lemon curd infused with garden thyme, French culinary lavender buttercream, and Earl Grey chiffon crumb.",
      basePriceInCents: 5600, // $56.00
      imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80",
      minLeadTimeHours: 48,
      categorySlugs: ["celebration-cakes", "dietary-friendly"],
      dietarySlugs: ["eggless", "nut-free"],
      sizes: [
        { name: "6-inch (Serves 6-8)", priceDeltaInCents: 0 },
        { name: "8-inch (Serves 12-16)", priceDeltaInCents: 1800 },
      ],
      flavours: [
        { name: "Lemon Curd & Sweet Lavender", priceDeltaInCents: 0 },
        { name: "Meyer Lemon & Blueberry Compote", priceDeltaInCents: 400 },
      ],
    },
    {
      name: "Spiced Carrot & Pecan Velvet",
      slug: "spiced-carrot-pecan-velvet",
      description: "Heirloom Dutch carrots folded with Ceylon cinnamon, freshly grated nutmeg, candied ginger, and brown-butter cream cheese frosting.",
      basePriceInCents: 6000, // $60.00
      imageUrl: "https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=800&q=80",
      minLeadTimeHours: 48,
      categorySlugs: ["celebration-cakes"],
      dietarySlugs: ["eggless"],
      sizes: [
        { name: "6-inch (Serves 6-8)", priceDeltaInCents: 0 },
        { name: "8-inch (Serves 12-16)", priceDeltaInCents: 2000 },
        { name: "10-inch (Serves 20-24)", priceDeltaInCents: 3800 },
      ],
      flavours: [
        { name: "Brown Butter Cream Cheese", priceDeltaInCents: 0 },
        { name: "Orange Blossom & Maple Glaze", priceDeltaInCents: 400 },
      ],
    },
    {
      name: "Plant-Based Strawberry Matcha Silk",
      slug: "plant-based-strawberry-matcha-silk",
      description: "Ceremonial grade Uji matcha sponge, layers of fresh organic strawberry compote, and light whipped coconut diplomat cream.",
      basePriceInCents: 6200, // $62.00
      imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
      minLeadTimeHours: 48,
      categorySlugs: ["dietary-friendly"],
      dietarySlugs: ["vegan", "eggless", "gluten-free", "nut-free"],
      sizes: [
        { name: "6-inch (Serves 6-8)", priceDeltaInCents: 0 },
        { name: "8-inch (Serves 12-16)", priceDeltaInCents: 1900 },
      ],
      flavours: [
        { name: "Ceremonial Matcha & Strawberry", priceDeltaInCents: 0 },
        { name: "Matcha White Chocolate & Yuzu", priceDeltaInCents: 500 },
      ],
    },
  ];

  for (const prod of productsData) {
    const [insertedProd] = await db
      .insert(schema.products)
      .values({
        name: prod.name,
        slug: prod.slug,
        description: prod.description,
        basePriceInCents: prod.basePriceInCents,
        imageUrl: prod.imageUrl,
        isActive: true,
        minLeadTimeHours: prod.minLeadTimeHours,
      })
      .onConflictDoUpdate({
        target: schema.products.slug,
        set: {
          name: prod.name,
          description: prod.description,
          basePriceInCents: prod.basePriceInCents,
          imageUrl: prod.imageUrl,
          minLeadTimeHours: prod.minLeadTimeHours,
        },
      })
      .returning();

    // Link Categories
    for (const catSlug of prod.categorySlugs) {
      const catId = seededCategories[catSlug];
      if (catId) {
        await db
          .insert(schema.productCategories)
          .values({ productId: insertedProd.id, categoryId: catId })
          .onConflictDoNothing();
      }
    }

    // Link Dietary Tags
    for (const dietSlug of prod.dietarySlugs) {
      const dietId = seededDietary[dietSlug];
      if (dietId) {
        await db
          .insert(schema.productDietaryTags)
          .values({ productId: insertedProd.id, dietaryTagId: dietId })
          .onConflictDoNothing();
      }
    }

    // Add Options (Sizes and Flavours)
    let displayOrder = 1;
    for (const size of prod.sizes) {
      await db
        .insert(schema.productOptions)
        .values({
          productId: insertedProd.id,
          type: "SIZE",
          name: size.name,
          priceDeltaInCents: size.priceDeltaInCents,
          isAvailable: true,
          displayOrder: displayOrder++,
        })
        .onConflictDoNothing();
    }

    displayOrder = 1;
    for (const flv of prod.flavours) {
      await db
        .insert(schema.productOptions)
        .values({
          productId: insertedProd.id,
          type: "FLAVOUR",
          name: flv.name,
          priceDeltaInCents: flv.priceDeltaInCents,
          isAvailable: true,
          displayOrder: displayOrder++,
        })
        .onConflictDoNothing();
    }
  }

  // 5. Seed Daily Capacity and Pickup Slots for the Next 14 Days
  console.log("Seeding daily capacity and pickup slots for the next 14 days...");
  const slotWindows = [
    { start: "10:00", end: "12:00", max: 4 },
    { start: "12:00", end: "14:00", max: 4 },
    { start: "14:00", end: "16:00", max: 4 },
    { start: "16:00", end: "18:00", max: 4 },
  ];

  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + i);
    const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // Insert or update daily capacity
    const [cap] = await db
      .insert(schema.dailyCapacity)
      .values({
        bakeryDate: dateStr,
        maxCakes: 12, // Daily capacity limit
        reservedCakes: 0,
        isClosed: false,
      })
      .onConflictDoUpdate({
        target: schema.dailyCapacity.bakeryDate,
        set: {
          maxCakes: 12,
        },
      })
      .returning();

    // Insert 4 pickup slots per day
    for (const slot of slotWindows) {
      await db
        .insert(schema.pickupSlots)
        .values({
          bakeryDate: dateStr,
          startTime: slot.start,
          endTime: slot.end,
          maxOrders: slot.max,
          reservedOrders: 0,
          isActive: true,
        })
        .onConflictDoNothing();
    }
  }

  console.log("CakeCart database seeded successfully!");
}

// Allow direct execution
if (require.main === module || process.argv[1]?.includes("seed.ts")) {
  runSeed()
    .then(() => {
      console.log("Seeding process completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
