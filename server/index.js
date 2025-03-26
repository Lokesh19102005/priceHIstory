const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose
  .connect("mongodb+srv://lokeshbawariya1:12345@cluster0.nh9y8fk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// Product Schema
const ProductSchema = new mongoose.Schema({
  asin: String,
  title: String,
  image: String,
  priceHistory: [{ price: Number, date: Date }],
});

const Product = mongoose.model("Product", ProductSchema);

// ✅ Resolve short URLs like amzn.in
const resolveFinalUrl = async (url) => {
  try {
    const response = await axios.get(url, {
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const finalUrl = response.request.res.responseUrl || url;
    return finalUrl;
  } catch (err) {
    console.error("Error resolving short URL:", err.message);
    return url;
  }
};

// ✅ Extract ASIN from any valid Amazon URL
const extractASIN = (url) => {
  const asinMatch = url.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
  return asinMatch ? asinMatch[1] : null;
};

// ✅ Price Scraping Route
app.post("/scrape", async (req, res) => {
  try {
    let { url } = req.body;

    // Step 1: Resolve short URL if it's amzn.in
    if (url.includes("amzn.in")) {
      url = await resolveFinalUrl(url);
    }

    // Step 2: Extract ASIN from final URL
    const asin = extractASIN(url);
    if (!asin) {
      return res.status(400).json({ error: "ASIN not found in URL" });
    }

    // Step 3: Scrape page data
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Extract Price
    let priceText = $("span.a-price-whole")
      .first()
      .text()
      .replace(/[^\d]/g, "");
    if (!priceText) return res.status(404).json({ error: "Price not found" });
    const currentPrice = parseInt(priceText);

    // 🆕 Extract Title and Image
    const title =
      $("#productTitle").text().trim() || $("span#title").text().trim();
    const image =
      $("#landingImage").attr("src") ||
      $("img#imgBlkFront").attr("src") ||
      $("img.a-dynamic-image").first().attr("src") ||
      "";

    // Step 4: Save/update in DB
    let product = await Product.findOne({ asin });
    if (!product) {
      product = new Product({ asin, title, image, priceHistory: [] });
    } else {
      product.title = title; // Update if changed
      product.image = image;
    }

    product.priceHistory.push({ price: currentPrice, date: new Date() });
    await product.save();

    res.json({
      currentPrice,
      priceHistory: product.priceHistory,
      title: product.title,
      image: product.image,
      asin: asin,
    });
  } catch (err) {
    console.error("Error scraping:", err.message);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ✅ Updated Products List API with title & image
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find(
      {},
      { asin: 1, title: 1, image: 1, _id: 0 }
    );
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).json({ error: "Unable to fetch products" });
  }
});

// GET Price History by ASIN
app.get("/api/history/:asin", async (req, res) => {
  try {
    const product = await Product.findOne({ asin: req.params.asin });
    if (!product) return res.status(404).json({ error: "Product not found" });
    const latestPrice = product.priceHistory.slice(-1)[0]?.price || null;
    res.json({
      priceHistory: product.priceHistory,
      currentPrice: latestPrice,
      title: product.title,
      image: product.image,
      asin: product.asin,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(5000, () => {
  console.log("✅ Server is running on http://localhost:5000");
});
