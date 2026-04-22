import mongoose, { set } from "mongoose";
require("dotenv").config();

const dbURl = process.env.DATABASE_URL || "";

export const connectDB = async () => {
    try {
        await mongoose.connect(dbURl).then((data:any) => {
            console.log(`MongoDB connected with server: ${data.connection.host}`);
        });
    } catch (error:any) {
        console.log("Error connecting to MongoDB:", error.message);
        setTimeout(connectDB, 5000); 
    }
}

export default connectDB;