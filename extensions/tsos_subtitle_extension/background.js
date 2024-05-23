chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.action === "fetch_subtitles") {
        console.log(request,"@request");
      fetch(request.url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request.body)
      })
      .then(response => response.json())
      .then(data => sendResponse({ success: true, data: data }))
      .catch(error => sendResponse({ success: false, error: error.toString() }));
      return true; // Keeps the message channel open for sendResponse
    }
    if (request.action === 'set_font_size') {
    chrome.storage.sync.set({ fontSize: request.fontSize }, function() {
        sendResponse({ success: true });
    });
        if (request.action === 'get_font_size') {
            chrome.storage.sync.get('fontSize', function(data) {
                sendResponse({ success: true, fontSize: data.fontSize });
            });
        }
        
    }



  });
  