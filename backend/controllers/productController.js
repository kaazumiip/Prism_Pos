import db from "../lib/db.js";
import { addItemToCart } from "./cartController.js";

export const scanProduct = (req, res) => {
  let { barcode } = req.body;

  if (!barcode) {
    return res.status(400).json({ message: "Barcode is required" });
  }

  barcode = barcode.trim();
  console.log(`[SCAN] Received: '${barcode}' (Len: ${barcode.length})`);

  // Potential variations to check
  const variations = [barcode];

  // If 13 digits and starts with 0, or user provided 12 digits, check variations
  if (barcode.length === 13 && barcode.startsWith('0')) {
    variations.push(barcode.substring(1)); // 12-digit version
  } else if (barcode.length === 12) {
    variations.push('0' + barcode); // 13-digit version starting with 0
  }

  // Use a recursive or loop-based query to check variations
  const tryScan = (index) => {
    if (index >= variations.length) {
      console.log(`[SCAN] Product NOT found in DB for variations: ${variations.join(', ')}`);
      return res.status(404).json({ message: `Product not found (Scanned: '${barcode}')` });
    }

    const currentBarcode = variations[index];
    const sql = "SELECT * FROM products WHERE barcode = ?";

    db.query(sql, [currentBarcode], (err, result) => {
      if (err) {
        console.error("[SCAN] Database error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (result.length > 0) {
        const product = result[0];
        console.log(`[SCAN] Found via '${currentBarcode}': ${product.name}`);

        if (req.body.addToCart) {
          try {
            addItemToCart(product);
          } catch (err) {
            console.error("[SCAN] Auto-add failed:", err);
          }
        }
        return res.json(product);
      } else {
        tryScan(index + 1);
      }
    });
  };

  tryScan(0);
};
