import express from "express";
import { scanProduct } from "../controllers/productController.js";

const router = express.Router();

router.post("/scan", scanProduct);

export default router;
