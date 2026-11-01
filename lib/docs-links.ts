/**
 * Tautan ke dokumentasi di repo (0.17): onboarding menautkan bagian README yang menjelaskan env, sandi, Upstash, dan
 * Deployment Protection. Anchor dijaga `install-docs.test.ts` (harus ada di README).
 */
import { ENV_DOC_ANCHOR, UPSTREAM_REPO } from "./env-schema";

export const DOCS = {
  env: `${UPSTREAM_REPO}#${ENV_DOC_ANCHOR}`,
  upstash: `${UPSTREAM_REPO}#upstash-redis`,
  protect: `${UPSTREAM_REPO}#setelah-deploy-kunci-aksesnya`,
  installWithAi: `${UPSTREAM_REPO}/blob/main/INSTALL-WITH-AI.md`,
  notice: `${UPSTREAM_REPO}/blob/main/NOTICE.md`,
} as const;
