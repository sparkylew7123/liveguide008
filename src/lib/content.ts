import fs from 'fs';
import path from 'path';

export interface LandingContent {
  hero: {
    badge: string;
    title: string;
    description: string;
    ctaText: string;
    features: string[];
  };
  whyChoose: {
    title: string;
    subtitle: string;
    features: Array<{
      title: string;
      description: string;
    }>;
  };
  testimonials: {
    title: string;
    subtitle: string;
    items: Array<{
      name: string;
      role: string;
      content: string;
      rating: number;
    }>;
  };
  cta: {
    title: string;
    subtitle: string;
    emailPlaceholder: string;
    buttonText: string;
    disclaimer: string;
  };
  footer: {
    tagline: string;
    copyright: string;
  };
}

export interface AuthContent {
  login: {
    title: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    rememberMe: string;
    submitButton: string;
    forgotPassword: string;
    signUpPrompt: string;
    signUpLink: string;
    orDivider: string;
    googleButton: string;
    githubButton: string;
  };
  register: {
    title: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    submitButton: string;
    termsText: string;
    termsLink: string;
    privacyLink: string;
    signInPrompt: string;
    signInLink: string;
    orDivider: string;
    googleButton: string;
    githubButton: string;
  };
  verifyEmail: {
    title: string;
    message: string;
    helpText: string;
    returnButton: string;
  };
}

export interface InboxContent {
  header: {
    title: string;
    subtitle: string;
  };
  emptyState: {
    title: string;
    description: string;
    populateButton: string;
  };
  tabs: {
    all: string;
    unread: string;
    archived: string;
  };
  filters: {
    all: string;
    celeste: string;
    victor: string;
    elena: string;
  };
  loadingText: string;
  notifications: {
    achievement: string;
    reminder: string;
    system: string;
  };
}

const contentCache: Map<string, any> = new Map();

export function getContent<T>(fileName: string): T {
  if (contentCache.has(fileName)) {
    return contentCache.get(fileName) as T;
  }

  try {
    const filePath = path.join(process.cwd(), 'content', fileName);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const content = JSON.parse(fileContent) as T;
    contentCache.set(fileName, content);
    return content;
  } catch (error) {
    console.error(`Error loading content from ${fileName}:`, error);
    throw new Error(`Failed to load content from ${fileName}`);
  }
}

export function getLandingContent(): LandingContent {
  return getContent<LandingContent>('landing.json');
}

export function getAuthContent(): AuthContent {
  return getContent<AuthContent>('auth.json');
}

export function getInboxContent(): InboxContent {
  return getContent<InboxContent>('inbox.json');
}