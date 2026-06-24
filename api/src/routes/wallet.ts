import { Router } from "express";
import { Wallet } from "ethers";
import { verifyFirebase } from "../middleware/verifyFirebase";
import { db } from "../lib/firebaseAdmin";
import { encryptKey, decryptKey } from "../lib/crypto";

const router = Router();

// POST /wallet/create — idempotent, generates and stores wallet for email user
router.post("/create", verifyFirebase, async (req, res) => {
  const uid = (req as any).uid;
  try {
    const ref = db.collection("users").doc(uid);
    const doc = await ref.get();

    if (doc.exists && doc.data()?.walletAddress) {
      return res.json({ address: doc.data()!.walletAddress });
    }

    const wallet       = Wallet.createRandom();
    const encryptedKey = encryptKey(wallet.privateKey, uid);

    await ref.set({
      walletAddress: wallet.address,
      encryptedKey,
      walletType:    "generated",
      createdAt:     new Date().toISOString(),
    }, { merge: true });

    res.json({ address: wallet.address });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Wallet creation failed" });
  }
});

// POST /wallet/export — decrypt and return private key
router.post("/export", verifyFirebase, async (req, res) => {
  const uid = (req as any).uid;
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists || !doc.data()?.encryptedKey) {
      return res.status(404).json({ error: "No wallet found" });
    }
    const privateKey = decryptKey(doc.data()!.encryptedKey, uid);
    res.json({ privateKey });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Export failed" });
  }
});

export default router;
