const video_container = document.querySelector('#movie_player');
const url = chrome.runtime.getURL("scripts/style.css");
const right_controls=document.querySelector('.ytp-chrome-controls')
const links = document.createElement('link');
links.rel = 'stylesheet';
links.type = 'text/css';
links.href = url;
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

function initPage() {
    const iframe = document.createElement('iframe');
    const container = document.createElement('div');
    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL('images/sub_icon.png');
    container.classList = 'tsos-settings ytp-button';
    container.appendChild(icon)
    iframe.id = 'tsos-settings-iframe'
    iframe.style.display = 'none';
    iframe.src = chrome.runtime.getURL('views/settings/index.html');
    container.insertBefore(iframe, container.lastChild);
    container.addEventListener('click', showSettings);
    right_controls.insertBefore(container, right_controls.lastChild);
}


function main() {
    initPage()
    console.log("开始执行 TSOS 插件");
    const sub_container = document.createElement("div");
    console.log(getVideoUrl());
    const title = document.createElement("span");
    sub_container.appendChild(title);
    sub_container.classList = 'tsos-sub-container ytp-player-content ytp-iv-player-content';
    title.classList = "sub";
    title.id = "tsos-subtitle";
    title.addEventListener("mousedown", handleDrag);
    const video = getVideoPlayer();
    video_container.insertBefore(sub_container, video_container.firstChild);
    // startSubtitleStream(getVideoUrl(), null);
    // console.log(video_container);
    // if (video) {
    //     video.addEventListener('timeupdate', () => {
    //         console.log('Current time:', video.currentTime);
    //         const currentTime = video.currentTime;
    //         console.log(subtitles);
    //         const currentSubtitle = getCurrentSubtitle(currentTime);
    //         console.log(currentSubtitle);
    //         setSubtitle(title,currentSubtitle?.text)
    //     });
    // }
}

main();
