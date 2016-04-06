/* jshint expr:true */
import { expect } from 'chai';
import { describeModule, it } from 'ember-mocha';
import { describe, beforeEach, afterEach } from 'mocha';

const { defineProperty } = Object;

const COOKIE_NAME = 'test-cookie';

function randomString() {
  return Math.random().toString(36).substring(2);
}

describeModule('service:cookies', 'CookiesService', {}, function() {
  function writeOptionsValidation() {
    it('throws when the signed option is set', function() {
      expect(() => {
        this.subject().write(COOKIE_NAME, 'test', { signed: true });
      }).to.throw();
    });

    it('throws when the HTTP only option is set', function() {
      expect(() => {
        this.subject().write(COOKIE_NAME, 'test', { httpOnly: true });
      }).to.throw();
    });

    it('throws when both the expires and max age options are set', function() {
      expect(() => {
        this.subject().write(COOKIE_NAME, 'test', { expires: new Date(), maxAge: 1000 });
      }).to.throw();
    });
  }

  describe('in the browser', function() {
    beforeEach(function() {
      this.fakeDocument = {
        get cookie() {
          return document.cookie;
        },
        set cookie(value) {
          document.cookie = value;
        }
      };
      this.subject().setProperties('_document', this.fakeDocument);
    });

    afterEach(function() {
      document.cookie = `${COOKIE_NAME}=whatever; expires=${new Date(0).toUTCString()}`;
    });

    describe('reading a cookie', function() {
      it('returns the cookie value', function() {
        let value = randomString();
        document.cookie = `${COOKIE_NAME}=${value};`;
        let afterRoundtrip = this.subject().read(COOKIE_NAME);

        expect(afterRoundtrip).to.eq(value);
      });

      it('returns undefined when the cookie does not exist', function() {
        let afterRoundtrip = this.subject().read('does-not-exist');

        expect(afterRoundtrip).to.be.undefined;
      });
    });

    describe('writing a cookie', function() {
      writeOptionsValidation.apply(this);

      it('writes the value', function() {
        let value = randomString();
        this.subject().write(COOKIE_NAME, value);

        expect(document.cookie).to.include(`${COOKIE_NAME}=${value}`);
      });

      it('URI-component-encodes the value', function() {
        let value = '!"§$%&/()=?"';
        this.subject().write(COOKIE_NAME, value);

        expect(document.cookie).to.include(`${COOKIE_NAME}=${encodeURIComponent(value)}`);
      });

      it('sets the cookie domain', function() {
        defineProperty(this.fakeDocument, 'cookie', {
          set(value) {
            expect(value).to.include('; domain=example.com');
          } 
        });

        this.subject().write(COOKIE_NAME, 'test', { domain: 'example.com' });
      });

      it('sets the expiration', function() {
        let date = new Date();
        defineProperty(this.fakeDocument, 'cookie', {
          set(value) {
            expect(value).to.include(`; expires=${date.toUTCString()}`);
          } 
        });

        this.subject().write(COOKIE_NAME, 'test', { expires: date });
      });

      it('sets the max age', function() {
        defineProperty(this.fakeDocument, 'cookie', {
          set(value) {
            expect(value).to.include('; max-age=1000');
          } 
        });

        this.subject().write(COOKIE_NAME, 'test', { maxAge: 1000 });
      });

      it('sets the secure flag', function() {
        defineProperty(this.fakeDocument, 'cookie', {
          set(value) {
            expect(value).to.include('; secure');
          } 
        });

        this.subject().write(COOKIE_NAME, 'test', { secure: true });
      });

      it('sets the path', function() {
        defineProperty(this.fakeDocument, 'cookie', {
          set(value) {
            expect(value).to.include('; path=/sample-path');
          } 
        });

        this.subject().write(COOKIE_NAME, 'test', { path: '/sample-path' });
      });
    });

    it('reads a cookie that was just written', function() {
      let value = randomString();
      this.subject().write(COOKIE_NAME, value);

      expect(this.subject().read(COOKIE_NAME)).to.eq(value);
    });
  });

  describe('in the Fastboot server', function() {
    beforeEach(function() {
      this.fakeFastboot = {
        _fastbootInfo: {
          response: {
            cookie() {}
          }
        },
        cookies: {}
      };
      this.subject().setProperties({
        _isFastboot: true,  
        _fastboot: this.fakeFastboot
      });
    });

    describe('reading a cookie', function() {
      it('returns the cookie value', function() {
        let value = randomString();
        this.fakeFastboot.cookies[COOKIE_NAME] = value;

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });

      it('returns undefined when the cookies does not exist', function() {
        expect(this.subject().read('does-not-exist')).to.be.undefined;
      });
    });

    describe('writing a cookie', function() {
      writeOptionsValidation.apply(this);

      it('writes the value', function() {
        let value = randomString();

        this.fakeFastboot._fastbootInfo.response.cookie = function(name, theValue) {
          expect(name).to.eq(COOKIE_NAME);
          expect(theValue).to.eq(value);
        };

        this.subject().write(COOKIE_NAME, value);
      });

      it('URI-component-encodes the value', function() {
        let value = '!"§$%&/()=?"';

        this.fakeFastboot._fastbootInfo.response.cookie = function(name, theValue) {
          expect(theValue).to.eq(encodeURIComponent(value));
        };

        this.subject().write(COOKIE_NAME, value);
      });

      it('sets the cookie domain', function() {
        this.fakeFastboot._fastbootInfo.response.cookie = function(name, theValue, options) {
          expect(options.domain).to.eq('example.com');
        };

        this.subject().write(COOKIE_NAME, 'test', { domain: 'example.com' });
      });

      it('sets the expiration', function() {
        let date = new Date();
        this.fakeFastboot._fastbootInfo.response.cookie = function(name, theValue, options) {
          expect(options.expires).to.eq(date);
        };

        this.subject().write(COOKIE_NAME, 'test', { expires: date });
      });

      it('sets the max age', function() {
        this.fakeFastboot._fastbootInfo.response.cookie = function(name, theValue, options) {
          expect(options.maxAge).to.eq(1000);
        };

        this.subject().write(COOKIE_NAME, 'test', { maxAge: 1 });
      });

      it('sets the secure flag', function() {
        this.fakeFastboot._fastbootInfo.response.cookie = function(name, theValue, options) {
          expect(options.secure).to.be.true;
        };

        this.subject().write(COOKIE_NAME, 'test', { secure: true });
      });

      it('sets the path', function() {
        this.fakeFastboot._fastbootInfo.response.cookie = function(name, theValue, options) {
          expect(options.path).to.eq('/sample-path');
        };

        this.subject().write(COOKIE_NAME, 'test', { path: '/sample-path' });
      });
    });

    // TODO: I'm unsure at this point what the correct way to go about this is. While this clearly
    //       behaves different than when run in the browser, one could argue that new cookies shouldn't
    //       be returned here before they were sent to the browser for the first time.
    it('reads a cookie that was just written'/*, function() {
      let value = randomString();
      this.subject().write(COOKIE_NAME, value);

      expect(this.subject().read(COOKIE_NAME)).to.eq(value);
    }*/);
  });
});
