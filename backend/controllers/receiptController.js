import PDFDocument from "pdfkit";
import { getCartItems } from "./cartController.js";

export const generateReceipt = (req, res) => {
    const { items, total } = getCartItems();

    if (items.length === 0) {
        return res.status(400).send("Cart is empty");
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' }); // Standard size
    const filename = `receipt-${Date.now()}.pdf`;

    res.setHeader("Content-disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-type", "application/pdf");

    doc.pipe(res);

    // --- Header ---
    doc.font('Helvetica-Bold').fontSize(24).fillColor("#ff007f"); // Pink Title
    doc.text("PRISM", { align: "center", characterSpacing: 1 });

    doc.font('Helvetica').fontSize(10).fillColor("#666666");
    doc.text("Kampuchea krom ,Phnom penh , Cambodia", { align: "center" });
    doc.text("houtchanmonyroth7777@gmail.com", { align: "center" });
    doc.moveDown(2);

    // Line separator (Pink)
    doc.moveTo(40, doc.y).lineTo(555, doc.y).lineWidth(1).strokeColor("#ff007f").stroke();
    doc.moveDown();

    // Receipt Info
    doc.fillColor("#333333").fontSize(10).font('Helvetica');
    doc.text(`DATE: ${new Date().toLocaleDateString()}`, { align: "right" });
    doc.text(`TIME: ${new Date().toLocaleTimeString()}`, { align: "right" });
    doc.text(`ORD #: ${Math.floor(Math.random() * 10000)}`, 40, doc.y - 30);
    doc.moveDown(2);

    // --- Table Header ---
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fillColor("#ff007f"); // Pink Headers
    doc.text("ITEM", 40, tableTop, { width: 250 });
    doc.text("QTY", 300, tableTop, { width: 50, align: "center" });
    doc.text("PRICE", 360, tableTop, { width: 70, align: "right" });
    doc.text("TOTAL", 440, tableTop, { width: 70, align: "right" });

    // Header Line
    doc.moveTo(40, tableTop + 15).lineTo(555, tableTop + 15).strokeColor("#eeeeee").stroke();

    // --- Items ---
    let y = tableTop + 25;
    doc.font('Helvetica').fillColor("#333333"); // Dark Grey Items

    items.forEach((item) => {
        doc.fontSize(10);

        // Truncate long names
        const name = item.name.length > 35 ? item.name.substring(0, 32) + "..." : item.name;

        doc.text(name, 40, y, { width: 250 });
        doc.text(item.qty.toString(), 300, y, { width: 50, align: "center" });
        doc.text(item.price.toFixed(2), 360, y, { width: 70, align: "right" });
        doc.text((item.price * item.qty).toFixed(2), 440, y, { width: 70, align: "right" });
        y += 20;
    });

    // Line separator
    doc.moveTo(40, y).lineTo(555, y).strokeColor("#eeeeee").stroke();
    y += 15;

    // --- Totals ---
    const subtotal = total;
    const tax = total * 0.08;
    const grandTotal = subtotal + tax;

    doc.font('Helvetica-Bold');
    doc.fillColor("#888888");
    doc.text("SUBTOTAL:", 350, y, { width: 80, align: "right" });
    doc.fillColor("#333333");
    doc.text(subtotal.toFixed(2), 440, y, { width: 70, align: "right" });
    y += 15;

    doc.fillColor("#888888");
    doc.text("TAX (8%):", 350, y, { width: 80, align: "right" });
    doc.fillColor("#333333");
    doc.text(tax.toFixed(2), 440, y, { width: 70, align: "right" });
    y += 20;

    // Grand Total Box
    doc.rect(340, y - 5, 180, 40).fill("#fff0f7"); // Light Pink BG
    doc.fillColor("#ff007f").fontSize(16); // Pink Total
    doc.text("TOTAL:", 350, y + 8, { width: 80, align: "right" });
    doc.text(`$${grandTotal.toFixed(2)}`, 440, y + 8, { width: 70, align: "right" });

    // --- Footer ---
    doc.fillColor("#888888").fontSize(10).font('Helvetica');
    const footerY = doc.page.height - 100;

    doc.text("THANK YOU FOR SHOPPING WITH US", 0, footerY, { align: "center", width: doc.page.width });
    doc.text("RETURNS ACCEPTED WITHIN 30 DAYS WITH RECEIPT", 0, footerY + 15, { align: "center", width: doc.page.width });

    // Fake Barcode
    doc.rect((doc.page.width / 2) - 100, footerY + 40, 200, 30).fill("#000000"); // Black Barcode Box
    doc.fillColor("white").font('Courier').fontSize(8); // White text on black
    doc.text(`* ${filename.toUpperCase().replace('.PDF', '')} *`, 0, footerY + 50, { align: "center", width: doc.page.width });

    doc.end();
};
