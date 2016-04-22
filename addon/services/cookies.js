import Ember from 'ember';
import getOwner from 'ember-getowner-polyfill';
import _object from 'lodash/object';
import _collection from 'lodash/collection';

const { computed, computed: { reads }, isEmpty, typeOf, isNone, assert } = Ember;

export default Ember.Service.extend({
  _isFastBoot: reads('_fastBoot.isFastBoot'),

  _fastBoot: computed(function() {
    let owner = getOwner(this);

    return owner.lookup('service:fastBoot');
  }),

  _document: computed(function() {
    return document;
  }),

  _documentCookies: computed(function() {
    let all = this.get('_document.cookie').split(';');

    return _collection.reduce(all, (acc, cookie) => {
      if (!isEmpty(cookie)) {
        let [key, value] = cookie.split('=');
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});
  }).volatile(),

  _fastBootCookies: computed(function() {
    let fastBootCookiesCache = this.get('_fastBootCookiesCache');
    let fastBootCookies;

    if (!fastBootCookiesCache) {
      fastBootCookies = this.get('_fastBoot.cookies');
      this.set('_fastBootCookiesCache', fastBootCookies);
    } else {
      fastBootCookies = this._filterCachedFastBootCookies(fastBootCookiesCache);
    }

    return fastBootCookies;
  }).volatile(),

  read(name) {
    let all;
    if (this.get('_isFastBoot')) {
      all = this.get('_fastBootCookies');
    } else {
      all = this.get('_documentCookies');
    }

    if (name) {
      return this._decodeValue(all[name]);
    } else {
      return _collection.map(all, (value) => this._decodeValue(value));
    }
  },

  write(name, value, options = {}) {
    assert('Cookies cannot be set to be HTTP-only as those cookies would not be accessible by the Ember.js application itself when running in the browser!', !options.httpOnly);
    assert("Cookies cannot be set as signed as signed cookies would not be modifyable in the browser as it has no knowledge of the express server's signing key!", !options.signed);
    assert('Cookies cannot be set with both maxAge and an explicit expiration time!', isEmpty(options.expires) || isEmpty(options.maxAge));
    value = this._encodeValue(value);

    if (this.get('_isFastBoot')) {
      this._writeFastBootCookie(name, value, options);
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

  _writeFastBootCookie(name, value, options = {}) {
    if (!isEmpty(options.maxAge)) {
      options.maxAge = options.maxAge * 1000;
    }

    this._cacheFastBootCookie(...arguments);

    let response = this.get('_fastBoot._fastBootInfo.response');
    response.cookie(name, value, options);
  },

  _cacheFastBootCookie(name, value, options = {}) {
    let fastBootCache = this.getWithDefault('_fastBootCookiesCache', {});
    let cachedOptions = _object.assign({}, options);

    if (cachedOptions.maxAge) {
      let expires = new Date();
      expires.setSeconds(expires.getSeconds() + options.maxAge);
      cachedOptions.expires = expires;
      delete cachedOptions.maxAge;
    }

    fastBootCache[name] = { value, options: cachedOptions };
    this.set('_fastBootCookiesCache', fastBootCache);
  },

  _filterCachedFastBootCookies(fastBootCookiesCache) {
    let request = this.get('_fastBoot._fastBootInfo.request');
    return _collection.reduce(fastBootCookiesCache, (acc, cookie, name) => {
      let { value, options } = cookie;
      options = options || {};

      let { path, domain, expires, secure } = options;

      if (path && request.path.indexOf(path) !== 0) {
        return acc;
      }

      if (domain && request.hostname.indexOf(domain) + domain.length !== request.hostname.length) {
        return acc;
      }

      if (expires && expires < new Date()) {
        return acc;
      }

      if (secure && request.protocol !== 'https') {
        return acc;
      }

      acc[name] = value;
      return acc;
    }, {});
  },

  _encodeValue(value) {
    if (isNone(value)) {
      return value;
    } else {
      return encodeURIComponent(value);
    }
  },

  _decodeValue(value) {
    if (isNone(value)) {
      return value;
    } else {
      return decodeURIComponent(value);
    }
  }
});
