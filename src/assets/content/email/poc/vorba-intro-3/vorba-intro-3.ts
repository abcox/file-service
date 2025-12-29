// TypeScript interfaces for Vorba Intro Email Template

export interface VorbaIntroEmailData {
  email: EmailMeta;
  theme: EmailTheme;
  content: EmailContent;
  cta: CallToAction;
  personalization: PersonalizationData;
  tracking: TrackingData;
}

export interface EmailMeta {
  title: string;
}

export interface EmailTheme {
  backgroundColor: string;
  containerWidth: string;
  containerBgColor: string;
  borderRadius: string;
  containerPadding: string;
  fontFamily: string;
  textColor: string;
  titleFontSize: string;
  titleFontWeight: string;
  titleLineHeight: string;
  titlePaddingBottom: string;
  bodyFontSize: string;
  bodyLineHeight: string;
  bodyPaddingBottom: string;
  ctaPaddingTop: string;
  ctaPaddingBottom: string;
  ctaFontSize: string;
  ctaColor: string;
  ctaFontWeight: string;
  footerFontSize: string;
  footerColor: string;
}

export interface EmailContent {
  greeting: string;
  headline: string;
  mainMessage: string;
  defaultQuestion: string;
}

export interface CallToAction {
  text: string;
  url: string;
}

export interface PersonalizationData {
  recipientName?: string | null;
  customQuestion?: string | null;
  includeFooter: boolean;
  senderName?: string | null;
  senderTitle?: string | null;
  companyName?: string | null;
}

export interface TrackingData {
  utmParams?: string | null;
}

// Service layer interfaces
export interface EmailPersonalizationRequest {
  templateId: string;
  recipientEmail: string;
  personalization: Partial<PersonalizationData>;
  contentOverrides?: Partial<EmailContent>;
  trackingOverrides?: Partial<TrackingData>;
}

export interface EmailRenderRequest {
  templatePath: string;
  data: VorbaIntroEmailData;
  outputFormat?: 'html' | 'text';
}

export interface PersonalizationStrategy {
  // Industry-specific customizations
  industryContext?: {
    industry: string;
    customQuestion: string;
    customCTA?: string;
  };

  // Company size targeting
  companySize?: {
    size: 'startup' | 'midmarket' | 'enterprise';
    customMessage: string;
  };

  // Geographic targeting
  location?: {
    region: string;
    timezone: string;
    localizedCTA?: string;
  };
}

// A/B Testing interfaces
export interface ABTestVariant {
  variantId: string;
  name: string;
  weight: number; // 0-100
  contentOverrides: Partial<EmailContent>;
  themeOverrides?: Partial<EmailTheme>;
}

export interface ABTestConfig {
  testId: string;
  testName: string;
  variants: ABTestVariant[];
  isActive: boolean;
}
