namespace ComputeDeviceDiffs {
    export const JosysDeviceDefaultColumnJP2EN = {
        "ID": "uuid",
        "資産番号": "asset_number",
        "シリアル番号": "serial_number",
        "ステータス": "status",
        "メーカー": "manufacturer",
        "型番": "model_number",
        "デバイスの種類": "device_type",
        "デバイス名": "model_name",
        "OS": "operating_system",
        "調達日": "start_date",
        "廃棄日/解約日": "end_date",
        "調達方法": "device_procurement",
        "メモ": "additional_device_information",
        // "ソース": "source", // not writable
        // 利用者関連はTODO
    }

    export const readColumnMappingsFromSheet = (sheetName: string) => {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }
        const lastColumn = sheet.getLastColumn();
        let range = sheet.getRange(4, 3, 1, lastColumn - 2);
        let josysColumns: string[] = range.getValues().flat();
        range = sheet.getRange(5, 3, 1, lastColumn - 2);
        let mdmColumns: string[] = range.getValues().flat();
        return [josysColumns, mdmColumns];
    }

    export const readMatchKeyFromSheet = (sheetName: string) => {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }
        return sheet.getRange("B10").getValue();
    }

    export const readAssetNumberColumnFromSheet = (sheetName: string) => {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }

        if (sheet.getRange("B14").getValue() === "同期しない") {
            return null;
        }

        return sheet.getRange("B17").getValue();
    }

    export const computeDeviceDiff = (sourceDevices, josysDevices) => {
        const [josysColumns, sourceColumns] = ComputeDeviceDiffs.readColumnMappingsFromSheet(DEVICE_CONFIG_SHEET_NAME);
        const assetNumberColumn = ComputeDeviceDiffs.readAssetNumberColumnFromSheet(DEVICE_CONFIG_SHEET_NAME);
        console.log(`asetNumberColumn = ${assetNumberColumn}`);
        let assetNumberColumnValues = [];
        if (assetNumberColumn) {
            assetNumberColumnValues = sourceDevices.map(device => device[assetNumberColumn]);
        }
        ComputeDeviceDiffs.dropColumnsExcept(josysDevices, [...josysColumns, "ID"]);
        ComputeDeviceDiffs.dropColumnsExcept(sourceDevices, sourceColumns);
        const matchKey = ComputeDeviceDiffs.readMatchKeyFromSheet(DEVICE_CONFIG_SHEET_NAME);
        console.log(`match key = ${matchKey}`);
        const columnMapping = {};
        for (let i = 0; i < josysColumns.length; i++) {
            columnMapping[josysColumns[i]] = sourceColumns[i];
        }
        console.log(columnMapping);
        const [entriesToAdd, entriesToUpdate] = ComputeDeviceDiffs.compareAndCategorize(sourceDevices, josysDevices, columnMapping, matchKey, assetNumberColumnValues);
        ComputeDeviceDiffs.modifyObjectsByKeyMapping(entriesToAdd, ComputeDeviceDiffs.JosysDeviceDefaultColumnJP2EN);
        ComputeDeviceDiffs.modifyObjectsByKeyMapping(entriesToUpdate, ComputeDeviceDiffs.JosysDeviceDefaultColumnJP2EN);
        console.log(entriesToAdd);
        console.log(entriesToUpdate);
        return [entriesToAdd, entriesToUpdate];
    };

    export const dropColumnsExcept = (objects, keys) => {
        objects.forEach(obj => {
            Object.keys(obj).forEach(key => {
                if (!keys.includes(key)) {
                    delete obj[key];
                }
            });
        });
    }

    export const compareAndCategorize = (source: Array<{ [key: string]: any }>, josys: Array<{ [key: string]: any }>, mappings: { [key: string]: string }, matchKey: string, assetNumberColumnValues: string[]) => {
        let entriesToAdd: Array<{ [key: string]: any }> = [];
        let entriesToUpdate: Array<{ [key: string]: any }> = [];

        const josysDevicesByMatchKey = josys.reduce((acc, obj) => {
            acc[obj[matchKey]] = obj;
            return acc;
        }, {});

        const reverseMapping = {};
        Object.keys(mappings).forEach(key => {
            reverseMapping[mappings[key]] = key;
        });

        const sourceMatchKey = mappings[matchKey];
        source.forEach((srcObj, index) => {
            const josysObj = josysDevicesByMatchKey[srcObj[sourceMatchKey]];
            if (!josysObj) {
                if (assetNumberColumnValues.length > 0) {
                    const newObj = {};
                    Object.keys(srcObj).forEach(key => {
                        newObj[reverseMapping[key]] = srcObj[key];
                    });
                    entriesToAdd.push({ ...newObj, "資産番号": assetNumberColumnValues[index] });
                }
            } else {
                const diffObj = { "ID": josysObj.ID };
                let isDifferent = false;
                Object.keys(mappings).forEach(key => {
                    if (josysObj[key] !== srcObj[mappings[key]]) {
                        // console.log(`${key}: ${josysObj[key]} != ${mappings[key]}:${srcObj[mappings[key]]}`);
                        diffObj[key] = srcObj[mappings[key]];
                        isDifferent = true;
                    }
                });
                if (isDifferent) {
                    entriesToUpdate.push(diffObj);
                }
            }
        });

        return [entriesToAdd, entriesToUpdate];
    }

    export const modifyObjectsByKeyMapping = (objects, keyMapping) => {
        objects.forEach(obj => {
            let custom_fields: Array<object> = [];
            Object.keys(obj).forEach(key => {
                if (keyMapping.hasOwnProperty(key)) {
                    // Rename the key based on the mapping
                    obj[keyMapping[key]] = obj[key];
                    delete obj[key];
                } else {
                    custom_fields.push({ "name": key, "value": obj[key] });
                    delete obj[key];
                }
            });
            if (Object.keys(custom_fields).length > 0) {
                obj["custom_fields"] = custom_fields;
            }
        });
    }
}
