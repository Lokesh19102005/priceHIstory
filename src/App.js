import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
);

function App() {
  const [url, setUrl] = useState("");
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [productList, setProductList] = useState([]); // 🆕 New state for product list
  const [productTitle, setProductTitle] = useState("");
  const [productImage, setProductImage] = useState("");
  const [selectedASIN, setSelectedASIN] = useState(null);

  // ✅ Function to fetch tracked product list
  const fetchProductList = async () => {
    try {
      const response = await axios.get("http://localhost:5000/products");
      setProductList(response.data);
    } catch (error) {
      console.error("Error fetching product list:", error);
    }
  };

  const handleProductClick = (asin) => {
    fetchPriceHistoryByASIN(asin); // Already existing
    window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll to top smoothly
  };

  // ✅ Fetch product list on page load
  useEffect(() => {
    fetchProductList();
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setCurrentPrice(null);
    setPriceHistory([]);

    try {
      const response = await axios.post("http://localhost:5000/scrape", {
        url,
      });
      setCurrentPrice(response.data.currentPrice);
      setPriceHistory(response.data.priceHistory);
      setProductTitle(response.data.title); // from your backend
      setProductImage(response.data.image); // from your backend
      setSelectedASIN(response.data.asin);
      fetchProductList(); // 🔄 Refresh product list after tracking
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistoryByASIN = async (asin) => {
    try {
      const response = await fetch(`http://localhost:5000/api/history/${asin}`);
      const data = await response.json();
      setPriceHistory(data.priceHistory || []);
      setCurrentPrice(data.currentPrice || null);
      setProductTitle(data.title); // from your backend
      setProductImage(data.image); // from your backend
      setSelectedASIN(data.asin);
    } catch (error) {
      console.error("Error fetching price history by ASIN:", error);
    }
  };

  const chartData = {
    labels: priceHistory.map((item) => new Date(item.date).toLocaleString()),
    datasets: [
      {
        label: "Price History",
        data: priceHistory.map((item) => item.price),
        borderColor: "blue",
        backgroundColor: "lightblue",
        fill: false,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true },
    },
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>
      <h2>📦 Product Price Tracker</h2>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.amazon.in/..."
        style={{
          maxWidth: "100%",
          width: "320px",
          padding: "8px",
          marginRight: "10px",
        }}
        disabled={loading}
      />
      <button
        onClick={handleSubmit}
        style={{ padding: "8px 15px" }}
        disabled={loading}
      >
        {loading ? "Tracking..." : "Track Price"}
      </button>

      {loading && (
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <div className="spinner"></div>
          <p style={{ color: "gray" }}>Fetching product price...</p>
        </div>
      )}

      {!loading && productTitle && productImage && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap", // Ensures wrapping on smaller screens
            alignItems: "flex-start",
            marginTop: "20px",
            marginBottom: "20px",
            gap: "20px",
          }}
        >
          <img
            src={productImage}
            alt="Product"
            style={{
              width: "180px",
              height: "180px",
              objectFit: "contain",
              borderRadius: "12px",
              boxShadow: "0 0 10px rgba(0,0,0,0.1)",
            }}
          />
          <div style={{ width:  window.innerWidth < 1000 ? "600px" : "1000px",  maxWidth: "100%" }}>
            <h2
              style={{
                marginBottom: "5px",
                fontSize: window.innerWidth < 700 ? "16px" : "20px", 
                maxWidth: "100%",
                wordWrap: "break-word",
              }}
            >
              {productTitle}
            </h2>

            <div>
              <p style={{ fontWeight: "bold" }}>ASIN: {selectedASIN}</p>
              <a
                href={`https://www.amazon.in/dp/${selectedASIN}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button
                  style={{
                    backgroundColor: "#ff9900",
                    color: "white",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  🛒 Buy from Amazon
                </button>
              </a>
            </div>
          </div>
        </div>
      )}

      {!loading && currentPrice && (
        <p style={{ marginTop: "20px" }}>Current Price: ₹{currentPrice}</p>
      )}

      {!loading && (
        <>
          <h3>Price History:</h3>
          {priceHistory.length > 0 ? (
            <ul>
              {priceHistory.map((item, index) => (
                <li key={index}>
                  ₹{item.price} - {new Date(item.date).toLocaleString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>No price history available.</p>
          )}

          {priceHistory.length > 0 && (
            <>
              <h3>📈 Price Trend Chart</h3>
              <div style={{ maxWidth: "600px" }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </>
          )}

          {/* 🆕 Display List of Tracked Products in Card Grid Format */}
          <h3 style={{ marginTop: "40px" }}>🗂️ Tracked Products:</h3>
          {productList.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "20px",
              }}
            >
              {productList.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleProductClick(item.asin)}
                  className="product-card"
                >
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title || "Product Image"}
                      style={{
                        width: "100px",
                        height: "100px",
                        objectFit: "contain",
                        marginBottom: "10px",
                      }}
                    />
                  )}
                  <strong style={{ fontSize: "14px", marginBottom: "5px" }}>
                    {item.title || "No Title Available"}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#555" }}>
                    ASIN: <code>{item.asin}</code>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>No products tracked yet.</p>
          )}
        </>
      )}
    </div>
  );
}

export default App;
