/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // Legacy dashboard URLs from the first deployment. Kept as temporary
    // redirects so old bookmarks keep working without being cached forever.
    return [
      { source: "/dashboard/pnms/:path*", destination: "/pnms/:path*", permanent: false },
      { source: "/dashboard/brothers/:path*", destination: "/brothers/:path*", permanent: false }
    ];
  }
};

export default nextConfig;
