import "dotenv/config";
import express from "express";
import cors from "cors";
import walletRouter from "./routes/wallet";
import authRouter from "./routes/auth";

const app  = express();
const PORT = process.env.PORT || 3001;

const EXPLICIT_ORIGINS = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3500",
].filter(Boolean) as string[];

// Allow any Vercel deploy of this project (production + previews) without
// having to keep FRONTEND_URL in sync every time the URL changes.
function isAllowed(origin: string): boolean {
  if (EXPLICIT_ORIGINS.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (host.endsWith(".vercel.app")) return true;
    if (host === "localhost" || host === "127.0.0.1") return true;
  } catch { /* invalid origin URL */ }
  return false;
}

app.use(cors({
  origin: (origin, cb) => {
    // allow non-browser requests (curl, Railway health checks) and listed origins
    if (!origin || isAllowed(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  allowedHeaders: ["Content-Type", "Authorization"],
  methods:        ["GET", "POST", "OPTIONS"],
}));
app.options("*", cors({ origin: true, allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.get("/debug", async (_, res) => {
  const checks: Record<string, string> = {
    FIREBASE_PROJECT_ID:    process.env.FIREBASE_PROJECT_ID ? "set" : "MISSING",
    FIREBASE_CLIENT_EMAIL:  process.env.FIREBASE_CLIENT_EMAIL ? "set" : "MISSING",
    FIREBASE_PRIVATE_KEY:   process.env.FIREBASE_PRIVATE_KEY ? "set" : "MISSING",
    ENCRYPTION_SECRET:      process.env.ENCRYPTION_SECRET ? "set" : "MISSING",
  };
  try {
    const { db } = await import("./lib/firebaseAdmin");
    await db.collection("_health").doc("ping").set({ ts: Date.now() });
    checks.firestore = "ok";
  } catch (e: unknown) {
    checks.firestore = e instanceof Error ? e.message : String(e);
  }
  res.json(checks);
});
app.use("/wallet", walletRouter);
app.use("/auth", authRouter);

app.listen(PORT, () => console.log(`Quorum API running on port ${PORT}`));
