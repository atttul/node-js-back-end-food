import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const foodSchema = new Schema({
    CategoryName: { type: String, required: true },
    name: { type: String, required: true },
    img: { type: String, required: true },
    description: { type: String, required: true },
    options: { type: Array, required: false }
})

export const FoodItems = mongoose.model("food_items", foodSchema);