import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import domainRoutes from "./routes/domainRoutes.js";
import ErrorHandler from "./utils/errorHandler.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({ success: true, data: { message: "Waitless API is running" } });
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/domain", domainRoutes);
app.use(ErrorHandler);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Wait until MongoDB connects successfully
    await connectDB();

    // Start the server only after a successful connection
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};
startServer();