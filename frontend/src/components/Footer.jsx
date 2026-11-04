import { AtSign, Coffee, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="brand"><span className="brand-mark"><Coffee size={22} /></span><span>Phakoe's <span className="brand-accent">Coffee Shop</span><small>EXPRESS</small></span></Link>
          <p>Good coffee, kind people, and little moments worth slowing down for.</p>
        </div>
        <div><h4>Explore</h4><Link to="/menu">Our menu</Link><Link to="/track">Track your order</Link><Link to="/about">Our story</Link><Link to="/staff">Staff dashboard</Link></div>
        <div><h4>Come say hello</h4><p><MapPin size={15} /> Maseru, Lesotho</p><p><Phone size={15} /> +266 0000 0000</p><p><AtSign size={15} /> @phakoescoffeeshop</p></div>
      </div>
      <div className="footer-bottom">© 2026 Phakoe's Coffee Shop Express · Student project demonstration</div>
    </footer>
  );
}