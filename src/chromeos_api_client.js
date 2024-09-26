class ChromeosClient {
    getChromeOsDevices() {
        let pageToken;
        let results = [];
        do {
            let response = AdminDirectory.Chromeosdevices.list('my_customer', {
                maxResults: 300, // 300 is the max
                pageToken: pageToken
            });
            let chromeDevices = response.chromeosdevices;
            if (chromeDevices && chromeDevices.length > 0) {
                results = [...results, ...chromeDevices];
            }
            pageToken = response.nextPageToken;
        } while (pageToken);
        return results;
    }
}

// https://chatgpt.com/share/66e6490a-5148-8001-bca2-72e6856f0f52