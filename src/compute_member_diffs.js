const JOSYS_MEMBER_COLUMNS_ROW_NUM = 6;
const HRMS_MEMBER_COLUMNS_ROW_NUM = 7;
const START_COL_OF_MEMBER_COLUMNS = 3;
const JOSYS_MEMBER_MATCH_KEY_ROW_NUM = 11;
const HRMS_MEMBER_MATCH_KEY_ROW_NUM = 12;
// const COL_VAL_MATCHING_START_ROW = 19;
// const COL_VAL_MATCHING_START_COL = 2;

const JosysMemberColumnsJP2ENMapping = {
    "ID": "uuid",
    "姓": "last_name",
    "名": "first_name",
    "従業員番号": "user_id",
    "入社日": "start_date",
    "退職日": "end_date",
    "ステータス": "status",
    "役職": "job_title",
    "メールアドレス": "email",
    "個人メールアドレス": "personal_email",
    "メンバー種別": "user_category",
    "ユーザー名": "username",
    "メモ": "additional_information",
    "部署": "department_uuids"
}

class ComputeMemberDiffs {
    static readColumnMappingsFromSheet(sheetName = "") {
        if (sheetName === "") {
            sheetName = MEMBER_CONFIG_SHEET_NAME;
        }
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }
        const lastColumn = ComputeMemberDiffs.getLastColumnNumber(sheet, JOSYS_MEMBER_COLUMNS_ROW_NUM);
        let range = sheet.getRange(JOSYS_MEMBER_COLUMNS_ROW_NUM, START_COL_OF_MEMBER_COLUMNS, 1, lastColumn - START_COL_OF_MEMBER_COLUMNS + 1);
        let josysColumns = range.getValues().flat();
        range = sheet.getRange(HRMS_MEMBER_COLUMNS_ROW_NUM, START_COL_OF_MEMBER_COLUMNS, 1, lastColumn - START_COL_OF_MEMBER_COLUMNS + 1);
        let hrmsColumns = range.getValues().flat();
        for (let i = hrmsColumns.length - 1; i >= 0; i--) {
            while (hrmsColumns[i] === "") {
                hrmsColumns.splice(i, 1);
                josysColumns.splice(i, 1);
            }
        }
        return [josysColumns, hrmsColumns];
    }

    static readMatchKeyFromSheet(sheetName = "") {
        if (sheetName === "") {
            sheetName = MEMBER_CONFIG_SHEET_NAME;
        }
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
        if (!sheet) {
            throw new Error(`Sheet with name ${sheetName} not found`);
        }
        const josysMatchKey = sheet.getRange(JOSYS_MEMBER_MATCH_KEY_ROW_NUM, START_COL_OF_MEMBER_COLUMNS).getValue();
        const hrmsMatchKey = sheet.getRange(HRMS_MEMBER_MATCH_KEY_ROW_NUM, START_COL_OF_MEMBER_COLUMNS).getValue();
        return [josysMatchKey, hrmsMatchKey];
    }

    static computeMemberDiff(sourceMembers, josysMembers) {
        const [josysColumns, sourceColumns] = ComputeMemberDiffs.readColumnMappingsFromSheet(MEMBER_CONFIG_SHEET_NAME);
        const [josysMatchKey, hrmsMatchKey] = ComputeMemberDiffs.readMatchKeyFromSheet(MEMBER_CONFIG_SHEET_NAME);
        console.log(`ジョーシス項目：${josysMatchKey}`);
        console.log(`人事システム項目：${hrmsMatchKey}`);
        const josysCol2SourceCol = {};
        for (let i = 0; i < josysColumns.length; i++) {
            josysCol2SourceCol[josysColumns[i]] = sourceColumns[i];
        }
        console.log(josysCol2SourceCol);
        let [membersToAdd, membersToUpdate] = ComputeMemberDiffs.compareAndCategorize(sourceMembers, josysMembers, josysCol2SourceCol, hrmsMatchKey, josysMatchKey);
        membersToAdd = ComputeMemberDiffs.validateNewMembers(membersToAdd);
        membersToAdd = ComputeMemberDiffs.dropEmptyColumns(membersToAdd);
        membersToUpdate = ComputeMemberDiffs.validateUpdatedMembers(membersToUpdate);
        ComputeMemberDiffs.renameKeys(membersToAdd, JosysMemberColumnsJP2ENMapping);
        ComputeMemberDiffs.renameKeys(membersToUpdate, JosysMemberColumnsJP2ENMapping);
        return [membersToAdd, membersToUpdate];
    }

    static validateNewMembers(membersToAdd) {
        const validMembers = [];
        membersToAdd.forEach(member => {
            if (ComputeMemberDiffs.checkMandatoryColumnsExistForNewMember(member) && ComputeMemberDiffs.checkValidValuesForDropdownColumns(member)) {
                validMembers.push(member);
            }
        });
        return validMembers;
    }

    static validateUpdatedMembers(membersToUpdate) {
        const validMembers = [];
        membersToUpdate.forEach(member => {
            if (ComputeMemberDiffs.checkValidValuesForDropdownColumns(member)) {
                validMembers.push(member);
            }
        });
        return validMembers;
    }

    static checkMandatoryColumnsExistForNewMember(member) {
        return member.hasOwnProperty("姓") && member["姓"] !== "" &&
            member.hasOwnProperty("ステータス") && member["ステータス"] !== "" &&
            ((member.hasOwnProperty("メールアドレス") && member["メールアドレス"] !== "") || (member.hasOwnProperty("従業員番号") && member["従業員番号"] !== ""));
    }

    static dropEmptyColumns(members) {
        return members.map(member => {
            for (const key in member) {
                if (member[key] === "") {
                    delete member[key];
                }
            }
            return member;
        });
    }

    static checkValidValuesForDropdownColumns(member) {
        const validStatuses = ["在籍中", "退職済", "休職中", "その他", "入社前"];
        const validMemberTypes = ["", "役員", "正社員", "派遣社員", "業務委託", "パート・アルバイト", "契約社員", "出向社員", "外部", "システム", "その他"];

        if (member.hasOwnProperty("ステータス")) {
            if (!validStatuses.includes(member["ステータス"])) {
                return false;
            }
        }

        if (member["ステータス"] === "退職済") {
            if (!member.hasOwnProperty("退職日") || member["退職日"] === "") {
                return false;
            }
        }

        if (member["ステータス"] !== "退職済") {
            if (member.hasOwnProperty("退職日") && member["退職日"] !== "") {
                return false;
            }
        }

        if (member.hasOwnProperty("メンバー種別")) {
            if (member["メンバー種別"] && !validMemberTypes.includes(member["メンバー種別"])) {
                return false;
            }
        }
        return true;
    }

    static compareAndCategorize(sourceMembers, josysMembers, josysCol2SourceCol, hrmsMatchKey, josysMatchKey) {
        let entriesToAdd = [];
        let entriesToUpdate = [];

        const josysMembersByMatchKeyValue = josysMembers.reduce((acc, obj) => {
            if (obj[josysMatchKey] && obj[josysMatchKey] !== "") {
                acc[obj[josysMatchKey]] = obj;
            }
            return acc;
        }, {});

        const sourceCol2JosysCol = {};
        Object.keys(josysCol2SourceCol).forEach(key => {
            sourceCol2JosysCol[josysCol2SourceCol[key]] = key;
        });

        sourceMembers.forEach((srcObj, index) => {
            const josysObj = josysMembersByMatchKeyValue[srcObj[hrmsMatchKey]];
            if (!josysObj) {
                const newMember = {};
                Object.keys(josysCol2SourceCol).forEach(josysColumn => {
                    const sourceColumn = josysCol2SourceCol[josysColumn];
                    let sourceValue = srcObj[sourceColumn];
                    newMember[josysColumn] = sourceValue;
                });
                entriesToAdd.push(newMember);
            } else {
                const diffObj = { "ID": josysObj.ID };
                let isDifferent = false;
                Object.keys(josysCol2SourceCol).forEach(josysColumn => {
                    const josysValue = josysObj[josysColumn];
                    const sourceColumn = josysCol2SourceCol[josysColumn];
                    let sourceValue = srcObj[sourceColumn];
                    if (sourceValue !== josysValue) {
                        isDifferent = true;
                        diffObj[josysColumn] = sourceValue;
                    }
                });
                if (isDifferent) {
                    entriesToUpdate.push(diffObj);
                }
            }
        });
        return [entriesToAdd, entriesToUpdate];
    }

    static renameKeys(objects, keyMapping) {
        objects.forEach(obj => {
            Object.keys(obj).forEach(key => {
                if (keyMapping.hasOwnProperty(key)) {
                    obj[keyMapping[key]] = obj[key];
                    delete obj[key];
                }
            });
        });
    }

    static getLastColumnNumber(sheet, row) {
        const lastColumn = sheet.getLastColumn();
        const values = sheet.getRange(row, 1, 1, lastColumn).getValues()[0];
        for (let col = lastColumn - 1; col >= 0; col--) {
            if (values[col] !== "") {
                return col + 1;
            }
        }
        return 0; // If the row is empty, return 0
    }
}
