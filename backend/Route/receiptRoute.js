import express from "express";
import { generateReceipt } from "../controllers/receiptController.js";

const router = express.Router();

router.get("/", generateReceipt);

export default router;
