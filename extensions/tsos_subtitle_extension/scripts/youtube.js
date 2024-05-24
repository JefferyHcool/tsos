console.log('Content script loaded and executed');

// 你原来的 content.js 代码...
const video_container = document.querySelector('#movie_player');
const url = chrome.runtime.getURL("scripts/style.css");
const right_controls = document.querySelector('.ytp-chrome-controls');
const links = document.createElement('link');
links.rel = 'stylesheet';
links.type = 'text/css';
links.href = url;
let isChecked = false;
document.head.appendChild(links);
let subtitles = [];  // 全局字幕数组
let offsetX, offsetY;

function getVideoUrl() {
    return window.location.href;
}

function getVideoPlayer() {
    return video_container.querySelector('video');
}

function setSubtitle(title, content) {
    if (!content) {
        title.classList.add('empty');
    } else {
        title.classList.remove('empty');
        title.textContent = `${content || ''}`;
    }
}

function handleDrag(e) {
    e.preventDefault();
    let subtitle = document.querySelector('#tsos-subtitle');
    offsetX = e.clientX - subtitle.offsetLeft;
    offsetY = e.clientY - subtitle.offsetTop;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e) {
    let subtitle = document.querySelector('#tsos-subtitle');
    subtitle.style.left = `${e.clientX - offsetX}px`;
    subtitle.style.top = `${e.clientY - offsetY}px`;
}

function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
}

function startSubtitleStream(videoUrl, lang) {
    let flag = 0;
    fetch('http://127.0.0.1:5000/youtube/get_srt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // 确保请求中包含会话 Cookie
        body: JSON.stringify({ video_url: videoUrl, lang: lang })
    })
        .then(response => {
            if (response.ok) {
                const eventSource = new EventSource('http://127.0.0.1:5000/youtube/get_srt_stream');

                eventSource.onmessage = function (event) {
                    const subtitle = JSON.parse(event.data);
                    console.log('Subtitle:', subtitle);
                    if (flag == 0) {
                        const notification = document.querySelector('.tsos-notification');
                        notification.style.display = 'block';
                        setTimeout(() => { notification.style.display = 'none'; }, 2000);
                        flag = -1;
                    }
                    cacheSubtitles(subtitles);

                    subtitles.push(...subtitle);
                };

                eventSource.onerror = function (err) {
                    console.error('EventSource failed:', err);
                    eventSource.close();
                };
            } else {
                console.error('Failed to start subtitle stream:', response.statusText);
            }
        })
        .catch(error => console.error('Error:', error));
}

function parseTime(timeString) {
    const parts = timeString.split(':');
    return parts.reduce((acc, part) => acc * 60 + parseFloat(part.replace(',', '.')), 0);
}

function cacheSubtitles(subtitles) {
    const videoUrl = getVideoUrl();
    console.log('Attempting to cache subtitles for', videoUrl);
    console.log('Subtitles data:', subtitles);

    chrome.storage.local.set({ [videoUrl]: subtitles }, function () {
        if (chrome.runtime.lastError) {
            console.error('Error caching subtitles:', chrome.runtime.lastError);
        } else {
            console.log('Subtitles cached for', videoUrl);
        }
    });
}

function getCurrentSubtitle(currentTime) {
    return subtitles.find(subtitle => {
        const start = parseTime(subtitle.start);
        const end = parseTime(subtitle.end);
        return currentTime >= start && currentTime <= end;
    });
}

function showSettings() {
    const iframe = document.getElementById('tsos-settings-iframe');
    iframe.style.display = iframe.style.display === 'none' ? 'block' : 'none';
    console.log(iframe);
}

function isCacheExist(videoUrl) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(videoUrl, function (result) {
            if (chrome.runtime.lastError) {
                console.error('Error accessing cache:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                if (result[videoUrl]) {
                    console.log('Cache found for', videoUrl);
                    resolve({ exists: true, data: result[videoUrl] });
                } else {
                    console.log('No cache found for', videoUrl);
                    resolve({ exists: false, data: null });
                }
            }
        });
    });
}

function setFontSize(fontSize) {
    const subtitle = document.getElementById('tsos-subtitle');
    if (subtitle) {
        subtitle.style.fontSize = `${fontSize}px`;
    }
}

function setupStorageListeners() {
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync' && changes.activated) {
            isChecked = changes.activated.newValue;
            if (isChecked) {
                activate();
                setIcon(true);
            } else {
                deactivate();
                setIcon(false);
            }
        }
    });

    chrome.storage.sync.get('font_size', function (data) {
        const fontSize = data.font_size || 16;
        const subtitle = document.getElementById('tsos-subtitle');
        if (subtitle) {
            setFontSize(fontSize);
        } else {
            // 使用 MutationObserver 监听 subtitle 元素的创建
            const observer = new MutationObserver((mutations, obs) => {
                const subtitle = document.getElementById('tsos-subtitle');
                if (subtitle) {
                    setFontSize(fontSize);
                    obs.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });

    chrome.storage.sync.get('font_color', function (data) {
        const font_color = data.font_color || '#FFFFFF';
        const subtitle = document.getElementById('tsos-subtitle');
        if (subtitle) {
            subtitle.style.color = font_color;
        }
        else {
            // 使用 MutationObserver 监听 subtitle 元素的创建
            const observer = new MutationObserver((mutations, obs) => {
                const subtitle = document.getElementById('tsos-subtitle');
                if (subtitle) {
                    subtitle.style.color = font_color;
                    obs.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });
}
function setFontColor(font_color) {
    const subtitle = document.getElementById('tsos-subtitle');
    if (subtitle) {
        subtitle.style.color = font_color;
    }
}


function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.message === "activate") {
            if (request.state) {
                activate();
                setIcon(true);
            } else {
                deactivate();
                setIcon(false);
            }
            sendResponse({ reply: "Message received and handled" });
        }

        if (request.action === 'setFont' && request.fontSize) {
            const fontSize = request.fontSize;
            const subtitle = document.getElementById('tsos-subtitle');
            if (subtitle) {
                setFontSize(fontSize);
            } else {
                // 使用 MutationObserver 监听 subtitle 元素的创建
                const observer = new MutationObserver((mutations, obs) => {
                    const subtitle = document.getElementById('tsos-subtitle');
                    if (subtitle) {
                        setFontSize(fontSize);
                        obs.disconnect();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
        }
        if (request.action === 'setFontColor' && request.color) {
            const subtitle = document.getElementById('tsos-subtitle');
            if (subtitle) {
                setFontColor(request.color);
            }
            else {
                // 使用 MutationObserver 监听 subtitle 元素的创建
                const observer = new MutationObserver((mutations, obs) => {
                    const subtitle = document.getElementById('tsos-subtitle');
                    if (subtitle) {
                        setFontColor(request.color);
                        obs.disconnect();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
        }


    });
}

function setIcon(state) {
    const icon = document.getElementById('tsos-settings-icon');
    icon.src = chrome.runtime.getURL(state ? "images/sub_icon_activated.png" : "images/sub_icon.png");
}

function createDOMElements() {
    const iframe = document.createElement('iframe');
    const container = document.createElement('div');
    const icon = document.createElement('img');
    icon.id = 'tsos-settings-icon';

    icon.src = isChecked ? chrome.runtime.getURL('images/sub_icon_activated.png') : chrome.runtime.getURL('images/sub_icon.png');
    container.classList = 'tsos-settings ytp-button';
    container.appendChild(icon);
    iframe.id = 'tsos-settings-iframe';
    iframe.style.display = 'none';
    iframe.src = chrome.runtime.getURL('views/settings/index.html');
    container.insertBefore(iframe, container.lastChild);
    container.addEventListener('click', showSettings);
    right_controls.insertBefore(container, right_controls.lastChild);

    const notification = document.createElement('iframe');
    notification.src = chrome.runtime.getURL('views/notification/index.html');
    notification.classList = 'tsos-notification';
    notification.style.display = 'none';
    video_container.insertBefore(notification, video_container.firstChild);
}

function activate() {
    const sub_container = document.createElement("div");
    const title = document.createElement("span");
    sub_container.appendChild(title);
    sub_container.classList = 'tsos-sub-container ytp-player-content ytp-iv-player-content';
    title.classList = "sub";
    title.id = "tsos-subtitle";
    title.addEventListener("mousedown", handleDrag);
    video_container.insertBefore(sub_container, video_container.firstChild);

    const videoUrl = getVideoUrl();

    isCacheExist(videoUrl)
        .then(result => {
            if (result.exists) {
                subtitles = result.data;
            } else {
                subtitles = [];
                startSubtitleStream(videoUrl, null);
            }
        })
        .catch(error => console.error('Error checking cache:', error));

    const video = getVideoPlayer();
    if (video) {
        video.addEventListener('timeupdate', () => {
            const currentTime = video.currentTime;
            const currentSubtitle = getCurrentSubtitle(currentTime);
            setSubtitle(title, currentSubtitle ? currentSubtitle.text : '');
        });
    }
}

function deactivate() {
    const container = document.querySelector(".tsos-sub-container");
    if (container) container.remove();
    subtitles = [];
}

function init() {
    setupStorageListeners();
    setupMessageListeners();
    createDOMElements();
    chrome.storage.sync.get('activated', function (data) {
        isChecked = data.activated || false;
        if (isChecked) {
            activate();
        }
        setIcon(isChecked);
    });
}

init();
