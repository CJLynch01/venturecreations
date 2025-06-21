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

// POST /api/products
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      sizes,
      colors,
      category,
      stock,
      images
    } = req.body;

    // Handle sizes and colors as comma-separated strings
    const sizeArray = Array.isArray(sizes) ? sizes : sizes.split(',').map(s => s.trim());
    const colorArray = Array.isArray(colors) ? colors : colors.split(',').map(c => c.trim());

    // Filter out any empty image fields
    const imageArray = Array.isArray(images)
      ? images.filter(url => url.trim() !== '')
      : [images]; // fallback in case it's a single string

    const product = new Product({
      name,
      price,
      sizes: sizeArray,
      colors: colorArray,
      category,
      stock,
      images: imageArray
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: 'Error creating product', error: err });
  }
};