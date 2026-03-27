let cart = [];

export const addItemToCart = (product) => {
  if (!product || !product.id) {
    throw new Error("Product is required");
  }

  // Ensure price is a number
  const price = parseFloat(product.price);
  if (isNaN(price)) {
    // Fallback or throw? For now fallback to original or 0 if totally invalid
    // strictly usage:
    console.warn(`Invalid price for product ${product.id}: ${product.price}`);
  }
  const cleanPrice = isNaN(price) ? 0 : price;

  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.qty += 1;
    // ensure existing item also has number price if it was somehow stale
    existingItem.price = cleanPrice;
  } else {
    cart.push({ ...product, price: cleanPrice, qty: 1 });
  }

  // calculate total
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return { items: cart, total };
};

export const addToCart = (req, res) => {
  try {
    const product = req.body.product || req.body;
    const result = addItemToCart(product);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateQuantity = (req, res) => {
  const { id, action } = req.body;
  if (!id || !action) {
    return res.status(400).json({ message: "ID and action are required" });
  }

  const existingItem = cart.find(item => item.id === id);

  if (existingItem) {
    if (action === "increment") {
      existingItem.qty += 1;
    } else if (action === "decrement") {
      existingItem.qty -= 1;
    }

    // Remove item if qty is 0 or less
    if (existingItem.qty <= 0) {
      cart = cart.filter(item => item.id !== id);
    }
  }

  // Recalculate total
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  res.json({ items: cart, total });
};

export const getCart = (req, res) => {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  res.json({ items: cart, total });
};

export const clearCart = (req, res) => {
  cart = [];
  res.json({ message: "Cart cleared" });
};

export const getCartItems = () => {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  return { items: cart, total };
};
