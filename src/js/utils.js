/*
 * Copyright 2016 UnboundID Corp.
 * All Rights Reserved.
 */
(function(UNBOUNDID) {
    "use strict";
    UNBOUNDID.findJwt = function() {
        UNBOUNDID.hash = window.location.hash;
        window.location.hash = ''; 
    }  
}(window.UNBOUNDID = window.UNBOUNDID || {}));