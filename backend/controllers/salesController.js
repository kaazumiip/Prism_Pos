import db from "../lib/db.js";
import { getCartItems } from "./cartController.js";

// Ensure sales table exists
const initSalesTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS sales (
            id INT AUTO_INCREMENT PRIMARY KEY,
            items JSON NOT NULL,
            total DECIMAL(10, 2) NOT NULL,
            payment_method VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    db.query(sql, (err) => {
        if (err) console.error("Failed to create sales table:", err.message);
        else console.log("Sales table ready");
    });
};

initSalesTable();

export const recordSale = async (req, res) => {
    const { items, total } = getCartItems();
    const { paymentMethod } = req.body;

    if (items.length === 0) {
        return res.status(400).json({ message: "No items in cart to record" });
    }

    const sql = "INSERT INTO sales (items, total, payment_method) VALUES (?, ?, ?)";
    const values = [JSON.stringify(items), total, paymentMethod];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error recording sale:", err);
            return res.status(500).json({ message: "Failed to record sale" });
        }

        // --- Stock Reduction Logic ---
        items.forEach((item) => {
            const updateStockSql = "UPDATE products SET quantity = quantity - ? WHERE id = ?";
            db.query(updateStockSql, [item.qty, item.id], (updErr) => {
                if (updErr) {
                    console.error(`❌ Failed to reduce stock for product ${item.id}:`, updErr.message);
                } else {
                    console.log(`✅ Stock reduced for product ${item.id} by ${item.qty} units.`);
                }
            });
        });

        res.json({ success: true, saleId: result.insertId });
    });
};

export const getAllSales = (req, res) => {
    const sql = "SELECT * FROM sales ORDER BY created_at DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching sales:", err);
            return res.status(500).json({ message: "Failed to fetch sales history" });
        }
        res.json(results);
    });
};

export const getRevenueStats = (req, res) => {
    const today = req.query.today || new Date().toISOString().split('T')[0];
    const sql = `
        SELECT 
            SUM(total) as total_revenue,
            COUNT(*) as total_orders,
            SUM(CASE WHEN DATE(created_at) = ? THEN total ELSE 0 END) as today_revenue,
            COUNT(CASE WHEN DATE(created_at) = ? THEN 1 ELSE NULL END) as today_orders,
            SUM(CASE WHEN YEARWEEK(created_at, 1) = YEARWEEK(?, 1) THEN total ELSE 0 END) as weekly_revenue,
            COUNT(CASE WHEN YEARWEEK(created_at, 1) = YEARWEEK(?, 1) THEN 1 ELSE NULL END) as weekly_orders,
            SUM(CASE WHEN MONTH(created_at) = MONTH(?) AND YEAR(created_at) = YEAR(?) THEN total ELSE 0 END) as monthly_revenue,
            COUNT(CASE WHEN MONTH(created_at) = MONTH(?) AND YEAR(created_at) = YEAR(?) THEN 1 ELSE NULL END) as monthly_orders,
            SUM(CASE WHEN YEAR(created_at) = YEAR(?) THEN total ELSE 0 END) as yearly_revenue,
            COUNT(CASE WHEN YEAR(created_at) = YEAR(?) THEN 1 ELSE NULL END) as yearly_orders
        FROM sales
    `;
    const params = [today, today, today, today, today, today, today, today, today, today];
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error fetching stats:", err);
            return res.status(500).json({ message: "Failed to fetch revenue stats" });
        }
        res.json(results[0]);
    });
};
