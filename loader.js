/* «Мои плагины» — loader для Lampa.
   Добавить в Lampa один раз как плагин:
   https://aukro1408.github.io/files/loader.js?v=1
   Дальше: Настройки → «Мои плагины» → Синхронизировать каталог →
   тумблеры Вкл/Выкл → Перезагрузить Lampa. */
(function () {
  'use strict';

  var CATALOG_URL = 'https://aukro1408.github.io/files/plugins.json';
  var CACHE_KEY = 'denis_plugins_catalog';
  var COMP = 'denis_plugins';
  var ICON = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>';

  // стабильный ключ тумблера для плагина (уникален на URL)
  function pid(url) {
    var h = 0;
    for (var i = 0; i < url.length; i++) h = ((h << 5) - h + url.charCodeAt(i)) | 0;
    return 'denis_plg_' + (h < 0 ? 'n' + (-h) : 'p' + h);
  }

  function findInstalled(url) {
    var all = Lampa.Plugins.get() || [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].url === url) return all[i];
    }
    return null;
  }

  function isOn(url) {
    var f = findInstalled(url);
    return !!(f && f.status);
  }

  // вкл/выкл через remove+add — как в штатном API Lampa
  function setEnabled(p, on) {
    var all = Lampa.Plugins.get() || [];
    var f = null;
    for (var i = 0; i < all.length; i++) {
      if (all[i].url === p.url) { f = all[i]; break; }
    }
    if (f) Lampa.Plugins.remove(f);
    if (on) Lampa.Plugins.add({ url: p.url, name: p.name, author: p.author || '', status: 1, source: 'denis' });
    Lampa.Plugins.save();
    Lampa.Noty.show('Перезапустите Lampa, чтобы применить');
  }

  function syncCatalog(silent) {
    if (!silent && Lampa.Loading) Lampa.Loading.start();
    fetch(CATALOG_URL + '?_=' + Date.now()).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !Array.isArray(d.plugins)) throw 0;
      Lampa.Storage.set(CACHE_KEY, d.plugins);
      if (!silent) Lampa.Noty.show('Каталог обновлён. Перезапустите Lampa');
    }).catch(function () {
      if (!silent) Lampa.Noty.show('Ошибка синхронизации');
    }).then(function () {
      if (!silent && Lampa.Loading) Lampa.Loading.stop();
    });
  }

  function registerSettings() {
    Lampa.SettingsApi.addComponent({ component: COMP, name: 'Мои плагины', icon: ICON });
    Lampa.SettingsApi.addParam({
      component: COMP, param: { type: 'button' }, field: { name: 'Синхронизировать каталог' },
      onChange: function () { syncCatalog(false); }
    });
    var list = Lampa.Storage.get(CACHE_KEY, []);
    if (!list.length) {
      Lampa.SettingsApi.addParam({
        component: COMP, param: { type: 'title' }, field: { name: 'Нажмите «Синхронизировать каталог»' }
      });
    } else {
      Lampa.SettingsApi.addParam({
        component: COMP, param: { type: 'title' }, field: { name: 'Плагины' }
      });
      list.forEach(function (p) {
        var key = pid(p.url);
        var on = isOn(p.url);
        // тумблер всегда показывает реальное состояние из реестра плагинов
        try { Lampa.Storage.set(key, on); } catch (e) {}
        Lampa.SettingsApi.addParam({
          component: COMP,
          param: { name: key, type: 'trigger', default: on },
          field: { name: p.name, description: p.description || p.url },
          onChange: function (v) { setEnabled(p, v === 'true' || v === true); }
        });
      });
    }
    Lampa.SettingsApi.addParam({
      component: COMP, param: { type: 'button' }, field: { name: 'Перезагрузить Lampa' },
      onChange: function () { window.location.reload(); }
    });
  }

  function start() {
    registerSettings();
    syncCatalog(true);
  }

  if (window.appready) { start(); }
  else { Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); }); }
})();
