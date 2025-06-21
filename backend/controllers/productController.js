import Product from '../models/Product.js';

// GET /api/products
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products', error: err });
  }
};

// POST /admin/products/new
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      sizes,
      colors,
      category,
      stock
    } = req.body;

    const images = Array.isArray(req.body.images)
      ? req.body.images.filter(url => url.trim() !== "")
      : [req.body.images].filter(url => url.trim() !== "");

    const newProduct = new Product({
      name,
      price: parseFloat(price),
      sizes: sizes.split(",").map(s => s.trim()),
      colors: colors.split(",").map(c => c.trim()),
      category,
      stock: parseInt(stock),
      images
    });

    await newProduct.save();
    res.redirect("/admin");
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(400).send("Error creating product");
  }
};