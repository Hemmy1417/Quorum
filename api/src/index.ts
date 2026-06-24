import "dotenv/config";
import express from "express";
import cors from "cors";
import walletRouter from "./routes/wallet";
import authRouter from "./routes/auth";

const app  = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3500",
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    // allow non-browser requests (curl, Railway health checks) and listed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  allowedHeaders: ["Content-Type", "Authorization"],
  methods:        ["GET", "POST", "OPTIONS"],
}));
app.options("*", cors({ origin: true, allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use("/wallet", walletRouter);
app.use("/auth", authRouter);

app.listen(PORT, () => console.log(`Quorum API running on port ${PORT}`));
