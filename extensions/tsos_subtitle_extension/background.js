chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.font_size?.newValue) {
        console.log("字体改变：", changes.font_size.newValue);
        //   setDebugMode(debugMode);
        setFont(changes.font_size.newValue);
    }
    if (area === 'sync' && changes.font_color?.newValue) { 
        console.log("字体颜色改变：", changes.font_color.newValue);
        setFontColor(changes.font_color.newValue);
    }

});

function setFont(font_size) {
    // 获取所有打开的标签页
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            // 向每个标签页发送消息
            chrome.tabs.sendMessage(tab.id, { action: 'setFont', fontSize: font_size });
        });
    });
}

function setFontColor(color) {
    // 获取所有打开的标签页
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            // 向每个标签页发送消息
            chrome.tabs.sendMessage(tab.id, { action: 'setFontColor', color: color });
        });
    });
}