export interface Topic {
  id: string;
  title: string;
  summary: string;
  platformTags: string[];
  impactScore: number; // 1-100
  category: string;
}

export interface ArticleContent {
  markdown: string;
  sources: GroundingSource[];
  coverImageBase64?: string; // Added for multimodal support
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export enum AppState {
  IDLE,
  SCANNING, // Searching for topics
  VIEWING_LIST, // Showing list
  GENERATING_ARTICLE, // Generating specific article
  READING // Reading an article
}

export interface GenerationStats {
  scannedSources: number;
  processingTime: string;
}