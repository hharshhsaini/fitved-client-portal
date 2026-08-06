// Lightweight Hosted Editorial Image URL System (Zero Local Files)

export interface ArticleMediaQuery {
  slug: string;
  title: string;
  category_id?: string;
  tags?: string[];
  featured_image?: string;
}

// Curated high-resolution hosted editorial photo URLs from Unsplash CDN
export const HOSTED_EDITORIAL_PHOTO_POOLS: Record<string, string[]> = {
  protein: [
    "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=1200&q=80", // Paneer / Indian Thali
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200&q=80", // Tofu & Salad
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80", // Dal / Lentils
    "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=1200&q=80", // Protein Powder Shake
    "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=1200&q=80", // Sattu Healthy Drink
    "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1200&q=80", // Eggs / Boiled Eggs
    "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=1200&q=80", // Lean Chicken Breast
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80", // Sprouts & Salad
    "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1200&q=80", // Yogurt / Hung Curd
  ],
  recipes: [
    "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=1200&q=80", // Paneer Bhurji / Tikka
    "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=1200&q=80", // Cooked Indian Tikka
    "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&q=80", // Indian Gravy Curry
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1200&q=80", // Chilla / Flatbread
    "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1200&q=80", // Oats / Khichdi Bowl
    "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=1200&q=80", // Palak Paneer Dish
    "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=1200&q=80", // Smoothie Drink
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=80", // Healthy Meal Prep
  ],
  weight_loss: [
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80", // Caloric Deficit Plate
    "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200&q=80", // Outdoor Walking Fitness
    "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=1200&q=80", // Intermittent Fasting Meal
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200&q=80", // High Fiber Salad
    "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=1200&q=80", // Healthy Vegetables
  ],
  yoga: [
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1200&q=80", // Yoga Pose
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80", // Meditation Breathwork
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80", // Prenatal Exercise
    "https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=1200&q=80", // Vinyasa Flow
    "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=1200&q=80", // Mobility Stretch
  ],
  womens_health: [
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80", // Woman Exercise / Fitness
    "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=80", // Healthy Meal Prep
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80", // Women Wellness
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200&q=80", // Superfood Salad
  ],
  health: [
    "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=1200&q=80", // Diabetic Diet Chart
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80", // Healthy Plate
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80", // Gut Probiotic Foods
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80", // Whole Grains
    "https://images.unsplash.com/photo-1467453678174-768ec283a940?w=1200&q=80", // Heart Health Diet
  ],
  training: [
    "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&q=80", // Gym Workout
    "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=1200&q=80", // Home Dumbbell
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80", // Heavy Lifting
    "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&q=80", // Hypertrophy Training
  ],
  supplements: [
    "https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=1200&q=80", // Creatine / Supplement Powder
    "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=1200&q=80", // Whey Isolate Tub
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&q=80", // Multivitamin Capsule
  ],
};

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Reusable Featured Hosted Image Resolver
 * Returns a direct hosted Unsplash photo URL matching the article topic with a unique signature
 */
export function resolveFeaturedImage(article: ArticleMediaQuery): string {
  // If article has explicit hosted image URL
  if (article.featured_image && article.featured_image.startsWith("http")) {
    return article.featured_image;
  }

  const titleLower = article.title.toLowerCase();
  const slugLower = article.slug.toLowerCase();

  let poolKey = "protein";
  if (titleLower.includes("recipe") || titleLower.includes("bhurji") || titleLower.includes("tikka") || titleLower.includes("chilla") || titleLower.includes("khichdi")) {
    poolKey = "recipes";
  } else if (titleLower.includes("pcos") || titleLower.includes("women") || titleLower.includes("prenatal") || titleLower.includes("postpartum") || titleLower.includes("hormon")) {
    poolKey = "womens_health";
  } else if (titleLower.includes("yoga") || titleLower.includes("breath") || titleLower.includes("stretch") || titleLower.includes("pranayama")) {
    poolKey = "yoga";
  } else if (titleLower.includes("weight loss") || titleLower.includes("fat loss") || titleLower.includes("calorie") || titleLower.includes("fasting") || titleLower.includes("walking")) {
    poolKey = "weight_loss";
  } else if (titleLower.includes("gym") || titleLower.includes("workout") || titleLower.includes("dumbbell") || titleLower.includes("muscle") || titleLower.includes("strength") || titleLower.includes("training")) {
    poolKey = "training";
  } else if (titleLower.includes("creatine") || titleLower.includes("whey") || titleLower.includes("supplement") || titleLower.includes("vitamin")) {
    poolKey = "supplements";
  } else if (titleLower.includes("diabet") || titleLower.includes("thyroid") || titleLower.includes("liver") || titleLower.includes("gut") || titleLower.includes("health")) {
    poolKey = "health";
  }

  const pool = HOSTED_EDITORIAL_PHOTO_POOLS[poolKey] || HOSTED_EDITORIAL_PHOTO_POOLS["protein"];
  const h = hashString(slugLower);
  const base = pool[h % pool.length];
  
  // Append unique signature query parameter for individual hosted image cache key
  return `${base}&sig=${h}`;
}

/**
 * SEO-Friendly Image Identifier derived from slug
 */
export function resolveImageName(article: { slug: string }): string {
  return article.slug.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * SEO-Friendly Alt Text Generator
 */
export function resolveImageAltText(article: { title: string }): string {
  return `Science-backed Indian guide on ${article.title} - FitVed Fitness & Nutrition`;
}
