import { Link } from "react-router-dom";

interface LinkItem {
  label: string;
  href: string;
}

interface LinkGroup {
  heading: string;
  links: LinkItem[];
}

const GROUPS: LinkGroup[] = [
  {
    heading: "Bangalore",
    links: [
      { label: "Personal Trainer in Bangalore", href: "/personal-trainer/bangalore" },
      { label: "Personal Trainer in Bellandur", href: "/personal-trainer/bangalore/bellandur" },
      { label: "Personal Trainer in Sarjapur Main Road", href: "/personal-trainer/bangalore/sarjapur-main-road" },
      { label: "Personal Trainer in HSR Layout", href: "/personal-trainer/bangalore/hsr-layout" },
      { label: "Personal Trainer in Whitefield", href: "/personal-trainer/bangalore/whitefield" },
      { label: "Personal Trainer in Koramangala", href: "/personal-trainer/bangalore/koramangala" },
      { label: "Personal Trainer in Indiranagar", href: "/personal-trainer/bangalore/indiranagar" },
      { label: "Personal Trainer in Marathahalli", href: "/personal-trainer/bangalore/marathahalli" },
      { label: "Personal Trainer in JP Nagar", href: "/personal-trainer/bangalore/jp-nagar" },
      { label: "Personal Trainer in Electronic City", href: "/personal-trainer/bangalore/electronic-city" },
      { label: "Personal Trainer in Hebbal / Manyata", href: "/personal-trainer/bangalore/hebbal-manyata" },
      { label: "Personal Trainer in CV Raman Nagar", href: "/personal-trainer/bangalore/cv-raman-nagar" },
      { label: "Personal Trainer in Jayanagar", href: "/personal-trainer/bangalore/jayanagar" },
      { label: "Personal Trainer in BTM Layout", href: "/personal-trainer/bangalore/btm-layout" },
      { label: "Personal Trainer in Iblur", href: "/personal-trainer/bangalore/iblur" },
      { label: "Personal Trainer in Kaikondrahalli", href: "/personal-trainer/bangalore/kaikondrahalli" },
      { label: "Personal Trainer in Harlur", href: "/personal-trainer/bangalore/harlur" },
      { label: "Personal Trainer in Carmelaram", href: "/personal-trainer/bangalore/carmelaram" },
      { label: "Personal Trainer in Kasavanahalli", href: "/personal-trainer/bangalore/kasavanahalli" },
      { label: "Personal Trainer in Halanayakanahalli", href: "/personal-trainer/bangalore/halanayakanahalli" },
      { label: "Personal Trainer in Doddakannelli", href: "/personal-trainer/bangalore/doddakannelli" },
      { label: "Personal Trainer at Home Bangalore", href: "/personal-trainer/bangalore/home-training" },
      { label: "Weight Loss Coach Bangalore", href: "/weight-loss-coach/bangalore" },
      { label: "Fat Loss Trainer Bengaluru", href: "/fat-loss-trainer/bengaluru" },
      { label: "Personal Trainer Cost Bangalore", href: "/personal-trainer/bangalore/cost" },
      { label: "Corporate Wellness Programs Bangalore", href: "/corporate-wellness/bangalore" },
      { label: "Online Strength Training Bangalore", href: "/strength-training/bangalore" },
      { label: "Vegetarian Muscle Building Bangalore", href: "/vegetarian-muscle-building/bangalore" },
      { label: "Powerlifting Coach Online Bangalore", href: "/powerlifting-coach/bangalore" },
      { label: "Strength Training HSR Layout", href: "/strength-training/bangalore/hsr-layout" },
      { label: "Yoga Trainer in Bangalore", href: "/yoga-trainer/bangalore" },
      { label: "Pilates Trainer in Bangalore", href: "/pilates-trainer/bangalore" },
      { label: "Diabetes Reversal Coach Bangalore", href: "/diabetes-reversal-coach/bangalore" },
    ],
  },
  {
    heading: "Mumbai",
    links: [
      { label: "Online Personal Trainer Mumbai", href: "/personal-trainer/mumbai" },
      { label: "Personal Trainer Bandra", href: "/personal-trainer/mumbai/bandra" },
      { label: "Personal Trainer BKC", href: "/personal-trainer/mumbai/bkc" },
      { label: "Personal Trainer Powai", href: "/personal-trainer/mumbai/powai" },
      { label: "Personal Trainer Andheri", href: "/personal-trainer/mumbai/andheri" },
      { label: "Personal Trainer Lower Parel", href: "/personal-trainer/mumbai/lower-parel" },
      { label: "Online Strength Training Mumbai", href: "/strength-training/mumbai" },
      { label: "Vegetarian Muscle Building Mumbai", href: "/vegetarian-muscle-building/mumbai" },
      { label: "Strength Coach BKC Mumbai", href: "/strength-training/mumbai/bkc" },
      { label: "Online Yoga Classes Mumbai", href: "/yoga/mumbai" },
      { label: "Online Yoga Bandra Mumbai", href: "/yoga/mumbai/bandra" },
      { label: "Online Yoga BKC Mumbai", href: "/yoga/mumbai/bkc" },
      { label: "Prenatal Yoga Mumbai Online", href: "/prenatal-yoga/mumbai" },
    ],
  },
  {
    heading: "Delhi NCR",
    links: [
      { label: "Online Personal Trainer Delhi NCR", href: "/personal-trainer/delhi-ncr" },
      { label: "Personal Trainer Gurgaon", href: "/personal-trainer/gurgaon" },
      { label: "Personal Trainer Cyber City Gurgaon", href: "/personal-trainer/gurgaon/cyber-city" },
      { label: "Personal Trainer Noida", href: "/personal-trainer/noida" },
      { label: "Personal Trainer Greater Noida", href: "/personal-trainer/greater-noida" },
      { label: "Personal Trainer Faridabad", href: "/personal-trainer/faridabad" },
      { label: "Personal Trainer South Delhi", href: "/personal-trainer/delhi/south-delhi" },
      { label: "Personal Trainer Dwarka", href: "/personal-trainer/delhi/dwarka" },
      { label: "Online Strength Training Delhi NCR", href: "/strength-training/delhi-ncr" },
      { label: "Strength Coach Cyber City Gurgaon", href: "/strength-training/gurgaon/cyber-city" },
      { label: "Strength Coach Noida", href: "/strength-training/noida" },
      { label: "Strength Coach South Delhi", href: "/strength-training/delhi/south-delhi" },
      { label: "Vegetarian Muscle Building Delhi NCR", href: "/vegetarian-muscle-building/delhi-ncr" },
      { label: "Online Yoga Classes Delhi NCR", href: "/yoga/delhi-ncr" },
      { label: "Online Yoga Gurgaon", href: "/yoga/gurgaon" },
      { label: "Online Yoga Noida", href: "/yoga/noida" },
      { label: "Online Yoga South Delhi", href: "/yoga/delhi/south-delhi" },
      { label: "Online Yoga Dwarka", href: "/yoga/delhi/dwarka" },
    ],
  },
  {
    heading: "Pune",
    links: [
      { label: "Online Personal Trainer Pune", href: "/personal-trainer/pune" },
      { label: "Personal Trainer Hinjewadi", href: "/personal-trainer/pune/hinjewadi" },
      { label: "Personal Trainer Kharadi", href: "/personal-trainer/pune/kharadi" },
      { label: "Personal Trainer Baner", href: "/personal-trainer/pune/baner" },
      { label: "Personal Trainer Koregaon Park", href: "/personal-trainer/pune/koregaon-park" },
      { label: "Personal Trainer Wakad", href: "/personal-trainer/pune/wakad" },
      { label: "Personal Trainer Magarpatta", href: "/personal-trainer/pune/magarpatta" },
      { label: "Online Strength Training Pune", href: "/strength-training/pune" },
      { label: "Strength Coach Hinjewadi Pune", href: "/strength-training/pune/hinjewadi" },
      { label: "Strength Coach Kharadi Pune", href: "/strength-training/pune/kharadi" },
      { label: "Strength Coach Baner Pune", href: "/strength-training/pune/baner" },
      { label: "Vegetarian Muscle Building Pune", href: "/vegetarian-muscle-building/pune" },
      { label: "Online Yoga Classes Pune", href: "/yoga/pune" },
      { label: "Online Yoga Hinjewadi", href: "/yoga/pune/hinjewadi" },
      { label: "Online Yoga Kharadi", href: "/yoga/pune/kharadi" },
      { label: "Online Yoga Baner Pune", href: "/yoga/pune/baner" },
      { label: "Online Yoga Koregaon Park", href: "/yoga/pune/koregaon-park" },
    ],
  },
  {
    heading: "Hyderabad",
    links: [
      { label: "Online Personal Trainer Hyderabad", href: "/personal-trainer/hyderabad" },
      { label: "Personal Trainer Gachibowli", href: "/personal-trainer/hyderabad/gachibowli" },
      { label: "Personal Trainer HITEC City", href: "/personal-trainer/hyderabad/hitec-city" },
      { label: "Personal Trainer Banjara Hills", href: "/personal-trainer/hyderabad/banjara-hills" },
      { label: "Personal Trainer Jubilee Hills", href: "/personal-trainer/hyderabad/jubilee-hills" },
    ],
  },
  {
    heading: "Chennai",
    links: [
      { label: "Online Personal Trainer Chennai", href: "/personal-trainer/chennai" },
      { label: "Personal Trainer OMR Chennai", href: "/personal-trainer/chennai/omr" },
      { label: "Personal Trainer Velachery", href: "/personal-trainer/chennai/velachery" },
      { label: "Personal Trainer T Nagar Chennai", href: "/personal-trainer/chennai/t-nagar" },
      { label: "Personal Trainer Adyar Chennai", href: "/personal-trainer/chennai/adyar" },
      { label: "Personal Trainer Anna Nagar", href: "/personal-trainer/chennai/anna-nagar" },
    ],
  },
  {
    heading: "Kolkata",
    links: [
      { label: "Online Personal Trainer Kolkata", href: "/personal-trainer/kolkata" },
      { label: "Personal Trainer Salt Lake Kolkata", href: "/personal-trainer/kolkata/salt-lake" },
      { label: "Personal Trainer New Town Kolkata", href: "/personal-trainer/kolkata/new-town" },
      { label: "Personal Trainer Park Street Kolkata", href: "/personal-trainer/kolkata/park-street" },
      { label: "Online Strength Training Kolkata", href: "/strength-training/kolkata" },
      { label: "Strength Coach Salt Lake Kolkata", href: "/strength-training/kolkata/salt-lake" },
      { label: "Online Yoga Classes Kolkata", href: "/yoga/kolkata" },
      { label: "Online Yoga Salt Lake Kolkata", href: "/yoga/kolkata/salt-lake" },
      { label: "Online Yoga Park Street Kolkata", href: "/yoga/kolkata/park-street" },
      { label: "Prenatal Yoga Kolkata Online", href: "/prenatal-yoga/kolkata" },
    ],
  },
  {
    heading: "Ahmedabad",
    links: [
      { label: "Online Personal Trainer Ahmedabad", href: "/personal-trainer/ahmedabad" },
      { label: "Personal Trainer SG Highway Ahmedabad", href: "/personal-trainer/ahmedabad/sg-highway" },
      { label: "Personal Trainer Prahlad Nagar Ahmedabad", href: "/personal-trainer/ahmedabad/prahlad-nagar" },
      { label: "Personal Trainer Satellite Ahmedabad", href: "/personal-trainer/ahmedabad/satellite" },
    ],
  },
  {
    heading: "Other Indian Cities",
    links: [
      { label: "Personal Trainer Jaipur", href: "/personal-trainer/jaipur" },
      { label: "Personal Trainer Lucknow", href: "/personal-trainer/lucknow" },
      { label: "Personal Trainer Chandigarh", href: "/personal-trainer/chandigarh" },
      { label: "Personal Trainer Indore", href: "/personal-trainer/indore" },
      { label: "Personal Trainer Coimbatore", href: "/personal-trainer/coimbatore" },
      { label: "Personal Trainer Kochi", href: "/personal-trainer/kochi" },
      { label: "Personal Trainer Thiruvananthapuram", href: "/personal-trainer/thiruvananthapuram" },
      { label: "Personal Trainer Bhubaneswar", href: "/personal-trainer/bhubaneswar" },
      { label: "Personal Trainer Guwahati", href: "/personal-trainer/guwahati" },
      { label: "Personal Trainer Nagpur", href: "/personal-trainer/nagpur" },
      { label: "Personal Trainer Visakhapatnam", href: "/personal-trainer/visakhapatnam" },
      { label: "Personal Trainer Mysore", href: "/personal-trainer/mysore" },
      { label: "Personal Trainer Mangalore", href: "/personal-trainer/mangalore" },
      { label: "Personal Trainer Surat", href: "/personal-trainer/surat" },
      { label: "Personal Trainer Vadodara", href: "/personal-trainer/vadodara" },
    ],
  },
  {
    heading: "USA & NRI",
    links: [
      { label: "Online Personal Trainer USA NRI", href: "/personal-trainer/usa-nri" },
      { label: "Personal Trainer Indian Americans", href: "/personal-trainer/usa/indian-americans" },
      { label: "Personal Trainer Texas NRI", href: "/personal-trainer/usa/texas" },
      { label: "Online Personal Trainer NJ Indian", href: "/personal-trainer/usa/new-jersey" },
      { label: "Personal Trainer Edison NJ", href: "/personal-trainer/usa/new-jersey/edison" },
      { label: "Personal Trainer Iselin NJ", href: "/personal-trainer/usa/new-jersey/iselin" },
      { label: "Personal Trainer Jersey City Indian", href: "/personal-trainer/usa/new-jersey/jersey-city" },
      { label: "Personal Trainer Princeton NJ", href: "/personal-trainer/usa/new-jersey/princeton" },
      { label: "Online Personal Trainer Bay Area Indian", href: "/personal-trainer/usa/bay-area" },
      { label: "Personal Trainer Cupertino Indian", href: "/personal-trainer/usa/bay-area/cupertino" },
      { label: "Personal Trainer San Jose Indian", href: "/personal-trainer/usa/bay-area/san-jose" },
      { label: "Personal Trainer Fremont Indian", href: "/personal-trainer/usa/bay-area/fremont" },
      { label: "Personal Trainer Sunnyvale Indian", href: "/personal-trainer/usa/bay-area/sunnyvale" },
      { label: "Personal Trainer Palo Alto Indian", href: "/personal-trainer/usa/bay-area/palo-alto" },
      { label: "Online Strength Training USA NRI", href: "/strength-training/usa-nri" },
      { label: "Vegetarian Muscle Building USA", href: "/vegetarian-muscle-building/usa" },
      { label: "Online Yoga Classes USA NRI", href: "/yoga/usa-nri" },
      { label: "Prenatal Yoga Online USA NRI", href: "/prenatal-yoga/usa-nri" },
      { label: "Online Yoga for NRIs", href: "/yoga/nri" },
    ],
  },
  {
    heading: "International",
    links: [
      { label: "Online Personal Trainer UK Indian", href: "/personal-trainer/uk" },
      { label: "Personal Trainer London Indian", href: "/personal-trainer/uk/london" },
      { label: "Personal Trainer Birmingham Indian", href: "/personal-trainer/uk/birmingham" },
      { label: "Online Personal Trainer Canada Indian", href: "/personal-trainer/canada" },
      { label: "Personal Trainer Toronto Indian", href: "/personal-trainer/canada/toronto" },
      { label: "Personal Trainer Vancouver Indian", href: "/personal-trainer/canada/vancouver" },
      { label: "Personal Trainer Brampton Indian", href: "/personal-trainer/canada/brampton" },
      { label: "Online Personal Trainer Australia Indian", href: "/personal-trainer/australia" },
      { label: "Personal Trainer Sydney Indian", href: "/personal-trainer/australia/sydney" },
      { label: "Personal Trainer Melbourne Indian", href: "/personal-trainer/australia/melbourne" },
      { label: "Online Personal Trainer Dubai Indian", href: "/personal-trainer/dubai" },
      { label: "Personal Trainer Abu Dhabi Indian", href: "/personal-trainer/abu-dhabi" },
      { label: "Online Personal Trainer Singapore Indian", href: "/personal-trainer/singapore" },
      { label: "Online Personal Trainer Germany Indian", href: "/personal-trainer/germany" },
    ],
  },
  {
    heading: "Online Coaching",
    links: [
      { label: "Online Personal Trainer India", href: "/online-personal-trainer/india" },
      { label: "Female Personal Trainer India", href: "/female-personal-trainer/india" },
      { label: "Online Yoga Classes India", href: "/online-yoga/india" },
      { label: "Online Hatha Yoga India", href: "/online-yoga/hatha" },
      { label: "Online Vinyasa Yoga India", href: "/online-yoga/vinyasa" },
      { label: "Prenatal Yoga Online India", href: "/prenatal-yoga/india" },
    ],
  },
  {
    heading: "Women's Health & Specialty",
    links: [
      { label: "PCOS Fitness Coach Bengaluru", href: "/pcos-fitness-coach/bengaluru" },
      { label: "Diabetes Fitness Coach Bengaluru", href: "/diabetes-fitness-coach/bengaluru" },
      { label: "Thyroid Fitness Coach Bengaluru", href: "/thyroid-fitness-coach/bengaluru" },
      { label: "GLP-1 / Mounjaro Coach India", href: "/glp1-mounjaro-coach/india" },
      { label: "Diabetes Reversal Coach India", href: "/diabetes-reversal-coach/india" },
      { label: "Postpartum Weight Loss India", href: "/postpartum-weight-loss/india" },
      { label: "Diastasis Recti Recovery India", href: "/diastasis-recti-recovery/india" },
      { label: "Post Pregnancy Weight Loss Coach", href: "/post-pregnancy-weight-loss-coach/india" },
      { label: "Lactation Safe Weight Loss", href: "/lactation-safe-weight-loss/india" },
    ],
  },
  {
    heading: "Calculators & Tools",
    links: [
      { label: "BMI Calculator India", href: "/bmi-calculator" },
      { label: "Calorie Calculator India", href: "/calorie-calculator" },
      { label: "Macro Calculator India", href: "/macro-calculator" },
      { label: "Ideal Weight Calculator India", href: "/ideal-weight-calculator" },
      { label: "TDEE Calculator India", href: "/tdee-calculator" },
      { label: "Daily Calorie Burn Calculator", href: "/daily-calorie-burn-calculator" },
      { label: "Indian Fat Loss Guide", href: "/indian-fat-loss-guide" },
    ],
  },
  {
    heading: "Comparisons",
    links: [
      { label: "Personal Trainer vs Cult.fit", href: "/compare/personal-trainer-vs-cultfit" },
      { label: "Personal Trainer vs Cure.fit", href: "/compare/personal-trainer-vs-curefit" },
      { label: "Personal Trainer vs Cult Pass Live", href: "/compare/personal-trainer-vs-cult-pass-live" },
      { label: "Personal Trainer vs HealthifyMe", href: "/compare/personal-trainer-vs-healthifyme" },
      { label: "Personal Trainer vs Fittr", href: "/compare/personal-trainer-vs-fittr" },
      { label: "Personal Trainer vs Anytime Fitness", href: "/compare/personal-trainer-vs-anytime-fitness" },
      { label: "Personal Trainer vs Gym Membership", href: "/compare/personal-trainer-vs-gym-membership" },
    ],
  },
  {
    heading: "Corporate Wellness",
    links: [
      { label: "Corporate Wellness Programs India", href: "/corporate-wellness/india" },
      { label: "Corporate Wellness Bangalore", href: "/corporate-wellness/bangalore" },
      { label: "Corporate Wellness Mumbai", href: "/corporate-wellness/mumbai" },
      { label: "Corporate Wellness Delhi NCR", href: "/corporate-wellness/delhi-ncr" },
      { label: "Corporate Wellness Pune", href: "/corporate-wellness/pune" },
      { label: "Corporate Wellness Hyderabad", href: "/corporate-wellness/hyderabad" },
      { label: "Corporate Wellness Chennai", href: "/corporate-wellness/chennai" },
      { label: "Office Yoga Programs India", href: "/corporate-wellness/yoga" },
      { label: "Employee Fitness Programs", href: "/corporate-wellness/employee-fitness" },
    ],
  },
];

export function GeoSEOFooter() {
  return (
    <section className="bg-[#FAFAF7] border-t border-slate-200 print:hidden">
      <div className="container mx-auto max-w-7xl px-4 py-14 sm:py-16">
        <nav aria-label="Personal Trainer & Fitness Searches Across India">
          <h2 className="font-display text-2xl sm:text-3xl text-fv-navy font-bold tracking-tight">
            Personal Trainer &amp; Fitness Searches Across India
          </h2>
          <p className="mt-2 text-sm text-fv-text/60 max-w-2xl">
            Find certified personal trainers, yoga instructors, strength coaches, and specialist fitness professionals near you.
          </p>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-6 gap-y-10">
            {GROUPS.map((g) => (
              <div key={g.heading} className={g.links.length > 15 ? "col-span-2" : ""}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-fv-navy/70 mb-3 border-b border-fv-navy/10 pb-2">
                  {g.heading}
                </h3>
                <ul className="space-y-1.5">
                  {g.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        to={l.href}
                        className="text-[13px] leading-snug text-fv-text/80 hover:text-fv-orange transition-colors block"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </section>
  );
}
