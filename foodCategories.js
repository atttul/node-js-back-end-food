import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const foodCategoriesSchema = new Schema({
    CategoryName: { type: String, required: true }
})

export const FoodCategories = mongoose.model("food_category", foodCategoriesSchema);