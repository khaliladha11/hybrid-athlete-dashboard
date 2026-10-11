import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Halaman Log dipecah: riwayat → Strength, cadangan → Setting (0.8).
  async redirects() {
    return [{ source: "/log", destination: "/strength#riwayat", permanent: false }];
  },
};

export default nextConfig;
