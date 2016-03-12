import Ember from 'ember';

const { inject: { service }, computed, keys } = Ember;

export default Ember.Controller.extend({
  cookies: service(),

  init() {
    this._super(...arguments);
    this.get('cookies').write('now', new Date().getTime());
  },

  allCookies: computed(function() {
    const cookies = this.get('cookies').read();
    return keys(cookies).reduce((acc, key) => {
      const value = cookies[key];
      acc.push({ name: key, value });

      return acc;
    }, []);
  }).volatile()
});
