function writeChromeosDevicesToSheet(sheetName, headerRow = 1) {
    const apiClient = new ChromeosClient();
    const results = apiClient.getChromeOsDevices();
    if (!results) {
        return;
    }
    setMostRecentUser(results);
    const columns = Utils.getColumnsFromSheet(sheetName, headerRow);
    const rowToWriteFrom = headerRow + 2;
    Utils.writeArrayToSheet(Utils.createOrdered2dArrray(results, columns), sheetName, rowToWriteFrom, 1, true);
}

function setMostRecentUser(devices) {
    devices.forEach(device => {
        if (device.recentUsers && device.recentUsers.length > 0) {
            const lastUser = device.recentUsers[device.recentUsers.length - 1];
            device["recentUsers.email"] = lastUser.email;
        }
    });
}