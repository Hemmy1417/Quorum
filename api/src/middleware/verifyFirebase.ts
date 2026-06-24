import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/firebaseAdmin";

export async function verifyFirebase(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const decoded  = await auth.verifyIdToken(token);
    (req as any).uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
