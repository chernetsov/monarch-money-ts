const $start   = document.getElementById("start");
const $stop    = document.getElementById("stop");
const $dl      = document.getElementById("download");
const $status  = document.getElementById("status");

let entries = [];
let listener = null;

function setStatus(msg) { 
  $status.textContent = msg; 
}

function updateButtonStates() {
  $start.disabled = listener !== null;
  $stop.disabled = listener === null;
  $download.disabled = entries.length === 0;
}

$start.onclick = () => {
  if (listener) return;
  
  entries = [];
  listener = req => {
    // Only capture GraphQL requests
    if (!req.request.url.includes("/graphql")) return;

    req.getContent((body) => {
      const entry = {
        url:             req.request.url,
        method:          req.request.method,
        requestHeaders:  req.request.headers,
        requestBody:     req.request.postData?.text,
        status:          req.response.status,
        responseHeaders: req.response.headers,
        responseBody:    body,
        time:            req.time,
        timestamp:       new Date().toISOString()
      };
      
      entries.push(entry);
      setStatus(`Recording... Captured ${entries.length} GraphQL requests`);
    });
  };

  chrome.devtools.network.onRequestFinished.addListener(listener);
  setStatus("Recording started. Navigate to https://app.monarchmoney.com to capture GraphQL requests...");
  updateButtonStates();
};

$stop.onclick = () => {
  if (!listener) return;
  
  chrome.devtools.network.onRequestFinished.removeListener(listener);
  listener = null;
  setStatus(`Recording stopped. Total captured: ${entries.length} requests`);
  updateButtonStates();
};

$dl.onclick = () => {
  if (!entries.length) {
    alert("Nothing to download. Start recording and interact with Monarch Money first.");
    return;
  }
  
  const blob = new Blob([JSON.stringify(entries, null, 2)], {type:"application/json"});
  const url  = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url,
    filename: `monarch-traffic-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download failed:', chrome.runtime.lastError);
      alert('Download failed: ' + chrome.runtime.lastError.message);
    } else {
      setStatus(`Download initiated. Saved ${entries.length} requests to file.`);
    }
    URL.revokeObjectURL(url);
  });
};

// Initialize button states
updateButtonStates();

// TODO: Stretch goals for future versions:
// - Toggle to auto-redact cookies / JWTs before saving
// - HAR export option
// - Background-page capture via chrome.debugger API
// - Pretty table/grid view of captured calls inside the panel 