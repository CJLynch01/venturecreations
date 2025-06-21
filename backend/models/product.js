import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  sizes: [String],
  colors: [String],
  category: String,
  stock: Number,
  images: [String]
}, {timestamps: true });


export default mongoose.model('Product', productSchema);
