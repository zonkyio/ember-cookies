import Ember from 'ember';

const { inject: { service }, computed, computed: { reads }, A, isEmpty, typeOf } = Ember;

export default Ember.Service.extend({
  fastboot: service(),

  _isFastboot: reads('fastboot.isFastBoot'),

  _documentCookies: computed(function() {
    const all = document.cookie.split(';');

    return A(all).reduce((acc, cookie) => {
      if (!isEmpty(cookie)) {
        const [key, value] = cookie.split('=');
        acc[key] = value.trim();
      }
      return acc;
    }, {});
  }).volatile(),

  _all: computed(function() {
    if (this.get('_isFastboot')) {
      return this.get('fastboot.cookies');
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

    if (this.get('_isFastboot')) {
      if (!isEmpty(options.maxAge)) {
        options.maxAge = options.maxAge * 1000;
      }
      const response = this.get('fastboot._fastbootInfo.response');
      response.cookie(name, value, options);
    } else {
      const encodedValue = encodeURIComponent(value);
      let cookie = `${name}=${encodedValue}`;

      if (!isEmpty(options.domain)) {
        cookie = `${cookie}; domain=${options.domain}`;
      }
      if (typeOf(options.expires) === 'date') {
        cookie = `${cookie}; expires=${expires.toUTCString()}`;
      }
      if (!isEmpty(options.maxAge)) {
        cookie = `${cookie}; max=${options.maxAge}`;
      }
      if (!isEmpty(options.secure)) {
        cookie = `${cookie}; secure`;
      }
      if (!isEmpty(options.path)) {
        cookie = `${cookie}; path=${options.path}`;
      }
      document.cookie = cookie;
    }
  }
});
