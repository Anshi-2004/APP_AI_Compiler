import type {
  Project,
  PipelineRun,
  ValidationReport,
  RepairReport,
  RuntimeResult,
  EvaluationMetrics,
  GeneratedSchemas,
} from "@/types/pipeline";

// ─────────────────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────────────────

export const mockProjects: Project[] = [
  {
    id: "proj-001",
    name: "E-Commerce Platform",
    description: "Full-stack shop with cart, payments, and inventory",
    createdAt: "2026-06-18T10:00:00Z",
    updatedAt: "2026-06-20T14:30:00Z",
    lastRunId: "run-001",
    status: "success",
  },
  {
    id: "proj-002",
    name: "Task Management SaaS",
    description: "Kanban board with teams, roles, and real-time updates",
    createdAt: "2026-06-19T09:00:00Z",
    updatedAt: "2026-06-21T11:00:00Z",
    lastRunId: "run-002",
    status: "running",
  },
  {
    id: "proj-003",
    name: "Healthcare Portal",
    description: "Patient records, appointments, and HIPAA-compliant storage",
    createdAt: "2026-06-20T08:00:00Z",
    updatedAt: "2026-06-21T16:00:00Z",
    status: "error",
  },
  {
    id: "proj-004",
    name: "Blog CMS",
    description: "Headless CMS with markdown, tags, and RSS",
    createdAt: "2026-06-21T07:00:00Z",
    updatedAt: "2026-06-21T07:30:00Z",
    status: "idle",
  },
];

// ─────────────────────────────────────────────────────────
// Pipeline Run
// ─────────────────────────────────────────────────────────

export const mockPipelineRun: PipelineRun = {
  id: "run-001",
  projectId: "proj-001",
  prompt:
    "Build an e-commerce platform with product listings, shopping cart, user authentication, Stripe payments, and an admin dashboard to manage inventory.",
  createdAt: "2026-06-20T14:00:00Z",
  completedAt: "2026-06-20T14:30:00Z",
  status: "success",
  stages: {
    intent: {
      id: "intent",
      label: "Intent Extraction",
      description: "Parse natural language into structured intent",
      status: "success",
      durationMs: 1240,
      startedAt: "2026-06-20T14:00:01Z",
      completedAt: "2026-06-20T14:00:02Z",
    },
    design: {
      id: "design",
      label: "System Design",
      description: "Generate architecture and component graph",
      status: "success",
      durationMs: 3800,
      startedAt: "2026-06-20T14:00:02Z",
      completedAt: "2026-06-20T14:00:06Z",
    },
    schema: {
      id: "schema",
      label: "Schema Generation",
      description: "Produce UI, API, DB, and Auth schemas",
      status: "success",
      durationMs: 6200,
      startedAt: "2026-06-20T14:00:06Z",
      completedAt: "2026-06-20T14:00:12Z",
    },
    validation: {
      id: "validation",
      label: "Validation",
      description: "Cross-layer validation and constraint checks",
      status: "success",
      durationMs: 2100,
      startedAt: "2026-06-20T14:00:12Z",
      completedAt: "2026-06-20T14:00:14Z",
    },
    repair: {
      id: "repair",
      label: "Repair Engine",
      description: "Auto-fix schema errors and mismatches",
      status: "success",
      durationMs: 1800,
      startedAt: "2026-06-20T14:00:14Z",
      completedAt: "2026-06-20T14:00:16Z",
    },
    runtime: {
      id: "runtime",
      label: "Runtime",
      description: "Execute and generate the application files",
      status: "success",
      durationMs: 14400,
      startedAt: "2026-06-20T14:00:16Z",
      completedAt: "2026-06-20T14:00:30Z",
    },
  },
};

export const mockPipelineRunning: PipelineRun = {
  ...mockPipelineRun,
  id: "run-002",
  status: "running",
  stages: {
    ...mockPipelineRun.stages,
    intent: { ...mockPipelineRun.stages.intent, status: "success" },
    design: { ...mockPipelineRun.stages.design, status: "success" },
    schema: { ...mockPipelineRun.stages.schema, status: "running", durationMs: undefined },
    validation: { ...mockPipelineRun.stages.validation, status: "pending" },
    repair: { ...mockPipelineRun.stages.repair, status: "pending" },
    runtime: { ...mockPipelineRun.stages.runtime, status: "pending" },
  },
};

// ─────────────────────────────────────────────────────────
// Generated Schemas
// ─────────────────────────────────────────────────────────

export const mockGeneratedSchemas: GeneratedSchemas = {
  ui: {
    pages: [
      { id: "home", title: "Home", route: "/", components: ["HeroSection", "ProductGrid", "Newsletter"] },
      { id: "products", title: "Products", route: "/products", components: ["ProductFilter", "ProductGrid", "Pagination"] },
      { id: "cart", title: "Cart", route: "/cart", components: ["CartItems", "OrderSummary", "CheckoutButton"] },
      { id: "checkout", title: "Checkout", route: "/checkout", components: ["AddressForm", "PaymentForm", "OrderReview"] },
      { id: "dashboard", title: "Admin Dashboard", route: "/admin", components: ["MetricsCards", "RecentOrders", "InventoryTable"] },
    ],
    theme: { primary: "#6366f1", font: "Inter", darkMode: true },
  },
  api: {
    version: "1.0.0",
    basePath: "/api/v1",
    endpoints: [
      { method: "GET", path: "/products", description: "List all products", auth: false },
      { method: "POST", path: "/products", description: "Create product", auth: true, role: "admin" },
      { method: "GET", path: "/cart", description: "Get user cart", auth: true },
      { method: "POST", path: "/cart/items", description: "Add item to cart", auth: true },
      { method: "POST", path: "/orders", description: "Create order", auth: true },
      { method: "POST", path: "/payments/intent", description: "Create Stripe payment intent", auth: true },
    ],
  },
  database: {
    engine: "PostgreSQL",
    models: [
      { name: "User", fields: ["id", "email", "password_hash", "role", "created_at"] },
      { name: "Product", fields: ["id", "name", "description", "price", "stock", "category_id"] },
      { name: "Category", fields: ["id", "name", "slug", "parent_id"] },
      { name: "Cart", fields: ["id", "user_id", "created_at", "updated_at"] },
      { name: "CartItem", fields: ["id", "cart_id", "product_id", "quantity"] },
      { name: "Order", fields: ["id", "user_id", "status", "total", "stripe_payment_id", "created_at"] },
    ],
  },
  auth: {
    provider: "JWT",
    strategies: ["email-password", "google-oauth"],
    roles: ["guest", "customer", "admin"],
    tokenExpiry: "7d",
    refreshToken: true,
  },
  businessLogic: {
    rules: [
      { id: "stock-check", description: "Prevent order if stock < quantity" },
      { id: "price-lock", description: "Lock cart price at time of checkout" },
      { id: "admin-only", description: "Only admins can modify product catalog" },
      { id: "stripe-webhook", description: "Update order status on payment webhook" },
    ],
  },
};

// ─────────────────────────────────────────────────────────
// Validation Report
// ─────────────────────────────────────────────────────────

export const mockValidationReport: ValidationReport = {
  totalChecks: 24,
  passed: 19,
  warnings: 3,
  errors: 2,
  checks: [
    { id: "v001", rule: "required-auth-fields", severity: "pass", message: "All auth endpoints have required fields", layer: "auth" },
    { id: "v002", rule: "db-foreign-keys", severity: "pass", message: "All foreign key relations are valid", layer: "database" },
    { id: "v003", rule: "api-response-types", severity: "pass", message: "All API endpoints return typed responses", layer: "api" },
    { id: "v004", rule: "ui-route-coverage", severity: "pass", message: "All UI routes have corresponding API handlers", layer: "ui" },
    { id: "v005", rule: "cross-layer-auth", severity: "warning", message: "Cart API uses auth but UI doesn't show login prompt", layer: "cross-layer", field: "CartPage" },
    { id: "v006", rule: "missing-index", severity: "warning", message: "Product.category_id has no database index", layer: "database", field: "Product.category_id" },
    { id: "v007", rule: "pagination-missing", severity: "warning", message: "Orders endpoint missing pagination parameters", layer: "api", field: "GET /orders" },
    { id: "v008", rule: "schema-mismatch", severity: "error", message: "CartItem.product_id type mismatch: API returns string, DB expects uuid", layer: "cross-layer", field: "CartItem.product_id" },
    { id: "v009", rule: "missing-field", severity: "error", message: "User model missing 'verified_at' field required by auth strategy", layer: "database", field: "User.verified_at" },
    { id: "v010", rule: "business-logic-coverage", severity: "pass", message: "All business rules have corresponding API guards", layer: "api" },
    { id: "v011", rule: "stripe-webhook-auth", severity: "pass", message: "Stripe webhook endpoint correctly validates signatures", layer: "auth" },
    { id: "v012", rule: "soft-delete", severity: "pass", message: "Product model supports soft delete", layer: "database" },
  ],
};

// ─────────────────────────────────────────────────────────
// Repair Report
// ─────────────────────────────────────────────────────────

export const mockRepairReport: RepairReport = {
  totalErrors: 2,
  repaired: 2,
  failed: 0,
  actions: [
    {
      id: "r001",
      errorId: "v008",
      description: "Fixed CartItem.product_id type from 'string' to 'uuid' in API schema",
      original: `"product_id": { "type": "string" }`,
      repaired: `"product_id": { "type": "string", "format": "uuid" }`,
      applied: true,
    },
    {
      id: "r002",
      errorId: "v009",
      description: "Added missing 'verified_at' field to User database model",
      original: `"fields": ["id", "email", "password_hash", "role", "created_at"]`,
      repaired: `"fields": ["id", "email", "password_hash", "role", "created_at", "verified_at"]`,
      applied: true,
    },
  ],
};

// ─────────────────────────────────────────────────────────
// Runtime Result
// ─────────────────────────────────────────────────────────

export const mockRuntimeResult: RuntimeResult = {
  status: "success",
  executionTimeMs: 14400,
  pages: ["/", "/products", "/products/[id]", "/cart", "/checkout", "/orders", "/admin", "/admin/products", "/admin/orders"],
  apis: ["/api/v1/products", "/api/v1/cart", "/api/v1/orders", "/api/v1/payments/intent", "/api/v1/users/me"],
  databases: ["users", "products", "categories", "carts", "cart_items", "orders"],
  files: [
    { path: "app/page.tsx", type: "page" },
    { path: "app/products/page.tsx", type: "page" },
    { path: "app/products/[id]/page.tsx", type: "page" },
    { path: "app/cart/page.tsx", type: "page" },
    { path: "app/checkout/page.tsx", type: "page" },
    { path: "app/admin/page.tsx", type: "page" },
    { path: "app/api/v1/products/route.ts", type: "api" },
    { path: "app/api/v1/cart/route.ts", type: "api" },
    { path: "app/api/v1/orders/route.ts", type: "api" },
    { path: "app/api/v1/payments/intent/route.ts", type: "api" },
    { path: "components/ProductCard.tsx", type: "component" },
    { path: "components/CartItem.tsx", type: "component" },
    { path: "components/PaymentForm.tsx", type: "component" },
    { path: "prisma/schema.prisma", type: "schema" },
    { path: "next.config.ts", type: "config" },
    { path: ".env.example", type: "config" },
  ],
};

// ─────────────────────────────────────────────────────────
// Evaluation Metrics
// ─────────────────────────────────────────────────────────

export const mockEvaluationMetrics: EvaluationMetrics = {
  successRate: 87.4,
  avgLatencyMs: 28400,
  totalRetries: 14,
  failures: 3,
  repairPercent: 94.2,
  tokenCost: 0.0342,
};

export const mockLatencyHistory = [
  { run: "Run 1", latency: 31200 },
  { run: "Run 2", latency: 28900 },
  { run: "Run 3", latency: 26400 },
  { run: "Run 4", latency: 29800 },
  { run: "Run 5", latency: 24100 },
  { run: "Run 6", latency: 27300 },
  { run: "Run 7", latency: 28400 },
];

export const mockFailureTypes = [
  { type: "Schema Mismatch", count: 12 },
  { type: "Missing Fields", count: 8 },
  { type: "Auth Errors", count: 5 },
  { type: "Timeout", count: 3 },
  { type: "Other", count: 2 },
];

export const mockRepairSuccess = [
  { stage: "Intent", success: 98 },
  { stage: "Design", success: 95 },
  { stage: "Schema", success: 89 },
  { stage: "Validation", success: 94 },
  { stage: "Repair", success: 91 },
];

// ─────────────────────────────────────────────────────────
// Prompt Templates
// ─────────────────────────────────────────────────────────

export const promptTemplates = [
  {
    id: "ecommerce",
    label: "E-Commerce Platform",
    icon: "ShoppingCart",
    prompt:
      "Build an e-commerce platform with product listings, shopping cart, user authentication, Stripe payments, and an admin dashboard to manage inventory and orders.",
  },
  {
    id: "saas",
    label: "SaaS Dashboard",
    icon: "LayoutDashboard",
    prompt:
      "Create a SaaS subscription platform with team management, role-based access control, billing with Stripe, usage analytics dashboard, and API key management.",
  },
  {
    id: "blog",
    label: "Blog CMS",
    icon: "FileText",
    prompt:
      "Build a headless CMS for a blog with markdown editor, tags, categories, SEO metadata, RSS feed, and an admin interface to manage authors and posts.",
  },
  {
    id: "crm",
    label: "CRM System",
    icon: "Users",
    prompt:
      "Create a CRM with contact management, deal pipeline (kanban board), email integration, activity timeline, and sales reporting dashboard.",
  },
  {
    id: "healthcare",
    label: "Healthcare Portal",
    icon: "Heart",
    prompt:
      "Build a HIPAA-compliant healthcare portal with patient records, appointment scheduling, doctor-patient messaging, prescription management, and audit logging.",
  },
];

export const examplePrompts = [
  "A real-time collaborative whiteboard app with rooms, drawing tools, and export to PNG",
  "A job board platform with company profiles, job listings, applications, and recruiter dashboard",
  "A fitness tracking app with workout logging, progress charts, and social sharing",
  "An inventory management system with barcode scanning, stock alerts, and supplier management",
];
