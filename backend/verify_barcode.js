import db from "./lib/db.js";

const barcode = '9785256583626';

console.log(`Checking for barcode: ${barcode}`);

db.query('SELECT * FROM products WHERE barcode = ?', [barcode], (err, results) => {
    if (err) {
        console.error('Error querying database:', err);
        process.exit(1);
    }

    if (results.length > 0) {
        console.log('Product found:', results[0]);
    } else {
        console.log('Product NOT found for barcode:', barcode);
        // Let's also check all products to see if there's a near match or different format
        db.query('SELECT barcode, name FROM products', (err, allProducts) => {
            if (!err) {
                console.log("All products in DB:", allProducts);
            }
            process.exit(0);
        });
    }
});
