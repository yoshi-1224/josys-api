class Utils {
  static createOrdered2dArrray(employees, columns) {
    return employees.map(employee => {
      return columns.map((column) => employee[column]);
    });
  }

  static writeObjectArrayToSheet(objects, sheetName, startRow, startCol, clearRange = false) {
    const keys = Utils.extractUniqueKeys(objects);
    const data = Utils.createOrdered2dArrray(objects, keys);
    data.unshift(keys);
    Utils.writeArrayToSheet(data, sheetName, startRow, startCol, clearRange);
  }

  static writeArrayToSheet(data2dArray, sheetName, startRow, startCol, clearRange = false) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Sheet not found: " + sheetName);
      return;
    }
    if (!data2dArray || !data2dArray.length || typeof data2dArray[0] !== 'object') {
      Logger.log("Invalid data array.");
      return;
    }

    if (clearRange && sheet.getLastRow() !== 0) {
      sheet.getRange(startRow, startCol, sheet.getLastRow(), Utils.getLastColumnNumber(sheet, 1)).clearContent();
    }

    sheet.getRange(startRow, startCol, data2dArray.length, data2dArray[0].length).setValues(data2dArray);
    SpreadsheetApp.flush();
  }

  static getColumnsFromSheet(sheetName, rowNumber) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Sheet not found: " + sheetName);
      return;
    }
    return sheet.getRange(rowNumber, 1, 1, Utils.getLastColumnNumber(sheet, rowNumber)).getValues()[0];
  }

  static getLastColumnNumber(sheet, row) {
    const lastColumn = sheet.getLastColumn();
    const values = sheet.getRange(row, 1, 1, lastColumn).getValues()[0];
    for (let col = lastColumn - 1; col >= 0; col--) {
      if (values[col] !== "") {
        return col + 1;
      }
    }
    return 0;
  }

  static createObjectArrayFrom2dArray(columns, array2d) {
    return array2d.map((subArray) => {
      let obj = {};
      columns.forEach((key, index) => {
        obj[key] = subArray[index];
      });
      return obj;
    });
  }

  static extract_columns(obj, columns) {
    Object.keys(obj).forEach(key => {
      if (!columns.includes(key)) {
        delete obj[key];
      }
    });
  }

  static extractUniqueKeys(arrayOfObjects) {
    const uniqueKeys = new Set();
    arrayOfObjects.forEach((obj) => {
      Object.keys(obj).forEach(key => {
        uniqueKeys.add(key);
      });
    });
    return Array.from(uniqueKeys);
  }

  static formatDateToJosysFormat(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    const formattedMonth = month < 10 ? '0' + month : month;
    const formattedDay = day < 10 ? '0' + day : day;

    return `${year}-${formattedMonth}-${formattedDay}`;
  }

  static clearSheet(sheetName) {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      return;
    }
    sheet.clear();
  }

  static getMaxRowNumAtIDColumn(sheetName, columns) {
    let idColumnIndex = columns.indexOf("ID");
    if (idColumnIndex === -1) {
      throw new Error(`ID column does not exist`);
    }
    idColumnIndex += 1;
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      return;
    }
    var lastRow = sheet.getLastRow();
    var range = sheet.getRange(1, idColumnIndex, lastRow, 1);
    var values = range.getValues();
    var columnLength = 0;
    for (var rowIndex = 0; rowIndex < values.length; rowIndex++) {
      if (values[rowIndex][0] !== "") {
        columnLength = rowIndex + 1;
      }
    }
    return columnLength;
  }
}