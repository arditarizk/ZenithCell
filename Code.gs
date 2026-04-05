// ==========================================
// MASTER API ZENITH CELL (V36 - EMAIL NOTIFICATION SYSTEM)
// ==========================================

var MASTER_PIN = "Parawhore78"; 
var PIN_PELUNASAN = "121221"; 
var EMAIL_NOTIFIKASI = "znthcell@gmail.com"; // Email tujuan laporan

var ADMIN_USERS = {
    "ARDITA": { sandi: "123456", nama: "Ardita Rizki F." },
    "VIVI": { sandi: "654321", nama: "Vivi Nur D." },
    "ADMIN": { sandi: MASTER_PIN, nama: "Admin Pusat" }
};

var VOUCHERS_BACKEND = {
    "dulurdewe22": 22, "nawakewed": 20, "temanvivi": 20, "temanardita": 20
};

function isTokenValid(pinInput) {
    if (pinInput === MASTER_PIN) return true;
    for (var key in ADMIN_USERS) {
        if (ADMIN_USERS[key].sandi === pinInput) return true;
    }
    return false;
}

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { sheet = ss.insertSheet(sheetName); }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function cleanId(id) {
  return String(id).replace(/['" ]/g, '').trim().toUpperCase();
}

function sanitize(input) {
  if (!input) return "";
  return String(input).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function getServerTime(ss) {
    var tz = ss.getSpreadsheetTimeZone();
    return Utilities.formatDate(new Date(), tz, "dd/MM/yyyy, HH:mm:ss");
}

function formatIDR(angka) {
    return "Rp " + Number(angka).toLocaleString('id-ID');
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 
  } catch (err) {
    return createJsonResponse({status: "error", message: "Server sibuk. Coba 5 detik lagi."});
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var WAKTU_SAH = getServerTime(ss);

    if (payload.tipe === "PENGAJUAN_BARU") {
      var s = getOrCreateSheet(ss, "Pengajuan");
      if (s.getLastRow() === 0) {
        s.appendRow(["ID Kontrak", "Tanggal", "Nama Lengkap", "NIK", "No WA", "Alamat", "Pekerjaan", "Gaji", "Darurat Nama", "Darurat WA", "Barang", "Harga", "DP", "Tenor", "Jaminan", "Jatuh Tempo", "Margin", "Status"]);
        s.getRange("A1:R1").setFontWeight("bold").setBackground("#fef3c7");
      }
      var baseMargin = 25;
      if (payload.jaminan && payload.jaminan !== "Tanpa Jaminan") { baseMargin = 15; }
      var finalMargin = baseMargin;
      var kodeVoucher = String(payload.kodeVoucher || "").trim().toLowerCase();
      if (kodeVoucher !== "" && VOUCHERS_BACKEND[kodeVoucher]) {
          var vMargin = VOUCHERS_BACKEND[kodeVoucher];
          if (vMargin < finalMargin) { finalMargin = vMargin; }
      }
      var hargaBersih = parseInt(String(payload.harga).replace(/[^0-9]/g, '')) || 0;
      var dpBersih = parseInt(String(payload.dp).replace(/[^0-9]/g, '')) || 0;
      s.appendRow(["'" + cleanId(payload.idKontrak), WAKTU_SAH, sanitize(payload.nama), "'" + sanitize(payload.nik), "'" + sanitize(payload.wa), sanitize(payload.alamat), sanitize(payload.pekerjaan), sanitize(payload.gaji), sanitize(payload.daruratNama), "'" + sanitize(payload.daruratWa), sanitize(payload.barang), hargaBersih, dpBersih, parseInt(payload.tenor)||0, sanitize(payload.jaminan), parseInt(payload.jatuhTempo)||1, finalMargin, "PENDING"]);
      return createJsonResponse({status: "success"});
    }

    if (!isTokenValid(payload.pin)) {
      return createJsonResponse({status: "error", message: "Akses Ilegal!"});
    }

    if (payload.tipe === "KAS_MASUK_CICILAN") {
      var sL = ss.getSheetByName("Pelanggan");
      var dL = sL.getDataRange().getValues();
      var rowIndex = -1;
      for (var i = 1; i < dL.length; i++) {
        if (cleanId(dL[i][0]) === cleanId(payload.idKontrak)) { rowIndex = i + 1; break; }
      }
      if (rowIndex === -1) return createJsonResponse({status: "error", message: "Data tidak ditemukan."});
      if (parseInt(payload.cicilanKe) < parseInt(dL[rowIndex-2][8])) return createJsonResponse({status: "error", message: "Angsuran ini sudah dibayar!"});

      // Update Database
      sL.getRange(rowIndex, 6).setValue((parseInt(dL[rowIndex-2][5])||0) + parseInt(payload.nominalMasuk));
      sL.getRange(rowIndex, 9).setValue((parseInt(dL[rowIndex-2][8])||0) + 1);

      var sT = getOrCreateSheet(ss, "Transaksi");
      sT.appendRow(["'" + cleanId(payload.idTransaksi), WAKTU_SAH, "'" + cleanId(payload.idKontrak), payload.nama, "'"+payload.whatsapp, payload.cicilanKe, payload.nominalMasuk, payload.dendaMasuk || 0, payload.catatan]);

      // KIRIM EMAIL NOTIFIKASI ANGSURAN
      try {
          var sub = "💰 ANGSURAN MASUK: " + payload.nama;
          var msg = "Laporan Kas Masuk Zenith Cell\n\nNama: " + payload.nama + "\nAngsuran Ke: " + payload.cicilanKe + "\nNominal: " + formatIDR(payload.nominalMasuk) + "\nDenda: " + formatIDR(payload.dendaMasuk) + "\nWaktu: " + WAKTU_SAH + "\nCatatan: " + payload.catatan;
          MailApp.sendEmail(EMAIL_NOTIFIKASI, sub, msg);
      } catch(e) {}

      return createJsonResponse({status: "success"});
    }

    if (payload.tipe === "PELUNASAN_AWAL") {
      if (payload.pinLunas !== PIN_PELUNASAN) return createJsonResponse({status: "error", message: "PIN Salah!"});
      var sL = ss.getSheetByName("Pelanggan");
      var dL = sL.getDataRange().getValues();
      var rowIndex = -1; var targetData = null;
      for (var i = 1; i < dL.length; i++) {
        if (cleanId(dL[i][0]) === cleanId(payload.idKontrak)) { rowIndex = i + 1; targetData = dL[i]; break; }
      }
      if (rowIndex === -1) return createJsonResponse({status: "error", message: "Sudah dilunasi device lain."});

      // KIRIM EMAIL NOTIFIKASI PELUNASAN (Sebelum Hapus)
      try {
          var subL = "🎉 PELUNASAN FULL: " + payload.nama;
          var msgL = "ALHAMDULILLAH! Pelanggan telah melunasi seluruh tagihan.\n\nNama: " + payload.nama + "\nBarang: " + targetData[3] + "\nTotal Bayar: " + formatIDR(payload.nominalMasuk) + "\nWaktu: " + WAKTU_SAH + "\n\nPastikan saldo sudah masuk ke rekening.";
          MailApp.sendEmail(EMAIL_NOTIFIKASI, subL, msgL);
      } catch(e) {}

      var sR = getOrCreateSheet(ss, "Riwayat");
      sR.appendRow(["'" + cleanId(targetData[0]), targetData[1], "'" + targetData[2], targetData[3], targetData[4], WAKTU_SAH]);
      sL.deleteRow(rowIndex);

      var sT2 = getOrCreateSheet(ss, "Transaksi");
      sT2.appendRow(["'" + cleanId(payload.idTransaksi), WAKTU_SAH, "'" + cleanId(payload.idKontrak), payload.nama, "'"+payload.whatsapp, "LUNAS FULL", payload.nominalMasuk, payload.dendaMasuk || 0, payload.catatan]);

      return createJsonResponse({status: "success"});
    }
    
    // (Tambahkan logika ACC_PENGAJUAN, TOLAK_PENGAJUAN, dll seperti sebelumnya...)
    
    return createJsonResponse({status: "success"});
  } catch (err) { return createJsonResponse({status: "error", msg: err.toString()}); } finally { lock.releaseLock(); }
}

function doGet(e) {
  // (Tetap sama seperti versi V35)
  return createJsonResponse({status: "online"});
}
