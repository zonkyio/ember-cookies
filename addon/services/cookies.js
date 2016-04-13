import Ember from 'ember';
import getOwner from 'ember-getowner-polyfill';
import _object from 'lodash/object';
import _collection from 'lodash/collection';

const { inject: { service }, computed, computed: { reads }, isEmpty, typeOf, assert } = Ember;

export default Ember.Service.extend({
  _isFastboot: reads('_fastboot.isFastBoot'),

  _fastboot: computed(function() {
    let owner = getOwner(this);

    return owner.lookup('service:fastboot');
  }),

  _document: computed(function() {
    return document;
  }),

  _documentCookies: computed(function() {
    const all = this.get('_document.cookie').split(';');

    return _collection.reduce(all, (acc, cookie) => {
      if (!isEmpty(cookie)) {
        const [key, value] = cookie.split('=');
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});
  }).volatile(),

  _fastbootCookies: computed(function() {
    let fastbootCookiesCache = this.get('_fastbootCookiesCache');
    let fastbootCookies;

    if (!fastbootCookiesCache) {
      fastbootCookies = this.get('_fastboot.cookies');
      this.set('_fastbootCookiesCache', fastbootCookies);
    } else {
      fastbootCookies = this._filterCachedFastbootCookies(fastbootCookiesCache);
    }

    return fastbootCookies;
  }).volatile(),

  read(name) {
    let all;
    if (this.get('_isFastboot')) {
      all = this.get('_fastbootCookies');
    } else {
      all = this.get('_documentCookies');
    }

    if (name) {
      return all[name];
    } else {
      return all;
    }
  },

  write(name, value, options = {}) {
    assert('Cookies cannot be set to be HTTP-only as those cookies would not be accessible by the Ember.js application itself when running in the browser!', !options.httpOnly);
    assert("Cookies cannot be set as signed as signed cookies would not be modifyable in the browser as it has no knowledge of the express server's signing key!", !options.signed);
    assert("Cookies cannot be set with both maxAge and an explicit expiration time!", isEmpty(options.expires) || isEmpty(options.maxAge));
    value = encodeURIComponent(value);

    if (this.get('_isFastboot')) {
      this._writeFastbootCookie(name, value, options);
    } else {
      this._writeDocumentCookie(name, value, options);
    }
  },

  _writeDocumentCookie(name, value, options = {}) {
    let cookie = `${name}=${value}`;

    if (!isEmpty(options.domain)) {
      cookie = `${cookie}; domain=${options.domain}`;
    }
    if (typeOf(options.expires) === 'date') {
      cookie = `${cookie}; expires=${options.expires.toUTCString()}`;
    }
    if (!isEmpty(options.maxAge)) {
      cookie = `${cookie}; max-age=${options.maxAge}`;
    }
    if (!!options.secure) {
      cookie = `${cookie}; secure`;
    }
    if (!isEmpty(options.path)) {
      cookie = `${cookie}; path=${options.path}`;
    }
    this.set('_document.cookie', cookie);
  },

  _writeFastbootCookie(name, value, options = {}) {
    if (!isEmpty(options.maxAge)) {
      options.maxAge = options.maxAge * 1000;
    }

    this._cacheFastbootCookie(...arguments);

    const response = this.get('_fastboot._fastbootInfo.response');
    response.cookie(name, value, options);
  },

  _cacheFastbootCookie(name, value, options = {}) {
    const fastbootCache = this.getWithDefault('_fastbootCookiesCache', {});
    const cachedOptions = _object.assign({}, options);

    if (cachedOptions.maxAge) {
      const expires = new Date();
      expires.setSeconds(expires.getSeconds() + options.maxAge);
      cachedOptions.expires = expires;
      delete cachedOptions.maxAge;
    }

    fastbootCache[name] = { value, options: cachedOptions };
    this.set('_fastbootCookiesCache', fastbootCache);
  },

  _filterCachedFastbootCookies(fastbootCookiesCache) {
    const request = this.get('_fastboot.request');
    return _collection.reduce(fastbootCookiesCache, (acc, cookie, name) => {
      const { value, options } = cookie;

      const path = options.path;
      if (path && request.path.indexOf(path) !== 0) {
        return acc;
      }

      const domain = options.domain;
      if (domain && request.hostname.indexOf(domain) + domain.length !== request.hostname.length) {
        return acc;
      }

      const expires = options.expires;
      if (expires && expires < new Date()) {
        return acc;
      }

      if (options.secure && request.protocol !== 'https') {
        return acc;
      }

      acc[name] = value;
      return acc;
    }, {});
  }
});
