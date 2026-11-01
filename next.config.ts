import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 로그인 상태에 따라 분기하는 페이지가 많아 정적 캐싱을 끈다.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
