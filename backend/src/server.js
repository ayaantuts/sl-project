import express from "express";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import { initSockets } from "./sockets/index.js";
import { startScheduler } from "./utils/scheduler.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import domainRoutes from "./routes/domainRoutes.js";
import tokenRoutes from "./routes/tokenRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import queueRoutes from "./routes/queueRoutes.js";
import serviceChangeRoutes from "./routes/serviceChangeRoutes.js";
import dependentRoutes from "./routes/dependentRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import ErrorHandler from "./utils/errorHandler.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

initSockets(server);

app.get("/", (req, res) => {
  res.status(200).json({ success: true, data: { message: "Waitless API is running" } });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/domain", domainRoutes);
app.use("/api/token", tokenRoutes);
app.use("/api/service", serviceRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/service-change", serviceChangeRoutes);
app.use("/api/dependent", dependentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use(ErrorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Wait until MongoDB connects successfully
    await connectDB();
    startScheduler(10_000);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();