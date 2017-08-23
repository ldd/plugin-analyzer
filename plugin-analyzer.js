PluginAnalyzer = (() => {
  const loggers = [];
  let logger = [];
  const getSubtype = info => (info === undefined ? 'undefined' : 'defined');

  // ignore functions and properties declared by this plugin
  // TODO find a better test (possibly including the function's toString method
  const _ignoredFunctions = /(loadScriptSequentially)|(setParameters)|(parameters)/;
  const isIgnoredFunction = (target, propKey) => _ignoredFunctions.test(propKey);
  const _ignoredProperties = /(_parameters)/;
  const isIgnoredProperty = (target, propKey) => _ignoredProperties.test(propKey);

  // get valid RPG Maker Classes
  const classNamesRegex = /^((Scene_)|(Window_)|(Sprite_)|(Spriteset_)|(Game_))/;
  const _classesObserved = Object.getOwnPropertyNames(window).filter(s => classNamesRegex.test(s));

  // get valid RPG Maker Managers
  const isNative = fn => !!fn.toString().match(/\[native code\]/);
  const managersRegex = s => /((Manager)$)/.test(s) && !isNative(window[s]);
  const _managersObserved = Object.getOwnPropertyNames(window).filter(managersRegex);

  // define the Proxy's handler
  const handler = {
    get(target, propKey) {
      const value = target[propKey];
      const subtype = getSubtype(target[propKey]);

      if (typeof value === 'function') {
        if (isIgnoredFunction(target, propKey)) return value;
        return function fn(...args) {
          const result = value.apply(this, args);
          logger.push({ key: propKey, value, type: 'get', subtype: `${subtype}Function` });
          return result;
        };
      }

      if (isIgnoredProperty(target, propKey)) return value;
      logger.push({ key: propKey, value, type: 'get', subtype });
      return value;

    },
    set(target, propKey, value) {
      let subtype = getSubtype(target[propKey]);
      subtype = typeof value === 'function' ? `${subtype}Function` : subtype;
      logger.push({ key: propKey, value, type: 'set', subtype });
      target[propKey] = value; // eslint-disable-line no-param-reassign
      return target[propKey];
    }
  };

  function observeObject(obj) {
    return new Proxy(obj, handler);
  }

  // just like observeObject, but we also observe class instantiation by modifying the constructor;
  // TODO We unsafely assume the class's constructors takes no arguments.
  function observeClass(aClass) {
    const tempClass = function tempClass() {
      logger.push({ key: aClass.name, value: 2, type: 'constructor' });
    };
    tempClass.prototype = new Proxy(aClass.prototype, handler);
    return tempClass;
  }

  const setup = (classesObserved = _classesObserved, managersObserved = _managersObserved) => {
    for (let i = 0; i < classesObserved.length; i += 1) {
      this[classesObserved[i]] = observeClass(this[classesObserved[i]], logger);
    }
    for (let i = 0; i < managersObserved.length; i += 1) {
      this[managersObserved[i]] = observeObject(this[managersObserved[i]], logger);
    }
  };
  const analyze = plugin => {
    loggers.push({ name: plugin.name, logger });
    logger = [];
    return true;
  };
  const destroy = () => {
    // TODO optionally disable the proxy here
  };
  const printByPlugin = () => {
    const instantiated = log => log.filter(e => e.type === 'constructor');
    const funGetDefined = log => log.filter(e => e.type === 'get' && e.subtype === 'definedFunction');
    const funGetUndefined = log => log.filter(e => e.type === 'get' && e.subtype === 'undefinedFunction');
    const funSetDefined = log => log.filter(e => e.type === 'set' && e.subtype === 'definedFunction');
    const funSetUndefined = log => log.filter(e => e.type === 'set' && e.subtype === 'undefinedFunction');
    const propGetDefined = log => log.filter(e => e.type === 'get' && e.subtype === 'defined');
    const propGetUndefined = log => log.filter(e => e.type === 'get' && e.subtype === 'undefined');
    const propSetDefined = log => log.filter(e => e.type === 'set' && e.subtype === 'defined');
    const propSetUndefined = log => log.filter(e => e.type === 'set' && e.subtype === 'undefined');
    loggers.forEach(plugin => {
      console.log('======================================');
      console.log(`Plugin [${plugin.name}]`);
      console.log('Classes Instantiated: ', instantiated(plugin.logger));
      console.log('Class methods accessed:', funGetDefined(plugin.logger));
      console.log('Class methods unavailable but requested: ', funGetUndefined(plugin.logger));
      console.log('Class methods modified: ', funSetDefined(plugin.logger));
      console.log('Class methods added: ', funSetUndefined(plugin.logger));
      console.log('Properties accessed: ', propGetDefined(plugin.logger));
      console.log('Properties unavailable but requested: ', propGetUndefined(plugin.logger));
      console.log('Properties modified: ', propSetDefined(plugin.logger));
      console.log('Properties added: ', propSetUndefined(plugin.logger));
      console.log('======================================');
    });
  };
  const printByFeature = () => {
    // TODO print all loggers' information mixed together
  };
  const printLoggers = () => loggers;
  return { setup, analyze, destroy, printByFeature, printByPlugin, printLoggers };

})(window);


// https://stackoverflow.com/questions/33330636/load-javascript-dynamically-and-sequentially/34473745#34473745
/**
 * load plugin scripts sequentially, analyzing each one before loading the next
 */
PluginManager.loadScriptSequentially = function loadScriptSequentially(path, [head, ...tail]) {
  const loadScript = link => new Promise((fulfill, reject) => {
    const script = document.createElement('script');
    script.addEventListener('load', fulfill);
    script.addEventListener('error', reject);

    PluginManager.setParameters(link.name, link.parameters);
    script.src = `${path + link.name}.js`;
    script._url = `${path + link.name}.js`;
    document.body.appendChild(script);
  });
  loadScript(head).then(() => {
    PluginAnalyzer.analyze(head);
    if (tail.length > 0) {
      PluginManager.loadScriptSequentially(path, tail);
    }
  });
};

// setup and actually load the plugin scripts
PluginAnalyzer.setup();
PluginManager.loadScriptSequentially(PluginManager._path, [...$plugins.slice(1)]);
