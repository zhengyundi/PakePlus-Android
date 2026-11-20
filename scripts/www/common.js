/**
 * 货运管理系统 - 公共脚本
 * 包含：工具函数、数据校验
 */

// 渲染底部版权
function renderFooter() {
  const footerHTML = `
    <div class="footer">
      © 2026 账目核对系统 版权所有
    </div>
  `;
  const wrapper = document.querySelector('.wrapper');
  if (wrapper) {
    wrapper.insertAdjacentHTML('beforeend', footerHTML);
  }
}

// ========== 数字转中文大写 ==========
function numberToChinese(num) {
  const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const units = ['', '拾', '佰', '仟'];
  const bigUnits = ['', '万', '亿'];

  if (num === 0) return '零元整';

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = '';

  if (integerPart > 0) {
    const integerStr = integerPart.toString();
    let zeroFlag = false;

    for (let i = integerStr.length - 1; i >= 0; i--) {
      const digit = parseInt(integerStr[i]);
      const pos = integerStr.length - 1 - i;

      if (digit === 0) {
        zeroFlag = true;
        if (pos % 4 === 0 && pos > 0) {
          result = bigUnits[Math.floor(pos / 4)] + result;
        }
      } else {
        if (zeroFlag && result !== '') {
          result = '零' + result;
          zeroFlag = false;
        }
        result = digits[digit] + units[pos % 4] + (pos % 4 === 0 && pos > 0 ? bigUnits[Math.floor(pos / 4)] : '') + result;
        if (pos % 4 === 0 && pos > 0) {
          // bigUnit already added
        }
      }
    }

    result = result + '元';
  } else {
    result = '零元';
  }

  if (decimalPart > 0) {
    const jiao = Math.floor(decimalPart / 10);
    const fen = decimalPart % 10;

    if (jiao > 0) {
      result += digits[jiao] + '角';
    }
    if (fen > 0) {
      result += digits[fen] + '分';
    }
  } else {
    result += '整';
  }

  return result;
}

// ========== 车牌号生成（优化版 - 符合真实货车黄牌规则） ==========
function generatePlateNumber(selectedPlates) {
  // selectedPlates 可以是简单字符串数组 ['辽','晋'] 或对象数组 [{province:'辽', letters:['B','C']}, ...]
  var pick;
  if (typeof selectedPlates[0] === 'string') {
    // 兼容旧格式
    var province = selectedPlates[Math.floor(Math.random() * selectedPlates.length)];
    pick = { province: province, letters: null };
  } else {
    pick = selectedPlates[Math.floor(Math.random() * selectedPlates.length)];
  }

  // 发牌机关代号（排除 I、O）
  const allLetters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const validNumbers = '0123456789';

  let plateNumber = pick.province;

  // 第二位：发牌机关代号
  if (pick.letters && pick.letters.length > 0) {
    plateNumber += pick.letters[Math.floor(Math.random() * pick.letters.length)];
  } else {
    plateNumber += allLetters[Math.floor(Math.random() * allLetters.length)];
  }

  // 货车黄牌后5位：以数字为主（约80%数字，20%字母），更接近真实
  for (let i = 0; i < 5; i++) {
    const isNumber = Math.random() > 0.2;
    if (isNumber) {
      plateNumber += validNumbers[Math.floor(Math.random() * validNumbers.length)];
    } else {
      plateNumber += allLetters[Math.floor(Math.random() * allLetters.length)];
    }
  }

  return plateNumber;
}

// ========== 车辆装载规划（标准一车 31-40 吨上下） ==========
// 按数量估算车数：每车约 35.5 吨，使每车自然落在 30 多吨，无需二次分配
function planVehicleCount(total, minVehicles) {
  var count = Math.max(minVehicles || 1, Math.round(total / 35.5));
  while (total / count > 45) count++; // 平均超过 45 吨则加车
  return count;
}

// 把总数量分配到每车：均值附近 ±3 吨抖动，合计精确等于总量
// 均值在 31-40 吨区间时，保证每车都落在 31-40 吨（含最后一车）
function allocateTonnages(total, count) {
  if (count <= 1) return [Math.round(total * 1000) / 1000];
  var base = total / count;
  var inStd = base >= 31 && base <= 40;
  // 第三位小数的余量只加在最后一车上，其余车保持两位小数
  var residualOf = function(acc) { return Math.round((total - acc) * 1000) / 1000; };
  for (var attempt = 0; attempt < 60; attempt++) {
    var weights = [], wsum = 0;
    for (var i = 0; i < count; i++) {
      var w = base + (Math.random() * 6 - 3);
      if (w <= 0) w = base;
      weights.push(w);
      wsum += w;
    }
    var result = [], acc = 0, ok = true;
    for (var j = 0; j < count - 1; j++) {
      var t = Math.round(total * weights[j] / wsum * 100) / 100;
      if (inStd && (t < 31 || t > 40)) { ok = false; break; }
      result.push(t);
      acc += t;
    }
    if (!ok) continue;
    var last = residualOf(acc);
    if (last <= 0) continue;
    if (inStd && (last < 31 || last > 40)) continue;
    result.push(last);
    return result;
  }
  // 兜底：均分
  var fallback = [], fAcc = 0;
  for (var k = 0; k < count - 1; k++) {
    var fb = Math.round(base * 100) / 100;
    fallback.push(fb);
    fAcc += fb;
  }
  fallback.push(residualOf(fAcc));
  return fallback;
}

// 吨位/数量格式化：最多保留 3 位小数，去掉末尾多余的 0
function formatTons(num) {
  var r = Math.round((Number(num) || 0) * 1000) / 1000;
  var s = r.toFixed(3);
  if (s.indexOf('.') !== -1) s = s.replace(/\.?0+$/, '');
  return s;
}

// 按车数在起止日期内均匀铺开：一车约一天，首尾必占起日和止日
function spreadDates(count, startDate, endDate) {
  var arr = [];
  var s = new Date(startDate), e = new Date(endDate);
  var days = Math.round((e - s) / 86400000);
  if (count <= 1 || days <= 0) {
    for (var i = 0; i < count; i++) arr.push(startDate);
    return arr;
  }
  for (var j = 0; j < count; j++) {
    var d = new Date(s);
    d.setDate(d.getDate() + Math.round(j * days / (count - 1)));
    arr.push(formatDateStr(d));
  }
  return arr;
}

// 按“平均每天 1-5 车”随机分配日期：以止日为基准自然分散，不刻意集中
// 原始区间放得下就在区间内均匀选天（含首尾），放不下向起日之前顺延
function assignDatesRandom(count, startDate, endDate) {
  var s = new Date(startDate), e = new Date(endDate);
  var spanDays = Math.round((e - s) / 86400000) + 1;
  if (count <= 1) return [startDate];

  // 期望每天 2~3.5 车，确定使用天数
  var avg = 2 + Math.random() * 1.5;
  var need = Math.min(count, Math.max(1, Math.ceil(count / avg)));
  var usedDays = Math.min(count, Math.max(spanDays, need));

  // 每天车数：1-5 随机，合计精确等于 count
  var counts = new Array(usedDays).fill(1);
  var rest = count - usedDays;
  while (rest > 0) {
    var idx = Math.floor(Math.random() * usedDays);
    if (counts[idx] < 5) { counts[idx]++; rest--; }
  }

  // 各天的日期偏移
  var offsets = [];
  if (usedDays >= spanDays) {
    // 连续窗口，以止日结尾（必要时向起日前顺延）
    var startOff = -(usedDays - spanDays);
    for (var i = 0; i < usedDays; i++) offsets.push(startOff + i);
  } else {
    // 在 [起日, 止日] 内均匀选天，含首尾
    for (var j = 0; j < usedDays; j++) offsets.push(Math.round(j * (spanDays - 1) / (usedDays - 1)));
  }

  var dates = [];
  for (var d = 0; d < usedDays; d++) {
    var day = new Date(s);
    day.setDate(day.getDate() + offsets[d]);
    var ds = formatDateStr(day);
    for (var k = 0; k < counts[d]; k++) dates.push(ds);
  }
  return dates; // 长度 count，升序
}

// ========== 结算编号生成（日期+XS+3位当日流水） ==========
function generateSettlementCode(dateStr, seqByDate) {
  var m = String(dateStr || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  var dateKey = m ? m[1] + m[2].padStart(2, '0') + m[3].padStart(2, '0') : String(dateStr || '').replace(/\D/g, '');
  var seq = (seqByDate[dateKey] = (seqByDate[dateKey] || 0) + 1);
  return dateKey + 'XS' + String(seq).padStart(3, '0');
}

// ========== 确保明细同时包含结算起日与止日的数据 ==========
function ensureBoundaryDates(list, startDate, endDate) {
  if (!list || list.length === 0 || !startDate || !endDate) return list;

  if (startDate === endDate) {
    list.forEach(function(v) { v.date = startDate; });
    return list;
  }

  // 优先挑“既不是起日也不是止日”的行来改日期，避免互相覆盖
  function pickIndex(keepDate) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].date !== startDate && list[i].date !== endDate) return i;
    }
    for (var j = 0; j < list.length; j++) {
      if (list[j].date !== keepDate) return j;
    }
    return -1;
  }

  if (!list.some(function(v) { return v.date === startDate; })) {
    var iStart = pickIndex(endDate);
    if (iStart >= 0) list[iStart].date = startDate;
  }

  if (!list.some(function(v) { return v.date === endDate; })) {
    var iEnd = pickIndex(startDate);
    if (iEnd >= 0) list[iEnd].date = endDate;
  }

  list.sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
  return list;
}

// ========== 日期工具 ==========
function formatDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeStr(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 生成两个日期之间的随机日期
function randomDate(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return formatDateStr(new Date(randomTime));
}

// 日期校验：确保结束日期不早于开始日期
function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { valid: false, message: '请选择完整的日期范围' };
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end < start) {
    return { valid: false, message: '结束日期不能早于开始日期' };
  }
  if ((end - start) / (1000 * 60 * 60 * 24) > 365) {
    return { valid: false, message: '日期范围不能超过365天' };
  }
  return { valid: true, message: '' };
}

// ========== localStorage 安全读取 ==========
function safeGetLocalStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.warn(`读取 localStorage[${key}] 失败:`, e);
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`写入 localStorage[${key}] 失败:`, e);
    return false;
  }
}

// ========== 提示消息 ==========
function showToast(message, type = 'info') {
  // 移除之前的 toast
  const existingToast = document.querySelector('.toast-message');
  if (existingToast) existingToast.remove();

  const colors = {
    info: '#2563eb',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444'
  };

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(-10px);
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    opacity: 0;
    transition: all 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  // 动画显示
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // 3秒后消失
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========== 打印 / 另存 PDF ==========
// 公司名取简称：去掉「有限公司」「有限责任公司」「股份有限公司」等后缀
function shortCompanyName(name) {
  var s = String(name || '').trim();
  s = s.replace(/股份有限公司|有限责任公司|有限公司|集团有限公司|集团公司|集团|公司/g, '');
  s = s.replace(/[\\\/:*?"<>|]/g, '');
  return s.trim();
}

// 用「双方公司名 + 结算单」作为 PDF 文件名（浏览器另存 PDF 时默认取 document.title）
function printWithTitle(fileName) {
  var original = document.title;
  var restore = function() {
    document.title = original;
    window.removeEventListener('afterprint', restore);
  };
  document.title = String(fileName || original).replace(/[\\\/:*?"<>|]/g, '');
  window.addEventListener('afterprint', restore);
  window.print();
  restore();
}

// ========== 按钮加载状态 ==========
function setBtnLoading(btn, loading, originalText) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.textContent;
    btn.textContent = '处理中...';
    btn.classList.add('btn-loading');
  } else {
    btn.disabled = false;
    btn.textContent = originalText || btn.dataset.originalText || '提交';
    btn.classList.remove('btn-loading');
  }
}
