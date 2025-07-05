chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (response) => {
  const history = response.history;
  const domainMap = {};

  history.forEach((entry) => {
    const url = new URL(entry.url);
    const domain = url.hostname;
    domainMap[domain] = (domainMap[domain] || 0) + entry.visitCount;
  });

  const sorted = Object.entries(domainMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const list = document.getElementById('history-list');
  sorted.forEach(([domain, count]) => {
    const li = document.createElement('li');
    li.textContent = `${domain}: ${count}`;
    list.appendChild(li);
  });
});
