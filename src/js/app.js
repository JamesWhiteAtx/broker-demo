/*
 * Copyright 2016 UnboundID Corp.
 * All Rights Reserved.
 */
(function(UNBOUNDID) {
    "use strict";

    UNBOUNDID.MODULE_NAME = 'shopCo';

    angular.module(UNBOUNDID.MODULE_NAME, [])
    .constant('cfg', {
        jwtKey: 'JWT'
    })
    .constant('pages', {
        home: 'index.html',
        profile: 'profile.html',
        checkout: 'checkout.html',
        social: 'social.html',
        signin: 'sign-in.html'
    })

    .service('storage', function($window) {
        var self = this;
        self.set = function(key, value) {
            return $window.sessionStorage.setItem(key, value);
        };

        self.get = function(key) {
            return $window.sessionStorage.getItem(key);
        };

        self.remove = function(key) {
            return $window.sessionStorage.removeItem(key);
        };        
    })

    .service('auth', function($location, $window, cfg, pages, storage) {
        var self = this;
        self.authorized = false;
        
        self.authorize = authorize;
        self.signOut = signOut;
        self.onlyAuth = onlyAuth;
        
        init(); 

        function init() {
            var jwt;
            if(UNBOUNDID.hash) {
                var hashObj = parseQueryString(UNBOUNDID.hash);
                jwt = hashObj.JWT;
            }

            if (!jwt) {
                jwt = storage.get(cfg.jwtKey);
            }

            if (jwt) {
                authorize(jwt);
            } else {
                assignUrls();
            }
        }

        self.profile = {
            name: 'Larry Beans'
        };

        function authorize(jwt) {
            if (jwt) {
                self.authorized = true;
                storage.set(cfg.jwtKey, jwt);
            } else {
                self.authorized = false;
                storage.remove(cfg.jwtKey);
            }
            assignUrls();
        }

        function signOut() {
            authorize();
        }

        function authUrl(url) {
            var result = '';
            if (! self.authorized) {
                result = result + pages.signin + '?redirect=';
            }
            result = result + url;
            return result; 
        }
        
        function assignUrls() {
            self.url = {
                home: authUrl(pages.home),
                profile: authUrl(pages.profile),
                checkout: authUrl(pages.checkout),
                social: authUrl(pages.social)
            };
        }

        function onlyAuth(url) {
            if (!self.authorized) {
                $window.location = authUrl(url);
                return false;
            } else {
                return true;
            }
        }

        function parseQueryString(hashStr) {
            var args_enc, i, nameval, ret;
            ret = {};
            args_enc = hashStr.substring(1).replace(/&amp;/g, '&').split('&');
            for (i = 0; i < args_enc.length; i++) {
                // convert + into space, split on =, and then decode 
                args_enc[i].replace(/\+/g, ' ');
                nameval = args_enc[i].split('=', 2);
                ret[decodeURIComponent(nameval[0])]=decodeURIComponent(nameval[1]);
            }
            return ret;
        }
    })

    .controller('mainCtrl', function($scope, auth) {
        var main = this;
        $scope.auth = auth;
        main.beans = 'shop at shop co, or else';
    })

    .controller('cartCtrl', function($scope, auth, pages) {
        var cart = this;
        auth.onlyAuth(pages.checkout);
        cart.count = 5;
    })

    .controller('socialCtrl', function($scope, auth, pages) {
        var social = this;
        auth.onlyAuth(pages.social);
        social.friends = 5;
    })

    .controller('profileCtrl', function($scope, auth, pages) {
        var profile = this;
        auth.onlyAuth(pages.profile);
        profile.friends = 5;
    })
    ;

}(window.UNBOUNDID = window.UNBOUNDID || {}));  