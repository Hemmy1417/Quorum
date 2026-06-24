import { Router } from "express";
import { verifyMessage } from "ethers";
import { auth, db } from "../lib/firebaseAdmin";

const router  = Router();
const MESSAGE = "Sign in to QUORUM";

// POST /auth/wallet — verify EIP-191 signature, return Firebase custom token
router.post("/wallet", async (req, res) => {
  const { address, signature } = req.body;
  if (!address || !signature) {
    return res.status(400).json({ error: "address and signature required" });
  }
  try {
    const recovered = verifyMessage(MESSAGE, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: "Signature mismatch" });
    }

    const uid = address.toLowerCase();
    const ref = db.collection("users").doc(uid);
    const doc = await ref.get();
    if (!doc.exists) {
      await ref.set({
        walletAddress: address,
        walletType:    "injected",
        createdAt:     new Date().toISOString(),
      });
    }

    const customToken = await auth.createCustomToken(uid, { walletAddress: address });
    res.json({ customToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Auth failed" });
  }
});

export default router;
