import mongoose from "mongoose";
import { Schema } from "mongoose";

const admin = new Schema({
    name: String,
    email: String,
    phone: Number
})


const Admin = mongoose.models.Admin || mongoose.model("Admin", admin);

export { Admin };