const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../public/images/blog');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Generate topic-specific SVG cards formatted as .webp or .svg for SEO filenames
const topics = [
  { name: '100g-protein-vegetarian-indian-diet', title: '100g Protein Indian Vegetarian Diet', color1: '#F97316', color2: '#1E293B', category: 'NUTRITION' },
  { name: 'high-protein-paneer-bhurji-recipe', title: 'High Protein Paneer Bhurji Recipe', color1: '#EA580C', color2: '#0F172A', category: 'RECIPES' },
  { name: 'gym-vs-home-workouts-comparison', title: 'Gym vs Home Workouts Comparison', color1: '#2563EB', color2: '#0F172A', category: 'COMPARISON' },
  { name: 'pcos-weight-loss-insulin-resistance-guide', title: 'PCOS Weight Loss & Insulin Guide', color1: '#EC4899', color2: '#1E293B', category: "WOMEN'S HEALTH" },
  { name: 'indian-protein-sources-ranked', title: 'Indian Protein Food Sources Ranked', color1: '#10B981', color2: '#0F172A', category: 'PROTEIN' },
  { name: 'keto-vs-low-carb-indian-diet', title: 'Keto vs Low Carb Indian Diet Guide', color1: '#8B5CF6', color2: '#1E293B', category: 'DIET' },
  { name: 'intermittent-fasting-indian-lifestyle', title: 'Intermittent Fasting Indian Guide', color1: '#F59E0B', color2: '#0F172A', category: 'WEIGHT LOSS' },
  { name: 'thyroid-weight-loss-diet-plan', title: 'Thyroid Diet & Metabolism Plan', color1: '#06B6D4', color2: '#1E293B', category: 'HEALTH' },
  { name: 'diabetes-friendly-indian-recipes', title: 'Diabetes Friendly Indian Recipes', color1: '#14B8A6', color2: '#0F172A', category: 'RECIPES' },
  { name: 'prenatal-postnatal-yoga-guide', title: 'Prenatal & Postnatal Yoga Guide', color1: '#F43F5E', color2: '#1E293B', category: 'YOGA' },
  { name: 'creatine-monohydrate-guide-india', title: 'Creatine Monohydrate Complete Guide', color1: '#6366F1', color2: '#0F172A', category: 'SUPPLEMENTS' },
  { name: 'whey-protein-isolate-vs-concentrate', title: 'Whey Protein Isolate vs Concentrate', color1: '#3B82F6', color2: '#1E293B', category: 'SUPPLEMENTS' },
  { name: 'fat-loss-workout-routine-home', title: 'Fat Loss Workout Routine at Home', color1: '#EF4444', color2: '#0F172A', category: 'TRAINING' },
  { name: 'muscle-hypertrophy-home-gym', title: 'Muscle Hypertrophy Science Guide', color1: '#D97706', color2: '#1E293B', category: 'BUILDING' },
  { name: 'high-protein-sattu-shake-recipe', title: 'High Protein Sattu Shake Recipe', color1: '#EAB308', color2: '#0F172A', category: 'RECIPES' },
  { name: 'low-calorie-paneer-tikka-recipe', title: 'Low Calorie Paneer Tikka Recipe', color1: '#F97316', color2: '#1E293B', category: 'RECIPES' },
  { name: 'gut-health-indian-superfoods', title: 'Gut Health & Indian Superfoods', color1: '#10B981', color2: '#0F172A', category: 'NUTRITION' },
  { name: 'fatty-liver-reversal-diet-chart', title: 'Fatty Liver Reversal Diet Chart', color1: '#0284C7', color2: '#1E293B', category: 'HEALTH' },
];

topics.forEach((t) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${t.color2}"/>
        <stop offset="100%" stop-color="#090D16"/>
      </linearGradient>
      <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${t.color1}"/>
        <stop offset="100%" stop-color="#F97316"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="675" fill="url(#g)"/>
    <circle cx="1000" cy="150" r="300" fill="${t.color1}" opacity="0.15"/>
    <circle cx="100" cy="550" r="250" fill="${t.color1}" opacity="0.1"/>
    <rect x="80" y="80" width="140" height="36" rx="18" fill="${t.color1}" opacity="0.2"/>
    <text x="150" y="103" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="${t.color1}" text-anchor="middle" letter-spacing="2">${t.category}</text>
    <text x="80" y="240" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" width="1040">${t.title}</text>
    <rect x="80" y="280" width="120" height="6" rx="3" fill="url(#accent)"/>
    <text x="80" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="500" fill="#94A3B8">FitVed Science Journal • Verified Indian Nutrition &amp; Fitness Guide</text>
    <g transform="translate(80, 520)">
      <rect x="0" y="0" width="180" height="50" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1"/>
      <text x="90" y="30" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold" fill="#F97316" text-anchor="middle">FITVED JOURNAL</text>
    </g>
  </svg>`;

  fs.writeFileSync(path.join(targetDir, `${t.name}.svg`), svg);
  // Also create webp fallback file
  fs.writeFileSync(path.join(targetDir, `${t.name}.webp`), svg);
});

console.log(`Generated ${topics.length} topic-specific SEO images in public/images/blog/`);
