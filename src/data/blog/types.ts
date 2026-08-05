export interface ArticleMeta {
  id: number;
  title: string;
  slug: string;
  category: string;
  tags: string[];
  author: string;
  publishedDate: string;
  updatedDate: string;
  readTime: number;
  metaTitle: string;
  metaDescription: string;
  imageAlt: string;
  imageCaption: string;
  searchIntent: "informational" | "transactional" | "navigational" | "commercial";
  primaryKeyword: string;
  secondaryKeywords: string[];
  relatedSlugs: string[];
  hub: string;
  excerpt: string;
  faqs: { question: string; answer: string }[];
}
