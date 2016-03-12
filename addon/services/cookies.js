import Ember from 'ember';

const { inject: { service }, computed, A } = Ember;

export default Ember.Service.extend({
  fastboot: service(),

  _isFastboot: computed.notEmpty('fastboot._fastbootInfo'),

  _documentCookies: computed(function() {
    const all = document.cookie.split(';');

    return A(all).reduce((acc, cookie) => {
      const [key, value] = cookie.split('=');
      acc[key] = value;
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
  }/*,

  write(name, value) {
    const fastbootCookies = this.get('_fastbootCookies');

    if (fastbootCookies) {
      
    } else {
      
    }
  }*/
});
