import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	transpilePackages: ["@nerdy/pipeline"],
};

export default nextConfig;
