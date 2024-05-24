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
    }
    else {
        title.classList.remove('empty');
        title.textContent = `${content || ''}`;
    }
}

function handleDrag(e) {
    e.preventDefault();
    let subtitle = document.querySelector('#tsos-subtitle');
    let x = e.clientX;
    let y = e.clientY;
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
    // Send a POST request to start the subtitle generation process
    fetch('http://127.0.0.1:5000/youtube/get_srt', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',  // 确保请求中包含会话 Cookie
        body: JSON.stringify({ video_url: videoUrl, lang: lang })
    })
        .then(response => {
            if (response.ok) {
                // If the request is successful, open an EventSource to the same endpoint
                const eventSource = new EventSource('http://127.0.0.1:5000/youtube/get_srt_stream');

                eventSource.onmessage = function (event) {
                    const subtitle = JSON.parse(event.data);
                    // Display the subtitle on the page
                    console.log('Subtitle:', subtitle);
                    if (flag == 0) {
                        const notification = document.querySelector('.tsos-notification');
                        notification.style.display = 'block';
                        setTimeout(() => {
                            notification.style.display = 'none';

                        }, 2000);
                        flag = -1;
                    }
                    cacheSubtitles(subtitles);

                    subtitles.push(...subtitle);
                    // let subtitleElement = document.querySelector('#tsos-subtitle');
                    // setSubtitle(subtitleElement, subtitle); 
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
    const seconds = parts.reduce((acc, part) => acc * 60 + parseFloat(part.replace(',', '.')), 0);
    return seconds;
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



function setup() {
    chrome.storage.sync.get('activated', function (data) {
        isChecked = data.activated;
    });

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.message === "activate") {
            console.log("Activate message received, state:", request.state);
            // 执行你的处理逻辑
            if (request.state) {
                // 激活状态的处理逻辑
                activate();
                setIcon(true);
                console.log("激活状态处理逻辑");
            } else {
                // 非激活状态的处理逻辑
                deactivate();
                setIcon(false);
                console.log("非激活状态处理逻辑");
            }
            sendResponse({ reply: "Message received and handled" });
        }
    });
}

function setIcon(state) {
    const icon = document.getElementById('tsos-settings-icon');
    icon.src = chrome.runtime.getURL(state ? "images/sub_icon_activated.png" : "images/sub_icon.png");
}

function initPage() {
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
    console.log(getVideoUrl());

    const videoUrl = getVideoUrl();
    
    const title = document.createElement("span");
    sub_container.appendChild(title);
    sub_container.classList = 'tsos-sub-container ytp-player-content ytp-iv-player-content';
    title.classList = "sub";
    title.id = "tsos-subtitle";
    title.addEventListener("mousedown", handleDrag);
    const video = getVideoPlayer();
    video_container.insertBefore(sub_container, video_container.firstChild);

    isCacheExist(videoUrl)
    .then(result => {
        if (result.exists) {
            console.log('Cache exists for', videoUrl);
            subtitles = result.data;
            console.log('Cached Subtitles:', subtitles);
        } else {
            console.log('Cache does not exist for', videoUrl);
            subtitles = [];
            startSubtitleStream(getVideoUrl(), null);
            // 处理缓存不存在的逻辑
        }
    })
    .catch(error => {
        console.error('Error checking cache:', error);
    });

    if (video) {
        video.addEventListener('timeupdate', () => {
            console.log('Current time:', video.currentTime);
            const currentTime = video.currentTime;
            console.log(subtitles);
            const currentSubtitle = getCurrentSubtitle(currentTime);
            console.log(currentSubtitle);
            setSubtitle(title, currentSubtitle?.text);
        });
    }
}

function observeUrlChange() {
    let lastUrl = window.location.href;
    
    const observer = new MutationObserver(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            console.log('URL changed to:', currentUrl);
            deactivate();
            activate();
        }
    });

    const config = { subtree: true, childList: true };
    observer.observe(document.body, config);


}

function deactivate() {
    const subtitle = document.querySelector('#tsos-subtitle');
    if (subtitle) {
        subtitle.remove();
    }
    subtitles = [];
    const video = getVideoPlayer();
    if (video) {
        video.removeEventListener('timeupdate', () => {});
    }
}

async function main() {
    await setup();
    initPage();
    observeUrlChange();
    console.log("开始执行 TSOS 插件");
}

main();