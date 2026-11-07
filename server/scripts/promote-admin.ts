import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import { User } from "../src/modules/users/user.model";

// Fix DNS resolution for MongoDB Atlas SRV records
dns.setServers(["8.8.8.8", "8.8.4.4"]);

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const allowed = process.env.ALLOW_ADMIN_BOOTSTRAP;

  if (allowed !== "true") {
    throw new Error(
      "Bootstrap blocked. Set ALLOW_ADMIN_BOOTSTRAP=true to continue.",
    );
  }

  if (!email) {
    throw new Error("ADMIN_EMAIL is required.");
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from environment.");
  }

  try {
    await mongoose.connect(mongoUri);

    console.log("MongoDB connected. Checking admin account...");

    const user = await User.findOne({ email }).select(
      "_id email role isActive",
    );

    if (!user) {
      throw new Error(
        "User not found. Register with this email before promotion.",
      );
    }

    if (!user.isActive) {
      throw new Error("Inactive accounts cannot be promoted.");
    }

    if (user.role === "admin") {
      console.log("This account is already an admin.");
      return;
    }

    if (user.role !== "customer") {
      throw new Error(
        "Only an existing customer account can be promoted by this script.",
      );
    }

    user.role = "admin";
    await user.save();

    console.log(`Admin role granted to ${user.email}`);
    console.log("Please log out and log in again.");
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

main().catch((error: unknown) => {
  console.error(
    "Admin bootstrap failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
