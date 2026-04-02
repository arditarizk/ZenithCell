// ==========================================
// MASTER API ZENITH CELL (V18 - SUPER STABIL)
// ==========================================

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { sheet = ss.insertSheet(sheetName); }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// Pembersih ID Anti-Error
function cleanId(id) {
  return String(id).replace(/['" ]/g, '').trim().toUpperCase();
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    
    // 1. PENGAJUAN BARU
    if (payload.tipe === "PENGAJUAN_BARU") {
      var s = getOrCreateSheet(ss, "Pengajuan");
      if (s.getLastRow() === 0) {
        s.appendRow(["ID Kontrak", "Tanggal", "Nama Lengkap", "NIK", "No WA", "Alamat", "Pekerjaan", "Gaji", "Darurat Nama", "Darurat WA", "Barang", "Harga", "DP", "Tenor", "Jaminan", "Jatuh Tempo", "Margin", "Status"]);
        s.getRange("A1:R1").setFontWeight("bold").setBackground("#fef3c7");
      }
      s.appendRow(["'" + cleanId(payload.idKontrak), payload.timestamp || new Date().toLocaleString('id-ID'), payload.nama, "'" + payload.nik, "'" + payload.wa, payload.alamat, payload.pekerjaan, payload.gaji, payload.daruratNama, "'" + payload.daruratWa, payload.barang, payload.harga, payload.dp, payload.tenor, payload.jaminan, payload.jatuhTempo, payload.margin || 25, "PENDING"]);
      return createJsonResponse({status: "success"});
    }

    // 2. ACC PENGAJUAN
    if (payload.tipe === "ACC_PENGAJUAN") {
      var sP = ss.getSheetByName("Pengajuan");
      var sL = getOrCreateSheet(ss, "Pelanggan");
      if (sP) {
        var dP = sP.getDataRange().getValues();
        for (var i = 1; i < dP.length; i++) {
          if (cleanId(dP[i][0]) === cleanId(payload.idKontrak)) { 
            sP.getRange(i + 1, 18).setValue("ACC"); break;
          }
        }
      }
      if (sL.getLastRow() === 0) {
        sL.appendRow(["ID Kontrak", "Nama Pelanggan", "No WA", "Barang", "Total Hutang", "Sudah Terbayar", "Cicilan Per Bulan", "Tgl Jatuh Tempo", "Cicilan Ke", "Bulan Terakhir Bayar"]);
        sL.getRange("A1:J1").setFontWeight("bold").setBackground("#e0e7ff");
      }
      sL.appendRow(["'" + cleanId(payload.idKontrak), payload.nama, "'" + payload.wa, payload.barang, payload.totalHutang, 0, payload.cicilanBulan, payload.jatuhTempo, 1, 0]);
      return createJsonResponse({status: "success"});
    }

    // 3. TOLAK PENGAJUAN
    if (payload.tipe === "TOLAK_PENGAJUAN") {
      var sP = ss.getSheetByName("Pengajuan");
      if (sP) {
        var dP = sP.getDataRange().getValues();
        for (var i = 1; i < dP.length; i++) {
          if (cleanId(dP[i][0]) === cleanId(payload.idKontrak)) { 
            sP.getRange(i + 1, 18).setValue("DITOLAK"); break;
          }
        }
      }
      return createJsonResponse({status: "success"});
    }

    // 4. KASIR POS - BAYAR CICILAN
    if (payload.tipe === "KAS_MASUK_CICILAN") {
      var sT = getOrCreateSheet(ss, "Transaksi");
      if (sT.getLastRow() === 0) { 
        sT.appendRow(["ID Transaksi", "Waktu", "ID Kontrak", "Nama", "WA", "Pembayaran Ke", "Angsuran Pokok", "Dana Kebajikan (Denda)", "Catatan"]);
        sT.getRange("A1:I1").setFontWeight("bold").setBackground("#f3e8ff");
      }
      sT.appendRow(["'" + cleanId(payload.idTransaksi), payload.waktu, "'" + cleanId(payload.idKontrak), payload.nama, "'"+payload.whatsapp, payload.cicilanKe, payload.nominalMasuk, payload.dendaMasuk || 0, payload.catatan]);
      
      var sL = ss.getSheetByName("Pelanggan");
      if (sL) {
        var dL = sL.getDataRange().getValues();
        for (var i = 1; i < dL.length; i++) {
          if (cleanId(dL[i][0]) === cleanId(payload.idKontrak)) {
            sL.getRange(i+1, 6).setValue((parseInt(dL[i][5])||0) + parseInt(payload.nominalMasuk));
            sL.getRange(i+1, 9).setValue((parseInt(dL[i][8])||0) + 1);
            sL.getRange(i+1, 10).setValue(payload.bulanIni); 
            break;
          }
        }
      }
      return createJsonResponse({status: "success"});
    }

    // 5. KASIR POS - PELUNASAN AWAL
    if (payload.tipe === "PELUNASAN_AWAL") {
      var sT = getOrCreateSheet(ss, "Transaksi");
      var sL = ss.getSheetByName("Pelanggan");
      var sR = getOrCreateSheet(ss, "Riwayat");
      if (sT.getLastRow() === 0) { 
        sT.appendRow(["ID Transaksi", "Waktu", "ID Kontrak", "Nama", "WA", "Pembayaran Ke", "Angsuran Pokok", "Dana Kebajikan (Denda)", "Catatan"]);
        sT.getRange("A1:I1").setFontWeight("bold").setBackground("#f3e8ff");
      }
      sT.appendRow(["'" + cleanId(payload.idTransaksi), payload.waktu, "'" + cleanId(payload.idKontrak), payload.nama, "'"+payload.whatsapp, "LUNAS FULL", payload.nominalMasuk, payload.dendaMasuk || 0, payload.catatan]);
      
      if (sR.getLastRow() === 0) {
        sR.appendRow(["ID Kontrak", "Nama Pelanggan", "No WA", "Barang", "Total Hutang Awal", "Status Kredit"]);
        sR.getRange("A1:F1").setFontWeight("bold").setBackground("#dcfce7");
      }
      if (sL) {
        var dL = sL.getDataRange().getValues();
        for (var i = 1; i < dL.length; i++) {
          if (cleanId(dL[i][0]) === cleanId(payload.idKontrak)) {
            sR.appendRow(["'" + cleanId(dL[i][0]), dL[i][1], "'" + dL[i][2], dL[i][3], dL[i][4], "LUNAS EXCELLENT (Muroqoshoh)"]);
            sL.deleteRow(i + 1); break;
          }
        }
      }
      return createJsonResponse({status: "success"});
    }
    return createJsonResponse({status: "error", message: "Tipe POST tidak valid"});
  } catch (e) { return createJsonResponse({status: "error", msg: "Server Error: " + e.toString()}); }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = e.parameter.action;
    if (action === "ping") return createJsonResponse({status: "online"});

    if (action === "getPending") {
      var s = ss.getSheetByName("Pengajuan");
      if (!s || s.getLastRow() < 2) return createJsonResponse({status: "success", data: []});
      var d = s.getDataRange().getValues();
      var res = [];
      for (var i = 1; i < d.length; i++) {
        var statusPengajuan = (d[i][17] || "").toString().toUpperCase();
        if (statusPengajuan === "ACC" || statusPengajuan === "DITOLAK") continue;
        res.push({ 
          idKontrak: cleanId(d[i][0]), nama: d[i][2] || "", wa: (d[i][4] || "").toString().replace(/[^0-9]/g, ''), 
          barang: d[i][10] || "", harga: d[i][11] || 0, dp: d[i][12] || 0, tenor: d[i][13] || 1, 
          jaminan: d[i][14] || "", jatuhTempo: d[i][15] || 1, margin: d[i][16] || 25
        });
      }
      return createJsonResponse({status: "success", data: res});
    }

    if (action === "getAll") {
      var s = ss.getSheetByName("Pelanggan");
      if (!s || s.getLastRow() < 2) return createJsonResponse({status: "success", data: []});
      var d = s.getDataRange().getValues();
      var res = [];
      var tglSekarang = new Date().getDate(); 
      var blnSekarang = new Date().getMonth() + 1;
      for (var i = 1; i < d.length; i++) {
        var jatuhTempoDB = parseInt(d[i][7]) || 1;
        var bulanTerakhirDB = parseInt(d[i][9]) || 0;
        var statusSkor = "LANCAR";
        if (bulanTerakhirDB !== blnSekarang && tglSekarang > jatuhTempoDB) {
           statusSkor = "TELAT " + (tglSekarang - jatuhTempoDB) + " HARI";
        }
        res.push({ 
          idKontrak: cleanId(d[i][0]), nama: d[i][1] || "", wa: (d[i][2] || "").toString().replace(/[^0-9]/g, ''), 
          barang: d[i][3] || "", hutang: parseInt(d[i][4]) || 0, terbayar: parseInt(d[i][5]) || 0, 
          cicilanPerBulan: parseInt(d[i][6]) || 0, jatuhTempo: jatuhTempoDB, 
          cicilanKe: parseInt(d[i][8]) || 1, bulanTerakhirBayar: bulanTerakhirDB, statusPembayaran: statusSkor
        });
      }
      return createJsonResponse({status: "success", data: res});
    }

    if (e.parameter.wa) {
      var sw = e.parameter.wa.replace(/[^0-9]/g, '');
      var s = ss.getSheetByName("Pelanggan");
      if (s && s.getLastRow() >= 2) {
        var d = s.getDataRange().getValues();
        for (var i = 1; i < d.length; i++) {
          if (String(d[i][2]).replace(/[^0-9]/g, '') === sw) {
            return createJsonResponse({status: "success", data: { 
              nama: d[i][1], wa: sw, barang: d[i][3], totalHutang: parseInt(d[i][4])||0, terbayar: parseInt(d[i][5])||0, 
              cicilanPerBulan: parseInt(d[i][6])||0, jatuhTempo: d[i][7], cicilanKe: parseInt(d[i][8])||1, bulanTerakhirBayar: parseInt(d[i][9])||0
            }});
          }
        }
      }
      var sP = ss.getSheetByName("Pengajuan");
      if(sP && sP.getLastRow() >= 2) {
          var dP = sP.getDataRange().getValues();
          for (var j = 1; j < dP.length; j++) {
            var statusP = (dP[j][17] || "").toString().toUpperCase();
            if (String(dP[j][4]).replace(/[^0-9]/g, '') === sw && statusP !== "DITOLAK") {
              return createJsonResponse({status: "pending", data: {nama: dP[j][2], barang: dP[j][10]}});
            }
          }
      }
      return createJsonResponse({status: "error", message: "Nomor tidak ditemukan."});
    }
  } catch (e) { return createJsonResponse({status: "error", msg: e.toString()}); }
}
