// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/shiva/OneDrive/Desktop/hrms-lastest/Frontend-HRMS-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/shiva/OneDrive/Desktop/hrms-lastest/Frontend-HRMS-main/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const getApiUrl = () => {
    let url = env.VITE_API_URL;
    if (mode === "production" || process.env.VERCEL || !url || url.includes("localhost:5000") || url.includes("127.0.0.1:5000") || url.includes("your-backend")) {
      return "https://hrms1-kk6q.onrender.com/api";
    }
    url = url.trim();
    if (!url.endsWith("/api")) {
      url = url.replace(/\/$/, "") + "/api";
    }
    return url;
  };
  const getWsUrl = () => {
    let url = env.VITE_WS_URL;
    if (!url || url.includes("your-backend")) {
      return "wss://hrms1-kk6q.onrender.com";
    }
    url = url.trim().replace(/\/$/, "");
    if (url.endsWith("/api")) {
      url = url.slice(0, -4);
    }
    if (url.startsWith("https://")) {
      url = "wss://" + url.substring(8);
    } else if (url.startsWith("http://")) {
      url = "ws://" + url.substring(7);
    }
    return url;
  };
  return {
    plugins: [react()],
    server: {
      port: 3e3,
      host: true,
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:5000",
          changeOrigin: true,
          secure: false
        }
      }
    },
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(getApiUrl()),
      "import.meta.env.VITE_WS_URL": JSON.stringify(getWsUrl())
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-ui": ["lucide-react", "framer-motion"],
            "vendor-charts": ["recharts"]
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxzaGl2YVxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXGhybXMtbGFzdGVzdFxcXFxGcm9udGVuZC1IUk1TLW1haW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXHNoaXZhXFxcXE9uZURyaXZlXFxcXERlc2t0b3BcXFxcaHJtcy1sYXN0ZXN0XFxcXEZyb250ZW5kLUhSTVMtbWFpblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvc2hpdmEvT25lRHJpdmUvRGVza3RvcC9ocm1zLWxhc3Rlc3QvRnJvbnRlbmQtSFJNUy1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIC8vIExvYWQgZW52IGZpbGUgZm9yIHRoZSBjdXJyZW50IG1vZGUgKC5lbnYsIC5lbnYuZGV2ZWxvcG1lbnQsIC5lbnYucHJvZHVjdGlvbiwgZXRjLilcclxuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKVxyXG5cclxuICBjb25zdCBnZXRBcGlVcmwgPSAoKSA9PiB7XHJcbiAgICBsZXQgdXJsID0gZW52LlZJVEVfQVBJX1VSTFxyXG4gICAgaWYgKG1vZGUgPT09ICdwcm9kdWN0aW9uJyB8fCBwcm9jZXNzLmVudi5WRVJDRUwgfHwgIXVybCB8fCB1cmwuaW5jbHVkZXMoJ2xvY2FsaG9zdDo1MDAwJykgfHwgdXJsLmluY2x1ZGVzKCcxMjcuMC4wLjE6NTAwMCcpIHx8IHVybC5pbmNsdWRlcygneW91ci1iYWNrZW5kJykpIHtcclxuICAgICAgcmV0dXJuICdodHRwczovL2hybXMxLWtrNnEub25yZW5kZXIuY29tL2FwaSdcclxuICAgIH1cclxuICAgIHVybCA9IHVybC50cmltKClcclxuICAgIGlmICghdXJsLmVuZHNXaXRoKCcvYXBpJykpIHtcclxuICAgICAgdXJsID0gdXJsLnJlcGxhY2UoL1xcLyQvLCAnJykgKyAnL2FwaSdcclxuICAgIH1cclxuICAgIHJldHVybiB1cmxcclxuICB9XHJcblxyXG5cclxuXHJcbiAgY29uc3QgZ2V0V3NVcmwgPSAoKSA9PiB7XHJcbiAgICBsZXQgdXJsID0gZW52LlZJVEVfV1NfVVJMXHJcbiAgICBpZiAoIXVybCB8fCB1cmwuaW5jbHVkZXMoJ3lvdXItYmFja2VuZCcpKSB7XHJcbiAgICAgIHJldHVybiAnd3NzOi8vaHJtczEta2s2cS5vbnJlbmRlci5jb20nXHJcbiAgICB9XHJcbiAgICB1cmwgPSB1cmwudHJpbSgpLnJlcGxhY2UoL1xcLyQvLCAnJylcclxuICAgIGlmICh1cmwuZW5kc1dpdGgoJy9hcGknKSkge1xyXG4gICAgICB1cmwgPSB1cmwuc2xpY2UoMCwgLTQpXHJcbiAgICB9XHJcbiAgICBpZiAodXJsLnN0YXJ0c1dpdGgoJ2h0dHBzOi8vJykpIHtcclxuICAgICAgdXJsID0gJ3dzczovLycgKyB1cmwuc3Vic3RyaW5nKDgpXHJcbiAgICB9IGVsc2UgaWYgKHVybC5zdGFydHNXaXRoKCdodHRwOi8vJykpIHtcclxuICAgICAgdXJsID0gJ3dzOi8vJyArIHVybC5zdWJzdHJpbmcoNylcclxuICAgIH1cclxuICAgIHJldHVybiB1cmxcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgcG9ydDogMzAwMCxcclxuICAgICAgaG9zdDogdHJ1ZSxcclxuICAgICAgYWxsb3dlZEhvc3RzOiB0cnVlLFxyXG4gICAgICBwcm94eToge1xyXG4gICAgICAgICcvYXBpJzoge1xyXG4gICAgICAgICAgdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTo1MDAwJyxcclxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBkZWZpbmU6IHtcclxuICAgICAgJ2ltcG9ydC5tZXRhLmVudi5WSVRFX0FQSV9VUkwnOiBKU09OLnN0cmluZ2lmeShnZXRBcGlVcmwoKSksXHJcbiAgICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9XU19VUkwnOiBKU09OLnN0cmluZ2lmeShnZXRXc1VybCgpKSxcclxuICAgIH0sXHJcbiAgICBidWlsZDoge1xyXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDE2MDAsXHJcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcclxuICAgICAgICBvdXRwdXQ6IHtcclxuICAgICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgICAndmVuZG9yLXJlYWN0JzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxyXG4gICAgICAgICAgICAndmVuZG9yLXVpJzogWydsdWNpZGUtcmVhY3QnLCAnZnJhbWVyLW1vdGlvbiddLFxyXG4gICAgICAgICAgICAndmVuZG9yLWNoYXJ0cyc6IFsncmVjaGFydHMnXSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfVxyXG59KVxyXG5cclxuXHJcblxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTZYLFNBQVMsY0FBYyxlQUFlO0FBQ25hLE9BQU8sV0FBVztBQUVsQixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUV4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7QUFFM0MsUUFBTSxZQUFZLE1BQU07QUFDdEIsUUFBSSxNQUFNLElBQUk7QUFDZCxRQUFJLFNBQVMsZ0JBQWdCLFFBQVEsSUFBSSxVQUFVLENBQUMsT0FBTyxJQUFJLFNBQVMsZ0JBQWdCLEtBQUssSUFBSSxTQUFTLGdCQUFnQixLQUFLLElBQUksU0FBUyxjQUFjLEdBQUc7QUFDM0osYUFBTztBQUFBLElBQ1Q7QUFDQSxVQUFNLElBQUksS0FBSztBQUNmLFFBQUksQ0FBQyxJQUFJLFNBQVMsTUFBTSxHQUFHO0FBQ3pCLFlBQU0sSUFBSSxRQUFRLE9BQU8sRUFBRSxJQUFJO0FBQUEsSUFDakM7QUFDQSxXQUFPO0FBQUEsRUFDVDtBQUlBLFFBQU0sV0FBVyxNQUFNO0FBQ3JCLFFBQUksTUFBTSxJQUFJO0FBQ2QsUUFBSSxDQUFDLE9BQU8sSUFBSSxTQUFTLGNBQWMsR0FBRztBQUN4QyxhQUFPO0FBQUEsSUFDVDtBQUNBLFVBQU0sSUFBSSxLQUFLLEVBQUUsUUFBUSxPQUFPLEVBQUU7QUFDbEMsUUFBSSxJQUFJLFNBQVMsTUFBTSxHQUFHO0FBQ3hCLFlBQU0sSUFBSSxNQUFNLEdBQUcsRUFBRTtBQUFBLElBQ3ZCO0FBQ0EsUUFBSSxJQUFJLFdBQVcsVUFBVSxHQUFHO0FBQzlCLFlBQU0sV0FBVyxJQUFJLFVBQVUsQ0FBQztBQUFBLElBQ2xDLFdBQVcsSUFBSSxXQUFXLFNBQVMsR0FBRztBQUNwQyxZQUFNLFVBQVUsSUFBSSxVQUFVLENBQUM7QUFBQSxJQUNqQztBQUNBLFdBQU87QUFBQSxFQUNUO0FBRUEsU0FBTztBQUFBLElBQ0wsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLElBQ2pCLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxVQUNOLFFBQVE7QUFBQSxVQUNSLGNBQWM7QUFBQSxVQUNkLFFBQVE7QUFBQSxRQUNWO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLGdDQUFnQyxLQUFLLFVBQVUsVUFBVSxDQUFDO0FBQUEsTUFDMUQsK0JBQStCLEtBQUssVUFBVSxTQUFTLENBQUM7QUFBQSxJQUMxRDtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsdUJBQXVCO0FBQUEsTUFDdkIsZUFBZTtBQUFBLFFBQ2IsUUFBUTtBQUFBLFVBQ04sY0FBYztBQUFBLFlBQ1osZ0JBQWdCLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFlBQ3pELGFBQWEsQ0FBQyxnQkFBZ0IsZUFBZTtBQUFBLFlBQzdDLGlCQUFpQixDQUFDLFVBQVU7QUFBQSxVQUM5QjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
