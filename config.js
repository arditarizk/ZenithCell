const CONFIG = {
    // Link API Google Script (Aman, tidak kita ubah)
    API_URL: "https://script.google.com/macros/s/AKfycby5GT9xEeakKec5qTSyn4y2ca1Iu5FEa6V5TkGcqz3aGBI4S-5nDC45cAj7BOJ_NNon8A/exec",
    
    // Nomor WA Admin Zenith Cell
    WA_ADMIN: "62895410571547",
    
    // --- SKEMA VOUCHER MARGIN (BISA DIUPDATE KAPAN SAJA) ---
    MARGIN_DEFAULT: 25, // Margin standar jika tidak pakai promo (25%)
    
    VOUCHERS: {
        "dulurdewe22": { margin: 22, pesan: "Kode valid! Margin layanan turun jadi 22% 🎉" },
        "nawakewed": { margin: 20, pesan: "Kode valid! Margin VVIP 20% 🔥" },
        "flashsale": { margin: 23, pesan: "Flash Sale Spesial! Margin super ringan 23% 🚀" }
    }
};
