document.addEventListener("DOMContentLoaded", () => {
  chrome.runtime.sendMessage({ type: "GET_HISTORY" }, (response) => {
    const history = response && response.history ? response.history : [];
    const domainMap = {};
    const categoryMap = {};

    // 简单分类映射
    const categoryDict = {
      "news": ["cnn.com", "bbc.com", "nytimes.com", "news"],
      "social": ["facebook.com", "twitter.com", "weibo.com", "instagram.com", "social"],
      "video": ["youtube.com", "bilibili.com", "vimeo.com", "video"],
      "shopping": ["amazon.com", "jd.com", "taobao.com", "shopping"],
      "search": ["google.com", "bing.com", "baidu.com", "search"],
      "tech": ["github.com", "stackoverflow.com", "tech"],
      "other": []
    };

    function getCategory(domain) {
      for (const [cat, arr] of Object.entries(categoryDict)) {
        if (arr.some(key => domain.includes(key))) return cat;
      }
      return "other";
    }

    history.forEach((entry) => {
      try {
        if (!entry.url) return;
        const url = new URL(entry.url);
        const domain = url.hostname.replace(/^www\./, '');
        const count = entry.visitCount || 1;
        domainMap[domain] = (domainMap[domain] || 0) + count;
        const cat = getCategory(domain);
        categoryMap[cat] = (categoryMap[cat] || 0) + count;
      } catch (e) {}
    });

    // Top 10 domains
    const sorted = Object.entries(domainMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // 调试输出
    console.log("sorted domains:", sorted);

    // 列表
    const list = document.getElementById('history-list');
    list.innerHTML = "";
    sorted.forEach(([domain, count]) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="domain">${domain}</span><span class="count">${count}</span>`;
      list.appendChild(li);
    });

    // 柱状图数据
    const barLabels = sorted.map(([domain]) => domain);
    const barData = sorted.map(([, count]) => count);

    // 调试输出
    console.log("barLabels:", barLabels);
    console.log("barData:", barData);

    // 饼图数据
    const pieLabels = Object.keys(categoryMap);
    const pieData = Object.values(categoryMap);

    // 调试输出
    console.log("pieLabels:", pieLabels);
    console.log("pieData:", pieData);

    // 清空旧图表
    const barChartCanvas = document.getElementById('barChart');
    const pieChartCanvas = document.getElementById('pieChart');
    if (barChartCanvas) {
      barChartCanvas.width = barChartCanvas.width; // 清空
    }
    if (pieChartCanvas) {
      pieChartCanvas.width = pieChartCanvas.width;
    }

    // 渲染柱状图
    if (barLabels.length && barData.length && typeof Chart !== "undefined") {
      new Chart(barChartCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: barLabels,
          datasets: [{
            label: 'Visits',
            data: barData,
            backgroundColor: 'rgba(79,140,255,0.7)'
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#2d3a4b', font: { size: 14 } } },
            y: { beginAtZero: true, ticks: { color: '#2d3a4b' } }
          }
        }
      });
    }

    // 渲染饼图
    if (pieLabels.length && pieData.length && typeof Chart !== "undefined") {
      new Chart(pieChartCanvas.getContext('2d'), {
        type: 'pie',
        data: {
          labels: pieLabels,
          datasets: [{
            data: pieData,
            backgroundColor: [
              '#4f8cff', '#38e8ff', '#ffb347', '#ff6666', '#7ed957', '#b366ff', '#cccccc'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });
    }
  });
});
