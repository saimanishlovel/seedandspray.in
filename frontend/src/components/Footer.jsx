import { Plant, EnvelopeSimple, Phone, MapPin, Receipt } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../lib/api";

export default function Footer() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { api.get("/site-config").then((r) => setCfg(r.data)).catch(() => {}); }, []);
  const biz = cfg?.business || {};
  return (
    <footer className="bg-stone-900 text-stone-300 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src="https://customer-assets.emergentagent.com/job_harvest-commerce-11/artifacts/bxmnrpko_EDFC146D-03D8-4C47-9335-66933D3D31B3.png" alt="Rythu Shubham" className="w-12 h-12 rounded-full bg-white object-cover" />
              <div>
                <div className="font-display font-extrabold text-xl text-white">Rythu Shubham</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Best solutions for farmers</div>
              </div>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed">
              {biz.name || "Sri Laxmi Ganesh Seeds and Sprayers"} — your trusted partner for high-quality seeds, sprayers, machinery and farm tools.
            </p>
            {biz.gstin && (
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-stone-400 bg-stone-800 rounded-full px-3 py-1.5">
                <Receipt size={14} /> GSTIN: <span className="font-mono text-stone-200">{biz.gstin}</span>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shop?category=seeds" className="hover:text-white">Seeds</Link></li>
              <li><Link to="/shop?category=sprayers" className="hover:text-white">Sprayers</Link></li>
              <li><Link to="/shop?category=machinery" className="hover:text-white">Machinery</Link></li>
              <li><Link to="/shop?category=tools" className="hover:text-white">Tools</Link></li>
              <li><Link to="/shop?category=fertilizers" className="hover:text-white">Fertilizers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">Policies</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/account" className="hover:text-white">My Orders</Link></li>
              <li className="text-stone-400">{cfg?.policies?.shipping || "Pan-India delivery"}</li>
              <li className="text-stone-400">{cfg?.policies?.refund || "Non-returnable"}</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">Reach Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2"><Phone size={16} /> {biz.phone || "9908897530"}</li>
              <li className="flex items-center gap-2"><EnvelopeSimple size={16} /> {biz.email || "agriculturefarmer.store@gmail.com"}</li>
              <li className="flex items-start gap-2"><MapPin size={16} className="mt-0.5" /> <span>{biz.address || "Mahabubabad, Telangana"}</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col md:flex-row gap-4 justify-between text-xs text-stone-500">
          <div>© {new Date().getFullYear()} {biz.name || "Rythu Shubham"}. All rights reserved.</div>
          <div className="text-stone-500">{cfg?.tagline_te || "రైతుల కోసం ఉత్తమ పరిష్కారాలు"}</div>
        </div>
      </div>
    </footer>
  );
}
