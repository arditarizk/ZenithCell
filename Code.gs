// ==========================================
// MASTER API ZENITH CELL (V39 - FIX EMAIL & AUTO REFRESH)
// ==========================================

var MASTER_PIN = "Parawhore78"; 
var PIN_PELUNASAN = "121221"; 
var EMAIL_NOTIFIKASI = "znthcell@gmail.com"; 

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
    for (var key in ADMIN_USERS) { if (ADMIN_USERS[key].sandi === pinInput) return true; }
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

function cleanId(id) { return String(id).replace(/['" ]/g, '').trim().toUpperCase(); }

function sanitize(input) {
  if (!input) return "";
  return String(input).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

function getServerTime(ss) {
    var tz = ss.getSpreadsheetTimeZone();
    return Utilities.formatDate(new Date(), tz, "dd/MM/yyyy, HH:mm:ss");
}

function formatIDR(angka) { return "Rp " + Number(angka).toLocaleString('id-ID'); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (err) { return createJsonResponse({status: "error", message: "Sistem sibuk. Coba 5 detik lagi."}); }

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
      var baseMargin = 25; if (payload.jaminan && payload.jaminan !== "Tanpa Jaminan") { baseMargin = 15; }
      var finalMargin = baseMargin; var kodeVoucher = String(payload.kodeVoucher || "").trim().toLowerCase();
      if (kodeVoucher !== "" && VOUCHERS_BACKEND[kodeVoucher]) { var vMargin = VOUCHERS_BACKEND[kodeVoucher]; if (vMargin < finalMargin) { finalMargin = vMargin; } }
      var hargaBersih = parseInt(String(payload.harga).replace(/[^0-9]/g, '')) || 0; var dpBersih = parseInt(String(payload.dp).replace(/[^0-9]/g, '')) || 0;
      s.appendRow(["'" + cleanId(payload.idKontrak), WAKTU_SAH, sanitize(payload.nama), "'" + sanitize(payload.nik), "'" + sanitize(payload.wa), sanitize(payload.alamat), sanitize(payload.pekerjaan), sanitize(payload.gaji), sanitize(payload.daruratNama), "'" + sanitize(payload.daruratWa), sanitize(payload.barang), hargaBersih, dpBersih, parseInt(payload.tenor)||0, sanitize(payload.jaminan), parseInt(payload.jatuhTempo)||1, finalMargin, "PENDING"]);
      return createJsonResponse({status: "success"});
    }

    if (!isTokenValid(payload.pin)) return createJsonResponse({status: "error", message: "Akses Ilegal Ditolak!"});

    if (payload.tipe === "SIMPAN_DRAFT_CONFIG") {
      var sC = getOrCreateSheet(ss, "DraftConfig");
      if (sC.getLastRow() === 0) { sC.appendRow(["Nama Toko", "Logo URL", "Teks Pengumuman", "API URL", "WA Admin"]); sC.getRange("A1:E1").setFontWeight("bold").setBackground("#fef3c7"); sC.appendRow([payload.nama, payload.logo, payload.teks, payload.api, payload.wa]); } 
      else { sC.getRange("A2:E2").setValues([[payload.nama, payload.logo, payload.teks, payload.api, payload.wa]]); }
      return createJsonResponse({status: "success"});
    }

    if (payload.tipe === "ACC_PENGAJUAN") {
      var sP = ss.getSheetByName("Pengajuan"); var sL = getOrCreateSheet(ss, "Pelanggan"); var isPending = false; var rowIndexP = -1;
      if (sP) { var dP = sP.getDataRange().getValues(); for (var i = 1; i < dP.length; i++) { if (cleanId(dP[i][0]) === cleanId(payload.idKontrak) && String(dP[i][17]).toUpperCase() === "PENDING") { isPending = true; rowIndexP = i + 1; break; } } }
      if (!isPending) return createJsonResponse({status: "error", message: "Ditolak: Sudah diproses di perangkat lain."});
      sP.getRange(rowIndexP, 18).setValue("ACC");
      if (sL.getLastRow() === 0) { sL.appendRow(["ID Kontrak", "Nama Pelanggan", "No WA", "Barang", "Total Hutang", "Sudah Terbayar", "Cicilan Per Bulan", "Tgl Jatuh Tempo", "Cicilan Ke", "Bulan Terakhir Bayar"]); sL.getRange("A1:J1").setFontWeight("bold").setBackground("#e0e7ff"); }
      var tz = ss.getSpreadsheetTimeZone(); var targetBulan = parseInt(Utilities.formatDate(new Date(), tz, "MM")) + 1; var targetTahun = parseInt(Utilities.formatDate(new Date(), tz, "yyyy"));
      if (targetBulan > 12) { targetBulan -= 12; targetTahun++; }
      sL.appendRow(["'" + cleanId(payload.idKontrak), payload.nama, "'" + payload.wa, payload.barang, payload.totalHutang, 0, payload.cicilanBulan, payload.jatuhTempo, 1, "'" + targetTahun + "-" + String(targetBulan).padStart(2, '0')]);
      return createJsonResponse({status: "success"});
    }

    if (payload.tipe === "TOLAK_PENGAJUAN") {
      var sP = ss.getSheetByName("Pengajuan"); var isPending = false; var rowIndexP = -1;
      if (sP) { var dP = sP.getDataRange().getValues(); for (var i = 1; i < dP.length; i++) { if (cleanId(dP[i][0]) === cleanId(payload.idKontrak) && String(dP[i][17]).toUpperCase() === "PENDING") { isPending = true; rowIndexP = i + 1; break; } } }
      if (!isPending) return createJsonResponse({status: "error", message: "Ditolak: Sudah diproses di perangkat lain."});
      sP.getRange(rowIndexP, 18).setValue("DITOLAK"); return createJsonResponse({status: "success"});
    }

    if (payload.tipe === "KAS_MASUK_CICILAN") {
      var sL = ss.getSheetByName("Pelanggan"); if (!sL) return createJsonResponse({status: "error", message: "DB Error"});
      var dL = sL.getDataRange().getValues(); var isFound = false; var rowIndex = -1; var targetRowData = null;
      for (var i = 1; i < dL.length; i++) { if (cleanId(dL[i][0]) === cleanId(payload.idKontrak)) { isFound = true; rowIndex = i + 1; targetRowData = dL[i]; break; } }
      
      if (!isFound) return createJsonResponse({status: "error", message: "Transaksi Ditolak: Tagihan ini SUDAH LUNAS di perangkat lain!"});
      var cicilanDatabaseTerakhir = parseInt(targetRowData[8]) || 1;
      if (parseInt(payload.cicilanKe) < cicilanDatabaseTerakhir) return createJsonResponse({status: "error", message: "Ditolak: Angsuran Ke-" + payload.cicilanKe + " sudah dibayar!"});

      var sT = getOrCreateSheet(ss, "Transaksi");
      if (sT.getLastRow() === 0) { sT.appendRow(["ID Transaksi", "Waktu", "ID Kontrak", "Nama", "WA", "Pembayaran Ke", "Angsuran Pokok", "Dana Kebajikan (Denda)", "Catatan"]); sT.getRange("A1:I1").setFontWeight("bold").setBackground("#f3e8ff"); }
      sT.appendRow(["'" + cleanId(payload.idTransaksi), WAKTU_SAH, "'" + cleanId(payload.idKontrak), payload.nama, "'"+payload.whatsapp, payload.cicilanKe, payload.nominalMasuk, payload.dendaMasuk || 0, payload.catatan]);
      
      var sisaTerbayarLama = parseInt(targetRowData[5]) || 0;
      sL.getRange(rowIndex, 6).setValue(sisaTerbayarLama + parseInt(payload.nominalMasuk));
      sL.getRange(rowIndex, 9).setValue(cicilanDatabaseTerakhir + 1);
      
      var cTarget = String(targetRowData[9]); var tz = ss.getSpreadsheetTimeZone(); var tThn = parseInt(Utilities.formatDate(new Date(), tz, "yyyy")); var tBln;
      if (cTarget.indexOf("-") > -1) { var p = cTarget.split("-"); tThn = parseInt(p[0]); tBln = parseInt(p[1]) + 1; } else { tBln = parseInt(Utilities.formatDate(new Date(), tz, "MM")) + 2; }
      if (tBln > 12) { tBln -= 12; tThn++; }
      sL.getRange(rowIndex, 10).setValue("'" + tThn + "-" + String(tBln).padStart(2, '0')); 
      
      try {
          MailApp.sendEmail({
            to: EMAIL_NOTIFIKASI,
            subject: "💰 ANGSURAN MASUK: " + payload.nama,
            body: "Laporan Kas Masuk Zenith Cell\n\nNama: " + payload.nama + "\nAngsuran Ke: " + payload.cicilanKe + "\nNominal: " + formatIDR(payload.nominalMasuk) + "\nDenda: " + formatIDR(payload.dendaMasuk) + "\nWaktu: " + WAKTU_SAH + "\nCatatan: " + payload.catatan
          });
      } catch(e) {}
      return createJsonResponse({status: "success"});
    }

    if (payload.tipe === "PELUNASAN_AWAL") {
      if (payload.pinLunas !== PIN_PELUNASAN) return createJsonResponse({status: "error", message: "Otorisasi Pelunasan Gagal! PIN Master Salah."});
      var sL = ss.getSheetByName("Pelanggan"); if (!sL) return createJsonResponse({status: "error", message: "DB Error"});
      var dL = sL.getDataRange().getValues(); var isFound = false; var rowIndex = -1; var targetRowData = null; 
      for (var i = 1; i < dL.length; i++) { if (cleanId(dL[i][0]) === cleanId(payload.idKontrak)) { isFound = true; rowIndex = i + 1; targetRowData = dL[i]; break; } }
      if (!isFound) return createJsonResponse({status: "error", message: "Transaksi Ditolak: Tagihan ini SUDAH DILUNASI di perangkat lain!"});

      var sT = getOrCreateSheet(ss, "Transaksi"); var sR = getOrCreateSheet(ss, "Riwayat");
      if (sT.getLastRow() === 0) { sT.appendRow(["ID Transaksi", "Waktu", "ID Kontrak", "Nama", "WA", "Pembayaran Ke", "Angsuran Pokok", "Dana Kebajikan (Denda)", "Catatan"]); sT.getRange("A1:I1").setFontWeight("bold").setBackground("#f3e8ff"); }
      sT.appendRow(["'" + cleanId(payload.idTransaksi), WAKTU_SAH, "'" + cleanId(payload.idKontrak), payload.nama, "'"+payload.whatsapp, "LUNAS FULL", payload.nominalMasuk, payload.dendaMasuk || 0, payload.catatan]);
      if (sR.getLastRow() === 0) { sR.appendRow(["ID Kontrak", "Nama Pelanggan", "No WA", "Barang", "Total Hutang Awal", "Tanggal Lunas"]); sR.getRange("A1:F1").setFontWeight("bold").setBackground("#dcfce7"); }
      
      sR.appendRow(["'" + cleanId(targetRowData[0]), targetRowData[1], "'" + targetRowData[2], targetRowData[3], targetRowData[4], WAKTU_SAH]);
      sL.deleteRow(rowIndex);

      try {
          MailApp.sendEmail({
            to: EMAIL_NOTIFIKASI,
            subject: "✅ VALIDASI PELUNASAN: " + payload.nama,
            body: "Sistem Zenith Cell mencatat transaksi PELUNASAN FULL sah.\n\nNama: " + payload.nama + "\nNominal: " + formatIDR(payload.nominalMasuk) + "\nWaktu: " + WAKTU_SAH + "\n\nHarap pastikan dana telah masuk mutasi rekening."
          });
      } catch(e) {}
      return createJsonResponse({status: "success"});
    }

    if (payload.tipe === "TABAYYUN_UPDATE") {
      var sL = ss.getSheetByName("Pelanggan");
      if (sL) {
        var dL = sL.getDataRange().getValues();
        for (var i = 1; i < dL.length; i++) {
          if (cleanId(dL[i][0]) === cleanId(payload.idKontrak)) {
            if (payload.jatuhTempoBaru) sL.getRange(i+1, 8).setValue(payload.jatuhTempoBaru);
            if (payload.cicilanBaru) sL.getRange(i+1, 7).setValue(payload.cicilanBaru);
            var sT = getOrCreateSheet(ss, "Transaksi"); var dNowTby = new Date(); var tzTby = ss.getSpreadsheetTimeZone();
            var idTransTby = "TBY" + Utilities.formatDate(dNowTby, tzTby, "yyMMddHHmmss");
            sT.appendRow(["'" + idTransTby, WAKTU_SAH, "'" + cleanId(payload.idKontrak), payload.nama, "'" + payload.wa, "TABAYYUN", 0, 0, "Tempo Baru: Tgl " + payload.jatuhTempoBaru + " | Angsuran: Rp " + payload.cicilanBaru]);
            return createJsonResponse({status: "success"});
          }
        }
      }
      return createJsonResponse({status: "error", message: "Data tidak ditemukan"});
    }

    return createJsonResponse({status: "error", message: "Tipe POST tidak valid"});
  } catch (err) { return createJsonResponse({status: "error", msg: "Server Error: " + err.toString()}); } finally { lock.releaseLock(); }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e.parameter.action;
    if (action === "ping") return createJsonResponse({status: "online"});
    if (action === "login") {
        var reqUser = String(e.parameter.user).trim().toUpperCase(); var reqPass = String(e.parameter.pass);
        if ((ADMIN_USERS[reqUser] && ADMIN_USERS[reqUser].sandi === reqPass) || reqPass === MASTER_PIN) {
            var namaKasir = ADMIN_USERS[reqUser] ? ADMIN_USERS[reqUser].nama : "Admin Pusat"; return createJsonResponse({status: "success", nama: namaKasir});
        }
        return createJsonResponse({status: "error", message: "ID atau Sandi tidak valid!"});
    }

    var tz = ss.getSpreadsheetTimeZone(); var dNow = new Date(); var tglSekarang = parseInt(Utilities.formatDate(dNow, tz, "dd"));
    var blnSekarang = parseInt(Utilities.formatDate(dNow, tz, "MM")); var thnSekarang = parseInt(Utilities.formatDate(dNow, tz, "yyyy"));

    function hitungStatusJatuhTempo(jatuhTempoDB, cTargetStr) {
        var targetBln, targetThn = thnSekarang;
        if (cTargetStr && cTargetStr.indexOf("-") > -1) { var p = cTargetStr.split("-"); targetThn = parseInt(p[0]); targetBln = parseInt(p[1]); } 
        else { var oldBln = parseInt(cTargetStr) || 0; if (oldBln !== 0) { targetBln = oldBln + 1; } else { targetBln = blnSekarang + 1; } if (targetBln > 12) { targetBln -= 12; targetThn++; } }
        var dateHariIni = new Date(thnSekarang, blnSekarang - 1, tglSekarang); var dateJatuhTempo = new Date(targetThn, targetBln - 1, jatuhTempoDB);
        var selisihHari = Math.floor((dateHariIni.getTime() - dateJatuhTempo.getTime()) / (1000 * 3600 * 24)); var statusSkor = "LANCAR";
        if (selisihHari > 0) { statusSkor = "TELAT " + selisihHari + " HARI"; } return { targetBln: targetBln, targetThn: targetThn, selisihHari: selisihHari, statusSkor: statusSkor };
    }

    if (e.parameter.wa) {
      var sw = e.parameter.wa.replace(/[^0-9]/g, '');
      var sL = ss.getSheetByName("Pelanggan"); var sR = ss.getSheetByName("Riwayat"); var sP = ss.getSheetByName("Pengajuan");
      var activeLoans = []; var historyLoans = []; var pendingLoans = []; var namaPelanggan = "";
      
      if (sL && sL.getLastRow() >= 2) {
        var dL = sL.getDataRange().getValues();
        for (var i = 1; i < dL.length; i++) {
          if (String(dL[i][2]).replace(/[^0-9]/g, '') === sw) {
            namaPelanggan = dL[i][1]; var kalkulasi = hitungStatusJatuhTempo(parseInt(dL[i][7])||1, String(dL[i][9]));
            activeLoans.push({ idKontrak: cleanId(dL[i][0]), barang: dL[i][3], totalHutang: parseInt(dL[i][4])||0, terbayar: parseInt(dL[i][5])||0, cicilanPerBulan: parseInt(dL[i][6])||0, jatuhTempo: parseInt(dL[i][7])||1, cicilanKe: parseInt(dL[i][8])||1, statusPembayaran: kalkulasi.statusSkor, selisihHari: kalkulasi.selisihHari, targetBulan: kalkulasi.targetBln, targetTahun: kalkulasi.targetThn });
          }
        }
      }
      if (sR && sR.getLastRow() >= 2) {
        var dR = sR.getDataRange().getValues();
        for (var k = 1; k < dR.length; k++) {
          if (String(dR[k][2]).replace(/[^0-9]/g, '') === sw) { if(!namaPelanggan) namaPelanggan = dR[k][1]; historyLoans.push({ idKontrak: cleanId(dR[k][0]), barang: dR[k][3], tanggalLunas: dR[k][5] || "Telah Lunas" }); }
        }
      }
      if (sP && sP.getLastRow() >= 2) {
          var dP = sP.getDataRange().getValues();
          for (var j = 1; j < dP.length; j++) {
            var statusP = (dP[j][17] || "").toString().toUpperCase();
            if (String(dP[j][4]).replace(/[^0-9]/g, '') === sw && statusP !== "DITOLAK" && statusP !== "ACC") { if(!namaPelanggan) namaPelanggan = dP[j][2]; pendingLoans.push({ barang: dP[j][10], status: statusP }); }
          }
      }

      if(activeLoans.length > 0 || historyLoans.length > 0 || pendingLoans.length > 0) {
          var totalTelat = activeLoans.reduce((sum, loan) => sum + Math.max(0, loan.selisihHari), 0); var skorData = { score: "A", badge: "Nasabah Lancar" };
          if (historyLoans.length > 0 && totalTelat === 0) { skorData = { score: "A+", badge: "VVIP Member" }; } else if (totalTelat > 0 && totalTelat <= 5) { skorData = { score: "B", badge: "Telat Ringan" }; } else if (totalTelat > 5) { skorData = { score: "C", badge: "Telat Berat" }; }
          return createJsonResponse({ status: "success", data: { nama: namaPelanggan, wa: sw, skor: skorData, aktif: activeLoans, riwayat: historyLoans, pending: pendingLoans } });
      } else { return createJsonResponse({status: "error", message: "Nomor tidak ditemukan."}); }
    }

    if (!isTokenValid(e.parameter.pin)) return createJsonResponse({status: "error", message: "Akses Ditolak! API Token tidak valid."});

    if (action === "getDraftConfig") {
      var sC = ss.getSheetByName("DraftConfig"); if (!sC || sC.getLastRow() < 2) return createJsonResponse({status: "empty"});
      var dC = sC.getRange("A2:E2").getValues()[0]; return createJsonResponse({status: "success", data: {nama: dC[0], logo: dC[1], teks: dC[2], api: dC[3], wa: dC[4]}});
    }

    if (action === "getPending") {
      var s = ss.getSheetByName("Pengajuan"); if (!s || s.getLastRow() < 2) return createJsonResponse({status: "success", data: []});
      var d = s.getDataRange().getValues(); var res = [];
      for (var i = 1; i < d.length; i++) {
        var statusPengajuan = (d[i][17] || "").toString().toUpperCase(); if (statusPengajuan === "ACC" || statusPengajuan === "DITOLAK") continue;
        res.push({ idKontrak: cleanId(d[i][0]), nama: d[i][2] || "", wa: (d[i][4] || "").toString().replace(/[^0-9]/g, ''), barang: d[i][10] || "", harga: d[i][11] || 0, dp: d[i][12] || 0, tenor: d[i][13] || 1, jaminan: d[i][14] || "", jatuhTempo: d[i][15] || 1, margin: d[i][16] || 25 });
      }
      return createJsonResponse({status: "success", data: res});
    }

    if (action === "getAll") {
      var s = ss.getSheetByName("Pelanggan"); if (!s || s.getLastRow() < 2) return createJsonResponse({status: "success", data: []});
      var d = s.getDataRange().getValues(); var res = [];
      for (var i = 1; i < d.length; i++) {
        var jatuhTempoDB = parseInt(d[i][7]) || 1; var cTargetStr = String(d[i][9]); var cicilanKeDB = parseInt(d[i][8]) || 1;
        var kalkulasi = hitungStatusJatuhTempo(jatuhTempoDB, cTargetStr);
        res.push({ idKontrak: cleanId(d[i][0]), nama: d[i][1] || "", wa: (d[i][2] || "").toString().replace(/[^0-9]/g, ''), barang: d[i][3] || "", hutang: parseInt(d[i][4]) || 0, terbayar: parseInt(d[i][5]) || 0, cicilanPerBulan: parseInt(d[i][6]) || 0, jatuhTempo: jatuhTempoDB, cicilanKe: cicilanKeDB, bulanTerakhirBayar: d[i][9], statusPembayaran: kalkulasi.statusSkor, selisihHari: kalkulasi.selisihHari, targetBulan: kalkulasi.targetBln, targetTahun: kalkulasi.targetThn });
      }
      return createJsonResponse({status: "success", data: res});
    }

  } catch (e) { return createJsonResponse({status: "error", msg: e.toString()}); }
}
function pancingIzinEmail() {
  MailApp.sendEmail(EMAIL_NOTIFIKASI, "🚨 TEST SISTEM EMAIL", "Kalau email ini masuk, berarti izin sudah sukses 100%! Sistem Kasir sekarang sudah bisa kirim laporan otomatis.");
}
