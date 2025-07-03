// File category definitions
export const COMPILED_CATEGORIES = ["full", "automation"];
export const GENERATED_CATEGORIES = [
  "basic",
  "personal", 
  "professional",
  "goals",
  "behavioral",
  "relationships",
  "communication",
  "accounts",
];

// Category emoji mapping
export const CATEGORY_EMOJIS: Record<string, string> = {
  behavioral: "🎯",
  goals: "🚀", 
  relationships: "👥",
  professional: "💼",
  personal: "❤️",
  accounts: "🔐",
  style: "✨",
  communication: "💬",
  general: "📄",
  bio: "📄",
  basic: "📄",
  full: "🌟",
  automation: "🤖",
};

// Insight/category color mapping
export const CATEGORY_COLORS: Record<string, string> = {
  professional: "blue",
  personal: "green", 
  communication: "purple",
  behavioral: "orange",
  technical: "teal",
  general: "gray",
  basic: "gray",
  accounts: "cyan",
  relationships: "pink",
  goals: "yellow",
};

// Utility functions
export const getCategory = (fileName: string): string => {
  return fileName.replace(".md", "");
};

export const getCategoryEmoji = (category: string): string => {
  const displayCategory = category === "bio" ? "general" : category;
  return CATEGORY_EMOJIS[displayCategory] || "📄";
};

export const getCategoryColor = (category: string): string => {
  return CATEGORY_COLORS[category.toLowerCase()] || "gray";
};

export const getCategoryWithEmoji = (category: string): string => {
  const emoji = getCategoryEmoji(category);
  return `${emoji} ${category}`;
};

export const isCompiledCategory = (category: string): boolean => {
  return COMPILED_CATEGORIES.includes(category);
};

export const isGeneratedCategory = (category: string): boolean => {
  return GENERATED_CATEGORIES.includes(category);
}; 