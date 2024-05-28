console.log('Content script loaded and executed');

// 你原来的 content.js 代码...
let video_container = document.querySelector('#movie_player');
const url = chrome.runtime.getURL("scripts/style.css");
let right_controls = document.querySelector('.ytp-chrome-controls');
const links = document.createElement('link');
links.rel = 'stylesheet';
links.type = 'text/css';
links.href = url;
let isChecked = false;
document.head.appendChild(links);
let subtitles = [];  // 全局字幕数组
let offsetX, offsetY;
let font_style = {};
function getVideoUrl() {
    return window.location.href;
}

function getVideoPlayer() {
    return video_container.querySelector('video');
}

function setSubtitle(title, content) {
    console.log('font_style', font_style);
    for (style in font_style) {
        title.style[style] = font_style[style];
    }
    console.log('字幕样式:', title);
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
    const loading = document.createElement('div');
    const tempContainter = document.createElement('div');
    const p = document.createElement('p');
    p.id = 'loading';
    p.innerHTML = '字幕生成中';

    loading.classList = 'loader';
    const tsos_sub_container = document.querySelector('.tsos-sub-container');
    tempContainter.classList = 'sub sub-loading';
    //插入loading
    tempContainter.appendChild(p);
    tempContainter.appendChild(loading);
    tsos_sub_container.appendChild(tempContainter);

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
                        if (notification) {
                            notification.style.display = 'block';
                            setTimeout(() => { notification.style.display = 'none'; }, 2000);
                            flag = -1;
                            tsos_sub_container.removeChild(tempContainter);
                        }
                        else {
                            const notification = document.createElement('iframe');
                            notification.src = chrome.runtime.getURL('views/notification/index.html');
                            notification.classList = 'tsos-notification';
                            notification.style.display = 'none';
                            video_container.insertBefore(notification, video_container.firstChild);
                        }

                    }
                    cacheSubtitles(subtitles);

                    console.log('现在的subtitles:', subtitles.length);
                    subtitles.push(...subtitle);
                };

                eventSource.onerror = function (err) {
                    console.error('EventSource failed:', err);
                    eventSource.close();
                };
            } else {
                console.error('Failed to start subtitle stream:', response.statusText);
                setTimeout(() => { tsos_sub_container.removeChild(tempContainter); }, 2000);

            }
        })
        .catch(error => {
            const p = document.querySelector('#loading');
            const loader = document.querySelector('.loader');
            loader.style.display = 'none';
            p.innerHTML = `<span>字幕生成失败</span>`;
            setTimeout(() => { tsos_sub_container.removeChild(tempContainter); }, 2000);

        });
}

function parseTime(timeString) {
    if (!timeString) {
        return 0;
    }
    const parts = timeString.split(':');
    return parts.reduce((acc, part) => acc * 60 + parseFloat(part.replace(',', '.')), 0);
}

function cacheSubtitles(subtitles) {
    let videoUrl = getVideoUrl();
    //去除掉&后面的内容
    const index = videoUrl.indexOf('&');
    if (index != -1) {
        videoUrl = videoUrl.split('&')[0];
    }
    // alert(videoUrl);
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
    console.log("现在的字幕长度", subtitles.length);
    if (subtitles.length <= 0) {
        return;
    }
    //如果现在的时间大于列表的最后一个字幕的结束时间，返回还没有字幕
    if (currentTime > parseTime(subtitles[subtitles.length - 1].end)) {
        return { text: '暂时还没有字幕或生成中' };
    }
    const index = '```srt';
    //     if (subtitle.text.indexOf(index)!== -1){ 
    //         console.log('@@subtitle', subtitle);

    //         return '';
    //     }


    const matchedSubtitle = subtitles.find(subtitle => {

        const start = parseTime(subtitle.start);
        const end = parseTime(subtitle.end);
        //检查字幕中是否包含’```srt‘

        return currentTime >= start && currentTime <= end;
    });

    console.log('匹配的字幕:', matchedSubtitle);
    if (!matchedSubtitle) {
        return '';
    }
    if (matchedSubtitle.text.indexOf(index) !== -1) {
        console.log('@@subtitle', matchedSubtitle);
        return '';
    }
    return matchedSubtitle;

}

function showSettings() {
    const iframe = document.getElementById('tsos-settings-iframe');
    iframe.style.display = iframe.style.display === 'none' ? 'block' : 'none';
    console.log(iframe);
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


function isCacheExist(videoUrl) {
    return new Promise((resolve, reject) => {
        try {
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
        } catch (error) {
            console.error('Error checking cache:', error);
            reject(error);
        }
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
        font_style['font-size'] = fontSize + 'px';
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
        font_style['color'] = font_color;
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

    chrome.storage.sync.get('font_background_color', function (data) {
        const font_background_color = data.font_background_color || '#000000';
        font_style['background-color'] = font_background_color;
        const subtitle = document.getElementById('tsos-subtitle');
        if (subtitle) {
            subtitle.style.backgroundColor = font_background_color;
            subtitle.style.padding = '10px';
        }
        else {
            // 使用 MutationObserver 监听 subtitle 元素的创建
            const observer = new MutationObserver((mutations, obs) => {
                const subtitle = document.getElementById('tsos-subtitle');
                if (subtitle) {
                    subtitle.style.backgroundColor = font_background_color;
                    subtitle.style.padding = '10px';
                    obs.disconnect();
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    });

    chrome.storage.sync.get('transparency', function (data) {
        const transparency = data.transparency || 100;
        font_style['opacity'] = transparency / 100;
        const subtitle = document.getElementById('tsos-subtitle');
        if (subtitle) {
            subtitle.style.opacity = transparency / 100;
        }
        else {
            // 使用 MutationObserver 监听 subtitle 元素的创建
            const observer = new MutationObserver((mutations, obs) => {
                const subtitle = document.getElementById('tsos-subtitle');
                if (subtitle) {
                    subtitle.style.opacity = transparency / 100;
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


function parseSRTTime(srtTime) {
    let [hours, minutes, secondsAndMilliseconds] = srtTime.split(':');
    let [seconds, milliseconds] = secondsAndMilliseconds.split(',');
    console.log('srt time ',(parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseInt(seconds) + (parseInt(milliseconds) / 1000));
    return (parseInt(hours) * 3600) + (parseInt(minutes) * 60) + parseInt(seconds) + (parseInt(milliseconds) / 1000);
}

function formatSRTTime(totalSeconds) {
    let hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    let minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    let seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    let milliseconds = Math.floor((totalSeconds % 1) * 1000).toString().padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
}



function adjustSubtitles(subtitles, offsetSeconds) {
    return subtitles.map(subtitle => {
        let startSeconds = parseSRTTime(subtitle.start) - parseInt(offsetSeconds);
        let endSeconds = parseSRTTime(subtitle.end) - parseInt(offsetSeconds);
        console.log("startSeconds", startSeconds);
        console.log("endSeconds", endSeconds);
        // 确保时间不变为负值
        startSeconds = Math.max(startSeconds, 0);
        endSeconds = Math.max(endSeconds, 0);
        
        return {
            ...subtitle,
            start: formatSRTTime(startSeconds),
            end: formatSRTTime(endSeconds)
        };
    });
}



function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {


        if (request.action === 'setFont' && request.fontSize) {
            const fontSize = request.fontSize;
            const subtitle = document.getElementById('tsos-subtitle');
            font_style['font-size'] = fontSize + 'px';

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
            font_style['color'] = request.color;
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
        if (request.action === 'setFontBgColor' && request.color) {
            font_style['background-color'] = request.color;
            const subtitle = document.getElementById('tsos-subtitle');
            if (subtitle) {
                subtitle.style.backgroundColor = request.color;
            }
            else {
                // 使用 MutationObserver 监听 subtitle 元素的创建
                const observer = new MutationObserver((mutations, obs) => {
                    const subtitle = document.getElementById('tsos-subtitle');
                    if (subtitle) {
                        subtitle.style.backgroundColor = request.color;
                        subtitle.style.padding = '10px';
                        obs.disconnect();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
        }
        if (request.action === 'setTransparency' && request.value) {
            font_style['opacity'] = request.value / 100;
            const subtitle = document.getElementById('tsos-subtitle');
            if (subtitle) {
                console.log(parseInt(request.value) / 100);


                subtitle.style.opacity = request.value / 100;

            }
            else {
                // 使用 MutationObserver 监听 subtitle 元素的创建
                const observer = new MutationObserver((mutations, obs) => {
                    const subtitle = document.getElementById('tsos-subtitle');
                    if (subtitle) {
                        //设置背景透明度
                        //获取现在的背景颜色
                        console.log(parseInt(request.value) / 100);
                        subtitle.style.opacity = parseInt(request.value) / 100;
                        obs.disconnect();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
        }
        if (request.action === 'setBgTransparency' && request.value) {
            const subtitle = document.getElementById('tsos-subtitle');
            font_style['background-color'] = 'transparent';
            if (subtitle) {
                console.log(parseInt(request.value) / 100);
                subtitle.style.backgroundColor = 'rgba(0,0,0,' + request.value / 100 + ')';
            }
            else {
                // 使用 MutationObserver 监听 subtitle 元素的创建
                const observer = new MutationObserver((mutations, obs) => {
                    const subtitle = document.getElementById('tsos-subtitle');
                    if (subtitle) {
                        //设置背景透明
                        subtitle.style.backgroundColor = 'transparent';
                        obs.disconnect();
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }
        }
        if (request.action === 'setSynchronization' && request.value) {
            if (subtitles) {
        

                subtitles = adjustSubtitles(subtitles, request.value);
                console.log('字幕同步完成', subtitles);
            }
            else {
                // 使用 MutationObserver 监听 subtitle 元素的创建
                const observer = new MutationObserver((mutations, obs) => {

                    if (subtitles) {
                        // subtitles.forEach(subtitle => {

                        //     // subtitle.start = (parseFloat(subtitle.start) + parseFloat(request.value)).toFixed(3);
                        //     // subtitle.end = (parseFloat(subtitle.end) + parseFloat(request.value)).toFixed(3);
                        // });
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

    const container_main = document.getElementById('video-stream');
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
    if (!isChecked) {
        return;
    }
    const sub_container = document.createElement("div");
    const title = document.createElement("span");
    sub_container.appendChild(title);
    sub_container.classList = 'tsos-sub-container ytp-player-content ytp-iv-player-content';
    title.classList = "sub";
    title.id = "tsos-subtitle";
    title.addEventListener("mousedown", handleDrag);
    for (style in font_style) {
        title.style[style] = font_style[style];
    }
    video_container.insertBefore(sub_container, video_container.firstChild);

    const videoUrl = getVideoUrl();

    isCacheExist(videoUrl)
        .then(result => {
            if (result.exists) {
                console.log('字幕缓存存在', result.data);
                subtitles = result.data;
            } else {
                console.log('字幕缓存不存在');
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
            console.log('遍历字幕', currentSubtitle);
            setSubtitle(title, currentSubtitle ? currentSubtitle.text : '');
        });
    }
}

function deactivate() {
    const container = document.querySelector(".tsos-sub-container");
    if (container) {
        container.remove();
    }
    const notification = document.querySelector('.tsos-notification');
    if (notification) {
        notification.remove();
    }
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

function observeDom() {
    // 选择需要观察变动的节点
    // 定义要观察的目标节点
    const targetNode = document.body;

    // 配置观察选项
    const config = { childList: true, subtree: true };

    // 创建一个 MutationObserver 实例，并定义当 DOM 变化时执行的回调函数
    const observer = new MutationObserver((mutationsList, observer) => {
        for (let mutation of mutationsList) {
            if (mutation.type === 'childList') {
                // 检查是否存在特定的元素
                const element = document.getElementById('movie_player');
                if (element) {
                    video_container = element;
                    right_controls = document.querySelector('.ytp-chrome-controls');
                    console.log(element);
                    init();
                    observeUrlChange();
                    // 可以在此执行一些操作，如解绑观察器
                    observer.disconnect();
                    break;
                }

            }
        }
    });

    // 启动观察器
    observer.observe(targetNode, config);

    // 在特定条件下可以停止观察
    // observer.disconnect();


}

observeDom();
