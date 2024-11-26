// vite.config.ts
import { defineConfig } from "file:///home/rui/workspaces/ciphorama/mdx-editor/node_modules/vite/dist/node/index.js";
import { readFileSync } from "node:fs";
import react from "file:///home/rui/workspaces/ciphorama/mdx-editor/node_modules/@vitejs/plugin-react/dist/index.mjs";
import dts from "file:///home/rui/workspaces/ciphorama/mdx-editor/node_modules/vite-plugin-dts/dist/index.mjs";
import svgr from "file:///home/rui/workspaces/ciphorama/mdx-editor/node_modules/vite-plugin-svgr/dist/index.js";
import tsconfigPaths from "file:///home/rui/workspaces/ciphorama/mdx-editor/node_modules/vite-tsconfig-paths/dist/index.mjs";
var ext = {
  cjs: "cjs",
  es: "js"
};
var packageJson = JSON.parse(readFileSync("./package.json", "utf-8"));
var IN_LADLE = process.env["LADLE"];
var externalPackages = [
  ...Object.keys(packageJson.dependencies),
  ...Object.keys(packageJson.peerDependencies),
  /@lexical\/react\/.*/,
  "react/jsx-runtime",
  "react/jsx-dev-runtime"
];
var vite_config_default = defineConfig({
  plugins: [
    react(IN_LADLE ? {} : { jsxRuntime: "classic" }),
    dts({
      rollupTypes: true,
      staticImport: true,
      compilerOptions: {
        skipLibCheck: true
      }
    }),
    svgr({
      svgrOptions: {
        svgo: true,
        replaceAttrValues: { "black": "currentColor" }
      }
    }),
    tsconfigPaths()
  ],
  server: {
    proxy: {
      "/uploads": "http://localhost:65432"
    }
  },
  build: {
    minify: "terser",
    cssMinify: false,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: (format, entryName) => {
        return `${entryName}.${ext[format]}`;
      }
    },
    rollupOptions: {
      output: {
        exports: "named",
        preserveModules: true,
        preserveModulesRoot: "src"
      },
      external: externalPackages
    }
  },
  test: {
    include: ["src/test/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"]
  },
  css: {
    modules: {
      scopeBehaviour: "local",
      localsConvention: "camelCaseOnly"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9ydWkvd29ya3NwYWNlcy9jaXBob3JhbWEvbWR4LWVkaXRvclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvcnVpL3dvcmtzcGFjZXMvY2lwaG9yYW1hL21keC1lZGl0b3Ivdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2hvbWUvcnVpL3dvcmtzcGFjZXMvY2lwaG9yYW1hL21keC1lZGl0b3Ivdml0ZS5jb25maWcudHNcIjsvLy8gPHJlZmVyZW5jZSB0eXBlcz1cInZpdGVzdFwiIC8+XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcydcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcbmltcG9ydCBkdHMgZnJvbSAndml0ZS1wbHVnaW4tZHRzJ1xuaW1wb3J0IHN2Z3IgZnJvbSAndml0ZS1wbHVnaW4tc3ZncidcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gJ3ZpdGUtdHNjb25maWctcGF0aHMnXG5cbmNvbnN0IGV4dCA9IHtcbiAgY2pzOiAnY2pzJyxcbiAgZXM6ICdqcycsXG59IGFzIGNvbnN0XG5cbmNvbnN0IHBhY2thZ2VKc29uID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoJy4vcGFja2FnZS5qc29uJywgJ3V0Zi04JykpIGFzIHtcbiAgZGVwZW5kZW5jaWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG4gIHBlZXJEZXBlbmRlbmNpZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cbn1cblxuY29uc3QgSU5fTEFETEUgPSBwcm9jZXNzLmVudlsnTEFETEUnXVxuXG5jb25zdCBleHRlcm5hbFBhY2thZ2VzID0gW1xuICAuLi5PYmplY3Qua2V5cyhwYWNrYWdlSnNvbi5kZXBlbmRlbmNpZXMpLFxuICAuLi5PYmplY3Qua2V5cyhwYWNrYWdlSnNvbi5wZWVyRGVwZW5kZW5jaWVzKSxcbiAgL0BsZXhpY2FsXFwvcmVhY3RcXC8uKi8sXG4gICdyZWFjdC9qc3gtcnVudGltZScsIFxuICAncmVhY3QvanN4LWRldi1ydW50aW1lJ1xuXVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KElOX0xBRExFID8ge30gOiB7IGpzeFJ1bnRpbWU6ICdjbGFzc2ljJyB9IGFzIGNvbnN0KSxcbiAgICBkdHMoe1xuICAgICAgcm9sbHVwVHlwZXM6IHRydWUsXG4gICAgICBzdGF0aWNJbXBvcnQ6IHRydWUsXG4gICAgICBjb21waWxlck9wdGlvbnM6IHtcbiAgICAgICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KSxcbiAgICBzdmdyKHtcbiAgICAgIHN2Z3JPcHRpb25zOiB7XG4gICAgICAgIHN2Z286IHRydWUsXG4gICAgICAgIHJlcGxhY2VBdHRyVmFsdWVzOiB7ICdibGFjayc6ICdjdXJyZW50Q29sb3InIH1cbiAgICAgIH1cbiAgICB9KSxcbiAgICB0c2NvbmZpZ1BhdGhzKClcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgcHJveHk6IHtcbiAgICAgICcvdXBsb2Fkcyc6ICdodHRwOi8vbG9jYWxob3N0OjY1NDMyJ1xuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgbWluaWZ5OiAndGVyc2VyJyxcbiAgICBjc3NNaW5pZnk6IGZhbHNlLFxuICAgIGxpYjoge1xuICAgICAgZW50cnk6ICdzcmMvaW5kZXgudHMnLFxuICAgICAgZm9ybWF0czogWydlcyddLFxuICAgICAgZmlsZU5hbWU6IChmb3JtYXQsIGVudHJ5TmFtZSkgPT4ge1xuICAgICAgICByZXR1cm4gYCR7ZW50cnlOYW1lfS4ke2V4dFtmb3JtYXQgYXMgJ2NqcycgfCAnZXMnXX1gIFxuICAgICAgfSxcbiAgICB9LFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBleHBvcnRzOiAnbmFtZWQnLFxuICAgICAgICBwcmVzZXJ2ZU1vZHVsZXM6IHRydWUsXG4gICAgICAgIHByZXNlcnZlTW9kdWxlc1Jvb3Q6ICdzcmMnXG4gICAgICB9LFxuICAgICAgZXh0ZXJuYWw6IGV4dGVybmFsUGFja2FnZXMsXG4gICAgfSxcbiAgfSxcbiAgdGVzdDoge1xuICAgIGluY2x1ZGU6IFsnc3JjL3Rlc3QvKiovKi50ZXN0Lnt0cyx0c3h9J10sXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgc2V0dXBGaWxlczogWydzcmMvdGVzdC9zZXR1cC50cyddLFxuICB9LFxuICBjc3M6IHtcbiAgICBtb2R1bGVzOiB7XG4gICAgICBzY29wZUJlaGF2aW91cjogJ2xvY2FsJyxcbiAgICAgIGxvY2Fsc0NvbnZlbnRpb246ICdjYW1lbENhc2VPbmx5J1xuICAgIH1cbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxTQUFTLG9CQUFvQjtBQUM3QixTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFDbEIsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sVUFBVTtBQUNqQixPQUFPLG1CQUFtQjtBQUUxQixJQUFNLE1BQU07QUFBQSxFQUNWLEtBQUs7QUFBQSxFQUNMLElBQUk7QUFDTjtBQUVBLElBQU0sY0FBYyxLQUFLLE1BQU0sYUFBYSxrQkFBa0IsT0FBTyxDQUFDO0FBS3RFLElBQU0sV0FBVyxRQUFRLElBQUksT0FBTztBQUVwQyxJQUFNLG1CQUFtQjtBQUFBLEVBQ3ZCLEdBQUcsT0FBTyxLQUFLLFlBQVksWUFBWTtBQUFBLEVBQ3ZDLEdBQUcsT0FBTyxLQUFLLFlBQVksZ0JBQWdCO0FBQUEsRUFDM0M7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUNGO0FBR0EsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTSxXQUFXLENBQUMsSUFBSSxFQUFFLFlBQVksVUFBVSxDQUFVO0FBQUEsSUFDeEQsSUFBSTtBQUFBLE1BQ0YsYUFBYTtBQUFBLE1BQ2IsY0FBYztBQUFBLE1BQ2QsaUJBQWlCO0FBQUEsUUFDZixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGLENBQUM7QUFBQSxJQUNELEtBQUs7QUFBQSxNQUNILGFBQWE7QUFBQSxRQUNYLE1BQU07QUFBQSxRQUNOLG1CQUFtQixFQUFFLFNBQVMsZUFBZTtBQUFBLE1BQy9DO0FBQUEsSUFDRixDQUFDO0FBQUEsSUFDRCxjQUFjO0FBQUEsRUFDaEI7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFlBQVk7QUFBQSxJQUNkO0FBQUEsRUFDRjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsS0FBSztBQUFBLE1BQ0gsT0FBTztBQUFBLE1BQ1AsU0FBUyxDQUFDLElBQUk7QUFBQSxNQUNkLFVBQVUsQ0FBQyxRQUFRLGNBQWM7QUFDL0IsZUFBTyxHQUFHLFNBQVMsSUFBSSxJQUFJLE1BQXNCLENBQUM7QUFBQSxNQUNwRDtBQUFBLElBQ0Y7QUFBQSxJQUNBLGVBQWU7QUFBQSxNQUNiLFFBQVE7QUFBQSxRQUNOLFNBQVM7QUFBQSxRQUNULGlCQUFpQjtBQUFBLFFBQ2pCLHFCQUFxQjtBQUFBLE1BQ3ZCO0FBQUEsTUFDQSxVQUFVO0FBQUEsSUFDWjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLFNBQVMsQ0FBQyw2QkFBNkI7QUFBQSxJQUN2QyxhQUFhO0FBQUEsSUFDYixZQUFZLENBQUMsbUJBQW1CO0FBQUEsRUFDbEM7QUFBQSxFQUNBLEtBQUs7QUFBQSxJQUNILFNBQVM7QUFBQSxNQUNQLGdCQUFnQjtBQUFBLE1BQ2hCLGtCQUFrQjtBQUFBLElBQ3BCO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
