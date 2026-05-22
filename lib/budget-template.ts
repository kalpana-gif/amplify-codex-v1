import type { BudgetSetupInput, CategoryInput, CurrencyCode, LineItemInput } from "@/types";

const createLineItem = (
  description: string,
  plannedAmount: number,
  notes?: string,
): LineItemInput => ({
  description,
  plannedAmount,
  notes,
});

const createCategory = (
  id: string,
  name: string,
  plannedAmount: number,
  color: string,
  lineItems: LineItemInput[],
): CategoryInput => ({
  id,
  name,
  plannedAmount,
  color,
  lineItems,
});

export const SINHALA_TAMIL_NY_TEMPLATE_NAME = "Sinhala & Tamil NY";
export const SINHALA_TAMIL_NY_TEMPLATE_CURRENCY: CurrencyCode = "LKR";
export const YEAR_END_PARTY_TEMPLATE_NAME = "Year End Party";
export const YEAR_END_PARTY_TEMPLATE_CURRENCY: CurrencyCode = "LKR";
export const SINHALA_TAMIL_NY_BREAKFAST_TEMPLATE_NAME =
  "Sinhala & Tamil NY Breakfast";
export const SINHALA_TAMIL_NY_BREAKFAST_TEMPLATE_CURRENCY: CurrencyCode = "LKR";
export const ANNUAL_TRIP_TEMPLATE_NAME = "Annual Trip 2025";
export const ANNUAL_TRIP_TEMPLATE_CURRENCY: CurrencyCode = "LKR";

export type BudgetTemplatePreset = {
  id: string;
  name: string;
  description: string;
  setup: BudgetSetupInput;
};

export const sinhalaTamilNyBudgetTemplate: BudgetSetupInput = {
  totalAmount: 1017500,
  currency: SINHALA_TAMIL_NY_TEMPLATE_CURRENCY,
  categories: [
    createCategory("food", "Food", 275000, "#1E3A5F", [
      createLineItem(
        "Meal service",
        275000,
        "Source sheet: Budget Overview. Per person LKR 5,500 x 50. Legacy actual: LKR 245,000.",
      ),
    ]),
    createCategory("drinks-alcohol", "Drinks (Alcohol)", 33000, "#2E75B6", [
      createLineItem(
        "Alcohol service",
        33000,
        "Source sheet: Budget Overview. Legacy actual: LKR 33,025.",
      ),
    ]),
    createCategory("bbq-bites", "BBQ/Bites/soft drinks", 100000, "#16A34A", [
      createLineItem("Chicken", 33165, "Rate per kg: LKR 5,527.50 x 6 kg."),
      createLineItem("Pork", 29480, "Rate per kg: LKR 5,896 x 5 kg."),
      createLineItem("Sausages", 14916, "Rate per kg: LKR 4,972 x 3 kg."),
      createLineItem("Mushroom", 9944, "Rate per kg: LKR 4,972 x 2 kg."),
      createLineItem(
        "Fruit platter and soft drinks reserve",
        12495,
        "Fruit platter quantities: Watermelon 5, Guava 8, Apple 15, Orange 15.",
      ),
    ]),
    createCategory("games-gifts", "Games and Gifts", 80000, "#F0A500", [
      createLineItem("Stashes / crown", 6000),
      createLineItem("Kottapora", 3000, "Unit cost: LKR 3,000 x 1."),
      createLineItem("Kanamutti", 5000, "Unit cost: LKR 5,000 x 1."),
      createLineItem("Musical chair", 5000, "Unit cost: LKR 5,000 x 1."),
      createLineItem("Aurudu kumara / kumari", 10000, "Unit cost: LKR 5,000 x 2."),
      createLineItem("Kaba adeema", 16000, "Unit cost: LKR 2,000 x 8."),
      createLineItem("Andaya kiri", 10000, "Unit cost: LKR 5,000 x 2."),
      createLineItem("Bitthara pass", 10000, "Unit cost: LKR 5,000 x 2."),
      createLineItem("Pani babare", 10000, "Unit cost: LKR 2,000 x 5."),
      createLineItem("Aliyata aha thebima", 3000, "Unit cost: LKR 3,000 x 1."),
      createLineItem(
        "Games and gifts reserve",
        2000,
        "Workbook line-item total was LKR 78,000 against an LKR 80,000 category budget.",
      ),
    ]),
    createCategory("photography", "Photography", 35000, "#DC2626", [
      createLineItem(
        "Photography package",
        35000,
        "Budget Overview note: per person LKR 2,500 x 2. Legacy actual: LKR 35,025.",
      ),
    ]),
    createCategory("decoration", "Decoration", 20000, "#0F766E", [
      createLineItem(
        "Decor package",
        20000,
        "Source sheet: Budget Overview. Legacy actual: LKR 19,025.",
      ),
    ]),
    createCategory("employee-gifts", "Gifts for All employee", 292500, "#6B7280", [
      createLineItem(
        "Employee gifts",
        292500,
        "Per person LKR 6,500 x 45. Legacy actual: LKR 230,625.",
      ),
    ]),
    createCategory("event-package", "Event Coordinator / Package", 60000, "#C2410C", [
      createLineItem(
        "Event package",
        60000,
        "Source sheet: Budget Overview. Legacy actual: LKR 60,000.",
      ),
    ]),
    createCategory("host", "Host", 30000, "#4F46E5", [
      createLineItem(
        "Host fee",
        30000,
        "Source sheet: Budget Overview. Legacy actual: LKR 25,025.",
      ),
    ]),
    createCategory("bartender", "Bartender", 3500, "#BE185D", [
      createLineItem("Bartender", 3500, "Per person LKR 3,500 x 1."),
    ]),
    createCategory("advance-payment", "Advance Payment", 60000, "#047857", [
      createLineItem(
        "Advance payment",
        60000,
        "Payment reference captured in workbook as 12870. Legacy payment amount: LKR 47,130.",
      ),
    ]),
    createCategory("other", "Other", 28500, "#7C3AED", [
      createLineItem(
        "Other operating costs",
        28500,
        "Source sheet: Budget Overview. Legacy actual: LKR 16,045.",
      ),
    ]),
  ],
};

export const yearEndPartyBudgetTemplate: BudgetSetupInput = {
  totalAmount: 997363.22,
  currency: YEAR_END_PARTY_TEMPLATE_CURRENCY,
  categories: [
    createCategory("hotel", "Hotel", 427603.26, "#1E3A5F", [
      createLineItem(
        "Hotel package",
        427603.26,
        "Source sheet: Budget, row 4. LKR 7,372.47 x 58 guests.",
      ),
    ]),
    createCategory("bites", "Bites", 76003.46, "#16A34A", [
      createLineItem("Chicken", 26138.75, "Source sheet: Budget, row 30. LKR 5,227.75 x 5."),
      createLineItem("Handallo", 18498.21, "Source sheet: Budget, row 31. LKR 6,166.07 x 3."),
      createLineItem(
        "French fries",
        17291.79,
        "Source sheet: Budget, row 32. LKR 5,763.93 x 3.",
      ),
      createLineItem("Sausage", 14074.71, "Source sheet: Budget, row 33. LKR 4,691.57 x 3."),
    ]),
    createCategory("band-meal", "Band with Meal", 155000, "#C2410C", [
      createLineItem(
        "Band package with meal",
        155000,
        "Source sheet: Budget, row 7. Actual formula in workbook: 70,000 + 85,000 - 50,000.",
      ),
    ]),
    createCategory("photographer-meal", "Meal - Photographer", 5000, "#2E75B6", [
      createLineItem(
        "Photographer meal",
        5000,
        "Source sheet: Budget, row 8. LKR 2,500 x 2.",
      ),
    ]),
    createCategory(
      "photography-videography",
      "Photography & Videography",
      30000,
      "#DC2626",
      [
        createLineItem(
          "Photography and videography package",
          30000,
          "Source sheet: Budget, row 9.",
        ),
      ],
    ),
    createCategory("backdrop", "Decoration - Backdrop", 34000, "#0F766E", [
      createLineItem(
        "Backdrop decor",
        34000,
        "Source sheet: Budget, row 10.",
      ),
    ]),
    createCategory("centrepiece", "Centrepiece", 20000, "#14B8A6", [
      createLineItem("Centrepieces", 20000, "Source sheet: Budget, row 11."),
    ]),
    createCategory("props", "Diary, pen & props", 85756.5, "#6B7280", [
      createLineItem(
        "Diary, pen and props pack",
        85756.5,
        "Source sheet: Budget, row 12.",
      ),
    ]),
    createCategory("soft-drinks", "Soft Drinks", 20000, "#06B6D4", [
      createLineItem(
        "Soft drinks",
        20000,
        "Source sheet: Budget, row 13. Workbook also tracked a separate detail section for drinks and bites.",
      ),
    ]),
    createCategory("liquor", "Liquor", 74000, "#7C3AED", [
      createLineItem(
        "Liquor service",
        74000,
        "Source sheet: Budget, row 14. Actual formula in workbook: 64,400 + 9,600.",
      ),
    ]),
    createCategory("mr-ms-novigi", "Mr & Ms Novigi", 10000, "#F59E0B", [
      createLineItem(
        "Mr & Ms Novigi vouchers",
        10000,
        "Source sheet: Budget, row 15. Workbook note: Thyaga 5K.",
      ),
    ]),
    createCategory("raffle", "Raffle", 40000, "#BE185D", [
      createLineItem(
        "Raffle vouchers and prizes",
        40000,
        "Source sheet: Budget, row 16. Workbook actual formula totaled LKR 40,500.",
      ),
    ]),
    createCategory("extra", "Extra", 20000, "#047857", [
      createLineItem("Extra reserve", 20000, "Source sheet: Budget, row 17."),
    ]),
  ],
};

export const sinhalaTamilNyBreakfastBudgetTemplate: BudgetSetupInput = {
  totalAmount: 112750,
  currency: SINHALA_TAMIL_NY_BREAKFAST_TEMPLATE_CURRENCY,
  categories: [
    createCategory("breakfast-spread", "Breakfast Spread", 65500, "#1E3A5F", [
      createLineItem(
        "Milk Rice and Katta sambol",
        19250,
        "Source sheet: Sheet1, row 3. Mom's Kitchen, LKR 175 x 110.",
      ),
      createLineItem(
        "Seeni sambol",
        4250,
        "Source sheet: Sheet1, row 4. Mom's Kitchen, LKR 1,700 x 2.5.",
      ),
      createLineItem(
        "Ambul Thiyal",
        12000,
        "Source sheet: Sheet1, row 5. Mom's Kitchen, LKR 4,000 x 3.",
      ),
      createLineItem("Kokis", 5500, "Source sheet: Sheet1, row 6. Mom's Kitchen."),
      createLineItem("Mun Kavum", 5400, "Source sheet: Sheet1, row 7. Mom's Kitchen."),
      createLineItem("Cake", 4800, "Source sheet: Sheet1, row 8. Mom's Kitchen."),
      createLineItem("Asmi", 1000, "Source sheet: Sheet1, row 9. Supplier: Samadhi."),
      createLineItem("Fish Cutlet", 7800, "Source sheet: Sheet1, row 10. Mom's Kitchen."),
      createLineItem("Vegi Cutlet", 1300, "Source sheet: Sheet1, row 11. Mom's Kitchen."),
      createLineItem("Aluwa", 3250, "Source sheet: Sheet1, row 15. Mom's Kitchen."),
      createLineItem(
        "Pani walalu / sweets reserve",
        950,
        "Workbook listed Poorni as the source without an amount; reserve added so the category matches the planned subtotal of LKR 65,500.",
      ),
    ]),
    createCategory("fruit-sweets", "Fruit & Sweets", 8160, "#F0A500", [
      createLineItem("Banana", 1160, "Source sheet: Sheet1, row 12. Supplier: Keells."),
      createLineItem("Laddu", 7000, "Source sheet: Sheet1, row 13. Supplier: Ananda bawan."),
    ]),
    createCategory("contingency", "Contingency", 39090, "#047857", [
      createLineItem(
        "Breakfast budget reserve",
        39090,
        "Workbook budget was LKR 112,750 against an itemized subtotal of LKR 73,660.",
      ),
    ]),
  ],
};

export const annualTripBudgetTemplate: BudgetSetupInput = {
  totalAmount: 1712600,
  currency: ANNUAL_TRIP_TEMPLATE_CURRENCY,
  categories: [
    createCategory("hotel", "Hotel", 1288200, "#1E3A5F", [
      createLineItem(
        "Triple rooms",
        1103200,
        "Source sheet: Budget side table. LKR 78,800 x 14 rooms.",
      ),
      createLineItem(
        "Double rooms",
        183000,
        "Source sheet: Budget side table. LKR 61,000 x 3 rooms.",
      ),
      createLineItem(
        "Driver meal",
        2000,
        "Source sheet: Budget side table. LKR 1,000 x 2.",
      ),
    ]),
    createCategory("transport", "Transport", 200900, "#2E75B6", [
      createLineItem("Transport", 200900, "Source sheet: Budget, row 4."),
    ]),
    createCategory("soft-drinks", "Soft Drinks", 25000, "#06B6D4", [
      createLineItem(
        "Soft drinks",
        25000,
        "Source sheet: Budget, row 5. Actual workbook detail: 1,560 + 2,810 + 1,440 + 740 + 1,200.",
      ),
    ]),
    createCategory("bites", "Bites", 20000, "#16A34A", [
      createLineItem("Bites", 20000, "Source sheet: Budget, row 6."),
    ]),
    createCategory("hard-liquor", "Hard liqour", 57500, "#7C3AED", [
      createLineItem(
        "Hard liquor",
        57500,
        "Source sheet: Budget, row 7. Planned formula in workbook: 80,000 - 36,000 + 13,500.",
      ),
    ]),
    createCategory("wine", "Vine", 11000, "#A855F7", [
      createLineItem("Wine", 11000, "Source sheet: Budget, row 8."),
    ]),
    createCategory("driver-tip", "Driver tip", 5000, "#C2410C", [
      createLineItem("Driver tip", 5000, "Source sheet: Budget, row 9."),
    ]),
    createCategory("highway-charges", "Highway charges", 5000, "#F59E0B", [
      createLineItem("Highway charges", 5000, "Source sheet: Budget, row 10."),
    ]),
    createCategory("meal", "Meal", 100000, "#DC2626", [
      createLineItem(
        "Trip meal budget",
        100000,
        "Source sheet: Budget, row 11. LKR 2,000 x 50 attendees.",
      ),
    ]),
  ],
};

export const budgetTemplatePresets: BudgetTemplatePreset[] = [
  {
    id: "sinhala-tamil-ny",
    name: SINHALA_TAMIL_NY_TEMPLATE_NAME,
    description: "Full event structure seeded from the Sinhala & Tamil NY workbook.",
    setup: sinhalaTamilNyBudgetTemplate,
  },
  {
    id: "year-end-party",
    name: YEAR_END_PARTY_TEMPLATE_NAME,
    description: "Hotel, entertainment, and gifting plan extracted from the 2025 year-end party workbook.",
    setup: yearEndPartyBudgetTemplate,
  },
  {
    id: "sinhala-tamil-ny-breakfast",
    name: SINHALA_TAMIL_NY_BREAKFAST_TEMPLATE_NAME,
    description: "Breakfast table budget with detailed catering line items and contingency.",
    setup: sinhalaTamilNyBreakfastBudgetTemplate,
  },
  {
    id: "annual-trip-2025",
    name: ANNUAL_TRIP_TEMPLATE_NAME,
    description: "Trip lodging, travel, and F&B budget structure based on the 2025 annual trip workbook.",
    setup: annualTripBudgetTemplate,
  },
];

export const cloneBudgetSetup = (setup: BudgetSetupInput): BudgetSetupInput => ({
  totalAmount: setup.totalAmount,
  currency: setup.currency,
  categories: setup.categories.map((category) => ({
    ...category,
    id: crypto.randomUUID(),
    lineItems: category.lineItems?.map((lineItem) => ({ ...lineItem })),
  })),
});
