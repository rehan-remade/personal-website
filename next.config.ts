import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Don't bundle onnxruntime-node, let Node.js require it at runtime.
      // config.externals = [...(config.externals || []), "onnxruntime-node"];
    }
    return config;
  },
};

export default nextConfig;
