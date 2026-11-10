import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  sizes: [String],
  colors: [String],
  category: String,
  stock: Number,
  images: [String],
  description: { type: String, maxlength: 5000 },   // shown on the product page and to search engines

  seasonalCategory: {
    type: String,
    required: false,
    enum: ['None', 'Christmas', 'Easter', 'Fall', 'Summer', 'Back to School'],
    default: 'None'
  },
  tags: {
    type: [String],
    default: []
  }

}, {timestamps: true });

export default mongoose.model('Product', productSchema);