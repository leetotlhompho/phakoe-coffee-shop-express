import { ArrowRight, Coffee, Heart, Leaf, Star } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import { useShop } from "../context/ShopContext.jsx";
import "../style/home.css";

export default function Home() {
  const { menuItems } = useShop();
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="container hero-layout">
          <div className="hero-copy">
            <span className="eyebrow"><span className="eyebrow-line" /> YOUR NEIGHBOURHOOD COFFEE SPOT</span>
            <h1>Make room for<br /><em>something good.</em></h1>
            <p className="hero-lead">Thoughtfully brewed coffee, oven-fresh treats, and a cosy little pause in your day.</p>
            <div className="hero-actions"><Link className="button button-primary" to="/menu">Explore the menu <ArrowRight size={17} /></Link><Link className="text-link" to="/about">Get to know us</Link></div>
            <div className="hero-proof"><div className="proof-avatars"><span>J</span><span>M</span><span>L</span></div><div><div className="proof-stars"><Star /><Star /><Star /><Star /><Star /></div><p>Your daily ritual, made special</p></div></div>
          </div>
          <div className="hero-visual">
            <img className="hero-main-image" src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1300&q=90" alt="Warmly lit coffee shop with freshly brewed coffee" />
            <div className="hero-sticker"><Coffee size={23} /><span>Freshly brewed<br /><b>with love</b></span></div>
            <div className="hero-caption">A GOOD DAY STARTS HERE <span>↗</span></div>
          </div>
        </div>
        <div className="hero-decoration" aria-hidden="true">B</div>
      </section>

      <section className="values-strip">
        <div className="container values-grid">
          <div><Coffee /><span><b>Made fresh</b><small>Every cup, every time</small></span></div>
          <div><Leaf /><span><b>Thoughtful ingredients</b><small>Goodness in every bite</small></span></div>
          <div><Heart /><span><b>Made for community</b><small>A place to feel at home</small></span></div>
        </div>
      </section>

      <section className="section container featured-section">
        <div className="section-heading-row"><div><span className="eyebrow">A FEW HOUSE FAVOURITES</span><h2>The good stuff.</h2><p>Little pick-me-ups for whatever your day has in store.</p></div><Link className="text-link" to="/menu">View full menu <ArrowRight size={16} /></Link></div>
        <div className="product-grid">{menuItems.slice(0, 4).map(item => <ProductCard key={item.id} item={item} />)}</div>
      </section>

      <section className="home-story">
        <div className="container story-layout">
          <div className="story-image-wrap"><img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1100&q=85" alt="Coffee being prepared on a wooden counter" /><span className="story-image-note">SLOW DOWN. SIP UP.</span></div>
          <div className="story-copy"><span className="eyebrow">A LITTLE ABOUT US</span><h2>More than coffee.<br /><em>A feeling.</em></h2><p>We believe the best things happen when you take a moment. Phakoe's Coffee Shop Express is your friendly neighbourhood spot for a thoughtful cup, a fresh pastry, and a warm welcome.</p><Link to="/about" className="button button-outline">Our story <ArrowRight size={16} /></Link></div>
        </div>
      </section>
      <section className="home-cta container"><div><span className="eyebrow">YOUR NEXT FAVOURITE IS WAITING</span><h2>Ready for a little <em>coffee break?</em></h2></div><Link className="button button-light" to="/menu">Order something lovely <ArrowRight size={17} /></Link></section>
    </div>
  );
}