/** @type {import('next').NextConfig} */
const nextConfig = {
  // All images are local (/public) or data: URLs; no remote optimization is
  // used, so we don't open the image optimizer to arbitrary hosts (SSRF).
  images: {
    remotePatterns: [],
  },
  eslint: { ignoreDuringBuilds: true },
  // The packet files live outside /public on purpose, so tell Vercel to ship
  // them with the function that serves them.
  experimental: {
    outputFileTracingIncludes: {
      "/api/packet/[kind]": ["./packets/**"],
    },
  },
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [{ key: "Service-Worker-Allowed", value: "/" }],
      },
    ];
  },
};

export default nextConfig;
