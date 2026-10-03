/**
 * CSInterface - Minimal, Robust Adobe CEP Interface Wrapper
 */
function CSInterface() {}

CSInterface.prototype.getHostEnvironment = function() {
    var defaultEnv = { appName: "AEFT", appVersion: "24.0", appId: "AEFT" };
    if (window.__adobe_cep__) {
        try {
            return JSON.parse(window.__adobe_cep__.getHostEnvironment());
        } catch (e) {
            return defaultEnv;
        }
    }
    return defaultEnv;
};

CSInterface.prototype.evalScript = function(script, callback) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.evalScript(script, callback || function() {});
    } else {
        console.warn("[CSInterface Mock] Executing script:", script);
        if (callback) {
            callback(JSON.stringify({ success: true, compName: "Mock Composition (Demo Mode)" }));
        }
    }
};

CSInterface.prototype.closeExtension = function() {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.closeExtension();
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = CSInterface;
}
