import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  sizes: [String],
  colors: [String],
  category: String,
  imageUrl: String,
  stock: Number
});

export default mongoose.model('Product', productSchema);
