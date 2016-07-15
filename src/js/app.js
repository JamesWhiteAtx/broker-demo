/*
 * Copyright 2016 UnboundID Corp.
 * All Rights Reserved.
 */

(function (UNBOUNDID) {
  "use strict";

  UNBOUNDID.MODULE_NAME = 'broker';

  angular.module(UNBOUNDID.MODULE_NAME, [])
    // .constant('cfg', {
    //   jwtKey: 'JWT'
    // })
    .constant('pages', {
      home: 'index.html',
      profile: 'profile.html',
      checkout: 'checkout.html',
      social: 'social.html',
      buy: 'buy.html'
    })
    .constant('authvals', {
      IDENTITY_PROVIDER_URL: '/',
      RESOURCE_SERVER_URL: '/',
      CLIENT_REDIRECT_URL: '/docs/demo/callback.html',
      CLIENT_ID: '@broker-demo@',
      SCOPES: 'urn:unboundid:scope:manage_profile ' +
      'urn:unboundid:scope:password_quality_requirements ' +
      'urn:unboundid:scope:change_password ' +
      'urn:unboundid:scope:manage_external_identities ' +
      'urn:unboundid:scope:manage_sessions ' +
      'urn:unboundid:scope:manage_consents',
      ACR_VALUES: 'MFA Default',
      STORAGE_KEY: {
        FLOW_STATE: 'my_account_flow_state',
        ACCESS_TOKEN: 'my_account_access_token',
        STATE: 'my_account_state'
      }
    })

    .service('storage', function storage($window) {
      var self = this;
      self.set = function (key, value) {
        return $window.sessionStorage.setItem(key, value);
      };

      self.get = function (key) {
        return $window.sessionStorage.getItem(key);
      };

      self.remove = function (key) {
        return $window.sessionStorage.removeItem(key);
      };
    })
    
    .service('brand', function brand($q, $http) {
      var self = this;
      var deferred = $q.defer(); 
      self.loaded = deferred.promise;
      
      init();

      function init() {
        $http.get('brand.json').then(function (result) {
          angular.extend(self, result.data);
          deferred.resolve(self);
        }).catch(function (reason) {
          deferred.reject(reason);
        });
      }
    })

    .service('products', function products() {
      var self = this
      self.preferences = null;
      self.groups = null;
      self.recommendations = false;

      self.defineGroups = defineGroups;

      function defineGroups(auth) {
        var found;
        self.groups = [];
        
        if ( self.preferences && self.preferences.length && 
          auth && auth.authorized && auth.profile && auth.profile.preferences && 
          auth.profile.preferences.length)
        {
          self.recommendations = true;          
          self.preferences.forEach(function(any) {
            found = auth.profile.preferences.filter(function(item) {
              return (item.id === any.id);
            })[0];

            if (found) {
              self.groups.push(any);
            }
          });
        } 
        if (self.groups.length === 0) {
          self.recommendations = false;
          self.groups = [{display: 'Offers', products: [
            'img/mahjong1.jpeg',
            'img/dom1.jpeg',
            'img/dom2.jpeg',
            'img/dom3.jpeg'
            
          ]}];
        }

      }

    })
    
    .service('utils', function utils() {
      var self = this;
      self.parseParams = parseParams;

      function parseParams(url) {
        var params = {},
          regex = /([^&=]+)=([^&]*)/g,
          m;
        url = url.substring(1);
        while (m = regex.exec(url)) {
          params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
        }
        return params;
      }
    })

    .service('auth', function auth($location, $window, $http, $q, $httpParamSerializer, 
        utils, products, pages, storage, authvals) {
      var self = this;
      self.authorized = false;
      self.bearerToken = null;
      self.profile = null;
      self.url = null;

      self.authorize = authorize;
      self.tokenUrl = tokenUrl;
      //self.onlyAuth = onlyAuth;

      init();

      function init() {
        var params = utils.parseParams($window.location.search);


        if (params['chash']) {
          // this is an OAuth callback
          params = utils.parseParams(decodeCallbackArg(params['chash']));
          if (params['access_token']) {
            var token = params['access_token'];
            self.authorize(token);
          //   // validate state
          //   if (params['state'] !== $window.sessionStorage.getItem(STORAGE_KEY.STATE)) {
          //     this.error = this.formatError('The given state value (' + params['state'] + ') does not match what was ' +
          //       'sent with the request (' + this.window.sessionStorage.getItem(STORAGE_KEY.STATE) + ')');
          //   }
          //   else {
          //     this.httpWrapper.bearerToken = params['access_token'];
          //   }
          // }
          // else if (params['error']) {
          //   this.error = this.formatError(params['error_description'] || params['error'],
          //     params['error_description'] ? params['error'] : undefined);
          //   this.error.message = this.error.message.replace(/\+/g, ' ');
          // }
          // else {
          //   this.error = this.formatError('Unexpected OAuth callback parameters');
          }
        }
        else {
          self.authorize();
          // redirect for access token
          // var state = Utility.getRandomInt(0, 999999);
          // this.window.sessionStorage.setItem(STORAGE_KEY.STATE, state.toString());
          // var uri = this.httpWrapper.getAuthorizeUrl(state);
          // this.window.location.assign(uri);
          // return;
        }

        // var jwt;
        // if(UNBOUNDID.hash) {
        //   var hashObj = parseQueryString(UNBOUNDID.hash);
        //   jwt = hashObj.JWT;
        // }

        // if (!jwt) {
        //   jwt = storage.get(cfg.jwtKey);
        // }

        // if (jwt) {
        //   authorize(jwt);
        // } else {
        //   assignUrls();
        // }
      }

	    function decodeCallbackArg(arg) {
        var decoded = decodeURIComponent(arg);
        var b = atob(decoded);
        return b; 
      }

	    function encodeCallbackArg(arg) {
        var a = btoa(arg);
        var encoded = encodeURIComponent(a);
        return encoded; 
      }      

      function getAuthorizeUrl(page) {
        var state = Math.floor(Math.random() * (999999 - 0 + 1)) + 0;
        storage.set(authvals.STORAGE_KEY.STATE, state.toString());

        var result = '';
        result = buildUrl(authvals.IDENTITY_PROVIDER_URL, 'oauth/authorize') + '?' +
          'response_type=' + encodeURIComponent('token') + '&' +
          'client_id=' + encodeURIComponent(authvals.CLIENT_ID) + '&' +
          'redirect_uri=' + encodeURIComponent(authvals.CLIENT_REDIRECT_URL) + '&' +
          'scope=' + encodeURIComponent(authvals.SCOPES) + '&' +
          'acr_values=' + encodeURIComponent(authvals.ACR_VALUES) + '&' +
          'state=' + state;// + ';' + page;

        return result;
      }
      
      function getLogoutUrl() {
        return buildUrl(authvals.IDENTITY_PROVIDER_URL, 'oauth/logout') + '?' +
          'post_logout_redirect_uri=' + encodeURIComponent(authvals.CLIENT_REDIRECT_URL);
      }

      function getResource(subpath, token) {
        if (token) {
          var path = 'scim/v2/' + subpath;
          var url = buildUrl(authvals.RESOURCE_SERVER_URL, path);

          var headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json, application/scim+json'
          };
          headers['Authorization'] = 'Bearer ' + token;
          return $http.get(url, { headers: headers });
        } else {
          return $q.reject('no token');
        }
      }

      function tokenUrl(url, token, extra) {
        var params, tokenParams;
        if (token) {
          var tokenStr = '#' + $httpParamSerializer({"access_token": token}); 
          var chash = encodeCallbackArg(tokenStr);
          tokenParams = {"chash": chash};
        }        
        if (tokenParams || extra) {
          params = angular.extend({}, tokenParams, extra);
          return url + '?' + $httpParamSerializer(params);
        } else {
          return url;
        }
      }

      function authUrl(url, token) {
        if (token) {
          return tokenUrl(url, token);
        } else {
          return getAuthorizeUrl(url);
        }
      }

      function assignUrls(token) {
        self.url = {
          home: tokenUrl(pages.home, token),
          profile: authUrl(pages.profile, token),
          checkout: tokenUrl(pages.checkout, token),
          social: tokenUrl(pages.social, token),
          signin: getAuthorizeUrl(pages.home),
          signout: getLogoutUrl(pages.home, token)
        };
      }

      function authorize(token) {

        return $q.resolve(token)
          .then(function (token) {
            return retrieveProfile(token);
          })
          .then(function (profile) {
            self.authorized = true;
            self.bearerToken = token;
            storage.set(authvals.STORAGE_KEY.ACCESS_TOKEN, self.bearerToken);

            return self.bearerToken;
          })
          .catch(function (reason) {
            self.authorized = false;
            self.bearerToken = null;
            storage.remove(authvals.STORAGE_KEY.ACCESS_TOKEN);

            return $q.reject(reason);
          })          
          .catch(function (reason) {
            if (reason && reason.status === 401) {
              onUnauthorized();
            }
            return $q.reject(reason);
          })          
          .finally(function () {
            assignUrls(self.bearerToken);
            products.defineGroups(self);
          })
          ;
        
      }

      function retrieveProfile(token) {
        var profile;
        return $q.resolve(token)
          .then(function () {
              if (token) {
                return getResource('Me', token);
              } else {
                return $q.reject('no token'); 
              }
          })
          .then(function(response) {
            profile = response.data;
            var preferences = profile['urn:unboundid:schemas:sample:profile:1.0']['topicPreferences'] || [];
            preferences = preferences.filter(function filter(item) {
              return item.strength > 0;
            }).sort(function compare(a, b) {
              return a.strength - b.strength;
            });
            profile.preferences = preferences;
            return profile;
          })
          .catch(function (reason) {
            profile = {
              preferences: []
            };
            return $q.reject(reason);
          })
          .finally(function (result) {
            self.profile = profile;
            return self.profile;
          });
      }

      function buildUrl(base, path) {
        if (base && base.lastIndexOf('/') === base.length - 1) {
          base = base.substring(0, base.length - 1);
        }
        if (path && path.indexOf('/') === 0) {
          path = path.substring(1);
        }
        return (base || '') + '/' + (path || '');
      }

      // function onlyAuth(url) {
      //   if (!self.authorized) {
      //     $window.location = authUrl(url);
      //     return false;
      //   } else {
      //     return true;
      //   }
      // }

      function onUnauthorized() {
        alert('Sorry - you are no longer authorized, please sign in again.');
        $window.location = pages.home;
      }

      // function parseQueryString(hashStr) {
      //   var args_enc, i, nameval, ret;
      //   ret = {};
      //   args_enc = hashStr.substring(1).replace(/&amp;/g, '&').split('&');
      //   for (i = 0; i < args_enc.length; i++) {
      //     // convert + into space, split on =, and then decode 
      //     args_enc[i].replace(/\+/g, ' ');
      //     nameval = args_enc[i].split('=', 2);
      //     ret[decodeURIComponent(nameval[0])] = decodeURIComponent(nameval[1]);
      //   }
      //   return ret;
      // }
    })

    .controller('mainCtrl', function mainCtrl($scope, auth, brand) {
      var main = this;

      $scope.auth = auth;
      brand.loaded.then(function (data) {
        main.title = data.title;
        main.logo = data.logo;
      });

    })
    
    .controller('shopCtrl', function cartCtrl($scope, brand, products, auth, pages, 
        $httpParamSerializer, $window) {
      var shop = this;
      shop.buy = buy;
      
      $scope.products = products;

      brand.loaded.then(function (data) {
        products.preferences = data.preferences;
        products.defineGroups();
      });

      function buy(product) {

	      var url = auth.tokenUrl(pages.buy, auth.bearerToken, {"product": product});
        
        $window.location = url;
      }
    })

    .controller('buyCtrl', function buyCtrl($scope, $window, utils) {
      var buy = this;
      var params = utils.parseParams($window.location.search);
      if (params['product']) {
        buy.product = params['product']
      }
    })

    .controller('cartCtrl', function cartCtrl($scope, auth, pages) {
      var cart = this;
      //auth.onlyAuth(pages.checkout);
      cart.count = 5;
    })

    .controller('socialCtrl', function socialCtrl($scope, auth, pages) {
      var social = this;
      //auth.onlyAuth(pages.social);
      social.friends = 5;
    })

    .controller('profileCtrl', function profileCtrl($scope, auth, pages) {
      var profile = this;
      //auth.onlyAuth(pages.profile);
      profile.friends = 5;
    })
    ;

} (window.UNBOUNDID = window.UNBOUNDID || {}));  