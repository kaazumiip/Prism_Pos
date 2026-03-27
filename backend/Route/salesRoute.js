import express from "express";
import { getAllSales, recordSale, getRevenueStats } from "../controllers/salesController.js";

const router = express.Router();

router.get("/", getAllSales);
router.post("/record", recordSale);
router.get("/stats", getRevenueStats);

export default router;
