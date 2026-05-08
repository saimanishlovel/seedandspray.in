import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://harvest-commerce-11.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@seedandspray.in")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@123")


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def customer(s):
    email = f"TEST_cust_{uuid.uuid4().hex[:8]}@test.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "Test@123", "name": "Test Cust"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "token": data["token"], "user": data["user"]}


def auth_h(t): return {"Authorization": f"Bearer {t}"}


# ---- Health ----
def test_health(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert "running" in r.json()["message"].lower()


# ---- Categories ----
def test_categories(s):
    r = s.get(f"{API}/categories")
    assert r.status_code == 200
    cats = r.json()
    assert len(cats) == 5
    slugs = {c["slug"] for c in cats}
    assert {"seeds", "sprayers", "machinery", "tools", "fertilizers"} == slugs


# ---- Products ----
def test_products_list(s):
    r = s.get(f"{API}/products")
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 17

def test_products_filter_category(s):
    r = s.get(f"{API}/products", params={"category": "seeds"})
    assert r.status_code == 200
    for p in r.json():
        assert p["category"] == "seeds"

def test_products_search(s):
    r = s.get(f"{API}/products", params={"q": "tomato"})
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    assert any("tomato" in p["name"].lower() for p in items)

def test_products_featured(s):
    r = s.get(f"{API}/products", params={"featured": "true"})
    assert r.status_code == 200
    for p in r.json():
        assert p["featured"] is True

def test_products_limit(s):
    r = s.get(f"{API}/products", params={"limit": 3})
    assert r.status_code == 200
    assert len(r.json()) <= 3

def test_product_detail_and_404(s):
    items = s.get(f"{API}/products", params={"limit": 1}).json()
    pid = items[0]["id"]
    r = s.get(f"{API}/products/{pid}")
    assert r.status_code == 200
    assert r.json()["id"] == pid
    r2 = s.get(f"{API}/products/nonexistent-id-xyz")
    assert r2.status_code == 404


# ---- Auth ----
def test_register_duplicate(s, customer):
    r = s.post(f"{API}/auth/register", json={"email": customer["email"], "password": "Test@123", "name": "X"})
    assert r.status_code == 400

def test_login_admin_wrong_pwd(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "WrongPwd"})
    assert r.status_code == 401

def test_admin_login_and_role(s, admin_token):
    r = s.get(f"{API}/auth/me", headers=auth_h(admin_token))
    assert r.status_code == 200
    assert r.json()["role"] == "admin"

def test_me_no_token(s):
    r = s.get(f"{API}/auth/me")
    assert r.status_code == 401


# ---- Cart ----
def test_cart_flow(s, customer):
    t = customer["token"]
    # clear first
    s.delete(f"{API}/cart", headers=auth_h(t))
    products = s.get(f"{API}/products", params={"limit": 2}).json()
    pid = products[0]["id"]
    pid2 = products[1]["id"]

    r = s.post(f"{API}/cart/items", json={"product_id": pid, "quantity": 2}, headers=auth_h(t))
    assert r.status_code == 200
    r = s.post(f"{API}/cart/items", json={"product_id": pid2, "quantity": 1}, headers=auth_h(t))
    assert r.status_code == 200

    r = s.get(f"{API}/cart", headers=auth_h(t))
    assert r.status_code == 200
    cart = r.json()
    assert len(cart["items"]) == 2
    assert cart["subtotal"] > 0

    r = s.put(f"{API}/cart/items/{pid}", json={"product_id": pid, "quantity": 5}, headers=auth_h(t))
    assert r.status_code == 200
    cart = s.get(f"{API}/cart", headers=auth_h(t)).json()
    qty = next(i["quantity"] for i in cart["items"] if i["product_id"] == pid)
    assert qty == 5

    r = s.delete(f"{API}/cart/items/{pid2}", headers=auth_h(t))
    assert r.status_code == 200
    cart = s.get(f"{API}/cart", headers=auth_h(t)).json()
    assert all(i["product_id"] != pid2 for i in cart["items"])


# ---- Orders ----
@pytest.fixture(scope="session")
def created_order(s, customer):
    t = customer["token"]
    s.delete(f"{API}/cart", headers=auth_h(t))
    pid = s.get(f"{API}/products", params={"limit": 1}).json()[0]["id"]
    s.post(f"{API}/cart/items", json={"product_id": pid, "quantity": 2}, headers=auth_h(t))
    payload = {
        "address": {"full_name": "Test User", "phone": "9999999999", "line1": "L1", "city": "C", "state": "S", "pincode": "123456"},
        "payment_method": "COD",
    }
    r = s.post(f"{API}/orders", json=payload, headers=auth_h(t))
    assert r.status_code == 200, r.text
    return r.json()

def test_order_created_clears_cart(s, customer, created_order):
    assert created_order["id"]
    assert created_order["payment_method"] == "COD"
    cart = s.get(f"{API}/cart", headers=auth_h(customer["token"])).json()
    assert cart["items"] == []

def test_list_my_orders(s, customer, created_order):
    r = s.get(f"{API}/orders", headers=auth_h(customer["token"]))
    assert r.status_code == 200
    assert any(o["id"] == created_order["id"] for o in r.json())

def test_get_single_order(s, customer, created_order):
    r = s.get(f"{API}/orders/{created_order['id']}", headers=auth_h(customer["token"]))
    assert r.status_code == 200

def test_order_403_other_user(s, created_order):
    other_email = f"TEST_other_{uuid.uuid4().hex[:6]}@test.com"
    rr = s.post(f"{API}/auth/register", json={"email": other_email, "password": "Test@123", "name": "Other"})
    other_token = rr.json()["token"]
    r = s.get(f"{API}/orders/{created_order['id']}", headers=auth_h(other_token))
    assert r.status_code == 403


# ---- Admin product CRUD ----
def test_admin_product_crud(s, admin_token, customer):
    # customer can't create
    r = s.post(f"{API}/products", json={"name": "X", "category": "tools", "price": 1, "description": "d", "image": "i"}, headers=auth_h(customer["token"]))
    assert r.status_code == 403
    payload = {"name": f"TEST_PROD_{uuid.uuid4().hex[:6]}", "category": "tools", "price": 99.0, "description": "test", "image": "https://img", "stock": 10}
    r = s.post(f"{API}/products", json=payload, headers=auth_h(admin_token))
    assert r.status_code == 200
    pid = r.json()["id"]
    r = s.put(f"{API}/products/{pid}", json={"price": 150.0}, headers=auth_h(admin_token))
    assert r.status_code == 200
    assert r.json()["price"] == 150.0
    # GET verify persisted
    g = s.get(f"{API}/products/{pid}").json()
    assert g["price"] == 150.0
    r = s.delete(f"{API}/products/{pid}", headers=auth_h(admin_token))
    assert r.status_code == 200
    assert s.get(f"{API}/products/{pid}").status_code == 404


# ---- Admin orders & stats ----
def test_admin_orders_and_stats(s, admin_token, created_order):
    r = s.get(f"{API}/admin/orders", headers=auth_h(admin_token))
    assert r.status_code == 200
    assert any(o["id"] == created_order["id"] for o in r.json())
    r = s.patch(f"{API}/admin/orders/{created_order['id']}", json={"status": "shipped"}, headers=auth_h(admin_token))
    assert r.status_code == 200
    r = s.get(f"{API}/admin/stats", headers=auth_h(admin_token))
    assert r.status_code == 200
    stats = r.json()
    for k in ("total_orders", "pending_orders", "total_products", "total_customers", "revenue"):
        assert k in stats

def test_admin_stats_forbidden_for_customer(s, customer):
    r = s.get(f"{API}/admin/stats", headers=auth_h(customer["token"]))
    assert r.status_code == 403
