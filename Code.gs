// ==========================================
// MASTER API ZENITH CELL (AUTOPILOT FINAL)
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
    
    // 1. PENGAJUAN BARU
    if (payload.tipe === "PENGAJUAN_BARU") {
      var sheetPengajuan = getOrCreateSheet(ss, "Pengajuan");
      if (sheetPengajuan.getLastRow() === 0) {
        sheetPengajuan.appendRow(["Tanggal", "Nama Lengkap", "NIK", "No WA", "Alamat", "Pekerjaan", "Gaji", "Darurat Nama", "Darurat WA", "Barang", "Harga", "DP", "Tenor", "Jaminan", "Tgl Jatuh Tempo", "Status Sistem"]);
        sheetPengajuan.getRange("A1:P1").setFontWeight("bold").setBackground("#fef3c7");
      }
      sheetPengajuan.appendRow([
        payload.timestamp, payload.nama, "'"+payload.nik, "'"+payload.wa, payload.alamat, 
        payload.pekerjaan, payload.gaji, payload.daruratNama, "'"+payload.daruratWa, 
        payload.barang, payload.harga, payload.dp, payload.tenor, payload.jaminan, payload.jatuhTempo, "MENUNGGU"
      ]);
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. ACC PENGAJUAN (DARI DASHBOARD ADMIN)
    if (payload.tipe === "ACC_PENGAJUAN") {
      var sheetPengajuan = ss.getSheetByName("Pengajuan");
      var sheetPel = getOrCreateSheet(ss, "Pelanggan");
      
      // Ubah status di Pengajuan
      if (sheetPengajuan) {
        var dataPengajuan = sheetPengajuan.getDataRange().getValues();
        var searchWa = payload.wa.toString().replace(/[^0-9]/g, '');
        for (var i = 1; i < dataPengajuan.length; i++) {
          var currentWa = dataPengajuan[i][3] ? dataPengajuan[i][3].toString().replace(/[^0-9]/g, '') : "";
          if (currentWa === searchWa && dataPengajuan[i][15] !== "ACC") {
            sheetPengajuan.getRange(i + 1, 16).setValue("ACC"); 
            break;
          }
        }
      }

      // Masukkan ke Tab Pelanggan Kasir
      if (sheetPel.getLastRow() === 0) {
        sheetPel.appendRow(["ID", "Nama Pelanggan", "No WA", "Barang", "Total Hutang", "Sudah Terbayar", "Cicilan Per Bulan", "Tgl Jatuh Tempo", "Cicilan Ke"]);
        sheetPel.getRange("A1:I1").setFontWeight("bold").setBackground("#e0e7ff");
      }
      sheetPel.appendRow([
        "CUST-" + Date.now(), payload.nama, "'"+payload.wa, payload.barang, 
        payload.totalHutang, 0, payload.cicilanBulan, payload.jatuhTempo, 1
      ]);

      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. TOLAK PENGAJUAN
    if (payload.tipe === "TOLAK_PENGAJUAN") {
      var sheetPengajuan = ss.getSheetByName("Pengajuan");
      if (sheetPengajuan) {
        var dataPengajuan = sheetPengajuan.getDataRange().getValues();
        var searchWa = payload.wa.toString().replace(/[^0-9]/g, '');
        for (var i = 1; i < dataPengajuan.length; i++) {
          var currentWa = dataPengajuan[i][3] ? dataPengajuan[i][3].toString().replace(/[^0-9]/g, '') : "";
          if (currentWa === searchWa) {
            sheetPengajuan.getRange(i + 1, 16).setValue("DITOLAK"); 
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 4. KAS MASUK
    if (payload.tipe === "KAS_MASUK_CICILAN") {
      var sheetTx = getOrCreateSheet(ss, "Transaksi");
      if (sheetTx.getLastRow() === 0) {
        sheetTx.appendRow(["Tanggal & Waktu", "Nama Pelanggan", "No WA", "Cicilan Ke", "Nominal Masuk", "Catatan Admin"]);
        sheetTx.getRange("A1:F1").setFontWeight("bold").setBackground("#d1fae5");
      }
      sheetTx.appendRow([payload.waktu, payload.nama, "'"+payload.whatsapp, payload.cicilanKe, payload.nominalMasuk, payload.catatan]);

      var sheetPel = ss.getSheetByName("Pelanggan");
      if (sheetPel) {
        var data = sheetPel.getDataRange().getValues();
        var searchWa = payload.whatsapp.toString().replace(/[^0-9]/g, '');
        for (var i = 1; i < data.length; i++) {
          var currentWa = data[i][2] ? data[i][2].toString().replace(/[^0-9]/g, '') : "";
          if (currentWa === searchWa) {
            var terbayarLama = parseInt(data[i][5]) || 0;     
            var cicilanKeLama = parseInt(data[i][8]) || 0;    
            sheetPel.getRange(i+1, 6).setValue(terbayarLama + parseInt(payload.nominalMasuk));
            sheetPel.getRange(i+1, 9).setValue(cicilanKeLama + 1);
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", msg: error.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = e.parameter.action;
    var waToSearch = e.parameter.wa;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Tarik Antrean
    if (action === "getPending") {
      var sheetPengajuan = ss.getSheetByName("Pengajuan");
      if (!sheetPengajuan) return ContentService.createTextOutput(JSON.stringify({status: "success", data: []})).setMimeType(ContentService.MimeType.JSON);
      
      var dataPengajuan = sheetPengajuan.getDataRange().getValues();
      var pending = [];
      for (var i = 1; i < dataPengajuan.length; i++) {
        if (dataPengajuan[i][15] !== "ACC" && dataPengajuan[i][15] !== "DITOLAK") {
          pending.push({
            tanggal: dataPengajuan[i][0], nama: dataPengajuan[i][1], wa: dataPengajuan[i][3] ? dataPengajuan[i][3].toString().replace(/[^0-9]/g, '') : "",
            barang: dataPengajuan[i][9], harga: dataPengajuan[i][10], dp: dataPengajuan[i][11], tenor: dataPengajuan[i][12], jatuhTempo: dataPengajuan[i][14]
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success", data: pending})).setMimeType(ContentService.MimeType.JSON);
    }

    // Tarik Tagihan
    var sheet = ss.getSheetByName("Pelanggan");
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Tab Pelanggan belum ada"})).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues();

    if (action === "getAll") {
      var customers = [];
      for (var i = 1; i < data.length; i++) {
        customers.push({
          nama: data[i][1], wa: data[i][2] ? data[i][2].toString().replace(/[^0-9]/g, '') : "", barang: data[i][3],
          hutang: parseInt(data[i][4])||0, terbayar: parseInt(data[i][5])||0, cicilanPerBulan: parseInt(data[i][6])||0,
          jatuhTempo: data[i][7], cicilanKe: parseInt(data[i][8])||1
        });
      }
      return ContentService.createTextOutput(JSON.stringify({status: "success", data: customers})).setMimeType(ContentService.MimeType.JSON);
    }

    // Pencarian Khusus (Cek Tagihan)
    if (waToSearch) {
      var searchWa = waToSearch.toString().replace(/[^0-9]/g, '');
      for (var i = 1; i < data.length; i++) {
        var currentWaInSheet = data[i][2] ? data[i][2].toString().replace(/[^0-9]/g, '') : "";
        if (currentWaInSheet === searchWa) {
          return ContentService.createTextOutput(JSON.stringify({status: "success", data: {
            nama: data[i][1], wa: currentWaInSheet, barang: data[i][3], totalHutang: parseInt(data[i][4])||0, terbayar: parseInt(data[i][5])||0,
            cicilanPerBulan: parseInt(data[i][6])||0, jatuhTempo: data[i][7], cicilanKe: parseInt(data[i][8])||1
          }})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      
      // Cari di Antrean jika tidak ada di Pelanggan
      var sheetPengajuan = ss.getSheetByName("Pengajuan");
      if(sheetPengajuan) {
          var dataPengajuan = sheetPengajuan.getDataRange().getValues();
          for (var i = 1; i < dataPengajuan.length; i++) {
            var currentWa = dataPengajuan[i][3] ? dataPengajuan[i][3].toString().replace(/[^0-9]/g, '') : "";
            if (currentWa === searchWa) {
              var statusSistem = dataPengajuan[i][15];
              if(statusSistem !== "DITOLAK") {
                  return ContentService.createTextOutput(JSON.stringify({status: "pending", data: {nama: dataPengajuan[i][1], barang: dataPengajuan[i][9]}})).setMimeType(ContentService.MimeType.JSON);
              }
            }
          }
      }
      return ContentService.createTextOutput(JSON.stringify({status: "error", message: "Nomor tidak ditemukan"})).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: "error"})).setMimeType(ContentService.MimeType.JSON);
  }
}