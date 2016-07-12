/*
 * Copyright 2016 UnboundID Corp.
 * All Rights Reserved.
 */
(function(UNBOUNDID) {
    "use strict";

    UNBOUNDID.MODULE_NAME = 'broker';

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
    .constant('authvals', {
	    IDENTITY_PROVIDER_URL: '/',
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

    .service('auth', function($location, $window, cfg, pages, storage, authvals) {
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

            var state = Math.floor(Math.random() * (999999 - 0 + 1)) + 0;
            storage.set(authvals.STORAGE_KEY.STATE, state.toString());

            var result = '';
    	     result = buildUrl(authvals.IDENTITY_PROVIDER_URL, 'oauth/authorize') + '?' +
                'response_type=' + encodeURIComponent('token') + '&' +
                'client_id=' + encodeURIComponent(authvals.CLIENT_ID) + '&' +
                'redirect_uri=' + encodeURIComponent(authvals.CLIENT_REDIRECT_URL) + '&' +
                'scope=' + encodeURIComponent(authvals.SCOPES) + '&' +
                'acr_values=' + encodeURIComponent(authvals.ACR_VALUES) + '&' +
                'state=' + state;

            return result; 
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

    .controller('mainCtrl', function($scope, $http, auth) {
        var main = this;

        $scope.auth = auth;

        $http.get('brand.json').success(function(data) {
            main.title = data.title;
        });

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