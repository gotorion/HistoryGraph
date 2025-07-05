chrome.runtime.onInstalled.addListener(() => {
  console.log("Chrome History Analyzer installed!");
});

function getHistoryLast7Days(callback) {
  const microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
  const startTime = Date.now() - microsecondsPerWeek;

  chrome.history.search(
    {
      text: '',
      startTime: startTime,
      maxResults: 10000
    },
    (results) => {
      callback(results);
    }
  );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_HISTORY') {
    getHistoryLast7Days((data) => {
      sendResponse({ history: data });
    });
    return true; // 异步响应
  }
});
