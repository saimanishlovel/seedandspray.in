import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { ShoppingCart, User, MagnifyingGlass, List, X, SignOut, Plant } from "@phosphor-icons/react";
import { useState } from "react";

export default function Header() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const onSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/shop?q=${encodeURIComponent(search.trim())}`);
  };

  const navLinkCls = ({ isActive }) =>
    `text-sm font-medium transition-colors ${isActive ? "text-forest" : "text-stone-700 hover:text-forest"}`;

  return (
    <header className="sticky top-0 z-50 glass border-b border-stone-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0" data-testid="logo-link">
            <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center">
              <Plant size={22} weight="duotone" color="#FDFBF7" />
            </div>
            <div className="leading-none">
              <div className="font-display font-extrabold text-xl text-forest">Seed &amp; Spray</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Sown right. Sprayed smart.</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            <NavLink to="/" className={navLinkCls} end data-testid="nav-home">Home</NavLink>
            <NavLink to="/shop" className={navLinkCls} data-testid="nav-shop">Shop All</NavLink>
            <NavLink to="/shop?category=seeds" className={navLinkCls} data-testid="nav-seeds">Seeds</NavLink>
            <NavLink to="/shop?category=machinery" className={navLinkCls} data-testid="nav-machinery">Machinery</NavLink>
            <NavLink to="/shop?category=tools" className={navLinkCls} data-testid="nav-tools">Tools</NavLink>
          </nav>

          <form onSubmit={onSearch} className="hidden md:flex items-center bg-white border border-stone-200 rounded-full px-4 h-11 w-72">
            <MagnifyingGlass size={18} className="text-stone-400" />
            <input
              data-testid="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search seeds, sprayers..."
              className="bg-transparent flex-1 text-sm px-3 outline-none"
            />
          </form>

          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              data-testid="cart-link"
              className="relative inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-stone-100 transition-colors"
            >
              <ShoppingCart size={22} className="text-stone-800" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-ochre text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/account" data-testid="account-link" className="inline-flex items-center gap-2 px-3 h-10 rounded-full hover:bg-stone-100 transition-colors text-sm">
                  <User size={18} /> {user.name?.split(" ")[0]}
                </Link>
                {user.role === "admin" && (
                  <Link to="/admin" data-testid="admin-link" className="text-xs px-3 h-9 inline-flex items-center rounded-full bg-forest text-white">
                    Admin
                  </Link>
                )}
                <button onClick={logout} data-testid="logout-btn" className="inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-stone-100">
                  <SignOut size={18} />
                </button>
              </div>
            ) : (
              <Link to="/login" data-testid="login-link" className="hidden md:inline-flex btn-primary text-sm h-10 py-0 items-center">
                Sign in
              </Link>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-stone-100"
              data-testid="mobile-menu-toggle"
            >
              {mobileOpen ? <X size={22} /> : <List size={22} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden py-4 border-t border-stone-200 space-y-3">
            <form onSubmit={onSearch} className="flex items-center bg-white border border-stone-200 rounded-full px-4 h-11">
              <MagnifyingGlass size={18} className="text-stone-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent flex-1 px-3 outline-none text-sm" />
            </form>
            <NavLink to="/" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium">Home</NavLink>
            <NavLink to="/shop" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium">Shop All</NavLink>
            <NavLink to="/shop?category=seeds" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium">Seeds</NavLink>
            <NavLink to="/shop?category=machinery" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium">Machinery</NavLink>
            <NavLink to="/shop?category=tools" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium">Tools</NavLink>
            {user ? (
              <>
                <Link to="/account" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium">My Account</Link>
                {user.role === "admin" && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-forest">Admin Panel</Link>}
                <button onClick={() => { logout(); setMobileOpen(false); }} className="block py-2 text-sm font-medium text-destructive">Logout</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-forest">Sign in</Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
