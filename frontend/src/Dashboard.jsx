import { useEffect, useState } from "react";
import axios from "axios";
import { Maximize, Minimize, Download, ArrowLeft } from "lucide-react";
import JsBarcode from "jsbarcode";

export default function Dashboard({ onBackToCart, onViewHistory }) {
    const API = "http://localhost:3000/products";

    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({
        barcode: "",
        name: "",
        category_id: "",
        quantity: "",
        price: "",
        image_url: "",
        paid: 0,
    });
    const [errors, setErrors] = useState({
        barcode: "",
        paid: "",
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [genBarcode, setGenBarcode] = useState("");
    const [showEditModal, setShowEditModal] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");


    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullScreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullScreen(false);
            }
        }
    };

    const generateEAN13 = () => {
        // Generate first 12 digits randomly
        let barcode = "";
        for (let i = 0; i < 12; i++) {
            barcode += Math.floor(Math.random() * 10);
        }

        // Calculate checksum digit (13th digit)
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(barcode[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const checksum = (10 - (sum % 10)) % 10;
        return barcode + checksum;
    };

    const fetchProducts = async () => {
        try {
            const res = await axios.get(API);
            setProducts(res.data);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    useEffect(() => {
        fetchProducts();

        // Initial barcode for new product
        const initialBarcode = generateEAN13();
        setForm(prev => ({ ...prev, barcode: initialBarcode }));
        setGenBarcode(initialBarcode);
    }, []);

    useEffect(() => {
        if (genBarcode) {
            try {
                JsBarcode("#barcode-canvas", genBarcode, {
                    format: "ean13",
                    lineColor: "#000", // Black barcode
                    width: 2,
                    height: 100,
                    displayValue: true,
                    background: "#fff", // White background
                    margin: 10
                });
            } catch (error) {
                // Ignore errors while typing (invalid EANs)
            }
        }
    }, [genBarcode]);

    const downloadBarcode = () => {
        const canvas = document.getElementById("barcode-canvas");
        if (canvas) {
            const pngUrl = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = `barcode-${genBarcode}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;

        // BARCODE: numbers only, must be 13 digits
        if (name === "barcode") {
            const numericValue = value.replace(/\D/g, "");
            let errorMsg = "";

            if (numericValue.length > 13) return;

            if (numericValue.length > 0 && numericValue.length !== 13) {
                errorMsg = "Barcode must be exactly 13 digits";
            }

            setForm({ ...form, barcode: numericValue });
            setErrors({ ...errors, barcode: errorMsg });
            setGenBarcode(numericValue); // Auto-generate barcode preview
            return;
        }

        // PAID: only 0 or 1
        if (name === "paid") {
            let errorMsg = "";

            if (value !== "0" && value !== "1" && value !== "") return;

            if (value === "") {
                errorMsg = "Paid must be 0 (Not Paid) or 1 (Paid)";
            }

            setForm({ ...form, paid: value });
            setErrors({ ...errors, paid: errorMsg });
            return;
        }

        setForm({ ...form, [name]: value });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        setIsUploading(true);
        try {
            const res = await axios.post("http://localhost:3000/api/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setForm((prev) => ({ ...prev, image_url: res.data.url }));
        } catch (error) {
            console.error("Upload error:", error);
            const errorMsg = error.response?.data?.details || error.message || "Unknown error";
            alert(`Failed to upload image: ${errorMsg}`);
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        const newBarcode = generateEAN13();
        setForm({
            barcode: newBarcode,
            name: "",
            category_id: "",
            quantity: "",
            price: "",
            image_url: "",
            paid: 0,
        });
        setErrors({ barcode: "", paid: "" });
        setGenBarcode(newBarcode);
        setIsEditing(false);
        setEditingId(null);
        setShowEditModal(false);
    };

    const addProduct = async () => {
        // Barcode validation
        if (form.barcode.length !== 13) {
            alert("Barcode must be exactly 13 digits.");
            return;
        }

        // Paid validation
        if (form.paid !== "0" && form.paid !== "1") {
            alert("Paid status must be 0 (Not Paid) or 1 (Paid).");
            return;
        }

        try {
            await axios.post(API, {
                ...form,
                barcode: form.barcode.trim(),
                name: form.name.trim(),
                image_url: form.image_url ? form.image_url.trim() : "",
                paid: parseInt(form.paid),
                quantity: parseInt(form.quantity),
                price: parseFloat(form.price),
            });

            fetchProducts();
            resetForm();
        } catch (error) {
            console.error("Error adding product:", error);
        }
    };

    const updateProduct = async () => {
        // Barcode must be exactly 13 digits
        if (!/^\d{13}$/.test(form.barcode)) {
            alert("Barcode must be exactly 13 digits.");
            return;
        }

        // Prepare paid value safely
        let paidValue = null;

        if (form.paid !== "" && form.paid !== null && form.paid !== undefined) {
            paidValue = Number(form.paid);

            if (paidValue !== 0 && paidValue !== 1) {
                alert("Paid status must be 0 (Not Paid) or 1 (Paid).");
                return;
            }
        }

        try {
            await axios.put(`${API}/${editingId}`, {
                barcode: form.barcode.trim(),
                name: form.name.trim(),
                category_id: parseInt(form.category_id),
                quantity: parseInt(form.quantity),
                price: parseFloat(form.price),
                image_url: form.image_url ? form.image_url.trim() : "",
                paid: paidValue // can be null, 0, or 1
            });

            fetchProducts();
            resetForm();
        } catch (error) {
            console.error("Error updating product:", error);
        }
    };

    const editProduct = (product) => {
        setForm({
            barcode: product.barcode,
            name: product.name,
            category_id: product.category_id,
            quantity: product.quantity,
            price: product.price,
            image_url: product.image_url || "",
            paid: product.paid,
        });
        setIsEditing(true);
        setEditingId(product.id);
        setShowEditModal(true);
    };

    const deleteProduct = async (id) => {
        if (window.confirm("Are you sure you want to delete this product?")) {
            try {
                await axios.delete(`${API}/${id}`);
                fetchProducts();

                // If we're editing this product, reset the form
                if (editingId === id) {
                    resetForm();
                }
            } catch (error) {
                console.error("Error deleting product:", error);
            }
        }
    };

    const fieldLabels = {
        barcode: "Barcode",
        name: "Product Name",
        category_id: "Category ID",
        quantity: "Quantity",
        price: "Price ($)",
        image_url: "Product Image",
        paid: "Paid Status",
    };

    return (
        <div style={styles.container} className="animate-page-enter">
            {/* Minimal Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    <img src="/prism_logo.png" alt="PRISM" style={{ height: '36px', width: 'auto' }} />
                    <div style={{ marginLeft: '16px' }}>
                        <h1 style={styles.title}>PRISM</h1>
                        <p style={styles.subtitle}>Inventory Management</p>
                    </div>
                </div>

                <div className="headerRight">
                    <div style={styles.actionRow}>
                        <button onClick={onViewHistory} style={{ ...styles.textBtn, borderColor: '#ff007f', color: '#ff007f' }}>
                            HISTORY
                        </button>
                        <button onClick={onBackToCart} style={styles.textBtn}>
                            <ArrowLeft size={16} /> Back to POS
                        </button>
                        <button onClick={toggleFullScreen} style={styles.iconBtn} title="Toggle Fullscreen">
                            {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Product Modal */}
            {showEditModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent} className="animate-modal-enter">
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>EDIT PRODUCT</h2>
                            <button onClick={resetForm} style={styles.cancelButton}>CLOSE</button>
                        </div>
                        <div style={styles.formGrid}>
                            {Object.keys(form).map((key) => {
                                if (key === "image_url") {
                                    return (
                                        <div key={key} style={styles.formGroup}>
                                            <label style={styles.label}>{fieldLabels[key]}</label>
                                            <div style={styles.uploadContainer}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    style={{ display: "none" }}
                                                    id="edit-image-upload"
                                                />
                                                <label htmlFor="edit-image-upload" style={styles.uploadButton}>
                                                    {isUploading ? "UPLOADING..." : "UPLOAD IMAGE"}
                                                </label>
                                                {form.image_url && (
                                                    <div style={styles.previewContainer}>
                                                        <img src={form.image_url} alt="Preview" style={styles.imagePreview} />
                                                        <button
                                                            onClick={() => setForm(prev => ({ ...prev, image_url: "" }))}
                                                            style={styles.removeImageBtn}
                                                        >
                                                            REMOVE
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={key} style={styles.formGroup}>
                                        <label style={styles.label}>{fieldLabels[key]}</label>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                name={key}
                                                value={form[key]}
                                                placeholder={`Enter ${fieldLabels[key].toLowerCase()}`}
                                                onChange={handleChange}
                                                type={key === "price" || key === "quantity" || key === "paid" ? "number" : "text"}
                                                style={{
                                                    ...styles.input,
                                                    width: '100%',
                                                    borderColor: key === "barcode" && errors.barcode ? "#ef4444" : "#333",
                                                    paddingRight: "16px"
                                                }}
                                            />
                                        </div>
                                        {key === "barcode" && errors.barcode && (
                                            <span style={styles.errorText}>{errors.barcode}</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div style={styles.buttonGroup}>
                            <button onClick={updateProduct} style={styles.updateButton}>
                                UPDATE PRODUCT
                            </button>
                            <button onClick={resetForm} style={styles.cancelButtonSecondary}>
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.mainContent}>
                {/* Stats Row */}
                <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                        <div style={styles.statLabel}>Total Products</div>
                        <div style={styles.statNumber}>{products.length}</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statLabel}>Total Stock</div>
                        <div style={styles.statNumber}>
                            {products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0)}
                        </div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statLabel}>Inventory Value</div>
                        <div style={styles.statNumber}>
                            <span style={{ color: '#ff007f' }}>${products.reduce((sum, p) => sum + (parseFloat(p.price) * parseInt(p.quantity) || 0), 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div style={styles.content}>
                    {/* Add Product Form (Static) */}
                    {!isEditing && (
                        <div style={styles.formSection}>
                            <div style={styles.sectionHeader}>
                                <h2 style={styles.sectionTitle}>ADD NEW PRODUCT</h2>
                            </div>
                            <div style={styles.formGrid}>
                                {Object.keys(form).map((key) => {
                                    if (key === "image_url") {
                                        return (
                                            <div key={key} style={styles.formGroup}>
                                                <label style={styles.label}>{fieldLabels[key]}</label>
                                                <div style={styles.uploadContainer}>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        style={{ display: "none" }}
                                                        id="add-image-upload"
                                                    />
                                                    <label htmlFor="add-image-upload" style={styles.uploadButton}>
                                                        {isUploading ? "UPLOADING..." : "UPLOAD IMAGE"}
                                                    </label>
                                                    {form.image_url && (
                                                        <div style={styles.previewContainer}>
                                                            <img src={form.image_url} alt="Preview" style={styles.imagePreview} />
                                                            <button
                                                                onClick={() => setForm(prev => ({ ...prev, image_url: "" }))}
                                                                style={styles.removeImageBtn}
                                                            >
                                                                REMOVE
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={key} style={styles.formGroup}>
                                            <label style={styles.label}>{fieldLabels[key]}</label>
                                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    name={key}
                                                    value={form[key]}
                                                    placeholder={`Enter ${fieldLabels[key].toLowerCase()}`}
                                                    onChange={handleChange}
                                                    type={key === "price" || key === "quantity" || key === "paid" ? "number" : "text"}
                                                    style={{
                                                        ...styles.input,
                                                        width: '100%',
                                                        borderColor: key === "barcode" && errors.barcode ? "#ef4444" : "#333",
                                                        paddingRight: key === "barcode" ? "80px" : "16px"
                                                    }}
                                                />
                                                {key === "barcode" && (
                                                    <button
                                                        onClick={() => {
                                                            const nb = generateEAN13();
                                                            setForm({ ...form, barcode: nb });
                                                            setGenBarcode(nb);
                                                        }}
                                                        style={styles.refreshBtnInside}
                                                    >
                                                        REFRESH
                                                    </button>
                                                )}
                                            </div>
                                            {key === "barcode" && errors.barcode && (
                                                <span style={styles.errorText}>{errors.barcode}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={styles.buttonGroup}>
                                <button onClick={addProduct} style={styles.addButton}>
                                    + ADD PRODUCT
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Barcode Generator Section */}
                    <div style={styles.formSection}>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>BARCODE GENERATOR</h2>
                        </div>
                        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-start" }}>
                            <div style={{ flex: 1, minWidth: "300px" }}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Enter Barcode</label>
                                    <input
                                        type="text"
                                        value={genBarcode}
                                        onChange={(e) => setGenBarcode(e.target.value)}
                                        placeholder="e.g. 1234567890128"
                                        maxLength="13"
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#ffffff", // White background for barcode
                                padding: "2rem",
                                borderRadius: "0px",
                                border: "1px solid #ddd", // Light border
                                minHeight: "200px"
                            }}>
                                {genBarcode ? (
                                    <>
                                        <canvas id="barcode-canvas" style={{ maxWidth: '100%' }}></canvas>
                                        <button
                                            onClick={downloadBarcode}
                                            style={{
                                                ...styles.addButton,
                                                marginTop: "1.5rem",
                                                backgroundColor: "#000",
                                                color: "#fff",
                                                boxShadow: "none"
                                            }}
                                        >
                                            <Download size={18} /> DOWNLOAD PNG
                                        </button>
                                    </>
                                ) : (
                                    <div style={{ color: "#ccc", display: "flex", flexDirection: "column", alignItems: "center" }}>
                                        <span style={{ fontSize: "3rem", marginBottom: "1rem" }}>║▌║</span>
                                        <p style={{ fontWeight: 700, letterSpacing: '1px' }}>PREVIEW AREA</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Product List */}
                    <div style={styles.tableSection}>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>INVENTORY</h2>
                            <div style={styles.searchWrapper}>
                                <input
                                    type="text"
                                    placeholder="Search barcode or name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={styles.searchInput}
                                />
                            </div>
                        </div>

                        {products.filter(p =>
                            p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.name?.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length === 0 ? (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>📦</div>
                                <p style={styles.emptyText}>No products yet.</p>
                            </div>
                        ) : (
                            <div style={styles.tableWrapper}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr style={styles.tableHeader}>
                                            <th style={styles.th}>Image</th>
                                            <th style={styles.th}>Barcode</th>
                                            <th style={styles.th}>Product Name</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Category</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Quantity</th>
                                            <th style={{ ...styles.th, textAlign: 'right' }}>Price</th>
                                            <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
                                            <th style={styles.th}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products
                                            .filter(p =>
                                                p.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                p.name?.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map((p, index) => (
                                                <tr
                                                    key={p.id}
                                                    style={{
                                                        ...styles.tableRow,
                                                        backgroundColor: editingId === p.id
                                                            ? "#1a1a1a"
                                                            : "transparent",
                                                        borderLeft: editingId === p.id ? "2px solid #ff007f" : "none"
                                                    }}
                                                >
                                                    <td style={styles.td}>
                                                        <div style={styles.thumbnailContainer}>
                                                            {p.image_url ? (
                                                                <img src={p.image_url} alt={p.name} style={styles.thumbnailImg} />
                                                            ) : (
                                                                <div style={styles.thumbnailPlaceholder}>No Img</div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={styles.barcode}>{p.barcode || "N/A"}</span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <div style={styles.productName}>{p.name}</div>
                                                    </td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <span style={styles.category}>CAT #{p.category_id}</span>
                                                    </td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <span
                                                            style={{
                                                                ...styles.badge,
                                                                color: p.quantity > 20 ? "#4ade80" : p.quantity > 5 ? "#facc15" : "#ef4444",
                                                                border: `1px solid ${p.quantity > 20 ? "#4ade80" : p.quantity > 5 ? "#facc15" : "#ef4444"}`,
                                                            }}
                                                        >
                                                            {p.quantity} UNITS
                                                        </span>
                                                    </td>
                                                    <td style={{ ...styles.td, textAlign: 'right' }}>
                                                        <span style={styles.price}>${parseFloat(p.price).toFixed(2)}</span>
                                                    </td>
                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        <span
                                                            style={{
                                                                ...styles.statusBadge,
                                                                color: p.paid === 1 ? "#4ade80" : "#fbbf24",
                                                            }}
                                                        >
                                                            {p.paid === 1 ? "PAID" : "PENDING"}
                                                        </span>
                                                    </td>
                                                    <td style={styles.td}>
                                                        <div style={styles.actionButtons}>
                                                            <button
                                                                onClick={() => editProduct(p)}
                                                                style={styles.editButton}
                                                            >
                                                                EDIT
                                                            </button>
                                                            <button
                                                                onClick={() => deleteProduct(p.id)}
                                                                style={styles.deleteButton}
                                                            >
                                                                DELETE
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


const styles = {
    container: {
        minHeight: "100vh",
        backgroundColor: "#050505",
        fontFamily: "'Inter', -apple-system, sans-serif",
        color: "#ffffff",
        paddingBottom: "40px",
        // animation: "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards", // Replaced by global class
    },
    header: {
        backgroundColor: "#121212",
        borderBottom: "1px solid #333",
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 10,
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
    },
    logoMark: {
        width: "36px",
        height: "36px",
        background: "#ff007f", // Pink Logo
        borderRadius: "2px",
        boxShadow: "0 0 10px rgba(255, 0, 127, 0.5)",
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    modalContent: {
        backgroundColor: '#121212',
        border: '1px solid #333',
        width: '100%',
        maxWidth: '800px',
        padding: '40px',
        position: 'relative',
        boxShadow: '0 0 50px rgba(0,0,0,0.5)',
    },
    refreshBtnInside: {
        position: 'absolute',
        right: '5px',
        height: 'calc(100% - 14px)',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        color: '#ff007f',
        fontSize: '9px',
        fontWeight: '900',
        padding: '0 8px',
        cursor: 'pointer',
        top: '7px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    searchWrapper: {
        flex: 1,
        maxWidth: "400px",
        marginLeft: "24px",
    },
    searchInput: {
        width: "100%",
        padding: "8px 16px",
        backgroundColor: "#000",
        border: "1px solid #333",
        color: "#fff",
        fontSize: "12px",
        outline: "none",
        transition: "all 0.2s",
    },
    title: {
        fontSize: "20px",
        fontWeight: "900",
        margin: 0,
        color: "white",
        lineHeight: "1",
        letterSpacing: "1px",
    },
    subtitle: {
        fontSize: "10px",
        color: "#666",
        margin: 0,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.2em",
    },
    headerRight: {
        display: "flex",
        alignItems: "center",
        gap: "24px",
    },
    actionRow: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    textBtn: {
        background: "transparent",
        border: "1px solid #333",
        fontSize: "12px",
        color: "#aaa",
        fontWeight: "700",
        cursor: "pointer",
        padding: "8px 16px",
        borderRadius: "2px",
        transition: "all 0.2s",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        textTransform: "uppercase",
        letterSpacing: "1px",
    },
    iconBtn: {
        background: "transparent",
        border: "1px solid #333",
        borderRadius: "2px",
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "#aaa",
        transition: "all 0.2s",
    },
    mainContent: {
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "32px",
    },
    statsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "24px",
    },
    statCard: {
        backgroundColor: "#121212",
        borderRadius: "0px",
        padding: "24px",
        border: "1px solid #333",
        borderLeft: "4px solid #ff007f", // Pink accent
    },
    statLabel: {
        fontSize: "10px",
        fontWeight: "700",
        color: "#666",
        textTransform: "uppercase",
        letterSpacing: "0.2em",
        marginBottom: "10px",
    },
    statNumber: {
        fontSize: "28px",
        fontWeight: "900",
        color: "#fff",
        letterSpacing: "-1px",
    },
    content: {
        display: "flex",
        flexDirection: "column",
        gap: "32px",
    },
    formSection: {
        backgroundColor: "#121212",
        borderRadius: "0px",
        padding: "32px",
        border: "1px solid #333",
        transition: "all 0.3s ease",
    },
    sectionHeader: {
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "1px solid #222",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    sectionTitle: {
        fontSize: "18px",
        fontWeight: "900",
        color: "#fff",
        margin: 0,
        letterSpacing: "1px",
        textTransform: "uppercase",
    },
    editingBadge: {
        backgroundColor: "transparent",
        color: "#ff007f",
        padding: "4px 12px",
        borderRadius: "0px",
        fontSize: "10px",
        fontWeight: "700",
        border: "1px solid #ff007f",
        textTransform: "uppercase",
        marginLeft: "12px",
        letterSpacing: "1px",
    },
    formGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: "24px",
    },
    formGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    label: {
        fontSize: "10px",
        fontWeight: "700",
        color: "#666",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
    },
    uploadContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    uploadButton: {
        backgroundColor: '#222',
        color: '#ff007f',
        border: '1px dashed #ff007f',
        padding: '12px',
        textAlign: 'center',
        cursor: 'pointer',
        fontSize: '11px',
        fontWeight: '900',
        letterSpacing: '1px',
        transition: 'all 0.2s',
    },
    previewContainer: {
        position: 'relative',
        width: '100%',
        height: '150px',
        backgroundColor: '#000',
        border: '1px solid #333',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePreview: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
    },
    removeImageBtn: {
        position: 'absolute',
        top: '5px',
        right: '5px',
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        color: 'white',
        border: 'none',
        padding: '4px 8px',
        fontSize: '9px',
        fontWeight: '900',
        cursor: 'pointer',
    },
    input: {
        padding: "12px 16px",
        borderRadius: "0px",
        border: "1px solid #333",
        fontSize: "14px",
        fontWeight: "500",
        transition: "all 0.2s",
        outline: "none",
        color: "#fff",
        backgroundColor: "#090909",
        fontFamily: "monospace",
    },
    errorText: {
        fontSize: "12px",
        color: "#ef4444",
        fontWeight: "600",
        marginTop: "4px",
    },
    buttonGroup: {
        marginTop: "32px",
        display: "flex",
        gap: "16px",
    },
    addButton: {
        backgroundColor: "#ff007f",
        color: "white",
        border: "none",
        padding: "14px 28px",
        borderRadius: "0px",
        fontSize: "12px",
        fontWeight: "900",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s",
        boxShadow: "0 0 15px rgba(255, 0, 127, 0.3)",
        letterSpacing: "1px",
    },
    updateButton: {
        backgroundColor: "#3b82f6",
        color: "white",
        border: "none",
        padding: "14px 28px",
        borderRadius: "0px",
        fontSize: "12px",
        fontWeight: "900",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        letterSpacing: "1px",
    },
    cancelButton: {
        backgroundColor: "transparent",
        color: "#666",
        border: "1px solid #333",
        padding: "8px 20px",
        borderRadius: "0px",
        fontSize: "12px",
        fontWeight: "700",
        cursor: "pointer",
        letterSpacing: "1px",
    },
    cancelButtonSecondary: {
        backgroundColor: "transparent",
        color: "#fff",
        border: "1px solid #333",
        padding: "14px 28px",
        borderRadius: "0px",
        fontSize: "12px",
        fontWeight: "700",
        cursor: "pointer",
        letterSpacing: "1px",
    },
    tableSection: {
        backgroundColor: "#121212",
        borderRadius: "0px",
        border: "1px solid #333",
        overflow: "hidden",
    },
    tableWrapper: {
        width: "100%",
        overflowX: "auto",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "14px",
    },
    tableHeader: {
        backgroundColor: "#090909",
        borderBottom: "1px solid #333",
        position: "sticky",
        top: 0,
        zIndex: 5,
    },
    th: {
        padding: "18px 24px",
        textAlign: "left",
        fontWeight: "700",
        color: "#666",
        fontSize: "10px",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
    },
    tableRow: {
        borderBottom: "1px solid #222",
        transition: "background 0.1s",
    },
    td: {
        padding: "12px 24px",
        color: "#ddd",
        verticalAlign: "middle",
        borderBottom: "1px solid #222",
        fontWeight: "500",
    },
    thumbnailContainer: {
        width: "48px",
        height: "48px",
        backgroundColor: "#000",
        border: "1px solid #333",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    thumbnailImg: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
    thumbnailPlaceholder: {
        fontSize: "8px",
        color: "#444",
        fontWeight: "900",
        textTransform: "uppercase",
    },
    barcode: {
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: "12px",
        color: "#888",
        backgroundColor: "#000",
        padding: "6px 10px",
        borderRadius: "0px",
        border: "1px solid #333",
    },
    productName: {
        fontWeight: "700",
        color: "#fff",
        fontSize: "14px",
        textTransform: "uppercase",
    },
    category: {
        fontSize: "10px",
        color: "#666",
        fontWeight: "700",
        backgroundColor: "#000",
        padding: "4px 8px",
        borderRadius: "0px",
        border: "1px solid #333",
        textTransform: "uppercase",
    },
    badge: {
        fontSize: "10px",
        fontWeight: "700",
        padding: "4px 8px",
        borderRadius: "0px",
        display: "inline-block",
        letterSpacing: "0.5px",
    },
    statusBadge: {
        fontSize: "10px",
        fontWeight: "700",
        padding: "4px 8px",
        borderRadius: "0px",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        letterSpacing: "0.5px",
    },
    price: {
        fontWeight: "700",
        color: "#ff007f",
        fontVariantNumeric: "tabular-nums",
        fontSize: "15px",
    },
    actionButtons: {
        display: "flex",
        gap: "8px",
    },
    editButton: {
        backgroundColor: "transparent",
        color: "#3b82f6",
        border: "1px solid #3b82f6",
        padding: "6px 12px",
        fontSize: "10px",
        fontWeight: "700",
        borderRadius: "0px",
        cursor: "pointer",
        transition: "all 0.1s",
        letterSpacing: "1px",
    },
    deleteButton: {
        backgroundColor: "transparent",
        color: "#ef4444",
        border: "1px solid #ef4444",
        padding: "6px 12px",
        fontSize: "10px",
        fontWeight: "700",
        borderRadius: "0px",
        cursor: "pointer",
        transition: "all 0.1s",
        letterSpacing: "1px",
    },
    emptyState: {
        padding: "80px 20px",
        textAlign: "center",
        color: "#333",
    },
    emptyIcon: {
        fontSize: "48px",
        marginBottom: "16px",
        opacity: 0.5,
        filter: "grayscale(100%)",
    },
    emptyText: {
        fontSize: "14px",
        fontWeight: "500",
        textTransform: "uppercase",
        letterSpacing: "2px",
    },
};

// Inject focus
if (typeof document !== "undefined") {
    const style = document.createElement("style");
    style.textContent = `
    input:focus {
      border-color: #ff007f !important;
      background-color: #000 !important;
    }
  `;
    document.head.appendChild(style);
}