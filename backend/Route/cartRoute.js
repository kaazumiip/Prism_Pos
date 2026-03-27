import express from "express";
import { addToCart, getCart, clearCart, updateQuantity } from "../controllers/cartController.js";

const router = express.Router();

// Add product to cart
router.post("/add", addToCart);

// Update item quantity
router.put("/update", updateQuantity);

// Get current cart
router.get("/", getCart);

// Clear cart
router.delete("/clear", clearCart);

export default router;
