chrome.runtime.onInstalled.addListener(() => {
  console.log("Chrome History Analyzer installed!");
});

// 获取指定时间范围的历史记录
function getHistoryByTimeRange(startTime, endTime, callback) {
  chrome.history.search(
    {
      text: '',
      startTime: startTime,
      endTime: endTime,
      maxResults: 10000
    },
    (results) => {
      callback(results);
    }
  );
}

// 获取最近7天的历史记录
function getHistoryLast7Days(callback) {
  const microsecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
  const startTime = Date.now() - microsecondsPerWeek;
  getHistoryByTimeRange(startTime, Date.now(), callback);
}

// 获取最近30天的历史记录
function getHistoryLast30Days(callback) {
  const microsecondsPerMonth = 1000 * 60 * 60 * 24 * 30;
  const startTime = Date.now() - microsecondsPerMonth;
  getHistoryByTimeRange(startTime, Date.now(), callback);
}

// 获取最近90天的历史记录
function getHistoryLast90Days(callback) {
  const microsecondsPerQuarter = 1000 * 60 * 60 * 24 * 90;
  const startTime = Date.now() - microsecondsPerQuarter;
  getHistoryByTimeRange(startTime, Date.now(), callback);
}

// 获取访问详情（包括访问时长）
function getVisitDetails(url, callback) {
  chrome.history.getVisits({ url: url }, (visits) => {
    callback(visits);
  });
}

// 获取所有历史记录（用于完整分析）
function getAllHistory(callback) {
  chrome.history.search(
    {
      text: '',
      startTime: 0, // 修复：获取全部历史
      maxResults: 100000
    },
    (results) => {
      callback(results);
    }
  );
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_HISTORY') {
    const timeRange = request.timeRange || '7days';
    
    switch(timeRange) {
      case '7days':
        getHistoryLast7Days((data) => {
          sendResponse({ history: data });
        });
        break;
      case '30days':
        getHistoryLast30Days((data) => {
          sendResponse({ history: data });
        });
        break;
      case '90days':
        getHistoryLast90Days((data) => {
          sendResponse({ history: data });
        });
        break;
      case 'all':
        getAllHistory((data) => {
          sendResponse({ history: data });
        });
        break;
      default:
        getHistoryLast7Days((data) => {
          sendResponse({ history: data });
        });
    }
    return true; // 异步响应
  }
  
  if (request.type === 'GET_VISIT_DETAILS') {
    getVisitDetails(request.url, (visits) => {
      sendResponse({ visits: visits });
    });
    return true;
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL("graph.html") });
});
