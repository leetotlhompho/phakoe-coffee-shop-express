import { useState } from "react";
import { Plus } from "lucide-react";
import { photoSrc } from "../photo.js";
import { useShop } from "../context/ShopContext.jsx";

export default function ProductCard({ item }) {
  const { addToCart } = useShop();
  const available = item.available !== false;
  // Tall or square photos (like a bottle) are shown whole instead of being cropped.
  const [tall, setTall] = useState(false);
  const checkShape = (e) => setTall(e.target.naturalWidth / e.target.naturalHeight < 1.25);
  return (
    <article className={`product-card ${available ? "" : "is-unavailable"}`}>
      <div className={`product-photo ${item.image ? "" : "no-photo"} ${tall ? "is-tall" : ""}`} style={tall ? { "--photo": `url("${photoSrc(item.image)}")` } : undefined}>
        {item.image && <img src={photoSrc(item.image)} alt={item.name} loading="lazy" onLoad={checkShape} />}
        {item.badge && available && <span className="product-badge">{item.badge}</span>}
        {!available && <span className="product-badge unavailable-badge">Sold out</span>}
      </div>
      <div className="product-info">
        <div className="product-meta">
          <span>{item.category}</span>
          <span className={available ? "availability in-stock" : "availability out-of-stock"}>
            {available ? "Available" : "Unavailable"}
          </span>
        </div>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="product-bottom">
          <strong>M{Number(item.price).toFixed(2)}</strong>
          <button
            className="add-button"
            onClick={() => addToCart(item)}
            disabled={!available}
            aria-label={available ? `Add ${item.name} to cart` : `${item.name} is unavailable`}
          >
            <Plus size={16} /> {available ? "Add" : "Sold out"}
          </button>
        </div>
      </div>
    </article>
  );
}
