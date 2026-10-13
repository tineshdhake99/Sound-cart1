const API = "/api";
const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let products = [], category = "All", query = "", cart = JSON.parse(localStorage.getItem("soundcart-cart") || "[]");
let authMode = "login", token = localStorage.getItem("soundcart-token") || "";
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
async function api(path, options = {}) {
  const response = await fetch(API + path, { ...options, headers: { "Content-Type":"application/json", ...(options.headers || {}), ...(token ? { Authorization:`Bearer ${token}` } : {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed. Please try again.");
  return data;
}
function saveCart(){ localStorage.setItem("soundcart-cart", JSON.stringify(cart)); renderCart(); }
function filteredProducts(){ return products.filter(p => (category === "All" || p.category === category) && `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(query.toLowerCase())); }
function renderProducts(){
 const list = filteredProducts(), grid = $("#productGrid");
 if(!list.length){grid.innerHTML='<div class="empty">No instruments found. Try another search.</div>';return;}
 grid.innerHTML = list.map(p => `<article class="product-card">
  <div class="product-image-wrap"><img class="product-image" loading="lazy" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" onerror="this.src='https://placehold.co/600x600/eae9e1/191b16?text=SoundCart'">
  <span class="product-tag">${escapeHtml(p.tag || "SoundCart pick")}</span><button class="quick-add" data-add="${escapeHtml(p.id)}" aria-label="Add ${escapeHtml(p.name)} to cart">+</button></div>
  <p class="product-category">${escapeHtml(p.category)}</p><h3>${escapeHtml(p.name)}</h3><div class="price-line"><span class="price">${money(p.price)}</span>${p.oldPrice ? `<span class="old-price">${money(p.oldPrice)}</span>` : ""}</div></article>`).join("");
}
async function loadProducts(){
 try { const data = await api("/products"); products = data.products || []; renderProducts(); }
 catch(error){ $("#productGrid").innerHTML=`<div class="empty">Couldn't load products. ${escapeHtml(error.message)}<br><button class="chip" onclick="location.reload()">Try again</button></div>`; }
}
function addToCart(id){const p=products.find(x=>x.id===id);if(!p)return;const row=cart.find(x=>x.id===id);if(row)row.quantity=Math.min(20,row.quantity+1);else cart.push({id,quantity:1});saveCart();toast(`${p.name} added to your cart.`);}
function renderCart(){
 const count=cart.reduce((n,x)=>n+x.quantity,0), total=cart.reduce((sum,row)=>{const p=products.find(p=>p.id===row.id);return sum+(p?p.price*row.quantity:0)},0);
 $("#cartCount").textContent=count;$("#drawerCount").textContent=`(${count})`;$("#cartTotal").textContent=money(total);$("#checkoutTotal").textContent=money(total);
 $("#cartItems").innerHTML=cart.length?cart.map(row=>{const p=products.find(x=>x.id===row.id);if(!p)return "";return `<div class="cart-row"><img src="${escapeHtml(p.image)}" alt=""><div><h3>${escapeHtml(p.name)}</h3><span class="price">${money(p.price)}</span><div class="quantity"><button data-qty="${p.id}" data-delta="-1" aria-label="Decrease quantity">−</button><span>${row.quantity}</span><button data-qty="${p.id}" data-delta="1" aria-label="Increase quantity">+</button></div></div><button class="remove-item" data-remove="${p.id}">Remove</button></div>`}).join(""):'<div class="empty">Your cart is taking a little breather.<br>Add something that makes music.</div>';
}
function openCart(){ $("#overlay").classList.add("open");$("#cartDrawer").classList.add("open");document.body.style.overflow="hidden"; }
function closeCart(){ $("#overlay").classList.remove("open");$("#cartDrawer").classList.remove("open");document.body.style.overflow=""; }
function toast(message){const el=$("#status");el.textContent=message;setTimeout(()=>{if(el.textContent===message)el.textContent=""},2800);}
function openModal(id){$("#"+id).classList.add("open");document.body.style.overflow="hidden";}
function closeModal(id){$("#"+id).classList.remove("open");if(!$("#cartDrawer").classList.contains("open"))document.body.style.overflow="";}
$("#categories").addEventListener("click",e=>{const btn=e.target.closest("[data-category]");if(!btn)return;category=btn.dataset.category;$$("[data-category]").forEach(b=>b.classList.toggle("active",b===btn));renderProducts();});
$("#searchInput").addEventListener("input",e=>{query=e.target.value;renderProducts();});
$("#productGrid").addEventListener("click",e=>{const btn=e.target.closest("[data-add]");if(btn)addToCart(btn.dataset.add);});
$("#cartBtn").addEventListener("click",openCart);$("#closeCart").addEventListener("click",closeCart);$("#overlay").addEventListener("click",closeCart);
$("#cartItems").addEventListener("click",e=>{const qty=e.target.closest("[data-qty]"),remove=e.target.closest("[data-remove]");if(qty){const row=cart.find(x=>x.id===qty.dataset.qty);if(row){row.quantity+=Number(qty.dataset.delta);if(row.quantity<1)cart=cart.filter(x=>x.id!==row.id);if(row.quantity>20)row.quantity=20;saveCart();}}if(remove){cart=cart.filter(x=>x.id!==remove.dataset.remove);saveCart();}});
$("#checkoutBtn").addEventListener("click",()=>{if(!cart.length){toast("Your cart is empty.");return;}closeCart();$("#checkoutMessage").innerHTML="";$("#checkoutForm").hidden=false;openModal("checkoutModal");});
$("#checkoutForm").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector("button[type=submit]");button.disabled=true;button.textContent="Placing your order…";$("#checkoutMessage").innerHTML="";
try{const f=new FormData(form),customer={name:f.get("name"),email:f.get("email"),phone:f.get("phone"),address:f.get("address")};const result=await api("/orders",{method:"POST",body:JSON.stringify({customer,items:cart})});cart=[];saveCart();form.hidden=true;$("#checkoutMessage").innerHTML=`<div class="notice"><strong>You're all set!</strong><br>${escapeHtml(result.message)} Your order number is <b>${escapeHtml(result.order.id)}</b>. Total: ${money(result.order.total)}.${result.persistenceNotice?`<br><br>${escapeHtml(result.persistenceNotice)}`:""}</div>`;}
catch(err){$("#checkoutMessage").innerHTML=`<div class="notice error">${escapeHtml(err.message)}</div>`;}
finally{button.disabled=false;button.textContent="Place order ↗";}});
$$("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
$$(".modal-wrap").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCart();$$(".modal-wrap.open").forEach(m=>closeModal(m.id));}});
$("#accountBtn").addEventListener("click",()=>{ $("#authMessage").innerHTML="";openModal("accountModal"); });
$$("[data-auth]").forEach(b=>b.addEventListener("click",()=>{authMode=b.dataset.auth;$$("[data-auth]").forEach(x=>x.classList.toggle("active",x===b));$("#nameField").hidden=authMode!=="register";$("#nameField input").required=authMode==="register";$("#authSubmit").textContent=authMode==="register"?"Create account ↗":"Log in ↗";$("#authForm").reset();$("#authMessage").innerHTML="";}));
$("#authForm").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,button=$("#authSubmit"),f=new FormData(form);button.disabled=true;$("#authMessage").innerHTML="";
try{const result=await api(`/auth/${authMode}`,{method:"POST",body:JSON.stringify({name:f.get("name"),email:f.get("email"),password:f.get("password")})});token=result.token;localStorage.setItem("soundcart-token",token);$("#authMessage").innerHTML=`<div class="notice">Welcome${result.user.name?`, ${escapeHtml(result.user.name)}`:""}! You're signed in on this device.</div>`;setTimeout(()=>closeModal("accountModal"),1200);}
catch(err){$("#authMessage").innerHTML=`<div class="notice error">${escapeHtml(err.message)}</div>`;}finally{button.disabled=false;}});
$("#newsletterForm").addEventListener("submit",e=>{e.preventDefault();e.currentTarget.innerHTML='<p class="notice">You’re on the list. Keep making noise! ✳</p>';});
$("#menuBtn").addEventListener("click",()=>{const nav=$(".topbar nav");nav.style.display=nav.style.display==="flex"?"none":"flex";nav.style.position="absolute";nav.style.top="110px";nav.style.left="0";nav.style.right="0";nav.style.zIndex="8";nav.style.background="var(--paper)";nav.style.padding="22px";nav.style.flexDirection="column";nav.style.borderBottom="1px solid var(--line)";});
loadProducts().then(renderCart);