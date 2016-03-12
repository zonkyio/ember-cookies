import Ember from 'ember';

const { inject: { service }, computed } = Ember;

export default Ember.Service.extend({
  fastboot: service(),

  all: computed(function() {
    const fastbootCookies = this.get('fastboot.cookies');

    if (fastbootCookies) {
      return fastbootCookies;
    } else {
      return document.cookie;
    }
  }).volatile()
});
