import Ember from 'ember';
import getOwner from 'ember-getowner-polyfill';

const { inject: { service }, computed, computed: { reads }, A, isEmpty, typeOf } = Ember;

export default Ember.Service.extend({
  _fastboot: computed(function() {
    let owner = getOwner(this);

    return owner.lookup('service:fastboot');
  }),

  _isFastboot: reads('_fastboot.isFastBoot'),

  _document: computed(function() {
    return document;
  }),

  _documentCookies: computed(function() {
    const all = this.get('_document.cookie').split(';');

    return A(all).reduce((acc, cookie) => {
      if (!isEmpty(cookie)) {
        const [key, value] = cookie.split('=');
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});
  }).volatile(),

  _all: computed(function() {
    if (this.get('_isFastboot')) {
      return this.get('_fastboot.cookies');
    } else {
      return this.get('_documentCookies');
    }
  }).volatile(),

  read(name) {
    const all = this.get('_all');

    if (name) {
      return all[name];
    } else {
      return all;
    }
  },

  write(name, value, options = {}) {
    Ember.assert('Cookies cannot be set to be HTTP-only as those would not be accessible by the Ember.js application itself when running in the browser!', !options.httpOnly);
    Ember.assert("Cookies cannot be set as signed as signed cookies would not be modifyable in the browser as it has no knowledge of the express server's signing key!", !options.signed);
    Ember.assert("Cookies cannot be set with both maxAge and an explicit expiration time!", isEmpty(options.expires) || isEmpty(options.maxAge));
    value = encodeURIComponent(value);

    if (this.get('_isFastboot')) {
      if (!isEmpty(options.maxAge)) {
        options.maxAge = options.maxAge * 1000;
      }
      const response = this.get('_fastboot._fastbootInfo.response');
      response.cookie(name, value, options);
    } else {
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
    }
  }
});
