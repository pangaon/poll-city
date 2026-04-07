(function() {
  var params = new URLSearchParams(document.currentScript.src.split('?')[1] || '');
  var outletId = params.get('outlet');
  var theme = params.get('theme') || 'dark';
  var position = params.get('position') || 'bottom';

  if (!outletId) return;

  var container = document.createElement('div');
  container.id = 'poll-city-ticker';
  container.style.cssText = 'position:fixed;' + position + ':0;left:0;right:0;z-index:99999;overflow:hidden;height:36px;display:flex;align-items:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;' +
    (theme === 'dark' ? 'background:#0A2342;color:#fff;' : 'background:#f8f9fa;color:#333;border-top:1px solid #dee2e6;');

  var badge = document.createElement('span');
  badge.textContent = '\uD83C\uDDE8\uD83C\uDDE6 POLL CITY LIVE';
  badge.style.cssText = 'background:#E24B4A;color:#fff;padding:4px 10px;font-weight:700;font-size:11px;white-space:nowrap;letter-spacing:0.5px;flex-shrink:0;';
  container.appendChild(badge);

  var track = document.createElement('div');
  track.style.cssText = 'flex:1;overflow:hidden;position:relative;margin-left:12px;';
  container.appendChild(track);

  var text = document.createElement('span');
  text.style.cssText = 'white-space:nowrap;display:inline-block;padding-left:100%;';
  track.appendChild(text);

  document.body.appendChild(container);

  var items = [];
  var currentIndex = 0;

  function showNext() {
    if (items.length === 0) { text.textContent = 'Connecting...'; return; }
    text.textContent = items[currentIndex % items.length].text;
    currentIndex++;
  }

  // Connect via SSE
  var baseUrl = document.currentScript.src.split('/ticker.js')[0];
  var es = new EventSource(baseUrl + '/api/ticker/' + outletId);
  es.onmessage = function(e) {
    try {
      var data = JSON.parse(e.data);
      items = data.items || [];
      if (currentIndex === 0) showNext();
    } catch(err) { /* ignore parse errors */ }
  };

  setInterval(showNext, 8000);

  // CSS animation for scrolling
  var style = document.createElement('style');
  style.textContent = '#poll-city-ticker span { animation: pcticker 15s linear infinite; } @keyframes pcticker { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }';
  document.head.appendChild(style);
})();
