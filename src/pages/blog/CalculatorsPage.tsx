import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calculator, Flame, Dumbbell, Sparkles, Scale, ArrowLeft, CheckCircle2 } from "lucide-react";
import fitvedLogo from "@/assets/fitved-logo.png";
import { BookTrialModal } from "@/components/BookTrialModal";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { BlogSeo } from "@/components/blog/BlogSeo";
import { generateBreadcrumbSchema, SITE_URL } from "@/lib/blog/seo";

export default function CalculatorsPage() {
  const [trialModalOpen, setTrialModalOpen] = useState(false);

  // BMR & TDEE State
  const [gender, setGender] = useState<"male" | "female">("male");
  const [age, setAge] = useState<number>(28);
  const [weight, setWeight] = useState<number>(72);
  const [height, setHeight] = useState<number>(175);
  const [activity, setActivity] = useState<number>(1.375); // Lightly active
  const [goal, setGoal] = useState<"maintain" | "lose" | "gain">("lose");

  // Calculations
  const bmr = Math.round(
    gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161
  );

  const tdee = Math.round(bmr * activity);

  const targetCalories =
    goal === "lose" ? tdee - 400 : goal === "gain" ? tdee + 350 : tdee;

  // Protein requirement (1.6g - 2.2g per kg depending on goal)
  const proteinTargetG = Math.round(weight * (goal === "gain" ? 2.0 : 1.8));

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "FitVed Journal", url: "/blog" },
    { name: "Fitness Calculators", url: "/blog/calculators" },
  ];

  return (
    <BlogLayout breadcrumbs={breadcrumbs}>
      <BlogSeo
        title="Free Fitness Calculators — BMR, TDEE & Protein | FitVed"
        description="Free interactive calculators for BMR, TDEE (maintenance calories) and daily protein target, calibrated for Indian lifestyles."
        canonical={`${SITE_URL}/blog/calculators`}
        type="website"
        keywords={["bmr calculator", "tdee calculator", "protein calculator", "calorie calculator india"]}
        jsonLd={[generateBreadcrumbSchema(breadcrumbs)]}
      />

      {/* Hero */}
      <section className="bg-slate-900 text-white py-12 px-4 text-center">
        <div className="container mx-auto max-w-3xl space-y-3">
          <Badge className="bg-orange-500/20 text-orange-400 border-0 px-3 py-1">
            Interactive Science Tools
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            FitVed Science Fitness Calculators
          </h1>
          <p className="text-sm sm:text-base text-slate-300">
            Calculate your Basal Metabolic Rate (BMR), Daily Calorie Maintenance (TDEE), Target Protein Intake, and Macro Split calibrated for Indian lifestyles.
          </p>
        </div>
      </section>

      {/* Main Body */}
      <main className="container mx-auto max-w-4xl px-4 py-10 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Inputs Panel */}
          <div className="md:col-span-7 p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
            <div className="flex items-center gap-2 font-bold text-lg text-foreground border-b border-border pb-3">
              <Calculator className="h-5 w-5 text-primary" /> Your Metrics
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Gender</Label>
                <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Age (Years)</Label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Weight (kg)</Label>
                <Input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Height (cm)</Label>
                <Input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Daily Activity Level</Label>
              <Select value={String(activity)} onValueChange={(v) => setActivity(Number(v))}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1.2">Sedentary (Desk Job, little exercise)</SelectItem>
                  <SelectItem value="1.375">Lightly Active (1-3 workout days/wk)</SelectItem>
                  <SelectItem value="1.55">Moderately Active (3-5 workout days/wk)</SelectItem>
                  <SelectItem value="1.725">Very Active (6-7 workout days/wk)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Primary Fitness Goal</Label>
              <Select value={goal} onValueChange={(v: any) => setGoal(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose">Fat Loss & Toning (Caloric Deficit)</SelectItem>
                  <SelectItem value="maintain">Maintain Weight & Recomp</SelectItem>
                  <SelectItem value="gain">Muscle Growth (Caloric Surplus)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Summary Panel */}
          <div className="md:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 text-white shadow-xl space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-xs text-orange-400 font-bold uppercase tracking-wider block">Your Calculated Targets</span>
                <h3 className="text-2xl font-extrabold text-white mt-1">{targetCalories} kcal / day</h3>
                <span className="text-xs text-slate-400">
                  {goal === "lose" ? "Target for 0.5kg/week fat loss" : goal === "gain" ? "Target for lean mass surplus" : "Maintenance Energy Needed"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-slate-400 block font-medium">BMR (Base Rate)</span>
                  <span className="text-lg font-bold text-white mt-1 block">{bmr} kcal</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                  <span className="text-slate-400 block font-medium">TDEE (Burned)</span>
                  <span className="text-lg font-bold text-white mt-1 block">{tdee} kcal</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-1">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider block">Daily Protein Goal</span>
                <span className="text-2xl font-extrabold text-white">{proteinTargetG} grams / day</span>
                <p className="text-[11px] text-slate-300">
                  Equivalent to ~{Math.round(proteinTargetG / 25)} protein servings (Paneer, Soya, Dahi, Whey, Sprouts).
                </p>
              </div>

              <Button
                onClick={() => setTrialModalOpen(true)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-11"
              >
                Get Custom Plan from Coach
              </Button>
            </div>
          </div>
        </div>
      </main>

      <BookTrialModal open={trialModalOpen} onOpenChange={setTrialModalOpen} />
    </BlogLayout>
  );
}
