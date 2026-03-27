import express from "express";
import dotenv from "dotenv";
import db from "./lib/db.js";
import productRoutes from "./Route/productRoute.js";
import cartRoutes from "./Route/cartRoute.js";
import receiptRoutes from "./Route/receiptRoute.js";
import salesRoutes from "./Route/salesRoute.js";
import cors from "cors";
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

dotenv.config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

app.use(express.json());
// GET all products
app.get('/products', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
});
// ADD product
app.post('/products', (req, res) => {
  const { barcode, name, category_id, quantity, price, image_url, paid } = req.body;
  const sql = `INSERT INTO products (barcode, name, category_id, quantity, price, image_url, paid)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.query(sql, [barcode, name, category_id, quantity, price, image_url, paid], (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Product added!' });
  });
});
// UPDATE product
app.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const { barcode, name, category_id, quantity, price, image_url, paid } = req.body;

  const sql = `UPDATE products SET barcode=?, name=?, category_id=?, quantity=?, price=?, image_url=?, paid=? WHERE id=?`;

  db.query(sql, [barcode, name, category_id, quantity, price, image_url, paid, id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Product updated!' });
  });
});
// DELETE product
app.delete('/products/:id', (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM products WHERE id=?', [id], (err) => {
    if (err) return res.status(500).send(err);
    res.json({ message: 'Product deleted!' });
  });
});


app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/receipt", receiptRoutes);
app.use("/api/sales", salesRoutes);

// Image upload endpoint
app.post("/api/upload", upload.single("image"), async (req, res) => {
  console.log("Upload request received");
  console.log("File:", req.file ? { fieldname: req.file.fieldname, originalname: req.file.originalname, size: req.file.size } : "No file");

  // Verify configuration (masked)
  console.log("Cloudinary Config:", {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY ? "***" : "MISSING",
    api_secret: process.env.CLOUDINARY_API_SECRET ? "***" : "MISSING"
  });

  try {
    if (!req.file) {
      console.error("No file in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Upload to Cloudinary
    console.log("Starting Cloudinary upload stream...");
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "pos_skincare" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary Stream Error:", error);
            reject(error);
          }
          else {
            console.log("Cloudinary Upload Success:", result.secure_url);
            resolve(result);
          }
        }
      );
      uploadStream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error("Caught Upload Error:", error);
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
});

// login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username=? AND password=?";
  db.query(sql, [username, password], (err, results) => {
    if (err) return res.status(500).send(err);

    if (results.length > 0) {
      res.json({ success: true, role: results[0].role });
    } else {
      res.json({ success: false });
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
})