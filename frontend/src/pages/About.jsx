import { Coffee, Heart, Leaf, Users } from "lucide-react";
import { Link } from "react-router-dom";
import "../style/about.css";

export default function About() {
  return (
    <div className="about-page">
      <section className="page-banner about-banner"><div className="container"><span className="eyebrow">THE HEART BEHIND THE CUP</span><h1>A little place to<br /><em>feel good.</em></h1><p>Good coffee is only the beginning.</p></div></section>
      <section className="container about-intro"><div className="about-intro-image"><img src="images/l.jpeg" alt="Cosy coffee shop interior" /></div><div className="about-intro-copy"><span className="eyebrow">HELLO FROM PHAKOE'S EXPRESS</span><h2>We saved you<br />a <em>seat.</em></h2><p>Phakoe's Coffee Shop Express was imagined as the kind of coffee shop that makes an ordinary day feel a little brighter. A place to catch up with a friend, work on a new idea, or simply enjoy a quiet moment with your favourite cup.</p><p>We care about the details: thoughtful ingredients, welcoming service, and making every guest feel at home.</p><Link to="/menu" className="button button-primary">Find your favourite <Coffee size={16} /></Link></div></section>
      <section className="about-values"><div className="container"><div className="section-heading centered"><span className="eyebrow">WHAT WE BELIEVE</span><h2>The little things <em>matter.</em></h2></div><div className="about-value-grid"><article><Coffee /><h3>Craft over shortcuts</h3><p>Every cup deserves care, attention, and a little patience.</p></article><article><Leaf /><h3>Thoughtful choices</h3><p>We aim to make simple things well, from first sip to last bite.</p></article><article><Heart /><h3>Warmth in every visit</h3><p>Come as you are. There's always room for one more.</p></article><article><Users /><h3>Community first</h3><p>A neighbourhood spot is better when it brings people together.</p></article></div></div></section>
      <section className="container about-cta"><div><span className="eyebrow">COME ON IN</span><h2>Your table is waiting.</h2></div><Link to="/menu" className="button button-primary">Explore the menu</Link></section>
    </div>
  );
}