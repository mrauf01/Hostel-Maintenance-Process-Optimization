/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
