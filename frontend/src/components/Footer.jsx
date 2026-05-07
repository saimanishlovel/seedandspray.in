import { Plant, EnvelopeSimple, Phone, MapPin } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center">
                <Plant size={22} weight="duotone" color="#FDFBF7" />
              </div>
              <div>
                <div className="font-display font-extrabold text-xl text-white">AgriMart</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Farm Essentials</div>
              </div>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed">
              India's trusted partner for high-quality seeds, sprayers, machinery and farm tools — delivered to your doorstep.
            </p>
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
            <h4 className="font-display font-bold text-white mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/account" className="hover:text-white">My Orders</Link></li>
              <li><a href="#" className="hover:text-white">Shipping & Returns</a></li>
              <li><a href="#" className="hover:text-white">FAQs</a></li>
              <li><a href="#" className="hover:text-white">Contact Us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-white mb-4">Reach Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2"><Phone size={16} /> +91 98765 43210</li>
              <li className="flex items-center gap-2"><EnvelopeSimple size={16} /> hello@agrimart.in</li>
              <li className="flex items-center gap-2"><MapPin size={16} /> Pune, Maharashtra</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col md:flex-row gap-4 justify-between text-xs text-stone-500">
          <div>© {new Date().getFullYear()} AgriMart. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Refund Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
