/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,

  images: {
    domains: [],
    formats: ["image/avif", "image/webp"],
  },

  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs", "resend"],
    optimizePackageImports: ["lucide-react", "recharts"],
  },

  // Pass VAPID key to client-side
  env: {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  },

  async headers() {
    return [
      // Long-lived cache for static assets — before security headers
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Security headers — all routes
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https:",
              "worker-src 'self' blob:",
              "frame-src 'self' https://calendly.com",
            ].join("; "),
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      // Canonical redirect: poll.city → www.poll.city (single hop)
      {
        source: "/(.*)",
        has: [{ type: "host", value: "poll.city" }],
        destination: "https://www.poll.city/:path*",
        permanent: true,
      },
    ];
  },

  webpack: (config) => {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;
