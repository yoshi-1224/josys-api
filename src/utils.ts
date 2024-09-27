namespace Utils {
  export const createOrdered2dArrray = (employees, columns) => {
    return employees.map(employee => {
      return columns.map((column: string | number) => employee[column]);
    });
  }

  export const writeObjectArrayToSheet = (objects: any[], sheetName: string, startRow: number, startCol: number, clearRange = false) => {
    const keys = Utils.extractUniqueKeys(objects);
    const data = Utils.createOrdered2dArrray(objects, keys);
    data.unshift(keys);
    Utils.writeArrayToSheet(data, sheetName, startRow, startCol, clearRange);
  }

  export const writeArrayToSheet = (data2dArray: any[], sheetName: string, startRow: number, startCol: number, clearRange = false) => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Sheet not found: " + sheetName);
      return;
    }
    // Check if the dataArray is not empty and that it's an array of objects
    if (!data2dArray || !data2dArray.length || typeof data2dArray[0] !== 'object') {
      Logger.log("Invalid data array.");
      return;
    }

    if (clearRange && sheet.getLastRow() !== 0) {
      sheet.getRange(startRow, startCol, sheet.getLastRow(), Utils.getLastColumnNumber(sheet, 1)).clearContent(); // avoid deleting formulas
    }

    sheet.getRange(startRow, startCol, data2dArray.length, data2dArray[0].length).setValues(data2dArray);
    SpreadsheetApp.flush();
  }

  export const getColumnsFromSheet = (sheetName: string, rowNumber: number) => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Sheet not found: " + sheetName);
      return;
    };
    return sheet.getRange(rowNumber, 1, 1, Utils.getLastColumnNumber(sheet, rowNumber)).getValues()[0];
  }

  export const getLastColumnNumber = (sheet, row) => {
    const lastColumn = sheet.getLastColumn();
    const values = sheet.getRange(row, 1, 1, lastColumn).getValues()[0];
    for (let col = lastColumn - 1; col >= 0; col--) {
      if (values[col] !== "") {
        return col + 1;
      }
    }
    return 0; // If the row is empty, return 0
  }

  export const createObjectArrayFrom2dArray = (columns, array2d) => {
    return array2d.map((subArray: { [x: string]: any; }) => {
      let obj = {};
      columns.forEach((key: string | number, index: number) => {
        obj[key] = subArray[index];
      });
      return obj;
    });
  }

  export const extract_columns = (obj: { [x: string]: any; }, columns: string[]) => {
    Object.keys(obj).forEach(key => {
      if (!columns.includes(key)) {
        delete obj[key];
      }
    });
  }

  export const extractUniqueKeys = (arrayOfObjects: {}[]) => {
    const uniqueKeys = new Set();
    arrayOfObjects.forEach((obj: {}) => {
      Object.keys(obj).forEach(key => {
        uniqueKeys.add(key);
      });
    });
    return Array.from(uniqueKeys);
  }

  export const formatDateToJosysFormat = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() is zero-based
    const day = date.getDate();

    // Pad the month and day with leading zeros if necessary
    const formattedMonth = month < 10 ? '0' + month : month;
    const formattedDay = day < 10 ? '0' + day : day;

    return `${year}-${formattedMonth}-${formattedDay}`;
  }

  export const clearSheet = (sheetName: string) => {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName)!;
    if (!sheet) {
      return;
    }
    sheet.clearContents();
    sheet.clearFormats();
  }

  export const getMaxRowNumAtIDColumn = (sheetName: string, columns: string[]) => {
    let idColumnIndex = columns.indexOf("ID");
    if (idColumnIndex === -1) {
      throw new Error(`ID column does not exist`);
    }
    idColumnIndex += 1;
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName)!;
    if (!sheet) {
      return;
    }
    var lastRow = sheet.getLastRow();
    var range = sheet.getRange(1, idColumnIndex, lastRow, 1);
    var values = range.getValues();
    var columnLength = 0;
    for (var rowIndex = 0; rowIndex < values.length; rowIndex++) {
      if (values[rowIndex][0] !== "") {
        columnLength = rowIndex + 1; // 1-based indexing (GAS uses 0-based for arrays)
      }
    }
    return columnLength;
  }

}