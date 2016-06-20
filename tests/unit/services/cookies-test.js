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
  function itValidatesWriteOptions() {
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

  function itReadsAfterWrite() {
    it('reads a cookie that was just written', function() {
      let value = randomString();
      this.subject().write(COOKIE_NAME, value);

      expect(this.subject().read(COOKIE_NAME)).to.eq(value);
    });
  }

  describe('in the browser', function() {
    beforeEach(function() {
      this.fakeDocument = {
        // jscs:disable requireEnhancedObjectLiterals
        get cookie() {
          return document.cookie;
        },
        set cookie(value) {
          document.cookie = value;
        }
        // jscs:enable requireEnhancedObjectLiterals
      };
      this.subject().setProperties('_document', this.fakeDocument);
    });

    afterEach(function() {
      document.cookie = `${COOKIE_NAME}=whatever; expires=${new Date(0).toUTCString()}`;
      document.cookie = `${COOKIE_NAME}=whatever; path=${window.location.pathname}; expires=${new Date(0).toUTCString()}`;
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

      it('returns undefined for a cookie that was written for another path', function() {
        this.subject().write(COOKIE_NAME, 'value', { path: '/some-other-path' });

        expect(this.subject().read(COOKIE_NAME)).to.be.undefined;
      });

      it('returns the cookie value for a cookie that was written for the same path', function() {
        let path = window.location.pathname;
        let value = randomString();
        this.subject().write(COOKIE_NAME, value, { path });

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });

      it('returns undefined for a cookie that was written for another domain', function() {
        this.subject().write(COOKIE_NAME, 'value', { domain: 'another-domain.com' });

        expect(this.subject().read(COOKIE_NAME)).to.be.undefined;
      });

      it('returns the cookie value for a cookie that was written for the same domain', function() {
        let domain = window.location.hostname;
        let value = randomString();
        this.subject().write(COOKIE_NAME, value, { domain });

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });

      it('returns undefined for an expired cookie', function() {
        this.subject().write(COOKIE_NAME, 'value', { expires: new Date(-1) });

        expect(this.subject().read(COOKIE_NAME)).to.be.undefined;
      });

      it('returns the cookie value for a not-yet-expired cookie', function() {
        let expirationDate = new Date();
        expirationDate.setDate(new Date().getDate() + 1);
        let value = randomString();
        this.subject().write(COOKIE_NAME, value, { expires: expirationDate });

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });

      it('returns undefined for a cookie that reached its max age', function() {
        this.subject().write(COOKIE_NAME, 'value', { maxAge: -1 });

        expect(this.subject().read(COOKIE_NAME)).to.be.undefined;
      });

      it('returns the cookie value for a cookie that has not yet reached its max age', function() {
        let value = randomString();
        this.subject().write(COOKIE_NAME, value, { maxAge: 99999999 });

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });

      it('returns undefined for a cookie that was written for another protocol (secure cookies vs. non-secure request)', function() {
        let isHTTPS = window.location.protocol === 'https:';
        this.subject().write(COOKIE_NAME, 'value', { secure: !isHTTPS });

        expect(this.subject().read(COOKIE_NAME)).to.be.undefined;
      });

      it('returns the cookie value for a cookie that was written for the same protocol', function() {
        let isHTTPS = window.location.protocol === 'https:';
        let value = randomString();
        this.subject().write(COOKIE_NAME, value, { secure: isHTTPS });

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });
    });

    describe('writing a cookie', function() {
      itValidatesWriteOptions.apply(this);

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

    describe('clearing a cookie', function() {
      it('clears the cookie', function() {
        let value = randomString();
        document.cookie = `${COOKIE_NAME}=${value};`;

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);

        this.subject().clear(COOKIE_NAME);

        expect(this.subject().read(COOKIE_NAME)).to.eq(undefined);
      });
    });

    itReadsAfterWrite.apply(this);
  });

  describe('in the FastBoot server', function() {
    beforeEach(function() {
      this.fakeFastBoot = {
        response: {
          headers: {
            append() {}
          }
        },
        request: {
          cookies: {},
          headers: {
            append() {}
          }
        }
      };
      this.subject().setProperties({
        _isFastBoot: true,
        _fastBoot: this.fakeFastBoot
      });
    });

    describe('reading a cookie', function() {
      it('returns the cookie value', function() {
        let value = randomString();
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = { value };

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });

      it('returns undefined when the cookies does not exist', function() {
        expect(this.subject().read('does-not-exist')).to.be.undefined;
      });

      it('returns undefined for a cookie that was written for another path', function() {
        this.fakeFastBoot.request.path = '/path';
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = {
          value: 'value',
          options: {
            path: '/some-other-path'
          }
        };

        expect(this.subject().read(COOKIE_NAME)).to.be.undefined;
      });

      it('returns the cookie value for a cookie that was written for the same path', function() {
        this.fakeFastBoot.request.path = '/path';
        let value = randomString();
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = {
          value,
          options: {
            path: '/path'
          }
        };

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });

      it('returns undefined for a cookie that was written for another domain', function() {
        this.fakeFastBoot.request.host = 'example.com';
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = {
          value: 'value',
          options: {
            domain: 'another-domain.com'
          }
        };

        expect(this.subject().read(COOKIE_NAME)).to.be.undefined;
      });

      it('returns the cookie value for a cookie that was written for the same domain', function() {
        this.fakeFastBoot.request.host = 'example.com';
        let value = randomString();
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = {
          value,
          options: {
            domain: 'example.com'
          }
        };

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });

      it('returns the cookie value for a cookie that was written for a parent domain', function() {
        this.fakeFastBoot.request.host = 'sub.example.com';
        let value = randomString();
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = {
          value,
          options: {
            domain: 'example.com'
          }
        };

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });

      it('returns undefined for an expired cookie', function() {
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = {
          value: 'value',
          options: {
            expires: new Date(-1)
          }
        };

        expect(this.subject().read(COOKIE_NAME)).to.be.undefined;
      });

      it('returns the cookie value for a not-yet-expired cookie', function() {
        let expirationDate = new Date();
        expirationDate.setDate(new Date().getDate() + 1);
        let value = randomString();
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = {
          value,
          options: {
            expires: expirationDate
          }
        };

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });

      it('returns undefined for a cookie that reached its max age', function() {
        this.subject().write(COOKIE_NAME, 'value', { maxAge: -1 });

        expect(this.subject().read(COOKIE_NAME)).to.be.undefined;
      });

      it('returns the cookie value for a cookie that has not yet reached its max age', function() {
        let value = randomString();
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = {
          value,
          options: {
            maxAge: 99999999
          }
        };

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });

      it('returns undefined for a cookie that was written for another protocol (secure cookies vs. non-secure request)', function() {
        this.fakeFastBoot.request.host = 'http';
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = {
          value: 'value',
          options: {
            secure: true
          }
        };
        expect(this.subject().read(COOKIE_NAME)).to.be.undefined;
      });

      it('returns the cookie value for a cookie that was written for the same protocol', function() {
        this.fakeFastBoot.request.protocol = 'https';
        let value = randomString();
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = {
          value,
          options: {
            secure: true
          }
        };

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);
      });
    });

    describe('writing a cookie', function() {
      itValidatesWriteOptions.apply(this);

      it('writes the value', function() {
        let value = randomString();
        let subject = this.subject();

        this.fakeFastBoot.response.headers.append = function(headerName, headerValue) {
          expect(headerName).to.equal('set-cookie');
          expect(headerValue).to.equal(`${COOKIE_NAME}=${value}`);
        };

        subject.write(COOKIE_NAME, value);
      });

      it('URI-component-encodes the value', function() {
        let value = '!"§$%&/()=?"';
        let encodedValue = encodeURIComponent(value);
        let subject = this.subject();

        this.fakeFastBoot.response.headers.append = function(headerName, headerValue) {
          expect(headerName).to.equal('set-cookie');
          expect(headerValue).to.equal(`${COOKIE_NAME}=${encodedValue}`);
        };

        subject.write(COOKIE_NAME, value);
      });

      it('sets the cookie domain', function() {
        let domain = 'example.com';
        let subject = this.subject();
        this.fakeFastBoot.request.host = domain;

        this.fakeFastBoot.response.headers.append = function(headerName, headerValue) {
          expect(headerName).to.equal('set-cookie');
          expect(headerValue).to.equal(`${COOKIE_NAME}=test; domain=${domain}`);
        };

        subject.write(COOKIE_NAME, 'test', { domain });
      });

      it('sets the expiration', function() {
        let subject = this.subject();
        let date = new Date();

        this.fakeFastBoot.response.headers.append = function(headerName, headerValue) {
          expect(headerName).to.equal('set-cookie');
          expect(headerValue).to.equal(`${COOKIE_NAME}=test; expires=${date.toUTCString()}`);
        };

        subject.write(COOKIE_NAME, 'test', { expires: date });
      });

      it('sets the max age', function() {
        let subject = this.subject();
        let maxAge = 10;

        this.fakeFastBoot.response.headers.append = function(headerName, headerValue) {
          expect(headerName).to.equal('set-cookie');
          expect(headerValue).to.equal(`${COOKIE_NAME}=test; max-age=${maxAge}`);
        };

        subject.write(COOKIE_NAME, 'test', { maxAge });
      });

      it('sets the secure flag', function() {
        let subject = this.subject();

        this.fakeFastBoot.response.headers.append = function(headerName, headerValue) {
          expect(headerName).to.equal('set-cookie');
          expect(headerValue).to.equal(`${COOKIE_NAME}=test; secure`);
        };

        subject.write(COOKIE_NAME, 'test', { secure: true });
      });

      it('sets the path', function() {
        let subject = this.subject();
        let path = '/sample-path';

        this.fakeFastBoot.response.headers.append = function(headerName, headerValue) {
          expect(headerName).to.equal('set-cookie');
          expect(headerValue).to.equal(`${COOKIE_NAME}=test; path=${path}`);
        };

        subject.write(COOKIE_NAME, 'test', { path });
      });
    });

    describe('clearing a cookie', function() {
      it('clears the cookie', function() {
        let value = randomString();
        this.fakeFastBoot.request.cookies[COOKIE_NAME] = { value };

        expect(this.subject().read(COOKIE_NAME)).to.eq(value);

        this.subject().clear(COOKIE_NAME);

        expect(this.subject().read(COOKIE_NAME)).to.eq(undefined);
      });
    });

    itReadsAfterWrite.apply(this);
  });
});
