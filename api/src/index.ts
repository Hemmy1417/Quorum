import "dotenv/config";
import express from "express";
import cors from "cors";
import walletRouter from "./routes/wallet";
import authRouter from "./routes/auth";

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use("/wallet", walletRouter);
app.use("/auth", authRouter);

app.listen(PORT, () => console.log(`Quorum API running on port ${PORT}`));
