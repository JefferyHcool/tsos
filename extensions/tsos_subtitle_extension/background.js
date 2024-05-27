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
    if (area === 'sync' && changes.font_background_color?.newValue) {
        console.log("背景颜色改变：", changes.font_background_color.newValue);
        //   setDebugMode(debugMode);
        setFontBgColor(changes.font_background_color.newValue);
    }

    if (area === 'sync' && changes.transparency?.newValue) {
        console.log("透明度改变：", changes.transparency.newValue);
        //   setDebugMode(debugMode);
        setTransparency(changes.transparency.newValue);
    }
    if (area === 'sync' && changes.bgTransparent?.newValue) { 
        console.log("背景透明度改变：", changes.bgTransparent.newValue);
        //   setDebugMode(debugMode);
        setBgTransparency(changes.bgTransparent.newValue);
    
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

function setBgTransparency(value) { 
    // 获取所有打开的标签页
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            // 向每个标签页发送消息
            chrome.tabs.sendMessage(tab.id, { action: 'setBgTransparency', value: value });
        });
    });

}

function setTransparency(value) {
    
    // 获取所有打开的标签页
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            // 向每个标签页发送消息
            chrome.tabs.sendMessage(tab.id, { action: 'setTransparency', value: value });
        });
    });
}

function setFontBgColor(color) {

    // 获取所有打开的标签页

    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            // 向每个标签页发送消息
            chrome.tabs.sendMessage(tab.id, { action: 'setFontBgColor', color: color });
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