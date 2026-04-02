const CONFIG = {
    // Link API Google Script (Versi Stabil V18)
    API_URL: "https://script.google.com/macros/s/AKfycbx66f-04RTIUmdEPX-yrVLWD_fC3yf4JAMP5EnOQEz_OCKvjoskjin2O3f7fdH4-F-duQ/exec",
    
    // Nomor WA Admin Zenith Cell
    WA_ADMIN: "62895410571547",
    
    // --- PENGATURAN KEAMANAN & MULTI-ADMIN ---
    PIN_ADMIN: "zenith123", 
    DAFTAR_ADMIN: {
        "ARDITA": { sandi: "123456", namaLengkap: "Ardita Rizki F." },
        "VIVI": { sandi: "654321", namaLengkap: "Vivi Nur D." },
        "ADMIN": { sandi: "zenith123", namaLengkap: "Admin Pusat" } 
    },
    
    // --- SKEMA VOUCHER MARGIN ---
    MARGIN_DEFAULT: 25, 
    
    VOUCHERS: {
        "dulurdewe22": { margin: 22, pesan: "Kode valid! Margin layanan turun jadi 22% 🎉" },
        "nawakewed": { margin: 20, pesan: "Kode valid! Margin VVIP 20% 🎉" },
        
        // 🚀 FITUR MEMBER GET MEMBER (REFERRAL)
        "TEMANVIVI": { margin: 20, pesan: "Voucher Teman Vivi Aktif! Margin VVIP 20% + Vivi dapat Cashback! 🎁" },
        "TEMANARDITA": { margin: 20, pesan: "Voucher Teman Ardita Aktif! Margin VVIP 20% + Cashback 50Rb! 🎁" }
    },

    // --- PENGATURAN PENGUMUMAN BERJALAN (MARQUEE) ---
    PENGUMUMAN_AKTIF: true, 
    
    // TEKS PROMO (Gen-Z Syariah Edition)
    TEKS_PENGUMUMAN: "✨ Cari HP impian tapi gak ada di brosur? Pake JASTIP ZENITH aja, kami carikan & hitung cicilannya! 📱 Ajak teman kredit di Zenith pakai kodemu, dapatkan CASHBACK 50 Ribu tanpa diundi! 💸 Skip riba, go syariah! Biar rezeki lancar dan FYP jalur langit. 🤲"
};
