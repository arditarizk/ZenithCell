const CONFIG = {
    // Link API Google Script (Baru - Super Stabil V18)
    API_URL: "https://script.google.com/macros/s/AKfycbx66f-04RTIUmdEPX-yrVLWD_fC3yf4JAMP5EnOQEz_OCKvjoskjin2O3f7fdH4-F-duQ/exec",
    
    // Nomor WA Admin Zenith Cell
    WA_ADMIN: "62895410571547",
    
    // --- PENGATURAN KEAMANAN & MULTI-ADMIN ---
    PIN_ADMIN: "zenith123", // Password master (Bisa untuk darurat)
    
    // Daftar ID Pengguna dan Sandi Kasir (Bisa ditambah/dihapus sesukamu)
    DAFTAR_ADMIN: {
        "ARDITA": { sandi: "123456", namaLengkap: "Ardita Rizki F." },
        "VIVI": { sandi: "654321", namaLengkap: "Vivi Nur D." },
        "ADMIN": { sandi: "zenith123", namaLengkap: "Admin Pusat" } // Akun cadangan
    },
    
    // --- SKEMA VOUCHER MARGIN ---
    MARGIN_DEFAULT: 25, 
    
    VOUCHERS: {
        "dulurdewe22": { margin: 22, pesan: "Kode valid! Margin layanan turun jadi 22% 🎉" },
        "nawakewed": { margin: 20, pesan: "Kode valid! Margin VVIP 20% 🎉" },
        "birthday": { margin: 23, pesan: "Happy Birthday, Ardita! Margin super ringan 23% 🎉" }
    },

    // --- PENGATURAN PENGUMUMAN BERJALAN (MARQUEE) ---
    PENGUMUMAN_AKTIF: true, // Ubah ke false jika ingin menyembunyikan pengumuman
    
    // TEKS PROMO & PENGUMUMAN (Gen-Z Syariah Edition)
    TEKS_PENGUMUMAN: "✨ Selamat Idul Fitri 1447 H! Promo VIP Margin 15% buat silaturahmi makin HD! 📱 HP baru Alhamdulillah, cicilan aman Astaghfirullah... tenang, di sini murni syariah tanpa denda! 💸 Skip riba, go syariah! Biar rezeki lancar dan FYP jalur langit. 🤲 Niatnya nabung buat nikah, malah checkout iPhone boba. Gak apa-apa, yang penting akadnya halal! 🚀 Minimal HP spek dewa, ibadah juga harus luar biasa. Yuk ajukan sekarang!"
};
