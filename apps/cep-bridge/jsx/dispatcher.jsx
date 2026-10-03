/**
 * HubDispatcher - Central ExtendScript Router
 */
#include "ae.jsx"
#include "ppro.jsx"

var HubDispatcher = (function() {
    function getHostType() {
        var appName = BridgeTalk.appName;
        if (appName === "aftereffects") return "AE";
        if (appName === "premierepro") return "PPRO";
        return "UNKNOWN";
    }

    return {
        getActiveCompState: function() {
            var host = getHostType();
            var state = null;
            if (host === "AE") {
                state = AE_Engine.getState();
            } else if (host === "PPRO") {
                state = PPRO_Engine.getState();
            } else {
                state = { comp_active: false, comp_name: "Unsupported Host", duration: 0.0 };
            }

            // Simple JSON stringifier for ExtendScript legacy engine
            return '{"comp_active":' + state.comp_active + 
                   ',"comp_name":"' + state.comp_name.replace(/"/g, '\\"') + '"' +
                   ',"duration":' + state.duration + 
                   ',"current_time":' + (state.current_time || 0.0) + '}';
        },

        applyPreset: function(filePath, presetType) {
            var host = getHostType();
            var result = null;
            if (host === "AE") {
                result = AE_Engine.apply(filePath, presetType);
            } else if (host === "PPRO") {
                result = PPRO_Engine.apply(filePath, presetType);
            } else {
                result = { success: false, error: "Host application not supported: " + host };
            }

            return '{"success":' + result.success + 
                   ',"error":' + (result.error ? '"' + result.error.replace(/"/g, '\\"') + '"' : 'null') + 
                   ',"compName":' + (result.compName ? '"' + result.compName.replace(/"/g, '\\"') + '"' : 'null') + '}';
        }
    };
})();
