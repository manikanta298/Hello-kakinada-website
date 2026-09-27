// DEMO CONTENT — all listings below are sample placeholders, not real businesses.
const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

export const LOCATIONS = [
  "Kakinada City", "Sarpavaram", "Ramanayyapeta", "Jagannaickpur", "Vakalapudi",
  "Venkat Nagar", "Bhanugudi", "Gandhi Nagar", "Ashok Nagar",
].map((name) => ({ name, slug: name.toLowerCase().replace(/\s+/g, "-") }));

export type Business = { slug: string; name: string; category: string; location: string; image: string; verified: boolean; open: boolean; about: string; services: string[]; addedAt?: string | undefined; link?: string | undefined; phone?: string | undefined; whatsapp?: string | undefined; address?: string | undefined; hours?: string | undefined; mapsUrl?: string | undefined; images?: string[] | undefined };
export const BUSINESSES: Business[] = [
  { slug: "demo-coastal-electronics", name: "Demo Coastal Electronics", category: "Electronics", location: "Bhanugudi", image: u("photo-1550009158-9ebf69173e03"), verified: false, open: true, about: "Sample electronics store listing.", services: ["Mobiles", "Appliances", "Repairs"] },
  { slug: "demo-seaside-textiles", name: "Demo Seaside Textiles", category: "Clothing", location: "Gandhi Nagar", image: u("photo-1441986300917-64674bd600d8"), verified: false, open: true, about: "Sample textile showroom listing.", services: ["Sarees", "Menswear", "Tailoring"] },
  { slug: "demo-bay-digital-agency", name: "Demo Bay Digital Agency", category: "Digital Marketing", location: "Sarpavaram", image: u("photo-1522071820081-009f0129c71c"), verified: false, open: false, about: "Sample digital marketing agency listing.", services: ["SEO", "Social media", "Websites"] },
  { slug: "demo-godavari-fitness", name: "Demo Godavari Fitness", category: "Gym", location: "Ramanayyapeta", image: u("photo-1534438327276-14e5300c3a48"), verified: false, open: true, about: "Sample gym listing.", services: ["Strength", "Cardio", "Yoga"] },
];

export type Job = { slug: string; title: string; company: string; location: string; salary: string; experience: string; type: string; posted: string; category: string; addedAt?: string | undefined; link?: string | undefined; phone?: string | undefined; whatsapp?: string | undefined; email?: string | undefined; description?: string | undefined; responsibilities?: string | undefined; requirements?: string | undefined; qualification?: string | undefined; lastDate?: string | undefined; image?: string | undefined; companyImage?: string | undefined; skills?: string | undefined; education?: string | undefined; benefits?: string | undefined };
export const JOBS: Job[] = [
  { slug: "demo-sales-executive", title: "Sales Executive", company: "Demo Company A", location: "Kakinada City", salary: "₹15k–22k / mo", experience: "0–2 yrs", type: "Full-time", posted: "Sample", category: "Sales" },
  { slug: "demo-accountant", title: "Accountant", company: "Demo Company B", location: "Jagannaickpur", salary: "₹20k–30k / mo", experience: "2–4 yrs", type: "Full-time", posted: "Sample", category: "Finance" },
  { slug: "demo-graphic-designer", title: "Graphic Designer", company: "Demo Company C", location: "Sarpavaram", salary: "₹18k–28k / mo", experience: "1–3 yrs", type: "Hybrid", posted: "Sample", category: "Design" },
  { slug: "demo-staff-nurse", title: "Staff Nurse", company: "Demo Company D", location: "Ramanayyapeta", salary: "₹16k–24k / mo", experience: "1+ yrs", type: "Shift", posted: "Sample", category: "Healthcare" },
];

export type Property = { slug: string; mode: "Buy" | "Rent"; price: string; type: string; bhk: string; area: string; location: string; image: string };
export const PROPERTIES: Property[] = [
  { slug: "demo-2bhk-sarpavaram", mode: "Rent", price: "₹12,000 / mo", type: "Apartment", bhk: "2 BHK", area: "1,050 sq.ft", location: "Sarpavaram", image: u("photo-1502672260266-1c1ef2d93688") },
  { slug: "demo-3bhk-venkat-nagar", mode: "Buy", price: "₹68 Lakh", type: "Apartment", bhk: "3 BHK", area: "1,600 sq.ft", location: "Venkat Nagar", image: u("photo-1560448204-e02f11c3d0e2") },
  { slug: "demo-villa-vakalapudi", mode: "Buy", price: "₹1.2 Cr", type: "Independent House", bhk: "4 BHK", area: "2,400 sq.ft", location: "Vakalapudi", image: u("photo-1564013799919-ab600027ffc6") },
  { slug: "demo-1bhk-ashok-nagar", mode: "Rent", price: "₹7,500 / mo", type: "Apartment", bhk: "1 BHK", area: "600 sq.ft", location: "Ashok Nagar", image: u("photo-1522708323590-d24dbb6b0267") },
];

export type Restaurant = { slug: string; name: string; cuisine: string; location: string; price: string; open: boolean; image: string };
export const RESTAURANTS: Restaurant[] = [
  { slug: "demo-biryani-house", name: "Demo Biryani House", cuisine: "Biryani", location: "Bhanugudi", price: "₹₹", open: true, image: u("photo-1563379091339-03b21ab4a4f8") },
  { slug: "demo-tiffin-corner", name: "Demo Tiffin Corner", cuisine: "Tiffins", location: "Gandhi Nagar", price: "₹", open: true, image: u("photo-1630383249896-424e482df921") },
  { slug: "demo-beach-cafe", name: "Demo Beach Café", cuisine: "Cafe", location: "Vakalapudi", price: "₹₹", open: false, image: u("photo-1554118811-1e0d58224f24") },
  { slug: "demo-sweet-stall", name: "Demo Sweet Stall", cuisine: "Sweets", location: "Kakinada City", price: "₹", open: true, image: u("photo-1589119908995-c6837fa14848") },
];

export type Event = { slug: string; name: string; date: string; time: string; venue: string; location: string; category: string; image: string };
export const EVENTS: Event[] = [
  { slug: "demo-beach-festival", name: "Sample Beach Festival", date: "Date TBA", time: "5:00 PM", venue: "Demo Venue", location: "Vakalapudi", category: "Cultural", image: u("photo-1533174072545-7a4b6ad7a6c3") },
  { slug: "demo-startup-meetup", name: "Sample Startup Meetup", date: "Date TBA", time: "10:00 AM", venue: "Demo Hall", location: "Kakinada City", category: "Business", image: u("photo-1540575467063-178a50c2df87") },
  { slug: "demo-cricket-league", name: "Sample Cricket League", date: "Date TBA", time: "7:00 AM", venue: "Demo Ground", location: "Ramanayyapeta", category: "Sports", image: u("photo-1531415074968-036ba1b575da") },
];

export const PLACES = [
  { name: "Beaches", image: u("photo-1507525428034-b723cf961d3e") },
  { name: "Temples", image: u("photo-1582510003544-4d00b7f74220") },
  { name: "Parks", image: u("photo-1519331379826-f10be5486c6f") },
  { name: "Shopping", image: u("photo-1555529669-e69e7aa0ba9a") },
  { name: "Famous Food", image: u("photo-1606491956689-2ea866880c84") },
  { name: "Weekend Places", image: u("photo-1500530855697-b586d89ba3ee") },
];

export const SERVICES = ["Electricians", "Plumbers", "AC Repair", "Car Repair", "Bike Repair", "Cleaning", "Printing", "Photography", "CCTV", "Interior Designers", "Digital Marketing", "Event Services"];

export const NEWS = [
  { title: "Sample update headline for local community news", category: "Local", date: "Sample date", desc: "Demo article. Real updates will link to their original publisher.", source: "Demo source" },
  { title: "Sample business update from Kakinada", category: "Business", date: "Sample date", desc: "Demo article. Real updates will link to their original publisher.", source: "Demo source" },
  { title: "Sample education news item", category: "Education", date: "Sample date", desc: "Demo article. Real updates will link to their original publisher.", source: "Demo source" },
];

// Real national helpline numbers (India)
export const EMERGENCY = [
  { label: "Police", num: "100" }, { label: "Fire", num: "101" }, { label: "Ambulance", num: "108" },
  { label: "Emergency", num: "112" }, { label: "Electricity", num: "1912" },
  { label: "Women Helpline", num: "181" }, { label: "Child Helpline", num: "1098" },
];

export function search(q: string) {
  const s = q.toLowerCase();
  const loc = LOCATIONS.find((l) => s.includes(l.name.toLowerCase()));
  const m = (t: string) => !s || s.split(/\s+/).some((w) => w.length > 2 && t.toLowerCase().includes(w));
  const inLoc = (l: string) => !loc || l === loc.name;
  const wantsJobs = /job|hiring|vacanc/.test(s);
  const wantsProps = /bhk|rent|flat|house|property|plot|buy/.test(s);
  const wantsFood = /restaurant|food|biryani|cafe|tiffin|eat/.test(s);
  return {
    location: loc?.name,
    jobs: JOBS.filter((j) => inLoc(j.location) && (wantsJobs || m(j.title + j.category))),
    properties: PROPERTIES.filter((p) => inLoc(p.location) && (wantsProps || m(p.type + p.bhk))),
    restaurants: RESTAURANTS.filter((r) => inLoc(r.location) && (wantsFood || m(r.name + r.cuisine))),
    businesses: wantsJobs || wantsProps ? [] : BUSINESSES.filter((b) => inLoc(b.location) && (wantsFood || m(b.name + b.category))),
    events: wantsJobs || wantsProps ? [] : EVENTS.filter((e) => inLoc(e.location) && m(e.name + e.category)),
  };
}

export const SUGGESTIONS = ["Restaurants near me", "Jobs in Kakinada", "Flats for rent", "Hospitals", "Digital marketing agencies", "Places to visit", "2BHK rent", "Restaurants in Sarpavaram"];
