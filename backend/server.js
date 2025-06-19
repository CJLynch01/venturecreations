import express from "express";
import mongoose from "mongoose";
import dotenv, { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import productRoutes from "./routes/productRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../frontend/public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

app.use("/api/products", productRoutes);

app.get("/", (req, res) => {
    res.render("index", { title: 'Welcome to Venture Creations' });
});

//Mongo DB & Server

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected");
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`)
        })
    })
    .catch((err) => console.error(`MongoDB connection error:`, err));