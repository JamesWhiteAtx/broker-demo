/*
 * Copyright 2016 UnboundID Corp.
 * All Rights Reserved.
 */

(function (UNBOUNDID) {
  "use strict";

  UNBOUNDID.MODULE_NAME = 'broker';

  angular.module(UNBOUNDID.MODULE_NAME, [])

    .constant('pages', {
      home: 'index.html',
      profile: 'profile.html',
      review: 'review.html',
      social: 'social.html',
      buy: 'buy.html'
    })
    .constant('keys', {
      STATE: 'demo_state',
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

      self.setObject = function(key, obj) {
        return self.set(key, angular.toJson(obj));
      };

      self.getObject = function(key) {
        var result = null;

        var stored = self.get(key);

        if (angular.isString(stored)) {       // If there is a stored string value retrieved...
          result = angular.fromJson(stored);  // convert from JSON to an object.
        }
      
        return result;
      };

    })
    
    .service('json', function brand($q, $http) {
      this.load = function load(url) {
        var deferred = $q.defer(); 

        $http.get(url).then(function (result) {
          angular.extend(self, result.data);
          deferred.resolve(self);
        }).catch(function (reason) {
          deferred.reject(reason);
        });
        
        return deferred.promise;
      };
    })

    .service('brand', function brand(json) {
      this.loaded = json.load('brand.json');
    })

    .service('config', function brand(json) {
      this.loaded = json.load('config.json');
    })

    .service('products', function products(brand, pages) {
      var self = this
      self.preferences = null;
      self.groups = null;
      self.recommendations = false;

      self.defineGroups = defineGroups;
      self.loadProduct = loadProduct;

      function defineGroups(auth) {
        var found;
        self.groups = [];
        
        return brand.loaded.then(function (data) {

          if (auth && auth.authorized && auth.profile && auth.profile.preferences && 
            auth.profile.preferences.length) {
            self.preferences = data.preferences;

            if ( self.preferences && self.preferences.length) {
              self.recommendations = true;          
              self.preferences.forEach(function(any) {
                found = auth.profile.preferences.filter(function(item) {
                  return (item.id === any.id);
                })[0];

                if (found) {
                  found.display = any.display;
                  self.groups.push(any);

                  any.products.forEach(function (product) {
                    product.buy = auth.tokenUrl(pages.buy, auth.bearerToken, {"product": product.id});
                  });
                }
              });
            } 
          }

          if (self.groups.length === 0) {
            self.recommendations = false;
            self.groups = [data.offers];
          }
        });

      }

      function loadProduct(id) {
        return brand.loaded.then(function (data) {
          var product;
          var all = data.preferences.concat(data.offers);

          for (var ig = 0; ig < all.length; ig++) {
            var group = all[ig];
            for (var ip = 0; ip < group.products.length; ip++) {
              if (group.products[ip].id == id) {
                product = group.products[ip];
                break;
              } 
            }
            if (product) {
              break;
            }
          }
          return product;
        });
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

    .service('errs', function errs() {
      var self = this;
      
      self.messages = [];
      self.addMsg = addMsg;
      self.delMsg = delMsg;
      
      function addMsg(title, msg) {
        self.messages.push({title: title, msg: msg});
      }

      function delMsg(error) {
        var idx = self.messages.indexOf(error);
        if (idx !== -1) {
          self.messages.splice(idx, 1);
        }
      }

    })

    .service ('cart', function cart(storage) {
      var CART_KEY = 'demo_cart';

      var self = this;
      self.user = null;
      self.key = null;
      self.products = [];
      self.qty = 0;
      self.total = 0;

      self.init = init;
      self.add = add;
      self.remove = remove;
      self.update = update;

      function init(user) {
        
        self.user = user;
        self.key = null;
        var data = storage.getObject(CART_KEY);

        if (!angular.isObject(data) || 
          (data.last && self.user && (data.last !== self.user))) {
          storage.remove(CART_KEY);
          data = {}
        }

        self.products = data.products || [];
        update();
      }

      function add(addProd) {
        var found = self.products.filter(function filter(prod) {
          return (prod.id == addProd.id);
        })[0];

        if (found) {
          found.qty += addProd.qty; 
        } else {
          self.products.push( angular.copy(addProd) );
        }
        
        update();
      }

      function remove(delProd) {
        var idx = self.products.indexOf(delProd);
        if (idx !== -1) {
          self.products.splice(idx, 1);
        }
        update();
      }

      function update() {
        var tot = 0;
        var qty = 0;
        self.products.forEach(function(prod) {
          qty += prod.qty;
          tot += prod.qty * prod.price;
        })
        self.qty = qty;
        self.total = tot;
        
        var data = storage.getObject(CART_KEY) || {};
        
        self.last = self.user || data.last;
        storage.setObject(CART_KEY, self);
      }
    })

    .service('jwt', function jwt(storage) {
      var ACCESS_TOKEN = 'demo_access_token';
      var ID_TOKEN = 'demo_id_token';

      var self = this;
      
      self.getBearer = getBearer;
      self.setBearer = setBearer;
      self.clearBearer = clearBearer;
      self.getId = getId;
      self.setId = setId;
      self.clearId = clearId;
      self.highAssurance = highAssurance;

      function highAssurance() {
        var idJwt = getId();
        return (idJwt && idJwt.payload && idJwt.payload.acr == 'MFA'); 
      }
       
      function getBearer() {
        return getToken(ACCESS_TOKEN);
      }

      function setBearer(token) {
        setToken(ACCESS_TOKEN, token);
      }

      function clearBearer(token) {
        clearToken(ACCESS_TOKEN);
      }

      function getId() {
        return getToken(ID_TOKEN);
      }

      function setId(token) {
        setToken(ID_TOKEN, token);
      }

      function clearId(token) {
        clearToken(ID_TOKEN);
      }

      function getToken(key) {
        var result;
        var token = storage.get(key);
        if (angular.isString(token)) {
          result = decode(token);
        }
        return result;
      }

      function setToken(key, token) {
        storage.set(key, token);
      }

      function clearToken(key) {
        storage.remove(key);
      }

      function decode(jwt) {
        var parts = jwt.split('.');
        return {
          header: JSON.parse(atob(parts[0])),
          payload: JSON.parse(atob(parts[1]))
        }
      }
    })

    .service('auth', function auth($location, $window, $http, $q, $httpParamSerializer, 
        utils, products, config, pages, keys, storage, jwt, errs, cart, current) {
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
        return $q.resolve(utils.parseParams($window.location.search))
          .then(function (searchParams) {
            var chash, params;
            chash = searchParams['chash'];
            if (chash) {
              params = utils.parseParams(decodeCallbackArg(chash));
            }
            return params;
          })
          .then(function (params) {
            var idToken;
            if (params) {
              idToken = params['id_token'];
              if (idToken) {
                
                var t = idToken.split('.');
                var p = atob(t[1]);

                jwt.setId(idToken);
              }
            }
            return params;
          })
          .then(function (params) {
            var accessToken, error, errorDescr;
            if (params) {
              accessToken = params['access_token'];
              if (accessToken) {
                return accessToken; 
              } else if (params['error']) {
                error = params['error'];
                errorDescr = params['error_description'];
                errorDescr = errorDescr.replace(/\+/g, ' ');
                return $q.reject(errorDescr);
              }
            }
          })
          .catch(function(error) {
            errs.addMsg('Authorization Error', error);
            return null;
          })
          .then(function (token) {
            return self.authorize(token); 
          })
          .catch(function (reason) {
            if (reason && reason.status === 401) {
              //onUnauthorized();
              errs.addMsg('Authorization Error', reason.statusText);
            }
            return $q.reject(reason);
          })          
          ;
      }

      function authorize(token) {

        return $q.resolve(token)
          .then(function (token) {
            return retrieveProfile(token);
          })
          .then(function (profile) {
            self.authorized = true;
            self.bearerToken = token;
            jwt.setBearer(self.bearerToken);

            return self.bearerToken;
          })
          .catch(function (reason) {
            self.authorized = false;
            self.bearerToken = null;
            jwt.clearBearer();
            jwt.clearId();

            return $q.reject(reason);
          })          
          .finally(function () {
            return assignUrls(self.bearerToken).then(function() {
              products.defineGroups(self);
            });
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
            cart.init(self.profile.userName);
            return self.profile;
          });
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

      function loadAuthorizeUrl() {
        var state;

        return config.loaded.then(function loaded(data) {
          state = Math.floor(Math.random() * (999999 - 0 + 1)) + 0;
          storage.set(keys.STATE, state.toString());
          
          return buildUrl(data.IDENTITY_PROVIDER_URL, data.AUTHORIZE_ROUTE) + '?' +
            'response_type=' + encodeURIComponent('token id_token') + '&' +
            'client_id=' + encodeURIComponent(data.CLIENT_ID) + '&' +
            'redirect_uri=' + encodeURIComponent(data.CLIENT_REDIRECT_URL) + '&' +
            'scope=' + encodeURIComponent(data.SCOPES.join(' ')) + '&' +
            'acr_values=' + encodeURIComponent(data.ACR_VALUES.join(' ')) + '&' +
            'nonce=' + encodeURIComponent(current) + '&' +
            'state=' + encodeURIComponent(state + ';' + current);
        });

      }
      
      function loadLogoutUrl() {
        var state = storage.get(keys.STATE) || '0';
        return config.loaded.then(function loaded(data) {
          return buildUrl(data.IDENTITY_PROVIDER_URL, data.LOGOUT_ROUTE) + '?' +
            'post_logout_redirect_uri=' + encodeURIComponent(data.CLIENT_REDIRECT_URL) + '&' +
            'state=' + encodeURIComponent(state + ';' + current);
        });
      }

      function getResource(subpath, token) {
        if (token) {
          return config.loaded.then(function loaded(data) {
            var path = 'scim/v2/' + subpath;
            var url = buildUrl(data.RESOURCE_SERVER_URL, path);

            var headers = {
              'Content-Type': 'application/json',
              'Accept': 'application/json, application/scim+json'
            };
            headers['Authorization'] = 'Bearer ' + token;
            return $http.get(url, { headers: headers });
          });
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

      function loadAuthUrl(url, token) {
        if (token) {
          return $q.resolve( tokenUrl(url, token) );
        } else {
          return loadAuthorizeUrl();
        }
      }

      function assignUrls(token) {
        self.url = {
          home: tokenUrl(pages.home, token),
          review: tokenUrl(pages.review, token),
          social: tokenUrl(pages.social, token),
        };
        return $q.all([
          loadAuthorizeUrl().then(function(url) {
            return self.url.signin = url;
          }),
          loadLogoutUrl(pages.home, token).then(function(url) {
            return self.url.signout = url;
          }),
          loadAuthUrl(pages.profile, token).then(function(url) {
            return self.url.profile = url;
          })
        ]);
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
      //     $window.location = loadAuthUrl(url);
      //     return false;
      //   } else {
      //     return true;
      //   }
      // }

      // function onUnauthorized() {
      //   alert('Sorry - you are no longer authorized, please sign in again.');
      //   $window.location = pages.home;
      // }

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

    .controller('mainCtrl', function mainCtrl($scope, auth, brand, cart, errs) {
      var main = this;

      $scope.cart = cart;
      $scope.auth = auth;
      $scope.errs = errs;

      brand.loaded.then(function (data) {
        main.title = data.title;
        main.logo = data.logo;
      });

    })
    
    .controller('shopCtrl', function shopCtrl($scope, products, auth) {
      var shop = this;
      
      $scope.products = products;

      products.defineGroups(auth);

      // function buy(product) {
	    //   var url = auth.tokenUrl(pages.buy, auth.bearerToken, {"product": product.id});
      //   $window.location = url;
      // }
    })

    .controller('buyCtrl', function buyCtrl($scope, $window, utils, products) {
      var buy = this;
      buy.inc = inc;
      buy.dec = dec;
      
      init();

      function init() {
        var params = utils.parseParams($window.location.search);
        var id = params['product'];
        if (id) {
          products.loadProduct(id)
          .then(function(product) {
            product.qty = 1;
            buy.product = product;
          });
        }
      }

      function inc() {
        buy.product.qty += 1;
      }
      function dec() {
        if (buy.product && buy.product.qty > 0) {
          buy.product.qty -= 1;
        }
      }      
      
    })

    .controller('reviewCtrl', function reviewCtrl($scope, cart, jwt) {
      var review = this;

      review.inc = inc;
      review.dec = dec;

      review.high = jwt.highAssurance();

      function inc(prod) {
        prod.qty += 1;
        cart.update();
      }
      
      function dec(prod) {
        if (prod && prod.qty > 0) {
          prod.qty -= 1;
          cart.update();
        }
      }      
      
      //auth.onlyAuth(pages.review);
    })

    .controller('socialCtrl', function socialCtrl($scope, auth, pages) {
      var social = this;
      //auth.onlyAuth(pages.social);
      social.friends = 5;
    })

    .controller('profileCtrl', function profileCtrl($scope, auth, pages) {
      var profile = this;
      //auth.onlyAuth(pages.profile);
    })
    ;

} (window.UNBOUNDID = window.UNBOUNDID || {}));