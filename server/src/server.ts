
import "dotenv/config";
import dns from "node:dns";
import app from "./app";
import { connectDB } from "./config/db";

// Configure DNS for Node.js
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const PORT = Number(process.env.PORT) || 5000;

async function startServer(): Promise<void> {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`AMITFOOD API running at http://localhost:${PORT}`);
    });

    server.on("error", (error) => {
      console.error("Failed to start AMITFOOD API:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("AMITFOOD startup failed:", error);
    process.exit(1);
  }
}

void startServer();
