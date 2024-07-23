namespace Utils {
  export const createOrdered2dArrray = (employees, columns) => {
    return employees.map(employee => {
        return columns.map((column: string | number) => employee[column]);
    });
  }

  export const writeObjectArrayToSheet = (objects: any[], sheetName: string, startRow: number, startCol: number, clearRange=false) => {
    const keys = Utils.extractUniqueKeys(objects);
    const data = Utils.createOrdered2dArrray(objects, keys);
    data.unshift(keys);
    Utils.writeArrayToSheet(data, sheetName, startRow, startCol, clearRange);
  }

  export const writeArrayToSheet = (data2dArray: any[], sheetName: string, startRow: number, startCol: number, clearRange=false) => {
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
      sheet.getRange(startRow, startCol, sheet.getLastRow(), sheet.getLastColumn()).clearContent();
    }
  
    sheet.getRange(startRow, startCol, data2dArray.length, data2dArray[0].length).setValues(data2dArray);
  }
  
  export const getColumnsFromSheet = (sheetName: string, rowNumber: number) => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Sheet not found: " + sheetName);
      return;
    };
    return sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];
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
  
  export const formatDateToYYYYMMDD = (date: Date) => {
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
  }
}