/**
 * Teks halaman Bantuan (1.0.0-rc.2, `/bantuan`; murni, tanpa logika). Versi panjangnya di docs/GUIDE.md, keterbatasan
 * di docs/LIMITATIONS.md. Langkah kirim ke jam per merek tidak ditulis ulang di sini: halaman memakai `watchSteps`
 * (`lib/intervals/watch.ts`) supaya sama persis dengan yang tampil setelah kirim. Teks per bahasa di
 * `lib/i18n/messages/help.ts` (1.2.0).
 */
import { DOCS } from "./docs-links";
import type { Locale } from "./i18n/locale";
import { HELP } from "./i18n/messages/help";

export interface HelpTopic {
  id: string;
  title: string;
  items: readonly string[];
}

const TOPIC_IDS = ["saran", "program", "latihan", "jam", "data"] as const;

export const helpIntro = (locale: Locale = "id") => HELP[locale].intro;
export const helpTopics = (locale: Locale = "id"): HelpTopic[] => TOPIC_IDS.map((id) => ({ id, ...HELP[locale].topics[id] }));
export const helpLinks = (locale: Locale = "id"): { label: string; href: string }[] => [
  { label: HELP[locale].links.guide, href: DOCS.guide },
  { label: HELP[locale].links.limitations, href: DOCS.limitations },
  { label: HELP[locale].links.references, href: DOCS.references },
];
export const helpDisclaimer = (locale: Locale = "id") => HELP[locale].disclaimer;

export const HELP_INTRO = helpIntro();
export const HELP_TOPICS: readonly HelpTopic[] = helpTopics();
export const HELP_LINKS: readonly { label: string; href: string }[] = helpLinks();
export const HELP_DISCLAIMER = helpDisclaimer();
