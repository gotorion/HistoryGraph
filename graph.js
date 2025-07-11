// 全局变量
let currentHistory = [];
let charts = {};
let domainCategoryTable = null;
let categoryTableLoaded = false;

// 常见多级后缀
const multiLevelTLDs = [
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'com.hk', 'com.tw', 'com.au', 'com.br', 'com.tr', 'com.sa', 'com.sg', 'com.my', 'com.ph', 'com.mx', 'com.ar', 'com.pl', 'com.ru', 'com.ua', 'com.id', 'com.vn', 'com.eg', 'com.ng', 'com.pk', 'com.bd', 'com.co', 'com.pe', 'com.cl', 'com.ec', 'com.bo', 'com.py', 'com.uy', 'com.ve', 'com.do', 'com.gt', 'com.hn', 'com.ni', 'com.pa', 'com.cr', 'com.sv', 'com.cu', 'com.jm', 'com.tt', 'com.bb', 'com.bs', 'com.ag', 'com.ai', 'com.bz', 'com.dm', 'com.gd', 'com.kn', 'com.lc', 'com.ms', 'com.vc', 'com.sr', 'com.gy', 'com.fj', 'com.pg', 'com.sb', 'com.to', 'com.ws', 'com.ki', 'com.nr', 'com.tv', 'com.fm', 'com.cx', 'com.cc', 'com.nu', 'com.tk', 'com.mw', 'com.na', 'com.sz', 'com.bw', 'com.ls', 'com.mg', 'com.mu', 'com.sc', 'com.sd', 'com.sl', 'com.sn', 'com.tg', 'com.tn', 'com.ug', 'com.zm', 'com.zw', 'com.cm', 'com.ci', 'com.dj', 'com.er', 'com.et', 'com.ga', 'com.gm', 'com.gn', 'com.gq', 'com.lr', 'com.ml', 'com.ne', 'com.rw', 'com.st', 'com.td', 'com.tg', 'com.tz', 'com.bf', 'com.bi', 'com.cg', 'com.cd', 'com.cf', 'com.cv', 'com.dj', 'com.gq', 'com.gw', 'com.km', 'com.mr', 'com.so', 'com.td', 'com.tg', 'com.tn', 'com.ao', 'com.bj', 'com.bf', 'com.ci', 'com.cm', 'com.dj', 'com.dz', 'com.eg', 'com.er', 'com.et', 'com.ga', 'com.gh', 'com.gm', 'com.gn', 'com.gq', 'com.ke', 'com.km', 'com.lr', 'com.ls', 'com.ly', 'com.ma', 'com.mg', 'com.ml', 'com.mr', 'com.mu', 'com.mw', 'com.na', 'com.ne', 'com.ng', 'com.rw', 'com.sc', 'com.sd', 'com.sl', 'com.sn', 'com.so', 'com.st', 'com.sz', 'com.td', 'com.tg', 'com.tn', 'com.ug', 'com.zm', 'com.zw'
];

// 加载本地域名分类表
fetch('domain_categories.json')
  .then(res => res.json())
  .then(json => { domainCategoryTable = json; categoryTableLoaded = true; loadHistoryData(); })
  .catch(() => { domainCategoryTable = null; categoryTableLoaded = true; loadHistoryData(); });

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners();
  // loadHistoryData(); // 不再直接调用loadHistoryData
});

// 初始化事件监听器
function initializeEventListeners() {
  document.getElementById('timeRange').addEventListener('change', loadHistoryData);
  document.getElementById('refreshBtn').addEventListener('click', loadHistoryData);
  document.getElementById('exportCSV').addEventListener('click', exportToCSV);
  document.getElementById('exportJSON').addEventListener('click', exportToJSON);
}

// 加载历史数据
function loadHistoryData() {
  if (!categoryTableLoaded) return; // 分类表未加载完，等待
  const timeRange = document.getElementById('timeRange').value;
  
  chrome.runtime.sendMessage({ 
    type: "GET_HISTORY", 
    timeRange: timeRange 
  }, (response) => {
    if (response && response.history) {
      currentHistory = response.history;
      processHistoryData();
    }
  });
}

// 处理历史数据
function processHistoryData() {
  const domainMap = {};
  const categoryMap = {};
  const timeMap = {};
  const dailyMap = {};
  const searchKeywords = [];
  const recentVisits = [];

  // 处理每条历史记录
  currentHistory.forEach((entry) => {
    try {
      if (!entry.url) return;
      
      const url = new URL(entry.url);
      const domain = url.hostname.replace(/^www\./, '');
      const count = entry.visitCount || 1;
      const visitTime = entry.lastVisitTime || Date.now();
      
      // 域名统计
      domainMap[domain] = (domainMap[domain] || 0) + count;
      
      // 分类统计
      const category = getCategory(domain);
      categoryMap[category] = (categoryMap[category] || 0) + count;
      
      // 时间分析
      const date = new Date(visitTime);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];
      
      // 小时分布
      if (!timeMap[hour]) timeMap[hour] = 0;
      timeMap[hour] += count;
      
      // 每日趋势
      if (!dailyMap[dateStr]) dailyMap[dateStr] = 0;
      dailyMap[dateStr] += count;
      
      // 搜索关键词提取
      if (url.searchParams.has('q') || url.searchParams.has('query') || url.searchParams.has('search')) {
        const keyword = url.searchParams.get('q') || url.searchParams.get('query') || url.searchParams.get('search');
        if (keyword && keyword.length > 2) {
          searchKeywords.push(keyword);
        }
      }
      
      // 最近访问
      recentVisits.push({
        domain: domain,
        url: entry.url,
        title: entry.title || domain,
        time: visitTime
      });
      
    } catch (e) {
      console.error('Error processing entry:', e);
    }
  });

  // 更新统计概览
  updateStatsOverview(domainMap, timeMap);
  
  // 更新图表
  updateCharts(domainMap, categoryMap, timeMap, dailyMap);
  
  // 更新搜索关键词
  updateSearchKeywords(searchKeywords);
  
  // 更新列表
  updateLists(domainMap, recentVisits);
}

// 提取主域名，支持多级后缀
function getRootDomain(domain) {
  domain = domain.replace(/^www\./, '');
  for (const tld of multiLevelTLDs) {
    if (domain.endsWith('.' + tld)) {
      const parts = domain.split('.');
      return parts.slice(-tld.split('.').length - 1).join('.');
    }
  }
  const parts = domain.split('.');
  if (parts.length > 2) {
    return parts.slice(-2).join('.');
  }
  return domain;
}

// 获取网站分类
function getCategory(domain) {
  const root = getRootDomain(domain);
  if (domainCategoryTable && domainCategoryTable[root]) {
    return domainCategoryTable[root];
  }
  // 调试输出
  // console.log('未分类:', domain, '主域名:', root);
  return "other";
}

// 更新统计概览
function updateStatsOverview(domainMap, timeMap) {
  const totalVisits = Object.values(domainMap).reduce((sum, count) => sum + count, 0);
  const uniqueDomains = Object.keys(domainMap).length;
  
  // 找到最活跃时段
  let peakHour = '-';
  let maxVisits = 0;
  for (const [hour, visits] of Object.entries(timeMap)) {
    if (visits > maxVisits) {
      maxVisits = visits;
      peakHour = `${hour}:00`;
    }
  }
  
  // 找到最常访问的域名
  const topDomain = Object.entries(domainMap)
    .sort((a, b) => b[1] - a[1])[0];
  
  document.getElementById('totalVisits').textContent = totalVisits.toLocaleString();
  document.getElementById('uniqueDomains').textContent = uniqueDomains.toLocaleString();
  document.getElementById('peakHour').textContent = peakHour;
  document.getElementById('topDomain').textContent = topDomain ? topDomain[0] : '-';
}

// 更新图表
function updateCharts(domainMap, categoryMap, timeMap, dailyMap) {
  // 清理旧图表
  Object.values(charts).forEach(chart => {
    if (chart) chart.destroy();
  });
  charts = {};
  
  // 柱状图 - Top Domains
  updateBarChart(domainMap);
  
  // 饼图 - Category Distribution
  updatePieChart(categoryMap);
  
  // 时间分布图
  updateTimeChart(timeMap);
  
  // 每日趋势图
  updateDailyChart(dailyMap);
}

// 更新柱状图
function updateBarChart(domainMap) {
  const sorted = Object.entries(domainMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const barLabels = sorted.map(([domain]) => domain);
  const barData = sorted.map(([, count]) => count);
  
  const ctx = document.getElementById('barChart').getContext('2d');
  charts.barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{
        label: '访问次数',
        data: barData,
        backgroundColor: 'rgba(79,140,255,0.7)',
        borderColor: 'rgba(79,140,255,1)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false } 
      },
      scales: {
        x: { 
          ticks: { color: '#2d3a4b', font: { size: 12 } },
          grid: { display: false }
        },
        y: { 
          beginAtZero: true, 
          ticks: { color: '#2d3a4b' },
          grid: { color: 'rgba(0,0,0,0.1)' }
        }
      }
    }
  });
}

// 更新饼图
function updatePieChart(categoryMap) {
  const pieLabels = Object.keys(categoryMap);
  const pieData = Object.values(categoryMap);
  
  const colors = [
    '#4f8cff', '#38e8ff', '#ffb347', '#ff6666', 
    '#7ed957', '#b366ff', '#ff9f40', '#cccccc'
  ];
  
  const ctx = document.getElementById('pieChart').getContext('2d');
  charts.pieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: pieLabels,
      datasets: [{
        data: pieData,
        backgroundColor: colors.slice(0, pieLabels.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'bottom',
          labels: { color: '#2d3a4b' }
        }
      }
    }
  });
}

// 更新时间分布图
function updateTimeChart(timeMap) {
  const hours = Array.from({length: 24}, (_, i) => i);
  const data = hours.map(hour => timeMap[hour] || 0);
  
  const ctx = document.getElementById('timeChart').getContext('2d');
  charts.timeChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: hours.map(h => `${h}:00`),
      datasets: [{
        label: '访问次数',
        data: data,
        borderColor: '#4f8cff',
        backgroundColor: 'rgba(79,140,255,0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false } 
      },
      scales: {
        x: { 
          ticks: { color: '#2d3a4b', maxTicksLimit: 12 },
          grid: { color: 'rgba(0,0,0,0.1)' }
        },
        y: { 
          beginAtZero: true, 
          ticks: { color: '#2d3a4b' },
          grid: { color: 'rgba(0,0,0,0.1)' }
        }
      }
    }
  });
}

// 更新每日趋势图
function updateDailyChart(dailyMap) {
  const sortedDates = Object.keys(dailyMap).sort();
  const data = sortedDates.map(date => dailyMap[date]);
  
  const ctx = document.getElementById('dailyChart').getContext('2d');
  charts.dailyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: sortedDates.map(date => new Date(date).toLocaleDateString()),
      datasets: [{
        label: '访问次数',
        data: data,
        borderColor: '#38e8ff',
        backgroundColor: 'rgba(56,232,255,0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false } 
      },
      scales: {
        x: { 
          ticks: { color: '#2d3a4b', maxTicksLimit: 10 },
          grid: { color: 'rgba(0,0,0,0.1)' }
        },
        y: { 
          beginAtZero: true, 
          ticks: { color: '#2d3a4b' },
          grid: { color: 'rgba(0,0,0,0.1)' }
        }
      }
    }
  });
}

// 获取星期名称
function getDayName(day) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[day];
}

// 更新搜索关键词
function updateSearchKeywords(keywords) {
  const container = document.getElementById('searchKeywords');
  container.innerHTML = '';
  
  // 统计关键词频率
  const keywordCount = {};
  keywords.forEach(keyword => {
    keywordCount[keyword] = (keywordCount[keyword] || 0) + 1;
  });
  
  // 排序并显示前20个
  const sortedKeywords = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  if (sortedKeywords.length === 0) {
    container.innerHTML = '<p class="has-text-grey">暂无关键词数据</p>';
    return;
  }
  const tagGroup = document.createElement('div');
  tagGroup.className = 'tags are-medium';
  sortedKeywords.forEach(([keyword, count], idx) => {
    const span = document.createElement('span');
    // 颜色渐变：前3个is-link，4-7 is-info，8-12 is-success，其他is-light
    let color = 'is-light';
    if (idx < 3) color = 'is-link';
    else if (idx < 7) color = 'is-info';
    else if (idx < 12) color = 'is-success';
    span.className = `tag ${color} mb-2`;
    span.textContent = `${keyword} (${count})`;
    tagGroup.appendChild(span);
  });
  container.appendChild(tagGroup);
}

// 更新列表
function updateLists(domainMap, recentVisits) {
  // Top 10 domains
  const sorted = Object.entries(domainMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const list = document.getElementById('history-list');
  list.innerHTML = "";
  sorted.forEach(([domain, count], idx) => {
    const li = document.createElement('li');
    li.className = 'mb-2';
    const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;
    li.innerHTML = `
      <img src="${faviconUrl}" alt="favicon" class="mr-2" style="width:20px;height:20px;vertical-align:middle;border-radius:4px;">
      <span class="has-text-weight-semibold">${domain}</span>
      <span class="tag is-link is-light ml-2">${count} 次</span>
      <span class="tag is-rounded is-info ml-2">TOP ${idx + 1}</span>
    `;
    list.appendChild(li);
  });
  
  // 最近访问记录
  const recentList = document.getElementById('recent-list');
  recentList.innerHTML = "";
  
  const sortedRecent = recentVisits
    .sort((a, b) => b.time - a.time)
    .slice(0, 10);
  
  sortedRecent.forEach(visit => {
    const li = document.createElement('li');
    li.className = 'mb-2';
    const timeStr = new Date(visit.time).toLocaleString();
    li.innerHTML = `
      <span class="icon has-text-success mr-2"><i class="fas fa-clock"></i></span>
      <span class="has-text-weight-semibold">${visit.domain}</span>
      <span class="tag is-light ml-2">${timeStr}</span>
    `;
    recentList.appendChild(li);
  });
}

// 导出为CSV
function exportToCSV() {
  const headers = ['域名', '访问次数', '分类', '最后访问时间'];
  const rows = currentHistory.map(entry => {
    try {
      const url = new URL(entry.url);
      const domain = url.hostname.replace(/^www\./, '');
      const category = getCategory(domain);
      const time = new Date(entry.lastVisitTime || 0).toLocaleString();
      return [domain, entry.visitCount || 1, category, time];
    } catch (e) {
      return ['', '', '', ''];
    }
  });
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  downloadFile(csvContent, 'history_data.csv', 'text/csv');
}

// 导出为JSON
function exportToJSON() {
  const data = {
    exportTime: new Date().toISOString(),
    totalRecords: currentHistory.length,
    data: currentHistory
  };
  
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, 'history_data.json', 'application/json');
}

// 下载文件
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
