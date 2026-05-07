import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import { Funnel } from "@phosphor-icons/react";

const CATEGORIES = [
  { slug: "", name: "All" },
  { slug: "seeds", name: "Seeds" },
  { slug: "sprayers", name: "Sprayers" },
  { slug: "machinery", name: "Machinery" },
  { slug: "tools", name: "Tools" },
  { slug: "fertilizers", name: "Fertilizers" },
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "";
  const q = params.get("q") || "";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("default");

  useEffect(() => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (category) sp.set("category", category);
    if (q) sp.set("q", q);
    api.get(`/products?${sp.toString()}`).then((r) => {
      setProducts(r.data);
      setLoading(false);
    });
  }, [category, q]);

  const sorted = [...products].sort((a, b) => {
    if (sort === "price-low") return a.price - b.price;
    if (sort === "price-high") return b.price - a.price;
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="label-eyebrow mb-3">Catalog</div>
        <h1 className="font-display font-bold text-4xl md:text-5xl text-stone-900">
          {category ? CATEGORIES.find((c) => c.slug === category)?.name || "Shop" : "All Products"}
        </h1>
        {q && <p className="mt-2 text-stone-500">Showing results for "<span className="text-stone-900 font-semibold">{q}</span>"</p>}
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-8">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug || "all"}
              data-testid={`filter-${c.slug || "all"}`}
              onClick={() => {
                const np = new URLSearchParams(params);
                if (c.slug) np.set("category", c.slug); else np.delete("category");
                setParams(np);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                (category || "") === c.slug
                  ? "bg-forest text-white border-forest"
                  : "bg-white text-stone-700 border-stone-200 hover:border-forest"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Funnel size={18} className="text-stone-500" />
          <select
            data-testid="sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-white border border-stone-200 rounded-full px-4 py-2 text-sm outline-none focus:border-forest"
          >
            <option value="default">Sort: Default</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-stone-500">Loading products...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-stone-500">No products found.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" data-testid="product-grid">
          {sorted.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
