/** @type {import('next').NextConfig} */
const nextConfig = {
  // All images are local (/public) or data: URLs; no remote optimization is
  // used, so we don't open the image optimizer to arbitrary hosts (SSRF).
  images: {
    remotePatterns: [],
  },
  eslint: { ignoreDuringBuilds: true },
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
