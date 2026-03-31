// ==========================================
// MASTER API ZENITH CELL (V7 - KALENDER PINTAR & TANGGAL LENGKAP)
// ==========================================

function getOrCreateSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  return sheet;
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    
    if (payload.tipe === "PENGAJUAN_BARU") {
      var s = getOrCreateSheet(ss, "Pengajuan");
      if (s.getLastRow() === 0) {
        s.appendRow(["ID Kontrak", "Tanggal", "Nama Lengkap", "NIK", "No WA", "Alamat", "Pekerjaan", "Gaji", "Darurat Nama", "Darurat WA", "Barang", "Harga", "DP", "Tenor", "Jaminan", "Jatuh Tempo"]);
        s.getRange("A1:P1").setFontWeight("bold").setBackground("#fef3c7");
      }
      s.appendRow([payload.idKontrak, payload.timestamp, payload.nama, "'"+payload.nik, "'"+payload.wa, payload.alamat, payload.pekerjaan, payload.gaji, payload.daruratNama, "'"+payload.daruratWa, payload.barang, payload.harga, payload.dp, payload.tenor, payload.jaminan, payload.jatuhTempo]);
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.tipe === "ACC_PENGAJUAN") {
      var sP = ss.getSheetByName("Pengajuan");
      var sL = getOrCreateSheet(ss, "Pelanggan");
      if (sP) {
        var dP = sP.getDataRange().getValues();
        for (var i = 1; i < dP.length; i++) {
          if (dP[i][0] === payload.idKontrak) { sP.deleteRow(i + 1); break; }
        }
      }
      if (sL.getLastRow() === 0) {
        sL.appendRow(["ID Kontrak", "Nama Pelanggan", "No WA", "Barang", "Total Hutang", "Sudah Terbayar", "Cicilan Per Bulan", "Tgl Jatuh Tempo", "Cicilan Ke", "Bulan Terakhir Bayar"]);
        sL.getRange("A1:J1").setFontWeight("bold").setBackground("#e0e7ff");
      }
      sL.appendRow([payload.idKontrak, payload.nama, "'"+payload.wa, payload.barang, payload.totalHutang, 0, payload.cicilanBulan, payload.jatuhTempo, 1, 0]);
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.tipe === "TOLAK_PENGAJUAN") {
      var sP = ss.getSheetByName("Pengajuan");
      if (sP) {
        var dP = sP.getDataRange().getValues();
        for (var i = 1; i < dP.length; i++) {
          if (dP[i][0] === payload.idKontrak) { sP.deleteRow(i + 1); break; }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (payload.tipe === "KAS_MASUK_CICILAN") {
      var sT = getOrCreateSheet(ss, "Transaksi");
      if (sT.getLastRow() === 0) { sT.appendRow(["Waktu", "ID Kontrak", "Nama", "WA", "Ke", "Nominal", "Catatan"]); }
      sT.appendRow([payload.waktu, payload.idKontrak, payload.nama, "'"+payload.whatsapp, payload.cicilanKe, payload.nominalMasuk, payload.catatan]);
      
      var sL = ss.getSheetByName("Pelanggan");
      if (sL) {
        var dL = sL.getDataRange().getValues();
        for (var i = 1; i < dL.length; i++) {
          if (dL[i][0] === payload.idKontrak) {
            sL.getRange(i+1, 6).setValue((parseInt(dL[i][5])||0) + parseInt(payload.nominalMasuk));
            sL.getRange(i+1, 9).setValue((parseInt(dL[i][8])||0) + 1);
            sL.getRange(i+1, 10).setValue(payload.bulanIni); 
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.tipe === "MIGRASI_PELANGGAN") {
      var sL = getOrCreateSheet(ss, "Pelanggan");
      if (sL.getLastRow() === 0) {
        sL.appendRow(["ID Kontrak", "Nama Pelanggan", "No WA", "Barang", "Total Hutang", "Sudah Terbayar", "Cicilan Per Bulan", "Tgl Jatuh Tempo", "Cicilan Ke", "Bulan Terakhir Bayar"]);
        sL.getRange("A1:J1").setFontWeight("bold").setBackground("#e0e7ff");
      }
      sL.appendRow(["ZNTH-M-" + Date.now(), payload.nama, "'"+payload.wa, payload.barang, payload.totalHutang, payload.sudahTerbayar, payload.cicilanBulan, payload.jatuhTempo, payload.cicilanKe, 0]);
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (e) { return ContentService.createTextOutput(JSON.stringify({status: "error", msg: e.toString()})).setMimeType(ContentService.MimeType.JSON); }
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action;
  
  if (action === "checkDuplicate") {
    var w = (e.parameter.wa || "").replace(/[^0-9]/g, '');
    var n = (e.parameter.nik || "").replace(/[^0-9]/g, '');
    var sP = ss.getSheetByName("Pengajuan");
    if (sP) {
      var dP = sP.getDataRange().getValues();
      for (var i = 1; i < dP.length; i++) {
        if (dP[i][4].toString().replace(/[^0-9]/g,'') === w || dP[i][3].toString().replace(/[^0-9]/g,'') === n) 
          return ContentService.createTextOutput(JSON.stringify({isDuplicate: true, message: "NIK/WA sudah ada dalam antrean!"})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    var sL = ss.getSheetByName("Pelanggan");
    if (sL) {
      var dL = sL.getDataRange().getValues();
      for (var i = 1; i < dL.length; i++) {
        if (dL[i][2].toString().replace(/[^0-9]/g,'') === w && (parseInt(dL[i][4]) - parseInt(dL[i][5]) > 0))
          return ContentService.createTextOutput(JSON.stringify({isDuplicate: true, message: "Anda memiliki cicilan aktif!"})).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({isDuplicate: false})).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getPending") {
    var s = ss.getSheetByName("Pengajuan");
    if (!s) return ContentService.createTextOutput(JSON.stringify({status: "success", data: []})).setMimeType(ContentService.MimeType.JSON);
    var d = s.getDataRange().getValues();
    var res = [];
    for (var i = 1; i < d.length; i++) {
      res.push({ idKontrak: d[i][0], nama: d[i][2], wa: d[i][4].toString().replace(/[^0-9]/g, ''), barang: d[i][10], harga: d[i][11], dp: d[i][12], tenor: d[i][13], jatuhTempo: d[i][15] });
    }
    return ContentService.createTextOutput(JSON.stringify({status: "success", data: res})).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getAll") {
    var s = ss.getSheetByName("Pelanggan");
    if (!s) return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Data kosong"})).setMimeType(ContentService.MimeType.JSON);
    var d = s.getDataRange().getValues();
    var res = [];
    for (var i = 1; i < d.length; i++) {
      res.push({ 
        idKontrak: d[i][0], nama: d[i][1], wa: d[i][2].toString().replace(/[^0-9]/g, ''), barang: d[i][3], 
        hutang: parseInt(d[i][4])||0, terbayar: parseInt(d[i][5])||0, cicilanPerBulan: parseInt(d[i][6])||0, 
        jatuhTempo: d[i][7], cicilanKe: parseInt(d[i][8])||1, bulanTerakhirBayar: parseInt(d[i][9])||0 
      });
    }
    return ContentService.createTextOutput(JSON.stringify({status: "success", data: res})).setMimeType(ContentService.MimeType.JSON);
  }
  
  // Fitur Cek Tagihan Live (UPDATE V7)
  if (e.parameter.wa) {
    var sw = e.parameter.wa.replace(/[^0-9]/g, '');
    var s = ss.getSheetByName("Pelanggan");
    if (s) {
      var d = s.getDataRange().getValues();
      for (var i = 1; i < d.length; i++) {
        if (d[i][2].toString().replace(/[^0-9]/g, '') === sw) {
          return ContentService.createTextOutput(JSON.stringify({status: "success", data: { 
            nama: d[i][1], wa: sw, barang: d[i][3], totalHutang: parseInt(d[i][4])||0, terbayar: parseInt(d[i][5])||0, 
            cicilanPerBulan: parseInt(d[i][6])||0, jatuhTempo: d[i][7], cicilanKe: parseInt(d[i][8])||1, 
            bulanTerakhirBayar: parseInt(d[i][9])||0 // Ditambahkan parameter ini!
          }})).setMimeType(ContentService.MimeType.JSON);
        }
      }
    }
    var sP = ss.getSheetByName("Pengajuan");
    if(sP) {
        var dP = sP.getDataRange().getValues();
        for (var i = 1; i < dP.length; i++) {
          if (dP[i][4].toString().replace(/[^0-9]/g, '') === sw) {
            return ContentService.createTextOutput(JSON.stringify({status: "pending", data: {nama: dP[i][2], barang: dP[i][10]}})).setMimeType(ContentService.MimeType.JSON);
          }
        }
    }
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Nomor tidak ditemukan"})).setMimeType(ContentService.MimeType.JSON);
  }
}
