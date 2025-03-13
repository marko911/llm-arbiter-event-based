/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude fsevents and other problematic native modules
    config.externals = [...(config.externals || []), 'fsevents'];

    // Add a fallback for the fsevents module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fsevents: false,
        chokidar: false
      };
    }

    return config;
  },
};

export default nextConfig;
