/* script.js */
// Dua URL Google Sheets CSV Baru Anda
const URL_PRODUK1 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAd4pEtxlxD_EaVYx4L_vhhz0U3WmPYNxOXENt1NiTEGRZjpoIECzIRQSQDYhmjGQQYGN6VaMUuQ-C/pub?gid=0&single=true&output=csv";
const URL_PRODUK2 = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRAd4pEtxlxD_EaVYx4L_vhhz0U3WmPYNxOXENt1NiTEGRZjpoIECzIRQSQDYhmjGQQYGN6VaMUuQ-C/pub?gid=971357804&single=true&output=csv";

const WA_NUMBER = "6288224166270";
let produk = [], order = {}, deferredPrompt, streamPointer = null;
let pesanPromoTerbaru = "Cek video panduan kami di YouTube!";

window.onload = () => { 
    load(); 
    if(!sessionStorage.getItem('promo_per_sesi')) {
        setTimeout(() => { document.getElementById('installModal').style.display = 'flex'; }, 2000);
    }
};

// Fungsi pembantu untuk mengubah text CSV dari Google Sheet menjadi Array Object / JSON
// Fungsi pembantu baru yang lebih akurat untuk membaca CSV Google Sheet
function parseCSV(text) {
    // Memisah baris dan membersihkan spasi/baris kosong
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line);
    if (lines.length === 0) return [];
    
    // Ambil header di baris pertama, bersihkan tanda kutip, ubah jadi huruf kecil semua
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    
    return lines.slice(1).map(line => {
        const obj = {};
        let currentIdx = 0;
        
        // Membaca baris kolom demi kolom dengan aman meskipun ada koma di dalam teks/link
        headers.forEach((header) => {
            let val = "";
            if (line.charAt(currentIdx) === '"') {
                // Jika data diawali tanda kutip (string aman), cari penutup kutip berikutnya
                let nextQuote = line.indexOf('"', currentIdx + 1);
                while (nextQuote !== -1 && line.charAt(nextQuote + 1) === '"') {
                    nextQuote = line.indexOf('"', nextQuote + 2);
                }
                if (nextQuote !== -1) {
                    val = line.substring(currentIdx + 1, nextQuote).replace(/""/g, '"');
                    currentIdx = nextQuote + 1;
                    if (line.charAt(currentIdx) === ',') currentIdx++;
                } else {
                    val = line.substring(currentIdx + 1);
                    currentIdx = line.length;
                }
            } else {
                // Jika data biasa tanpa kutip (seperti link gambar atau angka)
                let nextComma = line.indexOf(',', currentIdx);
                if (nextComma !== -1) {
                    val = line.substring(currentIdx, nextComma);
                    currentIdx = nextComma + 1;
                } else {
                    val = line.substring(currentIdx);
                    currentIdx = line.length;
                }
            }
            obj[header] = val.trim();
        });
        return obj;
    });
}
async function load() {
    try {
        // Mengambil data dari kedua sheet secara bersamaan
        const [res1, res2] = await Promise.all([
            fetch(URL_PRODUK1),
            fetch(URL_PRODUK2)
        ]);
        
        const text1 = await res1.text();
        const text2 = await res2.text();
        
        // Konversi hasil CSV ke objek JSON
        const produk1 = parseCSV(text1);
        const produk2 = parseCSV(text2);
        
        // Gabungkan produk dari sheet 1 dan sheet 2 ke dalam satu array global
        produk = [...produk1, ...produk2];
        
        prosesUpdateSistem(produk);
        render();
        autoFillForm();
    } catch (e) { 
        console.error(e);
        document.getElementById("list").innerHTML = "<p style='grid-column: span 2; text-align:center;'>Koneksi gagal.</p>"; 
    }
}

function prosesUpdateSistem(data) {
    const memori = JSON.parse(localStorage.getItem('duta_terang_state')) || { totalHarga: 0, infoTeks: "" };
    let currentTotal = 0, currentInfo = "";
    data.forEach(p => {
        currentTotal += Number(p.harga || 0);
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
        const hargaAsli = Number(p.harga) || 0;
        const hrgFix = hargaAsli - (hargaAsli * disc / 100);
        const isHabis = Number(p.stok) <= 0;

        html += `
<div class="card" data-category="${(p.kategori||'').toLowerCase()}">
    ${isHabis ? '<div class="status-habis">HABIS</div>' : ''}
    
    <!-- Tombol Share Pojok Kiri Atas -->
    <button class="btn-share-prod" onclick="shareProduk('${p.nama}', ${hrgFix})" title="Bagikan Produk" style="left: 10px; right: auto;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px; height:16px;">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
        </svg>
    </button>

    <!-- Label Diskon Pojok Kanan Atas -->
    ${disc > 0 && !isHabis ? `<div style="position:absolute; top:10px; right:10px; background:var(--pink); color:white; font-size:10px; font-weight:bold; padding:3px 8px; border-radius:5px; z-index:5; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid rgba(255,255,255,0.2);">-${disc}%</div>` : ''}
    
    <img src="${p.gambar || 'https://via.placeholder.com/150'}" onclick="openZoom('${p.gambar}')">
    
    <div class="product-name">${p.nama}</div>
    
    ${disc > 0 ? `<div style="text-decoration:line-through; color:#999; font-size:10px; margin-top:5px;">Rp ${hargaAsli.toLocaleString('id-ID')}</div>` : '<div style="height:15px;"></div>'}
    
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
    const urlToko = `https://vesatukio.github.io/jualled/?item=${encodeURIComponent(nama)}`;
    const hargaIDR = "Rp " + harga.toLocaleString('id-ID');

    const listPesan = [
        `Lampu mati jangan langsung dibuang! 💡 Ganti aja modulnya pakai *${nama}*. Cuma ${hargaIDR} di Duta Terang LED. Cek stoknya:`,
        `Solusi hemat servis lampu sendiri. Ready *${nama}* kualitas mantap harga teknisi (${hargaIDR}). Intip katalognya yuk:`,
        `Lagi cari sparepart LED atau audio? Di Duta Terang lagi ready *${nama}* nih. Harga cuma ${hargaIDR}. Cek detailnya di sini:`,
        `Benerin lampu jadi lebih murah daripada beli baru. Pakai *${nama}* ini beres! Harga cuma ${hargaIDR}:`
    ];

    const pesanRandom = listPesan[Math.floor(Math.random() * listPesan.length)];
    const textFinal = `${pesanRandom}\n\n👉 ${urlToko}`;

    if (navigator.share) {
        navigator.share({
            title: 'Duta Terang LED',
            text: textFinal,
        }).catch(err => console.log('Batal share'));
    } else {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(textFinal)}`;
        window.open(waUrl, '_blank');
    }
}
