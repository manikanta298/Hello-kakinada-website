export type FieldType = "text" | "textarea" | "number" | "select" | "tags" | "image" | "images" | "video" | "switch" | "date" | "time" | "url" | "image_url";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  wide?: boolean;
  placeholder?: string;
};

export type Column = { key: string; label: string; format?: "number" | "date" | "money" | "rating" };

export type SectionConfig = {
  key: string;
  table: string;
  permission: string;
  title: string;
  singular: string;
  description: string;
  categories: string[];
  fields: Field[];
  columns: Column[];
  bulkUpload?: boolean;
  statCards?: { label: string; filter: Record<string, unknown> | "all"; }[];
};

/** Columns stored directly on content tables. Anything else goes into `details`. */
export const CORE_KEYS = new Set([
  "title", "description", "category", "subcategory", "location", "tags", "image_url", "images",
  "media_url", "status", "featured", "verified", "published_at",
]);

export const STATUSES = ["draft", "pending", "published", "archived", "rejected"] as const;

export const KAKINADA_AREAS = [
  "Main Road", "Jagannaickpur", "Sarpavaram", "Ramanayyapeta", "Gandhi Nagar", "Suryaraopeta", "Bhanugudi Junction",
  "Kakinada Beach", "Uppada", "Samalkot", "Pithapuram", "Vakalapudi", "Turangi", "Other",
];

const base = (withImage = true): Field[] => [
  { key: "title", label: "Title", type: "text", required: true, wide: true },
  { key: "category", label: "Category", type: "select" },
  { key: "location", label: "Location", type: "select", options: KAKINADA_AREAS },
  ...(withImage ? [{ key: "image_url", label: "Cover image", type: "image" } as Field] : []),
  { key: "description", label: "Description", type: "textarea", wide: true },
];

const tail: Field[] = [
  { key: "tags", label: "Tags", type: "tags", wide: true },
  { key: "featured", label: "Featured", type: "switch" },
  { key: "status", label: "Status", type: "select", options: [...STATUSES] },
];

export const SECTIONS: Record<string, SectionConfig> = {
  videos: {
    key: "videos", table: "videos", permission: "videos", title: "Videos", singular: "Video",
    description: "Short videos shown in Explore Kakinada.",
    categories: ["Places", "Food", "Events", "Business", "Nature", "Beaches", "Culture", "Lifestyle", "Local Life", "News / Updates"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, wide: true },
      { key: "media_url", label: "Video file", type: "video", wide: true },
      { key: "image_url", label: "Thumbnail", type: "image" },
      { key: "category", label: "Category", type: "select" },
      { key: "location", label: "Location", type: "select", options: KAKINADA_AREAS },
      { key: "published_at", label: "Publish date", type: "date" },
      { key: "description", label: "Description", type: "textarea", wide: true },
      ...tail,
    ],
    columns: [{ key: "category", label: "Category" }, { key: "location", label: "Location" }, { key: "views", label: "Views", format: "number" }, { key: "likes", label: "Likes", format: "number" }, { key: "shares", label: "Shares", format: "number" }, { key: "published_at", label: "Published", format: "date" }],
  },
  photos: {
    key: "photos", table: "photos", permission: "photos", title: "Photos", singular: "Photo",
    description: "Photos and galleries for Photos of Kakinada.", bulkUpload: true,
    categories: ["Places", "Food", "Events", "Business", "Nature", "Beaches", "Culture", "Lifestyle", "Local Life", "News / Updates"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true, wide: true },
      { key: "image_url", label: "Photo", type: "image" },
      { key: "images", label: "Gallery photos (optional)", type: "images", wide: true },
      { key: "category", label: "Category", type: "select" },
      { key: "location", label: "Location", type: "select", options: KAKINADA_AREAS },
      { key: "published_at", label: "Publish date", type: "date" },
      { key: "description", label: "Description", type: "textarea", wide: true },
      ...tail,
    ],
    columns: [{ key: "category", label: "Category" }, { key: "location", label: "Location" }, { key: "views", label: "Views", format: "number" }, { key: "likes", label: "Likes", format: "number" }, { key: "shares", label: "Shares", format: "number" }, { key: "created_at", label: "Date", format: "date" }],
  },
  jobs: {
    key: "jobs", table: "jobs", permission: "jobs", title: "Jobs", singular: "Job",
    description: "Job openings posted across Kakinada.",
    categories: ["Sales", "Teaching", "IT / Software", "Healthcare", "Hotel / Restaurant", "Driver", "Office / Admin", "Aqua / Marine", "Retail", "Other"],
    fields: [
      ...base(false),
      { key: "company", label: "Company", type: "text" },
      { key: "image_url", label: "Job image", type: "image_url", wide: true },
      { key: "job_type", label: "Job type", type: "select", options: ["Full-time", "Part-time", "Contract", "Internship", "Walk-in"] },
      { key: "salary", label: "Salary", type: "text", placeholder: "₹15,000 – ₹20,000 / month" },
      { key: "experience", label: "Experience", type: "text" },
      { key: "qualification", label: "Qualification", type: "text" },
      { key: "openings", label: "Openings", type: "number" },
      { key: "apply_contact", label: "Apply contact / phone", type: "text" },
      { key: "email", label: "Apply email", type: "text", placeholder: "hr@company.com" },
      { key: "expiry_date", label: "Expiry date", type: "date" },
      { key: "applications", label: "Applications", type: "number" },
      ...tail,
    ],
    columns: [{ key: "company", label: "Company" }, { key: "location", label: "Location" }, { key: "category", label: "Category" }, { key: "job_type", label: "Type" }, { key: "created_at", label: "Posted", format: "date" }, { key: "views", label: "Views", format: "number" }, { key: "applications", label: "Applications", format: "number" }],
  },
  properties: {
    key: "properties", table: "properties", permission: "properties", title: "Rent / Buy", singular: "Property",
    description: "Houses, flats, plots and commercial spaces.",
    categories: ["Flat", "Independent House", "Plot", "Commercial", "PG / Hostel", "Shop"],
    fields: [
      ...base(true),
      { key: "images", label: "Property gallery", type: "images", wide: true },
      { key: "listing_type", label: "For", type: "select", options: ["Sale", "Rent"] },
      { key: "price", label: "Price (₹)", type: "number" },
      { key: "bedrooms", label: "Bedrooms", type: "number" },
      { key: "bathrooms", label: "Bathrooms", type: "number" },
      { key: "area", label: "Area (sq ft)", type: "number" },
      { key: "amenities", label: "Amenities", type: "tags", wide: true },
      { key: "owner_name", label: "Owner / Agent", type: "text" },
      { key: "contact_phone", label: "Contact phone", type: "text" },
      ...tail,
    ],
    columns: [{ key: "listing_type", label: "For" }, { key: "category", label: "Type" }, { key: "location", label: "Location" }, { key: "price", label: "Price", format: "money" }, { key: "owner_name", label: "Owner/Agent" }, { key: "views", label: "Views", format: "number" }, { key: "created_at", label: "Date", format: "date" }],
  },
  businesses: {
    key: "businesses", table: "businesses", permission: "businesses", title: "Businesses", singular: "Business",
    description: "Local shops, companies and stores.",
    categories: ["Shopping", "Education", "Health", "Hotels", "Automobile", "Electronics", "Real Estate", "Finance", "Fashion", "Other"],
    fields: [
      ...base(true),
      { key: "logo_url", label: "Logo", type: "image" },
      { key: "subcategory", label: "Subcategory", type: "text" },
      { key: "images", label: "Photos", type: "images", wide: true },
      { key: "address", label: "Address", type: "text", wide: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "whatsapp", label: "WhatsApp", type: "text" },
      { key: "website", label: "Website", type: "url" },
      { key: "opening_hours", label: "Opening hours", type: "text", placeholder: "Mon–Sat 9am – 9pm" },
      { key: "rating", label: "Rating", type: "number" },
      { key: "review_count", label: "Reviews", type: "number" },
      { key: "verified", label: "Verified", type: "switch" },
      ...tail,
    ],
    columns: [{ key: "category", label: "Category" }, { key: "location", label: "Location" }, { key: "phone", label: "Phone" }, { key: "views", label: "Views", format: "number" }, { key: "review_count", label: "Reviews", format: "number" }, { key: "rating", label: "Rating", format: "rating" }],
  },
  food: {
    key: "food", table: "food_places", permission: "food", title: "Food", singular: "Food place",
    description: "Restaurants, tiffin centers, cafes, bakeries and more.",
    categories: ["Restaurants", "Tiffin Centers", "Cafes", "Bakeries", "Food Shops", "Delivery Services"],
    fields: [
      ...base(true),
      { key: "images", label: "Photos", type: "images", wide: true },
      { key: "menu", label: "Menu information", type: "textarea", wide: true },
      { key: "address", label: "Address", type: "text", wide: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "whatsapp", label: "WhatsApp", type: "text" },
      { key: "opening_hours", label: "Opening hours", type: "text" },
      { key: "rating", label: "Rating", type: "number" },
      { key: "review_count", label: "Reviews", type: "number" },
      ...tail,
    ],
    columns: [{ key: "category", label: "Type" }, { key: "location", label: "Location" }, { key: "phone", label: "Phone" }, { key: "views", label: "Views", format: "number" }, { key: "rating", label: "Rating", format: "rating" }],
  },
  services: {
    key: "services", table: "services", permission: "services", title: "Services", singular: "Service",
    description: "Local service providers.",
    categories: ["Plumbers", "Electricians", "AC Services", "Car Services", "Bike Services", "Doctors", "Hospitals", "Salons", "Repair Services", "Home Services"],
    fields: [
      ...base(true),
      { key: "images", label: "Photos", type: "images", wide: true },
      { key: "phone", label: "Phone", type: "text" },
      { key: "whatsapp", label: "WhatsApp", type: "text" },
      { key: "opening_hours", label: "Opening hours", type: "text" },
      { key: "verified", label: "Verified", type: "switch" },
      ...tail,
    ],
    columns: [{ key: "category", label: "Category" }, { key: "location", label: "Location" }, { key: "phone", label: "Phone" }, { key: "views", label: "Views", format: "number" }],
  },
  events: {
    key: "events", table: "events", permission: "events", title: "Events", singular: "Event",
    description: "Festivals, shows, workshops and happenings.",
    categories: ["Festival", "Music", "Sports", "Education", "Exhibition", "Food", "Community", "Business"],
    fields: [
      ...base(true),
      { key: "venue", label: "Venue", type: "text" },
      { key: "event_date", label: "Date", type: "date" },
      { key: "start_time", label: "Start time", type: "time" },
      { key: "end_time", label: "End time", type: "time" },
      { key: "organizer", label: "Organizer", type: "text" },
      { key: "contact", label: "Contact", type: "text" },
      { key: "ticket_info", label: "Ticket information", type: "text" },
      { key: "website", label: "Website", type: "url" },
      ...tail,
    ],
    columns: [{ key: "category", label: "Category" }, { key: "venue", label: "Venue" }, { key: "event_date", label: "Date", format: "date" }, { key: "organizer", label: "Organizer" }, { key: "views", label: "Views", format: "number" }],
  },
};

export const ENTITY_LABEL: Record<string, string> = {
  businesses: "Business", jobs: "Job", properties: "Property", events: "Event", food_places: "Food place", services: "Service", videos: "Video", photos: "Photo",
};

export const ENTITY_PATH: Record<string, string> = {
  businesses: "/admin/businesses", jobs: "/admin/jobs", properties: "/admin/properties", events: "/admin/events",
  food_places: "/admin/food", services: "/admin/services", videos: "/admin/explore/videos", photos: "/admin/explore/photos",
};

export const ROLE_LABELS: Record<string, string> = {
  master_admin: "Master Admin", content_admin: "Content Admin", business_admin: "Business Admin", jobs_admin: "Jobs Admin",
  property_admin: "Property Admin", explore_admin: "Explore Admin", moderation_admin: "Moderation Admin", analytics_admin: "Analytics Admin",
};

/** Mirrors public.can_manage in the database (the database is the source of truth). */
export const ROLE_SECTIONS: Record<string, string[]> = {
  master_admin: ["*"],
  content_admin: ["videos", "photos", "categories", "jobs", "properties", "businesses", "food", "services", "events", "notifications"],
  explore_admin: ["videos", "photos", "categories"],
  business_admin: ["businesses", "food", "services"],
  jobs_admin: ["jobs"],
  property_admin: ["properties"],
  moderation_admin: ["reviews", "reports"],
  analytics_admin: ["analytics"],
};

export function canAccess(roles: string[], section: string) {
  if (roles.includes("master_admin")) return true;
  if (["users", "admin-users", "roles", "settings"].includes(section)) return false;
  if (section === "dashboard") return roles.some((r) => r !== "user");
  if (section === "analytics") return roles.includes("analytics_admin");
  return roles.some((r) => ROLE_SECTIONS[r]?.includes(section));
}
