// Single source of truth for the Find Trainers city → popular-areas data.
// Used by the trainer profile builder (city + areas-served) and the public
// listing filters (city → area cascade). Kept as data only — no logic.

export const CITIES = [
  "Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune",
  "Chennai", "Kolkata", "Ahmedabad", "Noida", "Gurgaon",
] as const;

export type City = (typeof CITIES)[number];

export const AREAS_BY_CITY: Record<City, string[]> = {
  Bangalore: [
    "HSR Layout", "Koramangala", "Indiranagar", "Whitefield", "Marathahalli",
    "Bellandur", "Sarjapur Road", "Electronic City", "Jayanagar", "JP Nagar",
    "Hebbal", "Yelahanka", "BTM Layout", "CV Raman Nagar", "Kalyan Nagar",
    "Banashankari", "Bannerghatta Road", "Brookefield", "Varthur", "Panathur",
    "Hoodi", "Mahadevapura", "Domlur", "Hennur", "Yeshwanthpur", "Rajajinagar",
    "RT Nagar", "Frazer Town",
  ],
  Mumbai: [
    "Andheri", "Bandra", "Borivali", "Powai", "Malad", "Goregaon", "Juhu",
    "Dadar", "Chembur", "Kandivali", "Thane", "Vashi", "Ghatkopar", "Mulund",
    "Lower Parel", "Worli", "Colaba", "Vile Parle", "Santacruz", "Kurla",
  ],
  Delhi: [
    "Saket", "Dwarka", "Rohini", "Vasant Kunj", "Lajpat Nagar", "Karol Bagh",
    "Janakpuri", "Rajouri Garden", "Pitampura", "Greater Kailash", "Hauz Khas",
    "Connaught Place", "Mayur Vihar", "Preet Vihar", "Vasant Vihar", "Punjabi Bagh",
  ],
  Hyderabad: [
    "Gachibowli", "Madhapur", "Hitech City", "Kondapur", "Kukatpally", "Banjara Hills",
    "Jubilee Hills", "Manikonda", "Miyapur", "Begumpet", "Ameerpet", "Secunderabad",
    "Nallagandla", "Financial District", "LB Nagar", "Uppal",
  ],
  Pune: [
    "Kharadi", "Hinjewadi", "Baner", "Wakad", "Viman Nagar", "Koregaon Park",
    "Aundh", "Hadapsar", "Magarpatta", "Kothrud", "Wagholi", "Balewadi",
    "Pimple Saudagar", "Kalyani Nagar", "Undri", "Bavdhan",
  ],
  Chennai: [
    "Adyar", "Velachery", "OMR", "T Nagar", "Anna Nagar", "Porur", "Perungudi",
    "Sholinganallur", "Nungambakkam", "Guindy", "Tambaram", "Pallikaranai",
    "Thoraipakkam", "Mylapore", "Besant Nagar", "Ambattur",
  ],
  Kolkata: [
    "Salt Lake", "New Town", "Ballygunge", "Park Street", "Behala", "Howrah",
    "Garia", "Tollygunge", "Rajarhat", "Dumdum", "Jadavpur", "Alipore",
    "Kasba", "Lake Town", "Barasat", "Sonarpur",
  ],
  Ahmedabad: [
    "Satellite", "Bodakdev", "Prahlad Nagar", "Vastrapur", "SG Highway",
    "Maninagar", "Naranpura", "Chandkheda", "Bopal", "Thaltej", "Gota",
    "Navrangpura", "Paldi", "Vejalpur", "Nikol", "Ghatlodia",
  ],
  Noida: [
    "Sector 62", "Sector 18", "Sector 137", "Sector 76", "Sector 50",
    "Sector 78", "Greater Noida", "Sector 168", "Sector 44", "Sector 128",
    "Sector 93", "Sector 63", "Sector 121", "Sector 15",
  ],
  Gurgaon: [
    "DLF Phase 1", "DLF Phase 2", "DLF Phase 3", "Sohna Road", "Golf Course Road",
    "Sector 56", "Sector 49", "MG Road", "Cyber City", "Sector 14", "Palam Vihar",
    "Sushant Lok", "Udyog Vihar", "Sector 29", "New Gurgaon", "Sector 82",
  ],
};

/** Areas for a given city name (safe for arbitrary strings). */
export function areasForCity(city: string | null | undefined): string[] {
  if (!city) return [];
  return AREAS_BY_CITY[city as City] ?? [];
}
