namespace ComputeDiffs {
    // This converts the headers in sheet to Josys columns. Used for both freee sheet and josys sheet.
    export const columnsToJosysColumns = {
        "姓": "last_name",
        "名": "first_name",
        "メールアドレス": "email",
        "従業員番号": "user_id",
        "入社日": "start_date",
        "退社日": "end_date",
        "ステータス": "status",
        "ID": "uuid",
        "役職": "job_title",
        "ユーザー名": "username"
    }

    export const columnsToUpdate = ["status", "start_date", "end_date", "job_title", "email"];

    export const computeDiff = (sourceSheetName = "freee", josysSheetName = "josys") => {
        let josysSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(josysSheetName);
        if (!josysSheet) {
            return
        }
        let josysMembers = josysSheet.getRange(2, 1, josysSheet.getLastRow(), josysSheet.getLastColumn()).getValues();
        let josysColumns = josysMembers.shift();
        josysMembers = Utils.createObjectArrayFrom2dArray(josysColumns, josysMembers);

        let sourceSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sourceSheetName);
        if (!sourceSheet) {
            return
        }
        let sourceMembers = sourceSheet.getRange(2, 1, sourceSheet.getLastRow(), sourceSheet.getLastColumn()).getValues();
        let sourceColumns = sourceMembers.shift();
        sourceMembers = Utils.createObjectArrayFrom2dArray(sourceColumns, sourceMembers);

        ComputeDiffs.modifyObjectsByKeyMapping(josysMembers, ComputeDiffs.columnsToJosysColumns);
        ComputeDiffs.modifyObjectsByKeyMapping(sourceMembers, ComputeDiffs.columnsToJosysColumns);
        sourceMembers = ComputeDiffs.removeEmployeesWithoutMandatoryColumns(sourceMembers, ["email", "status", "last_name"]);
        Utils.changeDateFormatToString(josysMembers);
        Utils.changeDateFormatToString(sourceMembers);

        // compare uuid in sourceMembers to username in josysMembers to match, and if it matches, test if any column in columnsToUpdate are updated
        return ComputeDiffs.compareAndCategorize(sourceMembers, josysMembers, ["uuid", "username"], ComputeDiffs.columnsToUpdate);
    };

    export const modifyObjectsByKeyMapping = (arrayOfObjects, keyMapping) => {
        arrayOfObjects.forEach(obj => {
            Object.keys(obj).forEach(key => {
                if (keyMapping.hasOwnProperty(key)) {
                    // Rename the key based on the mapping
                    obj[keyMapping[key]] = obj[key];
                    delete obj[key];
                } else {
                    // Remove the key not present in the mapping
                    delete obj[key];
                }
            });
        });
    }

    export const removeEmployeesWithoutMandatoryColumns = (employees, keys) => {
        return employees.filter(employee => {
            return keys.every(key => employee.hasOwnProperty(key) && employee[key] !== null && employee[key] !== '');
        });
    }

    export const compareAndCategorize = (source: Array<{ [key: string]: any }>, josys: Array<{ [key: string]: any }>, matchKeys: Array<string>, keysToCompare: Array<string>) => {
        let entriesToAdd: Array<{ [key: string]: any }> = [];
        let entriesToUpdate: Array<{ [key: string]: any }> = [];

        const josysByMatchKey = josys.reduce((acc, obj) => {
            acc[obj[matchKeys[1]]] = obj;
            return acc;
        }, {});

        source.forEach(srcObj => {
            const josysObj = josysByMatchKey[srcObj[matchKeys[0]]];

            if (!josysObj) {
                if (srcObj["status"] !== "退職済") {
                    // add freee HR id as username
                    srcObj["username"] = srcObj["uuid"];
                    entriesToAdd.push(srcObj);
                }
            } else {
                const diffObj = { uuid: josysObj.uuid };
                let isDifferent = false;

                keysToCompare.forEach(key => {
                    if (srcObj[key] !== josysObj[key]) {
                        diffObj[key] = srcObj[key];
                        isDifferent = true;
                    }
                });

                // Check if the email is different and handle accordingly
                if (srcObj["email"] !== josysObj["email"]) {
                    diffObj["personal_email"] = josysObj["email"];
                }

                if (isDifferent) {
                    entriesToUpdate.push(diffObj);
                }
            }
        });

        return [entriesToAdd, entriesToUpdate];
    }

}