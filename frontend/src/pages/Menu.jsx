import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import ProductCard from "../components/ProductCard.jsx";
import { useShop } from "../context/ShopContext.jsx";
import { categories } from "../data/categories.js";
import "../style/menu.css";

export default function Menu() {
  const { menuItems, menuStatus, menuError, reloadMenu } = useShop();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      menuItems.filter(
        (item) =>
          (category === "All" || item.category === category) &&
          `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase())
      ),
    [menuItems, category, search]
  );

  // Any category used by an item but not in the fixed list is shown under its own heading too.
  const allCategories = useMemo(() => {
    const extra = [...new Set(menuItems.map((i) => i.category))].filter((c) => !categories.includes(c));
    return [...categories, ...extra];
  }, [menuItems]);

  const sections = allCategories
    .map((name) => ({ name, items: filtered.filter((i) => i.category === name) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="menu-page">
      <section className="page-banner"><div className="container"><span className="eyebrow">GOOD THINGS, MADE FRESH</span><h1>Something for<br /><em>every craving.</em></h1><p>Coffee, tea, pastries, food and more.</p></div></section>
      <section className="container menu-catalog">
        <div className="catalog-top">
          <div><span className="eyebrow">THE PHAKOE'S EXPRESS MENU</span><h2>Find your favourite.</h2></div>
          <label className="search-box"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the menu..." /></label>
        </div>
        <div className="filter-row">
          <div className="filter-label"><SlidersHorizontal size={16} /> Browse by</div>
          {["All", ...allCategories].map((item) => (
            <button key={item} onClick={() => setCategory(item)} className={`filter-chip ${category === item ? "active" : ""}`}>{item}</button>
          ))}
          <span className="result-count">{filtered.length} items</span>
        </div>
        {menuStatus === "loading" ? (
          <div className="no-results"><h3>Loading the menu…</h3><p>The server may take up to a minute to wake up the first time.</p></div>
        ) : menuStatus === "error" ? (
          <div className="no-results"><h3>We could not load the menu</h3><p>{menuError}</p><button className="button button-primary" onClick={reloadMenu}>Try again</button></div>
        ) : filtered.length ? (
          sections.map((section) => (
            <div className="menu-section" key={section.name}>
              <h3 className="menu-section-title">{section.name} <span>{section.items.length}</span></h3>
              <div className="product-grid menu-product-grid">
                {section.items.map((item) => <ProductCard key={item.id} item={item} />)}
              </div>
            </div>
          ))
        ) : (
          <div className="no-results"><h3>No items found</h3><p>Try another search or category.</p><button className="button button-primary" onClick={() => { setSearch(""); setCategory("All"); }}>Clear filters</button></div>
        )}
      </section>
    </div>
  );
}
