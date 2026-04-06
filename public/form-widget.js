/**
 * Poll City Form Widget — embed any form on any website.
 *
 * Usage:
 * <script src="https://poll.city/form-widget.js"
 *   data-form="volunteer-intake"
 *   data-trigger="button"
 *   data-label="Volunteer With Us">
 * </script>
 */
(function() {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var formSlug = script.getAttribute('data-form');
  var trigger = script.getAttribute('data-trigger') || 'inline';
  var label = script.getAttribute('data-label') || 'Open Form';
  var baseUrl = script.src.replace('/form-widget.js', '');

  if (!formSlug) {
    console.error('[Poll City] data-form attribute is required');
    return;
  }

  var formUrl = baseUrl + '/f/' + formSlug + '/embed';

  if (trigger === 'button') {
    // Create a floating button that opens the form in a modal
    var btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;background:#1a4782;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-family:system-ui,sans-serif;';
    btn.onmouseover = function() { btn.style.background = '#153a6e'; };
    btn.onmouseout = function() { btn.style.background = '#1a4782'; };
    btn.onclick = function() { openModal(); };
    document.body.appendChild(btn);
  } else {
    // Inline: replace the script tag with an iframe
    var iframe = createIframe();
    script.parentNode.insertBefore(iframe, script.nextSibling);
  }

  function createIframe() {
    var iframe = document.createElement('iframe');
    iframe.src = formUrl;
    iframe.style.cssText = 'width:100%;border:none;min-height:500px;';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', label);

    // Auto-resize iframe based on content
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'pollcity-form-height' && e.data.slug === formSlug) {
        iframe.style.height = e.data.height + 'px';
      }
    });

    return iframe;
  }

  function openModal() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99998;display:flex;align-items:center;justify-content:center;';
    overlay.onclick = function(e) { if (e.target === overlay) closeModal(); };

    var modal = document.createElement('div');
    modal.style.cssText = 'background:white;border-radius:12px;width:90%;max-width:600px;max-height:90vh;overflow:hidden;position:relative;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    var close = document.createElement('button');
    close.textContent = '\u00D7';
    close.style.cssText = 'position:absolute;top:8px;right:12px;z-index:10;background:none;border:none;font-size:28px;cursor:pointer;color:#666;line-height:1;';
    close.onclick = closeModal;

    var iframe = createIframe();
    iframe.style.height = '80vh';
    iframe.style.borderRadius = '12px';

    modal.appendChild(close);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay._pollcityOverlay = true;

    function closeModal() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
  }
})();
