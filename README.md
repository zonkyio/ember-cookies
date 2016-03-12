# ember-cookies

ember-cookies implements an abstract cookie API that works in the browser (via
`document.cookie`) as well as with Fastboot on the server (using the `request`
and `response` accessible via the `fastboot` service).

Having access to cookies both in the browser as well as in Fastboot is key to
being able to share a common session.

__This is still at a very early stage and should not be used in production
apps!__

## Example Usage

```js
// app/controllers/application.js
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
```

## Open Issues

- This is obviously lacking tests
- Writing cookies currently only supports `name` and `value` in the browser (no support for setting expiration, host etc.)
- When setting cookies that aren't accessible for client-side JS via Fastboot the addon should probably warn

## Installation

`ember install ember-cookies`

## License

`ember-cookies` is developed by and &copy;
[simplabs GmbH/Marco Otte-Witte](http://simplabs.com) and contributors. It is
released under the
[MIT License](https://github.com/simplabs/ember-simple-auth/blob/master/LICENSE).

`ember-cookies` is not an official part of [Ember.js](http://emberjs.com) and
is not maintained by the Ember.js Core Team.