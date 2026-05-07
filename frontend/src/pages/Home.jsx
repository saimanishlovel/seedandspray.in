import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import ProductCard from "../components/ProductCard";
import { ArrowRight, Truck, ShieldCheck, Plant, Headset } from "@phosphor-icons/react";

const HERO_IMG = "https://images.unsplash.com/photo-1776771519532-5ff46dc29461?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjd8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBhZ3JpY3VsdHVyZSUyMHRyYWN0b3IlMjBmYXJtaW5nfGVufDB8fHx8MTc3ODE2ODI1Mnww&ixlib=rb-4.1.0&q=85";

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get("/products?featured=true&limit=8").then((r) => setFeatured(r.data));
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Bento */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Big hero */}
          <div className="lg:col-span-8 relative rounded-3xl overflow-hidden min-h-[480px] lg:min-h-[560px] bg-stone-900">
            <img src={HERO_IMG} alt="Modern farming" className="absolute inset-0 w-full h-full object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-r from-stone-900/85 via-stone-900/55 to-transparent" />
            <div className="relative z-10 h-full flex flex-col justify-end p-8 md:p-14">
              <div className="label-eyebrow !text-ochre mb-4">From soil to harvest</div>
              <h1 className="font-display font-extrabold text-white text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight max-w-2xl">
                Everything your farm <span className="text-ochre">grows on.</span>
              </h1>
              <p className="text-stone-200/90 mt-5 text-lg max-w-xl">
                Certified seeds, rugged sprayers, modern machinery and trusted hand-tools — sourced from leading brands and delivered to your village.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link to="/shop" data-testid="hero-shop-btn" className="btn-accent inline-flex items-center gap-2">
                  Shop Now <ArrowRight size={18} weight="bold" />
                </Link>
                <Link to="/shop?category=seeds" className="bg-white/10 border border-white/20 text-white hover:bg-white/20 backdrop-blur-md rounded-full px-6 py-3 font-medium">
                  Browse Seeds
                </Link>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-4 grid gap-6">
            <div className="rounded-3xl bg-forest text-white p-8 flex flex-col justify-between min-h-[270px] relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-44 h-44 rounded-full bg-forest-light/40 blur-2xl" />
              <div className="relative">
                <Truck size={36} weight="duotone" />
                <h3 className="font-display font-bold text-2xl mt-4">Free Delivery</h3>
                <p className="text-sm text-white/80 mt-1">On all orders above ₹1,000 — pan-India coverage</p>
              </div>
              <div className="relative text-xs text-white/70 uppercase tracking-[0.2em]">Hassle-free</div>
            </div>
            <div className="rounded-3xl bg-ochre text-white p-8 flex flex-col justify-between min-h-[270px] relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-44 h-44 rounded-full bg-white/15 blur-2xl" />
              <div className="relative">
                <Plant size={36} weight="duotone" />
                <h3 className="font-display font-bold text-2xl mt-4">Certified Seeds</h3>
                <p className="text-sm text-white/90 mt-1">100% authentic, lab-tested germination guarantee</p>
              </div>
              <Link to="/shop?category=seeds" className="relative text-sm font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all">
                Explore <ArrowRight size={16} weight="bold" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="label-eyebrow mb-3">Shop by category</div>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-stone-900">Built for every season</h2>
          </div>
          <Link to="/shop" className="hidden md:inline-flex items-center gap-1 text-forest font-semibold hover:gap-2 transition-all">
            View all <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/shop?category=${c.slug}`}
              data-testid={`category-${c.slug}`}
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] bg-stone-100"
            >
              <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/85 via-stone-900/20 to-transparent" />
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <div className="font-display font-bold text-white text-xl">{c.name}</div>
                <div className="text-white/80 text-xs mt-1 inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Shop now <ArrowRight size={12} weight="bold" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="label-eyebrow mb-3">Most loved</div>
            <h2 className="font-display font-bold text-3xl md:text-4xl text-stone-900">Featured products</h2>
          </div>
          <Link to="/shop" className="text-forest font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all">
            See all <ArrowRight size={16} weight="bold" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="bg-topo border-y border-stone-200">
        <div className="bg-sand/85 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-10">
            {[
              { icon: Truck, t: "Free shipping", d: "On orders above ₹1000" },
              { icon: ShieldCheck, t: "Genuine products", d: "Direct from brands" },
              { icon: Headset, t: "Expert support", d: "Mon–Sat, 9am–7pm" },
              { icon: Plant, t: "Farmer first", d: "Pricing for the field" },
            ].map((v) => (
              <div key={v.t} className="flex flex-col items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-forest/10 flex items-center justify-center text-forest">
                  <v.icon size={26} weight="duotone" />
                </div>
                <div className="font-display font-bold text-lg text-stone-900">{v.t}</div>
                <div className="text-sm text-stone-600">{v.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
