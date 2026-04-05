// ==========================================
// MASTER API ZENITH CELL (V35 - FIX LOGIC ROW & PRECISION HISTORY)
// ==========================================

var MASTER_PIN = "Parawhore78"; 
var PIN_PELUNASAN = "121221"; 
var EMAIL_NOTIFIKASI = "znthcell@gmail.com"; 

var ADMIN_USERS = {
    "ARDITA": { sandi: "123456", nama: "Ardita Rizki F." },
    "VIVI": { sandi: "654321", nama: "Vivi Nur D." },
    "ADMIN": { sandi: MASTER_PIN, nama: "Admin Pusat" }
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

function getServerTime(ss) {
    var tz = ss.getSpreadsheetTimeZone();
    return Utilities.formatDate(new Date(), tz, "dd/MM/yyyy, HH:mm:ss");
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // Tunggu antrean maksimal 15 detik
  } catch (e) {
    return createJsonResponse({status: "error", message: "Server sibuk, coba sesaat lagi."});
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var WAKTU_SAH = getServerTime(ss);

    // VALIDASI TOKEN
    if (payload.tipe !== "PENGAJUAN_BARU" && !isTokenValid(payload.pin)) {
      return createJsonResponse({status: "error", message: "Akses Ilegal!"});
    }

    // --- LOGIKA KAS MASUK CICILAN ---
    if (payload.tipe === "KAS_MASUK_CICILAN") {
      var sL = ss.getSheetByName("Pelanggan");
      var dataPel = sL.getDataRange().getValues();
      var foundIndex = -1;

      for (var i = 1; i < dataPel.length; i++) {
        if (cleanId(dataPel[i][0]) === cleanId(payload.idKontrak)) {
          foundIndex = i + 1;
          // FIX BUG 1: Cek apakah cicilan yang mau dibayar sekarang (payload) 
          // sudah pernah tercatat di sistem (dataPel[i][8] adalah CicilanKe di DB)
          if (parseInt(payload.cicilanKe) < parseInt(dataPel[i][8])) {
             lock.releaseLock();
             return createJsonResponse({status: "error", message: "Angsuran Ke-" + payload.cicilanKe + " sudah lunas sebelumnya!"});
          }
          break;
        }
      }

      if (foundIndex === -1) {
        lock.releaseLock();
        return createJsonResponse({status: "error", message: "Data pelanggan tidak ditemukan / sudah lunas."});
      }

      // Update data di sheet Pelanggan
      var sisaTerbayarLama = parseInt(dataPel[foundIndex-1][5]) || 0;
      var cicilanKeLama = parseInt(dataPel[foundIndex-1][8]) || 1;
      
      sL.getRange(foundIndex, 6).setValue(sisaTerbayarLama + parseInt(payload.nominalMasuk));
      sL.getRange(foundIndex, 9).setValue(cicilanKeLama + 1);
      
      // Update bulan terakhir bayar
      var cTarget = String(dataPel[foundIndex-1][9]);
      var tThn = parseInt(Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy"));
      var tBln;
      if (cTarget.indexOf("-") > -1) { 
        var parts = cTarget.split("-"); tThn = parseInt(parts[0]); tBln = parseInt(parts[1]) + 1; 
      } else { tBln = parseInt(Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "MM")) + 2; }
      if (tBln > 12) { tBln -= 12; tThn++; }
      sL.getRange(foundIndex, 10).setValue("'" + tThn + "-" + String(tBln).padStart(2, '0'));

      // Tulis ke Transaksi
      var sT = getOrCreateSheet(ss, "Transaksi");
      if (sT.getLastRow() === 0) { sT.appendRow(["ID Transaksi", "Waktu", "ID Kontrak", "Nama", "WA", "Pembayaran Ke", "Angsuran Pokok", "Denda", "Catatan"]); }
      sT.appendRow(["'" + cleanId(payload.idTransaksi), WAKTU_SAH, "'" + cleanId(payload.idKontrak), payload.nama, "'"+payload.whatsapp, payload.cicilanKe, payload.nominalMasuk, payload.dendaMasuk || 0, payload.catatan]);

      lock.releaseLock();
      return createJsonResponse({status: "success"});
    }

    // --- LOGIKA PELUNASAN AWAL ---
    if (payload.tipe === "PELUNASAN_AWAL") {
      if (payload.pinLunas !== PIN_PELUNASAN) return createJsonResponse({status: "error", message: "PIN Salah!"});

      var sL = ss.getSheetByName("Pelanggan");
      var sR = getOrCreateSheet(ss, "Riwayat");
      var dataPel = sL.getDataRange().getValues();
      var targetRowData = null;
      var rowIndex = -1;

      for (var j = 1; j < dataPel.length; j++) {
        if (cleanId(dataPel[j][0]) === cleanId(payload.idKontrak)) {
          targetRowData = dataPel[j];
          rowIndex = j + 1;
          break;
        }
      }

      if (rowIndex === -1) {
        lock.releaseLock();
        return createJsonResponse({status: "error", message: "Tagihan sudah lunas di perangkat lain!"});
      }

      // FIX BUG 2: Gunakan data dari targetRowData yang sudah pasti benar ID-nya
      if (sR.getLastRow() === 0) { sR.appendRow(["ID Kontrak", "Nama Pelanggan", "No WA", "Barang", "Total Hutang Awal", "Tanggal Lunas"]); }
      sR.appendRow(["'" + cleanId(targetRowData[0]), targetRowData[1], "'" + targetRowData[2], targetRowData[3], targetRowData[4], WAKTU_SAH]);
      
      // Hapus dari daftar aktif
      sL.deleteRow(rowIndex);

      // Catat transaksi
      var sT = getOrCreateSheet(ss, "Transaksi");
      sT.appendRow(["'" + cleanId(payload.idTransaksi), WAKTU_SAH, "'" + cleanId(payload.idKontrak), payload.nama, "'"+payload.whatsapp, "LUNAS FULL", payload.nominalMasuk, payload.dendaMasuk || 0, payload.catatan]);

      // Kirim Email
      try { MailApp.sendEmail(EMAIL_NOTIFIKASI, "✅ LUNAS: " + payload.nama, "Nama: " + payload.nama + "\nNominal: Rp " + payload.nominalMasuk + "\nWaktu: " + WAKTU_SAH); } catch(e) {}

      lock.releaseLock();
      return createJsonResponse({status: "success"});
    }

    // (Logika tipe lain tetap sama...)
    // Jangan lupa tambahkan lock.releaseLock() di setiap akhir tipe atau pakai try-finally
    
  } catch (e) {
    if (lock.hasLock()) lock.releaseLock();
    return createJsonResponse({status: "error", message: e.toString()});
  }
}
