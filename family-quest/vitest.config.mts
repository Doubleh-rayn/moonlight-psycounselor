import { defineConfig } from "vitest/config";

// 순수 함수(lib/)만 테스트한다. 화면 컴포넌트는 테스트 범위 밖.
export default defineConfig({
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
