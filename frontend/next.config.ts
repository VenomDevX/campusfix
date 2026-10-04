import type { NextConfig } from "next";

// The browser only talks to this Next server; it forwards API and image requests to FastAPI.
// No CORS, and the app works from any host (localhost, 127.0.0.1, LAN IP on a phone).
const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // Dev server only answers localhost by default. Also allow 127.0.0.1 and private LAN IPs,
  // so a phone or a teammate's laptop on the venue Wi-Fi can open the demo.
  allowedDevOrigins: ["127.0.0.1", "192.168.*.*", "10.**", "172.**", "100.**"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_ORIGIN}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
