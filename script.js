/* script.js */
const API_URL = "https://script.google.com/macros/s/AKfycbyhgdk0elMuqM4-00OIR8zbUqp-k80RnbuYyPDDqGHsEk7aSCg60kgT5HTYL_hIVSDc/exec";
const WA_NUMBER = "6288224166270";
let produk = [], order = {}, deferredPrompt, streamPointer = null;
let pesanPromoTerbaru = "Cek video panduan kami di YouTube!";

window.onload = () => { 
    load(); 
    if(!sessionStorage.getItem('promo_per_sesi')) {
        setTimeout(() => { document.getElementById('installModal').style.display = 'flex'; }, 2000);
    }
};

async function load() {
    try {
        const res = await fetch(API_URL);
        produk = await res.json();
        prosesUpdateSistem(produk);
        render();
        autoFillForm();
    } catch (e) { 
        document.getElementById("list").innerHTML = "<p style='grid-column: span 2; text-align:center;'>Koneksi gagal.</p>"; 
    }
}

function prosesUpdateSistem(data) {
    const memori = JSON.parse(localStorage.getItem('duta_terang_state')) || { totalHarga: 0, infoTeks: "" };
    let currentTotal = 0, currentInfo = "";
    data.forEach(p => {
        currentTotal += Number(p.harga);
        if (p.info && !currentInfo) currentInfo = p.info;
    });
    if (currentInfo !== memori.infoTeks || currentTotal !== memori.totalHarga) {
        tampilkanBadge("!"); 
    }
    pesanPromoTerbaru = currentInfo || "Tonton panduan merakit LED agar awet!";
    localStorage.setItem('temp_state', JSON.stringify({ totalHarga: currentTotal, infoTeks: currentInfo }));
}

function tampilkanBadge(teks) {
    const b = document.getElementById('badge-promo');
    b.innerText = teks;
    b.style.display = 'block';
}

function bukaPromo() {
    alert("📢 INFO TERBARU:\n\n" + pesanPromoTerbaru);
    document.getElementById('badge-promo').style.display = 'none';
    const temp = localStorage.getItem('temp_state');
    if (temp) localStorage.setItem('duta_terang_state', temp);
    window.open("https://vesatukio.github.io/jualled/panduan", "_blank"); 
}

function render() {
    let html = "", kategori = new Set();
    produk.forEach(p => {
        if (!p.nama) return;
        kategori.add(p.kategori || "Lainnya");
        const disc = Number(p.diskon) || 0;
        const hrgFix = p.harga - (p.harga * disc / 100);
        const isHabis = p.stok <= 0;

        html += `
        <div class="card" data-category="${(p.kategori||'').toLowerCase()}">
            ${isHabis ? '<div class="status-habis">HABIS</div>' : ''}
            <button class="btn-share-prod" onclick="shareProduk('${p.nama}', ${hrgFix})">📲</button>
            ${disc > 0 && !isHabis ? `<div style="position:absolute; top:5px; right:5px; background:var(--pink); color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:5px; z-index:5;">-${disc}%</div>` : ''}
            <img src="${p.gambar || 'https://via.placeholder.com/150'}" onclick="openZoom('${p.gambar}')">
            <div class="product-name">${p.nama}</div>
            ${disc > 0 ? `<div style="text-decoration:line-through; color:var(--blue-old); font-size:10px;">Rp ${Number(p.harga).toLocaleString('id-ID')}</div>` : '<div style="height:12px;"></div>'}
            <div class="price-new">Rp ${hrgFix.toLocaleString('id-ID')}</div>
            <div class="qty-wrapper">
                <button onclick="changeQty('${p.id}', -1, ${hrgFix}, '${p.nama}')" ${isHabis?'disabled':''}>-</button>
                <span id="qty-${p.id}">0</span>
                <button onclick="changeQty('${p.id}', 1, ${hrgFix}, '${p.nama}')" ${isHabis?'disabled':''}>+</button>
            </div>
        </div>`;
    });
    document.getElementById("list").innerHTML = html;
    
    let catHtml = '<button onclick="filter(\'all\', this)" style="background:var(--primary); color:white;">Semua</button>';
    kategori.forEach(k => { catHtml += `<button onclick="filter('${k.toLowerCase()}', this)">${k}</button>`; });
    document.getElementById("cat-bar").innerHTML = catHtml;
}

function changeQty(id, delta, price, name) {
    if (!order[id]) order[id] = { qty: 0, name, price };
    order[id].qty += delta;
    if (order[id].qty <= 0) delete order[id];
    const el = document.getElementById(`qty-${id}`);
    if(el) el.innerText = order[id] ? order[id].qty : 0;
    updateCart();
}

function updateCart() {
    let total = 0, renderText = "";
    for (let id in order) {
        total += (order[id].qty * order[id].price);
        renderText += `• ${order[id].name} (${order[id].qty})\n`;
    }
    document.getElementById("total").innerText = "Rp " + total.toLocaleString('id-ID');
    document.getElementById("cart-list-render").innerText = renderText; 
    document.getElementById("cart").classList.toggle("hide", total === 0);
}

function prosesPemesanan() {
    const n = document.getElementById("f_nama").value, a = document.getElementById("f_alamat").value, b = document.getElementById("f_bayar").value;
    if(!n || !a) return alert("Lengkapi Nama & Alamat!");
    let m = `*PESANAN DUTA TERANG LED*\n--------------------------\n`;
    for (let id in order) m += `• ${order[id].name} (x${order[id].qty})\n`;
    m += `--------------------------\n*Total: ${document.getElementById("total").innerText}*\n\n👤 Nama: ${n}\n📍 Alamat: ${a}\n💳 Bayar: ${b}`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(m)}`);
}

async function startScanner() {
    const modal = document.getElementById('camera-modal'), v = document.getElementById('video-preview');
    try {
        modal.style.display = 'block';
        streamPointer = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        v.srcObject = streamPointer;
    } catch (e) { alert("Izin kamera ditolak."); modal.style.display = 'none'; }
}

function stopScanner() {
    if (streamPointer) streamPointer.getTracks().forEach(t => t.stop());
    document.getElementById('camera-modal').style.display = 'none';
}

function filter(cat, btn) {
    document.querySelectorAll(".card").forEach(c => {
        const pCat = (c.getAttribute('data-category') || '').toLowerCase();
        c.style.display = (cat === 'all' || pCat === cat) ? 'flex' : 'none';
    });
    document.querySelectorAll("#cat-bar button").forEach(b => { b.style.background = '#fff'; b.style.color = '#666'; });
    btn.style.background = 'var(--primary)'; btn.style.color = '#fff';
}

function openZoom(url) { 
    if(!url || url.includes('placeholder')) return;
    document.getElementById("imgZoom").src = url; 
    document.getElementById("zoomModal").style.display = 'flex'; 
}

function autoFillForm() {
    ['f_nama', 'f_alamat'].forEach(id => {
        const s = localStorage.getItem(id);
        if (s) document.getElementById(id).value = s;
        document.getElementById(id).addEventListener('input', e => localStorage.setItem(id, e.target.value));
    });
}

function resetCart() { if(confirm("Reset keranjang?")) { order = {}; updateCart(); document.querySelectorAll("[id^='qty-']").forEach(e => e.innerText = "0"); } }
function hapusIdentitas() { if(confirm("Hapus data diri?")) { localStorage.clear(); location.reload(); } }
function closeModal() { document.getElementById('installModal').style.display = 'none'; sessionStorage.setItem('promo_per_sesi', 'true'); }

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    document.getElementById('btn-install-float').style.display = 'flex';
});

async function actionInstall() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt = null;
        closeModal();
    } else { alert('Gunakan menu browser untuk install.'); closeModal(); }
}

function shareProduk(nama, harga) {
    const urlToko = "https://vesatukio.github.io/jualled/";
    const hargaIDR = "Rp " + harga.toLocaleString('id-ID');

    // Koleksi kalimat Soft-Selling
    const listPesan = [
        `Lampu mati jangan langsung dibuang! 💡 Ganti aja modulnya pakai *${nama}*. Cuma ${hargaIDR} di Duta Terang LED. Cek stoknya:`,
        `Solusi hemat servis lampu sendiri. Ready *${nama}* kualitas mantap harga teknisi (${hargaIDR}). Intip katalognya yuk:`,
        `Lagi cari sparepart LED atau audio? Di Duta Terang lagi ready *${nama}* nih. Harga cuma ${hargaIDR}. Cek detailnya di sini:`,
        `Benerin lampu jadi lebih murah daripada beli baru. Pakai *${nama}* ini beres! Harga cuma ${hargaIDR}:`
    ];

    // Pilih pesan secara acak
    const pesanRandom = listPesan[Math.floor(Math.random() * listPesan.length)];
    const textFinal = `${pesanRandom}\n\n👉 ${urlToko}`;

    // Jalankan fitur Share
    if (navigator.share) {
        navigator.share({
            title: 'Duta Terang LED',
            text: textFinal,
        }).catch(err => console.log('Batal share'));
    } else {
        // Jika buka di Laptop (Fallback ke WhatsApp)
        const waUrl = `https://wa.me/?text=${encodeURIComponent(textFinal)}`;
        window.open(waUrl, '_blank');
    }
}
